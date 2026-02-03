import { useEffect, useState } from "react";
import logo from "../assets/12597368.png";

type Sessao = {
  id: string;
  name: string;
  status: string;
  metadata?: object;
  account?: string;
  createdAt?: string;
  updatedAt?: string;
};

function statusLabel(status: string) {
  if (status === "WORKING") return { text: "Conectado", color: "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-200", emoji: "🟢" };
  if (status === "SCAN_QR_CODE") return { text: "Aguardando QR", color: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-200", emoji: "🟡" };
  if (status === "FAILED") return { text: "Erro", color: "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-200", emoji: "🔴" };
  if (status === "STOPPED") return { text: "Desconectado", color: "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300", emoji: "⚪" };
  return { text: status, color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300", emoji: "⚪" };
}

export default function Sessoes() {
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Controle de QR Code Modal
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  // Criar Nova Sessão (Admin)
  const [newSessionName, setNewSessionName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Constantes de API
  const wahaBase = import.meta.env.VITE_WAHA_BASE || '/api/proxy/waha';
  const apiKey = import.meta.env.VITE_WAHA_API_KEY || '';
  const headers = { 'x-api-key': apiKey, 'Content-Type': 'application/json' };

  const fetchSessoes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      // 1. Identificar Usuário
      const userRes = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      let userIsAdmin = false;
      let mySlug = '';

      if (userRes.ok) {
        const userData = await userRes.json();
        const role = userData.user?.role;
        mySlug = userData.user?.tenant?.slug;
        if (role === 'superadmin') {
          userIsAdmin = true;
          setIsAdmin(true);
        }
      }

      // 2. Buscar sessões
      const res = await fetch(`${wahaBase}/api/sessions?all=true`, { headers });
      const data = await res.json();
      let arr: Sessao[] = Array.isArray(data) ? data : Object.values(data);

      if (!userIsAdmin) {
        arr = arr.filter(s => s.name === mySlug);
      }

      setSessoes(arr);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessoes();
    // Auto refresh a cada 5s para Admin acompanhar conexões
    const interval = setInterval(() => {
      // if (isAdmin) fetchSessoes(); // Optei por não dar auto-refresh constante para não spammar, mas pode descomentar
    }, 5000);
    return () => clearInterval(interval);
  }, [isAdmin]); // Re-run if admin status changes (not strictly needed but good dependency)

  // Ações de Admin
  const handleStartSession = async (name: string) => {
    if (!confirm(`Iniciar sessão para ${name}?`)) return;
    try {
      // Envia config de webhooks padrão
      const body = {
        name,
        config: {
          webhooks: [
            {
              url: "http://n8n:5678/webhook/webhook",
              events: ["message.any"],
              hmac: null,
              retries: null,
              customHeaders: null
            }
          ]
        }
      };
      await fetch(`${wahaBase}/api/sessions/${name}/start`, { method: 'POST', headers, body: JSON.stringify(body) });
      // Se der 404 (não existe), cria:
      await fetch(`${wahaBase}/api/sessions/start`, { method: 'POST', headers, body: JSON.stringify(body) });

      alert(`Comando de início enviado para ${name}. Aguarde.`);
      fetchSessoes();
    } catch (e) {
      alert('Erro ao iniciar');
    }
  };

  const handleStopSession = async (name: string) => {
    if (!confirm(`Parar sessão ${name}?`)) return;
    try {
      await fetch(`${wahaBase}/api/sessions/${name}/stop`, { method: 'POST', headers });
      fetchSessoes();
    } catch (e) { alert('Erro ao parar'); }
  };

  const handleLogoutSession = async (name: string) => {
    if (!confirm(`DESCONECTAR (Logout) ${name}? Isso exigirá novo QR Code.`)) return;
    try {
      await fetch(`${wahaBase}/api/sessions/${name}/logout`, { method: 'POST', headers });
      fetchSessoes();
    } catch (e) { alert('Erro ao fazer logout'); }
  };

  const handleCreateSession = async () => {
    if (!newSessionName) return;
    setIsCreating(true);
    try {
      const body = {
        name: newSessionName,
        config: {
          webhooks: [
            {
              url: "http://n8n:5678/webhook/webhook",
              events: ["message.any"],
              hmac: null,
              retries: null,
              customHeaders: null
            }
          ]
        }
      };
      await fetch(`${wahaBase}/api/sessions/start`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
      });
      alert(`Sessão ${newSessionName} criada!`);
      setNewSessionName('');
      fetchSessoes();
    } catch (e) {
      alert('Erro ao criar sessão');
    } finally {
      setIsCreating(false);
    }
  };

  const handleViewQR = async (name: string) => {
    setSelectedSession(name);
    setQrLoading(true);
    setQrCode(null);
    try {
      // Endpoint de imagem
      const res = await fetch(`${wahaBase}/api/${name}/auth/qr`, {
        headers: { ...headers, 'Accept': 'image/png' }
      });
      if (res.ok) {
        const blob = await res.blob();
        setQrCode(URL.createObjectURL(blob));
      } else {
        // Se falhar (ex: 422), tenta startar se estiver parada
        // Mas por padrão só avisa
        if (res.status === 422) alert('Sessão não está pronta para QR. Tente "Iniciar" primeiro.');
        else alert('Não foi possível obter o QR Code. Sessão conectada?');
      }
    } catch (e) {
      console.error(e);
      alert('Erro de conexão ao buscar QR.');
    } finally {
      setQrLoading(false);
    }
  };

  const closeQR = () => {
    setQrCode(null);
    setSelectedSession(null);
  };


  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors duration-300">
      {/* Top Navigation Bar */}
      <header className="w-full h-20 sm:h-22 px-3 sm:px-5 flex items-center justify-center gap-2 sm:gap-3 bg-white dark:bg-black shadow-[0_0_6px_0_rgba(0,0,0,0.12)] dark:shadow-[0_0_6px_0_rgba(255,255,255,0.12)] fixed top-0 left-0 right-0 z-50 transition-colors duration-300">
        <img src={logo} alt="Logo" className="w-16 sm:w-20 md:w-24 h-16 sm:h-20 md:h-24 object-contain flex-shrink-0" />
        <h1 className="flex-1 text-black dark:text-white font-roboto text-sm sm:text-base md:text-lg lg:text-[28px] font-medium leading-tight sm:leading-9">
          WAHA Controle de Painel {isAdmin && <span className="text-sm bg-red-600 text-white px-2 py-1 rounded ml-2">SUPERADMIN</span>}
        </h1>
        <nav className="hidden md:flex items-center gap-6 lg:gap-10">
          <a href="/" className="text-black dark:text-white font-roboto text-sm lg:text-base hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Home</a>
          <a href="/sessoes" className="text-black dark:text-white border-b-2 border-black dark:border-white font-roboto text-sm lg:text-base transition-colors">Sessões</a>
          <a href="/configuracoes" className="text-black dark:text-white font-roboto text-sm lg:text-base hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Configurações</a>
        </nav>
      </header>

      <main className="pt-24 sm:pt-20">
        <section className="flex flex-col py-8 sm:py-12 px-4 sm:px-6 md:px-10 lg:px-[170px] items-center gap-6 w-full">

          <div className="flex justify-between w-full items-center">
            <h2 className="text-black dark:text-white font-roboto text-xl sm:text-2xl font-bold">
              Gerenciamento de Sessões
            </h2>
            <button onClick={() => fetchSessoes()} className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-600 px-3 py-1 rounded">
              Atualizar Lista
            </button>
          </div>

          {/* Superadmin Criação */}
          {isAdmin && (
            <div className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 flex gap-4 items-center flex-wrap">
              <span className="font-bold text-sm">Nova Sessão:</span>
              <input
                type="text"
                placeholder="Nome do Tenant (slug)"
                value={newSessionName}
                onChange={e => setNewSessionName(e.target.value)}
                className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
              />
              <button
                onClick={handleCreateSession}
                disabled={isCreating || !newSessionName}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {isCreating ? 'Criando...' : 'Criar Sessão'}
              </button>
            </div>
          )}

          {loading ? (
            <p className="text-gray-500">Carregando...</p>
          ) : sessoes.length === 0 ? (
            <p>Nenhuma sessão ativa.</p>
          ) : (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full">
              {sessoes.map(sessao => {
                const label = statusLabel(sessao.status);
                return (
                  <div key={sessao.id || sessao.name} className="p-4 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col gap-3 relative">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-2 items-center">
                        <span className="text-2xl">{label.emoji}</span>
                        <div>
                          <h3 className="font-semibold text-lg">{sessao.name}</h3>
                          <p className="text-xs text-gray-500">Status: {sessao.status}</p>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex flex-col gap-1">
                          {sessao.status === 'STOPPED' || sessao.status === 'FAILED' ? (
                            <button onClick={() => handleStartSession(sessao.name)} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Iniciar</button>
                          ) : (
                            <button onClick={() => handleStopSession(sessao.name)} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Parar</button>
                          )}
                          <button onClick={() => handleLogoutSession(sessao.name)} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Logout</button>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-gray-600 dark:text-gray-300">ID Conta: {sessao.account || "N/A"}</p>

                    <div className="mt-2 flex justify-center">
                      {(sessao.status === 'SCAN_QR_CODE' || (isAdmin && sessao.status === 'STARTING')) && (
                        <button
                          onClick={() => handleViewQR(sessao.name)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M7 7h3v3H7z"></path><path d="M14 7h3v3h-3z"></path><path d="M7 14h3v3H7z"></path><path d="M14 14h3v3h-3z"></path></svg>
                          Ver QR Code
                        </button>
                      )}
                      {sessao.status === 'WORKING' && (
                        <button disabled className="w-full bg-green-50 text-green-700 font-medium py-2 rounded-lg border border-green-200 cursor-default">
                          Sessão Ativa
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Modal QR Code */}
        {selectedSession && (
          <div className="fixed inset-0 z-[60] bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl max-w-sm w-full shadow-2xl relative">
              <button onClick={closeQR} className="absolute top-4 right-4 text-gray-500 hover:text-black dark:hover:text-white">✕</button>
              <h3 className="text-xl font-bold mb-4 text-center">QR Code: {selectedSession}</h3>

              <div className="flex flex-col items-center justify-center min-h-[250px] bg-gray-100 dark:bg-gray-800 rounded-xl p-4">
                {qrLoading ? (
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                ) : qrCode ? (
                  <img src={qrCode} alt="QR Code" className="w-64 h-64 object-contain" />
                ) : (
                  <div className="text-center">
                    <p className="text-red-500 mb-2">Não foi possível carregar o QR.</p>
                    <button onClick={() => handleViewQR(selectedSession)} className="text-blue-500 underline text-sm">Tentar Novamente</button>
                  </div>
                )}
              </div>
              <p className="text-center text-xs text-gray-500 mt-4">Abra o WhatsApp {'>'} Aparelhos Conectados {'>'} Conectar</p>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
