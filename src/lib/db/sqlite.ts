import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'guerra_das_metas.db');

console.log('[DB] Path do banco:', DB_PATH);
console.log('[DB] Banco existe:', fs.existsSync(DB_PATH));

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  
  console.log('[DB] Criando conexão...');
  
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

  // Inserir novos setores se não existirem
  const newSectors = ['PENDENCIA', 'REVISAR'];
  const insertNew = database.prepare('INSERT OR IGNORE INTO sectors (sector) VALUES (?)');
  for (const sector of newSectors) {
    insertNew.run(sector);
  }

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
      atendimento_json TEXT DEFAULT '{}',
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

  // Tabela de pontuação mensal por setor (armazena Vitória de cada mês)
  database.exec(`
    CREATE TABLE IF NOT EXISTS sector_monthly_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sector_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      rank_position INTEGER DEFAULT 0,
      efficiency REAL DEFAULT 0,
      points_earned INTEGER DEFAULT 0,
      bonus_details TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(sector_id, year, month)
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
    'MARKETING',
    'FINANCEIRO',
    'JURIDICO',
    'PENDENCIA',
    'REVISAR'
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

// Salvar pontuação mensal de um setor (chamado após calcular ranking mensal)
export function saveMonthlyScore(sectorId: number, year: number, month: number, rankPosition: number, efficiency: number, pointsEarned: number, bonusDetails: string[] = []) {
  const database = getDb();
  const bonusJson = JSON.stringify(bonusDetails);
  
  // INSERT OR REPLACE para atualizar se já existir
  database.prepare(`
    INSERT INTO sector_monthly_scores (sector_id, year, month, rank_position, efficiency, points_earned, bonus_details)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(sector_id, year, month) DO UPDATE SET
      rank_position = excluded.rank_position,
      efficiency = excluded.efficiency,
      points_earned = excluded.points_earned,
      bonus_details = excluded.bonus_details
  `).run(sectorId, year, month, rankPosition, efficiency, pointsEarned, bonusJson);
  
  console.log('[DB] saveMonthlyScore:', { sectorId, year, month, rankPosition, efficiency, pointsEarned, bonusDetails });
}

// Buscar scores de um setor por ano
export function getSectorScoresByYear(sectorId: number, year: number) {
  const database = getDb();
  return database.prepare(`
    SELECT year, month, rank_position, efficiency, points_earned
    FROM sector_monthly_scores
    WHERE sector_id = ? AND year = ?
    ORDER BY month ASC
  `).all(sectorId, year);
}

// Buscar todos os scores de um ano (para ranking anual)
export function getAllScoresByYear(year: number) {
  const database = getDb();
  return database.prepare(`
    SELECT sms.*, s.sector as sector_name
    FROM sector_monthly_scores sms
    JOIN sectors s ON s.sector_id = sms.sector_id
    WHERE sms.year = ?
    ORDER BY sms.sector_id, sms.month
  `).all(year);
}

// Buscar scores de um mês específico (para calcular crescimento)
export function getAllScoresByYearForMonth(year: number, month: number) {
  const database = getDb();
  return database.prepare(`
    SELECT sector_id, efficiency
    FROM sector_monthly_scores
    WHERE year = ? AND month = ?
  `).all(year, month);
}

// Buscar todos os scores de um mês e ano específicos
export function getAllScoresByYearAndMonth(year: number, month: number) {
  const database = getDb();
  return database.prepare(`
    SELECT sector_id, efficiency, points_earned, rank_position
    FROM sector_monthly_scores
    WHERE year = ? AND month = ?
  `).all(year, month);
}

// Get total de pontos anuais de um setor
export function getTotalAnnualPoints(sectorId: number, year: number) {
  const database = getDb();
  const result = database.prepare(`
    SELECT SUM(points_earned) as total_points, COUNT(*) as months_count
    FROM sector_monthly_scores
    WHERE sector_id = ? AND year = ?
  `).get(sectorId, year) as { total_points: number; months_count: number };
  
  return result || { total_points: 0, months_count: 0 };
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

  console.log('[sqlite] getPerformanceByMonth:', { year, month });

  const refDate = `${year}-${month.toString().padStart(2, '0')}-01`;

  // PRIORIDADE: Buscar eficiência em tempo real da tabela sector_indicators
  try {
    const indicatorsData = database.prepare(`
      SELECT 
        si.sector_id,
        s.sector,
        si.indicators_json,
        si.has_atendimento,
        si.atendimento_json
      FROM sector_indicators si
      JOIN sectors s ON s.sector_id = si.sector_id
      WHERE si.ref_date = ?
      ORDER BY s.sector ASC
    `).all(refDate) as Array<{
      sector_id: number;
      sector: string;
      indicators_json: string;
      has_atendimento: number;
      atendimento_json: string;
    }>;

    console.log('[sqlite] Indicadores encontrados:', indicatorsData.length, 'para', refDate);

    if (indicatorsData && indicatorsData.length > 0) {
      // Calcular eficiência média para cada setor
      const result = indicatorsData.map((row: any) => {
        const indicators: Indicator[] = JSON.parse(row.indicators_json || '[]');
        const hasAtendimento = row.has_atendimento === 1;
        const atendimento = row.atendimento_json ? JSON.parse(row.atendimento_json) : { note: '', efficiency: '' };
        
        // Calcular média
        const validIndicators = indicators.filter((ind: Indicator) => ind.name && ind.name.trim() !== '');
        const totalIndicadores = hasAtendimento ? validIndicators.length + 1 : validIndicators.length;
        
        const percentuais: number[] = [];
        
        for (const ind of validIndicators) {
          if (ind.efficiency && ind.efficiency.trim() !== '') {
            const val = parseFloat(ind.efficiency.replace('%', '').replace(',', '.'));
            if (!isNaN(val)) percentuais.push(val);
          } else {
            percentuais.push(0);
          }
        }

        // Incluir atendimento se existir
        if (hasAtendimento && atendimento.efficiency && atendimento.efficiency.trim() !== '') {
          const atEff = parseFloat(atendimento.efficiency.replace('%', '').replace(',', '.'));
          if (!isNaN(atEff)) percentuais.push(atEff);
        } else if (hasAtendimento) {
          percentuais.push(0); // Atendimento vazio conta como 0
        }

        const average = totalIndicadores > 0
          ? percentuais.reduce((a, b) => a + b, 0) / totalIndicadores
          : 0;

        return {
          id: row.sector_id,
          name: row.sector,
          target: 0,
          realized: 0,
          efficiency: Math.round(average * 100) / 100
        };
      });

      console.log('[sqlite] Retornando dados de indicadores (tempo real):', result.length, 'setores');
      return result;
    }
  } catch (error) {
    console.error('[sqlite] Erro ao buscar indicadores:', error);
  }

  // FALLBACK: Buscar da tabela de scores (dados já processados anteriormente)
  try {
    const scoresData = database.prepare(`
      SELECT 
        s.sector_id,
        s.sector,
        sms.efficiency,
        sms.points_earned,
        sms.rank_position
      FROM sector_monthly_scores sms
      JOIN sectors s ON s.sector_id = sms.sector_id
      WHERE sms.year = ? AND sms.month = ?
      ORDER BY sms.rank_position ASC
    `).all(year, month);

    console.log('[sqlite] Scores encontrados (fallback):', scoresData.length, 'para', year, month);

    if (scoresData && scoresData.length > 0) {
      return scoresData.map((row: any) => ({
        id: row.sector_id,
        name: row.sector,
        target: 0,
        realized: 0,
        efficiency: row.efficiency || 0
      }));
    }
  } catch (error) {
    console.error('[sqlite] Erro ao buscar scores:', error);
  }

  console.log('[sqlite] Sem dados para', year, month);
  return [];
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
    SELECT sector_id, indicators_json, has_atendimento, atendimento_json
    FROM sector_indicators
    WHERE sector_id = ? AND ref_date = ?
  `).get(sectorId, refDate) as { sector_id: number; indicators_json: string; has_atendimento: number; atendimento_json: string } | undefined;

  if (!row) return null;

  const hasAtendimento = row.has_atendimento === 1;
  
  // Ler dados de atendimento
  const atendimento: { note: string; efficiency: string } = row.atendimento_json 
    ? JSON.parse(row.atendimento_json) 
    : { note: '', efficiency: '' };

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

  // Incluir eficiência do atendimento se existir
  if (hasAtendimento && atendimento.efficiency && atendimento.efficiency.trim() !== '') {
    const atEff = parseFloat(atendimento.efficiency.replace('%', '').replace(',', '.'));
    if (!isNaN(atEff)) percentuais.push(atEff);
  } else if (hasAtendimento) {
    percentuais.push(0);  // Atendimento vazio conta como 0
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
    atendimento,
    average
  };
}

export function upsertSectorIndicators(
  sectorId: number,
  refDate: string,
  indicators: Indicator[],
  hasAtendimento: boolean,
  atendimento: { note: string; efficiency: string } = { note: '', efficiency: '' }
) {
  const database = getDb();
  
  const indicatorsJson = JSON.stringify(indicators);
  const atendimentoJson = JSON.stringify(atendimento);
  const hasAtend = hasAtendimento ? 1 : 0;
  
  // Calcular eficiência média do setor
  const validIndicators = indicators.filter(ind => ind.name.trim() !== '');
  let avgEff = 0;
  
  if (validIndicators.length > 0) {
    const sum = validIndicators.reduce((acc, ind) => {
      const val = parseFloat(String(ind.efficiency).replace('%', '').replace(',', '.')) || 0;
      return acc + val;
    }, 0);
    avgEff = sum / validIndicators.length;
    
    // Incluir atendimento se existir
    if (hasAtendimento && atendimento?.efficiency) {
      const atEff = parseFloat(String(atendimento.efficiency).replace('%', '').replace(',', '.')) || 0;
      avgEff = (sum + atEff) / (validIndicators.length + 1);
    }
  } else if (hasAtendimento && atendimento?.efficiency) {
    // Só tem atendimento
    avgEff = parseFloat(String(atendimento.efficiency).replace('%', '').replace(',', '.')) || 0;
  }
  
  console.log('[SQLite] upsertSectorIndicators:', {
    sectorId,
    refDate,
    indicatorsJson,
    hasAtend,
    atendimentoJson,
    indicatorsCount: indicators.length,
    average: avgEff.toFixed(2)
  });

  // Primeiro verificar se existe
  const existing = database.prepare(`
    SELECT id, indicators_json, has_atendimento FROM sector_indicators WHERE sector_id = ? AND ref_date = ?
  `).get(sectorId, refDate) as { id: number; indicators_json: string; has_atendimento: number } | undefined;

  console.log('[SQLite] Existing record:', existing);

  if (existing) {
    // Atualiza
    database.prepare(`
      UPDATE sector_indicators 
      SET indicators_json = ?,
          has_atendimento = ?,
          atendimento_json = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE sector_id = ? AND ref_date = ?
    `).run(indicatorsJson, hasAtend, atendimentoJson, sectorId, refDate);
    
    // Verificar se atualizou
    const verify = database.prepare(`SELECT indicators_json, has_atendimento, atendimento_json FROM sector_indicators WHERE sector_id = ? AND ref_date = ?`).get(sectorId, refDate) as { indicators_json: string; has_atendimento: number; atendimento_json: string };
    console.log('[SQLite] Verify after update:', verify);
  } else {
    // Insere
    database.prepare(`
      INSERT INTO sector_indicators (sector_id, ref_date, indicators_json, has_atendimento, atendimento_json, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(sectorId, refDate, indicatorsJson, hasAtend, atendimentoJson);
    
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
    SELECT si.sector_id, s.sector, si.indicators_json, si.has_atendimento, si.atendimento_json
    FROM sector_indicators si
    JOIN sectors s ON s.sector_id = si.sector_id
    WHERE si.ref_date = ?
    ORDER BY s.sector ASC
  `).all(refDate) as Array<{ sector_id: number; sector: string; indicators_json: string; has_atendimento: number; atendimento_json: string }>;

  const result: SectorIndicators[] = [];

  for (const row of rows) {
    const indicatorData: Indicator[] = JSON.parse(row.indicators_json || '[]');
    const hasAtendimento = row.has_atendimento === 1;
    
    // Ler dados de atendimento
    const atendimento: { note: string; efficiency: string } = row.atendimento_json 
      ? JSON.parse(row.atendimento_json) 
      : { note: '', efficiency: '' };

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

    // Incluir eficiência do atendimento se existir
    if (hasAtendimento && atendimento.efficiency && atendimento.efficiency.trim() !== '') {
      const atEff = parseFloat(atendimento.efficiency.replace('%', '').replace(',', '.'));
      if (!isNaN(atEff)) percentuais.push(atEff);
    } else if (hasAtendimento) {
      percentuais.push(0);  // Atendimento vazio conta como 0
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
      atendimento,
      average
    });
  }

  return result;
}