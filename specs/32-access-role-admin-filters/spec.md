# SPEC-32 — Tela de Acesso: filtro por papel e por admin

- **ID:** SPEC-32
- **Nome:** access-role-admin-filters
- **Status:** DRAFT
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/routes/_dashboard/admin/access/index.tsx`,
  `src/lib/queries/user.ts` (ou equivalente)
- **Contexto do pedido:** item do `TODO.md` ("Tela de Acesso: editar se é
  admin já existe... falta paginação + filtro por role + filtro
  admin/não-admin") — investigação mostrou que parte já está resolvida
  (ver §2).

---

## 1. Objetivo

Adicionar à tela de Acesso (`admin/access`) os filtros de **papel**
(`Role`) e **admin/não-admin** (`IsAdmin`) na listagem, usando parâmetros
que o Core já aceita.

## 2. Contexto (achados da investigação)

- **Paginação já existe** — `AdminAccessPageContent` usa `CrudListPage`
  com `page`/`pageSize`/`onPageChange`, que renderiza `ListPagination`
  internamente (`crud-list-page.tsx:139-180`). Não há gap aqui; este item
  do `TODO.md` está desatualizado nesse ponto — nenhuma ação necessária
  além de possivelmente herdar o resultado da SPEC-28 (paginação enxuta)
  automaticamente, sem trabalho extra.
- **Editar `isAdmin` já existe** — o campo `InputSwitch` para `isAdmin`
  já está em `fields` (create/edit, `index.tsx:258`) e o Core já aceita
  `isAdmin` em `UserUpdate` desde a SPEC-23. Não há gap aqui.
- **Gap real confirmado:** `GetApiUserParams`
  (`src/api/generated/model/getApiUserParams.ts`) já tem `IsAdmin?:
  boolean` e `Role?: InternalRole` — mas `listQueryOptions` em
  `AdminAccessPageContent` (`index.tsx:187-191`) só passa
  `Search`/`Offset`/`Limit`. Os dois filtros existem no contrato e não
  são usados na UI. Isso é 100% trabalho de frontend.

## 3. Escopo

1. Adicionar controle de filtro por **papel** (`Role`, mesmas opções já
   carregadas via `userRolesQueryOptions()`/`roleFieldOptions`,
   reaproveitando o que já é usado no formulário de create/edit).
2. Adicionar controle de filtro **admin / não-admin** (`IsAdmin`, 3
   estados: todos / só admin / só não-admin).
3. Wire dos dois filtros em `listQueryOptions` (`userListQueryOptions`),
   resetando a página para 1 ao trocar qualquer filtro (mesmo padrão já
   usado em `onSearchChange`).

## 4. Fora do escopo

- Paginação (já implementada, confirmado em §2).
- Editar `isAdmin` no formulário (já implementado, confirmado em §2).
- Qualquer mudança em `GetApiUserParams` — contrato já suficiente.

## 5. Requisitos funcionais

- **RF1** — Novo controle de filtro por papel (`Role`) na
  `AdminAccessPageContent`, usando as mesmas opções de
  `roleFieldOptions` (já resolvidas via `useSsrSafeQuery(userRolesQueryOptions())`).
  Seleção única (o parâmetro do Core, `Role?: InternalRole`, é singular —
  não é array) ou "Todos" (sem filtro).
- **RF2** — Novo controle de filtro admin/não-admin (`IsAdmin`), 3
  estados: "Todos" (sem parâmetro), "Somente admin" (`IsAdmin: true`),
  "Somente não-admin" (`IsAdmin: false`).
- **RF3** — Trocar qualquer um dos dois filtros reseta `page` para `1`
  (mesmo padrão de `onSearchChange`).
- **RF4** — Os filtros combinam com a busca de texto já existente
  (`Search`) sem regressão — todos os parâmetros juntos na mesma chamada
  a `userListQueryOptions`.

## 6. Não funcionais

- Filtros devem funcionar tanto no SSR inicial (loader da rota, que hoje
  só semeia a primeira página sem filtro) quanto na navegação
  client-side — se o usuário aplicar um filtro, é esperado que a mesma
  `queryOptions` (com os novos parâmetros na key) dispare um fetch novo
  (React Query já cuida disso via `queryKey` diferente).

## 7. Camada de dados

- `userListQueryOptions` (`src/lib/queries/user.ts` — confirmar caminho
  exato durante a implementação) já aceita um objeto de params
  compatível com `GetApiUserParams`; só falta passar `Role`/`IsAdmin`
  quando definidos.
- Nenhuma mudança em `src/lib/user-fns.ts`/`fetchUserListFn` deve ser
  necessária — os params já fluem por lá.
- Sem necessidade de `just map` (contrato já existe).

## 8. UI

- Filtros renderizados na área de busca/topo do `CrudListPage` — checar
  se `CrudListPage` já tem um slot para filtros extras (`renderCard`,
  `search`) ou se precisa de um `children`/slot novo. Se `CrudListPage`
  não suportar filtros extras hoje, isso é um `SCOPE CONFLICT` a levantar
  durante a implementação (mudança no componente genérico usado por
  outras 2 telas, Cadastros/Clientes) — avaliar se afeta as outras
  telas antes de mudar o componente compartilhado.
- Usar `Select`/`InputSwitch`/`btn-group` de `layouts/Form/Fields` ou
  componentes de UI já existentes — nunca `<select>`/`<input>` cru
  (regra 10 só vale dentro de formulário `react-hook-form`; como isso é
  um filtro de listagem, não um formulário submetido, avaliar se cabe
  React-Bootstrap puro (`Form.Select` controlado por `useState`, mesmo
  padrão do filtro de papel em `Responsible.tsx` da SPEC-21) em vez de
  `layouts/Form/Fields`).

## 9. i18n

Namespace `access` (4 locales):

- `filters.role` (label do filtro de papel)
- `filters.allRoles`
- `filters.isAdmin` (label do filtro admin)
- `filters.allUsers` / `filters.adminOnly` / `filters.nonAdminOnly`

## 10. Arquivos esperados

- `src/routes/_dashboard/admin/access/index.tsx`
- `src/lib/queries/user.ts` (se precisar de ajuste de tipo/assinatura)
- `src/components/crud/crud-list-page.tsx` (só se confirmado que precisa
  de um slot novo para filtros — avaliar impacto nas outras 2 telas antes)
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/access.json`

## 11. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Filtro de papel filtra a listagem via `Role` no parâmetro do Core |
| CA2 | Filtro admin/não-admin filtra a listagem via `IsAdmin` |
| CA3 | Os 2 filtros + busca de texto combinam sem regressão |
| CA4 | Trocar filtro reseta a página para 1 |
| CA5 | Paginação e edição de `isAdmin` continuam funcionando (regressão zero, já eram OK) |
| CA6 | `bun run check` + `bun run lint` sem regressão |

## 12. Riscos

- **R1** — Se `CrudListPage` não tiver slot para filtros extras hoje,
  pode ser necessário mudar o componente genérico compartilhado com
  Cadastros/Clientes — levantar como `SCOPE CONFLICT` antes de mexer,
  mesmo que pareça pequeno, porque afeta 3 telas.
