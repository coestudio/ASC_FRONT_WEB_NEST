# SPEC-36 — Tela dedicada de desestufagem

- **ID:** SPEC-36
- **Nome:** destuffing-screen
- **Status:** DRAFT
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

1. **Onde a nova tela entra na navegação?** Como uma nova aba do shell de
   Operação (ao lado de Containers/Romaneio/etc.) ou como uma seção
   dentro da própria aba Containers (ex. um toggle "ver por container" /
   "ver todos os fardos estufados")? Impacta `nav`/estrutura de abas do
   shell de Operação (`SPEC-07-02`) — decisão de UX/IA de informação, não
   deve ser assumida sem confirmação.
2. **O modal `CargoUnitsModal` por container continua existindo em
   paralelo?** Ou a nova tela o substitui totalmente? Afeta se
   `Containers.tsx` precisa de alguma mudança além de reaproveitar
   endpoint/modal de cancelamento.

**Aguardando decisão do usuário** sobre §5.1 e §5.2 antes de detalhar o
contrato de rota/UI final.

## 6. Requisitos funcionais (pendentes de §5)

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

Namespace `administrative-operations` (novo sub-namespace, ex.
`destuffing.*`), 4 locales — chaves exatas a definir conforme a decisão
de IA de informação do §5.

## 10. Arquivos esperados (estimativa, depende de §5)

- Novo arquivo de tela/aba (nome exato a definir conforme §5.1)
- `src/components/operations/tabs/Containers.tsx` (extração de
  `CancelCargoUnitModal` para módulo compartilhado, se necessário)

## 11. Critérios de aceitação (pendentes de §5)

Bloqueado até a decisão do §5 — critérios detalhados serão adicionados
quando a IA de informação for confirmada.

## 12. Riscos

- **R1** — Sem a decisão do §5, qualquer implementação corre o risco de
  desenhar uma navegação que o usuário não queria (nova aba vs. seção
  dentro de Containers).
