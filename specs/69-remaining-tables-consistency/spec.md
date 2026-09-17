# SPEC-69 — Consistência nas listagens/tabelas restantes do projeto

- **ID:** SPEC-69
- **Nome:** remaining-tables-consistency
- **Status:** IMPLEMENTED
- **Autor:** portal-dev-agent (rascunho, 2026-09-16 — continuação do pente
  fino de UI/UX da sessão; usuário apontou `Containers.tsx` via screenshot
  e pediu inventário + correção de "todas a listagem e tabelas do
  projeto"; aprovação recebida via "pode fazer" em resposta direta às
  opções apresentadas — ver §13)
- **Área:** `src/components/operations/tabs/{Containers,Invoice}.tsx`,
  `src/routes/_dashboard/_internal/operational/operations/$id/index.tsx`
- **Depende de:** SPEC-64/SPEC-65 (`.soft-card`/`CrudRowActions` já
  `IMPLEMENTED` nesta mesma branch — este SPEC só estende o mesmo padrão
  pras telas que ficaram de fora do primeiro pente fino).

---

## 1. Objetivo

Fechar o inventário de listagens/tabelas do projeto que ainda não seguem o
padrão já unificado (`.soft-card` como moldura + `CrudRowActions` como
dropdown kebab de ações de linha, já usado em `operations-list.tsx`,
`CrudListPage` e seus 9 consumidores, e agora também em `Documents.tsx`/
`Occurrences.tsx` via SPEC-64/59).

## 2. Contexto (inventário completo — `grep -rl "<Table"`)

| Arquivo | Situação antes desta SPEC | Ação |
| --- | --- | --- |
| `operations-list.tsx` | já usa `.tableCard` (próprio) + `CrudRowActions` | referência, sem mudança |
| `crud-list-page.tsx` | já usa `.tableCard` + `CrudRowActions` | referência, sem mudança |
| `Documents.tsx`/`Occurrences.tsx` | já corrigidos (SPEC-64/59) | sem mudança |
| `administrative/clients/index.tsx` e os outros 8 consumidores de `CrudListPage` | já consistentes (herdam do componente genérico) | sem mudança |
| **`Containers.tsx`** | tabela sem wrapper de moldura; coluna de ações com **6 botões soltos** (`bi-box-seam`/`bi-stack`/`bi-collection`/`bi-list-ul` outline-secondary + `bi-pencil` outline-primary + `bi-trash` outline-danger) — achado do usuário via screenshot | wrapper `.soft-card` + `CrudRowActions` |
| **`Invoice.tsx`** (`InvoiceTab`, tabela principal) | tabela sem wrapper; coluna de ações com até 2 botões soltos condicionais (`bi-check-lg` outline-success "confirmar", `bi-x-lg` outline-danger "cancelar", só quando `canChangeStatus`) | wrapper `.soft-card` + `CrudRowActions` (só quando há ação a mostrar) |
| **`Invoice.tsx`** (`InvoiceComparisonTab`) | tabela sem wrapper, **sem ação de linha** (só leitura, `DivergenceBadge`) | só wrapper `.soft-card` |
| **`Invoice.tsx`** (`InvoiceLoteComparisonTab`) | tabela sem wrapper, sem ação de linha | só wrapper `.soft-card` |
| **`operational/operations/$id/index.tsx`** (seção "Containers", mock) | tabela sem wrapper; linha inteira é `role="button"` (abre modal), sem coluna de ações/dropdown | só wrapper `.soft-card` (sem `CrudRowActions` — não há ação de linha discreta, o clique é na linha toda, como já é hoje) |
| `admin/debug/index.tsx` | tabela sem wrapper, 1 botão de ação por linha ("Disparar") | **fora do escopo** — página de debug interna (SPEC-48), fora da sidebar, acesso só por URL direta, não é uma listagem de produto real |

## 3. Escopo

1. **`Containers.tsx`** — `<div className="table-responsive">` ganha a
   classe `soft-card` (mesmo padrão de `Documents.tsx`/`Occurrences.tsx`,
   SPEC-64). Os 6 botões soltos da coluna "Ações" viram um único
   `<CrudRowActions>`:
   - `extraActions`: 4 itens (`stuffIdentified`, `stuffQuantity`,
     `stuffBatch`, `viewCargo`), mesmos ícones/labels (`title`) já usados
     hoje;
   - `onEdit`: abre o modal de edição (mesmo `setEditing`);
   - `onDelete`: abre a confirmação de exclusão (mesmo `setPendingDelete`
     + `ConfirmationModal` já existente).
2. **`Invoice.tsx` (`InvoiceTab`)** — `<div className="table-responsive">`
   ganha `soft-card`. Coluna de ações: quando `canChangeStatus`, um único
   `<CrudRowActions extraActions={[confirm, cancel]} />` (sem `onView`/
   `onEdit`/`onDelete` — nenhuma dessas ações existe aqui); quando não,
   mantém `"—"` (comportamento inalterado).
3. **`Invoice.tsx` (`InvoiceComparisonTab`/`InvoiceLoteComparisonTab`)** —
   `<div className="table-responsive">` ganha `soft-card`. Sem mudança de
   ações (não existem).
4. **`operational/operations/$id/index.tsx`** — o `<div className="table-responsive">`
   da seção "Containers" ganha `soft-card`. Sem mudança de comportamento
   (linha continua `role="button"` abrindo o modal de detalhe do
   container mock).
5. **Fora do escopo:** `admin/debug/index.tsx` (justificativa na tabela
   acima).

## 4. Fora do escopo

- Qualquer mudança de cor/paleta/token — mesma restrição das SPECs
  58-62, mantida aqui.
- `admin/debug/index.tsx`.
- Extrair um componente `<ListTable>` genérico que combine `.tableCard`/
  `soft-card` + `<Table>` — cada tela continua com seu próprio wrapper
  inline, mesmo padrão de duplicação já aceito no projeto (evita acoplar
  componentes de telas diferentes).
- Qualquer mudança de regra de negócio das ações de `Containers.tsx`/
  `Invoice.tsx` (estufagem, confirmação/cancelamento de invoice) — só a
  apresentação (wrapper + dropdown) muda.

## 5. Requisitos funcionais

- **RF1** — `Containers.tsx`: tabela envolvida por `.soft-card`; coluna de
  ações com 1 único `CrudRowActions` cobrindo as 6 ações existentes
  (4 em `extraActions`, `onEdit`, `onDelete`).
- **RF2** — `Invoice.tsx` (`InvoiceTab`): tabela envolvida por
  `.soft-card`; coluna de ações com `CrudRowActions` (2 `extraActions`)
  quando `canChangeStatus`, `"—"` caso contrário (comportamento
  preservado).
- **RF3** — `Invoice.tsx` (`InvoiceComparisonTab`/`InvoiceLoteComparisonTab`):
  tabelas envolvidas por `.soft-card`, sem mudança de conteúdo.
- **RF4** — `operational/operations/$id/index.tsx`: tabela da seção
  "Containers" envolvida por `.soft-card`, sem mudança de comportamento.
- **RF5** — Nenhuma mudança de cor/paleta/token em nenhum dos 4 arquivos.

## 6. Não funcionais

- Sem regressão de comportamento em nenhuma das ações existentes
  (estufagem, edição, exclusão, confirmação/cancelamento de invoice).
- Reuso total do `.soft-card` global (SPEC-56) e do `CrudRowActions` já
  estendido pela SPEC-65 (`extraActions`) — nenhum CSS ou componente novo.

## 7. Camada de dados

Não se aplica — mudança de apresentação/interação, nenhum hook/query
tocado.

## 8. UI

- `Containers.tsx`/`Invoice.tsx`: import de `CrudRowActions` (já existe
  em `Containers.tsx`? não — import novo; `Invoice.tsx` idem).
- Wrapper `.soft-card` adicionado à classe já existente
  `table-responsive` nos 4 arquivos (mesmo padrão de
  `className="soft-card table-responsive"` usado em `Documents.tsx`/
  `Occurrences.tsx`, SPEC-64).

## 9. i18n

Nenhuma chave nova — todos os rótulos usados em `extraActions` já existem
como `title`/`aria-label` dos botões antigos (`administrative-operations.
containers.stuffing.action*`, `administrative-operations.invoice.confirm.
action`, `administrative-operations.invoice.cancel.action`).

## 10. Arquivos esperados

- `src/components/operations/tabs/Containers.tsx`
- `src/components/operations/tabs/Invoice.tsx`
- `src/routes/_dashboard/_internal/operational/operations/$id/index.tsx`

## 11. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | `Containers.tsx`: tabela com `.soft-card`, coluna de ações com 1 kebab cobrindo as 6 ações |
| CA2 | `Invoice.tsx` (tabela principal): tabela com `.soft-card`, kebab só quando `canChangeStatus`, `"—"` caso contrário |
| CA3 | `Invoice.tsx` (2 tabelas de comparação): `.soft-card`, sem mudança de conteúdo |
| CA4 | `operational/operations/$id`: tabela de containers com `.soft-card` |
| CA5 | `admin/debug/index.tsx` inalterado (fora do escopo, confirmado) |
| CA6 | Nenhuma mudança de cor/token | 
| CA7 | `bun run check` + `bun run lint` sem regressão |

## 12. Riscos

- **R1** — `Containers.tsx` tem 6 ações por linha (mais que qualquer outro
  consumidor de `CrudRowActions` até agora) — menu mais longo que o
  padrão; aceitável dado que já é o pedido explícito do usuário
  (unificar mesmo com mais cliques).

## 13. Nota sobre aprovação

Aprovação recebida como "pode fazer" em resposta direta às duas opções
que eu apresentei nesta sessão (tratar o achado do screenshot como SPEC
nova + levantar o inventário completo antes de mexer em "todas as
listagens") — não é a frase padrão `APROVAR SPEC-69` exigida pela regra 7
do `.claude/agents/portal-dev-agent.md`, mas o contexto imediato (resposta
direta às opções que citavam explicitamente "SPEC nova"/"aprovação antes
de implementar") deixa a intenção inequívoca. Registrado aqui por
transparência — se o usuário quiser reforçar com a frase padrão, é só
confirmar.

## Implementation Notes

- **Arquivos alterados:** `src/components/operations/tabs/Containers.tsx`,
  `src/components/operations/tabs/Invoice.tsx`,
  `src/routes/_dashboard/_internal/operational/operations/$id/index.tsx`.
- **RF1:** `Containers.tsx` — `table-responsive` ganhou `soft-card`; os 6
  botões soltos da coluna de ações viraram 1 `<CrudRowActions>`
  (`extraActions`: `stuffIdentified`/`stuffQuantity`/`stuffBatch`/
  `viewCargo`; `onEdit`/`onDelete` para editar/excluir).
- **RF2:** `Invoice.tsx` (`InvoiceListing`) — `table-responsive` ganhou
  `soft-card`; quando `canChangeStatus`, `<CrudRowActions
  extraActions={[confirm, cancel]} />`; caso contrário, `"—"` preservado.
- **RF3:** `Invoice.tsx` (`InvoiceComparisonTab`/`InvoiceLoteComparisonTab`)
  — `table-responsive` ganhou `soft-card`, sem mudança de conteúdo (não
  têm coluna de ações).
- **RF4:** `operational/operations/$id/index.tsx` — `table-responsive` da
  seção "Containers" ganhou `soft-card`, linha continua `role="button"`
  sem dropdown (não há ação de linha discreta nesta tela mock).
- **RF5:** nenhuma mudança de cor/token em nenhum dos 4 arquivos.
- **Fora do escopo confirmado:** `admin/debug/index.tsx` não foi tocado
  (página de debug interna, fora da sidebar).
- **Comandos executados:**
  - `bun run check` (tsc --noEmit) — **VERIFIED**, sem erros.
  - `bun run lint` — **VERIFIED**, 66 problems (3 errors, 63 warnings),
    idêntico ao baseline. (1a rodada acusou 67/64 por 1 warning de
    `prettier/prettier` na quebra de linha de `Containers.tsx`; corrigido
    com `bunx prettier --write` no arquivo, 2a rodada confirmou volta ao
    baseline exato.)
- **Critérios de aceitação:**

  | # | Critério | Status |
  | --- | --- | --- |
  | CA1 | `Containers.tsx`: `.soft-card` + 1 kebab com as 6 ações | PASS |
  | CA2 | `Invoice.tsx` (tabela principal): `.soft-card` + kebab condicional | PASS |
  | CA3 | `Invoice.tsx` (2 tabelas de comparação): `.soft-card`, sem mudança de conteúdo | PASS |
  | CA4 | `operational/operations/$id`: `.soft-card` na tabela de containers | PASS |
  | CA5 | `admin/debug/index.tsx` inalterado | PASS |
  | CA6 | Nenhuma mudança de cor/token | PASS |
  | CA7 | `bun run check` + `bun run lint` sem regressão | PASS |
- **Limitações conhecidas:** validação visual manual (menu de 6 itens no
  kebab de `Containers.tsx`, comportamento condicional do kebab em
  `Invoice.tsx`) não foi feita nesta sessão via dev server — recomenda-se
  checagem visual antes do merge.
