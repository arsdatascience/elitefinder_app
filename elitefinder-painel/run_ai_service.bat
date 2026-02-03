@echo off
cd ai_service
echo Instalando dependencias...
pip install -r requirements.txt
echo Iniciando servico de IA...
python main.py
pause
