# SPEC-62 — Unificar `.soft-card` nas abas do shell de Operação

- **ID:** SPEC-62
- **Nome:** operation-tabs-soft-card
- **Status:** IMPLEMENTED
- **Autor:** portal-dev-agent (rascunho, 2026-09-16 — pente fino de UI/UX
  aprovado pelo usuário na sessão, 5 SPECs pequenas isoladas)
- **Área:** `src/components/operations/tabs/{Reports,Responsible,Documents,Occurrences}.tsx`
- **Depende de:** SPEC-56 (`surface-border-tokens`) — já `IMPLEMENTED`,
  `.soft-card` definida em `src/styles/globals/base.css`.

---

## 1. Objetivo

Dar consistência estrutural às abas do shell de detalhe de Operação: hoje
`Details.tsx` (SPEC-33) e `Log.tsx` (SPEC-57) já usam `.soft-card` para
agrupar conteúdo, mas `Reports.tsx`, `Responsible.tsx`, `Documents.tsx` e
`Occurrences.tsx` usam `<Card>` cru do react-bootstrap ou nenhum wrapper —
visualmente destoante dentro da mesma navegação por abas.

## 2. Contexto (achados)

- `Reports.tsx:101` — cada relatório é um `<Card>` do react-bootstrap
  (borda/sombra default do Bootstrap, não os tokens `--surface`/
  `--shadow-soft` que `.soft-card` usa).
- `Responsible.tsx:282-322` — cada responsável vinculado é um `<Card body>`
  do react-bootstrap, mesma disparidade.
- `Documents.tsx:181-249` — a tabela de documentos não tem nenhum wrapper
  (`<div className="table-responsive"><Table>`), sem moldura.
- `Occurrences.tsx:150-184` — mesma situação de `Documents.tsx`, tabela sem
  wrapper.
- `Details.tsx:101,129,157,185` e `Log.tsx:98` já usam `className="soft-card p-4"`
  (Details) e `className="soft-card p-3"` (Log, item de lista) — o padrão
  alvo já existe e está em produção.

## 3. Escopo

1. `Reports.tsx` — trocar `<Card>`/`<Card.Body>` de cada relatório por
   `<div className="soft-card p-3">` (mantendo o mesmo conteúdo interno:
   ícone, título, descrição, botão de gerar), padding `p-3` por ser um item
   de lista compacto (mesmo padding usado pelo item de `Log.tsx`).
2. `Responsible.tsx` — trocar `<Card body>` de cada linha de responsável
   vinculado por `<div className="soft-card p-3">` com as mesmas classes de
   flex já aplicadas hoje (`d-flex flex-row flex-wrap align-items-center gap-3`).
3. `Documents.tsx` — envolver o `<Table>` (dentro do `table-responsive`
   existente) num wrapper `<div className="soft-card">` (sem padding — a
   tabela já tem seu próprio espaçamento interno de célula), igual ao
   `.tableCard` de `operations-list.tsx`/`crud-list-page.tsx` mas reusando
   a classe utilitária genérica `.soft-card` (já suficiente para o efeito de
   moldura pedido — sem CSS novo).
4. `Occurrences.tsx` — mesma mudança do item 3, wrapper `.soft-card` ao redor
   da tabela.
5. Nenhuma mudança de cor/paleta/token — só a troca do wrapper estrutural.

## 4. Fora do escopo

- Unificação das ações de linha para `CrudRowActions` (`Documents.tsx`,
  `Occurrences.tsx`) — SPEC-63.
- Qualquer mudança em `.soft-card` (CSS) em si — já fechada na SPEC-56.
- Qualquer redesign de conteúdo interno dos itens (textos, ícones, ordem de
  campos) além da troca do wrapper.

## 5. Requisitos funcionais

- **RF1** — `Reports.tsx`: cada item de relatório usa `.soft-card p-3` no
  lugar de `<Card>`.
- **RF2** — `Responsible.tsx`: cada linha de responsável vinculado usa
  `.soft-card p-3` no lugar de `<Card body>`.
- **RF3** — `Documents.tsx`: tabela envolvida por `.soft-card` (wrapper
  externo ao `table-responsive`).
- **RF4** — `Occurrences.tsx`: tabela envolvida por `.soft-card` (mesmo
  padrão de RF3).
- **RF5** — Nenhuma classe/token de cor nova introduzida — só troca de
  wrapper estrutural (`Card` → `div.soft-card`).

## 6. Não funcionais

- Sem quebra de comportamento (loading/error/empty states) das 4 abas —
  só o wrapper visual muda.
- Sem novo CSS Module — reusa `.soft-card` de `src/styles/globals/base.css`
  (já global, sem import extra necessário).

## 7. Camada de dados

Não se aplica — mudança puramente de apresentação, nenhum hook/query
tocado.

## 8. UI

- `Reports.tsx`: `<div className="soft-card p-3">` substituindo
  `<Card><Card.Body className="...">`. `Card.Title`/`Card.Text` viram
  `<div>`/`<p>` simples (react-bootstrap `Card.Title`/`Card.Text` só
  aplicam margin/font-size utilitário, reproduzido com classes Bootstrap
  puras: `mb-1 h6` e `text-body-secondary mb-0 small`).
- `Responsible.tsx`: `<Card body className="...">` vira
  `<div className="soft-card p-3 d-flex flex-row flex-wrap align-items-center gap-3">`.
- `Documents.tsx`/`Occurrences.tsx`: `<div className="table-responsive">`
  ganha um `<div className="soft-card">` externo (ou o `table-responsive`
  ganha a classe `soft-card` diretamente, o que for mais simples sem
  duplicar wrapper — decisão de implementação, sem impacto visual).

## 9. i18n

Nenhuma chave nova — mudança estrutural, sem novo texto.

## 10. Arquivos esperados

- `src/components/operations/tabs/Reports.tsx`
- `src/components/operations/tabs/Responsible.tsx`
- `src/components/operations/tabs/Documents.tsx`
- `src/components/operations/tabs/Occurrences.tsx`

## 11. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | `Reports.tsx` usa `.soft-card` em vez de `<Card>` do react-bootstrap |
| CA2 | `Responsible.tsx` usa `.soft-card` em vez de `<Card body>` |
| CA3 | `Documents.tsx` envolve a tabela num wrapper `.soft-card` |
| CA4 | `Occurrences.tsx` envolve a tabela num wrapper `.soft-card` |
| CA5 | Nenhuma mudança de cor/token — só estrutura |
| CA6 | `bun run check` + `bun run lint` sem regressão |

## 12. Riscos

- **R1** — `Card` do react-bootstrap injeta `overflow: hidden` via classe
  `.card` em alguns temas; ao trocar para `div.soft-card` sem essa regra,
  conteúdo interno que dependia do recorte automático (não identificado
  nos 4 arquivos lidos) poderia vazar visualmente — mitigado por revisão
  visual pontual durante a implementação.

## Implementation Notes

- **Arquivos alterados:** `src/components/operations/tabs/Reports.tsx`,
  `Responsible.tsx`, `Documents.tsx`, `Occurrences.tsx`.
- **RF1:** `Reports.tsx` — `<Card>`/`<Card.Body>` trocados por
  `<div className="soft-card p-3 d-flex ...">`; `Card.Title`/`Card.Text`
  viraram `<div className="mb-1 h6">`/`<p className="text-body-secondary mb-0 small">`.
- **RF2:** `Responsible.tsx` — `<Card body>` trocado por
  `<div className="soft-card p-3 d-flex flex-row flex-wrap align-items-center gap-3">`,
  mantendo as mesmas classes de flex já existentes.
- **RF3/RF4:** `Documents.tsx`/`Occurrences.tsx` — `<div
  className="table-responsive">` ganhou a classe `soft-card` adicional
  (`className="soft-card table-responsive"`), sem novo wrapper aninhado.
- **Decisão de implementação:** não foi necessário criar wrapper extra em
  `Documents.tsx`/`Occurrences.tsx` — bastou adicionar a classe `soft-card`
  na `div.table-responsive` já existente (§8 da spec já previa essa opção
  como mais simples).
- **Comandos executados:**
  - `bun run check` (tsc --noEmit) — **VERIFIED**, sem erros.
  - `bun run lint` — **VERIFIED**, 66 problems (3 errors, 63 warnings),
    idêntico ao baseline pré-existente (`session.server.ts`/`ui-prefs.tsx`)
    — nenhuma regressão introduzida.
- **Critérios de aceitação:**

  | # | Critério | Status |
  | --- | --- | --- |
  | CA1 | `Reports.tsx` usa `.soft-card` | PASS |
  | CA2 | `Responsible.tsx` usa `.soft-card` | PASS |
  | CA3 | `Documents.tsx` envolve a tabela em `.soft-card` | PASS |
  | CA4 | `Occurrences.tsx` envolve a tabela em `.soft-card` | PASS |
  | CA5 | Nenhuma mudança de cor/token | PASS |
  | CA6 | `bun run check` + `bun run lint` sem regressão | PASS |
- **Limitações conhecidas:** validação visual manual (screenshot) não foi
  feita nesta sessão (dev server não iniciado) — mudança é de baixo risco
  (troca de wrapper já usado em produção em `Details.tsx`/`Log.tsx`),
  recomenda-se checagem visual antes do merge final da branch.
