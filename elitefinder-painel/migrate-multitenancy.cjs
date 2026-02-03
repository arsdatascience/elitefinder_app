const { Client } = require('pg');

const sql = `
-- ========================================
-- MULTI-TENANCY MIGRATION - ELITE FINDER
-- ========================================

-- 1. Create Tenant table
CREATE TABLE IF NOT EXISTS Tenant (
    id_tenant SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenant_slug ON Tenant(slug);

-- 2. Create Role table
CREATE TABLE IF NOT EXISTS Role (
    id_role SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    descricao TEXT
);

-- Insert default roles
INSERT INTO Role (nome, descricao) VALUES 
    ('admin', 'Administrador do tenant'),
    ('gerente', 'Gerente de equipe'),
    ('atendente', 'Atendente padrão'),
    ('viewer', 'Apenas visualização')
ON CONFLICT (nome) DO NOTHING;

-- 3. Create Usuario table
CREATE TABLE IF NOT EXISTS Usuario (
    id_usuario SERIAL PRIMARY KEY,
    id_tenant INTEGER NOT NULL REFERENCES Tenant(id_tenant),
    id_role INTEGER NOT NULL REFERENCES Role(id_role),
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usuario_tenant ON Usuario(id_tenant);
CREATE INDEX IF NOT EXISTS idx_usuario_email ON Usuario(email);
CREATE INDEX IF NOT EXISTS idx_usuario_role ON Usuario(id_role);

-- 4. Add tenant_id to existing tables
ALTER TABLE Atendimento ADD COLUMN IF NOT EXISTS id_tenant INTEGER REFERENCES Tenant(id_tenant);
ALTER TABLE Mensagem ADD COLUMN IF NOT EXISTS id_tenant INTEGER REFERENCES Tenant(id_tenant);
ALTER TABLE AnaliseQualidade ADD COLUMN IF NOT EXISTS id_tenant INTEGER REFERENCES Tenant(id_tenant);
ALTER TABLE Relatorio ADD COLUMN IF NOT EXISTS id_tenant INTEGER REFERENCES Tenant(id_tenant);
ALTER TABLE RelatorioAnalise ADD COLUMN IF NOT EXISTS id_tenant INTEGER REFERENCES Tenant(id_tenant);

-- 5. Create indexes for tenant_id on existing tables
CREATE INDEX IF NOT EXISTS idx_atendimento_tenant ON Atendimento(id_tenant);
CREATE INDEX IF NOT EXISTS idx_mensagem_tenant ON Mensagem(id_tenant);
CREATE INDEX IF NOT EXISTS idx_analise_tenant ON AnaliseQualidade(id_tenant);
CREATE INDEX IF NOT EXISTS idx_relatorio_tenant ON Relatorio(id_tenant);
CREATE INDEX IF NOT EXISTS idx_relatorioanalise_tenant ON RelatorioAnalise(id_tenant);
`;

async function runMigration() {
    const client = new Client({
        connectionString: 'postgresql://postgres:JhpeglsObxrAECaOrajyWHATyhZkAOhI@interchange.proxy.rlwy.net:47458/railway',
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Conectando ao PostgreSQL Railway...');
        await client.connect();
        console.log('Conectado! Executando migração multi-tenancy...');

        await client.query(sql);

        console.log('✅ Migração concluída com sucesso!');

        // Verificar tabelas
        const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name
    `);
        console.log('\nTabelas no banco:', result.rows.map(r => r.table_name).join(', '));

        // Verificar roles
        const roles = await client.query('SELECT * FROM Role');
        console.log('\nRoles criados:', roles.rows.map(r => r.nome).join(', '));

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await client.end();
    }
}

runMigration();
