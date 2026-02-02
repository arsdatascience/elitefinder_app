Workflow job.json - Analisador de Conversas em Lote

  Este é um job agendado que roda automaticamente todos os dias às 02:00 da manhã. Ele é diferente do agent.json porque não responde a eventos em tempo real - ele processa conversas que "escaparam" da análise automática.

  Fluxo Completo:

  1. Trigger: Cron Schedule - Diário 02:00 (linha 9)
  - Execução automática agendada: 0 2 * * * (todo dia às 2h da manhã)
  - Não precisa de nenhum gatilho externo

  2. Buscar Conversas Não Analisadas (linhas 42-44)
  SELECT
    a.id_atendimento,
    a.nome_cliente,
    a.data_hora_inicio,
    a.data_hora_fim,
    a.id_atendente,
    STRING_AGG(DISTINCT m.conteudo_texto, ' | ') as conteudo_conversa
  FROM atendimento a
  INNER JOIN mensagem m ON a.id_atendimento = m.id_atendimento
  LEFT JOIN analisequalidade aq ON a.id_atendimento = aq.id_atendimento
  WHERE
    a.status_atendimento = 'Fechado'
    AND aq.id_analise IS NULL
  GROUP BY a.id_atendimento, ...
  LIMIT 2

  Esta query procura por:
  - ✅ Conversas que já estão fechadas (status_atendimento = 'Fechado')
  - ❌ Mas que não têm análise (aq.id_analise IS NULL)
  - 📊 Processa apenas 2 conversas por execução (LIMIT 2)

  Por que conversas podem não ter análise?
  - O atendente fechou manualmente sem que o webhook disparasse
  - Houve erro na análise em tempo real
  - A análise falhou por algum problema de rede/API
  - Conversas antigas antes do sistema de análise existir

  3. Split Conversas (linha 63)
  - Transforma o resultado em items individuais para processar um por um

  4. IA Analisar Conversa (linha 76-90)
  - Usa GPT-4o-mini (linha 97) com até 3000 tokens (linha 102)
  - Mesmo prompt de análise usado no workflow principal
  - Retorna JSON estruturado com os mesmos 13 campos

  5. Processar Resposta IA (linha 365)
  - Limpa o output da IA e garante que está em formato JSON válido
  - Preenche campos padrão se houver erro

  6. Salvar Análise (linha 319)
  - Insere o resultado na tabela analisequalidade
  - ⚠️ PROBLEMA DETECTADO: Linha 165 tem "matchingColumns": []
  - Isso significa que está fazendo INSERT sem UPSERT!

  Resumo Prático:

  Este workflow funciona como uma "rede de segurança":
  - 🕐 Roda todo dia às 2h da manhã
  - 🔍 Procura conversas fechadas que não foram analisadas
  - 🤖 Analisa até 2 conversas por execução usando IA
  - 💾 Salva as análises no banco

  Por que só 2 conversas?
  - Para não sobrecarregar a API da OpenAI de uma vez
  - Se houver 100 conversas sem análise, levaria 50 dias processando 2 por dia
  - Provavelmente foi configurado assim para processar gradualmente