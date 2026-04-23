import * as sqlite from './sqlite';
import * as indicatorsDb from './indicators-db';
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
  return months[monthIndex];
}

export class DbService {
  static async getMonthlyRanking(year: number, month: number): Promise<RankingData> {
    const rows = sqlite.getPerformanceByMonth(year, month);
    
    const entries: LeaderboardEntry[] = rows.map((row: any) => {
      // Usa o campo efficiency calculado da tabela de indicadores
      const eff = row.efficiency || 0;
      const points = (eff * 1.2);
      
      return {
        id: row.id,
        rank: 0,
        name: row.name,
        target: 0,  // Não usa mais
        realized: 0,  // Não usa mais
        eff: eff,
        points: points,
        penalties: 0,
        status: (eff > 105 ? ['rocket', 'verified'] : eff > 100 ? ['verified'] : []) as ('verified' | 'rocket')[],
        monthlyWins: 0,
        annualWins: 0
      };
    }).sort((a, b) => b.points - a.points);

    entries.forEach((e, i) => { e.rank = i + 1; });

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
  }

  static async getAnnualRanking(year: number): Promise<RankingData> {
    const months: number[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Se for o ano atual, pega meses passados; se for ano passado, pega todos os 12 meses
    const maxMonth = currentYear === year ? now.getMonth() + 1 : 12;
    for (let m = 1; m <= maxMonth; m++) {
      months.push(m);
    }

    // Ranking anual é baseado em VITÓRIAS mensais (wins * 10 pontos)
    // A eficiência anual é a média das eficiências mensais
    const monthlyWinners: Record<number, number> = {};
    const sectorStats: Record<number, { id: number, name: string, efficiencies: number[], totalRealized: number }> = {};

    for (const m of months) {
      const monthly = await this.getMonthlyRanking(year, m);
      if (monthly.entradas.length > 0) {
        monthlyWinners[m] = monthly.entradas[0].id;
      }
      
      monthly.entradas.forEach(e => {
        const id = e.id;
        if (!sectorStats[id]) {
          sectorStats[id] = { id: id, name: e.name, efficiencies: [], totalRealized: 0 };
        }
        sectorStats[id].efficiencies.push(e.eff);
        sectorStats[id].totalRealized += e.realized;
      });
    }

    const annualEntries: LeaderboardEntry[] = Object.keys(sectorStats).map(key => {
      const id = Number(key);
      let wins = 0;
      Object.values(monthlyWinners).forEach(winnerId => {
        if (winnerId === id) wins += 1;
      });

      const stats = sectorStats[id];
      const avgEff = stats.efficiencies.length > 0 
        ? stats.efficiencies.reduce((a, b) => a + b, 0) / stats.efficiencies.length 
        : 0;

      return {
        id: stats.id,
        rank: 0,
        name: stats.name,
        target: 0,  // Ranking anual não usa target (baseado em vitórias)
        realized: stats.totalRealized,  // Soma do realizado de todos os meses
        eff: avgEff,
        points: wins * 10,  // Pontos = número de vitórias * 10
        penalties: 0,
        status: (wins > 0 ? ['verified'] : []) as ('verified' | 'rocket')[],
        monthlyWins: 0,
        annualWins: wins
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
        metaAlvo: 0,  // Ranking anual não usa meta
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
      sectorRow = sqlite.getSectorById(numericId);
    } else {
      sectorRow = sqlite.getSectorByName(sectorId);
    }
    
    if (!sectorRow) return null;

    const subsectors = sqlite.getSubsectorsBySector(sectorRow.sector_id);

    // Por enquanto, retorna dados vazios para colaboradores
    // Pode ser expandido para buscar performance_users
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

  // Métodos para manipulação de dados (usados na página de configurações)
  static async getAllSectors() {
    return sqlite.getAllSectors();
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
    sqlite.upsertPerformanceSubsector(subsectorId, refDate, goalValue, realizedValue);
  }

  static async getSubsectorsBySector(sectorId: number) {
    return sqlite.getSubsectorsBySector(sectorId);
  }

  static async deleteAllData() {
    sqlite.deleteAllPerformanceData();
  }

  // ========== NOVOS MÉTODOS PARA INDICADORES ==========
  static async saveSectorIndicators(
    sectorId: number,
    year: number,
    month: number,
    indicators: indicatorsDb.Indicator[],
    hasAtendimento: boolean
  ) {
    const refDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    console.log('[DbService] saveSectorIndicators chamando novo DB...');
    indicatorsDb.upsertSectorIndicators(sectorId, refDate, indicators, hasAtendimento);
  }

  static async getAllSectorIndicators(year: number, month: number) {
    const refDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    console.log('[DbService] getAllSectorIndicators do novo DB...');
    return indicatorsDb.getAllSectorIndicators(refDate);
  }
}