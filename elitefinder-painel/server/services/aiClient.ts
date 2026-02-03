import axios from 'axios';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'dev_secret_key';

export interface AnalysisRequest {
    conversation_id: string;
    messages: { role: string; content: string; timestamp?: string }[];
    context?: string;
}

export interface AnalysisResponse {
    conversation_id: string;
    score: number;
    sentiment: string;
    summary: string;
    strengths: string[];
    weaknesses: string[];
    suggestion?: string;
    risk_level: string;
}

export interface ReportRequest {
    tenant_id: number;
    period: string;
    metrics: Record<string, any>;
    alerts_summary: Record<string, any>;
    attendant_performance: Record<string, any>[];
}

export interface ReportResponse {
    strategic_insight: string;
    action_items: string[];
    forecast: string;
}

const client = axios.create({
    baseURL: AI_SERVICE_URL,
    headers: {
        'X-Internal-API-Key': INTERNAL_API_KEY,
        'Content-Type': 'application/json'
    },
    timeout: 30000 // 30s timeout for AI processing
});

export async function analyzeConversation(data: AnalysisRequest): Promise<AnalysisResponse | null> {
    try {
        const response = await client.post<AnalysisResponse>('/analyze', data);
        return response.data;
    } catch (error) {
        console.error('Error calling AI Service:', error);
        return null; // Fail gracefully
    }
}

export async function generateStrategicReport(data: ReportRequest): Promise<ReportResponse | null> {
    try {
        const response = await client.post<ReportResponse>('/report', data);
        return response.data;
    } catch (error) {
        console.error('Error calling AI Service (Report):', error);
        return null;
    }
}

export async function checkHealth(): Promise<boolean> {
    try {
        const response = await client.get('/health');
        return response.data.status === 'ok';
    } catch (error) {
        return false;
    }
}
