
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function analyze() {
    await client.connect();

    console.log('=== SCHEMA ANALYSIS ===');
    const tables = ['atendimento', 'mensagem', 'analisequalidade'];
    for (const t of tables) {
        const cols = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = $1 ORDER BY ordinal_position
        `, [t]);
        console.log(`\n--- ${t.toUpperCase()} ---`);
        console.log(cols.rows.map(r => `  ${r.column_name}: ${r.data_type} (${r.is_nullable})`).join('\n'));
    }

    console.log('\n=== DATA RELATIONSHIPS ===');
    const stats = await client.query(`
        SELECT 
            (SELECT COUNT(*) FROM atendimento) as total_atendimentos,
            (SELECT COUNT(*) FROM mensagem) as total_mensagens,
            (SELECT COUNT(*) FROM analisequalidade) as total_analises,
            (SELECT COUNT(DISTINCT id_atendimento) FROM mensagem) as atendimentos_com_msgs,
            (SELECT COUNT(DISTINCT id_atendimento) FROM analisequalidade) as atendimentos_analisados
    `);
    console.log('Stats:', stats.rows[0]);

    const coverage = await client.query(`
        SELECT 
            a.id_atendimento,
            a.nome_cliente,
            a.status_atendimento,
            COUNT(m.id_mensagem) as qtd_mensagens,
            aq.pontuacao_geral,
            aq.sentimento_geral
        FROM atendimento a
        LEFT JOIN mensagem m ON m.id_atendimento = a.id_atendimento
        LEFT JOIN analisequalidade aq ON aq.id_atendimento = a.id_atendimento
        GROUP BY a.id_atendimento, a.nome_cliente, a.status_atendimento, aq.pontuacao_geral, aq.sentimento_geral
        ORDER BY a.id_atendimento
        LIMIT 20
    `);
    console.log('\n=== SAMPLE COVERAGE (first 20) ===');
    coverage.rows.forEach(r => {
        const name = r.nome_cliente ? r.nome_cliente.substring(0, 20) : 'N/A';
        console.log(`ID:${r.id_atendimento} | ${name} | Msgs:${r.qtd_mensagens} | Score:${r.pontuacao_geral || 'N/A'} | Sent:${r.sentimento_geral || 'N/A'}`);
    });

    console.log('\n=== ANALYSIS DISTRIBUTION ===');
    const dist = await client.query(`
        SELECT 
            sentimento_geral,
            COUNT(*) as count,
            ROUND(AVG(pontuacao_geral)::numeric, 1) as avg_score
        FROM analisequalidade
        WHERE sentimento_geral IS NOT NULL
        GROUP BY sentimento_geral
        ORDER BY count DESC
    `);
    console.log('Sentiment Distribution:', dist.rows);

    console.log('\n=== QUALITY CRITERIA SAMPLE ===');
    const sample = await client.query(`SELECT * FROM analisequalidade LIMIT 1`);
    if (sample.rows[0]) {
        console.log('Criteria fields:', Object.keys(sample.rows[0]).join(', '));
    }

    // Gap analysis
    console.log('\n=== GAP ANALYSIS ===');
    const gaps = await client.query(`
        SELECT 
            COUNT(*) FILTER (WHERE aq.id_analise IS NULL) as sem_analise,
            COUNT(*) FILTER (WHERE aq.id_analise IS NOT NULL) as com_analise
        FROM atendimento a
        LEFT JOIN analisequalidade aq ON aq.id_atendimento = a.id_atendimento
    `);
    console.log('Coverage Gap:', gaps.rows[0]);

    await client.end();
}

analyze().catch(console.error);
