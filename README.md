# AppTicket (FreshChamados Pro) – Help Desk Ticketing System with Gmail Integration

A help desk / service desk web app that turns Gmail emails into support tickets automatically, lets agents reply by email from the app and tracks every ticket on a dashboard.

**Keywords:** Python · FastAPI · REST API · MongoDB · Gmail API · OAuth 2.0 · React · Tailwind CSS · Help desk · Ticketing · ITSM · Process automation

## Features

- **Gmail sync:** incoming emails become tickets automatically (Gmail API, OAuth 2.0)
- **Automatic priority detection:** emails with words like "urgent" are flagged as high priority
- **Reply by email:** answers are sent through the Gmail API in the same email thread
- **Internal notes:** private comments that are not sent to the customer
- **Dashboard:** real-time metrics (total, new, in progress, closed) with auto-refresh every 30 seconds
- **Filters and search:** by status, priority and free text
- **Responsive UI** for desktop, tablet and mobile

## Tech stack

| Layer | Technologies |
| --- | --- |
| Backend | Python, FastAPI, Pydantic, Motor (async MongoDB driver) |
| Database | MongoDB |
| Integrations | Gmail API, Google OAuth 2.0 |
| Frontend | React 19, Tailwind CSS, Axios, Lucide Icons |

## API endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/tickets` | List tickets (with filters) |
| GET | `/api/tickets/{id}` | Ticket details |
| PATCH | `/api/tickets/{id}` | Update a ticket |
| POST | `/api/tickets/{id}/reply` | Reply and send the email |
| GET / POST | `/api/tickets/{id}/notes` | List or add internal notes |
| GET | `/api/stats` | Dashboard statistics |
| POST | `/api/sync-gmail` | Sync emails from Gmail |
| GET | `/api/auth/gmail` | Gmail authentication URL |

## How to run

1. Create a Google Cloud OAuth client with the Gmail API enabled and save it as `backend/credentials.json` (never commit this file).
2. Backend (`backend/.env`):
   ```
   MONGO_URL=mongodb://localhost:27017
   DB_NAME=freshchamados
   CORS_ORIGINS=http://localhost:3000
   ```
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn server:app --reload --port 8001
   ```
3. Frontend (`frontend/.env`):
   ```
   REACT_APP_BACKEND_URL=http://localhost:8001
   ```
   ```bash
   cd frontend
   yarn install
   yarn start
   ```
4. Open http://localhost:3000, authenticate Gmail and click **Sync Gmail**.

## Security

- OAuth 2.0 for Gmail; credentials stay on the backend and out of the repository
- Request validation with Pydantic
- Configurable CORS

## Roadmap

- [ ] Multiple agents
- [ ] Reply templates
- [ ] SLA tracking
- [ ] File attachments
- [ ] Advanced reports

---

## 🇧🇷 Em português

Sistema de chamados (help desk) integrado ao Gmail: transforma e-mails em tickets automaticamente, detecta a prioridade, permite responder por e-mail pelo próprio sistema e mostra métricas em um dashboard. Backend em Python (FastAPI) com MongoDB e frontend em React com Tailwind CSS.

## Author

**Arthur Rodrigues Chaves** · [LinkedIn](https://linkedin.com/in/arthur-rodrigues-267b9923a) · [GitHub](https://github.com/ArthurRodrigues0)
