🤖 Workflow "Agent" - Fluxo Completo

  Esse workflow automatiza o atendimento via WhatsApp e faz análise de qualidade das conversas usando IA. Vou explicar cada etapa:

  ---
  📥 1. RECEPÇÃO DA MENSAGEM (Início do fluxo)

  Node: Webhook3
  - 🎯 O que faz: Recebe mensagens do WhatsApp via WAHA (WhatsApp HTTP API)
  - 🔗 URL: https://n8n.marketsharedigital.com.br/webhook/webhook
  - 📦 Dados recebidos: Conteúdo da mensagem, remetente, timestamp, tipo de mídia, etc.

  Cliente envia: "Olá! Quero comprar o Siena"
        ↓
  WAHA detecta mensagem e envia para o webhook do n8n
        ↓
  Workflow inicia automaticamente

  ---
  🔍 2. VALIDAÇÕES INICIAIS

  Node: é grupo?2

  - ❌ Filtra mensagens de grupo → Só processa conversas individuais
  - ✅ Se for individual, continua

  Node: Verifica se é áudio2

  - 🎤 Detecta se é áudio (MediaType === 'ptt')
  - Se SIM → Vai para transcrição
  - Se NÃO → Extrai texto diretamente

  Node: Transcribe a recording2 (Google Gemini)

  - 🗣️ Transcreve áudio para texto usando Google Gemini
  - Baixa o áudio do WAHA e converte para texto

  ---
  📊 3. GERENCIAMENTO DE ATENDIMENTO

  Node: Busca id atendimento2

  - 🔎 Query SQL: Busca se existe um atendimento ABERTO para esse cliente
  SELECT id_atendimento
  FROM Atendimento
  WHERE id_cliente = {numero} AND status_atendimento = 'Aberto'

  Node: Tem atendimento aberto?2

  - SE SIM → Usa o id_atendimento existente (continua conversa)
  - SE NÃO → Cria novo atendimento

  Node: cria novo atendimento2

  - 📝 INSERT no banco: Cria novo registro na tabela atendimento
  INSERT INTO atendimento (
    data_hora_inicio,
    id_cliente,
    id_atendente,
    status_atendimento,
    nome_cliente
  )

  ---
  💬 4. ARMAZENAMENTO DA MENSAGEM

  Node: insere mensagem na tabela2

  - 📨 UPSERT na tabela mensagem:
    - id_atendimento (qual conversa)
    - conteudo_texto (o que o cliente disse)
    - data_hora_envio (quando)
    - remetente_tipo (Cliente ou Atendente)

  Node: Redis Chat Memory2

  - 🧠 Armazena histórico da conversa no Redis para o AI Agent ter contexto
  - Chave: chat-{id_atendimento}

  ---
  🤖 5. PROCESSAMENTO COM IA (AI Agent)

  Node: Verifica possível encerramento2

  - 🔚 Detecta se a conversa acabou usando IA
  - Pergunta: "O cliente está encerrando a conversa?"
  - Se SIM → Parte para análise de qualidade

  Node: AI Agent2 (Principal!)

  - 🧠 Faz análise de qualidade da conversa usando Mistral AI
  - Analisa:
    - ✅ Saudação inicial
    - ✅ Uso do nome do cliente
    - ✅ Rapport/empatia
    - ✅ Uso de emojis
    - ✅ Tom da conversa
    - ✅ Erros gramaticais
    - ✅ Resolutividade
    - ✅ Tempo de resposta
    - ✅ Indícios de venda (sim/não)
    - ✅ Sentimento geral (Positivo/Neutro/Negativo)
    - ✅ Tipo de atendimento (Dúvida/Reclamação/Vendas)
    - ✅ Pontuação geral (0-10)
    - ✅ Observações

  ---
  💾 6. SALVAMENTO DA ANÁLISE

  Node: atualiza tabela atendimento2

  - 🔄 UPDATE na tabela atendimento:
    - Define data_hora_fim
    - Muda status_atendimento para "Fechado"

  Node: Insert rows in a table2

  - 📊 UPSERT na tabela analisequalidade:
    - Salva TODOS os critérios analisados pela IA
    - Se já existir análise para esse atendimento, ATUALIZA

  ---
  📊 RESUMO DO FLUXO COMPLETO:

  1. WhatsApp → WAHA → Webhook n8n
  2. Filtra (não é grupo?)
  3. Transcreve (se for áudio)
  4. Busca ou cria atendimento
  5. Salva mensagem no banco
  6. Armazena no Redis (contexto da IA)
  7. Detecta encerramento?
     - SE NÃO → Aguarda próxima mensagem
     - SE SIM → Prossegue
  8. AI Agent analisa TODA a conversa
  9. Salva análise no banco
  10. Fecha o atendimento

  ---
  🎯 RESULTADO PRÁTICO:

  Esse fluxo permite:

  ✅ Registrar todas as conversas automaticamente
  ✅ Analisar a qualidade do atendimento com IA
  ✅ Identificar indícios de venda
  ✅ Classificar sentimentos (positivo/negativo)
  ✅ Gerar relatórios (como o CSV de vendas que você criou!)
  ✅ Dar feedback aos atendentes sobre sua performance