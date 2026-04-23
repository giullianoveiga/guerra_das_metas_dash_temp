'use client';

import React, { useState, useEffect } from 'react';
import { GuerraLayoutWrapper } from '@/components/guerra/GuerraLayoutWrapper';
import { StatsCard } from '@/components/guerra/StatsCard';
import { LeaderboardTable } from '@/components/guerra/LeaderboardTable';
import { TvModeChart } from '@/components/guerra/TvModeChart';
import { useTVMode } from '@/contexts/TVModeContext';
import { cn, formatPercent } from '@/lib/guerra-utils';
import { generateAnnualMockEntries, type LeaderboardEntry } from '@/lib/guerra-data/sectors';

export default function AnnualRankingPage() {
  const { isTVMode } = useTVMode();
  const [annualEntries, setAnnualEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/rankings?type=annual');
        const data = await res.json();
        if (data.entradas) {
          setAnnualEntries(data.entradas);
        }
      } catch (err) {
        console.error('Failed to fetch annual rankings:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const topSector = annualEntries[0];

  return (
    <GuerraLayoutWrapper>
      <div className={cn(
        "grid items-end gap-6",
        isTVMode ? "grid-cols-1 mb-4" : "grid-cols-1 lg:grid-cols-12 mb-12"
      )}>
        <div className="lg:col-span-12">
          <div className={cn("flex flex-col gap-2", isTVMode ? "mb-4" : "mb-6")}>
            <h1 className={cn(
              "font-headline font-black tracking-tighter text-foreground leading-none",
              isTVMode ? "text-4xl" : "text-6xl md:text-8xl"
            )}>
              Ranking <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Anual</span>
            </h1>
            <p className="text-foreground/40 font-label text-xs uppercase tracking-[0.3em]">Sistema Acumulativo: +10 pontos por vitória mensal</p>
          </div>
          
          <div className={cn(
            "grid gap-4",
            isTVMode ? "grid-cols-4 mb-4" : "grid-cols-1 md:grid-cols-4 mb-12"
          )}>
            <StatsCard label="Setor de Elite" value={topSector?.name || "---"} variant="secondary" className={isTVMode ? "p-3" : ""} />
            <StatsCard label="Pontos Acumulados" value={`${topSector?.points || 0} PTS`} className={isTVMode ? "p-3" : ""} />
            <StatsCard label="Vitórias Mensais" value={topSector?.annualWins || 0} className={isTVMode ? "p-3" : ""} />
            <StatsCard label="Eficiência Média" value={formatPercent(topSector?.eff)} variant="primary-container" className={isTVMode ? "p-3" : ""} />
          </div>
        </div>
      </div>

      {/* Modo TV: Mostrar gráfico de barras horizontais */}
      {isTVMode && (
        <TvModeChart 
          entries={annualEntries}
          dataKey="points"
          title="Pontuação Anual"
          subtitle="Top 12 setores por pontos"
          colorByEfficiency={false}
        />
      )}

      {/* Modo normal: Mostrar tabela de ranking */}
      {!isTVMode && (
        <LeaderboardTable 
          title="Quadro de Honra Anual" 
          subtitle="Classificação baseada em vitórias mensais acumuladas"
          entries={annualEntries}
        />
      )}
    </GuerraLayoutWrapper>
  );
}
