import { Router } from "express";
import { Pool } from "pg";

const router = Router();

// Configure Postgres pool from env or defaults (docker-compose values)
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "Elitefinder2025",
  database: process.env.DB_NAME || "postgres",
});

// List conversations with basic fields from mensagem + atendimento
router.get("/conversations", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const { rows } = await pool.query(
      `SELECT m.*, a.*
       FROM public.mensagem m
       LEFT JOIN public.atendimento a ON a.id_atendimento = m.id_atendimento
       ORDER BY m.id_mensagem DESC
       LIMIT $1`,
      [limit]
    );
    res.json(rows);
  } catch (err) {
    console.error("analytics/conversations error", err);
    res.status(500).json({ error: "failed_to_fetch_conversations", message: err instanceof Error ? err.message : "Unknown error" });
  }
});

// Export conversations CSV
router.get("/conversations/export/csv", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.*, a.*
       FROM public.mensagem m
       LEFT JOIN public.atendimento a ON a.id_atendimento = m.id_atendimento
       ORDER BY m.id_mensagem DESC
       LIMIT 1000`
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "no_data_available", message: "Nenhuma conversa encontrada para exportar" });
    }

    // Build CSV
    const headers = Object.keys(rows[0]);
    const escape = (v: any) => {
      if (v == null) return "";
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    };
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => escape((r as any)[h])).join(","))].join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=conversas.csv");
    res.send(csv);
  } catch (err) {
    console.error("analytics/conversations/export error", err);
    res.status(500).json({ error: "failed_to_export_conversations" });
  }
});

// Export CSV of AI analysis from analisequalidade table
router.get("/export/csv", async (_req, res) => {
  try {
    // First, get all columns dynamically to avoid hardcoding
    const { rows } = await pool.query(
      `SELECT *
       FROM public.analisequalidade
       ORDER BY id_analise DESC
       LIMIT 1000`
    );

    // Check if there's data
    if (rows.length === 0) {
      return res.status(404).json({ error: "no_data_available", message: "Nenhuma análise encontrada para exportar" });
    }

    // Build CSV
    const headers = Object.keys(rows[0]);
    const escape = (v: any) => {
      if (v == null) return "";
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    };
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => escape((r as any)[h])).join(","))].join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=analise_ia.csv");
    res.send(csv);
  } catch (err) {
    console.error("analytics/export.csv error", err);
    res.status(500).json({ error: "failed_to_export_csv" });
  }
});

// Export custom sales report CSV with specific columns
router.get("/sales-report/export/csv", async (req, res) => {
  try {
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    console.log('[SALES REPORT] Starting export...');
    console.log('[SALES REPORT] Date filters:', { startDate, endDate });

    // Build WHERE clause for date filtering
    let dateFilter = '';
    const queryParams: any[] = [];

    if (startDate && endDate) {
      // Usar DATE() para comparar apenas a data, ignorando a hora
      dateFilter = 'WHERE DATE(a.data_hora_inicio) >= $1::date AND DATE(a.data_hora_inicio) <= $2::date';
      queryParams.push(startDate, endDate);
    }

    // Query baseada EXATAMENTE na estrutura das tabelas:
    // - mensagem: id_mensagem, id_atendimento, conteudo_texto, data_hora_envio, remetente_tipo, tipo_analise
    // - atendimento: id_atendimento, data_hora_inicio, data_hora_fim, canal_origem, id_cliente, id_atendente, status_atendimento, nome_cliente, telefone_cliente
    // - analisequalidade: id_analise, id_atendimento, indicios_venda, sentimento_geral, tipo_atendimento, pontuacao_geral, observacoes, data_analise
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (a.id_atendimento)
        a.nome_cliente as "Nome",
        COALESCE(a.id_cliente, '') as "Telefone",
        to_char(MIN(m.data_hora_envio), 'DD/MM/YYYY') as "Data_Chamou",
        to_char(MIN(m.data_hora_envio), 'HH24:MI:SS') as "Hora_Chamou",
        to_char(MIN(CASE WHEN m.remetente_tipo = 'Atendente' THEN m.data_hora_envio END), 'HH24:MI:SS') as "Hora_Resposta",
        STRING_AGG(
          COALESCE(m.remetente_tipo, 'Unknown') || ': ' || COALESCE(m.conteudo_texto, ''),
          ' | '
          ORDER BY m.data_hora_envio
        ) as "Conteudo_Conversa",
        MAX(COALESCE(aq.indicios_venda, '')) as "Indicios_Venda",
        MAX(COALESCE(aq.canal_origem_conversa, '')) as "Canal_Entrada",
        MAX(COALESCE(aq.produto_interesse, '')) as "Produto_Interesse"
       FROM public.atendimento a
       INNER JOIN public.mensagem m ON m.id_atendimento = a.id_atendimento
       LEFT JOIN public.analisequalidade aq ON aq.id_atendimento = a.id_atendimento
       ${dateFilter}
       GROUP BY a.id_atendimento, a.nome_cliente, a.id_cliente
       ORDER BY a.id_atendimento, MIN(m.data_hora_envio) DESC
       LIMIT 1000`,
      queryParams
    );

    console.log(`[SALES REPORT] Found ${rows.length} rows`);
    if (rows.length > 0) {
      console.log('[SALES REPORT] First row sample:', JSON.stringify(rows[0], null, 2));
    }

    if (rows.length === 0) {
      return res.status(404).json({ error: "no_data_available", message: "Nenhum dado encontrado para o relatório" });
    }

    // Build CSV
    const headers = Object.keys(rows[0]);
    const escape = (v: any) => {
      if (v == null) return "";
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    };
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => escape((r as any)[h])).join(","))].join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=relatorio_vendas.csv");
    res.send(csv);
  } catch (err) {
    console.error("analytics/sales-report/export error", err);
    res.status(500).json({ error: "failed_to_export_sales_report", message: err instanceof Error ? err.message : "Unknown error" });
  }
});

// List all atendimentos with analysis data (JSON format)
router.get("/atendimentos", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 100);
    const offset = Number(req.query.offset || 0);

    const { rows } = await pool.query(
      `SELECT
        a.id_atendimento,
        a.nome_cliente,
        a.id_cliente,
        a.telefone_cliente,
        a.id_atendente,
        a.data_hora_inicio,
        a.data_hora_fim,
        a.status_atendimento,
        a.canal_origem,
        aq.id_analise,
        aq.pontuacao_geral,
        aq.sentimento_geral,
        aq.tipo_atendimento,
        aq.indicios_venda,
        aq.canal_origem_conversa,
        aq.produto_interesse,
        aq.saudacao_inicial,
        aq.uso_nome_cliente,
        aq.rapport_empatia,
        aq.uso_emojis,
        aq.tom_conversa,
        aq.erros_gramaticais,
        aq.resolutividade,
        aq.tempo_resposta,
        aq.observacoes,
        aq.data_analise,
        COUNT(m.id_mensagem) as total_mensagens,
        STRING_AGG(
          m.conteudo_texto,
          ' | '
          ORDER BY m.data_hora_envio
        ) FILTER (WHERE m.conteudo_texto IS NOT NULL) as mensagem_trecho
       FROM public.atendimento a
       LEFT JOIN public.analisequalidade aq ON aq.id_atendimento = a.id_atendimento
       LEFT JOIN public.mensagem m ON m.id_atendimento = a.id_atendimento
       GROUP BY
         a.id_atendimento, a.nome_cliente, a.id_cliente, a.telefone_cliente,
         a.id_atendente, a.data_hora_inicio, a.data_hora_fim, a.status_atendimento,
         a.canal_origem, aq.id_analise, aq.pontuacao_geral, aq.sentimento_geral,
         aq.tipo_atendimento, aq.indicios_venda, aq.canal_origem_conversa,
         aq.produto_interesse, aq.saudacao_inicial, aq.uso_nome_cliente,
         aq.rapport_empatia, aq.uso_emojis, aq.tom_conversa, aq.erros_gramaticais,
         aq.resolutividade, aq.tempo_resposta, aq.observacoes, aq.data_analise
       ORDER BY a.data_hora_inicio DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // Get total count
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(DISTINCT a.id_atendimento) as total
       FROM public.atendimento a`
    );

    res.json({
      atendimentos: rows,
      total: Number(countRows[0].total),
      limit,
      offset
    });
  } catch (err) {
    console.error("analytics/atendimentos error", err);
    res.status(500).json({
      error: "failed_to_fetch_atendimentos",
      message: err instanceof Error ? err.message : "Unknown error"
    });
  }
});

export default router;
