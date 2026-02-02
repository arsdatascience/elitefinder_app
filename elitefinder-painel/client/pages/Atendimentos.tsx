import { useEffect, useState } from 'react';
import { Sparkles, RefreshCw, Eye, Calendar, User, MessageSquare, TrendingUp, Search, Filter } from 'lucide-react';
import { apiFetchAtendimentos, apiTriggerManualAnalysis } from '@/lib/analyticsApi';

interface Atendimento {
  id_atendimento: number;
  nome_cliente: string;
  id_cliente: string;
  telefone_cliente: string;
  id_atendente: string;
  data_hora_inicio: string;
  data_hora_fim: string;
  status_atendimento: string;
  canal_origem: string;
  id_analise: number | null;
  pontuacao_geral: number | null;
  sentimento_geral: string | null;
  tipo_atendimento: string | null;
  indicios_venda: string | null;
  canal_origem_conversa: string | null;
  produto_interesse: string | null;
  saudacao_inicial: string | null;
  uso_nome_cliente: string | null;
  rapport_empatia: string | null;
  uso_emojis: string | null;
  tom_conversa: string | null;
  erros_gramaticais: string | null;
  resolutividade: string | null;
  tempo_resposta: string | null;
  observacoes: string | null;
  data_analise: string | null;
  total_mensagens: number;
  mensagem_trecho: string | null;
}

export default function Atendimentos() {
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [selectedAtendimento, setSelectedAtendimento] = useState<Atendimento | null>(null);

  const fetchAtendimentos = async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * limit;
      const data = await apiFetchAtendimentos(limit, offset);

      setAtendimentos(data.atendimentos || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching atendimentos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAtendimentos();
  }, [page]);

  const handleAnalyze = async (id_atendimento: number) => {
    setAnalyzingId(id_atendimento);
    try {
      const result = await apiTriggerManualAnalysis({ id_atendimento });

      if (result.success) {
        alert('Análise disparada com sucesso! A análise será processada em breve.');
        // Reload data after a few seconds
        setTimeout(() => {
          fetchAtendimentos();
        }, 3000);
      } else {
        alert('Erro ao disparar análise: ' + result.message);
      }
    } catch (error) {
      console.error('Error triggering analysis:', error);
      alert('Erro ao disparar análise manual');
    } finally {
      setAnalyzingId(null);
    }
  };

  const filteredAtendimentos = atendimentos.filter((atend) => {
    const matchesSearch =
      atend.nome_cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      atend.id_atendente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      atend.id_cliente?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'analisado' && atend.id_analise !== null) ||
      (statusFilter === 'nao_analisado' && atend.id_analise === null) ||
      (statusFilter === 'fechado' && atend.status_atendimento === 'Fechado') ||
      (statusFilter === 'aberto' && atend.status_atendimento === 'Aberto');

    return matchesSearch && matchesStatus;
  });

  const getSentimentColor = (sentimento: string | null) => {
    if (!sentimento) return 'bg-gray-100 text-gray-800';
    switch (sentimento) {
      case 'Positivo':
        return 'bg-green-100 text-green-800';
      case 'Negativo':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gerenciamento de Atendimentos</h1>
          <p className="text-gray-600">
            Visualize e analise todos os atendimentos com inteligência artificial
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{total}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Analisados</p>
                <p className="text-2xl font-bold text-green-600">
                  {atendimentos.filter(a => a.id_analise !== null).length}
                </p>
              </div>
              <Sparkles className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold text-orange-600">
                  {atendimentos.filter(a => a.id_analise === null && a.status_atendimento === 'Fechado').length}
                </p>
              </div>
              <RefreshCw className="w-8 h-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Média Score</p>
                <p className="text-2xl font-bold text-purple-600">
                  {atendimentos.filter(a => a.pontuacao_geral).length > 0
                    ? (atendimentos
                        .filter(a => a.pontuacao_geral)
                        .reduce((sum, a) => sum + (a.pontuacao_geral || 0), 0) /
                        atendimentos.filter(a => a.pontuacao_geral).length).toFixed(1)
                    : 'N/A'}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por cliente, atendente ou telefone..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="analisado">Analisados</option>
                <option value="nao_analisado">Não Analisados</option>
                <option value="fechado">Fechados</option>
                <option value="aberto">Abertos</option>
              </select>
            </div>

            <button
              onClick={() => fetchAtendimentos()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Atendente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sentimento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      Carregando...
                    </td>
                  </tr>
                ) : filteredAtendimentos.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      Nenhum atendimento encontrado
                    </td>
                  </tr>
                ) : (
                  filteredAtendimentos.map((atend) => (
                    <tr key={atend.id_atendimento} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{atend.id_atendimento}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{atend.nome_cliente}</div>
                        <div className="text-sm text-gray-500">{atend.telefone_cliente || atend.id_cliente}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {atend.id_atendente}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {atend.data_hora_inicio ? new Date(atend.data_hora_inicio).toLocaleDateString('pt-BR') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            atend.status_atendimento === 'Fechado'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {atend.status_atendimento}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {atend.pontuacao_geral !== null ? atend.pontuacao_geral.toFixed(1) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {atend.sentimento_geral ? (
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getSentimentColor(
                              atend.sentimento_geral
                            )}`}
                          >
                            {atend.sentimento_geral}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedAtendimento(atend)}
                            className="text-blue-600 hover:text-blue-800 transition"
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {atend.id_analise === null && (
                            <button
                              onClick={() => handleAnalyze(atend.id_atendimento)}
                              disabled={analyzingId === atend.id_atendimento}
                              className={`text-purple-600 hover:text-purple-800 transition ${
                                analyzingId === atend.id_atendimento ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                              title="Analisar com IA"
                            >
                              {analyzingId === atend.id_atendimento ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Sparkles className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          {atend.id_analise !== null && (
                            <button
                              onClick={() => handleAnalyze(atend.id_atendimento)}
                              disabled={analyzingId === atend.id_atendimento}
                              className={`text-green-600 hover:text-green-800 transition ${
                                analyzingId === atend.id_atendimento ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                              title="Re-analisar"
                            >
                              {analyzingId === atend.id_atendimento ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Mostrando {((page - 1) * limit) + 1} a {Math.min(page * limit, total)} de {total} atendimentos
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <span className="px-4 py-2 text-sm text-gray-700">
                  Página {page} de {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal de detalhes */}
        {selectedAtendimento && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Atendimento #{selectedAtendimento.id_atendimento}
                  </h2>
                  <button
                    onClick={() => setSelectedAtendimento(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                {/* Informações básicas */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-500">Cliente</p>
                    <p className="font-medium">{selectedAtendimento.nome_cliente}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Telefone</p>
                    <p className="font-medium">{selectedAtendimento.telefone_cliente || selectedAtendimento.id_cliente}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Atendente</p>
                    <p className="font-medium">{selectedAtendimento.id_atendente}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="font-medium">{selectedAtendimento.status_atendimento}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Data Início</p>
                    <p className="font-medium">
                      {selectedAtendimento.data_hora_inicio
                        ? new Date(selectedAtendimento.data_hora_inicio).toLocaleString('pt-BR')
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Mensagens</p>
                    <p className="font-medium">{selectedAtendimento.total_mensagens}</p>
                  </div>
                </div>

                {/* Análise IA */}
                {selectedAtendimento.id_analise !== null ? (
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold mb-4">Análise de IA</h3>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600">Pontuação</p>
                        <p className="text-3xl font-bold text-blue-600">
                          {selectedAtendimento.pontuacao_geral?.toFixed(1)}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600">Sentimento</p>
                        <p className="text-lg font-semibold text-green-600">
                          {selectedAtendimento.sentimento_geral}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-gray-600">Tipo</p>
                        <p className="text-lg font-semibold text-purple-600">
                          {selectedAtendimento.tipo_atendimento}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Saudação Inicial</p>
                        <p className="font-medium">{selectedAtendimento.saudacao_inicial || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Uso Nome Cliente</p>
                        <p className="font-medium">{selectedAtendimento.uso_nome_cliente || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Rapport/Empatia</p>
                        <p className="font-medium">{selectedAtendimento.rapport_empatia || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Tom da Conversa</p>
                        <p className="font-medium">{selectedAtendimento.tom_conversa || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Resolutividade</p>
                        <p className="font-medium">{selectedAtendimento.resolutividade || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Tempo Resposta</p>
                        <p className="font-medium">{selectedAtendimento.tempo_resposta || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Indícios de Venda</p>
                        <p className="font-medium">{selectedAtendimento.indicios_venda || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Produto Interesse</p>
                        <p className="font-medium">{selectedAtendimento.produto_interesse || 'N/A'}</p>
                      </div>
                    </div>

                    {selectedAtendimento.observacoes && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-500 mb-2">Observações</p>
                        <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                          {selectedAtendimento.observacoes}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border-t border-gray-200 pt-6 text-center">
                    <p className="text-gray-500 mb-4">Este atendimento ainda não foi analisado pela IA</p>
                    {selectedAtendimento.status_atendimento === 'Fechado' && (
                      <button
                        onClick={() => {
                          handleAnalyze(selectedAtendimento.id_atendimento);
                          setSelectedAtendimento(null);
                        }}
                        className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2 mx-auto"
                      >
                        <Sparkles className="w-5 h-5" />
                        Analisar Agora
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
