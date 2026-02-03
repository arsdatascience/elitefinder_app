import os
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from core.config import settings
from models.db_models import Base

# Force load Env if needed
from dotenv import load_dotenv
load_dotenv()

async def init_db():
    database_url = settings.DATABASE_URL
    if not database_url:
        print("❌ DATABASE_URL not set!")
        return

    # Fix for SQLAlchemy async
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    print(f"🔌 Connecting to: {database_url.split('@')[-1]}") # Hide credentials
    
    engine = create_async_engine(database_url, echo=True)
    
    async with engine.begin() as conn:
        print("🛠️ Creating tables...")
        await conn.run_sync(Base.metadata.create_all)
        print("✅ Tables created successfully!")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(init_db())
