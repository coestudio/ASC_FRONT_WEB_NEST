# SPEC-36 — Tela dedicada de desestufagem

- **ID:** SPEC-36
- **Nome:** destuffing-screen
- **Status:** IMPLEMENTED (2026-09-16) — ver §13 (Implementation Notes).
  Decisões de §5 fechadas com o usuário (2026-09-15).
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/components/operations/tabs/Containers.tsx` (referência),
  nova tela/aba a definir
- **Contexto do pedido:** item do `TODO.md` sobre não existir tela
  própria para "desestufar" fardos, só o cancelamento dentro do modal
  "ver fardos estufados".

---

## 1. Objetivo

Desenhar uma tela/fluxo dedicado para "desestufagem" (liberar um fardo já
estufado de volta para o romaneio), hoje disponível só como uma ação
secundária (botão de cancelar com ícone `bi-x-circle`) dentro do modal
`CargoUnitsModal` ("ver fardos estufados"), acessado a partir da aba
Containers.

## 2. Contexto (estado atual confirmado)

- O endpoint de cancelamento já existe:
  `usePostApiOperationOperationIdCargoIdCancel` (`POST
  /api/operation/{operationId}/cargo/{id}/cancel`), com motivo obrigatório
  (`reason`, `PostApiOperationOperationIdCargoIdCancelBody`).
- Hoje esse cancelamento só é acessível de dentro de
  `CargoUnitsModal` (`Containers.tsx:826-928`), que é aberto a partir de
  um container específico na aba Containers — ou seja, o usuário precisa
  saber em qual container o fardo está estufado, abrir o modal daquele
  container, achar a linha do fardo e clicar em cancelar.
- `GetApiOperationOperationIdCargoParams` (client gerado) já aceita
  `Status` (filtro por `CargoUnitStatus`) e `ContainerOperationId`
  opcional — dá para listar **todos** os fardos estufados de uma operação
  (todos os containers), sem precisar entrar container por container, se
  `ContainerOperationId` não for informado.
- O comentário do próprio código documenta que cancelar via este modal
  "já libera a linha do romaneio de volta" — o comportamento de negócio
  de desestufar já existe no Core, só falta uma UI de acesso direto.

## 3. Escopo

1. Nova tela/aba com listagem de todos os fardos estufados da operação
   (`GET /cargo?Status=Stuffed`, sem filtro de container — usando o
   parâmetro já existente), independente de qual container cada um está.
2. Ação de "desestufar" (reaproveitando o `CancelCargoUnitModal`/endpoint
   já existentes) diretamente dessa listagem, sem precisar navegar até o
   container específico primeiro.
3. Mostrar, para cada fardo, em qual container está estufado atualmente
   (dado já disponível via `CargoUnitDTO`/relação com
   `ContainerOperationDTO` — confirmar o shape exato do DTO ao
   implementar).

## 4. Fora do escopo

- Mudar o comportamento de negócio do cancelamento em si (motivo
  obrigatório, o que acontece no Core ao cancelar) — só a UI de acesso.
- Remover o botão de cancelar de dentro do `CargoUnitsModal` existente —
  pode continuar existindo como atalho contextual (a nova tela é um
  ponto de entrada adicional, não substitui o modal por container,
  salvo decisão do usuário em contrário durante a revisão).

## 5. `[NEEDS_DECISION]`

1. **Onde a nova tela entra na navegação?** RESOLVIDA (2026-09-15):
   **seção dentro de Containers** (não nova aba do shell de Operação) —
   toggle/seção "ver todos os fardos estufados" dentro da própria aba
   Containers.
2. **O modal `CargoUnitsModal` por container continua existindo em
   paralelo?** Implícito na decisão acima — sim, continua existindo
   (a nova seção é um ponto de entrada adicional dentro da mesma aba,
   não uma substituição).

## 6. Requisitos funcionais

- **RF1** — Nova listagem de fardos estufados da operação, filtrável por
  status e (opcionalmente) por container, usando
  `GetApiOperationOperationIdCargoParams` já existente.
- **RF2** — Ação de desestufar (cancelar) diretamente da listagem,
  reaproveitando `CancelCargoUnitModal`/`usePostApiOperationOperationIdCargoIdCancel`.
- **RF3** — Exibir o container de origem de cada fardo na listagem.

## 7. Camada de dados

- `getGetApiOperationOperationIdCargoQueryOptions(operationId, { Status:
  "Stuffed" })` (ou o enum de status equivalente) — sem `Limit: 100`
  fixo como hoje, considerar paginação real (ver SPEC-28, `ListPagination`
  compartilhado).
- Nenhuma mudança de contrato do Core necessária — endpoint já suporta o
  filtro necessário.

## 8. UI

- Reaproveitar `CancelCargoUnitModal` (extraído de `Containers.tsx` para
  módulo compartilhado, se a nova tela morar em arquivo separado).
- Tabela com colunas: status, identificado, peso bruto, container de
  origem, ação de desestufar — mesmo padrão visual de `CargoUnitsModal`.

## 9. i18n

Namespace `administrative-operations`, sub-namespace novo `destuffing.*`,
4 locales — chaves exatas a definir na implementação.

## 10. Arquivos esperados

- `src/components/operations/tabs/Containers.tsx` (nova seção/toggle
  dentro da aba, extração de `CancelCargoUnitModal` para módulo
  compartilhado se necessário).

## 11. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Dentro da aba Containers, existe uma seção/toggle que lista todos os fardos `Stuffed` da operação, independente de container |
| CA2 | Ação de desestufar disponível diretamente dessa listagem, sem precisar abrir o modal por container |
| CA3 | Cada linha mostra o container de origem do fardo |
| CA4 | `CargoUnitsModal` por container continua funcionando sem regressão |
| CA5 | `bun run check` + `bun run lint` sem regressão |

## 12. Riscos

- **R1** — Baixo, decisão de IA de informação já fechada (§5).

## 13. Implementation Notes (2026-09-16)

**RF1 (listagem):** novo `AllStuffedCargoSection` (`Containers.tsx`),
toggle na barra de ações da aba (botão "Ver todos os fardos estufados",
ao lado de "Vincular container", decisão §5.1: seção dentro de
Containers, não nova aba). Usa `GetApiOperationOperationIdCargoParams`
já existente com `Status: "Stuffed"`, paginação real via
`Offset`/`Limit` + `ListPagination` (não o `Limit: 100` fixo que
`CargoUnitsModal` usa — RF1 pediu considerar paginação de verdade, §7).

**RF2 (desestufar da listagem):** reaproveita `CancelCargoUnitModal` tal
qual — já era genérico sobre `cargoUnit`/`operationId`, sem depender de
container, então não precisou de nenhuma extração pra módulo
compartilhado (§10 previa isso "se necessário"; não foi — mesmo arquivo,
`Containers.tsx`, já bastava).

**RF3 (container de origem):** achado durante a implementação —
`CargoUnitDTO` não devolve o container aninhado, só
`containerOperationId`. Resolvido com uma segunda busca leve
(`getGetApiOperationOperationIdContainerQueryOptions(operationId, {
Limit: 200 })`) só pra montar um `Map<containerOperationId,
identifier>` — precisa cobrir todos os vínculos da operação, não só a
página atual da tabela principal (que usa `PAGE_SIZE`, tipicamente bem
menor).

**Arquivos alterados:**
- `src/components/operations/tabs/Containers.tsx`
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json`
  — novo namespace `destuffing.*` (`toggle`/`title`/`empty`/
  `colContainer`); as demais colunas/labels da tabela reaproveitam as
  chaves já existentes de `stuffing.*` (`colStatus`, `colIdentified`,
  `colGrossWeight`, `colActions`, `yes`/`no`, `cancelTitle` — nenhuma
  duplicata criada).

**Validação:** `bun run check` (tsc --noEmit) limpo. `bun run lint` sem
findings em `Containers.tsx` nem nos dicionários tocados. CA1-CA3
verificáveis em código; CA4 (`CargoUnitsModal` por container) não sofreu
nenhuma alteração — continua funcionando como antes; CA5 confirmado.
