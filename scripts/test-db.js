// Teste de conexao com banco
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'guerra_das_metas.db');

console.log('=== TESTE DE CONEXAO COM BANCO ===');
console.log('DB Path:', DB_PATH);

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Teste 1: Setores
console.log('\n--- Setores ---');
const sectors = db.prepare('SELECT sector_id, sector FROM sectors ORDER BY sector_id').all();
console.log('Total setores:', sectors.length);
sectors.forEach(s => console.log(`  ${s.sector_id}: ${s.sector}`));

// Teste 2: Indicadores
console.log('\n--- Indicadores (2026-04) ---');
const indicators = db.prepare(`
  SELECT si.sector_id, s.sector, si.indicators_json, si.has_atendimento
  FROM sector_indicators si
  JOIN sectors s ON s.sector_id = si.sector_id
  WHERE si.ref_date = '2026-04-01'
`).all();
console.log('Total registros:', indicators.length);
indicators.forEach(ind => {
  const count = JSON.parse(ind.indicators_json || '[]').length;
  console.log(`  Setor ${ind.sector_id} (${ind.sector}): ${count} indicadores, atendimento: ${ind.has_atendimento}`);
});

// Teste 3: Monthly Scores
console.log('\n--- Monthly Scores ---');
const scores = db.prepare('SELECT COUNT(*) as total FROM sector_monthly_scores').get();
console.log('Total registros de scores:', scores.total);

db.close();
console.log('\n=== TESTE CONCLUIDO ===');