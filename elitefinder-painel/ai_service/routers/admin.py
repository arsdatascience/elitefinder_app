from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select
from core.database import get_db
from models.db_models import AgentConfig
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

# Schema for Pydantic
class AgentConfigSchema(BaseModel):
    provider: str
    model: str
    temperature: float = 0.7
    max_tokens: int = 2000
    system_prompt: Optional[str] = None
    is_active: bool = True

    class Config:
        orm_mode = True

@router.get("/config", response_model=List[AgentConfigSchema])
async def get_agent_configs(db: Session = Depends(get_db)):
    """Get all agent configurations"""
    result = await db.execute(select(AgentConfig))
    return result.scalars().all()

@router.post("/config", response_model=AgentConfigSchema)
async def create_or_update_config(config: AgentConfigSchema, db: Session = Depends(get_db)):
    """Create or update an agent configuration"""
    # Check if exists
    result = await db.execute(select(AgentConfig).where(AgentConfig.provider == config.provider))
    existing = result.scalar_one_or_none()

    if existing:
        existing.model = config.model
        existing.temperature = config.temperature
        existing.max_tokens = config.max_tokens
        existing.system_prompt = config.system_prompt
        existing.is_active = config.is_active
    else:
        new_config = AgentConfig(
            provider=config.provider,
            model=config.model,
            temperature=config.temperature,
            max_tokens=config.max_tokens,
            system_prompt=config.system_prompt,
            is_active=config.is_active
        )
        db.add(new_config)
    
    await db.commit()
    return config
