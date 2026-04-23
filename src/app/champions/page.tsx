'use client';

import React from 'react';
import { Trophy, Shield, CheckCircle2, Rocket } from 'lucide-react';
import { GuerraLayoutWrapper } from '@/components/guerra/GuerraLayoutWrapper';
import { motion } from 'framer-motion';
import { cn, formatPercent } from '@/lib/guerra-utils';
import { useTVMode } from '@/contexts/TVModeContext';

// Get sector image by ID (images are named: 1.png, 2.png, etc.)
const getSectorImage = (sectorId: string | number | undefined) => {
  // If no sectorId, try to use the default
  if (!sectorId) return '/GUERRA_DAS_METAS.png';
  
  const id = Number(sectorId);
  // Valid IDs are 1-6 based on available images
  if (id >= 1 && id <= 6) {
    return `/${id}.png`;
  }
  
  return '/GUERRA_DAS_METAS.png';
};

function ChampionPillar({ title, sector, delay, rank, isTVMode }: any) {
  const heightClass = rank === 1 
    ? (isTVMode ? 'h-[320px]' : 'h-[400px]') 
    : (isTVMode ? 'h-[260px]' : 'h-[320px]');
      
  const orderClass = rank === 1 ? 'order-1 md:order-2' : 'order-2 md:order-1';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease: "easeOut" }}
      className={cn("flex flex-col items-center w-full max-w-[350px]", orderClass)}
    >
      <div className={cn("text-center flex flex-col items-center", isTVMode ? "mb-4" : "mb-8")}>
        <h3 className="text-[10px] font-label text-foreground/60 uppercase tracking-[0.3em] mb-4">{title}</h3>
        <div className={cn(
          "flex items-center justify-center transition-transform hover:scale-110 duration-500", 
          isTVMode ? "w-32 h-32" : "w-48 h-48"
        )}>
          {sector?.nome && (
            <img 
              src={getSectorImage(sector.setorId)} 
              alt={sector.nome} 
              className="w-full h-full object-contain"
            />
          )}
        </div>
      </div>

      <div className={cn(
        "w-full relative rounded-t-2xl border-x border-t border-white/10 flex flex-col items-center justify-start px-8 overflow-hidden",
        heightClass,
        rank === 1 ? "bg-gradient-to-b from-secondary/20 to-transparent" : "bg-gradient-to-b from-white/5 to-transparent"
      )}>
        <span className="absolute font-black text-white/5 select-none italic -bottom-10 -right-10 text-[180px]">
          {rank}
        </span>
        <h2 className={cn("font-headline font-black text-foreground uppercase tracking-tighter text-center leading-none mt-12", isTVMode ? "text-xl" : "text-2xl")}>
          {sector?.nome || "---"}
        </h2>

        <div className={cn("flex flex-col w-full mt-6 gap-2", !isTVMode && "mt-8")}>
          <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/5">
            <span className="text-[8px] font-label text-white/40 uppercase">Eficiência</span>
            <span className="text-xs font-headline font-bold text-primary">{formatPercent(sector?.eficiencia)}</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/5">
            <span className="text-[8px] font-label text-white/40 uppercase">Pontos</span>
            <span className="text-xs font-headline font-bold text-secondary">{sector?.pontos?.toLocaleString() || 0}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function ChampionsPage() {
  const { isTVMode } = useTVMode();
  const [champions, setChampions] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/champions');
        const data = await res.json();
        setChampions(data);
      } catch (err) {
        console.error('Failed to fetch champions:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <GuerraLayoutWrapper>
      <div className={cn("text-center", isTVMode ? "mb-6" : "mb-12")}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-full",
            isTVMode ? "px-4 py-1.5 mb-3" : "px-6 py-2 mb-6"
          )}
        >
          <Trophy className={cn(isTVMode ? "w-4 h-4" : "w-5 h-5", "text-secondary")} />
          <span className="text-[10px] font-headline font-black text-foreground uppercase tracking-[0.4em]">Hall da Fama</span>
        </motion.div>
        <h1 className={cn(
          "font-headline font-black text-foreground uppercase tracking-tighter leading-none mx-auto",
          isTVMode ? "text-3xl mb-2 max-w-xl" : "text-5xl mb-4"
        )}>
          Campeões Atuais
        </h1>
        {!isTVMode && (
          <p className="text-foreground/60 font-label uppercase tracking-widest text-sm max-w-2xl mx-auto">
            Reconhecimento máximo aos setores que dominaram o campo de batalha em todos os períodos.
          </p>
        )}
      </div>

      <div className={cn(
        "flex-1 flex items-end justify-center gap-12 max-w-4xl mx-auto w-full",
        isTVMode ? "pb-6" : "pb-12"
      )}>
        <ChampionPillar 
          title="Campeão Mensal" 
          sector={champions?.mensal || { nome: '', eficiencia: 0, pontos: 0 }} 
          delay={0.2} 
          rank={2} 
          isTVMode={isTVMode} 
        />
        <ChampionPillar 
          title="Campeão Anual" 
          sector={champions?.anual || { nome: '', eficiencia: 0, pontos: 0 }} 
          delay={0} 
          rank={1} 
          isTVMode={isTVMode} 
        />
      </div>

      <div className={cn(
        "grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto w-full border-t border-white/10",
        isTVMode ? "pt-6" : "pt-12"
      )}>
        <div className={cn(
          "flex items-center gap-4 bg-white/5 rounded-2xl border border-white/5",
          isTVMode ? "p-4" : "p-6"
        )}>
          <div className="p-2 bg-blue-400/10 rounded-xl">
            <Shield className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-[8px] font-label text-foreground/60 uppercase tracking-widest">Defesa de Meta</p>
            <p className={cn("font-headline font-black text-foreground", isTVMode ? "text-lg" : "text-xl")}>98.5% GLOBAL</p>
          </div>
        </div>
        <div className={cn(
          "flex items-center gap-4 bg-white/5 rounded-2xl border border-white/5",
          isTVMode ? "p-4" : "p-6"
        )}>
          <div className="p-2 bg-secondary/10 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <p className="text-[8px] font-label text-foreground/60 uppercase tracking-widest">Metas Batidas</p>
            <p className={cn("font-headline font-black text-foreground", isTVMode ? "text-lg" : "text-xl")}>12 SETORES</p>
          </div>
        </div>
        <div className={cn(
          "flex items-center gap-4 bg-white/5 rounded-2xl border border-white/5",
          isTVMode ? "p-4" : "p-6"
        )}>
          <div className="p-2 bg-yellow-400/10 rounded-xl">
            <Rocket className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <p className="text-[8px] font-label text-foreground/60 uppercase tracking-widest">Superação</p>
            <p className={cn("font-headline font-black text-foreground", isTVMode ? "text-lg" : "text-xl")}>+15.2% CRESC.</p>
          </div>
        </div>
      </div>
    </GuerraLayoutWrapper>
  );
}
