from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from core.database import Base
from datetime import datetime

class Atendimento(Base):
    __tablename__ = "atendimento"

    id_atendimento = Column(Integer, primary_key=True, index=True)
    data_hora_inicio = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    data_hora_fim = Column(DateTime(timezone=True), nullable=True)
    canal_origem = Column(String(100), default="whatsapp")
    id_cliente = Column(Integer, nullable=False, default=1) # Temporary default
    id_atendente = Column(Integer, nullable=False, default=1) # Temporary default/bot
    status_atendimento = Column(String(50), default="aberto")
    nome_cliente = Column(String(100), nullable=False)
    telefone_cliente = Column(String(20), nullable=True)

class Mensagem(Base):
    __tablename__ = "mensagem"

    id_mensagem = Column(Integer, primary_key=True, index=True)
    id_atendimento = Column(Integer, ForeignKey("atendimento.id_atendimento"), nullable=False, index=True)
    conteudo_texto = Column(Text, nullable=False)
    data_hora_envio = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    remetente_tipo = Column(String(50), nullable=False) # 'cliente' or 'atendente'
    tipo_analise = Column(String(50), nullable=True)
