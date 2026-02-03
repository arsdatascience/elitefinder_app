from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class Message(BaseModel):
    role: str # 'user', 'assistant', 'system' (or mapped from 'cliente', 'atendente')
    content: str
    timestamp: Optional[str] = None

class AnalysisRequest(BaseModel):
    conversation_id: str
    messages: List[Message]
    context: Optional[str] = None
    provider: Optional[str] = "openai"

class AnalysisResponse(BaseModel):
    conversation_id: str
    score: int = Field(..., description="Quality score 0-100")
    sentiment: str = Field(..., description="Geral sentiment: Positivo, Negativo, Neutro, Muito Negativo")
    summary: str
    strengths: List[str]
    weaknesses: List[str]
    suggestion: Optional[str] = None
    risk_level: str = "Baixo" # Baixo, Medio, Alto

class StrategyRequest(BaseModel):
    attendant_id: str
    metrics: Dict[str, Any]
    history_summary: Optional[str] = None

class StrategyResponse(BaseModel):
    attendant_id: str
    feedback: str
    action_plan: List[str]
