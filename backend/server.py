from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from gmail_service import gmail_service

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class Ticket(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    gmail_id: Optional[str] = None
    thread_id: Optional[str] = None
    subject: str
    body: str
    sender_email: str
    sender_name: str
    status: str = "novo"  # novo, em_progresso, aguardando, fechado
    priority: str = "media"  # baixa, media, alta, urgente
    assigned_to: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TicketCreate(BaseModel):
    subject: str
    body: str
    sender_email: str
    sender_name: str
    priority: Optional[str] = "media"

class TicketUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None
    tags: Optional[List[str]] = None

class Note(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticket_id: str
    content: str
    is_internal: bool = False  # True = nota privada, False = resposta pública
    created_by: str = "system"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NoteCreate(BaseModel):
    content: str
    is_internal: bool = False

class ReplyRequest(BaseModel):
    content: str

class StatusUpdate(BaseModel):
    status: str

# ==================== ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "FreshChamados Pro API v2.0"}

@api_router.get("/auth/gmail")
async def auth_gmail():
    """Start Gmail OAuth flow"""
    from google_auth_oauthlib.flow import Flow
    
    flow = Flow.from_client_secrets_file(
        str(ROOT_DIR / 'credentials.json'),
        scopes=[
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/gmail.send'
        ],
        redirect_uri='http://localhost:3000/gmail-callback'
    )
    
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        prompt='consent'
    )
    
    return {"auth_url": authorization_url}

@api_router.get("/stats")
async def get_stats():
    """Get dashboard statistics"""
    try:
        total = await db.tickets.count_documents({})
        novo = await db.tickets.count_documents({"status": "novo"})
        em_progresso = await db.tickets.count_documents({"status": "em_progresso"})
        fechado = await db.tickets.count_documents({"status": "fechado"})
        
        return {
            "total": total,
            "novo": novo,
            "em_progresso": em_progresso,
            "fechado": fechado,
            "aguardando": await db.tickets.count_documents({"status": "aguardando"})
        }
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/sync-gmail")
async def sync_gmail(background_tasks: BackgroundTasks):
    """Sync unread emails from Gmail"""
    try:
        logger.info("🚀 Starting Gmail sync...")
        
        # Authenticate
        if not gmail_service.authenticate():
            raise HTTPException(status_code=401, detail="Gmail authentication failed")
        
        # Get unread messages
        messages = gmail_service.get_unread_messages(max_results=10)
        
        if not messages:
            return {"success": True, "created": 0, "message": "No new emails"}
        
        created_count = 0
        
        for msg in messages:
            # Get message details
            message_data = gmail_service.get_message_detail(msg['id'])
            
            if not message_data:
                continue
            
            # Check if ticket already exists
            existing = await db.tickets.find_one({"gmail_id": message_data['gmail_id']})
            
            if not existing:
                # Create new ticket
                ticket = Ticket(
                    gmail_id=message_data['gmail_id'],
                    thread_id=message_data['thread_id'],
                    subject=message_data['subject'],
                    body=message_data['body'],
                    sender_email=message_data['sender_email'],
                    sender_name=message_data['sender_name'],
                    priority=message_data['priority'],
                    status="novo"
                )
                
                ticket_dict = ticket.model_dump()
                ticket_dict['created_at'] = ticket_dict['created_at'].isoformat()
                ticket_dict['updated_at'] = ticket_dict['updated_at'].isoformat()
                
                await db.tickets.insert_one(ticket_dict)
                created_count += 1
                
                logger.info(f"✅ Created ticket: {ticket.subject[:50]}")
            
            # Mark as read
            gmail_service.mark_as_read(msg['id'])
        
        logger.info(f"🎉 Sync completed: {created_count} new tickets")
        
        return {
            "success": True,
            "created": created_count,
            "scanned": len(messages)
        }
        
    except Exception as e:
        logger.error(f"❌ Sync error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/tickets", response_model=List[Ticket])
async def get_tickets(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50
):
    """Get tickets with filters"""
    try:
        query = {}
        
        if status:
            query['status'] = status
        if priority:
            query['priority'] = priority
        if search:
            query['$or'] = [
                {'subject': {'$regex': search, '$options': 'i'}},
                {'body': {'$regex': search, '$options': 'i'}},
                {'sender_email': {'$regex': search, '$options': 'i'}}
            ]
        
        tickets = await db.tickets.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
        
        # Convert datetime strings back to datetime objects
        for ticket in tickets:
            if isinstance(ticket.get('created_at'), str):
                ticket['created_at'] = datetime.fromisoformat(ticket['created_at'])
            if isinstance(ticket.get('updated_at'), str):
                ticket['updated_at'] = datetime.fromisoformat(ticket['updated_at'])
        
        return tickets
        
    except Exception as e:
        logger.error(f"Error getting tickets: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/tickets/{ticket_id}", response_model=Ticket)
async def get_ticket(ticket_id: str):
    """Get single ticket by ID"""
    try:
        ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Convert datetime strings
        if isinstance(ticket.get('created_at'), str):
            ticket['created_at'] = datetime.fromisoformat(ticket['created_at'])
        if isinstance(ticket.get('updated_at'), str):
            ticket['updated_at'] = datetime.fromisoformat(ticket['updated_at'])
        
        return ticket
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting ticket: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.patch("/tickets/{ticket_id}", response_model=Ticket)
async def update_ticket(ticket_id: str, update: TicketUpdate):
    """Update ticket"""
    try:
        update_data = {k: v for k, v in update.model_dump().items() if v is not None}
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        result = await db.tickets.update_one(
            {"id": ticket_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        updated_ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
        
        # Convert datetime strings
        if isinstance(updated_ticket.get('created_at'), str):
            updated_ticket['created_at'] = datetime.fromisoformat(updated_ticket['created_at'])
        if isinstance(updated_ticket.get('updated_at'), str):
            updated_ticket['updated_at'] = datetime.fromisoformat(updated_ticket['updated_at'])
        
        return updated_ticket
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating ticket: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/tickets/{ticket_id}/reply")
async def reply_to_ticket(ticket_id: str, reply: ReplyRequest):
    """Reply to ticket and send email"""
    try:
        # Get ticket
        ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Authenticate Gmail
        if not gmail_service.authenticate():
            raise HTTPException(status_code=401, detail="Gmail authentication failed")
        
        # Format reply email
        email_body = f"""Prezado(a) {ticket['sender_name'].split()[0]},

{reply.content}

---
FreshChamados Pro
Ticket #{ticket_id[:8]}
Sistema de Atendimento
"""
        
        # Send email
        result = gmail_service.send_reply(
            to_email=ticket['sender_email'],
            subject=ticket['subject'],
            body=email_body,
            thread_id=ticket.get('thread_id'),
            in_reply_to=ticket.get('gmail_id')
        )
        
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error', 'Failed to send email'))
        
        # Save note
        note = Note(
            ticket_id=ticket_id,
            content=reply.content,
            is_internal=False,
            created_by="agent"
        )
        
        note_dict = note.model_dump()
        note_dict['created_at'] = note_dict['created_at'].isoformat()
        await db.notes.insert_one(note_dict)
        
        # Update ticket status
        await db.tickets.update_one(
            {"id": ticket_id},
            {
                "$set": {
                    "status": "aguardando",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        logger.info(f"✅ Reply sent for ticket {ticket_id}")
        
        return {
            "success": True,
            "message_id": result['message_id'],
            "delivered_to": ticket['sender_email']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error replying to ticket: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/tickets/{ticket_id}/notes", response_model=List[Note])
async def get_ticket_notes(ticket_id: str):
    """Get all notes for a ticket"""
    try:
        notes = await db.notes.find({"ticket_id": ticket_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
        
        # Convert datetime strings
        for note in notes:
            if isinstance(note.get('created_at'), str):
                note['created_at'] = datetime.fromisoformat(note['created_at'])
        
        return notes
        
    except Exception as e:
        logger.error(f"Error getting notes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/tickets/{ticket_id}/notes", response_model=Note)
async def create_note(ticket_id: str, note_data: NoteCreate):
    """Create internal note for ticket"""
    try:
        # Verify ticket exists
        ticket = await db.tickets.find_one({"id": ticket_id})
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        note = Note(
            ticket_id=ticket_id,
            content=note_data.content,
            is_internal=note_data.is_internal
        )
        
        note_dict = note.model_dump()
        note_dict['created_at'] = note_dict['created_at'].isoformat()
        
        await db.notes.insert_one(note_dict)
        
        return note
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating note: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

logger.info("🚀 FreshChamados Pro v2.0 Backend Started")
