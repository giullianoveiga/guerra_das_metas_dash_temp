'use client';

import React, { useEffect, useState } from 'react';
import { Topbar } from './Topbar';
import { useTVMode } from '@/contexts/TVModeContext';
import { MonitorOff } from 'lucide-react';
import { cn } from '@/lib/guerra-utils';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface SectorFromDB {
  id: number;
  name: string;
}

interface LayoutProps {
  children: React.ReactNode;
}

export function GuerraLayout({ children }: LayoutProps) {
  const { isTVMode, toggleTVMode } = useTVMode();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [sectors, setSectors] = useState<SectorFromDB[]>([]);

  useEffect(() => {
    fetch('/api/sectors')
      .then((r) => r.json())
      .then((data) => {
        if (data.sectors) setSectors(data.sectors);
      })
      .catch((err) => console.error('Failed to load sectors:', err));
  }, []);

  useEffect(() => {
    if (!isTVMode) return;

    const baseRoutes = ['/monthly', '/annual', '/champions'];
    const sectorRoutes = sectors.map(sector => `/sector/${sector.id}`);
    const routes = [...baseRoutes, ...sectorRoutes];
    
    const interval = setInterval(() => {
        const currentQuery = searchParams.toString();
        const currentPath = currentQuery ? `${pathname}?${currentQuery}` : pathname;
        const currentIndex = routes.indexOf(currentPath);
        const nextIndex = (currentIndex + 1) % routes.length;
        router.push(routes[nextIndex]);
    }, 40000);

    return () => clearInterval(interval);
  }, [isTVMode, pathname, router, searchParams]);

  return (
    <div className={cn("flex min-h-screen overflow-x-hidden bg-background", isTVMode && "bg-black")}>
      <div className={cn("flex-1 min-h-screen relative", !isTVMode && "pb-20")}>
        <Topbar />
        
        {isTVMode && (
          <button 
            onClick={toggleTVMode}
            className="fixed top-4 right-4 z-[100] p-2 bg-white/5 hover:bg-white/10 text-white/40 hover:text-primary rounded-full transition-all group"
            title="Sair do Modo TV"
          >
            <MonitorOff className="w-4 h-4" />
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 whitespace-nowrap text-[10px] font-label uppercase tracking-widest ml-0 group-hover:ml-2">
              Sair Modo TV
            </span>
          </button>
        )}

        <main className={cn(
          "w-full transition-all duration-700",
          isTVMode ? "p-6 h-screen flex flex-col pt-12" : "pt-32 px-8 max-w-7xl mx-auto"
        )}>
          {children}
        </main>
        
        {!isTVMode && (
          <div className="fixed bottom-0 left-0 w-full h-12 bg-muted/60 backdrop-blur-xl border-t border-white/5 px-8 flex items-center justify-between text-[10px] font-label uppercase tracking-widest z-50">
            <div className="flex gap-6">
              <span className="text-foreground/60">Status do Servidor: <span className="text-secondary">ONLINE</span></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
