// Script para adicionar coluna atendimento_json se não existir
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'guerra_das_metas.db');
console.log('Verificando banco:', DB_PATH);

const db = new Database(DB_PATH);

// Verificar se coluna existe
const tableInfo = db.prepare(`PRAGMA table_info(sector_indicators)`).all();
console.log('Colunas atuais:', tableInfo.map(c => c.name));

const hasAtendimentoJson = tableInfo.some(c => c.name === 'atendimento_json');

if (!hasAtendimentoJson) {
  console.log('Adicionando coluna atendimento_json...');
  db.exec(`ALTER TABLE sector_indicators ADD COLUMN atendimento_json TEXT DEFAULT '{}'`);
  console.log('Coluna adicionada com sucesso!');
} else {
  console.log('Coluna atendimento_json já existe.');
}

db.close();
console.log('Verificação concluída.');