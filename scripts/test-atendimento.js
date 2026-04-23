// Teste: Salvar e ler atendimento
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'guerra_das_metas.db');
const db = new Database(DB_PATH);

console.log('=== TESTE ATENDIMENTO ===');

// Simular salvamento via upsertSectorIndicators
const testSectorId = 1;
const testRefDate = '2026-04-01';

// Verificar se atendimento_json existe e tem dados
const row = db.prepare(`
  SELECT sector_id, indicators_json, has_atendimento, atendimento_json
  FROM sector_indicators
  WHERE sector_id = ? AND ref_date = ?
`).get(testSectorId, testRefDate);

console.log('Dados atuais:', row);

if (row) {
  const atendimento = row.atendimento_json ? JSON.parse(row.atendimento_json) : null;
  console.log('Atendimento parsed:', atendimento);
  console.log('Has atendimento:', row.has_atendimento === 1);
  
  const indicators = JSON.parse(row.indicators_json || '[]');
  console.log('Indicadores count:', indicators.length);
  
  // Calcular média
  const validIndicators = indicators.filter(ind => ind.name && ind.name.trim() !== '');
  console.log('Valid indicators:', validIndicators.length);
  
  let totalIndicadores = validIndicators.length;
  if (row.has_atendimento === 1) totalIndicadores += 1;
  
  console.log('Total para média:', totalIndicadores);
  
  // Testar salvamento de novo atendimento
  const newAtendimento = { note: 'Teste 4,5', efficiency: '95,50' };
  const newAtendimentoJson = JSON.stringify(newAtendimento);
  
  db.prepare(`
    UPDATE sector_indicators 
    SET atendimento_json = ?
    WHERE sector_id = ? AND ref_date = ?
  `).run(newAtendimentoJson, testSectorId, testRefDate);
  
  console.log('Atualizado! Verificando...');
  
  const verify = db.prepare(`
    SELECT atendimento_json FROM sector_indicators
    WHERE sector_id = ? AND ref_date = ?
  `).get(testSectorId, testRefDate);
  
  console.log('Verify atendimento_json:', verify.atendimento_json);
}

db.close();
console.log('=== TESTE CONCLUÍDO ===');