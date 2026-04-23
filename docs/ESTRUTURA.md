# Estrutura do Projeto - Guerra das Metas

Este documento descreve a arquitetura e estrutura de diretórios do projeto **Guerra das Metas Dashboard**.

---

## Sumário

1. [Visão Geral da Estrutura](#1-visão-geral-da-estrutura)
2. [Diretório src/app](#2-diretório-srcapp)
3. [Diretório src/components](#3-diretório-srccomponents)
4. [Diretório src/lib](#4-diretório-srclib)
5. [Diretório src/contexts](#5-diretório-srccontexts)
6. [Diretório src/hooks](#6-diretório-srchooks)
7. [Diretório src/ai](#7-diretório-srcai)
8. [Módulo de Sincronização](#8-módulo-de-sincronização)
9. [Arquivos de Configuração](#9-arquivos-de-configuração)

---

## 1. Visão Geral da Estrutura

```
guerra_das_metas_dash/
├── src/
│   ├── app/                    # Next.js App Router
│   ├── components/             # Componentes React
│   ├── contexts/               # Contextos React
│   ├── hooks/                  # Custom Hooks
│   ├── lib/                    # Lógica e utilitários
│   └── ai/                    # Google Genkit
├── public/                     # Arquivos estáticos
├── docs/                       # Documentação
├── guerra_das_metas_db/        # Módulo de sincronização
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── apphosting.yaml             # Firebase App Hosting
```

---

## 2. Diretório src/app

Contém as páginas da aplicação usando o **Next.js App Router**.

```
src/app/
├── api/                        # Rotas da API REST
│   ├── rankings/
│   │   └── route.ts           # GET /api/rankings
│   ├── sectors/
│   │   ├── route.ts           # GET /api/sectors
│   │   └── [id]/
│   │       └── route.ts       # GET /api/sectors/[id]
│   └── champions/
│       └── route.ts           # GET /api/champions
├── monthly/                    # Página de ranking mensal
│   └── page.tsx
├── annual/                    # Página de ranking anual
│   └── page.tsx
├── champions/                 # Página Hall da Fama
│   └── page.tsx
├── sector/
│   └── [id]/
│       └── page.tsx           # Página detalhes do setor
├── page.tsx                   # Redireciona para /monthly
├── layout.tsx                 # Layout raiz
└── globals.css                # Estilos globais
```

### 2.1 Arquivo page.tsx (Raiz)

```tsx
// src/app/page.tsx
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/monthly');
}
```

### 2.2 Arquivo layout.tsx

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import { TVModeProvider } from '@/contexts/TVModeContext';

export const metadata: Metadata = {
  title: 'Guerra das Metas',
  description: 'Dashboard de acompanhamento de metas e rankings',
};

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

## 3. Diretório src/components

Contém todos os componentes React do projeto.

```
src/components/
├── guerra/                    # Componentes específicos do projeto
│   ├── GuerraLayout.tsx      # Layout principal
│   ├── GuerraLayoutWrapper.tsx # Wrapper com contexto TV
│   ├── LeaderboardTable.tsx   # Tabela de ranking
│   ├── StatsCard.tsx          # Cartão de estatísticas
│   ├── Topbar.tsx             # Barra superior
│   └── SectorDetail.tsx       # Detalhes do setor
└── ui/                        # Componentes shadcn/ui
    ├── button.tsx
    ├── card.tsx
    ├── table.tsx
    ├── badge.tsx
    └── ...
```

### 3.1 Componentes Principais

#### GuerraLayout.tsx

Layout principal com sidebar e área de conteúdo.

```tsx
// src/components/guerra/GuerraLayout.tsx
interface GuerraLayoutProps {
  children: React.ReactNode;
}

export function GuerraLayout({ children }: GuerraLayoutProps) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Topbar />
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
```

#### LeaderboardTable.tsx

Tabela de classificação dos setores.

```tsx
// src/components/guerra/LeaderboardTable.tsx
interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  highlightTop?: number;
}

export function LeaderboardTable({ entries, highlightTop = 3 }: LeaderboardTableProps) {
  // Renderiza tabela com ranking
}
```

#### StatsCard.tsx

Cartão para exibir estatísticas individuais.

```tsx
// src/components/guerra/StatsCard.tsx
interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
}
```

---

## 4. Diretório src/lib

Contém funções utilitárias e configurações.

```
src/lib/
├── db/                        # Conexão com banco de dados
│   ├── db-service.ts         # Service principal
│   ├── postgres.ts            # Conexão PostgreSQL
│   └── sqlite.ts              # Conexão SQLite local
├── guerra-data/               # Dados e configurações
│   └── sectors.ts            # Configurações de setores
├── utils.ts                   # Funções utilitárias gerais
└── guerra-utils.ts            # Funções específicas do projeto
```

### 4.1 Database Service

```typescript
// src/lib/db/db-service.ts
class DbService {
  // Métodos públicos
  getRankings(type: 'monthly' | 'annual', year?: number, month?: number): Promise<RankingData>;
  getSectors(): Promise<Sector[]>;
  getSectorById(id: string): Promise<SectorDetails | null>;
  getChampions(): Promise<Champions>;
  
  // Métodos internos
  private getMonthlyRankings(year: number, month: number): Promise<RankingData>;
  private getAnnualRankings(year: number): Promise<RankingData>;
  private calculatePoints(entry: LeaderboardEntry): number;
}
```

### 4.2 Tipos de Dados

```typescript
// src/lib/guerra-data/sectors.ts
export interface LeaderboardEntry {
  id: number;
  rank: number;
  name: string;
  target: number;
  realized: number;
  eff: number;
  points: number;
  penalties: number;
  status?: ('verified' | 'rocket')[];
  monthlyWins?: number;
  annualWins?: number;
}

export interface Sector {
  id: number;
  name: string;
}

export interface SectorDetails extends Sector {
  vitoriasMensais: number;
  pontosAnuais: number;
  collaborators: Collaborator[];
}

export interface Collaborator {
  id: string;
  name: string;
  meta: number;
  realizado: number;
}
```

### 4.3 Funções Utilitárias

```typescript
// src/lib/utils.ts
export function formatPercent(value: number): string;
export function getProgressColor(eff: number): string;
export function getStatusIcon(eff: number): 'rocket' | 'verified' | 'warning' | 'danger';
```

---

## 5. Diretório src/contexts

Contém os contextos React para gerenciamento de estado global.

```
src/contexts/
└── TVModeContext.tsx          # Contexto do modo TV
```

### TVModeContext.tsx

```typescript
// src/contexts/TVModeContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface TVModeContextType {
  isTVMode: boolean;
  isPaused: boolean;
  toggleTVMode: () => void;
  togglePause: () => void;
  next: () => void;
  previous: () => void;
}

const TVModeContext = createContext<TVModeContextType | undefined>(undefined);

export function TVModeProvider({ children }: { children: React.ReactNode }) {
  // Implementação...
}

export function useTVMode() {
  const context = useContext(TVModeContext);
  if (context === undefined) {
    throw new Error('useTVMode must be used within a TVModeProvider');
  }
  return context;
}
```

---

## 6. Diretório src/hooks

Contém custom hooks reutilizáveis.

```
src/hooks/
├── use-toast.ts               # Hook de notificações
└── use-mobile.ts              # Hook para detectar mobile
```

### Exemplo de Custom Hook

```typescript
// Exemplo: src/hooks/useRankings.ts
'use client';

import { useState, useEffect } from 'react';

export function useRankings(type: 'monthly' | 'annual', year?: number, month?: number) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const params = new URLSearchParams({ type });
        if (year) params.append('year', year.toString());
        if (month) params.append('month', month.toString());
        
        const response = await fetch(`/api/rankings?${params}`);
        const result = await response.json();
        
        setData(result);
      } catch (e) {
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [type, year, month]);

  return { data, loading, error };
}
```

---

## 7. Diretório src/ai

Contém configurações do Google Genkit para funcionalidades de IA.

```
src/ai/
├── index.ts                   # Configuração principal
├── agents/                    # Agentes de IA
│   └── ...
└── tools/                     # Ferramentas de IA
    └── ...
```

### Configuração do Genkit

```typescript
// src/ai/index.ts
import { genkit } from 'genkit';

export const ai = genkit({
  model: 'googleai/gemini-1.5-flash',
});
```

---

## 8. Módulo de Sincronização

Diretório separado para sincronização de dados.

```
guerra_das_metas_db/
├── index.js                   # Script principal de sincronização
├── package.json               # Dependências do módulo
├── scripts/                   # Scripts auxiliares
│   ├── list_tables.js         # Lista tabelas do banco
│   ├── check_columns.js      # Verifica colunas
│   ├── check_data.js         # Valida dados
│   └── verify_sync_today.js  # Verifica sincronização
├── banco_local.db            # SQLite local
├── banco_sync.db             # Backup de sincronização
└── consolidated_data.json    # Dados consolidados
```

### Fluxo de Sincronização

```
┌──────────────────┐
│   PostgreSQL     │  (134.255.182.159)
│   (Remoto)       │
└────────┬─────────┘
         │
         │ Sincronização
         ↓
┌──────────────────┐
│     SQLite       │  (Local)
│  banco_local.db  │
└────────┬─────────┘
         │
         │ Processamento
         ↓
┌──────────────────┐
│ consolidated_    │
│ data.json        │
└──────────────────┘
```

### Script de Sincronização

```javascript
// guerra_das_metas_db/index.js
const { syncFromPostgres } = require('./lib/sync');
const { processData } = require('./lib/process');

async function main() {
  console.log('Iniciando sincronização...');
  
  // 1. Conectar ao PostgreSQL e buscar dados
  const data = await syncFromPostgres();
  
  // 2. Salvar no SQLite local
  await saveToSQLite(data);
  
  // 3. Gerar dados consolidados
  const consolidated = processData(data);
  
  // 4. Salvar JSON consolidado
  await saveJSON(consolidated);
  
  console.log('Sincronização concluída!');
}

main().catch(console.error);
```

---

## 9. Arquivos de Configuração

### package.json

```json
{
  "name": "guerra-das-metas-dash",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "genkit:dev": "genkit start",
    "genkit:watch": "genkit watch"
  },
  "dependencies": {
    "next": "15.5.9",
    "react": "19.2.1",
    "react-dom": "19.2.1",
    "@radix-ui/react-*": "latest",
    "tailwindcss": "3.4.1",
    "framer-motion": "11.11.11",
    "recharts": "2.15.1",
    "lucide-react": "latest",
    "pg": "latest",
    "better-sqlite3": "latest",
    "genkit": "1.28.0"
  }
}
```

### next.config.ts

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Configurações do Next.js
};

export default nextConfig;
```

### tailwind.config.ts

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## Convenções de Código

### Nomeação de Arquivos

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| Componentes React | PascalCase | `LeaderboardTable.tsx` |
| Hooks | camelCase com `use` | `useRankings.ts` |
| Contextos | PascalCase | `TVModeContext.tsx` |
| Services | camelCase | `db-service.ts` |
| Utilitários | camelCase | `guerra-utils.ts` |
| Tipos | PascalCase | `sectors.ts` |

### Estrutura de Componentes

```tsx
// 1. Imports
import React from 'react';
import { cn } from '@/lib/utils';

// 2. Types/Interfaces
interface ComponentProps {
  className?: string;
}

// 3. Component
export function Component({ className }: ComponentProps) {
  // Hooks (se for client component)
  // State
  // Effects
  // Handlers
  
  // Render
  return (
    <div className={cn('default-class', className)}>
      {/* JSX */}
    </div>
  );
}
```

### Estrutura de Rotas API

```typescript
// src/app/api/endpoint/route.ts
import { NextResponse } from 'next/server';

// GET handler
export async function GET(request: Request) {
  try {
    // 1. Extrair parâmetros
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'monthly';
    
    // 2. Buscar dados
    const data = await dbService.getSomething(type);
    
    // 3. Retornar resposta
    return NextResponse.json(data);
  } catch (error) {
    // 4. Tratar erros
    return NextResponse.json(
      { error: 'Mensagem de erro' },
      { status: 500 }
    );
  }
}
```

---

## Recursos Adicionais

- [Documentação Next.js](https://nextjs.org/docs)
- [Documentação React](https://react.dev)
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
