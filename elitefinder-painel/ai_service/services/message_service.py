from sqlalchemy.orm import Session
from models.db_models import Atendimento, Mensagem
from core.database import get_db
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class MessageService:
    def __init__(self):
        pass

    async def save_message(self, db: Session, phone_number: str, message_text: str, sender_type: str, contact_name: str):
        """
        Saves a message to the database, creating a Ticket (Atendimento) if needed.
        """
        try:
            # 1. Normalize Phone Number
            normalized_phone = phone_number.replace("@c.us", "")

            # 2. Find Active Ticket (Status != 'fechado')
            ticket = db.query(Atendimento).filter(
                Atendimento.telefone_cliente == normalized_phone,
                Atendimento.status_atendimento != 'fechado'
            ).order_by(Atendimento.data_hora_inicio.desc()).first()

            # 3. Create Ticket if None exists
            if not ticket:
                logger.info(f"🆕 Creating new ticket for {contact_name} ({normalized_phone})")
                ticket = Atendimento(
                    data_hora_inicio=datetime.utcnow(),
                    canal_origem="whatsapp",
                    id_cliente=1, # Default/Placeholder
                    id_atendente=1, # Default/Bot
                    status_atendimento="aberto",
                    nome_cliente=contact_name,
                    telefone_cliente=normalized_phone
                )
                db.add(ticket)
                db.commit()
                db.refresh(ticket)
            
            # 4. Save Message
            new_message = Mensagem(
                id_atendimento=ticket.id_atendimento,
                conteudo_texto=message_text,
                data_hora_envio=datetime.utcnow(),
                remetente_tipo=sender_type, # 'cliente' or 'atendente'
                tipo_analise=None
            )
            db.add(new_message)
            db.commit()
            db.refresh(new_message)
            
            logger.info(f"💾 Message saved. Ticket ID: {ticket.id_atendimento} | Msg ID: {new_message.id_mensagem}")
            return new_message

        except Exception as e:
            logger.error(f"❌ Error saving message to DB: {e}", exc_info=True)
            db.rollback()
            return None

message_service = MessageService()
