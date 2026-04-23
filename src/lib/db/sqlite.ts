import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'guerra_das_metas.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  initSchema();
  return db;
}

function initSchema() {
  const database = db!;
  
  // Tabela de setores
  database.exec(`
    CREATE TABLE IF NOT EXISTS sectors (
      sector_id INTEGER PRIMARY KEY AUTOINCREMENT,
      sector TEXT NOT NULL UNIQUE,
      vitorias_mensais INTEGER DEFAULT 0,
      pontos_anuais INTEGER DEFAULT 0
    )
  `);

  // Tabela de sub-setores
  database.exec(`
    CREATE TABLE IF NOT EXISTS subsectors (
      subsector_id INTEGER PRIMARY KEY AUTOINCREMENT,
      subsector TEXT NOT NULL,
      sector_id INTEGER NOT NULL,
      FOREIGN KEY (sector_id) REFERENCES sectors(sector_id)
    )
  `);

  // Tabela de performance de sub-setores
  database.exec(`
    CREATE TABLE IF NOT EXISTS performance_subsectors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subsector_id INTEGER NOT NULL,
      ref_date TEXT NOT NULL,
      goal_value REAL DEFAULT 0,
      realized_value REAL DEFAULT 0,
      FOREIGN KEY (subsector_id) REFERENCES subsectors(subsector_id)
    )
  `);

  // NOVA TABELA: Indicadores por setor (substitui meta/realizado)
  database.exec(`
    CREATE TABLE IF NOT EXISTS sector_indicators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sector_id INTEGER NOT NULL,
      ref_date TEXT NOT NULL,
      indicators_json TEXT DEFAULT '[]',
      has_atendimento INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sector_id) REFERENCES sectors(sector_id),
      UNIQUE(sector_id, ref_date)
    )
  `);

  // Tabela de usuários
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user TEXT NOT NULL UNIQUE
    )
  `);

  // Tabela de performance de usuários
  database.exec(`
    CREATE TABLE IF NOT EXISTS performance_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      subsector_id INTEGER NOT NULL,
      ref_date TEXT NOT NULL,
      goal_value REAL DEFAULT 0,
      realized_value REAL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(user_id),
      FOREIGN KEY (subsector_id) REFERENCES subsectors(subsector_id)
    )
  `);

  // Criar índices para performance
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_perf_subsector_date ON performance_subsectors(subsector_id, ref_date);
    CREATE INDEX IF NOT EXISTS idx_perf_user_date ON performance_users(user_id, ref_date);
  `);

  // Verificar se já existem setores, se não, inserir default
  const count = database.prepare('SELECT COUNT(*) as count FROM sectors').get() as { count: number };
  if (count.count === 0) {
    insertDefaultSectors(database);
  }
}

function insertDefaultSectors(database: Database.Database) {
  const defaultSectors = [
    'ACOMPANHAMENTO',
    'ACORDOS', 
    'ANALISE',
    'COMERCIAL',
    'CONTROLADORIA',
    'DP_RH',
    'MARKETING',
    'FINANCEIRO',
    'JURIDICO',
    'TECNOLOGIA'
  ];

  const insert = database.prepare('INSERT INTO sectors (sector) VALUES (?)');
  const insertMany = database.transaction((sectors: string[]) => {
    for (const sector of sectors) {
      insert.run(sector);
    }
  });
  
  insertMany(defaultSectors);

  // Criar sub-setores default para cada setor
  const subInsert = database.prepare('INSERT INTO subsectors (subsector, sector_id) VALUES (?, ?)');
  const subInsertMany = database.transaction(() => {
    for (let i = 1; i <= defaultSectors.length; i++) {
      subInsert.run(`Sub-setor ${i}`, i);
    }
  });
  subInsertMany();
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

// Funções auxiliares para manipulação de dados
export function getAllSectors() {
  const database = getDb();
  return database.prepare('SELECT sector_id as id, sector as name FROM sectors ORDER BY sector ASC').all();
}

export function getSectorById(id: number) {
  const database = getDb();
  return database.prepare('SELECT * FROM sectors WHERE sector_id = ?').get(id);
}

export function getSectorByName(name: string) {
  const database = getDb();
  return database.prepare('SELECT * FROM sectors WHERE LOWER(sector) = LOWER(?)').get(name);
}

export function upsertPerformanceSubsector(subsectorId: number, refDate: string, goalValue: number, realizedValue: number) {
  const database = getDb();
  
  // Verifica se já existe registro para esta combinação
  const existing = database.prepare(`
    SELECT id FROM performance_subsectors 
    WHERE subsector_id = ? AND ref_date = ?
  `).get(subsectorId, refDate);

  if (existing) {
    // Atualiza valores (soma para acumulado mensal)
    database.prepare(`
      UPDATE performance_subsectors 
      SET goal_value = goal_value + ?, realized_value = realized_value + ?
      WHERE subsector_id = ? AND ref_date = ?
    `).run(goalValue, realizedValue, subsectorId, refDate);
  } else {
    // Insere novo registro
    database.prepare(`
      INSERT INTO performance_subsectors (subsector_id, ref_date, goal_value, realized_value)
      VALUES (?, ?, ?, ?)
    `).run(subsectorId, refDate, goalValue, realizedValue);
  }
}

export function upsertPerformanceUser(userId: number, subsectorId: number, refDate: string, goalValue: number, realizedValue: number) {
  const database = getDb();
  
  const existing = database.prepare(`
    SELECT id FROM performance_users 
    WHERE user_id = ? AND subsector_id = ? AND ref_date = ?
  `).get(userId, subsectorId, refDate);

  if (existing) {
    database.prepare(`
      UPDATE performance_users 
      SET goal_value = goal_value + ?, realized_value = realized_value + ?
      WHERE user_id = ? AND subsector_id = ? AND ref_date = ?
    `).run(goalValue, realizedValue, userId, subsectorId, refDate);
  } else {
    database.prepare(`
      INSERT INTO performance_users (user_id, subsector_id, ref_date, goal_value, realized_value)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, subsectorId, refDate, goalValue, realizedValue);
  }
}

export function getSubsectorsBySector(sectorId: number) {
  const database = getDb();
  return database.prepare('SELECT * FROM subsectors WHERE sector_id = ?').all(sectorId);
}

export function getPerformanceByMonth(year: number, month: number) {
  const database = getDb();
  const monthStr = month.toString().padStart(2, '0');
  const datePrefix = `${year}-${monthStr}-01`; // Fixed: added day "-01"

  console.log('[sqlite] getPerformanceByMonth:', { year, month, datePrefix });

  // Buscar da nova tabela de indicadores (indicadores.db)
  try {
    // Lazy load para evitar problema de import circular
    const indicatorsDb = require('./indicators-db');
    const indicatorData = indicatorsDb.getAllSectorIndicators(datePrefix);
    
    console.log('[sqlite] indicatorData do novo DB:', indicatorData.length, 'setores');

    if (indicatorData && indicatorData.length > 0) {
      return indicatorData.map((row: any) => ({
        id: row.sectorId,
        name: row.sectorName,
        target: 0,
        realized: 0,
        efficiency: row.average || 0
      }));
    }
  } catch (error) {
    console.error('[sqlite] Erro ao buscar indicadores:', error);
  }

  // Se não tiver indicadores, retorna array vazio
  const sectors = database.prepare(`
    SELECT sector_id as id, sector as name
    FROM sectors
    WHERE sector_id <> 7
    ORDER BY sector ASC
  `).all();

  return sectors.map((s: any) => ({
    id: s.id,
    name: s.name,
    target: 0,
    realized: 0,
    efficiency: 0
  }));
}

export function getAllUsers() {
  const database = getDb();
  return database.prepare('SELECT user_id as id, user as name FROM users ORDER BY user ASC').all();
}

export function upsertUser(name: string) {
  const database = getDb();
  const existing = database.prepare('SELECT user_id FROM users WHERE LOWER(user) = LOWER(?)').get(name);
  
  if (existing) {
    return (existing as { user_id: number }).user_id;
  }
  
  const result = database.prepare('INSERT INTO users (user) VALUES (?)').run(name);
  return result.lastInsertRowid;
}

export function deleteAllPerformanceData() {
  const database = getDb();
  database.exec('DELETE FROM performance_users');
  database.exec('DELETE FROM performance_subsectors');
}

// ========== NOVAS FUNÇÕES PARA INDICADORES ==========

export interface Indicator {
  name: string;
  realized: string;
  efficiency: string;
}

export interface SectorIndicators {
  sectorId: number;
  sectorName: string;
  refDate: string;
  indicators: Indicator[];
  hasAtendimento: boolean;
  atendimento?: {
    note: string;
    efficiency: string;
  };
  average: number;
}

export function getSectorIndicators(sectorId: number, refDate: string): SectorIndicators | null {
  const database = getDb();
  
  const row = database.prepare(`
    SELECT sector_id, indicators_json, has_atendimento
    FROM sector_indicators
    WHERE sector_id = ? AND ref_date = ?
  `).get(sectorId, refDate) as { sector_id: number; indicators_json: string; has_atendimento: number } | undefined;

  if (!row) return null;

  const hasAtendimento = row.has_atendimento === 1;

  // Buscar nome do setor
  const sector = database.prepare('SELECT sector FROM sectors WHERE sector_id = ?').get(sectorId) as { sector: string } | undefined;

  // Calcular média - divide pela quantidade TOTAL de indicadores (não pelos preenchidos)
  const indicatorDataParsed: Indicator[] = JSON.parse(row.indicators_json || '[]');
  const indicatorsComNome = indicatorDataParsed.filter(ind => ind.name && ind.name.trim() !== '');
  const totalIndicadores = hasAtendimento ? indicatorsComNome.length + 1 : indicatorsComNome.length;
  
  const percentuais: number[] = [];
  
  for (const ind of indicatorsComNome) {
    if (ind.efficiency && ind.efficiency.trim() !== '') {
      const val = parseFloat(ind.efficiency.replace('%', '').replace(',', '.'));
      if (!isNaN(val)) percentuais.push(val);
    } else {
      percentuais.push(0);  // Vazio conta como 0
    }
  }

  if (hasAtendimento) {
    // Por agora não tem dados de atendimento salvos
    percentuais.push(0);
  }

  const average = totalIndicadores > 0
    ? percentuais.reduce((a, b) => a + b, 0) / totalIndicadores
    : 0;

  return {
    sectorId: row.sector_id,
    sectorName: sector?.sector || '',
    refDate,
    indicators: indicatorDataParsed,
    hasAtendimento,
    average
  };
}

export function upsertSectorIndicators(
  sectorId: number,
  refDate: string,
  indicators: Indicator[],
  hasAtendimento: boolean
) {
  const database = getDb();
  
  const indicatorsJson = JSON.stringify(indicators);
  const hasAtend = hasAtendimento ? 1 : 0;

  console.log('[SQLite] upsertSectorIndicators:', {
    sectorId,
    refDate,
    indicatorsJson,
    hasAtend,
    indicatorsCount: indicators.length
  });

  // Primeiro verificar se existe
  const existing = database.prepare(`
    SELECT id, indicators_json, has_atendimento FROM sector_indicators WHERE sector_id = ? AND ref_date = ?
  `).get(sectorId, refDate) as { id: number; indicators_json: string; has_atendimento: number } | undefined;

  console.log('[SQLite] Existing record:', existing);

  if (existing) {
    // Atualiza - fazer em 2 passos para evitar problemas de tipos diferentes
    database.prepare(`
      UPDATE sector_indicators 
      SET indicators_json = ?,
          has_atendimento = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE sector_id = ? AND ref_date = ?
    `).run(indicatorsJson, hasAtend, sectorId, refDate);
    
    // Verificar se atualizou
    const verify = database.prepare(`SELECT indicators_json, has_atendimento FROM sector_indicators WHERE sector_id = ? AND ref_date = ?`).get(sectorId, refDate) as { indicators_json: string; has_atendimento: number };
    console.log('[SQLite] Verify after update:', verify);
  } else {
    // Insere
    database.prepare(`
      INSERT INTO sector_indicators (sector_id, ref_date, indicators_json, has_atendimento, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(sectorId, refDate, indicatorsJson, hasAtend);
    
    // Verificar se inseriu
    const verify = database.prepare(`SELECT * FROM sector_indicators WHERE sector_id = ? AND ref_date = ?`).get(sectorId, refDate);
    console.log('[SQLite] Verify after insert:', verify);
  }

  // Log final para confirmar
  const allRecords = database.prepare(`SELECT * FROM sector_indicators`).all();
  console.log('[SQLite] Total de registros na tabela:', allRecords.length);
}

export function getAllSectorIndicators(refDate: string) {
  const database = getDb();
  
  const rows = database.prepare(`
    SELECT si.sector_id, s.sector, si.indicators_json, si.has_atendimento
    FROM sector_indicators si
    JOIN sectors s ON s.sector_id = si.sector_id
    WHERE si.ref_date = ?
    ORDER BY s.sector ASC
  `).all(refDate) as Array<{ sector_id: number; sector: string; indicators_json: string; has_atendimento: number }>;

  const result: SectorIndicators[] = [];

  for (const row of rows) {
    const indicatorData: Indicator[] = JSON.parse(row.indicators_json || '[]');
    const hasAtendimento = row.has_atendimento === 1;

    // Calcular média - divide pela quantidade TOTAL de indicadores (não pelos preenchidos)
    const indicatorsComNome = indicatorData.filter(ind => ind.name && ind.name.trim() !== '');
    const totalIndicadores = hasAtendimento ? indicatorsComNome.length + 1 : indicatorsComNome.length;
    
    const percentuais: number[] = [];
    
    for (const ind of indicatorsComNome) {
      if (ind.efficiency && ind.efficiency.trim() !== '') {
        const val = parseFloat(ind.efficiency.replace('%', '').replace(',', '.'));
        if (!isNaN(val)) percentuais.push(val);
      } else {
        percentuais.push(0);  // Vazio conta como 0
      }
    }

    if (hasAtendimento) {
      percentuais.push(0);  // Atendimento sem dados conta como 0
    }

    const average = totalIndicadores > 0
      ? percentuais.reduce((a, b) => a + b, 0) / totalIndicadores
      : 0;

    result.push({
      sectorId: row.sector_id,
      sectorName: row.sector,
      refDate,
      indicators: indicatorData,
      hasAtendimento,
      average
    });
  }

  return result;
}