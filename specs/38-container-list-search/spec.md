# SPEC-38 — Containers: busca na listagem (aguarda Core)

- **ID:** SPEC-38
- **Nome:** container-list-search
- **Status:** DRAFT (revisado 2026-09-16) — **§3 já resolvido pelo Core.**
  `specs/26-container-cargo-search` já é `IMPLEMENTED`: `Search` existe
  em `ContainerOperationViewModel.Query` (filtra por
  `Container.Identifier`) **e também** em `CargoUnitViewModel.Query`
  (filtra por Romaneio/Invoice) — esta SPEC-38 só cobria Container, o
  Core entregou os dois de uma vez, mas a busca de CargoUnit não tem
  spec de frontend própria ainda (oportunidade de ampliar escopo aqui ou
  abrir SPEC nova, ver §12). Ainda não apareceu em `src/api/generated/**`
  porque `just map` não rodou depois da implementação do Core.
- **Autor:** portal-dev-agent (rascunho); revisão de status 2026-09-16
  (cruzamento com Core `specs/26-container-cargo-search`)
- **Área:** `src/components/operations/tabs/Containers.tsx`
- **Depende de (Core):** ~~spec Core em andamento~~ — **resolvido**:
  `specs/26-container-cargo-search` (`IMPLEMENTED`). Falta só `just map`.
- **Contexto do pedido:** item do `TODO.md` ("Operação → aba Containers:
  falta paginação + busca na listagem") — investigação mostrou que
  paginação já existe (ver §2); só falta busca, e ela depende do Core.

---

## 1. Objetivo

Adicionar busca por texto na listagem de containers de uma operação
(aba Containers), assim que o Core expuser um parâmetro `Search` no
endpoint correspondente.

## 2. Contexto (achado da investigação)

- **Paginação já existe** — `Containers.tsx` já importa e usa
  `ListPagination` (confirmado, `Containers.tsx:52`), com estado
  `page`/`PAGE_SIZE`. Este item do `TODO.md` já está resolvido nesse
  ponto; nenhuma ação necessária aqui além de herdar a SPEC-28
  (paginação enxuta) automaticamente.
- **Busca não existe hoje e não pode ser adicionada só no frontend** —
  `GetApiOperationOperationIdContainerParams` (client gerado,
  `src/api/generated/model/getApiOperationOperationIdContainerParams.ts`)
  só tem `Offset`/`Limit`/`Sort`. Não há `Search`. Confirmado que este é
  um gap real de contrato, não um esquecimento de UI.

## 3. Escopo

Contrato já existe, falta só `just map` + implementação:

1. Adicionar campo de busca de texto na listagem de containers (mesmo
   padrão de busca já usado em `Romaneio.tsx`/`admin/access`), estado
   local `search`, resetando `page` para 1 ao digitar.
2. Passar `Search: search || undefined` para
   `getGetApiOperationOperationIdContainerQueryOptions`.

## 4. Fora do escopo

- Desenhar o contrato do parâmetro `Search` no Core — isso é
  responsabilidade do `core-spec-agent`, fora do território deste
  agente.
- Qualquer filtro além de busca textual livre (ex. por status de
  container) — não pedido.

## 5. Requisitos funcionais

- **RF1** — Campo de busca textual na listagem de containers.
- **RF2** — Buscar reseta a paginação para a página 1.

## 6. Camada de dados

- Depende de `just map` após a spec Core correspondente ser
  implementada e mergeada — revisar o diff de
  `src/api/generated/model/getApiOperationOperationIdContainerParams.ts`
  e `src/api/generated/endpoints/operation-container/operation-container.ts`
  para confirmar o nome exato do parâmetro antes de implementar (pode
  não se chamar exatamente `Search`, seguir o nome real gerado).

## 7. UI

Mesmo padrão de campo de busca já usado em outras listagens do projeto
(`CrudListPage`/`Romaneio.tsx`) — não inventar um padrão novo.

## 8. i18n

Reaproveitar chave de placeholder de busca já existente no namespace
`administrative-operations.containers.*`, se houver; senão, adicionar
`administrative-operations.containers.searchPlaceholder` nos 4 locales.

## 9. Arquivos esperados

- `src/components/operations/tabs/Containers.tsx`
- `src/api/generated/**` (via `just map`, quando o Core publicar a
  mudança)

## 10. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA0 | `just map` executado, `Search` presente no client gerado |
| CA1 | Buscar por texto filtra a listagem de containers |
| CA2 | Buscar reseta a página para 1 |
| CA4 | `bun run check` + `bun run lint` sem regressão |

## 11. Riscos

Baixo — aditivo, contrato já fechado e implementado no Core.

## 12. Nota — busca de CargoUnit ficou de fora do escopo original

O Core (`specs/26-container-cargo-search`) implementou `Search` em
**dois** endpoints: `ContainerOperationViewModel.Query` (coberto por
esta SPEC-38) e `CargoUnitViewModel.Query` (filtra por
`Romaneio.ItemIdentifier`/`ItemCode`/`Invoice.Number`) — mas não existe
nenhuma tela de listagem de `CargoUnit` isolada no NewPortal hoje (fardos
aparecem embutidos em outras telas, não numa lista própria com busca).
Registrado aqui pra não ser esquecido: se/quando uma tela de listagem de
CargoUnit for criada, ela já nasce com `Search` disponível no contrato,
sem precisar de spec nova no Core.
