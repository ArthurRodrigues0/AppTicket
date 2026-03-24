import { useState, useEffect } from "react";
import axios from "axios";
import { 
  Ticket, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Search,
  Filter,
  X,
  Send,
  MessageSquare,
  FileText,
  Plus
} from "lucide-react";
import "@/App.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ total: 0, novo: 0, em_progresso: 0, fechado: 0 });
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [notes, setNotes] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadTickets();
    loadStats();
    const interval = setInterval(() => {
      loadTickets();
      loadStats();
    }, 30000); // Refresh every 30s
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterPriority, searchQuery]);

  const loadTickets = async () => {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      if (searchQuery) params.search = searchQuery;

      const response = await axios.get(`${API}/tickets`, { params });
      setTickets(response.data);
    } catch (error) {
      console.error("Error loading tickets:", error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await axios.get(`${API}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const syncGmail = async () => {
    setSyncing(true);
    try {
      const response = await axios.post(`${API}/sync-gmail`);
      alert(`✅ Sync concluído! ${response.data.created} novos tickets criados.`);
      loadTickets();
      loadStats();
    } catch (error) {
      alert(`❌ Erro ao sincronizar: ${error.response?.data?.detail || error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const openTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setReplyText("");
    setNoteText("");
    try {
      const response = await axios.get(`${API}/tickets/${ticket.id}/notes`);
      setNotes(response.data);
    } catch (error) {
      console.error("Error loading notes:", error);
    }
  };

  const closeModal = () => {
    setSelectedTicket(null);
    setNotes([]);
  };

  const updateStatus = async (ticketId, status) => {
    try {
      await axios.patch(`${API}/tickets/${ticketId}`, { status });
      loadTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status });
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const sendReply = async () => {
    if (!replyText.trim()) {
      alert("Digite uma resposta!");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/tickets/${selectedTicket.id}/reply`, {
        content: replyText
      });
      alert("✅ Resposta enviada por email com sucesso!");
      setReplyText("");
      loadTickets();
      const response = await axios.get(`${API}/tickets/${selectedTicket.id}/notes`);
      setNotes(response.data);
    } catch (error) {
      alert(`❌ Erro ao enviar resposta: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addNote = async () => {
    if (!noteText.trim()) return;

    try {
      await axios.post(`${API}/tickets/${selectedTicket.id}/notes`, {
        content: noteText,
        is_internal: isInternal
      });
      setNoteText("");
      const response = await axios.get(`${API}/tickets/${selectedTicket.id}/notes`);
      setNotes(response.data);
    } catch (error) {
      alert(`❌ Erro ao adicionar nota: ${error.response?.data?.detail || error.message}`);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      baixa: "bg-blue-100 text-blue-700",
      media: "bg-yellow-100 text-yellow-700",
      alta: "bg-red-100 text-red-700",
      urgente: "bg-purple-100 text-purple-700"
    };
    return colors[priority] || colors.media;
  };

  const getStatusColor = (status) => {
    const colors = {
      novo: "bg-green-100 text-green-700",
      em_progresso: "bg-blue-100 text-blue-700",
      aguardando: "bg-yellow-100 text-yellow-700",
      fechado: "bg-gray-100 text-gray-700"
    };
    return colors[status] || colors.novo;
  };

  const getStatusLabel = (status) => {
    const labels = {
      novo: "Novo",
      em_progresso: "Em Progresso",
      aguardando: "Aguardando",
      fechado: "Fechado"
    };
    return labels[status] || status;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-screen w-64 bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-2xl">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <Ticket className="w-8 h-8" />
            <h1 className="text-2xl font-bold">FreshChamados</h1>
          </div>
          <nav className="space-y-2">
            <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/20 hover:bg-white/30 transition">
              <Ticket className="w-5 h-5" />
              <span className="font-medium">Tickets</span>
            </a>
          </nav>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-white/20">
          <p className="text-sm text-white/70">FreshChamados Pro v2.0</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Dashboard de Tickets</h2>
            <p className="text-gray-600 mt-1">Gerencie todos os seus atendimentos</p>
          </div>
          <button
            onClick={syncGmail}
            disabled={syncing}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            data-testid="sync-gmail-btn"
          >
            {syncing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Sincronizando...
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5" />
                Sync Gmail
              </>
            )}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-indigo-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <Ticket className="w-12 h-12 text-indigo-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Novos</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.novo}</p>
              </div>
              <AlertCircle className="w-12 h-12 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Em Progresso</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.em_progresso}</p>
              </div>
              <Clock className="w-12 h-12 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-gray-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Fechados</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.fechado}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-gray-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                data-testid="search-input"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              data-testid="filter-status"
            >
              <option value="">Todos os Status</option>
              <option value="novo">Novo</option>
              <option value="em_progresso">Em Progresso</option>
              <option value="aguardando">Aguardando</option>
              <option value="fechado">Fechado</option>
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              data-testid="filter-priority"
            >
              <option value="">Todas as Prioridades</option>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
            {(filterStatus || filterPriority || searchQuery) && (
              <button
                onClick={() => {
                  setFilterStatus("");
                  setFilterPriority("");
                  setSearchQuery("");
                }}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition"
                data-testid="clear-filters-btn"
              >
                <X className="w-4 h-4" />
                Limpar Filtros
              </button>
            )}
          </div>
        </div>

        {/* Tickets Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="tickets-table">
              <thead className="bg-indigo-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Assunto</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">De</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Prioridade</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Data</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      <Ticket className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">Nenhum ticket encontrado</p>
                      <p className="text-sm mt-2">Clique em "Sync Gmail" para buscar novos emails</p>
                    </td>
                  </tr>
                ) : (
                  tickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      onClick={() => openTicket(ticket)}
                      className="hover:bg-gray-50 cursor-pointer transition"
                      data-testid={`ticket-row-${ticket.id}`}
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-indigo-600">#{ticket.id.substring(0, 8)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{ticket.subject}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{ticket.sender_name}</p>
                        <p className="text-xs text-gray-500">{ticket.sender_email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(ticket.status)}`}>
                          {getStatusLabel(ticket.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateStatus(ticket.id, 'em_progresso');
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Em Progresso"
                            data-testid={`status-progress-${ticket.id}`}
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateStatus(ticket.id, 'fechado');
                            }}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                            title="Fechar"
                            data-testid={`status-closed-${ticket.id}`}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            data-testid="ticket-modal"
          >
            {/* Modal Header */}
            <div className="bg-indigo-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-sm bg-white/20 px-3 py-1 rounded">
                      #{selectedTicket.id.substring(0, 8)}
                    </span>
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(selectedTicket.priority)}`}>
                      {selectedTicket.priority.charAt(0).toUpperCase() + selectedTicket.priority.slice(1)}
                    </span>
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedTicket.status)}`}>
                      {getStatusLabel(selectedTicket.status)}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold" data-testid="modal-subject">{selectedTicket.subject}</h3>
                </div>
                <button
                  onClick={closeModal}
                  className="text-white/80 hover:text-white transition ml-4"
                  data-testid="close-modal-btn"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Ticket Info */}
              <div className="flex items-center gap-6 text-sm text-gray-600 border-b pb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="font-medium">{selectedTicket.sender_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>{selectedTicket.sender_email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{new Date(selectedTicket.created_at).toLocaleString('pt-BR')}</span>
                </div>
              </div>

              {/* Ticket Body */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Mensagem Original
                </h4>
                <p className="text-gray-700 whitespace-pre-wrap" data-testid="modal-body">{selectedTicket.body}</p>
              </div>

              {/* Notes History */}
              {notes.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Histórico</h4>
                  <div className="space-y-3" data-testid="notes-list">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className={`p-4 rounded-lg ${
                          note.is_internal ? 'bg-yellow-50 border border-yellow-200' : 'bg-blue-50 border border-blue-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-600">
                            {note.is_internal ? '🔒 Nota Interna' : '📧 Resposta Enviada'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(note.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{note.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reply Section */}
              <div className="border-t pt-6">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Responder Ticket
                </h4>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Digite sua resposta... (será enviada por email)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                  rows="5"
                  data-testid="reply-textarea"
                />
                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={sendReply}
                    disabled={loading || !replyText.trim()}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="send-reply-btn"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Enviar Resposta por Email
                      </>
                    )}
                  </button>
                  <button
                    onClick={closeModal}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    Fechar
                  </button>
                </div>
              </div>

              {/* Internal Notes */}
              <div className="border-t pt-6">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Adicionar Nota
                </h4>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Adicione uma nota interna ou resposta..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                  rows="3"
                  data-testid="note-textarea"
                />
                <div className="flex items-center gap-3 mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      data-testid="internal-note-checkbox"
                    />
                    <span className="text-sm text-gray-700">Nota interna (não será enviada por email)</span>
                  </label>
                  <button
                    onClick={addNote}
                    disabled={!noteText.trim()}
                    className="ml-auto px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="add-note-btn"
                  >
                    Adicionar Nota
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
