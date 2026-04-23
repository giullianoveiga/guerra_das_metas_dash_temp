# Busca e Filtros - Guerra das Metas

Este documento descreve todas as opções de busca e filtragem disponíveis no **Guerra das Metas Dashboard**.

---

## Sumário

1. [Filtros de Rankings](#1-filtros-de-rankings)
2. [Navegação por Setores](#2-navegação-por-setores)
3. [Parâmetros de URL](#3-parâmetros-de-url)
4. [Filtros de Data](#4-filtros-de-data)
5. [Lógica de Cálculo](#5-lógica-de-cálculo)
6. [Filtros de Visualização](#6-filtros-de-visualização)
7. [Exemplos de Combinação](#7-exemplos-de-combinação)

---

## 1. Filtros de Rankings

### 1.1 Tipo de Ranking

Alterne entre ranking mensal e anual para visualização de dados.

#### Parâmetros

| Parâmetro | Valores | Padrão | Descrição |
|-----------|---------|--------|-----------|
| `type` | `monthly` \| `annual` | `monthly` | Tipo de ranking |

#### Uso na API

```
GET /api/rankings?type=monthly   # Ranking mensal
GET /api/rankings?type=annual     # Ranking anual
```

#### Uso no Frontend

- Navegue para `/monthly` para ranking mensal
- Navegue para `/annual` para ranking anual

---

### 1.2 Seleção de Período

Filtre rankings por ano e mês específicos.

#### Parâmetros

| Parâmetro | Tipo | Valores | Padrão | Descrição |
|-----------|------|---------|--------|-----------|
| `year` | number | 2020-2099 | Ano atual | Ano do ranking |
| `month` | number | 1-12 | Mês atual | Mês do ranking |

#### Uso na API

```
GET /api/rankings?year=2026&month=4      # Abril de 2026
GET /api/rankings?year=2025&month=12    # Dezembro de 2025
GET /api/rankings?year=2026             # Ano de 2026 (anual)
```

#### Uso no Frontend

O seletor de período está disponível na barra superior do dashboard.

---

### 1.3 Status de Desempenho

Identifique setores por seu status de desempenho.

#### Status Disponíveis

| Status | Condição | Ícone | Cor |
|--------|----------|-------|-----|
| `rocket` | Eficiência > 105% | 🚀 | Verde vibrante |
| `verified` | Eficiência >= 100% | ✅ | Verde |
| `warning` | Eficiência entre 80-99% | ⚠️ | Amarelo |
| `danger` | Eficiência < 80% | ❌ | Vermelho |

#### Cálculo

```typescript
const status = (eff: number) => {
  if (eff > 105) return 'rocket';
  if (eff >= 100) return 'verified';
  if (eff >= 80) return 'warning';
  return 'danger';
};
```

---

## 2. Navegação por Setores

### 2.1 Acesso Direto por ID

Acesse detalhes de um setor específico usando seu ID.

#### Endpoint

```
GET /api/sectors/[id]
```

#### Exemplos

```
GET /api/sectors/1              # Setor com ID 1
GET /api/sectors/2              # Setor com ID 2
```

#### URL do Frontend

```
/sector/1    # Detalhes do setor com ID 1
/sector/2    # Detalhes do setor com ID 2
```

---

### 2.2 Acesso por Nome

Acesse setores usando seu nome (case-insensitive).

#### Endpoint

```
GET /api/sectors/{nome}
```

#### Exemplos

```
GET /api/sectors/ANALISE         # Setor ANALISE
GET /api/sectors/analise        # Mesmo resultado (case-insensitive)
GET /api/sectors/CallCenter     # Setor CALL CENTER
```

#### URL do Frontend

```
/sector/ANALISE
```

---

### 2.3 Listagem de Setores

Obtenha todos os setores disponíveis.

#### Endpoint

```
GET /api/sectors
```

#### Resposta

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

## 3. Parâmetros de URL

### 3.1 Parâmetros Suportados

| Parâmetro | Página | Descrição |
|-----------|--------|-----------|
| `type` | Rankings | `monthly` ou `annual` |
| `year` | Rankings | Ano do período |
| `month` | Rankings | Mês do período |
| `id` | Sector | ID ou nome do setor |

### 3.2 Padrões

| Parâmetro | Valor Padrão |
|-----------|-------------|
| `type` | `monthly` |
| `year` | Ano atual do sistema |
| `month` | Mês atual do sistema |

### 3.3 Exemplos de URLs Completas

```
https://app.com/monthly                        # Padrão: mês/ano atual
https://app.com/monthly?year=2026&month=4      # Abril 2026
https://app.com/annual?year=2026               # Ano 2026
https://app.com/sector/3                       # Setor ID 3
https://app.com/sector/ANALISE                 # Setor ANALISE
```

---

## 5. Lógica de Cálculo

### 5.1 Meta vs Realizado

É fundamental entender a diferença entre **meta** e **realizado**:

| Conceito | Descrição | Cálculo |
|----------|-----------|---------|
| **Meta (`goal_value`)** | Valor-alvo **fixo** estabelecido para o mês | Não é somada - usa-se `MAX()` ou valor único |
| **Realizado (`realized_value`)** | Valor acumulado ao longo do mês | **SOMA** de todos os registros diários |

### 5.2 Exemplo Prático

Imagine que um setor tem a meta de 100 unidades para Abril/2026:

```
Dia 01/04: Realizado = 5  → Registrado no banco
Dia 02/04: Realizado = 8  → Registrado no banco
...
Dia 30/04: Realizado = 12 → Registrado no banco

Total Realizado (soma): 5 + 8 + ... + 12 = 115 unidades
Meta Fixa: 100 unidades
Eficiência: (115 / 100) × 100 = 115%
```

### 5.3 Cálculo da Eficiência

```typescript
const eficiencia = (realizado / meta) * 100;

// Exemplos:
// Meta: 100, Realizado: 115 → Eficiência: 115%
// Meta: 100, Realizado: 95  → Eficiência: 95%
// Meta: 100, Realizado: 100 → Eficiência: 100%
```

### 5.4 Tabelas Envolvidas

| Tabela | Descrição | Colunas Relevantes |
|--------|-----------|-------------------|
| `performance_subsectors` | Performance por sub-setor | `goal_value`, `realized_value`, `ref_date` |
| `performance_users` | Performance por usuário | `goal_value`, `realized_value`, `ref_date` |

### 5.5 Query SQL de Referência

```sql
-- Para rankings mensais de setores
SELECT 
  s.sector_id,
  s.sector,
  MAX(ps.goal_value) as target,        -- Meta FIXA (MAX, não SUM)
  SUM(ps.realized_value) as realized   -- Realizado ACUMULADO (SUM)
FROM sectors s
LEFT JOIN performance_subsectors ps 
  ON ps.subsector_id IN (
    SELECT subsector_id FROM subsectors WHERE sector_id = s.sector_id
  ) AND TO_CHAR(ps.ref_date, 'YYYY-MM') = '2026-04'
GROUP BY s.sector_id, s.sector;
```

---

## 6. Filtros de Visualização

### 6.1 Modo de Exibição

O dashboard oferece diferentes modos de visualização:

| Modo | Descrição | Uso |
|------|-----------|-----|
| `default` | Visualização interativa | Navegação normal |
| `tv` | Modo apresentação | Telas grandes |

---

### 6.2 Colunas da Tabela

A tabela de ranking inclui as seguintes colunas:

| Coluna | Descrição | Ordenável |
|--------|-----------|-----------|
| Posição | Ranking ordinal (1°, 2°, 3°...) | Sim |
| Setor | Nome do setor | Sim |
| Meta | Meta do período | Sim |
| Realizado | Valor atingido | Sim |
| Eficiência | % realizado/metas | Sim |
| Pontos | Pontuação calculada | Sim |
| Status | Indicador visual | Não |

---

### 6.3 Ordenação

As colunas podem ser ordenadas clicando no cabeçalho:

```
Posição ↑      Setor ↑      Meta ↑      Realizado ↑      Eficiência ↑      Pontos
```

---

## 7. Exemplos de Combinação

### 6.1 Ranking Mensal Específico

```javascript
// Buscar ranking de Janeiro de 2026
const response = await fetch(
  '/api/rankings?type=monthly&year=2026&month=1'
);
```

### 6.2 Todos os Rankings Mensais de um Ano

```javascript
// Buscar todos os meses de 2026
for (let month = 1; month <= 12; month++) {
  const response = await fetch(
    `/api/rankings?type=monthly&year=2026&month=${month}`
  );
  const data = await response.json();
  console.log(`${data.periodoRotulo}:`, data.entradas);
}
```

### 6.3 Comparação Entre Setores

```javascript
// CompararANALISE e ACORDOS
const [analise, acordos] = await Promise.all([
  fetch('/api/sectors/ANALISE').then(r => r.json()),
  fetch('/api/sectors/ACORDOS').then(r => r.json())
]);

console.log('ANALISE:', analise.sector);
console.log('ACORDOS:', acordos.sector);
```

### 6.4 Buscar Top 3 de Cada Mês

```javascript
const response = await fetch(
  '/api/rankings?type=monthly&year=2026&month=4'
);
const data = await response.json();

const top3 = data.entradas
  .sort((a, b) => b.points - a.points)
  .slice(0, 3);

top3.forEach((sector, index) => {
  console.log(`${index + 1}° lugar: ${sector.name}`);
});
```

### 6.5 Filtrar Setores com Alto Desempenho

```javascript
const response = await fetch(
  '/api/rankings?type=monthly&year=2026&month=4'
);
const data = await response.json();

// Setores com eficiência > 100%
const highPerformers = data.entradas.filter(
  entry => entry.eff >= 100
);

// Setores com eficiência > 105% (rocket)
const rockets = data.entradas.filter(
  entry => entry.eff > 105
);
```

### 6.6 Dashboard Completo com React

```tsx
import { useRankings } from '@/hooks/useRankings';

interface DashboardProps {
  year: number;
  month: number;
}

export function Dashboard({ year, month }: DashboardProps) {
  const { data, loading, error } = useRankings('monthly', year, month);

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro ao carregar dados</div>;
  if (!data) return null;

  return (
    <div>
      <h1>{data.periodoRotulo}</h1>
      <table>
        <thead>
          <tr>
            <th>Posição</th>
            <th>Setor</th>
            <th>Eficiência</th>
            <th>Pontos</th>
          </tr>
        </thead>
        <tbody>
          {data.entradas.map(entry => (
            <tr key={entry.id}>
              <td>{entry.rank}°</td>
              <td>{entry.name}</td>
              <td>{entry.eff}%</td>
              <td>{entry.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Próximos Passos

Para adicionar funcionalidades de busca mais avançadas, considere implementar:

1. **Busca por texto** - Filtrar setores por nome
2. **Filtros compostos** - Múltiplos critérios simultâneos
3. **Busca fuzzy** - Correspondência aproximada
4. **Histórico de mudanças** - Rastrear variações ao longo do tempo
