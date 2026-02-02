import React, { useState } from 'react';
import { Save, User, Palette, ClipboardList, ArrowLeft, LifeBuoy, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
const Configuracoes = ({ onBackToDashboard }: { onBackToDashboard: () => void }) => {
  const navigate = useNavigate();
  const [theme, setTheme] = useState('light');
  
  // Estados do formulário de suporte
  const [supportForm, setSupportForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<'idle' | 'success' | 'error'>('idle');


  const handleSave = () => {
    alert("Configurações salvas com sucesso!");
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setSendStatus('idle');

    try {
      // Usando EmailJS para enviar email
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: 'service_mncksag', // Você precisará criar uma conta no EmailJS
          template_id: 'template_702lwms',
          user_id: '-qRusgbSTE_dClmQ6', // Chave pública do EmailJS
          template_params: {
            from_name: supportForm.name,
            from_email: supportForm.email,
            subject: supportForm.subject,
            message: supportForm.message,
            to_email: 'henriquerocha1357@gmail.com'
          }
        })
      });

      if (response.ok) {
        setSendStatus('success');
        setSupportForm({ name: '', email: '', subject: '', message: '' });
        setTimeout(() => setSendStatus('idle'), 5000);
      } else {
        setSendStatus('error');
      }
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      setSendStatus('error');
    } finally {
      setIsSending(false);
    }
  };

  const mockCriteria = {
    saudacao: "Adequada",
    empatia: "Alta",
    tempo: "Rápido"
  };

  return (
    <div className="py-6 sm:py-8 md:py-10 px-3 sm:px-4 md:px-8 lg:px-16 xl:px-32 bg-gray-50 min-h-screen">
      <header className="mb-6 sm:mb-8 md:mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-none mb-1">Configurações</h1>
          <p className="text-gray-600 text-sm sm:text-base">Gerencie as preferências da sua conta e da análise de IA.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={() => navigate('/dashboard', { state: { fromSettings: true } })} 
            className="flex items-center justify-center px-4 sm:px-5 py-2 text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Voltar para o Dashboard</span>
            <span className="sm:hidden">Voltar</span>
          </button>
          <button onClick={handleSave} className="px-4 sm:px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-100">
            <Save className="w-4 h-4 mr-2" />
            Salvar Alterações
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8 md:gap-10">
        {/* Coluna 1: Perfil + Aparência */}
        <div className="flex flex-col gap-6 sm:gap-8">
          <div className="bg-white p-5 sm:p-6 md:p-8 rounded-2xl shadow-lg border border-gray-100">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center">
              <User className="w-4 sm:w-5 h-4 sm:h-5 mr-2 text-gray-400" /> Perfil do Usuário
            </h3>
            <div className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nome</label>
                <input type="text" defaultValue="Admin Elite Finder" className="w-full p-2.5 sm:p-3 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                <input type="email" defaultValue="admin@elitefinder.com" className="w-full p-2.5 sm:p-3 border border-gray-200 rounded-lg text-sm bg-gray-100" disabled />
              </div>
            </div>
          </div>
          <div className="bg-white p-5 sm:p-6 md:p-8 rounded-2xl shadow-lg border border-gray-100">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center">
              <Palette className="w-4 sm:w-5 h-4 sm:h-5 mr-2 text-gray-400" /> Aparência
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-sm sm:text-base font-medium text-gray-700">Modo Escuro</span>
              <button 
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
                className={`relative inline-flex h-6 sm:h-7 w-12 sm:w-14 items-center rounded-full transition-colors ${theme === 'dark' ? 'bg-indigo-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 sm:h-5 w-4 sm:w-5 transform rounded-full bg-white transition-transform shadow ${theme === 'dark' ? 'translate-x-6 sm:translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2 bg-white p-5 sm:p-6 md:p-8 rounded-2xl shadow-lg border border-gray-100">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center">
            <ClipboardList className="w-4 sm:w-5 h-4 sm:h-5 mr-2 text-gray-400" /> Critérios da Análise IA
          </h3>
          <p className="text-sm sm:text-base text-gray-500 mb-6 sm:mb-8">
            Ajuste os critérios que a IA utiliza para pontuar as conversas. As alterações impactarão futuras análises.
          </p>
          <div className="space-y-4 sm:space-y-6">
            {Object.entries(mockCriteria).map(([key, value]) => (
              <div key={key} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 sm:p-4 border border-gray-100 rounded-xl bg-gray-50">
                <span className="text-sm sm:text-base font-medium text-gray-700 capitalize">{key}</span>
                <select defaultValue={value} className="w-full md:w-48 px-3 py-2 text-sm sm:text-base rounded-md border border-gray-200 bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200">
                  <option>Adequada</option>
                  <option>Ausente</option>
                  <option>Alta</option>
                  <option>Baixa</option>
                  <option>Moderada</option>
                  <option>Rápido</option>
                  <option>Lento</option>
                  <option>Razoável</option>
                </select>
              </div>
            ))}
            <div className="pt-4 sm:pt-6 border-t border-dashed border-gray-200">
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">Palavras-chave para Alertas (Negativo)</label>
              <input type="text" placeholder="Ex: problema, cancelar, péssimo, não resolveu" className="w-full p-2.5 sm:p-3 border border-gray-200 rounded-lg text-sm sm:text-base bg-gray-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Configuracoes;
