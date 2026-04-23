// Script de migração: indicadores.db -> guerra_das_metas.db
// Execute com: node scripts/migrate-indicators.js

const path = require('path');

// Resolve to node_modules better-sqlite3
let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  // Try from project node_modules
  const projectRoot = path.join(__dirname, '..');
  Database = require(path.join(projectRoot, 'node_modules', 'better-sqlite3'));
}

const SOURCE_DB = path.join(process.cwd(), 'indicadores.db');
const TARGET_DB = path.join(process.cwd(), 'guerra_das_metas.db');

console.log('=== MIGRAÇÃO DE DADOS ===');
console.log('Source:', SOURCE_DB);
console.log('Target:', TARGET_DB);

// Abrir bancos
const sourceDb = new Database(SOURCE_DB, { readonly: true });
const targetDb = new Database(TARGET_DB);

// 1. Verificar dados no source
console.log('\n--- Dados em indicadores.db ---');
const sourceData = sourceDb.prepare(`
  SELECT * FROM sector_indicators
`).all();

console.log('Total registros encontrados:', sourceData.length);

if (sourceData.length > 0) {
  console.log('\nDados detalhados:');
  for (const row of sourceData) {
    console.log(`  Setor ${row.sector_id} | ${row.ref_date} | has_atendimento: ${row.has_atendimento}`);
  }

  // 2. Migrar para target
  console.log('\n--- Migrando para guerra_das_metas.db ---');
  
  const insertStmt = targetDb.prepare(`
    INSERT OR REPLACE INTO sector_indicators (sector_id, ref_date, indicators_json, has_atendimento, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  for (const row of sourceData) {
    insertStmt.run(
      row.sector_id,
      row.ref_date,
      row.indicators_json,
      row.has_atendimento
    );
    console.log(`  ✓ Migrado: setor ${row.sector_id}, ${row.ref_date}`);
  }

  // 3. Verificar no target
  console.log('\n--- Verificação no guerra_das_metas.db ---');
  const targetData = targetDb.prepare(`
    SELECT * FROM sector_indicators
  `).all();
  
  console.log('Total registros no target após migração:', targetData.length);
  
  // Verificar distribuição por data
  const dates = [...new Set(targetData.map(r => r.ref_date))];
  console.log('Períodos:', dates);
} else {
  console.log('\nNenhum dado para migrar - banco source vazio');
}

// Fechar bancos
sourceDb.close();
targetDb.close();

console.log('\n=== MIGRAÇÃO CONCLUÍDA ===');