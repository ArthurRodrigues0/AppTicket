import os
import base64
import json
from pathlib import Path
from email.mime.text import MIMEText
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import logging

logger = logging.getLogger(__name__)

SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.send'
]

class GmailService:
    def __init__(self):
        self.creds = None
        self.service = None
        self.credentials_file = Path(__file__).parent / 'credentials.json'
        self.token_file = Path(__file__).parent / 'token.json'
        
    def authenticate(self):
        """Authenticate with Gmail API using existing token"""
        try:
            if self.token_file.exists():
                self.creds = Credentials.from_authorized_user_info(
                    json.loads(self.token_file.read_text()),
                    SCOPES
                )
            
            # Refresh token if expired
            if self.creds and self.creds.expired and self.creds.refresh_token:
                self.creds.refresh(Request())
                self.token_file.write_text(self.creds.to_json())
            
            if self.creds and self.creds.valid:
                self.service = build('gmail', 'v1', credentials=self.creds)
                logger.info("✅ Gmail authenticated successfully")
                return True
            else:
                logger.error("❌ No valid credentials found")
                return False
                
        except Exception as e:
            logger.error(f"❌ Gmail auth error: {e}")
            return False
    
    def get_unread_messages(self, max_results=10):
        """Get unread messages from Gmail"""
        try:
            if not self.service:
                self.authenticate()
            
            results = self.service.users().messages().list(
                userId='me',
                q='is:unread',
                maxResults=max_results
            ).execute()
            
            messages = results.get('messages', [])
            logger.info(f"📧 Found {len(messages)} unread messages")
            return messages
            
        except Exception as e:
            logger.error(f"❌ Error fetching messages: {e}")
            return []
    
    def get_message_detail(self, message_id):
        """Get full message details"""
        try:
            message = self.service.users().messages().get(
                userId='me',
                id=message_id,
                format='full'
            ).execute()
            
            return self._parse_message(message)
            
        except Exception as e:
            logger.error(f"❌ Error getting message {message_id}: {e}")
            return None
    
    def _parse_message(self, message):
        """Parse Gmail message into structured data"""
        headers = message['payload'].get('headers', [])
        
        def get_header(name):
            for header in headers:
                if header['name'].lower() == name.lower():
                    return header['value']
            return ''
        
        subject = get_header('Subject') or 'No Subject'
        from_email = get_header('From') or 'Unknown'
        to_email = get_header('To') or ''
        date = get_header('Date') or ''
        
        # Extract body
        body = self._extract_body(message['payload'])
        
        # Detect priority
        priority = self._detect_priority(subject, body)
        
        return {
            'gmail_id': message['id'],
            'thread_id': message.get('threadId'),
            'subject': subject,
            'body': body,
            'sender_email': from_email,
            'sender_name': from_email.split('<')[0].strip() if '<' in from_email else from_email,
            'to_email': to_email,
            'date': date,
            'priority': priority,
            'labels': message.get('labelIds', [])
        }
    
    def _extract_body(self, payload):
        """Extract email body from payload"""
        def decode_base64(data):
            if not data:
                return ''
            try:
                return base64.urlsafe_b64decode(data).decode('utf-8')
            except:
                return ''
        
        def clean_html(html):
            """Remove HTML tags"""
            import re
            text = re.sub(r'<script[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', '', html, flags=re.IGNORECASE)
            text = re.sub(r'<style[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>', '', text, flags=re.IGNORECASE)
            text = re.sub(r'<[^>]+>', ' ', text)
            text = text.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
            text = re.sub(r'\s+', ' ', text).strip()
            return text[:5000] if text else '--- No content ---'
        
        # Try to get text/plain first
        if 'parts' in payload:
            for part in payload['parts']:
                if part['mimeType'] == 'text/plain' and part.get('body', {}).get('data'):
                    text = decode_base64(part['body']['data'])
                    if len(text) > 10:
                        return text
        elif payload.get('body', {}).get('data'):
            return decode_base64(payload['body']['data'])
        
        # Fallback to HTML
        if 'parts' in payload:
            for part in payload['parts']:
                if part['mimeType'] == 'text/html' and part.get('body', {}).get('data'):
                    return clean_html(decode_base64(part['body']['data']))
        elif payload.get('body', {}).get('data'):
            return clean_html(decode_base64(payload['body']['data']))
        
        return '--- No content detected ---'
    
    def _detect_priority(self, subject, body):
        """Detect ticket priority from subject and body"""
        urgent_keywords = ['urgente', 'urgente!', 'emergência', 'asap', '!!!', 'prioridade', 'crítico']
        text = (subject + ' ' + body).lower()
        
        for keyword in urgent_keywords:
            if keyword in text:
                return 'alta'
        
        return 'media'
    
    def mark_as_read(self, message_id):
        """Mark message as read"""
        try:
            self.service.users().messages().modify(
                userId='me',
                id=message_id,
                body={'removeLabelIds': ['UNREAD']}
            ).execute()
            logger.info(f"✅ Marked {message_id} as read")
            return True
        except Exception as e:
            logger.error(f"❌ Error marking as read: {e}")
            return False
    
    def send_reply(self, to_email, subject, body, thread_id=None, in_reply_to=None):
        """Send email reply"""
        try:
            if not subject.startswith('Re:'):
                subject = f'Re: {subject}'
            
            message = MIMEText(body)
            message['to'] = to_email
            message['subject'] = subject
            
            if in_reply_to:
                message['In-Reply-To'] = in_reply_to
                message['References'] = in_reply_to
            
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
            
            send_body = {'raw': raw_message}
            if thread_id:
                send_body['threadId'] = thread_id
            
            sent_message = self.service.users().messages().send(
                userId='me',
                body=send_body
            ).execute()
            
            logger.info(f"✅ Email sent: {sent_message['id']}")
            return {
                'success': True,
                'message_id': sent_message['id'],
                'thread_id': sent_message.get('threadId')
            }
            
        except Exception as e:
            logger.error(f"❌ Error sending email: {e}")
            return {
                'success': False,
                'error': str(e)
            }

# Singleton instance
gmail_service = GmailService()
