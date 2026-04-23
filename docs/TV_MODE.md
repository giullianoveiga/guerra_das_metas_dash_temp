# Modo TV - Guerra das Metas

Este documento descreve o **Modo TV** (Presentation Mode) do Guerra das Metas Dashboard, projetado para exibição em telas grandes em áreas comuns ou salas de reunião.

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Funcionalidades](#2-funcionalidades)
3. [API do Contexto](#3-api-do-contexto)
4. [Playlist de Páginas](#4-playlist-de-páginas)
5. [Configurações](#5-configurações)
6. [Implementação](#6-implementação)
7. [Exemplos](#7-exemplos)

---

## 1. Visão Geral

O **Modo TV** é uma funcionalidade especial que permite a exibição automática e contínua do dashboard em telas grandes, como:

- Monitores em áreas comuns da empresa
- Telas em salas de reunião
- Painéis de TV para displays fixos
- Apresentações em eventos corporativos

### Características Principais

| Característica | Descrição |
|----------------|-----------|
| Rotação automática | Alterna entre páginas a cada 15 segundos |
| Sem interação necessária | Exibição hands-free contínua |
| Playlist dinâmica | Inclui automaticamente todos os setores |
| Controles opcionais | Pausar, avançar, retroceder |
| Interface fullscreen | Otimizado para telas grandes |

---

## 2. Funcionalidades

### 2.1 Rotação Automática

O sistema alterna automaticamente entre as páginas da playlist.

```
┌─────────────────────────────────────────────┐
│                                             │
│            Página Atual                     │
│         (Ranking Mensal)                    │
│                                             │
│              ⏱ 15s                          │
│                                             │
│    ◀ Anterior    ⏸ Pausar    Próximo ▶     │
│                                             │
└─────────────────────────────────────────────┘
       ↓ (após 15 segundos)
┌─────────────────────────────────────────────┐
│                                             │
│         Próxima Página                      │
│         (Ranking Anual)                     │
│                                             │
└─────────────────────────────────────────────┘
```

### 2.2 Controles

| Controle | Descrição | Atalho |
|----------|-----------|--------|
| Pausar/Retomar | Pausa ou retoma a rotação | Clique no botão |
| Anterior | Vai para a página anterior | Clique no botão |
| Próximo | Avança para a próxima página | Clique no botão |
| Sair | Sai do modo TV | Botão "X" |

### 2.3 Indicador de Progresso

Um indicador visual mostra o tempo restante até a próxima página:

```
████████████░░░░░░░░░░░░░░░░  8s / 15s
```

---

## 3. API do Contexto

O modo TV é gerenciado pelo `TVModeContext`, disponível em `src/contexts/TVModeContext.tsx`.

### Interface

```typescript
interface TVModeContextType {
  // Estado
  isTVMode: boolean;       // Modo TV ativo
  isPaused: boolean;      // Rotação pausada
  
  // Controles
  toggleTVMode: () => void;    // Ativa/desativa modo TV
  togglePause: () => void;     // Pausa/retoma rotação
  next: () => void;            // Próxima página
  previous: () => void;         // Página anterior
  
  // Playlist
  playlist: string[];          // Lista de rotas
  currentIndex: number;        // Índice atual
}
```

### Provider

```tsx
// src/app/layout.tsx
import { TVModeProvider } from '@/contexts/TVModeContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <TVModeProvider>
          {children}
        </TVModeProvider>
      </body>
    </html>
  );
}
```

---

## 4. Playlist de Páginas

### 4.1 Ordem Padrão

A playlist segue esta ordem:

```
1. /monthly       → Ranking Mensal
2. /annual        → Ranking Anual  
3. /champions      → Hall da Fama
4. /sector/1       → Detalhes Setor 1
5. /sector/2       → Detalhes Setor 2
...
N. /sector/N       → Detalhes Setor N
```

### 4.2 Geração Automática

A playlist é gerada automaticamente com base nos setores do banco de dados:

```typescript
// src/contexts/TVModeContext.tsx
const generatePlaylist = async (): Promise<string[]> => {
  const response = await fetch('/api/sectors');
  const { sectors } = await response.json();
  
  return [
    '/monthly',
    '/annual',
    '/champions',
    ...sectors.map((s: { id: number }) => `/sector/${s.id}`)
  ];
};
```

### 4.3 Customização

Para customizar a playlist, modifique o `TVModeContext`:

```typescript
const TVModeContext: TVModeContextType = {
  // ...
  playlist: [
    '/monthly',           // Sempre primeiro
    '/champions',         // Hall da Fama
    '/annual',            // Ranking Anual
    '/sector/1',          // Setores específicos
    '/sector/3',
    '/sector/5',
  ],
  // ...
};
```

---

## 5. Configurações

### 5.1 Intervalo de Rotação

O intervalo padrão é de 15 segundos. Para alterar:

```typescript
// src/contexts/TVModeContext.tsx
const TV_INTERVAL = 15000; // 15 segundos em milissegundos
```

### 5.2 Tempo de Transição

Tempo para animação de transição entre páginas:

```typescript
const TRANSITION_DURATION = 500; // 500ms
```

### 5.3 Velocidade Personalizada

Para alterar a velocidade de rotação:

```typescript
// Velocidade rápida (5 segundos)
const TV_INTERVAL = 5000;

// Velocidade lenta (30 segundos)
const TV_INTERVAL = 30000;
```

---

## 6. Implementação

### 6.1 Componente TVModeProvider

```tsx
// src/contexts/TVModeContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface TVModeContextType {
  isTVMode: boolean;
  isPaused: boolean;
  toggleTVMode: () => void;
  togglePause: () => void;
  next: () => void;
  previous: () => void;
}

const TVModeContext = createContext<TVModeContextType | undefined>(undefined);

const TV_INTERVAL = 15000; // 15 segundos

export function TVModeProvider({ children }: { children: React.ReactNode }) {
  const [isTVMode, setIsTVMode] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playlist, setPlaylist] = useState<string[]>([]);
  const [router, setRouter] = useState<any>(null);

  // Carregar playlist ao inicializar
  useEffect(() => {
    const loadPlaylist = async () => {
      try {
        const response = await fetch('/api/sectors');
        const { sectors } = await response.json();
        
        setPlaylist([
          '/monthly',
          '/annual',
          '/champions',
          ...sectors.map((s: { id: number }) => `/sector/${s.id}`)
        ]);
      } catch (error) {
        console.error('Erro ao carregar playlist:', error);
      }
    };
    
    loadPlaylist();
  }, []);

  // Rotação automática
  useEffect(() => {
    if (!isTVMode || isPaused || playlist.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % playlist.length);
    }, TV_INTERVAL);

    return () => clearInterval(interval);
  }, [isTVMode, isPaused, playlist]);

  // Navegar para página atual
  useEffect(() => {
    if (!isTVMode || playlist.length === 0) return;
    // Implementar navegação usando useRouter do Next.js
  }, [currentIndex, isTVMode, playlist]);

  const toggleTVMode = useCallback(() => {
    setIsTVMode((prev) => !prev);
    setCurrentIndex(0);
  }, []);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const next = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % playlist.length);
  }, [playlist.length]);

  const previous = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
  }, [playlist.length]);

  return (
    <TVModeContext.Provider
      value={{
        isTVMode,
        isPaused,
        toggleTVMode,
        togglePause,
        next,
        previous,
      }}
    >
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
```

### 6.2 Hook useTVMode

```typescript
'use client';

import { useTVMode } from '@/contexts/TVModeContext';

export function TVModeToggle() {
  const { isTVMode, toggleTVMode } = useTVMode();

  return (
    <button onClick={toggleTVMode}>
      {isTVMode ? 'Sair do Modo TV' : 'Entrar em Modo TV'}
    </button>
  );
}
```

### 6.3 Componente de Overlay

```tsx
'use client';

import { useTVMode } from '@/contexts/TVModeContext';

export function TVModeOverlay() {
  const { isTVMode, isPaused, togglePause, next, previous, toggleTVMode } = useTVMode();

  if (!isTVMode) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 flex gap-4">
      <button onClick={previous}>◀ Anterior</button>
      <button onClick={togglePause}>
        {isPaused ? '▶ Retomar' : '⏸ Pausar'}
      </button>
      <button onClick={next}>Próximo ▶</button>
      <button onClick={toggleTVMode}>✕ Sair</button>
    </div>
  );
}
```

---

## 7. Exemplos

### 7.1 Ativar Modo TV via Teclado

```tsx
'use client';

import { useEffect } from 'react';
import { useTVMode } from '@/contexts/TVModeContext';

export function KeyboardShortcuts() {
  const { toggleTVMode, togglePause, next, previous, isTVMode } = useTVMode();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ativar modo TV: Ctrl + T
      if (event.ctrlKey && event.key === 't') {
        event.preventDefault();
        toggleTVMode();
      }

      if (!isTVMode) return;

      // Controles quando modo TV está ativo
      switch (event.key) {
        case ' ':
          event.preventDefault();
          togglePause();
          break;
        case 'ArrowRight':
          event.preventDefault();
          next();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          previous();
          break;
        case 'Escape':
          event.preventDefault();
          toggleTVMode();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleTVMode, togglePause, next, previous, isTVMode]);

  return null;
}
```

### 7.2 Indicador de Tempo

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useTVMode } from '@/contexts/TVModeContext';

export function ProgressIndicator() {
  const { isTVMode, isPaused } = useTVMode();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isTVMode || isPaused) {
      setProgress(0);
      return;
    }

    const TV_INTERVAL = 15000;
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / TV_INTERVAL) * 100, 100);
      setProgress(newProgress);
    }, 100);

    return () => clearInterval(interval);
  }, [isTVMode, isPaused]);

  if (!isTVMode) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="w-64 h-2 bg-gray-300 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
```

### 7.3 Fullscreen Automático

```tsx
'use client';

import { useEffect } from 'react';
import { useTVMode } from '@/contexts/TVModeContext';

export function FullscreenHandler() {
  const { isTVMode } = useTVMode();

  useEffect(() => {
    if (isTVMode) {
      // Entrar em fullscreen
      document.documentElement.requestFullscreen?.();
    } else {
      // Sair de fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      }
    }
  }, [isTVMode]);

  return null;
}
```

---

## Boas Práticas

1. **Teste em diferentes telas** - Resoluções variam entre dispositivos
2. **Ajuste o intervalo** - 15s é bom para apresentações curtas
3. **Use som sutil** - Feedback auditivo ao mudar de página
4. **Mantenha a playlist curta** - Evite muitas páginas para não cansar
5. **Monitore o sistema** - Verifique se a TV está ligada e funcionando

---

## Troubleshooting

| Problema | Solução |
|----------|--------|
| Transições bruscas | Aumente TRANSITION_DURATION |
| Página não carrega | Verifique se o servidor está rodando |
| Playlist vazia | Verifique conexão com banco de dados |
| Fullscreen não funciona | Certifique-se que o navegador suporta |
