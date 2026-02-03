const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function clearTables() {
    try {
        await client.connect();
        console.log('Conectado ao PostgreSQL...');

        console.log('Limpando tabelas de atendimento e mensagens (e dependências)...');

        // Usar CASCADE para garantir que tabelas dependentes (analisequalidade, alerta, etc) também sejam limpas
        await client.query(`TRUNCATE TABLE atendimento, mensagem, analisequalidade, alerta RESTART IDENTITY CASCADE;`);

        console.log('✅ Tabelas limpas com sucesso!');

        const counts = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM atendimento) as atendimentos,
                (SELECT COUNT(*) FROM mensagem) as mensagens,
                (SELECT COUNT(*) FROM analisequalidade) as analises,
                (SELECT COUNT(*) FROM alerta) as alertas
        `);
        console.log('Contagens atuais:', counts.rows[0]);

    } catch (err) {
        console.error('Erro ao limpar tabelas:', err.message);
    } finally {
        await client.end();
    }
}

clearTables();
