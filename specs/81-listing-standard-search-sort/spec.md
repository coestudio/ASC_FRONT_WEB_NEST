# SPEC-81 — Padrão de listagem: busca + paginação + ordenação com ícone

- **ID:** SPEC-81
- **Nome:** listing-standard-search-sort
- **Status:** WAITING_APPROVAL — sem `[NEEDS_DECISION]` de escopo
  (confirmado pelo usuário via pergunta de escopo, 2026-09-17: "Todo o
  ecossistema Operação + CRUD administrativo").
- **Autor:** claude (pedido do usuário, 2026-09-17 — regra geral pras
  listagens que a sessão vem mexendo, usando a sub-aba de Estufagem/
  Romaneio como referência já pronta)
- **Área:** ver §3 (lista completa de arquivos).
- **Depende de (parcial):** `warren/Core/specs/48-document-occurrence-
  search-filter` (`WAITING_APPROVAL`) — só a busca de Documentos/
  Ocorrências (§3.2) depende disso; ordenação (§3.1) não depende de
  nada novo no Core (já suportado em todo endpoint envolvido, ver §2).

---

## 1. Objetivo

Duas regras, pedidas em sequência pelo usuário:

1. "Todas as páginas que implementam isso [o padrão de ações da
   SPEC-79] precisam ter o Input de Busca e paginação."
2. "Seguindo como exemplo a sub aba de operação [Estufagem/Romaneio],
   precisa ter implementado a ordenação dos campos, ícone ao lado do
   nome da coluna."

## 2. Achado da investigação — o Core já suporta ordenação em quase tudo

Antes de escrever escopo, auditei o estado atual (ver tabela §3) e um
achado importante: **toda listagem envolvida já herda `PageQuery.Sort`
e já tem um dicionário `Sortable` pronto no Core** (`ApplySort(query,
XxxViewModel.Query.Sortable, ...)`, mesmo mecanismo genérico que a
SPEC-53 usou pra Romaneio) — `Harbor`, `Product`, `Terminal`, `Client`,
`User`, `Vessel`, `Container` (registro), `Operation`,
`ContainerOperation`, `Document`, `Invoice`, `Occurrence`. A lacuna de
ordenação é **100% front-end**: nenhuma dessas telas declara `sortKey`
nas colunas nem tem cabeçalho clicável — só falta `CrudColumn.sortKey`
(ou, pra `operations-list.tsx`/`Containers.tsx`/`Documents.tsx`/
`Invoice.tsx`/`Occurrences.tsx`, que não usam `CrudColumn`, o mesmo
tratamento manual de `<th>` clicável que a spec vai descrever).

Busca é diferente: `Invoice` já tem `Search` no Core (só falta o campo
de busca no front); `Document`/`Occurrence` **não têm** — daí a
dependência parcial da `Core/specs/48`.

`Collaborator` é um caso à parte: o endpoint (`GET /api/client/{id}/
collaborator`) não usa `PageQuery` — devolve array puro, sem `Sort`/
`Search`/`Offset`/`Limit` (já documentado como lacuna de contrato desde
a SPEC-09). Paginação e busca já são client-side ali (`toPagedResult`,
`Containers.tsx`... digo, `collaborators/index.tsx`); ordenação também
será client-side (ordenar o array antes de paginar), sem depender do
Core.

## 3. Estado atual (auditoria completa)

| Tela | Busca | Paginação | Ordenação c/ ícone |
| --- | --- | --- | --- |
| `Operational.tsx` (Estufagem) | ✅ | ✅ | ✅ (referência) |
| `Romaneio.tsx` | ✅ | ✅ | ✅ (referência) |
| `clients/index.tsx` | ✅ | ✅ | ❌ |
| `registry/harbor/index.tsx` | ✅ | ✅ | ❌ |
| `registry/terminal/index.tsx` | ✅ | ✅ | ❌ |
| `registry/product/index.tsx` | ✅ | ✅ | ❌ |
| `registry/container/index.tsx` | ✅ | ✅ | ❌ |
| `registry/vessel/index.tsx` | ✅ | ✅ | ❌ |
| `client/collaborators/index.tsx` | ✅ | ✅ | ❌ |
| `admin/access/index.tsx` | ✅ | ✅ | ❌ |
| `operations/operations-list.tsx` | ✅ | ✅ | ❌ (`Sort` fixo em `"-number"`) |
| `tabs/Containers.tsx` | ✅ | ✅ | ❌ |
| `tabs/Documents.tsx` | ❌ (Core sem `Search`) | ✅ | ❌ |
| `tabs/Invoice.tsx` | ❌ (Core já tem `Search`, falta UI) | ✅ | ❌ |
| `tabs/Occurrences.tsx` | ❌ (Core sem `Search`) | ✅ | ❌ |

**Fora de escopo (confirmado com o usuário):** `admin/debug/index.tsx`,
`client/final-report/index.tsx` (array mock local, comentário já diz
"nunca uma query" — sem endpoint paginável) e
`operational/operations/$id/index.tsx` — não são listagens de dado
paginável de verdade.

## 4. Escopo

### 4.1 Ordenação com ícone (front-end, sem dependência de Core)

Pra cada tela abaixo, colunas cujo campo aparece no `Sortable` do Core
correspondente ganham `sortKey` (valor = a **chave exata do dicionário
`Sortable`**, não necessariamente igual ao nome do campo no DTO — ex.
`Document` usa `"createdOn"`, não `"createdAt"`; conferir contra o
`Sortable` de cada `ViewModel.Query` na implementação, não assumir por
analogia). Mesmo mecanismo que `CrudColumn.sortKey`/`CrudListPage`
já tem (`sort`/`onSortChange`, ícone `bi-sort-up-alt`/`bi-sort-down-
alt`/`bi-arrow-down-up`) — nenhum componente novo, só uso da prop que
já existe.

- `clients/index.tsx` — `fullName`, `document`, `email`, `createdAt`
  (`ClientViewModel.Query.Sortable`).
- `registry/harbor/index.tsx` — `name`, `createdAt`.
- `registry/terminal/index.tsx` — `name`, `createdAt`.
- `registry/product/index.tsx` — `name`, `createdAt`.
- `registry/container/index.tsx` — `identifier`, `tara`, `createdAt`.
- `registry/vessel/index.tsx` — `name`, `createdAt`.
- `admin/access/index.tsx` — `userName`, `fullName` (coluna "nome"),
  `email`, `isActive` (coluna "status"), `type`, `createdAt`.
- `operations/operations-list.tsx` — não usa `CrudColumn`; `<th>`
  vira clicável à mão (mesmo visual: ícone `bi-sort-*`/`bi-arrow-down-
  up`, `role="button"`, `cursor: pointer`), estado `sort` novo
  (`useState<string | undefined>("-number")`) substitui o `Sort:
  "-number"` fixo de hoje, aplicado nas colunas `number`, `opType`
  (coluna "Tipo"), `status`, `opDate`.
- `tabs/Containers.tsx` — mesma adaptação manual de `<th>` (não usa
  `CrudColumn`); `identifier`, `createdAt`
  (`ContainerOperationViewModel.Query.Sortable`).
- `tabs/Documents.tsx` — `<th>` manual; `title`, `type`, `createdOn`.
- `tabs/Invoice.tsx` — `<th>` manual; `number`, `status`, `issuedOn`.
- `tabs/Occurrences.tsx` — `<th>` manual; `title`, `createdOn`.
- `client/collaborators/index.tsx` — **ordenação client-side** (sem
  `Sort` no Core): `toPagedResult` ganha um parâmetro `sort` e ordena
  `filtered` (por `fullName`/`userName`/`email`/`createdAt`) antes de
  fatiar a página — mesmo `CrudColumn.sortKey`/`sort`/`onSortChange` na
  tela, só a fonte da ordenação é local em vez de ir pro Core.

### 4.2 Busca

- `tabs/Invoice.tsx` — ganha `FilterText` (mesmo padrão de
  `Containers.tsx`/`Responsible.tsx`), ligado ao `Search` que o Core já
  aceita. **Sem dependência de Core, pode entrar já.**
- `tabs/Documents.tsx`/`tabs/Occurrences.tsx` — ganham `FilterText`
  também, mas só entram em vigor depois que `Core/specs/48` estiver
  `IMPLEMENTED` (o campo `Search` precisa existir no `Query` gerado
  pelo `just map` antes do front poder mandar o parâmetro). Se
  aprovada antes do Core, a implementação desta SPEC entrega a UI e
  deixa o `Search` sem efeito (Core ignora parâmetro desconhecido) até
  a SPEC-48 do Core subir — ou, decisão de implementação, esperar a
  SPEC-48 primeiro pra não ter UI "morta" por um tempo. Preferência:
  **esperar a SPEC-48 do Core primeiro**, mesma ordem de dependência
  já usada entre SPEC-53/58.

### 4.3 Fora do escopo

- `admin/debug`, `client/final-report`, `operational/operations/$id`
  (ver §3).
- Qualquer mudança de contrato/endpoint do Core além do que a
  `Core/specs/48` já cobre (ordenação não precisa de nada novo).
- Estender `CrudColumn`/`CrudListPage` — a prop `sortKey`/`sort`/
  `onSortChange` já existe (SPEC-53), essa SPEC só a usa em mais
  lugares.

## 5. Requisitos funcionais

- **RF1** — Nas 12 telas de §4.1 (exceto `collaborators`), clicar num
  `<th>` com `sortKey` alterna sem-ordenação → ascendente → descendente
  → sem-ordenação, mandando `Sort=campo`/`Sort=-campo` pro Core (mesmo
  ciclo de `nextSort` que `crud-list-page.tsx` já implementa).
- **RF2** — Em `collaborators`, o mesmo ciclo ordena o array local antes
  de paginar (sem chamada ao Core).
- **RF3** — `operations-list.tsx`/`Containers.tsx`/`Documents.tsx`/
  `Invoice.tsx`/`Occurrences.tsx` (sem `CrudColumn`) ganham cabeçalho
  clicável com o mesmo ícone visual do `CrudListPage`
  (`bi-sort-up-alt`/`bi-sort-down-alt`/`bi-arrow-down-up`).
- **RF4** — `Invoice.tsx` ganha campo de busca funcional (Core já
  aceita `Search`).
- **RF5** — `Documents.tsx`/`Occurrences.tsx` ganham campo de busca,
  habilitado a valer depois que `Core/specs/48` estiver `IMPLEMENTED`
  (ordem de implementação: Core primeiro).

## 6. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | As 12 telas de §4.1 (exceto `collaborators`) têm cabeçalho clicável com ícone de ordenação nas colunas listadas, mandando `Sort` correto pro Core. |
| CA2 | `collaborators` ordena localmente, mesmo visual de cabeçalho. |
| CA3 | `Invoice.tsx` filtra por texto via `FilterText`, mesmo padrão de `Containers.tsx`. |
| CA4 | `Documents.tsx`/`Occurrences.tsx` filtram por texto depois que `Core/specs/48` estiver implementado (verificar live contra o Core antes de fechar esta SPEC). |
| CA5 | Nenhuma das 8 telas administrativas/`access`/`operations-list`/`Containers` perde a busca ou paginação que já tinha (regressão zero — já estavam OK, achado do §3). |
| CA6 | `bun run check` + `bun run lint` sem regressão. |

## 7. Riscos

- **R1** — Chave de `sortKey` errada (usar nome de campo do DTO em vez
  da chave literal do `Sortable`) faz o Core ignorar o `Sort` (cai no
  `defaultSort`) sem erro nenhum — silencioso. Mitigação: conferir cada
  `Sortable` no código do Core na hora de implementar, não confiar só
  na tabela desta SPEC.
- **R2** — Depende de `Core/specs/48` pra §4.2 (Documents/Occurrences)
  — se o Core não for aprovado/implementado, essa parte fica `BLOCKED`,
  o resto da SPEC (ordenação inteira + busca do Invoice) segue
  independente.
