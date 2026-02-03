import React, { useState } from 'react';
import { Bot, Sparkles, AlertTriangle, CheckCircle, Brain, ChevronRight, Loader2, Send, Activity } from 'lucide-react';

interface AgentAssistantProps {
    conversationId: string;
    messages: any[]; // Tipagem simplificada para flexibilidade
    onSuggestionClick?: (suggestion: string) => void;
    compact?: boolean;
}

interface AnalysisResult {
    score: number;
    sentiment: string;
    summary: string;
    strengths: string[];
    weaknesses: string[];
    suggestion?: string;
    risk_level: string;
}

export function AgentAssistant({ conversationId, messages, onSuggestionClick, compact = false }: AgentAssistantProps) {
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleAnalyze = async () => {
        if (!messages || messages.length === 0) {
            setError("Não há mensagens para analisar.");
            return;
        }

        setAnalyzing(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'}/api/agent/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    conversationId,
                    messages: messages.map(m => ({
                        role: m.fromMe ? 'atendente' : 'cliente',
                        content: m.body,
                        timestamp: m.timestamp
                    })),
                    context: "Atendimento via WhatsApp"
                })
            });

            if (!res.ok) throw new Error('Falha na análise da IA');

            const data = await res.json();
            setResult(data);
        } catch (err) {
            setError("O Agente não conseguiu processar esta conversa no momento.");
            console.error(err);
        } finally {
            setAnalyzing(false);
        }
    };

    if (compact) {
        return (
            <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full text-xs font-medium hover:shadow-lg transition-all disabled:opacity-70"
            >
                {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {analyzing ? 'Pensando...' : 'IA Insight'}
            </button>
        );
    }

    return (
        <div className="bg-white border sm:border-l border-gray-200 h-full flex flex-col bg-slate-50">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <Bot className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-sm">Super Agente</h3>
                        <p className="text-[10px] text-gray-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            Online & Pronto
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {!result && !analyzing && (
                    <div className="text-center py-10 opacity-60">
                        <Brain className="w-12 h-12 mx-auto text-indigo-300 mb-3" />
                        <p className="text-sm text-gray-500 font-medium">Estou pronto para auditar este atendimento.</p>
                        <button
                            onClick={handleAnalyze}
                            className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition shadow-md hover:shadow-lg transform active:scale-95"
                        >
                            Analisar Conversa
                        </button>
                    </div>
                )}

                {analyzing && (
                    <div className="text-center py-10 space-y-4">
                        <div className="relative w-16 h-16 mx-auto">
                            <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                            <Bot className="absolute inset-0 m-auto w-6 h-6 text-indigo-600 animate-pulse" />
                        </div>
                        <p className="text-sm text-indigo-800 font-medium animate-pulse">Processando com GPT-5.2 e Claude...</p>
                    </div>
                )}

                {result && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Score Card */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className={`p-3 rounded-xl border ${result.score >= 70 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <p className="text-xs text-gray-500 font-medium uppercase">Score de Qualidade</p>
                                <div className="flex items-end gap-1">
                                    <span className={`text-2xl font-bold ${result.score >= 70 ? 'text-green-700' : 'text-red-700'}`}>{result.score}</span>
                                    <span className="text-xs text-gray-400 mb-1">/100</span>
                                </div>
                            </div>
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                                <p className="text-xs text-gray-500 font-medium uppercase">Risco Detectado</p>
                                <div className="flex items-center gap-2 mt-1">
                                    {result.risk_level === 'Alto' ? <AlertTriangle className="w-5 h-5 text-red-500" /> : <CheckCircle className="w-5 h-5 text-blue-500" />}
                                    <span className="font-bold text-gray-700">{result.risk_level}</span>
                                </div>
                            </div>
                        </div>

                        {/* Sugestão Criativa */}
                        {result.suggestion && (
                            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-xl border border-indigo-100 shadow-sm relative overflow-hidden group">
                                <div className="absolute -right-4 -top-4 w-16 h-16 bg-purple-200 rounded-full opacity-20 group-hover:scale-150 transition-transform"></div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="w-4 h-4 text-purple-600" />
                                    <h4 className="text-xs font-bold text-purple-800 uppercase tracking-wide">Sugestão Estratégica</h4>
                                </div>
                                <p className="text-sm text-gray-700 italic leading-relaxed">"{result.suggestion}"</p>
                                {onSuggestionClick && (
                                    <button
                                        onClick={() => onSuggestionClick(result.suggestion!)}
                                        className="mt-3 text-xs flex items-center gap-1 text-purple-700 hover:text-purple-900 font-medium"
                                    >
                                        Usar esta resposta <Send className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Pontos Fortes e Fracos */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                                <Activity className="w-4 h-4" /> Análise Lógica
                            </h4>
                            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                <div className="mb-3">
                                    <p className="text-xs font-semibold text-green-600 mb-1 flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" /> Pontos Fortes
                                    </p>
                                    <ul className="space-y-1">
                                        {result.strengths.map((s, i) => (
                                            <li key={i} className="text-xs text-gray-600 pl-4 relative before:content-['•'] before:absolute before:left-1 before:text-green-300">
                                                {s}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {result.weaknesses.length > 0 && (
                                    <div className="pt-2 border-t border-gray-100">
                                        <p className="text-xs font-semibold text-red-600 mb-1 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" /> Pontos de Atenção
                                        </p>
                                        <ul className="space-y-1">
                                            {result.weaknesses.map((w, i) => (
                                                <li key={i} className="text-xs text-gray-600 pl-4 relative before:content-['•'] before:absolute before:left-1 before:text-red-300">
                                                    {w}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Resumo */}
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">Resumo Executivo</h4>
                            <p className="text-xs text-gray-600 leading-relaxed">{result.summary}</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 flex items-start gap-2 animate-pulse">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <p>{error}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
