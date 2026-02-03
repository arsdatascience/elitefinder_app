import google.generativeai as genai
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic
from core.config import settings

class LLMService:
    def __init__(self):
        # Initialize Gemini
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.gemini_model = genai.GenerativeModel(settings.MODEL_REPORT)
        
        # Initialize OpenAI
        self.openai_client = None
        if settings.OPENAI_API_KEY:
            self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            
        # Initialize Anthropic
        self.anthropic_client = None
        if settings.ANTHROPIC_API_KEY:
            self.anthropic_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    async def _get_config(self, db, provider: str):
        from models.db_models import AgentConfig
        from sqlalchemy import select
        if not db: return None
        try:
            result = await db.execute(select(AgentConfig).where(AgentConfig.provider == provider))
            return result.scalar_one_or_none()
        except:
            return None

    async def generate_report(self, db, prompt: str) -> str:
        """
        Generates strategic reports using Gemini 3.0
        """
        try:
            # Dynamic Config
            config = await self._get_config(db, "gemini")
            model_name = config.model if config else settings.MODEL_REPORT
            
            # Re-configure if model changed (or just use the name if generic)
            # For Gemini, we might need a new model instance if the name changes
            model = genai.GenerativeModel(model_name)
            
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"Error generating report with Gemini: {e}")
            return "Erro ao gerar relatório com Gemini."

    async def analyze_conversation(self, db, prompt: str, provider: str = "openai") -> str:
        """
        Analyzes conversations using OpenAI (GPT-5.2) or Anthropic (Claude 4.5)
        """
        try:
            config = await self._get_config(db, provider)
            
            # Parameter overrides
            temp = config.temperature if config else 0.7
            max_tok = config.max_tokens if config else 2000
            
            if provider == "gemini":
                # Use Gemini 3.0 Pro/Flash
                model_name = config.model if config else settings.MODEL_REPORT
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt, generation_config={"temperature": temp, "max_output_tokens": max_tok})
                return response.text

            elif provider == "anthropic" and self.anthropic_client:
                model_name = config.model if config else settings.MODEL_ANALYSIS_B
                message = await self.anthropic_client.messages.create(
                    model=model_name, 
                    max_tokens=max_tok,
                    temperature=temp,
                    messages=[
                        {"role": "user", "content": prompt}
                    ]
                )
                return message.content[0].text

            elif self.openai_client: # Default to OpenAI
                model_name = config.model if config else settings.MODEL_ANALYSIS_A
                
                msgs = [{"role": "user", "content": prompt}]
                if config and config.system_prompt:
                     msgs.insert(0, {"role": "system", "content": config.system_prompt})
                else:
                     msgs.insert(0, {"role": "system", "content": "You are an expert analyst."})

                response = await self.openai_client.chat.completions.create(
                    model=model_name, 
                    messages=msgs,
                    temperature=temp,
                    max_tokens=max_tok
                )
                return response.choices[0].message.content
                
            else:
                return "Nenhum provedor de análise configurado."

        except Exception as e:
            print(f"Error analyzing with {provider}: {e}")
            return f"Erro na análise: {str(e)}"

    async def analyze_media(self, db, media_bytes: bytes, mime_type: str, prompt: str = "Analise este arquivo.") -> str:
        """
        Analyzes generic media (Image, Audio, PDF) using Gemini Flash
        """
        try:
            config = await self._get_config(db, "gemini")
            model_name = config.model if config else settings.MODEL_MEDIA
            
            model = genai.GenerativeModel(model_name)
            
            response = model.generate_content([
                prompt,
                {
                    "mime_type": mime_type,
                    "data": media_bytes
                }
            ])
            return response.text
        except Exception as e:
            print(f"Error analyzing media with Gemini: {e}")
            return f"Erro ao analisar mídia: {str(e)}"

llm_service = LLMService()
