
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const DB_CONFIG = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
};

const CSV_DIR = 'D:\\elite_finder\\dados db';

async function start() {
    const client = new Client(DB_CONFIG);
    try {
        await client.connect();

        console.log('--- Debugging AnaliseQualidade ---');

        // 1. Check Schema Column Types
        const cols = await client.query(`
            SELECT column_name, data_type, character_maximum_length, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'analisequalidade';
        `);
        console.log('Schema:', cols.rows);

        // 2. Read One Record
        const filePath = path.join(CSV_DIR, 'analisequalidade.csv');
        const content = fs.readFileSync(filePath, 'utf-8');
        const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });

        const rec = records[0];
        console.log('First Record from CSV:', rec);

        // 3. Try Insert
        const keys = Object.keys(rec);
        const insertCols = [...keys, 'id_tenant'];
        const values = keys.map(k => rec[k] === 'NULL' ? null : rec[k]);
        values.push(1); // id_tenant

        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        const query = `
            INSERT INTO analisequalidade (${insertCols.join(', ')}) 
            VALUES (${placeholders})
            RETURNING *;
        `;

        console.log('Executing Insert...');
        const res = await client.query(query, values);
        console.log('Success!', res.rows[0]);

    } catch (err) {
        console.error('Debug Error:', err);
    } finally {
        await client.end();
    }
}

start();
