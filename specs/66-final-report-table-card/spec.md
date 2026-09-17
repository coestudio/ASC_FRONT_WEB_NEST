# SPEC-66 — Wrapper de tabela em `client/final-report`

- **ID:** SPEC-66
- **Nome:** final-report-table-card
- **Status:** IMPLEMENTED
- **Autor:** portal-dev-agent (rascunho, 2026-09-16 — pente fino de UI/UX
  aprovado pelo usuário na sessão, 5 SPECs pequenas isoladas)
- **Área:** `src/routes/_dashboard/client/final-report/index.tsx`
- **Depende de:** nenhuma.

---

## 1. Objetivo

Dar à tabela de `client/final-report` a mesma moldura (sombra/borda) que
`operations-list.tsx`/`CrudListPage` já usam em todas as outras listagens
do projeto, em vez de uma `<Table>` solta sem wrapper.

## 2. Contexto (achados)

- `client/final-report/index.tsx:59` usa `<Table responsive hover
  className="align-middle mb-0">` direto dentro do `PageLayout`, sem
  nenhum wrapper.
- `src/components/operations/operations-list.module.css` (`.tableCard`) e
  `src/components/crud/crud-list-page.module.css` (`.tableCard`) já
  definem o wrapper padrão: `overflow: hidden`, `background:
  var(--surface)`, `border: 1px solid var(--bs-border-color)`,
  `border-radius: var(--bs-border-radius-sm)`, `box-shadow:
  var(--shadow-soft)` — mesmo bloco duplicado nos dois módulos (comentário
  em `operations-list.module.css` já documenta a duplicação proposital,
  para não importar CSS Module privado de outro componente).
- `final-report/index.tsx` não tem CSS Module próprio hoje.

## 3. Escopo

1. Criar `src/routes/_dashboard/client/final-report/final-report.module.css`
   com a classe `.tableCard` (mesmo bloco exato de
   `operations-list.module.css`/`crud-list-page.module.css` — só o wrapper,
   sem as regras de `.crudTable`/`.operationsTable`, que estilizam
   cabeçalho/linha e não se aplicam aqui, já que esta tela usa `<Table>` do
   react-bootstrap sem customização de célula própria).
2. Envolver o `<Table responsive hover ...>` existente com `<div
   className={styles.tableCard}>`.
3. Nenhuma mudança de conteúdo da tabela (colunas, mock, badges de status).

## 4. Fora do escopo

- Adicionar paginação, busca ou qualquer outro recurso de listagem — fora
  do escopo desta SPEC pontual de wrapper visual.
- Migrar `final-report` para consumir `CrudListPage`/dado real do Core —
  já documentado como mock (D2, `specs/09-client-area/spec.md` §8/§13),
  não revisitado aqui.

## 5. Requisitos funcionais

- **RF1** — Tabela de `final-report` envolvida por um wrapper com a mesma
  classe visual `.tableCard` (sombra/borda) usada em
  `operations-list.tsx`/`CrudListPage`.
- **RF2** — Nenhuma mudança de dado/coluna/conteúdo da tabela.

## 6. Não funcionais

- Sem CSS novo além do bloco `.tableCard` já validado em produção nos
  outros dois módulos — cópia exata, nenhum token novo.

## 7. Camada de dados

Não se aplica — página 100% mock (`MOCK_REPORTS`), sem hook/query.

## 8. UI

- Novo CSS Module `final-report.module.css` (nome em inglês, regra 6 do
  AGENTS.md), só com `.tableCard`.
- `final-report/index.tsx`: import do módulo, `<Table>` envolvida pelo
  `<div className={styles.tableCard}>`.

## 9. i18n

Nenhuma chave nova.

## 10. Arquivos esperados

- `src/routes/_dashboard/client/final-report/index.tsx`
- `src/routes/_dashboard/client/final-report/final-report.module.css` (novo)

## 11. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Tabela de `final-report` envolvida por wrapper com sombra/borda (`.tableCard`) |
| CA2 | Nenhuma mudança de dado/coluna da tabela |
| CA3 | `bun run check` + `bun run lint` sem regressão |

## 12. Riscos

Nenhum risco relevante identificado — mudança estrutural isolada numa
única página mock, sem lógica.

## Implementation Notes

- **Arquivos alterados:**
  `src/routes/_dashboard/client/final-report/index.tsx` (novo import +
  wrapper), `src/routes/_dashboard/client/final-report/final-report.module.css`
  (novo, só `.tableCard`).
- **RF1:** `<Table responsive hover ...>` envolvida por `<div
  className={styles.tableCard}>`, mesmo bloco CSS de
  `operations-list.module.css`/`crud-list-page.module.css`.
- **RF2:** nenhuma mudança de coluna/dado/badge — `MOCK_REPORTS` intocado.
- **Comandos executados:**
  - `bun run check` (tsc --noEmit) — **VERIFIED**, sem erros.
  - `bun run lint` — **VERIFIED**, 66 problems (3 errors, 63 warnings),
    idêntico ao baseline — nenhuma regressão.
- **Critérios de aceitação:**

  | # | Critério | Status |
  | --- | --- | --- |
  | CA1 | Tabela envolvida por wrapper com sombra/borda | PASS |
  | CA2 | Nenhuma mudança de dado/coluna | PASS |
  | CA3 | `bun run check` + `bun run lint` sem regressão | PASS |
- **Limitações conhecidas:** validação visual manual não foi feita nesta
  sessão (dev server não iniciado) — recomenda-se checagem visual antes
  do merge.
