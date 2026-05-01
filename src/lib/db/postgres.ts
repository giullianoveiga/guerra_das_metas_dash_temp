import pkg from 'pg';
const { Pool } = pkg;

function getEnv(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

const pool = new Pool({
  host: getEnv('PG_HOST', 'localhost'),
  port: parseInt(getEnv('PG_PORT', '5432')),
  user: getEnv('PG_USER', 'postgres'),
  password: getEnv('PG_PASSWORD', ''),
  database: getEnv('PG_DB', 'guerra_das_metas'),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 1000,
});

console.log('[PG] Conectando ao PostgreSQL:', getEnv('PG_HOST', 'localhost'), '/', getEnv('PG_DB', 'guerra_das_metas'));

export async function getPgClient() {
  const client = await pool.connect();
  return client;
}

export async function closePgClient() {
  await pool.end();
}

export async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as now');
    client.release();
    console.log('[PG] Conexão OK:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('[PG] Erro ao conectar:', error);
    return false;
  }
}

export default pool;