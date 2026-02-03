from fastapi import FastAPI, Depends
from core.config import settings
from core.security import get_api_key
from core.database import get_db
from sqlalchemy.orm import Session
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ai_service"}

@app.on_event("startup")
async def startup_event():
    from core.database import engine, Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

from schemas.analysis import AnalysisRequest, AnalysisResponse
from services.analysis import analyze_conversation
from services.reports import ReportRequest, ReportResponse, generate_strategic_report

@app.post("/analyze", response_model=AnalysisResponse, dependencies=[Depends(get_api_key)])
@app.post("/analyze", response_model=AnalysisResponse, dependencies=[Depends(get_api_key)])
async def analyze_endpoint(request: AnalysisRequest, db: Session = Depends(get_db)):
    return await analyze_conversation(request, db)

@app.post("/report", response_model=ReportResponse, dependencies=[Depends(get_api_key)])
async def report_endpoint(request: ReportRequest, db: Session = Depends(get_db)):
    return await generate_strategic_report(request, db)
    
from routers import webhooks, admin
app.include_router(webhooks.router, prefix="/webhooks", tags=["Webhooks"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
