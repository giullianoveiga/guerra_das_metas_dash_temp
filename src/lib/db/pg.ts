import pool from './postgres';

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

async function queryClient(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

export function getDb() {
  return pool;
}

export async function getAllSectors() {
  return queryClient('SELECT sector_id as id, sector as name FROM sectors ORDER BY sector ASC');
}

export async function getSectorById(id: number) {
  return queryClient('SELECT * FROM sectors WHERE sector_id = $1', [id]);
}

export async function getSectorByName(name: string) {
  return queryClient('SELECT * FROM sectors WHERE LOWER(sector) = LOWER($1)', [name]);
}

export async function saveMonthlyScore(sectorId: number, year: number, month: number, rankPosition: number, efficiency: number, pointsEarned: number, bonusDetails: string[] = []) {
  const bonusJson = JSON.stringify(bonusDetails);
  
  await queryClient(
    `INSERT INTO sector_monthly_scores (sector_id, year, month, rank_position, efficiency, points_earned, bonus_details)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (sector_id, year, month) DO UPDATE SET
       rank_position = $4, efficiency = $5, points_earned = $6, bonus_details = $7`,
    [sectorId, year, month, rankPosition, efficiency, pointsEarned, bonusJson]
  );
  
  console.log('[PG] saveMonthlyScore:', { sectorId, year, month, rankPosition, efficiency, pointsEarned, bonusDetails });
}

export async function getSectorScoresByYear(sectorId: number, year: number) {
  const result = await queryClient(
    `SELECT year, month, rank_position, efficiency, points_earned
     FROM sector_monthly_scores
     WHERE sector_id = $1 AND year = $2
     ORDER BY month ASC`,
    [sectorId, year]
  );
  return result.rows;
}

export async function getAllScoresByYear(year: number) {
  const result = await queryClient(
    `SELECT sms.*, s.sector as sector_name
     FROM sector_monthly_scores sms
     JOIN sectors s ON s.sector_id = sms.sector_id
     WHERE sms.year = $1
     ORDER BY sms.sector_id, sms.month`,
    [year]
  );
  return result.rows;
}

export async function getAllScoresByYearForMonth(year: number, month: number) {
  const result = await queryClient(
    `SELECT sector_id, efficiency
     FROM sector_monthly_scores
     WHERE year = $1 AND month = $2`,
    [year, month]
  );
  return result.rows;
}

export async function getAllScoresByYearAndMonth(year: number, month: number) {
  const result = await queryClient(
    `SELECT sector_id, efficiency, points_earned, rank_position
     FROM sector_monthly_scores
     WHERE year = $1 AND month = $2`,
    [year, month]
  );
  return result.rows;
}

export async function getTotalAnnualPoints(sectorId: number, year: number) {
  const result = await queryClient(
    `SELECT SUM(points_earned) as total_points, COUNT(*) as months_count
     FROM sector_monthly_scores
     WHERE sector_id = $1 AND year = $2`,
    [sectorId, year]
  );
  return result.rows[0] || { total_points: 0, months_count: 0 };
}

export async function upsertPerformanceSubsector(subsectorId: number, refDate: string, goalValue: number, realizedValue: number) {
  const existing = await queryClient(
    `SELECT id FROM performance_subsectors 
     WHERE subsector_id = $1 AND ref_date = $2`,
    [subsectorId, refDate]
  );

  if (existing.rows.length > 0) {
    await queryClient(
      `UPDATE performance_subsectors 
       SET goal_value = goal_value + $1, realized_value = realized_value + $2
       WHERE subsector_id = $3 AND ref_date = $4`,
      [goalValue, realizedValue, subsectorId, refDate]
    );
  } else {
    await queryClient(
      `INSERT INTO performance_subsectors (subsector_id, ref_date, goal_value, realized_value)
       VALUES ($1, $2, $3, $4)`,
      [subsectorId, refDate, goalValue, realizedValue]
    );
  }
}

export async function upsertPerformanceUser(userId: number, subsectorId: number, refDate: string, goalValue: number, realizedValue: number) {
  const existing = await queryClient(
    `SELECT id FROM performance_users 
     WHERE user_id = $1 AND subsector_id = $2 AND ref_date = $3`,
    [userId, subsectorId, refDate]
  );

  if (existing.rows.length > 0) {
    await queryClient(
      `UPDATE performance_users 
       SET goal_value = goal_value + $1, realized_value = realized_value + $2
       WHERE user_id = $3 AND subsector_id = $4 AND ref_date = $5`,
      [goalValue, realizedValue, userId, subsectorId, refDate]
    );
  } else {
    await queryClient(
      `INSERT INTO performance_users (user_id, subsector_id, ref_date, goal_value, realized_value)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, subsectorId, refDate, goalValue, realizedValue]
    );
  }
}

export async function getSubsectorsBySector(sectorId: number) {
  const result = await queryClient('SELECT * FROM subsectors WHERE sector_id = $1', [sectorId]);
  return result.rows;
}

export async function getPerformanceByMonth(year: number, month: number) {
  try {
    const refDate = `${year}-${month.toString().padStart(2, '0')}-01`;

    const indicatorsData = await queryClient(
      `SELECT 
        si.sector_id,
        s.sector,
        si.indicators_json,
        si.has_atendimento,
        si.atendimento_json
      FROM sector_indicators si
      JOIN sectors s ON s.sector_id = si.sector_id
      WHERE si.ref_date = $1
      ORDER BY s.sector ASC`,
      [refDate]
    );

    if (indicatorsData.rows && indicatorsData.rows.length > 0) {
      const result = indicatorsData.rows.map((row: any) => {
        const indicators: Indicator[] = JSON.parse(row.indicators_json || '[]');
        const hasAtendimento = row.has_atendimento === 1;
        const atendimento = row.atendimento_json ? JSON.parse(row.atendimento_json) : { note: '', efficiency: '' };
        
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

        if (hasAtendimento && atendimento.efficiency && atendimento.efficiency.trim() !== '') {
          const atEff = parseFloat(atendimento.efficiency.replace('%', '').replace(',', '.'));
          if (!isNaN(atEff)) percentuais.push(atEff);
        } else if (hasAtendimento) {
          percentuais.push(0);
        }

        const average = totalIndicadores > 0
          ? percentuais.reduce((a: number, b: number) => a + b, 0) / totalIndicadores
          : 0;

        return {
          id: row.sector_id,
          name: row.sector,
          target: 0,
          realized: 0,
          efficiency: Math.round(average * 100) / 100
        };
      });

      return result;
    }

    const scoresData = await queryClient(
      `SELECT 
        s.sector_id,
        s.sector,
        sms.efficiency,
        sms.points_earned,
        sms.rank_position
      FROM sector_monthly_scores sms
      JOIN sectors s ON s.sector_id = sms.sector_id
      WHERE sms.year = $1 AND sms.month = $2
      ORDER BY sms.rank_position ASC`,
      [year, month]
    );

    if (scoresData.rows && scoresData.rows.length > 0) {
      return scoresData.rows.map((row: any) => ({
        id: row.sector_id,
        name: row.sector,
        target: 0,
        realized: 0,
        efficiency: row.efficiency || 0
      }));
    }

    return [];
  } catch (error) {
    console.error('[PG] Erro em getPerformanceByMonth:', error);
    return [];
  }
}

export async function getAllUsers() {
  const result = await queryClient('SELECT user_id as id, user_name as name FROM users ORDER BY user_name ASC');
  return result.rows;
}

export async function upsertUser(name: string) {
  const existing = await queryClient('SELECT user_id FROM users WHERE LOWER(user_name) = LOWER($1)', [name]);
  
  if (existing.rows.length > 0) {
    return existing.rows[0].user_id;
  }
  
  const result = await queryClient('INSERT INTO users (user_name) VALUES ($1) RETURNING user_id', [name]);
  return result.rows[0].user_id;
}

export async function deleteAllPerformanceData() {
  await queryClient('DELETE FROM performance_users');
  await queryClient('DELETE FROM performance_subsectors');
}

export async function getSectorIndicators(sectorId: number, refDate: string): Promise<SectorIndicators | null> {
  const row = await queryClient(
    `SELECT sector_id, indicators_json, has_atendimento, atendimento_json
     FROM sector_indicators
     WHERE sector_id = $1 AND ref_date = $2`,
    [sectorId, refDate]
  );

  if (!row.rows[0]) return null;

  const r = row.rows[0];
  const hasAtendimento = r.has_atendimento === 1;
  
  const atendimento: { note: string; efficiency: string } = r.atendimento_json 
    ? JSON.parse(r.atendimento_json) 
    : { note: '', efficiency: '' };

  const sector = await queryClient('SELECT sector FROM sectors WHERE sector_id = $1', [sectorId]);

  const indicatorDataParsed: Indicator[] = JSON.parse(r.indicators_json || '[]');
  const indicatorsComNome = indicatorDataParsed.filter((ind: Indicator) => ind.name && ind.name.trim() !== '');
  const totalIndicadores = hasAtendimento ? indicatorsComNome.length + 1 : indicatorsComNome.length;
  
  const percentuais: number[] = [];
  
  for (const ind of indicatorsComNome) {
    if (ind.efficiency && ind.efficiency.trim() !== '') {
      const val = parseFloat(ind.efficiency.replace('%', '').replace(',', '.'));
      if (!isNaN(val)) percentuais.push(val);
    } else {
      percentuais.push(0);
    }
  }

  if (hasAtendimento && atendimento.efficiency && atendimento.efficiency.trim() !== '') {
    const atEff = parseFloat(atendimento.efficiency.replace('%', '').replace(',', '.'));
    if (!isNaN(atEff)) percentuais.push(atEff);
  } else if (hasAtendimento) {
    percentuais.push(0);
  }

  const average = totalIndicadores > 0
    ? percentuais.reduce((a: number, b: number) => a + b, 0) / totalIndicadores
    : 0;

  return {
    sectorId: r.sector_id,
    sectorName: sector.rows[0]?.sector || '',
    refDate,
    indicators: indicatorDataParsed,
    hasAtendimento,
    atendimento,
    average
  };
}

export async function upsertSectorIndicators(
  sectorId: number,
  refDate: string,
  indicators: Indicator[],
  hasAtendimento: boolean,
  atendimento: { note: string; efficiency: string } = { note: '', efficiency: '' }
) {
  const indicatorsJson = JSON.stringify(indicators);
  const atendimentoJson = JSON.stringify(atendimento);
  const hasAtend = hasAtendimento ? 1 : 0;
  
  console.log('[PG] upsertSectorIndicators:', {
    sectorId,
    refDate,
    indicatorsJson,
    hasAtend,
    atendimentoJson,
  });

  const existing = await queryClient(
    `SELECT id, indicators_json, has_atendimento FROM sector_indicators WHERE sector_id = $1 AND ref_date = $2`,
    [sectorId, refDate]
  );

  if (existing.rows.length > 0) {
    await queryClient(
      `UPDATE sector_indicators 
       SET indicators_json = $1,
           has_atendimento = $2,
           atendimento_json = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE sector_id = $4 AND ref_date = $5`,
      [indicatorsJson, hasAtend, atendimentoJson, sectorId, refDate]
    );
  } else {
    await queryClient(
      `INSERT INTO sector_indicators (sector_id, ref_date, indicators_json, has_atendimento, atendimento_json, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [sectorId, refDate, indicatorsJson, hasAtend, atendimentoJson]
    );
  }
}

export async function getAllSectorIndicators(refDate: string) {
  const rows = await queryClient(
    `SELECT si.sector_id, s.sector, si.indicators_json, si.has_atendimento, si.atendimento_json
     FROM sector_indicators si
     JOIN sectors s ON s.sector_id = si.sector_id
     WHERE si.ref_date = $1
     ORDER BY s.sector ASC`,
    [refDate]
  );

  const result: SectorIndicators[] = [];

  for (const row of rows.rows) {
    const indicatorData: Indicator[] = JSON.parse(row.indicators_json || '[]');
    const hasAtendimento = row.has_atendimento === 1;
    
    const atendimento: { note: string; efficiency: string } = row.atendimento_json 
      ? JSON.parse(row.atendimento_json) 
      : { note: '', efficiency: '' };

    const indicatorsComNome = indicatorData.filter((ind: Indicator) => ind.name && ind.name.trim() !== '');
    const totalIndicadores = hasAtendimento ? indicatorsComNome.length + 1 : indicatorsComNome.length;
    
    const percentuais: number[] = [];
    
    for (const ind of indicatorsComNome) {
      if (ind.efficiency && ind.efficiency.trim() !== '') {
        const val = parseFloat(ind.efficiency.replace('%', '').replace(',', '.'));
        if (!isNaN(val)) percentuais.push(val);
      } else {
        percentuais.push(0);
      }
    }

    if (hasAtendimento && atendimento.efficiency && atendimento.efficiency.trim() !== '') {
      const atEff = parseFloat(atendimento.efficiency.replace('%', '').replace(',', '.'));
      if (!isNaN(atEff)) percentuais.push(atEff);
    } else if (hasAtendimento) {
      percentuais.push(0);
    }

    const average = totalIndicadores > 0
      ? percentuais.reduce((a: number, b: number) => a + b, 0) / totalIndicadores
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

export default pool;