import * as pg from './pg';
import { getPerformanceByMonth, saveMonthlyScore, getAllScoresByYearForMonth, getAllScoresByYear, upsertSectorIndicators as pgUpsertIndicators, getAllSectorIndicators as pgGetAllIndicators, type Indicator } from './pg';
import { LeaderboardEntry } from '../guerra-data/sectors';

export interface RankingData {
  id: string;
  tipo: 'mensal' | 'anual';
  ano: number;
  periodoRotulo: string;
  entradas: LeaderboardEntry[];
  destaqueSetorElite: {
    nome: string;
    eficiencia: number;
    metaAlvo: number;
    realized: number;
  } | null;
}

export interface ChampionData {
  mensal: {
    setorId: string;
    nome: string;
    eficiencia: number;
    pontos: number;
  } | null;
  anual: {
    setorId: string;
    nome: string;
    eficiencia: number;
    pontos: number;
  } | null;
}

function getMonthName(monthIndex: number) {
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const index = monthIndex - 1;
  return months[index] || months[0];
}

const META_MINIMA_THRESHOLD = 80;
const META_BASE_THRESHOLD = 100;

async function saveMonthlyScores(entries: LeaderboardEntry[], year: number, month: number, previousMonthEffs: Map<number, number>) {
  console.log('[DB] Atualizando dados para', year, month);
  
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    const sectorId = entry.id;
    const previousEff = previousMonthEffs.get(sectorId) || null;
    const rankPosition = index + 1;
    const eff = entry.eff;
    
    if (eff < META_MINIMA_THRESHOLD) {
      await saveMonthlyScore(sectorId, year, month, rankPosition, eff, 0, ['Zona Crítica']);
      continue;
    }
    
    if (eff <= META_BASE_THRESHOLD) {
      await saveMonthlyScore(sectorId, year, month, rankPosition, eff, 0, ['Abaixo da Meta']);
      continue;
    }
    
    let pontosBase = 0;
    if (rankPosition === 1) pontosBase = 10;
    else if (rankPosition === 2) pontosBase = 8;
    else if (rankPosition === 3) pontosBase = 6;
    
    let pontosBonus = 0;
    const motivos: string[] = [];
    
    if (previousEff !== null && eff > previousEff) {
      pontosBonus += 5;
      motivos.push('Crescimento (+5)');
    }
    
    if (rankPosition === 1) {
      pontosBonus += 5;
      motivos.push('Liderança (+5)');
    }
    
    if (eff >= 130) {
      pontosBonus += 5;
      motivos.push('Acima 130% (+5)');
    }
    
    const pontosFinais = pontosBase + pontosBonus;
    
    console.log(`[Pontos] ${entry.name}: base=${pontosBase}, bonus=${pontosBonus} (${motivos.join(', ')}), total=${pontosFinais}`);
    
    await saveMonthlyScore(sectorId, year, month, rankPosition, eff, pontosFinais, motivos);
  }
    
  console.log('[DB] saveMonthlyScores done for', year, month, 'with', entries.length, 'entries');
}

export class DbService {
  static async getMonthlyRanking(year: number, month: number): Promise<RankingData> {
    try {
      console.log('[Monthly] Iniciando getMonthlyRanking para', year, month);
      const rows = await getPerformanceByMonth(year, month);
      console.log('[Monthly] getPerformanceByMonth retornou', rows?.length || 0, 'rows');
      
      if (!rows || rows.length === 0) {
        console.log('[Monthly] Sem dados para', year, month);
        return {
          id: `mensal_${year}_m${month}`,
          tipo: 'mensal',
          ano: year,
          periodoRotulo: `${getMonthName(month - 1)} ${year}`,
          entradas: [],
          destaqueSetorElite: null
        };
      }
      
      const entries: LeaderboardEntry[] = rows.map((row: any) => {
        const eff = row.efficiency || 0;
        const points = eff > 100 ? Math.round(eff * 1.2) : 0;
        
        return {
          id: row.id,
          rank: 0,
          name: row.name,
          target: 0,
          realized: 0,
          eff: eff,
          points: points,
          penalties: 0,
          status: (eff > 105 ? ['rocket', 'verified'] : eff > 100 ? ['verified'] : []) as ('verified' | 'rocket')[],
          monthlyWins: 0,
          annualWins: 0
        };
      }).sort((a, b) => b.eff - a.eff);

      entries.forEach((e, i) => { e.rank = i + 1; });
    
      console.log('[Monthly] Entries:', entries.map(e => `${e.rank}. ${e.name}: eff=${e.eff}`));

      const previousMonthEffs = new Map<number, number>();
      try {
        if (month > 1) {
          const prevScores = await getAllScoresByYearForMonth(year, month - 1);
          for (const row of prevScores as any[]) {
            previousMonthEffs.set(row.sector_id, row.efficiency);
          }
        } else if (year > 1) {
          const prevScores = await getAllScoresByYearForMonth(year - 1, 12);
          for (const row of prevScores as any[]) {
            previousMonthEffs.set(row.sector_id, row.efficiency);
          }
        }
      } catch (err) {
        console.error('[Monthly] Erro ao buscar mês anterior:', err);
      }
  
      try {
        await saveMonthlyScores(entries, year, month, previousMonthEffs);
      } catch (err) {
        console.error('[Monthly] Erro ao salvar scores:', err);
      }

      const top = entries[0] || null;
  
      return {
        id: `mensal_${year}_m${month}`,
        tipo: 'mensal',
        ano: year,
        periodoRotulo: `${getMonthName(month - 1)} ${year}`,
        entradas: entries,
        destaqueSetorElite: top ? {
          nome: top.name,
          eficiencia: top.eff,
          metaAlvo: 0,
          realized: 0
        } : null
      };
    } catch (error) {
      console.error('[Monthly] Erro geral em getMonthlyRanking:', error);
      throw error;
    }
  }

  static async getAnnualRanking(year: number): Promise<RankingData> {
    const allScores = await getAllScoresByYear(year);
    
    const sectorTotals: Record<number, { id: number, name: string, totalPoints: number, efficiencies: number[], wins: number }> = {};
    
    for (const row of allScores as any[]) {
      const id = row.sector_id;
      if (!sectorTotals[id]) {
        sectorTotals[id] = { 
          id, 
          name: row.sector_name, 
          totalPoints: 0, 
          efficiencies: [], 
          wins: 0 
        };
      }
      
      sectorTotals[id].totalPoints += row.points_earned;
      sectorTotals[id].efficiencies.push(row.efficiency);
      if (row.rank_position === 1) {
        sectorTotals[id].wins += 1;
      }
    }
    
    const annualEntries: LeaderboardEntry[] = Object.values(sectorTotals).map(stats => {
      const avgEff = stats.efficiencies.length > 0
        ? stats.efficiencies.reduce((a, b) => a + b, 0) / stats.efficiencies.length
        : 0;
        
      return {
        id: stats.id,
        rank: 0,
        name: stats.name,
        target: 0,
        realized: stats.totalPoints,
        eff: avgEff,
        points: stats.totalPoints,
        penalties: 0,
        status: (stats.wins > 0 ? ['verified'] : []) as ('verified' | 'rocket')[],
        monthlyWins: 0,
        annualWins: stats.wins
      };
    }).sort((a, b) => (b.points - a.points) || (b.eff - a.eff));

    annualEntries.forEach((e, i) => { e.rank = i + 1; });

    const top = annualEntries[0] || null;

    return {
      id: `anual_${year}`,
      tipo: 'anual',
      ano: year,
      periodoRotulo: `Ano ${year}`,
      entradas: annualEntries,
      destaqueSetorElite: top ? {
        nome: top.name,
        eficiencia: top.eff,
        metaAlvo: 0,
        realized: top.realized
      } : null
    };
  }

  static async getChampions(): Promise<ChampionData> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    let lastMonth = currentMonth - 1;
    let lastMonthYear = currentYear;
    if (lastMonth === 0) {
      lastMonth = 12;
      lastMonthYear -= 1;
    }

    const monthly = await this.getMonthlyRanking(lastMonthYear, lastMonth);
    const annual = await this.getAnnualRanking(currentYear);

    const mWinner = monthly.entradas[0];
    const aWinner = annual.entradas[0];

    return {
      mensal: mWinner ? {
        setorId: String(mWinner.id),
        nome: mWinner.name,
        eficiencia: mWinner.eff,
        pontos: mWinner.points
      } : null,
      anual: aWinner ? {
        setorId: String(aWinner.id),
        nome: aWinner.name,
        eficiencia: aWinner.eff,
        pontos: aWinner.points
      } : null
    };
  }

  static async getSectorDetails(sectorId: string) {
    const numericId = parseInt(sectorId);
    let sectorRow: any;
    
    if (!isNaN(numericId)) {
      const result = await pg.getSectorById(numericId);
      sectorRow = result.rows[0];
    } else {
      const result = await pg.getSectorByName(sectorId);
      sectorRow = result.rows[0];
    }
    
    if (!sectorRow) return null;

    const collaborators: any[] = [];

    return {
      sector: {
        id: sectorRow.sector_id,
        name: sectorRow.sector,
        vitoriasMensais: sectorRow.vitorias_mensais,
        pontosAnuais: sectorRow.pontos_anuais
      },
      collaborators: collaborators
    };
  }

  static async getAllSectors() {
    const result = await pg.getAllSectors();
    return result.rows;
  }

  static async upsertPerformanceData(
    sectorId: number, 
    subsectorId: number, 
    year: number, 
    month: number, 
    goalValue: number, 
    realizedValue: number
  ) {
    const refDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    await pg.upsertPerformanceSubsector(subsectorId, refDate, goalValue, realizedValue);
  }

  static async getSubsectorsBySector(sectorId: number) {
    return await pg.getSubsectorsBySector(sectorId);
  }

  static async deleteAllData() {
    await pg.deleteAllPerformanceData();
  }

  static async saveSectorIndicators(
    sectorId: number,
    year: number,
    month: number,
    indicators: Indicator[],
    hasAtendimento: boolean
  ) {
    const refDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    console.log('[DbService] saveSectorIndicators via pg.ts...');
    await pgUpsertIndicators(sectorId, refDate, indicators, hasAtendimento);
  }

  static async getAllSectorIndicators(year: number, month: number) {
    const refDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    console.log('[DbService] getAllSectorIndicators via pg.ts...');
    return await pgGetAllIndicators(refDate);
  }
}