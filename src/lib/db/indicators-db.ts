import Database from 'better-sqlite3';
import path from 'path';
import { getDb } from './sqlite';

const INDICATORS_DB_PATH = path.join(process.cwd(), 'indicadores.db');

let db: Database.Database | null = null;

export function getIndicatorsDb(): Database.Database {
  if (db) return db;

  db = new Database(INDICATORS_DB_PATH);
  db.pragma('journal_mode = WAL');
  initIndicatorsSchema();
  return db;
}

function initIndicatorsSchema() {
  const database = db!;

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
      UNIQUE(sector_id, ref_date)
    )
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_sector_indicators_date ON sector_indicators(sector_id, ref_date);
  `);

  console.log('[IndicatorsDB] Schema criado com sucesso');
}

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
  atendimento: { note: string; efficiency: string };
  average: number;
}

export function upsertSectorIndicators(
  sectorId: number,
  refDate: string,
  indicators: Indicator[],
  hasAtendimento: boolean,
  atendimento: { note: string; efficiency: string } = { note: '', efficiency: '' }
) {
  const database = getIndicatorsDb();

  const indicatorsJson = JSON.stringify(indicators);
  const atendimentoJson = JSON.stringify(atendimento);
  const hasAtend = hasAtendimento ? 1 : 0;

  console.log('[IndicatorsDB] upsertSectorIndicators:', {
    sectorId,
    refDate,
    indicatorsJson,
    hasAtend,
    indicadoresCount: indicators.length
  });

  const existing = database.prepare(`
    SELECT id FROM sector_indicators WHERE sector_id = ? AND ref_date = ?
  `).get(sectorId, refDate) as { id: number } | undefined;

  if (existing) {
    database.prepare(`
      UPDATE sector_indicators
      SET indicators_json = ?,
          has_atendimento = ?,
          atendimento_json = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE sector_id = ? AND ref_date = ?
    `).run(indicatorsJson, hasAtend, atendimentoJson, sectorId, refDate);

    console.log('[IndicatorsDB] Atualizado com sucesso');
  } else {
    database.prepare(`
      INSERT INTO sector_indicators (sector_id, ref_date, indicators_json, has_atendimento, atendimento_json, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(sectorId, refDate, indicatorsJson, hasAtend, atendimentoJson);

    console.log('[IndicatorsDB] Inserido com sucesso');
  }

  const verify = database.prepare(`
    SELECT * FROM sector_indicators WHERE sector_id = ? AND ref_date = ?
  `).get(sectorId, refDate);

  console.log('[IndicatorsDB] Verify after save:', verify);

  const allRecords = database.prepare(`SELECT COUNT(*) as total FROM sector_indicators`).get() as { total: number };
  console.log('[IndicatorsDB] Total de registros na tabela:', allRecords.total);
}

export function getAllSectorIndicators(refDate: string) {
  const indicatorsDb = getIndicatorsDb();
  const mainDb = getDb();

  // Verificar tables no banco principal
  const tablesCheck = mainDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sectors'").get();
  console.log('[IndicatorsDB] Tabela sectors existe:', !!tablesCheck, 'refDate:', refDate);

  const allSectors = mainDb.prepare('SELECT sector_id, sector FROM sectors ORDER BY sector ASC').all() as Array<{ sector_id: number; sector: string }>;
  console.log('[IndicatorsDB] Setores encontrados:', allSectors.length, allSectors.map(s => s.sector));

  const rows = indicatorsDb.prepare(`
    SELECT si.sector_id, si.indicators_json, si.has_atendimento, si.atendimento_json
    FROM sector_indicators si
    WHERE si.ref_date = ?
  `).all(refDate) as Array<{ sector_id: number; indicators_json: string; has_atendimento: number; atendimento_json: string }>;
  console.log('[IndicatorsDB] Rows de indicadores encontradas:', rows.length, 'refDate:', refDate);

  const indicatorsMap = new Map(rows.map(r => [r.sector_id, r]));

  console.log('[IndicatorsDB] getAllSectorIndicators - sectors found:', allSectors.length, '- indicators rows:', rows.length);

  const result: SectorIndicators[] = [];

  for (const sector of allSectors) {
    const indicatorRow = indicatorsMap.get(sector.sector_id);

    const indicators: Indicator[] = indicatorRow
      ? JSON.parse(indicatorRow.indicators_json || '[]')
      : [];

    const atendimento: { note: string; efficiency: string } = indicatorRow
      ? JSON.parse(indicatorRow.atendimento_json || '{"note":"","efficiency":""}')
      : { note: '', efficiency: '' };

    const hasAtend = indicatorRow ? indicatorRow.has_atendimento === 1 : false;
    
    // Calcular média incluindo atendimento se hasAtendimento=true (mesma lógica do frontend)
    const validIndicators = indicators.filter(ind => ind.name.trim() !== '');
    const indicatorCount = hasAtend ? validIndicators.length + 1 : validIndicators.length;
    
    let avg = 0;
    if (indicatorCount > 0) {
      const sum = validIndicators.reduce((acc, ind) => acc + parseFloat(ind.efficiency || '0'), 0);
      const total = hasAtend ? sum + parseFloat(atendimento.efficiency || '0') : sum;
      avg = total / indicatorCount;
    }

    console.log('[IndicatorsDB] Processando setor:', sector.sector, 'sectorId:', sector.sector_id, 'indicators:', validIndicators.length, 'hasAtend:', hasAtend, 'avg:', avg);

    result.push({
      sectorId: sector.sector_id,
      sectorName: sector.sector,
      refDate,
      indicators,
      hasAtendimento: hasAtend,
      atendimento,
      average: Math.round(avg * 100) / 100,
    });
  }

  console.log('[IndicatorsDB] getAllSectorIndicators - result count:', result.length);
  console.log('[IndicatorsDB] Result[0]:', result[0] ? { sectorId: result[0].sectorId, sectorName: result[0].sectorName, avg: result[0].average } : 'vazio');
  return result;
}

export function closeIndicatorsDb() {
  if (db) {
    db.close();
    db = null;
  }
}