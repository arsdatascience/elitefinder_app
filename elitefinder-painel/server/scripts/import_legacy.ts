
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const DB_CONFIG = {
    connectionString: 'postgresql://postgres:JhpeglsObxrAECaOrajyWHATyhZkAOhI@interchange.proxy.rlwy.net:47458/railway',
    ssl: { rejectUnauthorized: false }
};

const CSV_DIR = 'D:\\elite_finder\\dados db';

async function migrateSchema(client) {
    console.log('--- Migrating Schema ---');

    const tables = ['atendimento', 'mensagem', 'analisequalidade', 'relatorio', 'relatorioanalise'];

    // 1. Add id_tenant to all tables
    for (const table of tables) {
        try {
            const check = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = $1 AND column_name = 'id_tenant';
            `, [table]);

            if (check.rowCount === 0) {
                console.log(`Adding id_tenant to ${table}...`);
                await client.query(`ALTER TABLE ${table} ADD COLUMN id_tenant INTEGER DEFAULT 1;`);
                await client.query(`CREATE INDEX IF NOT EXISTS idx_${table}_tenant ON ${table}(id_tenant);`);
            }
        } catch (err) {
            console.error(`Error adding id_tenant to ${table}:`, err.message);
        }
    }

    // 2. Alter id_cliente and id_atendente in Atendimento
    try {
        const typeCheck = await client.query(`
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'atendimento' AND column_name = 'id_cliente';
        `);

        if (typeCheck.rows.length > 0 && typeCheck.rows[0].data_type === 'integer') {
            console.log('Altering id_cliente and id_atendente to VARCHAR...');
            await client.query(`ALTER TABLE atendimento ALTER COLUMN id_cliente TYPE VARCHAR(50);`);
            await client.query(`ALTER TABLE atendimento ALTER COLUMN id_atendente TYPE VARCHAR(50);`);
        }
    } catch (err) {
        console.error('Error altering Atendimento columns:', err.message);
    }

    // 3. Add missing columns to AnaliseQualidade
    const extraCols = [
        { name: 'canal_origem_conversa', type: 'TEXT' },
        { name: 'produto_interesse', type: 'TEXT' }
    ];

    for (const col of extraCols) {
        try {
            const check = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'analisequalidade' AND column_name = $1;
            `, [col.name]);

            if (check.rowCount === 0) {
                console.log(`Adding ${col.name} to analisequalidade...`);
                await client.query(`ALTER TABLE analisequalidade ADD COLUMN ${col.name} ${col.type};`);
            }
        } catch (err) {
            console.error(`Error adding ${col.name}:`, err.message);
        }
    }

    // 4. ALTER AnaliseQualidade columns to TEXT and DROP NOT NULL
    console.log('Fixing AnaliseQualidade schema (TEXT + DROP NOT NULL)...');
    const colsToFix = [
        'saudacao_inicial', 'uso_nome_cliente', 'indicios_venda',
        'rapport_empatia', 'uso_emojis', 'tom_conversa', 'erros_gramaticais',
        'resolutividade', 'tempo_resposta', 'sentimento_geral', 'tipo_atendimento'
    ];

    for (const col of colsToFix) {
        try {
            await client.query(`ALTER TABLE analisequalidade ALTER COLUMN ${col} TYPE TEXT;`);
            await client.query(`ALTER TABLE analisequalidade ALTER COLUMN ${col} DROP NOT NULL;`);
        } catch (e) {
            console.log(`Could not fix ${col}:`, e.message);
        }
    }

    // Also make pontuacao_geral nullable
    try {
        await client.query(`ALTER TABLE analisequalidade ALTER COLUMN pontuacao_geral DROP NOT NULL;`);
    } catch (e) {
        console.log(`Could not drop NOT NULL from pontuacao_geral:`, e.message);
    }
}

async function insertBatch(client, tableName, cols, rows) {
    if (rows.length === 0) return;

    const params = [];
    const valueClauses = [];
    let paramCounter = 1;

    for (const row of rows) {
        const rowPlaceholders = [];
        for (const val of row) {
            rowPlaceholders.push(`$${paramCounter++}`);
            params.push(val);
        }
        valueClauses.push(`(${rowPlaceholders.join(', ')})`);
    }

    const query = `
        INSERT INTO ${tableName} (${cols.join(', ')}) 
        VALUES ${valueClauses.join(', ')}
        ON CONFLICT DO NOTHING
    `;

    try {
        await client.query(query, params);
    } catch (err) {
        console.error(`Batch insert failed for ${tableName}:`, err.message);
    }
}

async function importTable(client, tableName, fileName) {
    const filePath = path.join(CSV_DIR, fileName);
    if (!fs.existsSync(filePath)) {
        console.log(`Skipping ${tableName}: File ${fileName} not found.`);
        return;
    }

    console.log(`Importing ${tableName} from ${fileName}...`);
    const content = fs.readFileSync(filePath, 'utf-8');
    const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true
    });

    console.log(`Found ${records.length} records.`);

    let insertedCount = 0;
    const BATCH_SIZE = 500;
    let batchValues = [];

    if (records.length === 0) return;

    const firstRec = records[0];
    const cols = Object.keys(firstRec);
    const insertCols = [...cols, 'id_tenant'];

    for (const record of records) {
        const values = cols.map(c => {
            let val = record[c];
            if (val === 'NULL' || val === '') return null;
            return val;
        });
        values.push(1); // id_tenant

        batchValues.push(values);

        if (batchValues.length >= BATCH_SIZE) {
            await insertBatch(client, tableName, insertCols, batchValues);
            insertedCount += batchValues.length;
            batchValues = [];
            process.stdout.write('.');
        }
    }

    if (batchValues.length > 0) {
        await insertBatch(client, tableName, insertCols, batchValues);
        insertedCount += batchValues.length;
    }
    console.log(`\nImported ${insertedCount} records into ${tableName}.`);

    // Update sequence
    try {
        const seqName = `${tableName}_id_${tableName}_seq`;
        await client.query(`SELECT setval('${seqName}', (SELECT COALESCE(MAX(id_${tableName}), 1) FROM ${tableName}));`);
        console.log(`Updated sequence for ${tableName}.`);
    } catch (err) {
        console.log(`Could not update sequence for ${tableName}:`, err.message);
    }
}

async function start() {
    const client = new Client(DB_CONFIG);
    try {
        await client.connect();
        console.log('Connected to PostgreSQL.');

        await migrateSchema(client);

        await importTable(client, 'atendimento', 'atendimento.csv');
        await importTable(client, 'mensagem', 'mensagem.csv');
        await importTable(client, 'analisequalidade', 'analisequalidade.csv');

        console.log('\n=== IMPORT COMPLETE ===');

    } catch (err) {
        console.error('Script Error:', err);
    } finally {
        await client.end();
    }
}

start();
