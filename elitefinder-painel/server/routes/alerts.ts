import { Router } from "express";
import { Pool } from "pg";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

router.use(authMiddleware);

// ==================== TIPOS ====================
type AlertType = 'critico' | 'urgente' | 'atencao' | 'positivo';
type AlertCategory = 'sentimento' | 'score' | 'keywords' | 'tempo' | 'resolucao';

interface Alert {
    id: number;
    id_atendimento: number;
    tipo: AlertType;
    categoria: AlertCategory;
    mensagem: string;
    dados: Record<string, any>;
    criado_em: Date;
    lido_em: Date | null;
    resolvido_em: Date | null;
    id_tenant: number;
}

// ==================== ROTAS ====================

// GET /api/alerts - Lista alertas ativos
router.get("/", async (req: AuthRequest, res) => {
    try {
        const tenantId = req.tenantId;
        const tipo = req.query.tipo as string;
        const resolvido = req.query.resolvido === 'true';
        const limit = Number(req.query.limit) || 50;

        let query = `
      SELECT a.*, at.nome_cliente, at.status_atendimento
      FROM alerta a
      LEFT JOIN atendimento at ON at.id_atendimento = a.id_atendimento
      WHERE 1=1
    `;
        const params: any[] = [];
        let paramIdx = 1;

        // Tenant filter (admin/superadmin vê todos)
        if (req.userRole !== 'admin' && req.userRole !== 'superadmin') {
            query += ` AND a.id_tenant = $${paramIdx++}`;
            params.push(tenantId);
        }

        // Filtro por tipo
        if (tipo) {
            query += ` AND a.tipo = $${paramIdx++}`;
            params.push(tipo);
        }

        // Filtro resolvidos/não resolvidos
        if (!resolvido) {
            query += ` AND a.resolvido_em IS NULL`;
        }

        query += ` ORDER BY 
      CASE a.tipo 
        WHEN 'critico' THEN 1 
        WHEN 'urgente' THEN 2 
        WHEN 'atencao' THEN 3 
        ELSE 4 
      END,
      a.criado_em DESC
      LIMIT $${paramIdx}`;
        params.push(limit);

        const { rows } = await pool.query(query, params);
        res.json({ alerts: rows, total: rows.length });
    } catch (err) {
        console.error("GET /api/alerts error", err);
        res.status(500).json({ error: "failed_to_fetch_alerts" });
    }
});

// GET /api/alerts/summary - Resumo de contadores
router.get("/summary", async (req: AuthRequest, res) => {
    try {
        const tenantId = req.tenantId;
        const tenantCondition = (req.userRole !== 'admin' && req.userRole !== 'superadmin')
            ? `AND id_tenant = ${tenantId}` : '';

        const { rows } = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE resolvido_em IS NULL) as total_ativos,
        COUNT(*) FILTER (WHERE tipo = 'critico' AND resolvido_em IS NULL) as criticos,
        COUNT(*) FILTER (WHERE tipo = 'urgente' AND resolvido_em IS NULL) as urgentes,
        COUNT(*) FILTER (WHERE tipo = 'atencao' AND resolvido_em IS NULL) as atencao,
        COUNT(*) FILTER (WHERE tipo = 'positivo' AND resolvido_em IS NULL) as positivos,
        COUNT(*) FILTER (WHERE lido_em IS NULL AND resolvido_em IS NULL) as nao_lidos
      FROM alerta
      WHERE 1=1 ${tenantCondition}
    `);

        res.json(rows[0]);
    } catch (err) {
        console.error("GET /api/alerts/summary error", err);
        res.status(500).json({ error: "failed_to_fetch_summary" });
    }
});

// POST /api/alerts - Criar novo alerta
router.post("/", async (req: AuthRequest, res) => {
    try {
        const { id_atendimento, tipo, categoria, mensagem, dados } = req.body;
        const tenantId = req.tenantId || 1;

        const { rows } = await pool.query(`
      INSERT INTO alerta (id_atendimento, tipo, categoria, mensagem, dados, id_tenant)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [id_atendimento, tipo, categoria, mensagem, JSON.stringify(dados || {}), tenantId]);

        res.status(201).json(rows[0]);
    } catch (err) {
        console.error("POST /api/alerts error", err);
        res.status(500).json({ error: "failed_to_create_alert" });
    }
});

// PATCH /api/alerts/:id/read - Marcar como lido
router.patch("/:id/read", async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const { rows } = await pool.query(`
      UPDATE alerta SET lido_em = NOW() WHERE id = $1 RETURNING *
    `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "alert_not_found" });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error("PATCH /api/alerts/:id/read error", err);
        res.status(500).json({ error: "failed_to_update_alert" });
    }
});

// PATCH /api/alerts/:id/resolve - Marcar como resolvido
router.patch("/:id/resolve", async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const { rows } = await pool.query(`
      UPDATE alerta SET resolvido_em = NOW(), lido_em = COALESCE(lido_em, NOW())
      WHERE id = $1 RETURNING *
    `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "alert_not_found" });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error("PATCH /api/alerts/:id/resolve error", err);
        res.status(500).json({ error: "failed_to_resolve_alert" });
    }
});

// ==================== TRIGGER ENGINE ====================

interface AnalysisData {
    id_atendimento: number;
    id_tenant: number;
    nome_cliente: string;
    sentimento_geral: string;
    pontuacao_geral: number;
    conteudo_mensagens?: string;
}

// POST /api/alerts/evaluate - Avalia análise e dispara alertas
router.post("/evaluate", async (req: AuthRequest, res) => {
    try {
        const analysis: AnalysisData = req.body;
        const alertsCreated: Alert[] = [];

        // Regra 1: Sentimento muito negativo
        if (['Muito Negativo', 'Negativo'].includes(analysis.sentimento_geral)) {
            const tipo: AlertType = analysis.sentimento_geral === 'Muito Negativo' ? 'critico' : 'urgente';
            const { rows } = await pool.query(`
        INSERT INTO alerta (id_atendimento, tipo, categoria, mensagem, dados, id_tenant)
        VALUES ($1, $2, 'sentimento', $3, $4, $5)
        RETURNING *
      `, [
                analysis.id_atendimento,
                tipo,
                `Cliente ${analysis.nome_cliente}: sentimento ${analysis.sentimento_geral}`,
                JSON.stringify({ sentimento: analysis.sentimento_geral }),
                analysis.id_tenant
            ]);
            alertsCreated.push(rows[0]);
        }

        // Regra 2: Score baixo
        if (analysis.pontuacao_geral < 50) {
            const { rows } = await pool.query(`
        INSERT INTO alerta (id_atendimento, tipo, categoria, mensagem, dados, id_tenant)
        VALUES ($1, 'urgente', 'score', $2, $3, $4)
        RETURNING *
      `, [
                analysis.id_atendimento,
                `Atendimento #${analysis.id_atendimento} com score ${analysis.pontuacao_geral}`,
                JSON.stringify({ score: analysis.pontuacao_geral }),
                analysis.id_tenant
            ]);
            alertsCreated.push(rows[0]);
        }

        // Regra 3: Palavras de risco
        const keywordsRisco = /cancelar|reclamar|advogado|procon|processo|denunciar/i;
        if (analysis.conteudo_mensagens && keywordsRisco.test(analysis.conteudo_mensagens)) {
            const match = analysis.conteudo_mensagens.match(keywordsRisco);
            const { rows } = await pool.query(`
        INSERT INTO alerta (id_atendimento, tipo, categoria, mensagem, dados, id_tenant)
        VALUES ($1, 'atencao', 'keywords', $2, $3, $4)
        RETURNING *
      `, [
                analysis.id_atendimento,
                `Palavra de risco detectada: "${match?.[0]}"`,
                JSON.stringify({ keyword: match?.[0] }),
                analysis.id_tenant
            ]);
            alertsCreated.push(rows[0]);
        }

        // Regra 4: Score excelente (positivo)
        if (analysis.pontuacao_geral >= 90) {
            const { rows } = await pool.query(`
        INSERT INTO alerta (id_atendimento, tipo, categoria, mensagem, dados, id_tenant)
        VALUES ($1, 'positivo', 'score', $2, $3, $4)
        RETURNING *
      `, [
                analysis.id_atendimento,
                `Excelente atendimento! Score ${analysis.pontuacao_geral}`,
                JSON.stringify({ score: analysis.pontuacao_geral }),
                analysis.id_tenant
            ]);
            alertsCreated.push(rows[0]);
        }

        res.json({
            evaluated: true,
            alerts_created: alertsCreated.length,
            alerts: alertsCreated
        });
    } catch (err) {
        console.error("POST /api/alerts/evaluate error", err);
        res.status(500).json({ error: "failed_to_evaluate" });
    }
});

export default router;
