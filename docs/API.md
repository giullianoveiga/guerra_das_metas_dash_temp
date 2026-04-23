# API Reference - Guerra das Metas

Este documento descreve todas as APIs REST disponíveis no **Guerra das Metas Dashboard**.

---

## Sumário

1. [Rankings API](#1-rankings-api)
2. [Sectors API](#2-sectors-api)
3. [Champions API](#3-champions-api)
4. [Schemas de Dados](#4-schemas-de-dados)
5. [Exemplos de Uso](#5-exemplos-de-uso)
6. [Códigos de Erro](#6-códigos-de-erro)

---

## 1. Rankings API

Retorna dados de ranking para rankings mensais ou anuais de todos os setores.

### Endpoint

```
GET /api/rankings
```

### Parâmetros de Query

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|-----------|------|-------------|--------|-----------|
| `type` | string | Não | `"monthly"` | Tipo de ranking: `"monthly"` ou `"annual"` |
| `year` | number | Não | Ano atual | Ano para o ranking |
| `month` | number | Não | Mês atual | Mês para ranking mensal (1-12) |

### Requisição

```http
GET /api/rankings?type=monthly&year=2026&month=4
```

### Lógica de Cálculo (Importante)

O sistema diferencia entre **meta fixa** e **realizado acumulado**:

| Campo | Descrição | Cálculo no Banco |
|-------|-----------|------------------|
| `target` (Meta) | Valor da meta mensal - **FIXO durante todo o mês** | `MAX(goal_value)` - Pega o valor único da meta |
| `realized` (Realizado) | Valor acumulado no mês - **SOMA de todos os dias** | `SUM(realized_value)` - Soma todos os registros diários |
| `eff` (Eficiência) | Percentual atingido | `(realized / target) × 100` |

#### Exemplo SQL

```sql
SELECT 
  sector_id,
  sector as name,
  MAX(goal_value) as target,           -- Meta Fixa (não somar!)
  SUM(realized_value) as realized      -- Realizado acumulado (somar)
FROM sectors s
LEFT JOIN performance_subsectors ps ON ...
GROUP BY sector_id, sector
```

### Resposta de Sucesso (200)

#### Ranking Mensal

```json
{
  "id": "mensal_2026_4",
  "tipo": "mensal",
  "ano": 2026,
  "mes": 4,
  "periodoRotulo": "Abril 2026",
  "entradas": [
    {
      "id": 1,
      "rank": 1,
      "name": "ANALISE",
      "target": 100,
      "realized": 115,
      "eff": 115.0,
      "points": 138.0,
      "penalties": 0,
      "status": ["verified", "rocket"],
      "monthlyWins": 2,
      "annualWins": 2
    }
  ],
  "destaqueSetorElite": {
    "nome": "ANALISE",
    "eficiencia": 115.0,
    "metaAlvo": 100,
    "realized": 115
  }
}
```

#### Ranking Anual

O ranking anual é baseado em **vitórias mensais**, não em valores absolutos:

| Campo | Descrição |
|-------|-----------|
| `target` | Sempre 0 (não aplicável) |
| `realized` | Soma do realizado de todos os meses |
| `eff` | Média das eficiências mensais |
| `points` | Número de vitórias × 10 |
| `annualWins` | Total de vitórias no ano |

```json
{
  "id": "anual_2026",
  "tipo": "anual",
  "ano": 2026,
  "periodoRotulo": "Ano 2026",
  "entradas": [
    {
      "id": 1,
      "rank": 1,
      "name": "ANALISE",
      "target": 0,
      "realized": 460,
      "eff": 105.8,
      "points": 30,
      "penalties": 0,
      "status": ["verified"],
      "monthlyWins": 2,
      "annualWins": 3
    }
  ],
  "destaqueSetorElite": {
    "nome": "ANALISE",
    "eficiencia": 105.8,
    "metaAlvo": 0,
    "realized": 460
  }
}
```

### Cálculo de Pontos

#### Ranking Mensal
```
pontos = eficiência × 1.2
```

#### Ranking Anual
```
pontos = número de vitórias mensais × 10
```

### Status das Entradas

| Status | Condição | Descrição |
|--------|----------|-----------|
| `verified` | eficiência >= 100% | Meta atingida ou superada |
| `rocket` | eficiência > 105% | Desempenho excepcional (superou 105%) |

---

## 2. Sectors API

### 2.1 Listar Setores

Retorna uma lista de todos os setores cadastrados.

#### Endpoint

```
GET /api/sectors
```

#### Parâmetros de Query

Nenhum.

#### Requisição

```http
GET /api/sectors
```

#### Resposta de Sucesso (200)

```json
{
  "sectors": [
    { "id": 1, "name": "ACOMPANHAMENTO" },
    { "id": 2, "name": "ACORDOS" },
    { "id": 3, "name": "ANALISE" },
    { "id": 4, "name": "BACKOFFICE" },
    { "id": 5, "name": "CALLCENTER" },
    { "id": 6, "name": "CARTAO" },
    { "id": 7, "name": "CASCATA" },
    { "id": 8, "name": "CONTAS A PAGAR" },
    { "id": 9, "name": "CONTAS A RECEBER" },
    { "id": 10, "name": "CONTABILIDADE" }
  ]
}
```

---

### 2.2 Detalhes de Setor

Retorna informações detalhadas de um setor específico, incluindo colaboradores.

#### Endpoint

```
GET /api/sectors/[id]
```

#### Parâmetros de URL

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | string | ID numérico do setor ou nome (case-insensitive) |

#### Requisição

```http
GET /api/sectors/1
GET /api/sectors/ANALISE
GET /api/sectors/analise
```

#### Resposta de Sucesso (200)

```json
{
  "sector": {
    "id": 3,
    "name": "ANALISE",
    "vitoriasMensais": 2,
    "pontosAnuais": 30
  },
  "collaborators": [
    {
      "id": "usr_001",
      "name": "João Silva",
      "meta": 100,
      "realizado": 115
    },
    {
      "id": "usr_002",
      "name": "Maria Santos",
      "meta": 100,
      "realizado": 108
    }
  ]
}
```

#### Resposta de Erro (404)

```json
{
  "error": "Setor não encontrado"
}
```

---

## 3. Champions API

Retorna os campeões do mês atual e do ano.

#### Endpoint

```
GET /api/champions
```

#### Parâmetros de Query

Nenhum.

#### Requisição

```http
GET /api/champions
```

#### Resposta de Sucesso (200)

```json
{
  "mensal": {
    "setorId": "3",
    "nome": "ANALISE",
    "eficiencia": 112.5,
    "pontos": 1350
  },
  "anual": {
    "setorId": "3",
    "nome": "ANALISE",
    "eficiencia": 105.8,
    "pontos": 30
  }
}
```

#### Descrição dos Campos

| Campo | Descrição |
|-------|-----------|
| `mensal` | Melhor setor do mês anterior |
| `anual` | Melhor setor do ano (por vitórias acumuladas) |
| `setorId` | ID do setor |
| `nome` | Nome do setor |
| `eficiencia` | Percentual de eficiência |
| `pontos` | Pontos calculados |

---

## 4. Schemas de Dados

### 4.1 LeaderboardEntry

```typescript
interface LeaderboardEntry {
  id: number;                    // ID do setor
  rank: number;                  // Posição no ranking (1 = primeiro lugar)
  name: string;                  // Nome do setor
  target: number;                // Meta do período
  realized: number;              // Valor realizado
  eff: number;                   // Eficiência percentual (realized/target × 100)
  points: number;                // Pontos calculados
  penalties: number;              // Penalidades aplicadas
  status?: ('verified' | 'rocket')[];  // Status de desempenho
  monthlyWins?: number;          // Vitórias mensais acumuladas
  annualWins?: number;           // Vitórias anuais
}
```

### 4.2 Sector

```typescript
interface Sector {
  id: number;                    // ID único do setor
  name: string;                  // Nome do setor
  vitoriasMensais?: number;      // Número de vitórias mensais
  pontosAnuais?: number;         // Pontos acumulados no ano
}
```

### 4.3 Collaborator

```typescript
interface Collaborator {
  id: string;                    // ID do colaborador
  name: string;                  // Nome completo
  meta: number;                  // Meta individual
  realizado: number;             // Valor realizado
}
```

### 4.4 Champion

```typescript
interface Champion {
  setorId: string;               // ID do setor campeão
  nome: string;                  // Nome do setor
  eficiencia: number;            // Eficiência percentual
  pontos: number;                // Pontuação total
}
```

### 4.5 DestaqueSetorElite

```typescript
interface DestaqueSetorElite {
  nome: string;                  // Nome do setor
  eficiencia: number;           // Eficiência percentual
  metaAlvo: number;              // Meta-alvo do período
  realized: number;              // Valor realizado
}
```

---

## 5. Exemplos de Uso

### 5.1 JavaScript (fetch)

```javascript
// Buscar ranking mensal
const monthlyRanking = await fetch('/api/rankings?type=monthly');
const monthlyData = await monthlyRanking.json();

// Buscar ranking anual
const annualRanking = await fetch('/api/rankings?type=annual&year=2026');
const annualData = await annualRanking.json();

// Buscar todos os setores
const sectors = await fetch('/api/sectors');
const sectorsData = await sectors.json();

// Buscar detalhes de um setor
const sectorDetails = await fetch('/api/sectors/3');
const sector = await sectorDetails.json();

// Buscar campeões
const champions = await fetch('/api/champions');
const championsData = await champions.json();
```

### 5.2 cURL

```bash
# Ranking mensal
curl "http://localhost:3000/api/rankings?type=monthly&year=2026&month=4"

# Ranking anual
curl "http://localhost:3000/api/rankings?type=annual&year=2026"

# Listar setores
curl "http://localhost:3000/api/sectors"

# Detalhes do setor
curl "http://localhost:3000/api/sectors/1"

# Campeões
curl "http://localhost:3000/api/champions"
```

### 5.3 Python (requests)

```python
import requests

# Buscar ranking mensal
monthly = requests.get(
    'http://localhost:3000/api/rankings',
    params={'type': 'monthly', 'year': 2026, 'month': 4}
).json()

# Buscar setor específico
sector = requests.get(
    'http://localhost:3000/api/sectors/ANALISE'
).json()

# Listar todos os setores
sectors = requests.get(
    'http://localhost:3000/api/sectors'
).json()
```

### 5.4 React Hook Customizado

```typescript
// hooks/useRankings.ts
import { useState, useEffect } from 'react';

interface RankingData {
  id: string;
  tipo: 'mensal' | 'anual';
  ano: number;
  periodoRotulo: string;
  entradas: LeaderboardEntry[];
  destaqueSetorElite: DestaqueSetorElite | null;
}

export function useRankings(type: 'monthly' | 'annual', year?: number, month?: number) {
  const [data, setData] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams({ type });
        if (year) params.append('year', year.toString());
        if (month) params.append('month', month.toString());
        
        const response = await fetch(`/api/rankings?${params}`);
        if (!response.ok) throw new Error('Failed to fetch');
        
        setData(await response.json());
      } catch (e) {
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [type, year, month]);

  return { data, loading, error };
}
```

---

## 6. Códigos de Erro

### HTTP Status Codes

| Código | Descrição | Causa Comum |
|--------|-----------|-------------|
| 200 | OK | Requisição bem-sucedida |
| 400 | Bad Request | Parâmetros inválidos |
| 404 | Not Found | Recurso não encontrado |
| 500 | Internal Server Error | Erro no servidor |

### Mensagens de Erro

```json
{
  "error": "Setor não encontrado"
}
```

```json
{
  "error": "Parâmetros inválidos"
}
```

---

## Rate Limiting

Atualmente, não há rate limiting implementado. Para ambiente de produção, considere adicionar cache ou limitação de requisições.

## Cache

Os dados são sincronizados do PostgreSQL para SQLite periodicamente. Para dados em tempo real, execute a sincronização antes de acessar a API.

## Autenticação

Esta API é pública e não requer autenticação. Para ambiente de produção, implemente autenticação adequada se necessário.
