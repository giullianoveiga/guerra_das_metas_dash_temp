'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Monitor, Pause, Play, SkipForward, SkipBack, ChevronDown, Settings } from 'lucide-react';
import { cn } from '@/lib/guerra-utils';
import { useTVMode } from '@/contexts/TVModeContext';
import React from 'react';

interface SectorOption {
  id: number;
  name: string;
}

export function Topbar() {
  const { isTVMode, toggleTVMode, isPaused, togglePause, next, previous } = useTVMode();
  const pathname = usePathname();
  const router = useRouter();

  const [sectors, setSectors] = React.useState<SectorOption[]>([]);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    fetch('/api/sectors')
      .then((r) => r.json())
      .then((data) => {
        if (data.sectors) setSectors(data.sectors);
      })
      .catch((err) => console.error('Failed to load sectors for Topbar:', err));
  }, []);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { label: 'Mensal', to: '/monthly' },
    { label: 'Anual', to: '/annual' },
    { label: 'Campeões', to: '/champions' },
  ];

  const currentSector = sectors.find((s) => pathname === `/sector/${s.id}`);

  if (isTVMode) {
    return (
      <header className="fixed top-0 left-0 w-full z-50 flex justify-end items-center px-8 h-20 bg-transparent">
        <div className="flex items-center gap-4">
           <button 
            onClick={previous}
            className="flex items-center gap-2 bg-background/60 backdrop-blur-xl px-4 py-2 text-[10px] font-label uppercase tracking-widest hover:text-primary transition-colors border border-white/10"
          >
            <SkipBack className="w-4 h-4" />
            
          </button>
          <button 
            onClick={togglePause}
            className="flex items-center gap-2 bg-background/60 backdrop-blur-xl px-4 py-2 text-[10px] font-label uppercase tracking-widest hover:text-primary transition-colors border border-white/10"
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            
          </button>
          <button 
            onClick={next}
            className="flex items-center gap-2 bg-background/60 backdrop-blur-xl px-4 py-2 text-[10px] font-label uppercase tracking-widest hover:text-primary transition-colors border border-white/10"
          >
            <SkipForward className="w-4 h-4" />
            
          </button>
          <button 
            onClick={toggleTVMode}
            className="flex items-center gap-2 bg-background/60 backdrop-blur-xl px-4 py-2 text-[10px] font-label uppercase tracking-widest hover:text-primary transition-colors border border-white/10"
          >
            <Monitor className="w-4 h-4" />
            Sair
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-8 h-20 bg-background/60 backdrop-blur-xl border-b border-white/10">
      <div className="flex items-center">
        <Link href="/monthly" className="flex items-center hover:opacity-80 transition-opacity">
          <img 
            src="/GUERRA_DAS_METAS.png" 
            alt="Guerra das Metas" 
            className="h-12 w-auto object-contain"
          />
        </Link>

        <nav className="hidden md:flex gap-8 ml-12 items-center">
          {navItems.map((item) => (
            <Link
              key={item.to}
              href={item.to}
              className={cn(
                "font-headline font-bold text-sm tracking-widest uppercase transition-all pb-1 border-b-2",
                pathname === item.to 
                  ? "text-primary border-primary" 
                  : "text-foreground/60 border-transparent hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}

          {/* Dropdown de Setores */}
          <div ref={dropdownRef} className="relative">
            <button
              id="sectors-dropdown-btn"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className={cn(
                "flex items-center gap-1.5 font-headline font-bold text-sm tracking-widest uppercase transition-all pb-1 border-b-2",
                currentSector
                  ? "text-primary border-primary"
                  : "text-foreground/60 border-transparent hover:text-foreground"
              )}
            >
              {currentSector ? currentSector.name : 'Setores'}
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 transition-transform duration-200",
                  dropdownOpen && "rotate-180"
                )}
              />
            </button>

            {dropdownOpen && (
              <div
                id="sectors-dropdown-menu"
                className="absolute top-full left-0 mt-3 min-w-[200px] bg-background/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/60 overflow-hidden z-50"
              >
                {sectors.length === 0 ? (
                  <div className="px-4 py-3 text-[10px] font-label text-foreground/30 uppercase tracking-widest">
                    Carregando...
                  </div>
                ) : (
                  sectors.map((sector) => (
                    <button
                      key={sector.id}
                      id={`sector-nav-${sector.id}`}
                      onClick={() => {
                        router.push(`/sector/${sector.id}`);
                        setDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-3 text-[11px] font-label uppercase tracking-widest transition-colors border-b border-white/5 last:border-0",
                        pathname === `/sector/${sector.id}`
                          ? "text-primary bg-primary/10"
                          : "text-foreground/60 hover:text-foreground hover:bg-white/5"
                      )}
                    >
                      {sector.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </nav>
      </div>

      <div className="flex items-center gap-6">
        <Link 
          href="/settings"
          className={cn(
            "flex items-center gap-2 text-foreground/60 hover:text-primary transition-colors",
            pathname === '/settings' && "text-primary"
          )}
          title="Configurações"
        >
          <Settings className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleTVMode}
            className="flex items-center gap-2 bg-muted px-4 py-2 text-[10px] font-label uppercase tracking-widest hover:text-primary transition-colors"
          >
            <Monitor className="w-4 h-4" />
            Modo TV
          </button>
        </div>
      </div>
    </header>
  );
}