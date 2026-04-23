'use client';

import { useRouter, usePathname } from 'next/navigation';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';

const baseRoutes = ['/monthly', '/annual', '/champions'];

interface TVModeContextType {
  isTVMode: boolean;
  isPaused: boolean;
  toggleTVMode: () => void;
  togglePause: () => void;
  next: () => void;
  previous: () => void;
}

const TVModeContext = createContext<TVModeContextType | undefined>(undefined);

export function TVModeProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [isTVMode, setIsTVMode] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playlist, setPlaylist] = useState<string[]>(baseRoutes);

  // Load sectors from API to build the TV playlist dynamically
  useEffect(() => {
    fetch('/api/sectors')
      .then((r) => r.json())
      .then((data) => {
        if (data.sectors && Array.isArray(data.sectors)) {
          const sectorRoutes = data.sectors.map((s: { id: number }) => `/sector/${s.id}`);
          setPlaylist([...baseRoutes, ...sectorRoutes]);
        }
      })
      .catch((err) => console.error('TVModeContext: failed to load sectors:', err));
  }, []);

  const navigateTo = useCallback((index: number) => {
    const newIndex = (index + playlist.length) % playlist.length;
    setCurrentIndex(newIndex);
    const newPath = playlist[newIndex];
    router.push(newPath);
  }, [router, playlist]);

  const next = useCallback(() => {
    navigateTo(currentIndex + 1);
  }, [currentIndex, navigateTo]);

  const previous = useCallback(() => {
    navigateTo(currentIndex - 1);
  }, [currentIndex, navigateTo]);

  const toggleTVMode = () => {
    const turningOn = !isTVMode;
    setIsTVMode(turningOn);
    setIsPaused(false);

    if (turningOn) {
      const startIndex = playlist.findIndex(p => p === pathname);
      const newIndex = startIndex !== -1 ? startIndex : 0;
      setCurrentIndex(newIndex);
      if (startIndex === -1) {
        router.push(playlist[0]);
      }
    } else {
        if (playlist.includes(pathname)){
             router.push('/monthly');
        }
    }
  };

  const togglePause = () => {
    if (isTVMode) {
      setIsPaused((prev) => !prev);
    }
  };

  useEffect(() => {
    if (!isTVMode || isPaused) return;

    const timer = setInterval(() => {
      next();
    }, 15000);

    return () => clearInterval(timer);
  }, [isTVMode, isPaused, next]);
  
  useEffect(() => {
    if (isTVMode) {
      const indexInPlaylist = playlist.findIndex(p => p === pathname);
      if (indexInPlaylist !== -1 && indexInPlaylist !== currentIndex) {
        setCurrentIndex(indexInPlaylist);
      }
    }
  }, [pathname, isTVMode, currentIndex, playlist]);


  return (
    <TVModeContext.Provider value={{ isTVMode, isPaused, toggleTVMode, togglePause, next, previous }}>
      {children}
    </TVModeContext.Provider>
  );
}

export function useTVMode() {
  const context = useContext(TVModeContext);
  if (context === undefined) {
    throw new Error('useTVMode must be used within a TVModeProvider');
  }
  return context;
}
