'use client';

import React from 'react';
import { Card } from "@/components/ui/card";
import { cn, getProgressColor, formatPercent } from "@/lib/guerra-utils";
import { useTVMode } from '@/contexts/TVModeContext';

interface SectorDetailProps {
  sectorId: string;
}

const TV_AUTO_PAGE_MS = 6000;

export function SectorDetail({ sectorId }: SectorDetailProps) {
  const { isTVMode } = useTVMode();
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/sectors/${sectorId}`);
        if (!res.ok) {
          console.error(`Error fetching sector ${sectorId}: ${res.status} ${res.statusText}`);
          return;
        }

        const json = await res.json();
        if (json.sector) {
          setData(json);
        } else {
          console.warn(`Sector ${sectorId} returned no data:`, json);
        }
      } catch (err) {
        console.error('Failed to fetch sector details:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [sectorId]);

  const sector = data?.sector;
  const collaborators = data?.collaborators || [];

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center font-label uppercase tracking-widest text-foreground/40">
        Carregando dados taticos...
      </div>
    );
  }

  if (!sector) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center font-label uppercase tracking-widest text-foreground/40">
        <p className="mb-2 text-xl">Setor tatico nao encontrado</p>
        <p className="text-[10px]">ID: {sectorId}</p>
      </div>
    );
  }

  const totalRealizado = collaborators.reduce((acc: number, c: any) => acc + Number(c.realizado), 0);
  const totalMeta = collaborators.reduce((acc: number, c: any) => acc + Number(c.meta), 0);
  const overallEfficiency = totalMeta > 0 ? (totalRealizado / totalMeta) * 100 : 0;
  const averageGoal = collaborators.length > 0 ? totalMeta / collaborators.length : 0;

  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dayOfMonth = today.getDate();
  const projectedTotal = dayOfMonth > 0 ? (totalRealizado / dayOfMonth) * daysInMonth : 0;
  const projectedEfficiency = totalMeta > 0 ? (projectedTotal / totalMeta) * 100 : 0;

  const logo = `/${sector.id}.png`;

  return (
    <div className={cn("w-full", isTVMode ? "h-full px-1 py-2" : "p-4")}>
      <Card
        className={cn(
          "relative isolate grid h-[calc(100vh-88px)] w-full overflow-hidden border-white/10 bg-slate-950 text-foreground",
          isTVMode ? "grid-cols-[320px_minmax(0,1fr)]" : "max-w-7xl grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)]"
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.14),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.94))]" />
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:34px_34px]" />

        <aside
          className={cn(
            "relative z-10 flex flex-col justify-between border-b border-white/10 bg-white/[0.03] backdrop-blur-sm xl:border-b-0 xl:border-r",
            isTVMode ? "p-6" : "p-8"
          )}
        >
          <div>
            <div className={cn("mb-5 flex items-center justify-between", isTVMode ? "gap-3" : "gap-4")}>
              <span className="font-label text-[10px] uppercase tracking-[0.45em] text-primary/70">Painel do Setor</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-label text-[10px] uppercase tracking-[0.35em] text-foreground/55">
                TV Focus
              </span>
            </div>

            <div className={cn("mx-auto mb-6 flex items-center justify-center", isTVMode ? "h-28 w-28" : "h-36 w-36")}>
              <img
                src={logo}
                alt={sector.name}
                className="h-full w-full object-contain drop-shadow-[0_0_36px_rgba(148,163,184,0.24)]"
              />
            </div>

            <h2 className={cn("text-center font-headline font-black uppercase tracking-tight", isTVMode ? "text-3xl" : "text-4xl")}>
              {sector.name}
            </h2>

            <div className="mt-8 rounded-2xl border border-white/10 bg-black/25 p-5">
              <p className="font-label text-[10px] uppercase tracking-[0.4em] text-foreground/45">Eficiencia geral</p>
              <p
                className={cn(
                  "mt-3 font-headline font-black leading-none",
                  isTVMode ? "text-6xl" : "text-7xl",
                  overallEfficiency >= 100 ? "text-secondary" : "text-primary"
                )}
              >
                {formatPercent(overallEfficiency)}
              </p>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className={cn("h-full transition-all duration-700", getProgressColor(overallEfficiency))}
                  style={{ width: `${Math.min(overallEfficiency, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MetricBlock label="Meta total" value={totalMeta.toLocaleString('pt-BR')} />
            <MetricBlock label="Realizado" value={totalRealizado.toLocaleString('pt-BR')} />
            <MetricBlock label="Pace do mes" value={formatPercent(projectedEfficiency)} highlight={projectedEfficiency >= 100} />
            <MetricBlock label="Pessoas" value={String(collaborators.length)} />
            <MetricBlock label="Media de meta" value={averageGoal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} />
            <MetricBlock label="Vitorias" value={String(sector.vitoriasMensais ?? 0)} />
          </div>
        </aside>

        <section className={cn("relative z-10 flex min-h-0 flex-col", isTVMode ? "p-5" : "p-8")}>
          <div className="mb-4 flex items-end justify-between gap-6 border-b border-white/10 pb-4">
            <div>
              <p className="font-label text-[10px] uppercase tracking-[0.45em] text-foreground/45">Operacao individual</p>
              <h3 className={cn("mt-2 font-headline font-black uppercase tracking-tight", isTVMode ? "text-2xl" : "text-3xl")}>
                Quadro de performance
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-right">
              <HeaderStat label="Meta do dia" value={Math.round(totalMeta / Math.max(daysInMonth, 1)).toLocaleString('pt-BR')} />
              <HeaderStat label="Dia util de leitura" value={`${dayOfMonth}/${daysInMonth}`} />
            </div>
          </div>

          <CollaboratorBoard
            collaborators={collaborators}
            dayOfMonth={dayOfMonth}
            daysInMonth={daysInMonth}
            isTVMode={isTVMode}
          />
        </section>
      </Card>
    </div>
  );
}

function CollaboratorBoard({
  collaborators,
  dayOfMonth,
  daysInMonth,
  isTVMode,
}: {
  collaborators: any[];
  dayOfMonth: number;
  daysInMonth: number;
  isTVMode: boolean;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [layout, setLayout] = React.useState(() => ({
    columns: isTVMode ? 2 : 2,
    rows: isTVMode ? 5 : 4,
  }));
  const [page, setPage] = React.useState(0);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const calculateLayout = (width: number, height: number) => {
      const minColumnWidth = isTVMode ? 420 : 320;
      const rowHeight = isTVMode ? 112 : 132;
      const nextColumns = Math.max(1, Math.floor(width / minColumnWidth));
      const nextRows = Math.max(1, Math.floor(height / rowHeight));

      setLayout({
        columns: nextColumns,
        rows: nextRows,
      });
    };

    calculateLayout(container.clientWidth, container.clientHeight);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        calculateLayout(entry.contentRect.width, entry.contentRect.height);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [isTVMode]);

  const itemsPerPage = Math.max(1, layout.columns * layout.rows);
  const pages = chunkItems(collaborators, itemsPerPage);
  const safePage = Math.min(page, Math.max(pages.length - 1, 0));

  React.useEffect(() => {
    setPage(0);
  }, [itemsPerPage, collaborators.length]);

  React.useEffect(() => {
    if (!isTVMode || pages.length <= 1) return;

    const interval = window.setInterval(() => {
      setPage((current) => (current + 1) % pages.length);
    }, TV_AUTO_PAGE_MS);

    return () => window.clearInterval(interval);
  }, [isTVMode, pages.length]);

  const currentPageItems = pages[safePage] || [];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-label text-[10px] uppercase tracking-[0.3em] text-foreground/60">
            {layout.columns} colunas
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-label text-[10px] uppercase tracking-[0.3em] text-foreground/60">
            {layout.rows} linhas
          </span>
        </div>

        <div className="font-label text-[10px] uppercase tracking-[0.35em] text-foreground/50">
          Pagina {pages.length === 0 ? 0 : safePage + 1} de {pages.length || 0}
        </div>
      </div>

      <div ref={containerRef} className="min-h-0 flex-1">
        <div
          className="grid h-full gap-3"
          style={{
            gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
            gridAutoRows: 'minmax(0, 1fr)',
          }}
        >
          {currentPageItems.map((collaborator: any, index: number) => (
            <CollaboratorItem
              key={collaborator.id}
              c={collaborator}
              rank={safePage * itemsPerPage + index + 1}
              dayOfMonth={dayOfMonth}
              daysInMonth={daysInMonth}
              compact={isTVMode}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function CollaboratorItem({
  c,
  rank,
  dayOfMonth,
  daysInMonth,
  compact = false,
}: {
  c: any;
  rank: number;
  dayOfMonth: number;
  daysInMonth: number;
  compact?: boolean;
}) {
  const meta = Number(c.meta);
  const realizado = Number(c.realizado);
  const projectedRealizado = dayOfMonth > 0 ? (realizado / dayOfMonth) * daysInMonth : 0;
  const projectedEfficiency = meta > 0 ? (projectedRealizado / meta) * 100 : 0;
  const efficiency = meta > 0 ? (realizado / meta) * 100 : 0;

  return (
    <article
      className={cn(
        "group flex h-full min-h-0 flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition-colors duration-300 hover:bg-white/[0.07]",
        compact ? "p-4" : "p-5"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-3">
            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-primary/25 bg-primary/10 px-2 font-headline text-sm font-bold text-primary">
              {rank}
            </span>
            <p className={cn("truncate font-headline font-black uppercase tracking-tight", compact ? "text-lg" : "text-xl")}>
              {c.name}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <InlineStat label="Meta" value={meta.toLocaleString('pt-BR')} />
            <InlineStat label="Realizado" value={realizado.toLocaleString('pt-BR')} />
            <InlineStat
              label="Projetado"
              value={formatPercent(projectedEfficiency)}
              accent={projectedEfficiency >= 100 ? "text-secondary" : "text-foreground/80"}
            />
          </div>
        </div>

        <div className="text-right">
          <p
            className={cn(
              "font-headline font-black leading-none",
              compact ? "text-3xl" : "text-4xl",
              efficiency >= 100 ? "text-secondary" : "text-primary"
            )}
          >
            {formatPercent(efficiency)}
          </p>
          <p className="mt-1 font-label text-[9px] uppercase tracking-[0.35em] text-foreground/40">Efetivo</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between font-label text-[9px] uppercase tracking-[0.32em] text-foreground/38">
          <span>Progresso</span>
          <span>{Math.min(efficiency, 100).toFixed(0)}%</span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className={cn("h-full transition-all duration-700", getProgressColor(efficiency))}
            style={{ width: `${Math.min(efficiency, 100)}%` }}
          />
        </div>
      </div>
    </article>
  );
}

function MetricBlock({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="font-label text-[9px] uppercase tracking-[0.35em] text-foreground/45">{label}</p>
      <p className={cn("mt-2 font-headline text-2xl font-bold", highlight ? "text-secondary" : "text-white")}>
        {value}
      </p>
    </div>
  );
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-label text-[9px] uppercase tracking-[0.32em] text-foreground/40">{label}</p>
      <p className="mt-1 font-headline text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function InlineStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
      <p className="font-label text-[8px] uppercase tracking-[0.3em] text-foreground/40">{label}</p>
      <p className={cn("mt-1 truncate font-headline text-base font-bold text-white", accent)}>{value}</p>
    </div>
  );
}

function chunkItems<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];

  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}
