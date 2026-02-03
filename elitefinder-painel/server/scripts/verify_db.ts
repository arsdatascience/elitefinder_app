
import { Client } from 'pg';

const DB_CONFIG = {
    connectionString: 'postgresql://postgres:JhpeglsObxrAECaOrajyWHATyhZkAOhI@interchange.proxy.rlwy.net:47458/railway',
    ssl: { rejectUnauthorized: false }
};

async function checkTable(client, tableName) {
    try {
        console.log(`\n--- Checking table: ${tableName} ---`);

        // Count
        const countRes = await client.query(`SELECT COUNT(*) FROM ${tableName}`);
        console.log(`Row count: ${countRes.rows[0].count}`);

        // Check id_tenant
        try {
            const tenantRes = await client.query(`SELECT id_tenant FROM ${tableName} LIMIT 1`);
            if (tenantRes.rows.length > 0) {
                console.log(`Sample id_tenant: ${tenantRes.rows[0].id_tenant}`);
            } else {
                console.log('Table is empty, cannot check id_tenant value samples.');
            }
        } catch (e) {
            console.log('Could not select id_tenant (column might be missing or error).', e.message);
        }

        // Sample Data
        const sampleRes = await client.query(`SELECT * FROM ${tableName} LIMIT 3`);
        console.log('Sample Rows:', sampleRes.rows);

    } catch (err) {
        console.log(`Error checking ${tableName}:`, err.message);
    }
}

async function start() {
    const client = new Client(DB_CONFIG);
    try {
        console.log('Connecting to DB...');
        await client.connect();

        await checkTable(client, 'atendimento');
        await checkTable(client, 'analisequalidade');
        await checkTable(client, 'mensagem');

        // Check if relatorio tables exist
        await checkTable(client, 'relatorio');

    } catch (err) {
        console.error('Verification Error:', err);
    } finally {
        await client.end();
    }
}

start();
