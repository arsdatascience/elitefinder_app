import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db';
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/auth/register - Registrar novo usuário
router.post('/register', async (req: Request, res: Response) => {
    try {
        const { nome, email, senha, tenantNome, tenantSlug } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
        }

        // Verificar se email já existe
        const existingUser = await pool.query('SELECT id_usuario FROM Usuario WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email já cadastrado' });
        }

        // Hash da senha
        const senhaHash = await bcrypt.hash(senha, 10);

        let tenantId: number;

        // Se forneceu dados de tenant, criar novo tenant
        if (tenantNome && tenantSlug) {
            const existingTenant = await pool.query('SELECT id_tenant FROM Tenant WHERE slug = $1', [tenantSlug]);
            if (existingTenant.rows.length > 0) {
                return res.status(400).json({ error: 'Slug do tenant já existe' });
            }

            const newTenant = await pool.query(
                'INSERT INTO Tenant (nome, slug) VALUES ($1, $2) RETURNING id_tenant',
                [tenantNome, tenantSlug]
            );
            tenantId = newTenant.rows[0].id_tenant;
        } else {
            // Usar tenant padrão (criar se não existir)
            const defaultTenant = await pool.query('SELECT id_tenant FROM Tenant WHERE slug = $1', ['default']);
            if (defaultTenant.rows.length === 0) {
                const created = await pool.query(
                    'INSERT INTO Tenant (nome, slug) VALUES ($1, $2) RETURNING id_tenant',
                    ['Default', 'default']
                );
                tenantId = created.rows[0].id_tenant;
            } else {
                tenantId = defaultTenant.rows[0].id_tenant;
            }
        }

        // Buscar role admin (primeiro usuário do tenant é admin)
        const adminRole = await pool.query('SELECT id_role FROM Role WHERE nome = $1', ['admin']);
        const roleId = adminRole.rows[0]?.id_role || 1;

        // Criar usuário
        const newUser = await pool.query(
            'INSERT INTO Usuario (id_tenant, id_role, nome, email, senha_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id_usuario, nome, email',
            [tenantId, roleId, nome, email, senhaHash]
        );

        const user = newUser.rows[0];

        // Buscar nome da role
        const roleData = await pool.query('SELECT nome FROM Role WHERE id_role = $1', [roleId]);
        const roleName = roleData.rows[0]?.nome || 'admin';

        // Gerar token
        const token = generateToken({
            userId: user.id_usuario,
            tenantId,
            role: roleName,
            email: user.email
        });

        res.status(201).json({
            message: 'Usuário criado com sucesso',
            user: { id: user.id_usuario, nome: user.nome, email: user.email, role: roleName },
            token
        });

    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/auth/login - Login de usuário
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ error: 'Email e senha são obrigatórios' });
        }

        const emailTrimmed = email.trim();
        const senhaTrimmed = senha.trim();

        // Buscar usuário com role
        const result = await pool.query(`
      SELECT u.id_usuario, u.id_tenant, u.nome, u.email, u.senha_hash, u.ativo, r.nome as role
      FROM Usuario u
      JOIN Role r ON u.id_role = r.id_role
      WHERE u.email = $1
    `, [emailTrimmed]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const user = result.rows[0];

        if (!user.ativo) {
            return res.status(401).json({ error: 'Usuário desativado' });
        }

        // Verificar senha
        const senhaValida = await bcrypt.compare(senhaTrimmed, user.senha_hash);
        if (!senhaValida) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        // Gerar token
        const token = generateToken({
            userId: user.id_usuario,
            tenantId: user.id_tenant,
            role: user.role,
            email: user.email
        });

        res.json({
            message: 'Login realizado com sucesso',
            user: { id: user.id_usuario, nome: user.nome, email: user.email, role: user.role },
            token
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/auth/me - Obter dados do usuário atual
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(`
      SELECT u.id_usuario, u.id_tenant, u.nome, u.email, u.ativo, u.created_at, 
             r.nome as role, t.nome as tenant_nome, t.slug as tenant_slug
      FROM Usuario u
      JOIN Role r ON u.id_role = r.id_role
      JOIN Tenant t ON u.id_tenant = t.id_tenant
      WHERE u.id_usuario = $1
    `, [req.userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const user = result.rows[0];

        res.json({
            user: {
                id: user.id_usuario,
                nome: user.nome,
                email: user.email,
                role: user.role,
                tenant: {
                    id: user.id_tenant,
                    nome: user.tenant_nome,
                    slug: user.tenant_slug
                },
                createdAt: user.created_at
            }
        });

    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

export default router;
