# SPEC-98 — Cabeçalho da página de Operação: layout compacto em 1 linha

- **ID:** SPEC-98
- **Nome:** operation-header-compact
- **Status:** IMPLEMENTED (2026-09-18) — aprovado pelo usuário ("APROVAR
  SPEC-98").
- **Autor:** claude (pedido do usuário, 2026-09-18, com print)
- **Área:**
  `src/routes/_dashboard/_internal/administrative/operations/$id/index.tsx`
  (função `OperationHeader`, linhas 192-269),
  `src/routes/_dashboard/_internal/administrative/operations/$id/index.module.css`
  (classe `.header`).

---

## 1. Objetivo

Reduzir a altura do card de cabeçalho da página de detalhe de uma
Operação (`/administrative/operations/$id`). Pedido do usuário via print:
hoje o bloco esquerdo empilha 3 linhas (eyebrow "Operação N" → título do
cliente → badges de tipo/serviço/status), o que deixa o cabeçalho alto
antes mesmo de chegar nas abas. Layout escolhido pelo usuário: **tudo
numa linha só** — eyebrow, título e badges lado a lado, alinhados
verticalmente ao centro com o controle de "Status da operação" à
direita.

## 2. Contexto — estado atual

`OperationHeader` (linhas 237-268) já é um `<section className="soft-card
mb-4 {styles.header}">` com um único wrapper flex
(`d-flex flex-wrap align-items-end justify-content-between gap-3`)
contendo dois filhos: um bloco de texto à esquerda (sem classe flex
própria — eyebrow, `h1.h4`, badges cada um em sua própria linha por
serem elementos de bloco) e o `Select` de status à direita
(`minWidth: 220`). `styles.header` só define `padding: 1.25rem` (20px).
`align-items-end` alinha os dois filhos pela base, não pelo centro.

## 3. Escopo

### 3.1 Requisitos funcionais

- **RF1** — Bloco esquerdo passa a ser um único flex row
  (`d-flex flex-wrap align-items-center gap-2` ou `gap-3`) com três
  filhos lado a lado: eyebrow (`span`/`small`, `text-body-secondary`),
  título (`h1` sem margens verticais — `mb-0`/`mt-0` — mantendo
  semântica de heading, tamanho a ajustar na implementação entre `h5` e
  `h4` conforme o que couber melhor ao lado dos badges) e o grupo de
  badges (mesmo conjunto de hoje: tipo, serviço, status).
- **RF2** — Wrapper externo troca `align-items-end` por
  `align-items-center`, pra alinhar o bloco de texto (agora em uma
  linha só) com o controle de Status à direita pelo centro, não pela
  base.
- **RF3** — `styles.header` reduz o `padding` de `1.25rem` pra um valor
  menor — a definir na implementação (referência: `0.75rem`, mantendo
  espaçamento perceptível sem ocupar tanto vertical).
- **RF4** — Mantém `flex-wrap` em ambos os níveis (wrapper externo já
  tem; o novo wrapper interno do RF1 também) — em telas estreitas, onde
  não cabe tudo numa linha, os elementos quebram graciosamente (badges
  ou o próprio bloco de Status descem), sem overflow horizontal. Não é
  um requisito de "forçar 1 linha em qualquer largura", é o layout
  natural de flex-wrap com gap.
- **RF5** — Nenhuma mudança de conteúdo/dado exibido — mesmas
  informações (eyebrow, cliente, badges de tipo/serviço/status, Select
  de status), só reorganizadas.

### 3.2 Fora do escopo

- Abas abaixo do cabeçalho (`Nav`, linhas 132-143) — sem mudança.
- Breadcrumb da topbar — sem mudança (componente separado).
- Qualquer mudança de regra de negócio do Status da operação (opções do
  `Select`, `enumOptions`, mutação) — só o layout visual.

## 4. i18n

Nenhuma chave nova — reaproveita `administrative-operations.shell.eyebrow`
e `administrative-operations.shell.statusLabel` já existentes.

## 5. Arquivos esperados

- `src/routes/_dashboard/_internal/administrative/operations/$id/index.tsx`
  (função `OperationHeader`, RF1-RF2).
- `src/routes/_dashboard/_internal/administrative/operations/$id/index.module.css`
  (classe `.header`, RF3).

## 6. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Em viewport largo, eyebrow + título + badges aparecem lado a lado numa única linha, alinhados ao centro com o Select de status à direita. |
| CA2 | Altura do card de cabeçalho reduz visivelmente em relação ao estado atual (3 linhas empilhadas → 1 linha). |
| CA3 | Em viewport estreito, os elementos quebram (`flex-wrap`) sem overflow horizontal nem sobreposição. |
| CA4 | Nenhuma informação exibida hoje deixa de aparecer (mesmos dados, só reorganizados). |
| CA5 | `bun run check` + `bun run lint` sem regressão. |

## 7. Implementation Notes

- **Arquivos alterados:**
  - `src/routes/_dashboard/_internal/administrative/operations/$id/index.tsx`
    (função `OperationHeader`) — bloco esquerdo virou um único
    `<div className="d-flex flex-wrap align-items-center gap-2">` com
    eyebrow (`span`), título (`h1`) e os 3 badges como filhos diretos
    (deixaram de estar em divs/wrappers próprios). Wrapper externo trocou
    `align-items-end` por `align-items-center`.
  - `src/routes/_dashboard/_internal/administrative/operations/$id/index.module.css`
    (classe `.header`) — `padding` de `1.25rem` pra `0.75rem`.

- **Valores finais escolhidos:**
  - Gap do novo flex row interno: `gap-2` (0.5rem) — mesmo espaçamento que
    já existia entre os badges, ficou visualmente equilibrado com eyebrow e
    título ao lado.
  - Tamanho do título: `h5` (era `h4`) — ao lado dos badges na mesma linha,
    `h4` (1.5rem) competia demais com os badges e o eyebrow; `h5` (1.25rem)
    manteve destaque de heading sem dominar a linha. Margens removidas
    (`mb-0`, sem `mt-1`/`mb-2` — não fazem sentido dentro de um flex row).
  - `padding` do `.header`: `0.75rem` (12px) uniforme (topo/base/laterais),
    conforme a referência do RF3 — não foi diferenciado
    vertical/horizontal, o card ficou visualmente equilibrado com padding
    uniforme menor.
  - `flex-wrap` mantido nos dois níveis (wrapper externo e o novo wrapper
    interno) — RF4 preservado tal como já estava.

- **Comandos executados e resultado:**
  - `bun run check` (`tsc --noEmit`) — **FAILED**, mas com 2 erros
    pré-existentes e fora do escopo desta SPEC
    (`src/components/operations/tabs/Documents.tsx:101` e
    `Occurrences.tsx:65`, ambos `TS2353` sobre um campo `Search` que não
    existe no tipo do client gerado — resíduo de outra mudança em
    andamento no working tree, não relacionado a `OperationHeader`).
    Confirmado com `git stash` + `bun run check` na árvore sem as mudanças
    desta SPEC: os mesmos 2 erros já existiam antes (mais um terceiro,
    de `crud-bulk-actions.tsx`, que também é preexistente/fora de escopo).
    Nenhum erro novo introduzido pelos arquivos desta SPEC.
  - `bun run lint` — **VERIFIED**, `0 errors` (63 warnings pré-existentes,
    nenhum nos arquivos tocados por esta SPEC).
  - Verificação visual no navegador — **NOT VERIFIED**: sem ferramenta de
    browser disponível neste ambiente (execução headless, sem sessão
    autenticada). Smoke test manual: subi `bun run dev` (porta 8081) e
    fiz `curl` em `/administrative/operations/1`, recebendo `307`
    (redirect pro guard de auth — esperado, sem cookie de sessão), ou seja
    a rota resolve e o servidor não quebra; não constitui confirmação
    visual do layout.

- **Critérios de aceitação:**

  | # | Resultado |
  | --- | --- |
  | CA1 | PASS (por inspeção de código/JSX — não confirmado visualmente, ver nota acima) |
  | CA2 | PASS (por inspeção — padding reduzido de 1.25rem→0.75rem e bloco de texto colapsado de 3 linhas pra 1) |
  | CA3 | PASS (por inspeção — `flex-wrap` preservado nos dois níveis) |
  | CA4 | PASS — nenhum dado/badge removido, só reorganizado |
  | CA5 | PASS — `bun run lint` limpo; `bun run check` sem regressão nova (erros preexistentes documentados acima) |

- **Decisões tomadas durante a implementação:**
  - Título em `h5` (dentro do intervalo h5–h4 que a SPEC deixou em aberto).
  - `padding` uniforme `0.75rem` (a SPEC dava `0.75rem` como referência,
    sem exigir diferenciação vertical/horizontal).

- **Limitações conhecidas:**
  - Sem verificação visual real (sem browser neste ambiente) — recomenda-se
    conferência visual humana antes de considerar a SPEC totalmente
    fechada, ainda que o `status` esteja `IMPLEMENTED` conforme o ciclo do
    agente.
