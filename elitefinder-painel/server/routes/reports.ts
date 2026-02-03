import { Router } from "express";
import pool from "../db";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

// ==================== RELATÓRIO DIÁRIO ====================
router.get("/daily", async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId;
    const isAdmin = req.userRole === 'admin' || req.userRole === 'superadmin';
    const params: any[] = [];
    const tenantCondition = isAdmin ? '' : `AND id_tenant = $${params.push(tenantId)}`;

    // Métricas do dia
    const metricas = await pool.query(`
      SELECT 
        COUNT(DISTINCT a.id_atendimento) as total_atendimentos,
        ROUND(AVG(aq.pontuacao_geral)::numeric, 1) as score_medio,
        COUNT(DISTINCT CASE WHEN aq.sentimento_geral = 'Positivo' THEN aq.id_analise END) as positivos,
        COUNT(DISTINCT CASE WHEN aq.sentimento_geral = 'Negativo' THEN aq.id_analise END) as negativos
      FROM atendimento a
      LEFT JOIN analisequalidade aq ON aq.id_atendimento = a.id_atendimento
      WHERE DATE(a.data_hora_inicio) = CURRENT_DATE ${tenantCondition}
    `, params);

    // Alertas do dia
    const alertas = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE tipo = 'critico') as criticos,
        COUNT(*) FILTER (WHERE tipo = 'urgente') as urgentes,
        COUNT(*) FILTER (WHERE tipo = 'atencao') as atencao,
        COUNT(*) FILTER (WHERE tipo = 'positivo') as positivos
      FROM alerta
      WHERE DATE(criado_em) = CURRENT_DATE ${tenantCondition}
    `, params);

    // Top atendentes do dia
    const ranking = await pool.query(`
      SELECT 
        a.id_atendente,
        COUNT(*) as total,
        ROUND(AVG(aq.pontuacao_geral)::numeric, 1) as avg_score
      FROM atendimento a
      LEFT JOIN analisequalidade aq ON aq.id_atendimento = a.id_atendimento
      WHERE DATE(a.data_hora_inicio) = CURRENT_DATE 
        AND aq.pontuacao_geral IS NOT NULL
        ${tenantCondition}
      GROUP BY a.id_atendente
      ORDER BY avg_score DESC
      LIMIT 5
    `, params);

    res.json({
      data: new Date().toISOString().split('T')[0],
      metricas: metricas.rows[0],
      alertas: alertas.rows[0],
      ranking: ranking.rows
    });
  } catch (err) {
    console.error("GET /api/reports/daily error", err);
    res.status(500).json({ error: "failed_to_generate_daily_report" });
  }
});

// ==================== RELATÓRIO SEMANAL ====================
router.get("/weekly", async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId;
    const isAdmin = req.userRole === 'admin' || req.userRole === 'superadmin';
    const params: any[] = [];
    const tenantCondition = isAdmin ? '' : `AND id_tenant = $${params.push(tenantId)}`;

    // Métricas da semana
    const metricas = await pool.query(`
      SELECT 
        COUNT(DISTINCT a.id_atendimento) as total_atendimentos,
        ROUND(AVG(aq.pontuacao_geral)::numeric, 1) as score_medio,
        COUNT(DISTINCT CASE WHEN aq.sentimento_geral = 'Positivo' THEN aq.id_analise END) as positivos,
        COUNT(DISTINCT CASE WHEN aq.sentimento_geral = 'Negativo' THEN aq.id_analise END) as negativos
      FROM atendimento a
      LEFT JOIN analisequalidade aq ON aq.id_atendimento = a.id_atendimento
      WHERE a.data_hora_inicio >= CURRENT_DATE - INTERVAL '7 days' ${tenantCondition}
    `, params);

    // Evolução diária
    const evolucao = await pool.query(`
      SELECT 
        DATE(a.data_hora_inicio) as dia,
        COUNT(*) as total,
        ROUND(AVG(aq.pontuacao_geral)::numeric, 1) as score
      FROM atendimento a
      LEFT JOIN analisequalidade aq ON aq.id_atendimento = a.id_atendimento
      WHERE a.data_hora_inicio >= CURRENT_DATE - INTERVAL '7 days' ${tenantCondition}
      GROUP BY DATE(a.data_hora_inicio)
      ORDER BY dia
    `, params);

    // Ranking de atendentes
    const ranking = await pool.query(`
      SELECT 
        a.id_atendente,
        COUNT(*) as total_atendimentos,
        ROUND(AVG(aq.pontuacao_geral)::numeric, 1) as avg_score,
        COUNT(*) FILTER (WHERE aq.sentimento_geral = 'Positivo') as positivos
      FROM atendimento a
      LEFT JOIN analisequalidade aq ON aq.id_atendimento = a.id_atendimento
      WHERE a.data_hora_inicio >= CURRENT_DATE - INTERVAL '7 days' 
        AND aq.pontuacao_geral IS NOT NULL
        ${tenantCondition}
      GROUP BY a.id_atendente
      ORDER BY avg_score DESC
      LIMIT 10
    `, params);

    // Distribuição de sentimentos
    const sentimentos = await pool.query(`
      SELECT 
        sentimento_geral,
        COUNT(*) as total
      FROM analisequalidade
      WHERE data_analise >= CURRENT_DATE - INTERVAL '7 days' ${tenantCondition}
      GROUP BY sentimento_geral
    `, params);

    // Alertas da semana
    const alertas = await pool.query(`
      SELECT 
        tipo,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE resolvido_em IS NOT NULL) as resolvidos
      FROM alerta
      WHERE criado_em >= CURRENT_DATE - INTERVAL '7 days' ${tenantCondition}
      GROUP BY tipo
    `, params);

    res.json({
      periodo: {
        inicio: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        fim: new Date().toISOString().split('T')[0]
      },
      metricas: metricas.rows[0],
      evolucao: evolucao.rows,
      ranking: ranking.rows,
      sentimentos: sentimentos.rows,
      alertas: alertas.rows
    });
  } catch (err) {
    console.error("GET /api/reports/weekly error", err);
    res.status(500).json({ error: "failed_to_generate_weekly_report" });
  }
});

// ==================== FEEDBACK POR ATENDENTE ====================
router.get("/attendant/:id", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    const isAdmin = req.userRole === 'admin' || req.userRole === 'superadmin';
    const params: any[] = [id]; // $1 = id (atendente)
    // Se não for admin, adiciona tenantId como $2
    const tenantCondition = isAdmin ? '' : `AND a.id_tenant = $${params.push(tenantId)}`;

    // Métricas do atendente
    const metricas = await pool.query(`
      SELECT 
        COUNT(*) as total_atendimentos,
        ROUND(AVG(aq.pontuacao_geral)::numeric, 1) as score_medio,
        COUNT(*) FILTER (WHERE aq.sentimento_geral = 'Positivo') as positivos,
        COUNT(*) FILTER (WHERE aq.sentimento_geral = 'Negativo') as negativos,
        COUNT(*) FILTER (WHERE aq.saudacao_inicial ILIKE '%sim%' OR aq.saudacao_inicial ILIKE '%boa%') as com_saudacao,
        COUNT(*) FILTER (WHERE aq.uso_nome_cliente ILIKE '%sim%') as usa_nome,
        COUNT(*) FILTER (WHERE aq.resolutividade ILIKE '%sim%') as resolvidos
      FROM atendimento a
      LEFT JOIN analisequalidade aq ON aq.id_atendimento = a.id_atendimento
      WHERE a.id_atendente = $1 
        AND a.data_hora_inicio >= CURRENT_DATE - INTERVAL '30 days'
        ${tenantCondition}
    `, params);

    // Pontos fortes e fracos
    const criterios = await pool.query(`
      SELECT 
        aq.saudacao_inicial,
        aq.uso_nome_cliente,
        aq.rapport_empatia,
        aq.tom_conversa,
        aq.resolutividade,
        aq.tempo_resposta
      FROM atendimento a
      JOIN analisequalidade aq ON aq.id_atendimento = a.id_atendimento
      WHERE a.id_atendente = $1 
        AND a.data_hora_inicio >= CURRENT_DATE - INTERVAL '30 days'
        ${tenantCondition}
      ORDER BY aq.data_analise DESC
      LIMIT 20
    `, params);

    // Calcular pontos fortes e fracos
    const stats = metricas.rows[0];
    const total = parseInt(stats.total_atendimentos) || 1;

    const pontosFortes: string[] = [];
    const oportunidades: string[] = [];

    if (parseInt(stats.com_saudacao) / total > 0.7) {
      pontosFortes.push("Boa saudação inicial na maioria dos atendimentos");
    } else {
      oportunidades.push("Melhorar saudação inicial - apenas " + Math.round(parseInt(stats.com_saudacao) / total * 100) + "% dos atendimentos");
    }

    if (parseInt(stats.usa_nome) / total > 0.7) {
      pontosFortes.push("Excelente uso do nome do cliente");
    } else {
      oportunidades.push("Usar mais o nome do cliente para personalizar");
    }

    if (parseInt(stats.resolvidos) / total > 0.8) {
      pontosFortes.push("Alta taxa de resolução de problemas");
    } else {
      oportunidades.push("Aumentar taxa de resolução - atualmente " + Math.round(parseInt(stats.resolvidos) / total * 100) + "%");
    }

    res.json({
      id_atendente: id,
      periodo: "Últimos 30 dias",
      metricas: stats,
      pontos_fortes: pontosFortes,
      oportunidades: oportunidades,
      sugestao: gerarSugestao(pontosFortes, oportunidades)
    });
  } catch (err) {
    console.error("GET /api/reports/attendant/:id error", err);
    res.status(500).json({ error: "failed_to_generate_attendant_report" });
  }
});

function gerarSugestao(fortes: string[], fracos: string[]): string {
  if (fortes.length > fracos.length) {
    return `Excelente desempenho! Continue mantendo ${fortes[0].toLowerCase()}. Para evoluir ainda mais, foque em ${fracos[0]?.toLowerCase() || 'manter a consistência'}.`;
  } else {
    return `Há oportunidades de melhoria! Priorize: ${fracos[0]?.toLowerCase() || 'consistência nos atendimentos'}. Você já se destaca em ${fortes[0]?.toLowerCase() || 'alguns aspectos'}.`;
  }
}

// ==================== INSIGHTS E PADRÕES ====================
router.get("/insights", async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId;
    const isAdmin = req.userRole === 'admin' || req.userRole === 'superadmin';
    const params: any[] = [];
    const tenantCondition = isAdmin ? '' : `WHERE id_tenant = $${params.push(tenantId)}`;

    // Buscar padrões detectados
    const padroes = await pool.query(`
      SELECT * FROM padrao_detectado
      ${tenantCondition}
      ORDER BY frequencia DESC
      LIMIT 10
    `, params);

    // Análise de horários críticos
    // Reutiliza tenantCondition mas precisa ajustar para "AND" se ja tiver WHERE.
    // Como a query de horarios usa WHERE para data, precisamos adicionar AND para tenant
    // ou se tenantCondition ja tem WHERE, precisamos mudar para AND.
    // Maneira segura: recriar condição para esta query especifica
    const paramsHorarios: any[] = [];
    const conditionHorarios = isAdmin ? '' : `AND a.id_tenant = $${paramsHorarios.push(tenantId)}`;

    const horarios = await pool.query(`
      SELECT 
        EXTRACT(HOUR FROM a.data_hora_inicio) as hora,
        COUNT(*) as total,
        ROUND(AVG(aq.pontuacao_geral)::numeric, 1) as score_medio
      FROM atendimento a
      LEFT JOIN analisequalidade aq ON aq.id_atendimento = a.id_atendimento
      WHERE a.data_hora_inicio >= CURRENT_DATE - INTERVAL '30 days'
      ${conditionHorarios}
      GROUP BY EXTRACT(HOUR FROM a.data_hora_inicio)
      ORDER BY score_medio ASC
      LIMIT 5
    `, paramsHorarios);

    // AI Service Integration for Strategic Report
    try {
      const { generateStrategicReport } = await import('../services/aiClient');

      // Prepare data for AI
      const aiRequest = {
        tenant_id: tenantId as number,
        period: 'last_30_days',
        metrics: {
          total_atendimentos: horarios.rows.reduce((acc, curr) => acc + parseInt(curr.total), 0),
          horarios_criticos: horarios.rows.map(h => ({ hora: h.hora, score: h.score_medio }))
        },
        alerts_summary: {
          patterns_detected: padroes.rows.length
        },
        attendant_performance: [] // Could populate this with a query if needed
      };

      const aiReport = await generateStrategicReport(aiRequest);

      res.json({
        padroes: padroes.rows,
        horarios_criticos: horarios.rows,
        sugestoes: aiReport?.action_items || [
          "Reforce a equipe nos horários com score mais baixo",
          "Crie templates de resposta para padrões frequentes",
          "Monitore alertas críticos em tempo real"
        ],
        strategic_insight: aiReport?.strategic_insight,
        forecast: aiReport?.forecast
      });

    } catch (aiErr) {
      console.error("AI Service Error:", aiErr);
      // Fallback to basic response
      res.json({
        padroes: padroes.rows,
        horarios_criticos: horarios.rows,
        sugestoes: [
          "Reforce a equipe nos horários com score mais baixo",
          "Crie templates de resposta para padrões frequentes",
          "Monitore alertas críticos em tempo real"
        ]
      });
    }
  } catch (err) {
    console.error("GET /api/reports/insights error", err);
    res.status(500).json({ error: "failed_to_fetch_insights" });
  }
});

export default router;
