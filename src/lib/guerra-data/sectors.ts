import { 
  Shield, 
  Briefcase, 
  Users, 
  Megaphone, 
  Landmark, 
  Scale, 
  Terminal, 
  Clock, 
  FileSearch,
  Rocket,
  CheckCircle2
} from 'lucide-react';

export interface LeaderboardEntry {
  id: number;
  rank: number;
  name: string;
  target: number;
  realized: number;
  eff: number;
  points: number;
  penalties: number;
  icon?: any;
  avatar?: string;
  status?: ('verified' | 'rocket')[];
  monthlyWins?: number;
  annualWins?: number;
}

export const SECTOR_CONFIGS = [
  { name: 'ACOMPANHAMENTO', icon: Clock },
  { name: 'ACORDOS', icon: Briefcase },
  { name: 'ANALISE', icon: FileSearch },
  { name: 'COMERCIAL', icon: Rocket },
  { name: 'CONTROLADORIA', icon: Shield },
  { name: 'MARKETING', icon: Megaphone },
  { name: 'FINANCEIRO', icon: Landmark },
  { name: 'JURIDICO', icon: Scale },
  { name: 'PENDENCIA', icon: Landmark },
  { name: 'REVISAR', icon: CheckCircle2 },
];

export interface Sector {
  id: string;
  name: string;
  logo: string;
  icon: any;
}

export const sectors: Sector[] = SECTOR_CONFIGS.map(config => ({
  id: config.name.toLowerCase(),
  name: config.name,
  logo: `/_${config.name}.png`,
  icon: config.icon
}));

export function generateMockEntries(baseTarget: number): LeaderboardEntry[] {
  return SECTOR_CONFIGS.map((config, index) => {
    const realized = Math.floor(baseTarget * (0.85 + Math.random() * 0.3));
    const eff = (realized / baseTarget) * 100;
    const points = Math.floor(eff * 1.2);
    
    return {
      id: index + 1,
      rank: 0,
      name: config.name,
      target: baseTarget,
      realized,
      eff,
      points,
      penalties: Math.random() > 0.8 ? Math.floor(Math.random() * 5) : 0,
      icon: config.icon,
      status: (eff > 105 ? ['rocket', 'verified'] : eff > 100 ? ['verified'] : []) as ('verified' | 'rocket')[],
      monthlyWins: Math.random() > 0.7 ? 1 : 0,
      annualWins: 0 
    };
  }).sort((a, b) => b.points - a.points)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function generateAnnualMockEntries(): LeaderboardEntry[] {
  // Simulating 3 months already passed (Jan, Feb, Mar)
  const monthsPassed = 3;
  
  return SECTOR_CONFIGS.map((config, index) => {
    // Each month a sector has a chance to win. 
    // Simulating wins over the passed months.
    const monthlyWinsCount = Math.floor(Math.random() * (monthsPassed + 1)); 
    const points = monthlyWinsCount * 10;
    
    // Annual Calculation Rules:
    // Meta: Sum of targets of passed months.
    // Realized: Sum of realized values of passed months.
    // Efficiency: Average of monthly efficiencies.
    
    let totalTarget = 0;
    let totalRealized = 0;
    let efficienciesSum = 0;
    
    for(let i = 0; i < monthsPassed; i++) {
      const monthTarget = 400; // base monthly target
      const monthRealized = Math.floor(monthTarget * (0.8 + Math.random() * 0.4));
      const monthEff = (monthRealized / monthTarget) * 100;
      
      totalTarget += monthTarget;
      totalRealized += monthRealized;
      efficienciesSum += monthEff;
    }
    
    const avgEff = efficienciesSum / monthsPassed;

    return {
      id: index + 1,
      rank: 0,
      name: config.name,
      target: totalTarget,
      realized: totalRealized,
      eff: avgEff,
      points,
      penalties: 0,
      icon: config.icon,
      status: (points > 0 ? ['verified'] : []) as ('verified' | 'rocket')[],
      monthlyWins: 0,
      annualWins: monthlyWinsCount
    };
  }).sort((a, b) => b.points - a.points || b.eff - a.eff) // Points first, then efficiency as tie-breaker
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}
