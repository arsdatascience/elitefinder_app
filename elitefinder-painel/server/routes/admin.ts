import { Router, Response } from 'express';
import pool from '../db';
import bcrypt from 'bcryptjs';
import { authMiddleware, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// All admin routes require authentication and admin/gerente/superadmin role
router.use(authMiddleware);
router.use(requireRole('admin', 'gerente', 'superadmin'));

// ========== TENANT MANAGEMENT ==========

// GET /api/admin/tenants - Listar todos os tenants (apenas super-admin e admin)
router.get('/tenants', requireRole('admin', 'superadmin'), async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(`
      SELECT t.*, 
             (SELECT COUNT(*) FROM Usuario u WHERE u.id_tenant = t.id_tenant) as total_usuarios
      FROM Tenant t
      ORDER BY t.created_at DESC
    `);
        res.json({ tenants: result.rows });
    } catch (error) {
        console.error('Erro ao listar tenants:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// POST /api/admin/tenants - Criar novo tenant
router.post('/tenants', requireRole('admin', 'superadmin'), async (req: AuthRequest, res: Response) => {
    try {
        const { nome, slug } = req.body;

        if (!nome || !slug) {
            return res.status(400).json({ error: 'Nome e slug são obrigatórios' });
        }

        const existing = await pool.query('SELECT id_tenant FROM Tenant WHERE slug = $1', [slug]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Slug já existe' });
        }

        const result = await pool.query(
            'INSERT INTO Tenant (nome, slug) VALUES ($1, $2) RETURNING *',
            [nome, slug]
        );

        res.status(201).json({ tenant: result.rows[0] });
    } catch (error) {
        console.error('Erro ao criar tenant:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// PATCH /api/admin/tenants/:id - Atualizar tenant
router.patch('/tenants/:id', requireRole('admin', 'superadmin'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { nome, ativo } = req.body;

        const updates: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        if (nome !== undefined) {
            updates.push(`nome = $${paramCount++}`);
            values.push(nome);
        }
        if (ativo !== undefined) {
            updates.push(`ativo = $${paramCount++}`);
            values.push(ativo);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Nenhum campo para atualizar' });
        }

        values.push(id);
        const result = await pool.query(
            `UPDATE Tenant SET ${updates.join(', ')} WHERE id_tenant = $${paramCount} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tenant não encontrado' });
        }

        res.json({ tenant: result.rows[0] });
    } catch (error) {
        console.error('Erro ao atualizar tenant:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// ========== USER MANAGEMENT ==========

// GET /api/admin/users - Listar usuários do tenant
router.get('/users', async (req: AuthRequest, res: Response) => {
    try {
        // Admin e Superadmin veem todos se não especificar tenant
        const isAdmin = req.userRole === 'admin' || req.userRole === 'superadmin';
        const tenantFilter = isAdmin ? '' : 'WHERE u.id_tenant = $1';
        const params = isAdmin ? [] : [req.tenantId];

        const result = await pool.query(`
      SELECT u.id_usuario, u.nome, u.email, u.ativo, u.created_at,
             r.nome as role, t.nome as tenant_nome
      FROM Usuario u
      JOIN Role r ON u.id_role = r.id_role
      JOIN Tenant t ON u.id_tenant = t.id_tenant
      ${tenantFilter}
      ORDER BY u.created_at DESC
    `, params);

        res.json({ users: result.rows });
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// POST /api/admin/users - Criar novo usuário
router.post('/users', async (req: AuthRequest, res: Response) => {
    try {
        const { nome, email, senha, roleId, tenantId } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
        }

        // Gerente só pode criar usuários no próprio tenant
        const targetTenantId = req.userRole === 'admin' ? (tenantId || req.tenantId) : req.tenantId;

        const existing = await pool.query('SELECT id_usuario FROM Usuario WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Email já cadastrado' });
        }

        const senhaHash = await bcrypt.hash(senha, 10);
        const targetRoleId = roleId || 3; // Default: atendente

        const result = await pool.query(
            'INSERT INTO Usuario (id_tenant, id_role, nome, email, senha_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id_usuario, nome, email',
            [targetTenantId, targetRoleId, nome, email, senhaHash]
        );

        res.status(201).json({ user: result.rows[0] });
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// PATCH /api/admin/users/:id - Atualizar usuário
router.patch('/users/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { nome, roleId, ativo, senha } = req.body;

        const updates: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        if (nome !== undefined) {
            updates.push(`nome = $${paramCount++}`);
            values.push(nome);
        }
        if (roleId !== undefined) {
            updates.push(`id_role = $${paramCount++}`);
            values.push(roleId);
        }
        if (ativo !== undefined) {
            updates.push(`ativo = $${paramCount++}`);
            values.push(ativo);
        }
        if (senha) {
            updates.push(`senha_hash = $${paramCount++}`);
            values.push(await bcrypt.hash(senha, 10));
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Nenhum campo para atualizar' });
        }

        values.push(id);

        // Gerente só pode editar usuários do próprio tenant
        const tenantFilter = req.userRole === 'admin' ? '' : `AND id_tenant = $${++paramCount}`;
        if (req.userRole !== 'admin') {
            values.push(req.tenantId);
        }

        const result = await pool.query(
            `UPDATE Usuario SET ${updates.join(', ')} WHERE id_usuario = $${paramCount - (req.userRole !== 'admin' ? 1 : 0)} ${tenantFilter} RETURNING id_usuario, nome, email`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        res.json({ user: result.rows[0] });
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// GET /api/admin/roles - Listar roles disponíveis
router.get('/roles', async (_req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query('SELECT * FROM Role ORDER BY id_role');
        res.json({ roles: result.rows });
    } catch (error) {
        console.error('Erro ao listar roles:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// GET /api/admin/stats - Estatísticas do tenant
router.get('/stats', async (req: AuthRequest, res: Response) => {
    try {
        const isAdmin = req.userRole === 'admin' || req.userRole === 'superadmin';
        const tenantFilter = isAdmin ? '' : 'WHERE id_tenant = $1';
        const params = isAdmin ? [] : [req.tenantId];

        const [users, atendimentos, analises] = await Promise.all([
            pool.query(`SELECT COUNT(*) as total FROM Usuario ${tenantFilter}`, params),
            pool.query(`SELECT COUNT(*) as total FROM Atendimento ${tenantFilter}`, params),
            pool.query(`SELECT COUNT(*) as total FROM AnaliseQualidade ${tenantFilter}`, params)
        ]);

        res.json({
            stats: {
                totalUsuarios: parseInt(users.rows[0].total),
                totalAtendimentos: parseInt(atendimentos.rows[0].total),
                totalAnalises: parseInt(analises.rows[0].total)
            }
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

export default router;
