const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function createSuperadmin() {
    const client = new Client({
        connectionString: 'postgresql://postgres:JhpeglsObxrAECaOrajyWHATyhZkAOhI@interchange.proxy.rlwy.net:47458/railway',
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Conectando ao PostgreSQL Railway...');
        await client.connect();

        // 1. Criar role superadmin
        console.log('Criando role superadmin...');
        await client.query(`
      INSERT INTO Role (nome, descricao) 
      VALUES ('superadmin', 'Acesso total ao sistema e todos os tenants') 
      ON CONFLICT (nome) DO NOTHING
    `);

        // Pegar ID da role
        const roleRes = await client.query("SELECT id_role FROM Role WHERE nome = 'superadmin'");
        const roleId = roleRes.rows[0].id_role;

        // 2. Garantir que existe um tenant default
        console.log('Verificando tenant default...');
        let tenantRes = await client.query("SELECT id_tenant FROM Tenant WHERE slug = 'default'");
        let tenantId;

        if (tenantRes.rows.length === 0) {
            tenantRes = await client.query("INSERT INTO Tenant (nome, slug) VALUES ('Default', 'default') RETURNING id_tenant");
            tenantId = tenantRes.rows[0].id_tenant;
        } else {
            tenantId = tenantRes.rows[0].id_tenant;
        }

        // 3. Criar ou atualizar usuário
        const email = 'fbdajr@gmail.com';
        const senha = 'Elitefinder!2026#%';
        const nome = 'Flavio Bastos';

        const senhaHash = await bcrypt.hash(senha, 10);

        console.log(`Criando/Atualizando usuário ${email}...`);

        // Verificar se usuário existe
        const userRes = await client.query("SELECT id_usuario FROM Usuario WHERE email = $1", [email]);

        if (userRes.rows.length > 0) {
            // Atualizar
            await client.query(`
        UPDATE Usuario 
        SET nome = $1, senha_hash = $2, id_role = $3, id_tenant = $4, ativo = true
        WHERE email = $5
      `, [nome, senhaHash, roleId, tenantId, email]);
            console.log('Usuário atualizado com sucesso!');
        } else {
            // Inserir
            await client.query(`
        INSERT INTO Usuario (nome, email, senha_hash, id_role, id_tenant, ativo)
        VALUES ($1, $2, $3, $4, $5, true)
      `, [nome, email, senhaHash, roleId, tenantId]);
            console.log('Usuário criado com sucesso!');
        }

    } catch (err) {
        console.error('❌ Erro:', err);
    } finally {
        await client.end();
    }
}

createSuperadmin();
