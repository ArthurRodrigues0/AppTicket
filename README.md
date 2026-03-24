# FreshChamados Pro v2.0

Sistema profissional de gerenciamento de tickets integrado com Gmail API.

## 🚀 Funcionalidades

### ✨ Dashboard Profissional
- Métricas em tempo real (Total, Novos, Em Progresso, Fechados)
- Interface moderna inspirada no Freshdesk
- Design responsivo

### 🎫 Gestão de Tickets
- Sincronização automática com Gmail
- Filtros por status e prioridade
- Busca inteligente
- Detecção automática de prioridade
- Histórico completo de conversas

### 📧 Comunicação
- Responder tickets por email
- Notas internas (privadas)
- Histórico de todas as interações
- Envio direto pelo Gmail API

### 🔄 Automação
- Sync automático do Gmail
- Status automático
- Atualização em tempo real

## 🛠️ Stack Tecnológica

**Backend:**
- FastAPI (Python)
- MongoDB
- Gmail API
- Motor (async MongoDB driver)

**Frontend:**
- React 19
- Tailwind CSS
- Lucide Icons
- Axios

## 📋 Como Usar

### 1. Autenticação Gmail (Se necessário)

Se o token do Gmail expirar, você precisa re-autenticar:

```bash
# Acesse no navegador:
http://localhost:3000/auth-gmail
```

Ou pela API:
```bash
curl http://localhost:8001/api/auth/gmail
```

### 2. Sincronizar Emails

Clique no botão **"Sync Gmail"** no dashboard ou:

```bash
curl -X POST http://localhost:8001/api/sync-gmail
```

### 3. Visualizar Tickets

Os tickets aparecem automaticamente na tabela. Clique em qualquer ticket para ver detalhes.

### 4. Responder Tickets

1. Abra o ticket clicando na linha
2. Digite sua resposta no campo "Responder Ticket"
3. Clique em "Enviar Resposta por Email"
4. O email será enviado automaticamente via Gmail API

### 5. Adicionar Notas Internas

1. Abra o ticket
2. Digite no campo "Adicionar Nota"
3. Marque "Nota interna" se não quiser enviar por email
4. Clique em "Adicionar Nota"

### 6. Filtrar Tickets

Use os filtros no topo:
- **Busca:** Digite qualquer termo para buscar
- **Status:** novo, em_progresso, aguardando, fechado
- **Prioridade:** baixa, media, alta, urgente

### 7. Atualizar Status

Ações rápidas na tabela:
- ⏰ **Em Progresso:** Marcar ticket em andamento
- ✅ **Fechar:** Marcar ticket como fechado

## 🔧 Configuração

### Credenciais Gmail

As credenciais estão em `/app/backend/credentials.json`:
- CLIENT_ID: `537100678382-2b6u2hcnt374s5clj1n4f30pa9mem53e.apps.googleusercontent.com`
- CLIENT_SECRET: `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`

### Variáveis de Ambiente

**Backend** (`/app/backend/.env`):
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=freshchamados
CORS_ORIGINS=*
```

**Frontend** (`/app/frontend/.env`):
```
REACT_APP_BACKEND_URL=https://sistema-ajuda.preview.emergentagent.com
```

## 📊 Endpoints API

### Tickets
- `GET /api/tickets` - Listar tickets (com filtros)
- `GET /api/tickets/{id}` - Detalhes do ticket
- `PATCH /api/tickets/{id}` - Atualizar ticket
- `POST /api/tickets/{id}/reply` - Responder e enviar email

### Estatísticas
- `GET /api/stats` - Dashboard stats

### Gmail
- `POST /api/sync-gmail` - Sincronizar emails
- `GET /api/auth/gmail` - URL de autenticação

### Notas
- `GET /api/tickets/{id}/notes` - Listar notas
- `POST /api/tickets/{id}/notes` - Criar nota

## 🎨 Design

Interface profissional com:
- Sidebar gradiente roxo/indigo
- Cards com sombras suaves
- Badges coloridos para status e prioridade
- Modal moderno para detalhes
- Animações suaves
- Feedback visual

## 🔐 Segurança

- OAuth2 para Gmail
- Credenciais não expostas no frontend
- CORS configurado
- Validação de dados com Pydantic

## 📱 Responsivo

Funciona perfeitamente em:
- Desktop
- Tablet
- Mobile

## 🚀 Próximas Funcionalidades

- [ ] Multi-agentes (vários usuários)
- [ ] Templates de resposta
- [ ] SLA tracking
- [ ] Anexos de arquivos
- [ ] Relatórios avançados
- [ ] Tema escuro
- [ ] Notificações push
- [ ] Integração WhatsApp

## 💡 Dicas

1. **Auto-refresh:** Os tickets são atualizados automaticamente a cada 30 segundos
2. **Prioridade automática:** Emails com palavras como "urgente", "emergência" são marcados como alta prioridade
3. **Thread tracking:** Respostas são enviadas no mesmo thread do Gmail
4. **Notas vs Respostas:** Use notas internas para comentários privados que não serão enviados ao cliente

---

**FreshChamados Pro v2.0** - Sistema Profissional de Atendimento
