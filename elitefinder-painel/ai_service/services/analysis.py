import json
from services.llm import llm_service
from schemas.analysis import AnalysisRequest, AnalysisResponse


async def analyze_conversation(request: AnalysisRequest, db) -> AnalysisResponse:
    # 1. Prepare Transcript
    transcript = ""
    for msg in request.messages:
        transcript += f"{msg.role}: {msg.content}\n"

    # ... (Prompt building omitted for brevity, assuming it's unchanged) ...
    prompt = f"""
    Você é um Auditor de Qualidade Sênior. Analise a seguinte conversa.
    
    CONTEXTO: {request.context or 'Atendimento ao cliente'}
    
    TRANSCRICAO:
    {transcript}
    
    Sua tarefa é extrair insights profundos.
    Responda EXCLUSIVAMENTE em JSON no seguinte formato:
    {{
        "score": <0-100>,
        "sentiment": "<Muito Positivo|Positivo|Neutro|Negativo|Muito Negativo>",
        "summary": "<Resumo executivo do que ocorreu>",
        "strengths": ["<Ponto 1>", "<Ponto 2>"],
        "weaknesses": ["<Ponto 1>", "<Ponto 2>"],
        "suggestion": "<Sugestão tática imediata>",
        "risk_level": "<Baixo|Alto>"
    }}
    """
    
    # 3. Call LLM (Using OpenAI/Anthropic for Analysis)
    # Use provider from request, default to openai
    response_text = await llm_service.analyze_conversation(db, prompt, provider=request.provider or "openai")
    
    # 4. Parse JSON
    try:
        clean_text = response_text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_text)
        
        return AnalysisResponse(
            conversation_id=request.conversation_id,
            score=data.get("score", 0),
            sentiment=data.get("sentiment", "Neutro"),
            summary=data.get("summary", ""),
            strengths=data.get("strengths", []),
            weaknesses=data.get("weaknesses", []),
            suggestion=data.get("suggestion"),
            risk_level=data.get("risk_level", "Baixo")
        )
    except Exception as e:
        print(f"Error parsing analysis: {e}")
        return AnalysisResponse(
            conversation_id=request.conversation_id,
            score=0,
            sentiment="Erro",
            summary="Falha no processamento da IA",
            strengths=[],
            weaknesses=[],
            risk_level="Desconhecido"
        )
