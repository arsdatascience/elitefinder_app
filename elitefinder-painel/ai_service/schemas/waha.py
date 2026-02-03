from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict

class WahaContact(BaseModel):
    id: str
    pushname: Optional[str] = None

class WahaMedia(BaseModel):
    url: Optional[str] = None
    mimetype: Optional[str] = None
    filename: Optional[str] = None

class WahaMessage(BaseModel):
    id: str
    from_: str = Field(..., alias="from")
    to: str
    body: Optional[str] = None
    hasMedia: bool = False
    media: Optional[WahaMedia] = None
    type: str # 'chat', 'image', 'ptt', 'document', 'location'
    timestamp: int
    _data: Optional[Dict[str, Any]] = None

class WahaWebhookPayload(BaseModel):
    event: str # 'message', 'message.any', etc
    payload: WahaMessage
    session: str = "default"
    me: Optional[WahaContact] = None
