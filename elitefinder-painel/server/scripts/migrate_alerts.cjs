const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const sql = `
-- Tabela de Alertas
CREATE TABLE IF NOT EXISTS alerta (
    id SERIAL PRIMARY KEY,
    id_atendimento INTEGER REFERENCES atendimento(id_atendimento) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL,           -- critico, urgente, atencao, positivo
    categoria VARCHAR(50) NOT NULL,       -- sentimento, score, keywords, tempo, resolucao
    mensagem TEXT NOT NULL,
    dados JSONB DEFAULT '{}',
    criado_em TIMESTAMP DEFAULT NOW(),
    lido_em TIMESTAMP,
    resolvido_em TIMESTAMP,
    id_tenant INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_alerta_tipo ON alerta(tipo);
CREATE INDEX IF NOT EXISTS idx_alerta_tenant ON alerta(id_tenant);
CREATE INDEX IF NOT EXISTS idx_alerta_resolvido ON alerta(resolvido_em);
CREATE INDEX IF NOT EXISTS idx_alerta_atendimento ON alerta(id_atendimento);

-- Tabela de Métricas por Atendente
CREATE TABLE IF NOT EXISTS metricas_atendente (
    id SERIAL PRIMARY KEY,
    id_atendente VARCHAR(50) NOT NULL,
    periodo DATE NOT NULL,
    total_atendimentos INTEGER DEFAULT 0,
    avg_score DECIMAL(5,2),
    avg_response_time INTEGER,          -- em segundos
    taxa_resolucao DECIMAL(5,2),        -- percentual
    total_alertas_criticos INTEGER DEFAULT 0,
    total_alertas_positivos INTEGER DEFAULT 0,
    id_tenant INTEGER DEFAULT 1,
    UNIQUE(id_atendente, periodo, id_tenant)
);

CREATE INDEX IF NOT EXISTS idx_metricas_atendente ON metricas_atendente(id_atendente);
CREATE INDEX IF NOT EXISTS idx_metricas_periodo ON metricas_atendente(periodo);

-- Tabela de Padrões Detectados
CREATE TABLE IF NOT EXISTS padrao_detectado (
    id SERIAL PRIMARY KEY,
    categoria VARCHAR(100) NOT NULL,     -- reclamacao_prazo, duvida_produto, etc
    descricao TEXT,
    frequencia INTEGER DEFAULT 0,
    exemplo_mensagem TEXT,
    sugestao_estrategia TEXT,
    detectado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW(),
    id_tenant INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_padrao_categoria ON padrao_detectado(categoria);
`;

async function migrate() {
    try {
        await client.connect();
        console.log('Conectado ao PostgreSQL...');

        await client.query(sql);
        console.log('✅ Tabelas de alertas e métricas criadas!');

        // Verificar
        const { rows } = await client.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('alerta', 'metricas_atendente', 'padrao_detectado')
        `);
        console.log('Tabelas criadas:', rows.map(r => r.table_name).join(', '));

    } catch (err) {
        console.error('Erro:', err.message);
    } finally {
        await client.end();
    }
}

migrate();
