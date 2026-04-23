# Documentação - Guerra das Metas

Este diretório contém a documentação completa do projeto **Guerra das Metas Dashboard**.

---

## Índice da Documentação

| Documento | Descrição |
|-----------|-----------|
| [README.md](./README.md) | Este arquivo - índice principal |
| [API.md](./API.md) | Referência completa da API REST |
| [BUSCAS.md](./BUSCAS.md) | Guia de buscas e filtros |
| [TV_MODE.md](./TV_MODE.md) | Documentação do modo TV |
| [ESTRUTURA.md](./ESTRUTURA.md) | Estrutura e arquitetura do projeto |

---

## Visão Rápida

### API REST

Para acessar dados programaticamente:

```
GET /api/rankings?type=monthly&year=2026&month=4
GET /api/sectors
GET /api/sectors/{id}
GET /api/champions
```

Consulte [API.md](./API.md) para detalhes completos.

---

### Filtros e Busca

| Parâmetro | Descrição |
|-----------|-----------|
| `type` | `monthly` ou `annual` |
| `year` | Ano (padrão: atual) |
| `month` | Mês 1-12 (padrão: atual) |

Consulte [BUSCAS.md](./BUSCAS.md) para exemplos.

---

### Modo TV

Para apresentações em telas grandes:

1. Ative o modo TV no dashboard
2. A rotação automática inicia
3. Use controles para pausar/navegar

Consulte [TV_MODE.md](./TV_MODE.md) para configuração.

---

### Estrutura do Projeto

```
src/
├── app/           # Rotas e páginas
├── components/    # Componentes React
├── contexts/      # Estado global
├── hooks/         # Custom hooks
└── lib/           # Utilitários e serviços
```

Consulte [ESTRUTURA.md](./ESTRUTURA.md) para detalhes.

---

## Navegação Rápida

### Começando

1. Leia o [README.md](../README.md) principal para visão geral
2. Configure o ambiente seguindo as instruções
3. Explore a [API.md](./API.md) para integração

### Para Desenvolvedores

- [ESTRUTURA.md](./ESTRUTURA.md) - Entender a arquitetura
- [API.md](./API.md) - Endpoints disponíveis
- [TV_MODE.md](./TV_MODE.md) - Modo de apresentação

### Para Usuários

- [BUSCAS.md](./BUSCAS.md) - Como usar filtros
- [TV_MODE.md](./TV_MODE.md) - Modo TV

---

## Atualizações

Esta documentação é mantida junto com o código. Ao fazer alterações significativas no projeto, atualize os documentos correspondentes.
