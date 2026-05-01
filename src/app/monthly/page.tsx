'use client';

import React, { useState, useEffect } from 'react';
import { GuerraLayoutWrapper } from '@/components/guerra/GuerraLayoutWrapper';
import { StatsCard } from '@/components/guerra/StatsCard';
import { LeaderboardTable } from '@/components/guerra/LeaderboardTable';
import { TvModeChart } from '@/components/guerra/TvModeChart';
import { useTVMode } from '@/contexts/TVModeContext';
import { cn, formatPercent } from '@/lib/guerra-utils';
import { type LeaderboardEntry } from '@/lib/guerra-data/sectors';
import { CalendarDays, ChevronDown } from 'lucide-react';

const MONTHS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

export default function MonthlyRankingPage() {
  const { isTVMode } = useTVMode();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [monthlyEntries, setMonthlyEntries] = useState<LeaderboardEntry[]>([]);
  const [highlight, setHighlight] = useState<any>(null);
  const [periodLabel, setPeriodLabel] = useState(`${MONTHS[currentMonth - 1].label} ${currentYear}`);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const selectedPeriodLabel = `${MONTHS[month - 1].label} ${year}`;

    async function fetchData() {
      try {
        setLoading(true);
        setMonthlyEntries([]);
        setHighlight(null);
        setPeriodLabel(selectedPeriodLabel);
        const params = new URLSearchParams({
          type: 'monthly',
          year: String(year),
          month: String(month),
        });
        const res = await fetch(`/api/rankings?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        
        if (data.error) {
          console.error('[Monthly] API error:', data.error);
        }
        
        console.log('[Monthly] Data received:', data.entradas?.length, 'entries', data.entradas);
        setMonthlyEntries(data.entradas || []);
        setHighlight(data.destaqueSetorElite || null);
        setPeriodLabel(data.periodoRotulo || selectedPeriodLabel);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Failed to fetch monthly rankings:', err);
        setMonthlyEntries([]);
        setHighlight(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }
    fetchData();

    return () => controller.abort();
  }, [year, month]);

  return (
    <GuerraLayoutWrapper>
      <div className={cn(
        "flex flex-col md:flex-row justify-between items-start md:items-end gap-6",
        isTVMode ? "mb-4" : "mb-12"
      )}>
        <div>
          <h1 className={cn(
            "font-headline font-black tracking-tighter text-foreground leading-none",
            isTVMode ? "text-4xl" : "text-6xl md:text-8xl"
          )}>
            Ranking <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Mensal</span>
          </h1>
          <p className="mt-3 text-foreground/40 font-label text-xs uppercase tracking-[0.3em]">
            {periodLabel}
          </p>
        </div>

        {!isTVMode && (
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-2 block text-[10px] font-label uppercase tracking-widest text-foreground/60">
                Mês
              </label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                <select
                  value={month}
                  onChange={(event) => setMonth(Number(event.target.value))}
                  className="h-11 min-w-[170px] appearance-none rounded-lg border border-white/10 bg-background py-2 pl-10 pr-8 font-label text-xs uppercase tracking-widest text-foreground outline-none transition-colors focus:border-primary"
                  disabled={loading}
                >
                  {MONTHS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-label uppercase tracking-widest text-foreground/60">
                Ano
              </label>
              <select
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="h-11 rounded-lg border border-white/10 bg-background px-4 py-2 font-label text-xs uppercase tracking-widest text-foreground outline-none transition-colors focus:border-primary"
                disabled={loading}
              >
                {[currentYear - 1, currentYear, currentYear + 1].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className={cn(
        "grid gap-4",
        isTVMode ? "grid-cols-2 mb-4" : "grid-cols-1 md:grid-cols-2 mb-12"
      )}>
        <StatsCard label="Setor de Elite" value={loading ? "..." : highlight?.nome || "---"} variant="secondary" className={isTVMode ? "p-3" : ""} />
        <StatsCard label="Eficiência Média" value={loading ? "..." : highlight ? formatPercent(highlight.eficiencia) : "---"} className={isTVMode ? "p-3" : ""} />
      </div>

      {/* Modo TV: Mostrar gráfico de barras horizontais */}
      {isTVMode && (
        <TvModeChart 
          entries={monthlyEntries}
          dataKey="eff"
          title="Eficiência Mensal"
          subtitle={`Top 12 setores por eficiência - ${periodLabel}`}
          colorByEfficiency={true}
        />
      )}

      {/* Modo normal: Mostrar tabela de ranking */}
      {!isTVMode && (
        <LeaderboardTable 
          title="Classificação de Operativos" 
          subtitle={`Classificado pelo desempenho mensal - ${periodLabel}`}
          entries={monthlyEntries}
          hidePoints={true}
          hidePenalties={true}
        />
      )}
    </GuerraLayoutWrapper>
  );
}
