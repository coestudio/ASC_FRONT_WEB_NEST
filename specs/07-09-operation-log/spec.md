# SPEC-07-09 — Operações: aba Log (UI-only)

- **ID:** SPEC-07-09
- **Nome:** operation-log
- **Status:** DRAFT
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/routes/.../administrative/operations/$id/log/**` (nova)
- **Depende de:** SPEC-00, SPEC-02 (`mock-data-banner`), SPEC-07-02 (shell
  de abas)

---

## 1. Objetivo

Sub-SPEC extraída da divisão de SPEC-07 (índice geral,
`specs/07-operacoes/spec.md`): aba **Log** — UI-only, histórico de eventos
da operação, dado mockado.

**Real vs UI-only:** 100% UI-only (mock no legado também).

Esta aba é distinta do Log de auditoria genérico
(`/administrative/log`, namespace `administrative-log`) que tinha uma SPEC
própria (SPEC-06, **cancelada** — mockup sem API real deixou de fazer
sentido) — aqui é o histórico de eventos **de uma operação específica**
(`/administrative/operations/$id/log`, namespace
`administrative-operations`). Sem colisão de rota/nav/i18n; só cuidado na
UI pra não confundir os dois conceitos (ex.: rotular como "Log da
Operação" vs. "Log de Auditoria").

## 2. Contexto

Legado: aba "Log" mock, usa `OPERATIONS` de `data.ts`.

Achado da revisão (não incorporado nesta SPEC, registrado como nota):
`cargoUnitEventDTO` (paginado, `/api/operation/{id}/cargo/**`) é um
recurso real de eventos que o Core já expõe e que **poderia** alimentar
esta aba no lugar do mock — mesmo raciocínio já aplicado ao Responsável
(SPEC-07-08, D1). Decisão adiada por enquanto (ver §4/§13 da
`specs/07-operacoes/spec.md`, índice geral) — fica fora do escopo desta
SPEC, candidato a SPEC futura.

## 3. Escopo

1. `operations/$id/log/index.tsx` — UI-only, dado mockado local,
   `mock-data-banner` (SPEC-02) visível no topo.

## 4. Fora do escopo

- Consumir `cargoUnitEventDTO` como fonte real (decisão adiada, ver §2).
- Conteúdo das demais abas.

## 5. Requisitos funcionais

- **RF1** — Dado mockado local, comentado como tal, com `mock-data-banner`
  visível — nunca disfarçado de real.
- **RF2** — Nenhuma chamada de rede fingindo ser real.
- **RF3** — Sem silent-fail (herda RF2 da SPEC-07-02).

## 6. Requisitos não funcionais

- RNF1 — `bun run check` + `lint` passam.

## 7. Contrato de rota

| Rota | Dado |
| --- | --- |
| `/administrative/operations/$id/log` | UI-only |

## 8. Camada de dados

Nenhuma — array local tipado no componente (mesmo padrão da SPEC-05).

## 9. Desenho

```
src/routes/.../administrative/operations/$id/
  log/index.tsx             (UI-only, com mock-data-banner)
```

## 10. Arquivos esperados

| Arquivo | Ação |
| --- | --- |
| `src/routes/.../administrative/operations/$id/log/index.tsx` | criar |
| `src/i18n/dictionaries/*/administrative-operations.json` | editar — adicionar chaves da aba Log |

## 11. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Aba claramente marcada como mock, sem chamada real |
| CA2 | `bun run check` + `lint` passam |

## 12. Riscos

Nenhum específico além dos já cobertos pelo índice geral.

## 13. Decisões pendentes

Nenhuma.

---

**Próximo passo:** `APROVAR SPEC-07-09`.
