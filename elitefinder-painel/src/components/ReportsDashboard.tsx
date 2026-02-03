import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Calendar, Award, Lightbulb, Clock } from 'lucide-react';
import { fetchDailyReport, fetchWeeklyReport, fetchInsights, DailyReport, WeeklyReport, Insights } from '../lib/alertsApi';

export function ReportsDashboard() {
    const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'insights'>('daily');
    const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
    const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
    const [insights, setInsights] = useState<Insights | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    async function loadData() {
        setLoading(true);
        try {
            if (activeTab === 'daily') {
                const data = await fetchDailyReport();
                setDailyReport(data);
            } else if (activeTab === 'weekly') {
                const data = await fetchWeeklyReport();
                setWeeklyReport(data);
            } else {
                const data = await fetchInsights();
                setInsights(data);
            }
        } catch (err) {
            console.error('Erro ao carregar relatório:', err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-800">
                <button
                    onClick={() => setActiveTab('daily')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition flex items-center justify-center gap-2 ${activeTab === 'daily' ? 'bg-slate-800 text-white' : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <Calendar className="w-4 h-4" />
                    Hoje
                </button>
                <button
                    onClick={() => setActiveTab('weekly')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition flex items-center justify-center gap-2 ${activeTab === 'weekly' ? 'bg-slate-800 text-white' : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <BarChart3 className="w-4 h-4" />
                    Semanal
                </button>
                <button
                    onClick={() => setActiveTab('insights')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition flex items-center justify-center gap-2 ${activeTab === 'insights' ? 'bg-slate-800 text-white' : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <Lightbulb className="w-4 h-4" />
                    Insights
                </button>
            </div>

            {/* Content */}
            <div className="p-4">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
                    </div>
                ) : (
                    <>
                        {activeTab === 'daily' && dailyReport && (
                            <DailyReportView report={dailyReport} />
                        )}
                        {activeTab === 'weekly' && weeklyReport && (
                            <WeeklyReportView report={weeklyReport} />
                        )}
                        {activeTab === 'insights' && insights && (
                            <InsightsView data={insights} />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function DailyReportView({ report }: { report: DailyReport }) {
    return (
        <div className="space-y-4">
            {/* Métricas principais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard
                    label="Atendimentos"
                    value={report.metricas.total_atendimentos}
                    icon={Users}
                />
                <MetricCard
                    label="Score Médio"
                    value={report.metricas.score_medio || 'N/A'}
                    icon={TrendingUp}
                    color={Number(report.metricas.score_medio) >= 70 ? 'green' : 'orange'}
                />
                <MetricCard
                    label="Positivos"
                    value={report.metricas.positivos}
                    icon={Award}
                    color="green"
                />
                <MetricCard
                    label="Negativos"
                    value={report.metricas.negativos}
                    icon={Clock}
                    color="red"
                />
            </div>

            {/* Alertas do dia */}
            <div className="bg-slate-800/50 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">Alertas Gerados Hoje</h4>
                <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-red-500/20 rounded p-2">
                        <div className="text-lg font-bold text-red-400">{report.alertas.criticos}</div>
                        <div className="text-xs text-gray-400">Críticos</div>
                    </div>
                    <div className="bg-orange-500/20 rounded p-2">
                        <div className="text-lg font-bold text-orange-400">{report.alertas.urgentes}</div>
                        <div className="text-xs text-gray-400">Urgentes</div>
                    </div>
                    <div className="bg-yellow-500/20 rounded p-2">
                        <div className="text-lg font-bold text-yellow-400">{report.alertas.atencao}</div>
                        <div className="text-xs text-gray-400">Atenção</div>
                    </div>
                    <div className="bg-green-500/20 rounded p-2">
                        <div className="text-lg font-bold text-green-400">{report.alertas.positivos}</div>
                        <div className="text-xs text-gray-400">Positivos</div>
                    </div>
                </div>
            </div>

            {/* Ranking */}
            {report.ranking.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">Top Atendentes Hoje</h4>
                    <div className="space-y-2">
                        {report.ranking.map((item, idx) => (
                            <div key={item.id_atendente} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${idx === 0 ? 'bg-yellow-500 text-black' : 'bg-slate-700 text-gray-300'
                                        }`}>
                                        {idx + 1}
                                    </span>
                                    <span className="text-white">{item.id_atendente}</span>
                                </div>
                                <span className="text-indigo-400 font-medium">{item.avg_score}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function WeeklyReportView({ report }: { report: WeeklyReport }) {
    return (
        <div className="space-y-4">
            <div className="text-sm text-gray-400 mb-2">
                Período: {report.periodo.inicio} a {report.periodo.fim}
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard
                    label="Total Atendimentos"
                    value={report.metricas.total_atendimentos}
                    icon={Users}
                />
                <MetricCard
                    label="Score Médio"
                    value={report.metricas.score_medio || 'N/A'}
                    icon={TrendingUp}
                />
                <MetricCard
                    label="Positivos"
                    value={report.metricas.positivos}
                    icon={Award}
                    color="green"
                />
                <MetricCard
                    label="Negativos"
                    value={report.metricas.negativos}
                    icon={Clock}
                    color="red"
                />
            </div>

            {/* Evolução */}
            {report.evolucao.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">Evolução do Score</h4>
                    <div className="flex items-end justify-between h-24 gap-1">
                        {report.evolucao.map((day) => {
                            const height = Math.max(20, (Number(day.score) / 100) * 100);
                            return (
                                <div key={day.dia} className="flex-1 flex flex-col items-center">
                                    <div
                                        className="w-full bg-indigo-500 rounded-t"
                                        style={{ height: `${height}%` }}
                                    />
                                    <span className="text-xs text-gray-400 mt-1">
                                        {new Date(day.dia).toLocaleDateString('pt-BR', { weekday: 'short' })}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Ranking */}
            {report.ranking.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">Ranking de Atendentes</h4>
                    <div className="space-y-2">
                        {report.ranking.slice(0, 5).map((item, idx) => (
                            <div key={item.id_atendente} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-gray-400 text-black' : idx === 2 ? 'bg-orange-600 text-white' : 'bg-slate-700 text-gray-300'
                                        }`}>
                                        {idx + 1}
                                    </span>
                                    <span className="text-white">{item.id_atendente}</span>
                                    <span className="text-xs text-gray-500">({item.total_atendimentos} atend.)</span>
                                </div>
                                <span className="text-indigo-400 font-medium">{item.avg_score}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function InsightsView({ data }: { data: Insights }) {
    return (
        <div className="space-y-4">
            {/* Sugestões */}
            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
                <h4 className="text-indigo-400 font-medium mb-2 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    Sugestões Estratégicas
                </h4>
                <ul className="space-y-2">
                    {data.sugestoes.map((s, i) => (
                        <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                            <span className="text-indigo-400">•</span>
                            {s}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Horários críticos */}
            {data.horarios_criticos.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">Horários com Menor Score</h4>
                    <div className="space-y-2">
                        {data.horarios_criticos.map((h) => (
                            <div key={h.hora} className="flex items-center justify-between">
                                <span className="text-gray-300">{h.hora}:00 - {h.hora + 1}:00</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-gray-500 text-sm">{h.total} atend.</span>
                                    <span className={`font-medium ${Number(h.score_medio) < 50 ? 'text-red-400' : 'text-yellow-400'}`}>
                                        Score: {h.score_medio}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Padrões detectados */}
            {data.padroes.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">Padrões Detectados</h4>
                    <div className="space-y-3">
                        {data.padroes.map((p, i) => (
                            <div key={i} className="border-b border-slate-700 pb-3 last:border-0">
                                <div className="flex items-center justify-between">
                                    <span className="text-white font-medium">{p.categoria}</span>
                                    <span className="text-gray-500 text-sm">{p.frequencia}x</span>
                                </div>
                                {p.sugestao_estrategia && (
                                    <p className="text-gray-400 text-sm mt-1">{p.sugestao_estrategia}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricCard({
    label,
    value,
    icon: Icon,
    color = 'default'
}: {
    label: string;
    value: number | string;
    icon: any;
    color?: 'default' | 'green' | 'red' | 'orange';
}) {
    const colorClasses = {
        default: 'text-white',
        green: 'text-green-400',
        red: 'text-red-400',
        orange: 'text-orange-400'
    };

    return (
        <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-400">{label}</span>
            </div>
            <div className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</div>
        </div>
    );
}
