from pydantic import BaseModel
from typing import List, Dict, Any
from services.llm import llm_service

class ReportRequest(BaseModel):
    tenant_id: int
    period: str # "daily", "weekly"
    metrics: Dict[str, Any]
    alerts_summary: Dict[str, Any]
    attendant_performance: List[Dict[str, Any]]

class ReportResponse(BaseModel):
    strategic_insight: str
    action_items: List[str]
    forecast: str

async def generate_strategic_report(request: ReportRequest) -> ReportResponse:
    # Build context for Gemini
    prompt = f"""
    Atue como um Diretor de Estratégia (CSO) para esta empresa.
    Gere um relatório de inteligência baseado nos dados abaixo.
    
    PERÍODO: {request.period}
    
    MÉTRICAS GERAIS:
    {request.metrics}
    
    ALERTAS E RISCOS:
    {request.alerts_summary}
    
    PERFORMANCE DA EQUIPE:
    {request.attendant_performance}
    
    Gere uma resposta estruturada contendo:
    1. Insight Estratégico (Uma visão macro do que está acontecendo)
    2. Lista de Ações Recomendadas (Práticas e diretas)
    3. Previsão/Tendência (O que esperar para o próximo período se nada mudar)
    
    Formato de saída esperado (Texto ou Markdown limpo, mas vou pedir JSON para garantir a estrutura).
    JSON:
    {{
        "strategic_insight": "...",
        "action_items": ["...", "..."],
        "forecast": "..."
    }}
    """
    
    response_text = await llm_service.generate_report(prompt)
    
    try:
        import json
        clean_text = response_text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_text)
        return ReportResponse(
            strategic_insight=data.get("strategic_insight", "Sem insights gerados"),
            action_items=data.get("action_items", []),
            forecast=data.get("forecast", "Sem previsão")
        )
    except:
        return ReportResponse(
            strategic_insight=response_text[:500],
            action_items=[],
            forecast="Erro ao estruturar resposta"
        )
