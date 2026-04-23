'use client';

import React, { useState, useEffect } from 'react';
import { GuerraLayoutWrapper } from '@/components/guerra/GuerraLayoutWrapper';
import { StatsCard } from '@/components/guerra/StatsCard';
import { LeaderboardTable } from '@/components/guerra/LeaderboardTable';
import { TvModeChart } from '@/components/guerra/TvModeChart';
import { useTVMode } from '@/contexts/TVModeContext';
import { cn, formatPercent } from '@/lib/guerra-utils';
import { generateMockEntries, type LeaderboardEntry } from '@/lib/guerra-data/sectors';

export default function MonthlyRankingPage() {
  const { isTVMode } = useTVMode();
  const [monthlyEntries, setMonthlyEntries] = useState<LeaderboardEntry[]>([]);
  const [highlight, setHighlight] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/rankings?type=monthly');
        const data = await res.json();
        console.log('[Monthly] Data received:', data.entradas?.length, 'entries');
        if (data.entradas) {
          setMonthlyEntries(data.entradas);
          setHighlight(data.destaqueSetorElite);
        }
      } catch (err) {
        console.error('Failed to fetch monthly rankings:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <GuerraLayoutWrapper>
      <div className={cn(
        "flex flex-col md:flex-row justify-between items-end gap-6",
        isTVMode ? "mb-4" : "mb-12"
      )}>
        <div>
          <h1 className={cn(
            "font-headline font-black tracking-tighter text-foreground leading-none",
            isTVMode ? "text-4xl" : "text-6xl md:text-8xl"
          )}>
            Ranking <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Mensal</span>
          </h1>
        </div>
      </div>

      <div className={cn(
        "grid gap-4",
        isTVMode ? "grid-cols-2 mb-4" : "grid-cols-1 md:grid-cols-2 mb-12"
      )}>
        <StatsCard label="Setor de Elite" value={highlight?.nome || "---"} variant="secondary" className={isTVMode ? "p-3" : ""} />
        <StatsCard label="Eficiência Média" value={highlight ? formatPercent(highlight.eficiencia) : "---"} className={isTVMode ? "p-3" : ""} />
      </div>

      {/* Modo TV: Mostrar gráfico de barras horizontais */}
      {isTVMode && (
        <TvModeChart 
          entries={monthlyEntries}
          dataKey="eff"
          title="Eficiência Mensal"
          subtitle="Top 12 setores por eficiência"
          colorByEfficiency={true}
        />
      )}

      {/* Modo normal: Mostrar tabela de ranking */}
      {!isTVMode && (
        <LeaderboardTable 
          title="Classificação de Operativos" 
          subtitle="Classificado pelo desempenho mensal"
          entries={monthlyEntries}
          hidePoints={true}
          hidePenalties={true}
        />
      )}
    </GuerraLayoutWrapper>
  );
}
