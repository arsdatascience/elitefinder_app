# Análise Manual de Atendimentos - Guia Completo

## 📋 O que foi implementado

Criamos um sistema completo de análise manual de atendimentos que permite executar análises de IA sob demanda, sem depender do encerramento automático da conversa.

## 🏗️ Arquitetura (Padrão do Projeto)

### Frontend chama N8N diretamente ✅

Seguindo o padrão do projeto, o **frontend chama o N8N diretamente**, sem passar pelo backend.

```
Frontend → N8N (direto!)
         (VITE_N8N_ANALISE_MANUAL_ENDPOINT)
```

### Backend (Express/Node.js)

**Arquivo**: `elitefinder-painel/server/routes/analytics.ts`

**Rota criada:**

1. **GET `/api/analytics/atendimentos`**
   - Lista todos os atendimentos com dados de análise
   - Suporta paginação (limit/offset)
   - Retorna JSON com todos os campos necessários
   - Inclui total de mensagens e trechos

### Frontend (React)

**Arquivo**: `elitefinder-painel/client/lib/analyticsApi.ts`

**Funções criadas:**

1. **`apiFetchAtendimentos(limit, offset)`**
   - Busca lista de atendimentos do backend
   - Retorna dados paginados

2. **`apiTriggerManualAnalysis({ id_atendimento, data })`**
   - Chama webhook N8N diretamente
   - Dispara análise manual
   - Usa `VITE_N8N_ANALISE_MANUAL_ENDPOINT`

### N8N Workflow

**Arquivo**: `n8n/agent-manual/agent-manual.json`

Workflow manual com:
- **Webhook trigger**: POST `/webhook/analise-manual`
- **3 tipos de busca**:
  - Por ID específico
  - Por data (todos de uma data)
  - Todos não analisados
- **Processamento paralelo** de múltiplos atendimentos
- **Análise completa** com GPT-4o
- **Salvamento automático** no banco

### Frontend (React)

**Nova Página**: `elitefinder-painel/client/pages/Atendimentos.tsx`

Features:
- ✅ Listagem completa de atendimentos
- ✅ Filtros por status (analisado/não analisado/fechado/aberto)
- ✅ Busca por cliente/atendente/telefone
- ✅ Cards com estatísticas
- ✅ Botão "Analisar com IA" para atendimentos não analisados
- ✅ Botão "Re-analisar" para atendimentos já analisados
- ✅ Modal de detalhes completo
- ✅ Paginação

**Correção**: `elitefinder-painel/client/pages/Index.tsx`
- Corrigido erro do botão "Detalhes" (duracao_minutos.toFixed)

## 🚀 Como Usar

### 1. Via Interface (Recomendado)

1. Acesse `/atendimentos` no seu painel
2. Navegue pela lista de atendimentos
3. Clique no ícone ⚡ (Sparkles) para analisar
4. Aguarde alguns segundos e atualize a página
5. Visualize os resultados clicando no ícone 👁️ (Eye)

### 2. Via API

#### Analisar um atendimento específico:
```bash
curl -X POST http://localhost:3000/api/analytics/analise-manual \
  -H "Content-Type: application/json" \
  -d '{"id_atendimento": 123}'
```

#### Analisar todos de uma data:
```bash
curl -X POST http://localhost:3000/api/analytics/analise-manual \
  -H "Content-Type: application/json" \
  -d '{"data": "2025-01-20"}'
```

#### Analisar todos não analisados (via n8n direto):
```bash
curl -X POST http://n8n:5678/webhook/analise-manual \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 3. Via n8n Diretamente

No n8n, você pode executar o workflow manualmente:
1. Acesse o workflow "Análise Manual de Qualidade"
2. Clique em "Execute Workflow"
3. Configure os parâmetros no webhook

## 📊 Dados Retornados pela Análise

A análise de IA retorna os seguintes campos:

- **pontuacao_geral**: 0-10
- **sentimento_geral**: Positivo/Neutro/Negativo
- **tipo_atendimento**: Dúvida/Reclamação/Suporte/Vendas
- **saudacao_inicial**: Avaliação da saudação
- **uso_nome_cliente**: sim/nao
- **rapport_empatia**: Alto/Médio/Baixo
- **uso_emojis**: sim/nao
- **tom_conversa**: Descrição
- **erros_gramaticais**: Lista ou Nenhum
- **resolutividade**: sim/nao/parcial
- **tempo_resposta**: Rápido/Lento/Irregular
- **indicios_venda**: sim/nao
- **canal_origem_conversa**: Instagram/Facebook/Google/etc
- **produto_interesse**: Nome do produto
- **observacoes**: Análise detalhada

## 🔧 Configuração

### Variáveis de Ambiente

**Frontend** (`.env.docker` ou `.env`):

```bash
# N8N Webhook para análise manual
VITE_N8N_ANALISE_MANUAL_ENDPOINT=https://marketsharedigital.com.br/webhook/analise-manual

# Ou em desenvolvimento local:
# VITE_N8N_ANALISE_MANUAL_ENDPOINT=http://localhost:5678/webhook/analise-manual
```

**Padrão do projeto**: Frontend chama N8N diretamente via Caddy (HTTPS em produção)

**Produção**:
- URL externa: `https://marketsharedigital.com.br/webhook/analise-manual`
- Caddy redireciona para: `n8n:5678/webhook/analise-manual`

**Desenvolvimento**:
- URL local: `http://localhost:5678/webhook/analise-manual`

### Rotas Frontend

Adicionada em `client/App.tsx`:

```tsx
<Route path="/atendimentos" element={<Atendimentos />} />
```

## 🐛 Correções Realizadas

1. **Erro do botão Detalhes**
   - **Problema**: `Cannot read properties of undefined (reading 'toFixed')`
   - **Causa**: Campo `duracao_minutos` não existe
   - **Solução**: Removido do alert e adicionados fallbacks (|| 'N/A')
   - **Arquivo**: `client/pages/Index.tsx:1761`

## 📈 Fluxo Completo

1. **Usuário** clica em "Analisar" na interface
2. **Frontend** chama `apiTriggerManualAnalysis()` que faz POST direto para N8N
3. **N8N** executa workflow:
   - Busca atendimento(s) no banco (via Postgres interno)
   - Para cada atendimento:
     - Busca todas as mensagens
     - Formata conversa completa
     - Envia para GPT-4o com prompt estruturado
     - Processa resposta da IA
     - Salva na tabela `analisequalidade`
4. **Frontend** aguarda 3 segundos e recarrega a lista
5. **Resultado** aparece na interface com score e análise completa

**Comunicação**:
```
Frontend (Browser)
    ↓ HTTPS
Caddy (Reverse Proxy)
    ↓ HTTP interno
N8N Container
    ↓ PostgreSQL
Banco de Dados
```

## 🎯 Casos de Uso

### Cenário 1: Análise Pontual
Cliente específico teve problema. Você quer analisar aquele atendimento:
- Acesse `/atendimentos`
- Busque pelo nome do cliente
- Clique em "Analisar"

### Cenário 2: Revisão de Período
Quer analisar todos atendimentos de ontem:

**Via Frontend Console** (recomendado):
```javascript
import { apiTriggerManualAnalysis } from './lib/analyticsApi';
apiTriggerManualAnalysis({ data: '2025-01-19' });
```

**Via curl direto no N8N**:
```bash
curl -X POST https://marketsharedigital.com.br/webhook/analise-manual \
  -H "Content-Type: application/json" \
  -d '{"data": "2025-01-19"}'
```

### Cenário 3: Re-análise
Atendimento já foi analisado mas você quer nova análise (ex: após ajustes no prompt):
- Clique no botão 🔄 (RefreshCw) verde

### Cenário 4: Lote Automático
Execute diariamente via cron todos não analisados:
```bash
0 2 * * * curl -X POST https://marketsharedigital.com.br/webhook/analise-manual \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 🔐 Segurança

- ✅ Validação de parâmetros no backend
- ✅ Tratamento de erros
- ✅ Logs detalhados para debug
- ✅ Webhook autenticado internamente (sem exposição)

## 🚦 Status da Análise

Na interface você vê:
- **-** (traço): Ainda não analisado
- **Score numérico**: Já analisado
- **Botão ⚡**: Disponível para análise
- **Botão 🔄**: Re-análise disponível

## 📝 Logs e Debug

### Backend
```bash
docker logs elitefinder-backend -f
```

Procure por:
- `[MANUAL ANALYSIS]` - Disparo de análise
- `analytics/analise-manual` - Processamento

### N8N
Acesse n8n UI e veja execuções do workflow

## ⚠️ Troubleshooting

### Erro ao disparar análise
**Problema**: Erro CORS ou network error

**Solução**:
1. Verifique se `VITE_N8N_ANALISE_MANUAL_ENDPOINT` está configurado
2. Confirme que n8n está rodando
3. Teste direto:
   ```bash
   curl -X POST https://marketsharedigital.com.br/webhook/analise-manual \
     -H "Content-Type: application/json" \
     -d '{"id_atendimento": 1}'
   ```

### Erro: "failed_to_trigger_analysis"
- Verifique se n8n está rodando: `docker ps | grep n8n`
- Confirme URL no console do browser (F12)
- Teste interno: `docker exec elitefinder-backend curl http://n8n:5678/webhook/analise-manual`

### Análise não aparece
- Aguarde alguns segundos (processamento assíncrono)
- Atualize a página
- Verifique logs do n8n

### Botão "Analisar" não aparece
- Confirme que atendimento está "Fechado"
- Verifique se já não tem análise

## 🎨 Customização

### Alterar Prompt da IA
Edite em `n8n/agent-manual/agent-manual.json`:
- Nó "AI Agent - Análise de Qualidade"
- Campo `systemMessage`

### Adicionar Novos Campos
1. Adicione no prompt da IA
2. Adicione no `Structured Output Parser`
3. Adicione no nó "Processar Resposta IA"
4. Atualize query em `Salvar Análise no Banco`
5. Adicione no frontend (`Atendimentos.tsx`)

## 🎉 Pronto!

Agora você tem um sistema completo de análise manual de atendimentos. Basta acessar `/atendimentos` e começar a usar!
