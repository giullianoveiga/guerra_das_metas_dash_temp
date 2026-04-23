'use client';

import React from 'react';
import { cn, getProgressColor, formatPercent } from '@/lib/guerra-utils';
import { Trophy, Star } from 'lucide-react';
import { useTVMode } from '@/contexts/TVModeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { LeaderboardEntry } from '@/lib/guerra-data/sectors';
import { useRouter } from 'next/navigation';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  title?: string;
  subtitle?: string;
  hidePoints?: boolean;
  hidePenalties?: boolean;
  showTarget?: boolean;  // NOVO: controla se mostra meta/realizado
}

export function LeaderboardTable({ entries, title, subtitle, hidePoints, hidePenalties, showTarget = false }: LeaderboardTableProps) {
  const { isTVMode } = useTVMode();
  const router = useRouter();
  const itemsPerPage = 12;

  const handleRowClick = (id: number) => {
    router.push(`/sector/${id}`);
  };

  const getSectorImage = (id: number) => {
    return `/${id}.png`;
  };

  if (isTVMode) {
    const visibleEntries = entries.slice(0, itemsPerPage);

    return (
      <section className="flex-1 flex flex-col min-h-0">
        <div className="flex justify-between items-end mb-4 px-2">
          <div>
            <h3 className="text-3xl font-headline font-black text-primary tracking-tighter uppercase italic leading-none">{title}</h3>
            <p className="text-foreground/40 font-label text-[10px] uppercase tracking-[0.4em] mt-1">{subtitle}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-foreground/20 font-headline font-black text-4xl uppercase leading-none">
                {entries.length} SETORES
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 grid-rows-3 gap-3 flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={title}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5 }}
              className="col-span-4 row-span-3 grid grid-cols-4 grid-rows-3 gap-3"
            >
              {visibleEntries.map((entry) => (
                <div 
                  key={entry.rank} 
                  onClick={() => handleRowClick(entry.id)}
                  className={cn(
                    "flex flex-col p-3 transition-all relative overflow-hidden h-full group/card cursor-pointer hover:ring-2 hover:ring-primary/50",
                    entry.rank === 1 ? "border-t-2 border-secondary" : "border-t-2 border-primary/40"
                  )}
                >
                   <div 
                    className="absolute inset-0 z-0 bg-contain bg-center bg-no-repeat transition-transform duration-700 group-hover/card:scale-105"
                    style={{ backgroundImage: `url('${getSectorImage(entry.id)}')` }}
                  />
                  
                  <div className="absolute inset-0 z-[1] bg-black/70 group-hover/card:bg-black/60 transition-colors duration-500" />
                  <div className="absolute inset-0 z-[2] bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                  <div className="relative z-10 flex flex-col h-full">
                    <div className="absolute top-1 right-1 opacity-20">
                      <span className="text-2xl font-headline font-black italic text-white">
                        #{entry.rank.toString().padStart(2, '0')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-headline font-black text-white uppercase truncate leading-tight drop-shadow-md">{entry.name}</h4>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: entry.monthlyWins || 0 }).map((_, i) => (
                              <Star key={`m-${i}`} className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                            ))}
                            {Array.from({ length: entry.annualWins || 0 }).map((_, i) => (
                              <Trophy key={`a-${i}`} className="w-2.5 h-2.5 text-secondary" />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto space-y-2">
                      <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                          <span className="text-[7px] font-label text-white/50 uppercase tracking-widest">Eficiência</span>
                          <span className={cn(
                            "text-lg font-headline font-black drop-shadow-md",
                            entry.eff >= 100 ? "text-secondary" : "text-primary"
                          )}>
                            {formatPercent(entry.eff)}
                          </span>
                        </div>
                        {!hidePoints && (
                          <div className="flex flex-col text-right">
                            <span className="text-[7px] font-label text-white/50 uppercase tracking-widest">Pontos</span>
                            <span className="text-xl font-headline font-black text-white tracking-tighter drop-shadow-md">
                              {entry.points.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                        <div 
                          className={cn("h-full transition-all duration-1000", getProgressColor(entry.eff))}
                          style={{ width: `${Math.min(entry.eff, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {visibleEntries.length < itemsPerPage && Array.from({ length: itemsPerPage - visibleEntries.length }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-muted/5 border-t-2 border-transparent p-3 flex flex-col h-full opacity-20" />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-muted/10 backdrop-blur-sm p-10">
      <div className="flex justify-between items-end mb-12">
        <div>
          <h3 className="text-4xl font-headline font-black text-foreground tracking-tight">{title}</h3>
          <p className="text-foreground/60 font-label text-xs uppercase tracking-[0.2em] mt-2">{subtitle}</p>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="pb-6 font-label text-[10px] text-foreground/60 uppercase tracking-widest w-16">Pos</th>
              <th className="pb-6 font-label text-[10px] text-foreground/60 uppercase tracking-widest">Setor / Unidade de Equipe</th>
              {showTarget && <th className="pb-6 font-label text-[10px] text-foreground/60 uppercase tracking-widest text-right">Meta de Alvo</th>}
              {showTarget && <th className="pb-6 font-label text-[10px] text-foreground/60 uppercase tracking-widest text-right">Realizado</th>}
              <th className="pb-6 font-label text-[10px] text-foreground/60 uppercase tracking-widest text-right">% Eficiência</th>
              {!hidePoints && <th className="pb-6 font-label text-[10px] text-foreground/60 uppercase tracking-widest text-right">Pontos</th>}
              {!hidePenalties && <th className="pb-6 font-label text-[10px] text-foreground/60 uppercase tracking-widest text-right">Penalidades</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {entries.map((entry) => (
              <tr 
                key={entry.rank} 
                onClick={() => handleRowClick(entry.id)}
                className={cn("group hover:bg-white/10 transition-colors cursor-pointer", entry.rank === 1 && "bg-white/10")}
              >
                <td className="py-8">
                  <span className={cn("text-2xl font-headline font-black", entry.rank === 1 ? "text-secondary" : "text-foreground/60")}>
                    {entry.rank.toString().padStart(2, '0')}
                  </span>
                </td>
                <td className="py-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 shrink-0 flex items-center justify-center">
                      <img 
                        src={getSectorImage(entry.id)} 
                        alt={entry.name} 
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-headline font-bold text-foreground text-lg">{entry.name}</p>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: entry.monthlyWins || 0 }).map((_, i) => (
                            <Star key={`m-${i}`} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          ))}
                          {Array.from({ length: entry.annualWins || 0 }).map((_, i) => (
                            <Trophy key={`a-${i}`} className="text-secondary w-3.5 h-3.5" />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
                {showTarget && <td className="py-8 text-right font-headline text-foreground">{entry.target.toLocaleString()}</td>}
                {showTarget && <td className="py-8 text-right font-headline text-foreground">{entry.realized.toLocaleString()}</td>}
                <td className="py-8 text-right">
                  <span className={cn(
                    "px-3 py-1 text-sm font-headline font-bold border",
                    entry.eff >= 100 
                      ? "bg-secondary/10 text-secondary border-secondary/20" 
                      : entry.eff > 75 
                        ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                        : "bg-red-500/10 text-red-500 border-red-500/20"
                  )}>
                    {formatPercent(entry.eff)}
                  </span>
                </td>
                {!hidePoints && <td className="py-8 text-right font-headline font-black text-2xl text-foreground">{entry.points.toLocaleString()}</td>}
                {!hidePenalties && <td className="py-8 text-right font-headline font-bold text-destructive">-{entry.penalties}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
