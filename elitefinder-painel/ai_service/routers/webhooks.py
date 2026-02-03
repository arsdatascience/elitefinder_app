from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks
from schemas.waha import WahaWebhookPayload
from services.webhook_processor import process_waha_payload
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/waha")
async def handle_waha_webhook(payload: WahaWebhookPayload, background_tasks: BackgroundTasks):
    """
    Receives Webhooks from WAHA (WhatsApp API).
    """
    logger.info(f"📩 Webhook received: {payload.event} from {payload.payload.from_}")

    # Process in background to return 200 OK immediately to WAHA
    background_tasks.add_task(process_waha_payload, payload)
    
    return {"status": "queued", "id": payload.payload.id}
