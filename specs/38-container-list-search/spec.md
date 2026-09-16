# SPEC-38 — Containers: busca na listagem (aguarda Core)

- **ID:** SPEC-38
- **Nome:** container-list-search
- **Status:** DRAFT
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/components/operations/tabs/Containers.tsx`
- **Depende de (Core):** spec Core em andamento para adicionar `Search`
  ao endpoint de container-da-operação (`GET
  /api/operation/{operationId}/container`) — número da spec Core ainda
  não conhecido neste momento; referenciar por tema
  ("busca de container por operação") até o `core-spec-agent` publicar o
  número definitivo.
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

Bloqueado até o Core expor o parâmetro `Search` (ou equivalente) no
endpoint `GET /api/operation/{operationId}/container` e o client gerado
ser atualizado via `just map`. Quando isso acontecer:

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

- **RF1 (bloqueado)** — Campo de busca textual na listagem de
  containers, funcional assim que
  `GetApiOperationOperationIdContainerParams.Search` existir no client
  gerado.
- **RF2 (bloqueado)** — Buscar reseta a paginação para a página 1.

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
| CA1 (bloqueado) | Buscar por texto filtra a listagem de containers via o novo parâmetro do Core |
| CA2 (bloqueado) | Buscar reseta a página para 1 |
| CA3 | `just map` executado e diff revisado antes de implementar RF1/RF2 |
| CA4 | `bun run check` + `bun run lint` sem regressão |

## 11. Riscos

- **R1** — Esta SPEC não é implementável até a dependência de Core ser
  resolvida — não deve ser marcada `APPROVED`/`IN_PROGRESS` para
  implementação antes disso, mesmo que o lado frontend seja trivial.
