import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Elite Finder AI Agent"
    
    # Internal Security
    INTERNAL_API_KEY: str = os.getenv("INTERNAL_API_KEY", "dev_secret_key_placeholder")
    
    # API Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    # Models Configuration
    # Analysis Models (OpenAI / Anthropic)
    MODEL_ANALYSIS_A: str = "gpt-5.2-mini"
    MODEL_ANALYSIS_B: str = "claude-4.5-sonnet"
    
    # Report Models (Gemini)
    MODEL_REPORT: str = "gemini-3.0-pro"
    MODEL_MEDIA: str = "gemini-3.0-flash" # Rigorous update to 3.0 Flash

    class Config:
        case_sensitive = True

settings = Settings()
