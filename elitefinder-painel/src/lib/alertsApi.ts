// API functions for alerts and reports

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// ==================== ALERTS API ====================

export interface Alert {
    id: number;
    id_atendimento: number;
    tipo: 'critico' | 'urgente' | 'atencao' | 'positivo';
    categoria: string;
    mensagem: string;
    dados: Record<string, any>;
    criado_em: string;
    lido_em: string | null;
    resolvido_em: string | null;
    nome_cliente?: string;
    status_atendimento?: string;
}

export interface AlertSummary {
    total_ativos: number;
    criticos: number;
    urgentes: number;
    atencao: number;
    positivos: number;
    nao_lidos: number;
}

export async function fetchAlerts(options?: { tipo?: string; resolvido?: boolean; limit?: number }): Promise<{ alerts: Alert[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.tipo) params.append('tipo', options.tipo);
    if (options?.resolvido) params.append('resolvido', 'true');
    if (options?.limit) params.append('limit', options.limit.toString());

    const response = await fetch(`${BACKEND_URL}/api/alerts?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (!response.ok) throw new Error('Falha ao buscar alertas');
    return response.json();
}

export async function fetchAlertSummary(): Promise<AlertSummary> {
    const response = await fetch(`${BACKEND_URL}/api/alerts/summary`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (!response.ok) throw new Error('Falha ao buscar resumo de alertas');
    return response.json();
}

export async function markAlertAsRead(id: number): Promise<Alert> {
    const response = await fetch(`${BACKEND_URL}/api/alerts/${id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (!response.ok) throw new Error('Falha ao marcar alerta como lido');
    return response.json();
}

export async function resolveAlert(id: number): Promise<Alert> {
    const response = await fetch(`${BACKEND_URL}/api/alerts/${id}/resolve`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (!response.ok) throw new Error('Falha ao resolver alerta');
    return response.json();
}

// ==================== REPORTS API ====================

export interface DailyReport {
    data: string;
    metricas: {
        total_atendimentos: number;
        score_medio: number;
        positivos: number;
        negativos: number;
    };
    alertas: {
        criticos: number;
        urgentes: number;
        atencao: number;
        positivos: number;
    };
    ranking: Array<{
        id_atendente: string;
        total: number;
        avg_score: number;
    }>;
}

export interface WeeklyReport {
    periodo: { inicio: string; fim: string };
    metricas: {
        total_atendimentos: number;
        score_medio: number;
        positivos: number;
        negativos: number;
    };
    evolucao: Array<{ dia: string; total: number; score: number }>;
    ranking: Array<{
        id_atendente: string;
        total_atendimentos: number;
        avg_score: number;
        positivos: number;
    }>;
    sentimentos: Array<{ sentimento_geral: string; total: number }>;
    alertas: Array<{ tipo: string; total: number; resolvidos: number }>;
}

export interface AttendantFeedback {
    id_atendente: string;
    periodo: string;
    metricas: {
        total_atendimentos: number;
        score_medio: number;
        positivos: number;
        negativos: number;
    };
    pontos_fortes: string[];
    oportunidades: string[];
    sugestao: string;
}

export interface Insights {
    padroes: Array<{
        categoria: string;
        descricao: string;
        frequencia: number;
        sugestao_estrategia: string;
    }>;
    horarios_criticos: Array<{
        hora: number;
        total: number;
        score_medio: number;
    }>;
    sugestoes: string[];
}

export async function fetchDailyReport(): Promise<DailyReport> {
    const response = await fetch(`${BACKEND_URL}/api/reports/daily`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (!response.ok) throw new Error('Falha ao buscar relatório diário');
    return response.json();
}

export async function fetchWeeklyReport(): Promise<WeeklyReport> {
    const response = await fetch(`${BACKEND_URL}/api/reports/weekly`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (!response.ok) throw new Error('Falha ao buscar relatório semanal');
    return response.json();
}

export async function fetchAttendantFeedback(id: string): Promise<AttendantFeedback> {
    const response = await fetch(`${BACKEND_URL}/api/reports/attendant/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (!response.ok) throw new Error('Falha ao buscar feedback do atendente');
    return response.json();
}

export async function fetchInsights(): Promise<Insights> {
    const response = await fetch(`${BACKEND_URL}/api/reports/insights`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (!response.ok) throw new Error('Falha ao buscar insights');
    return response.json();
}
