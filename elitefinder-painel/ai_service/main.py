from fastapi import FastAPI, Depends
from core.config import settings
from core.security import get_api_key

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ai_service"}

from schemas.analysis import AnalysisRequest, AnalysisResponse
from services.analysis import analyze_conversation
from services.reports import ReportRequest, ReportResponse, generate_strategic_report

@app.post("/analyze", response_model=AnalysisResponse, dependencies=[Depends(get_api_key)])
async def analyze_endpoint(request: AnalysisRequest):
    return await analyze_conversation(request)

@app.post("/report", response_model=ReportResponse, dependencies=[Depends(get_api_key)])
async def report_endpoint(request: ReportRequest):
    return await generate_strategic_report(request)
    
from routers import webhooks
app.include_router(webhooks.router, prefix="/webhooks", tags=["Webhooks"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
