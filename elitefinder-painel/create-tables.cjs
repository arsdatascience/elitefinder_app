const { Client } = require('pg');

const sql = `
CREATE TABLE IF NOT EXISTS Atendimento (
    id_atendimento SERIAL PRIMARY KEY,
    data_hora_inicio TIMESTAMP NOT NULL,
    data_hora_fim TIMESTAMP,
    canal_origem VARCHAR(100),
    id_cliente INTEGER NOT NULL,
    id_atendente INTEGER NOT NULL,
    status_atendimento VARCHAR(50),
    nome_cliente VARCHAR(100) NOT NULL,
    telefone_cliente VARCHAR(20)
);

CREATE INDEX IF NOT EXISTS idx_atendimento_cliente ON Atendimento(id_cliente);
CREATE INDEX IF NOT EXISTS idx_atendimento_atendente ON Atendimento(id_atendente);
CREATE INDEX IF NOT EXISTS idx_atendimento_status ON Atendimento(status_atendimento);

CREATE TABLE IF NOT EXISTS Mensagem (
    id_mensagem SERIAL PRIMARY KEY,
    id_atendimento INTEGER NOT NULL,
    conteudo_texto TEXT NOT NULL,
    data_hora_envio TIMESTAMP NOT NULL,
    remetente_tipo VARCHAR(50) NOT NULL,
    tipo_analise VARCHAR(50),
    CONSTRAINT fk_mensagem_atendimento FOREIGN KEY (id_atendimento) 
      REFERENCES Atendimento (id_atendimento) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mensagem_idatendimento ON Mensagem(id_atendimento);
CREATE INDEX IF NOT EXISTS idx_mensagem_datahora ON Mensagem(data_hora_envio);

CREATE TABLE IF NOT EXISTS AnaliseQualidade (
    id_analise SERIAL PRIMARY KEY,
    id_atendimento INTEGER NOT NULL,
    saudacao_inicial VARCHAR(10) NOT NULL,
    uso_nome_cliente VARCHAR(10) NOT NULL,
    rapport_empatia VARCHAR(50) NOT NULL,
    uso_emojis VARCHAR(50) NOT NULL,
    tom_conversa VARCHAR(50) NOT NULL,
    erros_gramaticais VARCHAR(50) NOT NULL,
    resolutividade VARCHAR(50) NOT NULL,
    tempo_resposta VARCHAR(50) NOT NULL,
    indicios_venda VARCHAR(10) NOT NULL,
    sentimento_geral VARCHAR(50) NOT NULL,
    tipo_atendimento VARCHAR(50) NOT NULL,
    pontuacao_geral INTEGER NOT NULL,
    observacoes TEXT,
    data_analise TIMESTAMP NOT NULL,
    CONSTRAINT fk_analise_atendimento FOREIGN KEY (id_atendimento)
      REFERENCES Atendimento (id_atendimento) ON DELETE CASCADE 
);

CREATE INDEX IF NOT EXISTS idx_analise_idatendimento ON AnaliseQualidade(id_atendimento);
CREATE INDEX IF NOT EXISTS idx_analise_dataanalise ON AnaliseQualidade(data_analise);

CREATE TABLE IF NOT EXISTS Relatorio (
    id_relatorio SERIAL PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    data_geracao TIMESTAMP NOT NULL,
    periodo_analise VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_relatorio_data ON Relatorio(data_geracao);

CREATE TABLE IF NOT EXISTS RelatorioAnalise (
    id_relatorio INT NOT NULL,
    id_analise INT NOT NULL,
    CONSTRAINT pk_relatorioanalise PRIMARY KEY (id_relatorio, id_analise),
    CONSTRAINT fk_relatorioanalise_relatorio FOREIGN KEY (id_relatorio) 
      REFERENCES Relatorio (id_relatorio) ON DELETE CASCADE,
    CONSTRAINT fk_relatorioanalise_analise FOREIGN KEY (id_analise)
      REFERENCES AnaliseQualidade (id_analise) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_relatorioanalise_analise ON RelatorioAnalise(id_analise);
`;

async function createTables() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Conectando ao PostgreSQL Railway...');
        await client.connect();
        console.log('Conectado! Criando tabelas...');

        await client.query(sql);

        console.log('✅ Tabelas criadas com sucesso!');

        // Verificar tabelas criadas
        const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name
    `);
        console.log('Tabelas no banco:', result.rows.map(r => r.table_name).join(', '));

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await client.end();
    }
}

createTables();
