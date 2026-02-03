import logging
from typing import Dict, Any
from schemas.waha import WahaWebhookPayload, WahaMessage

logger = logging.getLogger(__name__)

async def process_waha_payload(payload: WahaWebhookPayload):
    """
    Main entry point for processing WAHA webhooks.
    """
    event = payload.event
    
    # We only care about incoming messages for now
    if event not in ["message", "message.any"]:
        return

    message = payload.payload
    chat_id = message.from_
    
    logger.info(f"🤖 Processing message from {chat_id} | Type: {message._data.get('type', 'text') if message._data else 'unknown'}")

    try:
        if message.hasMedia or message.type in ["image", "ptt", "audio", "document"]:
            await handle_media_message(message)
        else:
            await handle_text_message(message)
            
    except Exception as e:
        logger.error(f"❌ Error processing message {message.id}: {str(e)}", exc_info=True)

async def handle_text_message(message: WahaMessage):
    """
    Process plain text messages.
    """
    logger.info(f"📝 Text Message: {message.body}")
    # TODO: Save to DB
    # TODO: Integrate with AI Analysis

import httpx
from services.llm import llm_service

async def handle_media_message(message: WahaMessage):
    """
    Process media messages (Image, Audio, Doc).
    """
    media_url = message.media.url if message.media else None
    mime_type = message.media.mimetype if message.media else "unknown"
    
    if not media_url:
        logger.warning(f"⚠️ Media message without URL: {message.id}")
        return

    logger.info(f"📎 Downloading Media ({message.type}): {mime_type} | URL: {media_url}")
    
    # Download Media
    async with httpx.AsyncClient() as client:
        try:
            # WAHA sends a local URL sometimes, or a public one. 
            # If it's a file from WAHA, we might need headers if auth is enabled?
            # For now assuming public or accessible URL provided by WAHA's file server
            response = await client.get(media_url, timeout=30.0)
            if response.status_code != 200:
                logger.error(f"❌ Failed to download media: {response.status_code}")
                return
            
            media_bytes = response.content
            logger.info(f"✅ Download complete: {len(media_bytes)} bytes")
            
        except Exception as e:
            logger.error(f"❌ Error downloading media: {e}")
            return

    # Route based on Type
    if "image" in mime_type:
        logger.info("📸 Detected Image -> Sending to Gemini Vision...")
        description = await llm_service.analyze_media(media_bytes, mime_type, "Descreva esta imagem e extraia informações relevantes (nomes, valores, datas) se houver.")
        logger.info(f"🧠 Image Analysis: {description}")
        
    elif "audio" in mime_type or "ogg" in mime_type:
        logger.info("🎤 Detected Audio -> Sending to Gemini Audio...")
        transcription = await llm_service.analyze_media(media_bytes, mime_type, "Transcreva este áudio fielmente. Se houver instruções, identifique-as.")
        logger.info(f"🗣️ Audio Transcription: {transcription}")
        
    elif "pdf" in mime_type:
        logger.info("qh Detected PDF -> Sending to Gemini Docs...")
        summary = await llm_service.analyze_media(media_bytes, mime_type, "Resuma este documento e extraia os pontos principais.")
        logger.info(f"📄 PDF Analysis: {summary}")
        
    elif "spreadsheet" in mime_type or "excel" in mime_type:
        logger.info("📊 Detected Excel -> Processing with Pandas...")
        import pandas as pd
        import io
        try:
            df = pd.read_excel(io.BytesIO(media_bytes))
            csv_preview = df.head(50).to_csv(index=False) # Limit to 50 rows for token sanity
            
            analysis = await llm_service.analyze_conversation(
                f"Analise esta planilha (primeiras 50 linhas):\n{csv_preview}\n\nQuais são os insights principais? Responda de forma executiva.", 
                provider="openai" # Or Gemini
            )
            logger.info(f"📊 Excel Analysis: {analysis}")
        except Exception as e:
            logger.error(f"❌ Error processing Excel: {e}")
