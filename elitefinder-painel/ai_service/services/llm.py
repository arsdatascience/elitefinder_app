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

    async def generate_report(self, prompt: str) -> str:
        """
        Generates strategic reports using Gemini 3.0
        """
        try:
            response = self.gemini_model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"Error generating report with Gemini: {e}")
            return "Erro ao gerar relatório com Gemini."

    async def analyze_conversation(self, prompt: str, provider: str = "openai") -> str:
        """
        Analyzes conversations using OpenAI (GPT-5.2) or Anthropic (Claude 4.5)
        """
        try:
            if provider == "anthropic" and self.anthropic_client:
                message = await self.anthropic_client.messages.create(
                    model=settings.MODEL_ANALYSIS_B, # Claude 4.5 Sonnet
                    max_tokens=4096,
                    messages=[
                        {"role": "user", "content": prompt}
                    ]
                )
                return message.content[0].text

            elif self.openai_client: # Default to OpenAI
                response = await self.openai_client.chat.completions.create(
                    model=settings.MODEL_ANALYSIS_A, # GPT 5.2 Pro
                    messages=[
                        {"role": "system", "content": "You are an expert analyst."},
                        {"role": "user", "content": prompt}
                    ]
                )
                return response.choices[0].message.content
                
            else:
                return "Nenhum provedor de análise configurado."

        except Exception as e:
            print(f"Error analyzing with {provider}: {e}")
            # Fallback to Gemini if others fail?
            return f"Erro na análise: {str(e)}"

    async def analyze_media(self, media_bytes: bytes, mime_type: str, prompt: str = "Analise este arquivo.") -> str:
        """
        Analyzes generic media (Image, Audio, PDF) using Gemini 1.5 Flash
        """
        try:
            # Gemini supports Image, Audio, and PDF via the 'data' interface
            model = genai.GenerativeModel('gemini-1.5-flash')
            
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
