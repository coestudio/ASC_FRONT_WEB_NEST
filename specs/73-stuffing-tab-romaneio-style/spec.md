# SPEC-73 — Sub-aba Estufagem: listagem estilo Romaneio + seleção múltipla

- **ID:** SPEC-73
- **Nome:** stuffing-tab-romaneio-style
- **Status:** IMPLEMENTED (2026-09-17)
- **Autor:** claude (pedido do usuário, 2026-09-17)
- **Área:** `src/components/operations/tabs/Operational.tsx` (`StuffingTab`
  e os 3 modais de estufagem, movidos/reescritos), sem mudança no Core.

---

## 1. Objetivo

Pedido do usuário: redesenhar a sub-aba Estufagem (dentro de
"Operacional", SPEC-60) pra funcionar como o Romaneio — mesma listagem,
mas mostrando **só fardos ainda não estufados** — com:

1. Seleção múltipla (checkbox) de fardos + botão "Estufar em container":
   o operador escolhe um dos containers vinculados à operação e os
   fardos marcados são estufados nele.
2. Botão "Estufagem por quantidade": abre formulário com Nota Fiscal,
   Lote e Quantidade (mais o container, que precisa ser escolhido
   explicitamente agora — não vem mais implícito de uma linha clicada).

## 2. Contexto (o que já existe, sem mudar)

- `Romaneio.tsx` já tem exatamente a infraestrutura que a nova tela
  precisa: `CrudListPage` com `CrudSelection` (checkbox por linha +
  "selecionar tudo", SPEC-53), filtro `IsStuffed` no endpoint
  (`GetApiOperationOperationIdRomaneioQueryParams.IsStuffed: boolean`),
  toolbar de ações em massa quando `selectedIds.size > 0`. A tela nova
  reaproveita o mesmo padrão (`CrudListPage`/`CrudSelection`), não
  reinventa.
- `POST .../cargo/stuff/identified-batch` (Core, `CargoUnit.Stuff.cs`)
  **já aceita itens de Notas Fiscais diferentes na mesma chamada**
  (comentário do próprio Core, SPEC-31: "Cada item pode citar uma
  Invoice diferente") — cada item leva `romaneioId` + `invoiceId` +
  `lote` próprios, só o `containerOperationId` é único pra chamada
  inteira. **Nenhuma mudança de contrato no Core é necessária** pro
  fluxo de seleção múltipla.
- `POST .../cargo/stuff/quantity` (Modo B, já existente) recebe
  `containerOperationId` + `invoiceId` + `lote` + `quantity` — é
  literalmente o que o botão "Estufagem por quantidade" precisa; só
  muda que agora o formulário pede o container explicitamente (hoje ele
  vem implícito da linha de container clicada em `StuffQuantityModal`).
- `RomaneioDTO` expõe `notaFiscal` (**string**, o número da NF), não um
  `invoiceId`. Pra chamar `stuff/identified-batch` (que exige
  `invoiceId` por item), a tela precisa resolver NF → Invoice
  internamente: buscar as Invoices da operação e casar pelo `number`.
  Um fardo cuja NF não tenha nenhuma Invoice criada ainda não tem como
  ser estufado por este fluxo (ver D2).

## 3. Escopo proposto

1. `StuffingTab` (`Operational.tsx`) passa a usar `CrudListPage` sobre
   `getGetApiOperationOperationIdRomaneioQueryOptions(operationId, {
   IsStuffed: false, Search, Offset, Limit })` — busca e paginação iguais
   ao Romaneio, mas **sem** o filtro "Estufado" (sempre `false`, fixo,
   sem seletor pro usuário — não faz sentido estufar algo já estufado
   nesta tela).
2. Colunas: mesmo conjunto informativo do Romaneio (Fardo, Código, NF,
   Lote, Peso) — sem a coluna "Estufado" (redundante, já que só mostra
   não-estufados) e sem coluna de Ações de editar/ver (ver D1).
3. `CrudSelection` — checkbox por linha, sem restrição adicional (a
   integridade "toda linha de romaneio tem `notaFiscal`" é garantia do
   Core, não uma checagem defensiva do front, ver D2).
4. Toolbar de seleção (`selectedIds.size > 0`): botão "Estufar em
   container" → modal com resumo (contagem de fardos selecionados +
   quantas NFs distintas) + `SelectAsync` de container (mesmo
   `fetchContainerOptions` já usado em `Containers.tsx`) → confirma →
   resolve NF→Invoice de cada item selecionado (busca as Invoices da
   operação, casa por `number`) → chama
   `usePostApiOperationOperationIdCargoStuffIdentifiedBatch` uma vez,
   com todos os itens. Se alguma NF selecionada não tiver Invoice
   correspondente, a chamada não é feita — toast de erro citando a NF
   que falta (o operador cria a Invoice na aba Nota Fiscal e tenta de
   novo), sem submeter parcialmente.
5. Botão fixo (independente de seleção) "Estufagem por quantidade" →
   modal com Container (`SelectAsync`, novo campo), Nota Fiscal
   (`SelectAsync` de Invoice, já existente em `StuffQuantityModal`),
   Lote (texto) e Quantidade (número) → chama
   `usePostApiOperationOperationIdCargoStuffQuantity`.
6. `StuffIdentifiedModal` (Modo A, um fardo específico por vez, hoje
   acessível por botão de linha de container) é **removido** — selecionar
   1 fardo só e usar "Estufar em container" cobre o mesmo caso (D1).

## 4. Fora do escopo

- Qualquer mudança no Core — os 2 endpoints de estufagem já suportam
  tudo que este redesenho precisa.
- Mudar o Romaneio em si (`Romaneio.tsx`) — só a sub-aba Estufagem muda.
- Sub-aba Desestufagem (`DestuffingTab`) — inalterada.

## 5. Decisões — fechadas com o usuário (2026-09-17)

- **D1 — o botão "estufar fardo específico" (Modo A) sai.** Selecionar 1
  fardo e usar "Estufar em container" cobre o mesmo caso.
- **D2 — fardo sem Invoice resolvível não é uma checagem defensiva do
  front.** Decisão do usuário: "é algo que o back-end tem que garantir
  que não aconteça — não pode existir fardo sem nota fiscal, apenas
  nota fiscal sem fardo". Ou seja, toda linha de romaneio com
  `notaFiscal` preenchido deveria sempre ter uma Invoice correspondente
  em uso normal do sistema (import já cria a Invoice automaticamente,
  `InvoiceAutoCreated`) — o front não desabilita checkbox por causa
  disso. Ainda assim, na hora de montar a chamada de batch, se a
  resolução NF→Invoice falhar pra algum item selecionado (inconsistência
  de dado, não fluxo normal), a chamada não é enviada e aparece um toast
  de erro citando a NF — tratamento de exceção, não UX preventiva.
- **D3 — mostra resumo antes de confirmar.** Modal de "Estufar em
  container" tem contagem de fardos + NFs distintas antes do `SelectAsync`
  de container, com botão de confirmar separado (sem disparo automático
  ao escolher o container).

## 6. Requisitos funcionais

- RF1: listagem mostra só fardos com `isStuffed = false`.
- RF2: seleção múltipla funciona igual ao Romaneio (checkbox, selecionar
  tudo da página, contador de selecionados).
- RF3: "Estufar em container" resolve NF→Invoice por item e chama o
  batch numa única requisição.
- RF4: "Estufagem por quantidade" funciona com container escolhido no
  próprio formulário.
- RF5: erros de estufagem (ex. peso excedido) mostram os mesmos
  `warnings`/toasts já tratados nos modais atuais.

## 7. Critérios de aceitação

- CA1: fardo estufado por qualquer um dos 2 fluxos some da listagem
  (RF1) sem precisar de F5.
- CA2: seleção com fardos de 2+ NFs diferentes estufa todos no mesmo
  container numa chamada só.
- CA3: `tsc --noEmit` e lint sem erro novo.

## 8. Implementation Notes (2026-09-17)

- `StuffingTab` reescrito sobre `CrudListPage`/`CrudSelection`
  (`getGetApiOperationOperationIdRomaneioQueryOptions(operationId, {
  IsStuffed: false, ... })`), mesmo padrão de `Romaneio.tsx`. Colunas
  reaproveitam as chaves i18n do Romaneio (`romaneio.colItemIdentifier`
  etc.) — sem duplicar texto.
- **Resolução de seleção entre páginas:** `CrudSelection` só expõe ids
  (`onToggle(id)`), não o item inteiro — pra ter o `notaFiscal`/`lote`
  completos na hora de montar o batch (mesmo depois de trocar de
  página), `StuffingTab` roda `useSsrSafeQuery(listQueryOptions)`
  paralelamente ao `CrudListPage` (mesma queryKey/params → React Query
  dedupe, uma só requisição) só pra alimentar um `itemsByIdRef` que
  acumula todo item já visto, por id.
- `StuffBatchModal` reescrito do zero: recebe `items: RomaneioDTO[]`
  (resolvidos via `itemsByIdRef`), mostra resumo (`batchSummary`,
  contagem de fardos + NFs distintas), pede só o container
  (`SelectAsync`). No submit, resolve NF→Invoice com `Promise.all` (uma
  busca por NF distinta, casando `invoice.number === notaFiscal`
  exatamente — a Invoice já teria sido criada automaticamente na
  importação do romaneio, `InvoiceAutoCreated`) e só então chama
  `stuff/identified-batch` com todos os itens numa única chamada — Core
  já aceita NFs diferentes na mesma leva (SPEC-31), nenhuma mudança de
  contrato precisou ser feita. Se alguma NF não resolver (D2: tratado
  como exceção, não checagem preventiva de UI), nada é enviado — toast
  `batchMissingInvoice` citando a NF.
- `StuffQuantityModal` ganhou campo `containerOperationId` como
  `SelectAsync` de verdade (antes vinha implícito da linha de container
  clicada) — resto do fluxo (bifurcação por `Invoice.source`,
  `resultIdentifiedTitle`/`resultManualTitle`) inalterado.
- `StuffIdentifiedModal` (Modo A) removido por completo — nenhum
  consumidor restante (D1).
- i18n: chaves órfãs removidas (`actionIdentified`, `actionQuantity`,
  `actionBatch`, `identifiedTitle`, `batchEmpty`,
  `stuffing.form.romaneio`, `toast.identifiedSuccess`); novas:
  `stuffing.batchButton`, `stuffing.quantityButton`,
  `stuffing.batchSummary`, `stuffing.batchMissingInvoice`, namespace
  `operational.stuffing.{title,description,empty}` — 4 idiomas.
- Container escolhido em `StuffQuantityModal`/`StuffBatchModal` busca
  via `getApiOperationOperationIdContainer` (containers já vinculados à
  operação) — reutiliza o mesmo endpoint/shape já usado em
  `Containers.tsx`, sem endpoint novo.
- Validação: `tsc --noEmit` e `bun run lint` — 0 erros, 0 avisos novos
  em `Operational.tsx`. **Não testado em navegador** contra dado real
  (sem sessão logada disponível na sessão) — só validado que o Core
  local (mesmo processo já rodando desde a SPEC-45) segue servindo os
  endpoints consumidos sem mudança de contrato.
