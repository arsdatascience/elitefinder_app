import { Bell, CheckCircle, AlertTriangle, AlertCircle, TrendingUp, X, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchAlerts, fetchAlertSummary, resolveAlert, markAlertAsRead, Alert, AlertSummary } from '../lib/alertsApi';

const alertStyles = {
    critico: {
        bg: 'bg-red-500/10 border-red-500/30',
        icon: AlertCircle,
        iconColor: 'text-red-500',
        badge: 'bg-red-500'
    },
    urgente: {
        bg: 'bg-orange-500/10 border-orange-500/30',
        icon: AlertTriangle,
        iconColor: 'text-orange-500',
        badge: 'bg-orange-500'
    },
    atencao: {
        bg: 'bg-yellow-500/10 border-yellow-500/30',
        icon: Bell,
        iconColor: 'text-yellow-500',
        badge: 'bg-yellow-500'
    },
    positivo: {
        bg: 'bg-green-500/10 border-green-500/30',
        icon: TrendingUp,
        iconColor: 'text-green-500',
        badge: 'bg-green-500'
    }
};

export function AlertBanner() {
    const [summary, setSummary] = useState<AlertSummary | null>(null);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [showPanel, setShowPanel] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
        // Refresh every 30 seconds
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, []);

    async function loadData() {
        try {
            const [summaryData, alertsData] = await Promise.all([
                fetchAlertSummary(),
                fetchAlerts({ limit: 10 })
            ]);
            setSummary(summaryData);
            setAlerts(alertsData.alerts);
        } catch (err) {
            console.error('Erro ao carregar alertas:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleResolve(id: number) {
        try {
            await resolveAlert(id);
            loadData();
        } catch (err) {
            console.error('Erro ao resolver alerta:', err);
        }
    }

    async function handleRead(id: number) {
        try {
            await markAlertAsRead(id);
        } catch (err) {
            console.error('Erro ao marcar como lido:', err);
        }
    }

    if (loading || !summary) return null;

    const hasAlerts = summary.total_ativos > 0;
    const hasCritical = summary.criticos > 0;

    return (
        <>
            {/* Banner fixo no topo */}
            {hasCritical && (
                <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 animate-pulse" />
                        <span className="font-medium">
                            {summary.criticos} alerta{summary.criticos > 1 ? 's' : ''} crítico{summary.criticos > 1 ? 's' : ''} requer{summary.criticos > 1 ? 'em' : ''} atenção imediata!
                        </span>
                    </div>
                    <button
                        onClick={() => setShowPanel(true)}
                        className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-sm transition"
                    >
                        Ver Alertas
                    </button>
                </div>
            )}

            {/* Badge de notificação */}
            <button
                onClick={() => setShowPanel(true)}
                className="fixed top-4 right-4 z-50 p-2 bg-slate-800 rounded-full shadow-lg hover:bg-slate-700 transition"
            >
                <Bell className="w-5 h-5 text-white" />
                {hasAlerts && (
                    <span className={`absolute -top-1 -right-1 w-5 h-5 ${hasCritical ? 'bg-red-500' : 'bg-orange-500'} text-white text-xs rounded-full flex items-center justify-center`}>
                        {summary.total_ativos}
                    </span>
                )}
            </button>

            {/* Painel lateral */}
            {showPanel && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowPanel(false)} />
                    <div className="relative w-full max-w-md bg-slate-900 h-full overflow-y-auto shadow-xl">
                        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Bell className="w-5 h-5" />
                                Alertas
                            </h2>
                            <button onClick={() => setShowPanel(false)} className="p-1 hover:bg-slate-700 rounded">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {/* Summary cards */}
                        <div className="p-4 grid grid-cols-4 gap-2">
                            <div className="bg-red-500/20 p-2 rounded text-center">
                                <div className="text-xl font-bold text-red-400">{summary.criticos}</div>
                                <div className="text-xs text-red-300">Críticos</div>
                            </div>
                            <div className="bg-orange-500/20 p-2 rounded text-center">
                                <div className="text-xl font-bold text-orange-400">{summary.urgentes}</div>
                                <div className="text-xs text-orange-300">Urgentes</div>
                            </div>
                            <div className="bg-yellow-500/20 p-2 rounded text-center">
                                <div className="text-xl font-bold text-yellow-400">{summary.atencao}</div>
                                <div className="text-xs text-yellow-300">Atenção</div>
                            </div>
                            <div className="bg-green-500/20 p-2 rounded text-center">
                                <div className="text-xl font-bold text-green-400">{summary.positivos}</div>
                                <div className="text-xs text-green-300">Positivos</div>
                            </div>
                        </div>

                        {/* Alert list */}
                        <div className="p-4 space-y-3">
                            {alerts.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p>Nenhum alerta ativo</p>
                                </div>
                            ) : (
                                alerts.map(alert => {
                                    const style = alertStyles[alert.tipo] || alertStyles.atencao;
                                    const Icon = style.icon;

                                    return (
                                        <div
                                            key={alert.id}
                                            className={`p-3 rounded-lg border ${style.bg} transition hover:scale-[1.02]`}
                                            onClick={() => handleRead(alert.id)}
                                        >
                                            <div className="flex items-start gap-3">
                                                <Icon className={`w-5 h-5 mt-0.5 ${style.iconColor}`} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 text-xs rounded ${style.badge} text-white uppercase`}>
                                                            {alert.tipo}
                                                        </span>
                                                        <span className="text-xs text-gray-400">
                                                            {new Date(alert.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-white text-sm mt-1">{alert.mensagem}</p>
                                                    {alert.nome_cliente && (
                                                        <p className="text-gray-400 text-xs mt-1">Cliente: {alert.nome_cliente}</p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleResolve(alert.id); }}
                                                    className="p-1 hover:bg-white/10 rounded"
                                                    title="Resolver"
                                                >
                                                    <CheckCircle className="w-4 h-4 text-gray-400 hover:text-green-400" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// Componente de resumo para Dashboard
export function AlertSummaryCard() {
    const [summary, setSummary] = useState<AlertSummary | null>(null);

    useEffect(() => {
        fetchAlertSummary().then(setSummary).catch(console.error);
    }, []);

    if (!summary) return null;

    return (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-medium flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Alertas Ativos
                </h3>
                <span className="text-2xl font-bold text-white">{summary.total_ativos}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-gray-400">Críticos:</span>
                    <span className="text-white font-medium">{summary.criticos}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    <span className="text-gray-400">Urgentes:</span>
                    <span className="text-white font-medium">{summary.urgentes}</span>
                </div>
            </div>
        </div>
    );
}
