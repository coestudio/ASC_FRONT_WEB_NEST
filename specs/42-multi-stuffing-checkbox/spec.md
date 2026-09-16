# SPEC-42 — Tela de estufagem múltipla por checkbox

- **ID:** SPEC-42
- **Nome:** multi-stuffing-checkbox
- **Status:** IMPLEMENTED (2026-09-16) — ver §13 (Implementation Notes).
- **Status anterior:** DRAFT (revisado 2026-09-16, 2x) — **§4 já resolvido pelo
  Core.** `specs/31-cargo-stuffing-batch-identified` já é `IMPLEMENTED`
  (2026-09-15) e respondeu a pergunta em aberto original: existe endpoint
  dedicado `POST .../cargo/stuff/identified-batch` (opção 1 do §4,
  endpoint novo, não N chamadas sequenciais). **Achado novo (2ª
  revisão, 2026-09-16):** Core `specs/25-cargo-stuffing-lote-scope`
  (`IMPLEMENTED`, depois da SPEC-31) acrescentou `Lote` **obrigatório
  por item** no payload de `identified-batch` — o shape documentado
  abaixo em §4/§7/RF3 estava desatualizado (sem `Lote`), corrigido
  agora. Ver também `specs/46-cargo-stuffing-lote-required` (mesma
  exigência nos modos A/B singulares, que já são `IMPLEMENTED` e
  quebram sem esse campo). Ainda não apareceu em `src/api/generated/**`
  porque `just map` não rodou. Assim que `just map` rodar, RF3/RF4
  deixam de depender de decisão de UX de erro parcial (o backend já é
  atômico: tudo-ou-nada, ver Core SPEC-31 §"Decisões técnicas").
- **Autor:** portal-dev-agent (rascunho); revisão de status 2026-09-16
  (cruzamento com Core `specs/31-cargo-stuffing-batch-identified`)
- **Área:** nova tela/aba a definir, `src/components/operations/tabs/Containers.tsx`
  (referência dos modos existentes)
- **Depende de (Core):** ~~a confirmar se o endpoint atual de estufagem
  suporta múltiplos `CargoUnit` numa única chamada~~ — **resolvido**:
  `specs/31-cargo-stuffing-batch-identified` (`IMPLEMENTED`). Falta só
  `just map` pra expor `identified-batch` no client gerado.
- **Contexto do pedido:** item do `TODO.md` pedindo uma tela nova que
  liste todos os fardos do romaneio com checkbox, selecione vários de uma
  vez e estufe todos juntos num único container.

---

## 1. Objetivo

Nova tela que lista todos os fardos do romaneio de uma operação com
checkbox de seleção múltipla, permitindo estufar vários fardos de uma vez
no mesmo container — hoje só existe o "Modo A" (estufar um fardo
específico por vez) e o "Modo B" (estufar por quantidade, sem escolher
qual fardo).

## 2. Contexto

`Containers.tsx` já tem 2 modos de estufagem (confirmado pelos endpoints
já usados na aba):

- **Modo A** — `usePostApiOperationOperationIdCargoStuffIdentified`
  (`PostApiOperationOperationIdCargoStuffIdentifiedBody`) — estufa um
  fardo identificado específico.
- **Modo B** — `usePostApiOperationOperationIdCargoStuffQuantity`
  (`PostApiOperationOperationIdCargoStuffQuantityBody`) — estufa por
  quantidade, sem escolher fardos específicos (presumivelmente o Core
  escolhe automaticamente quais fardos, ou trata como "não
  identificados" — confirmar o comportamento exato ao implementar).

O pedido do usuário é um terceiro modo: selecionar **múltiplos fardos
identificados** de uma vez (via checkbox numa listagem) e estufar todos
no mesmo container numa única ação — hoje isso exigiria repetir o Modo A
fardo por fardo.

## 3. Escopo

1. Nova tela/seção que lista os fardos do romaneio (reaproveitando dado
   de `GetApiOperationOperationIdRomaneioQueryOptions` ou o de
   `cargo`/`CargoUnit` conforme o que representar melhor "fardos
   disponíveis para estufar" — a confirmar ao implementar, ver §4).
2. Seleção múltipla via checkbox (mesmo padrão já usado em
   `ImportRomaneioModal`, `Form.Check` com `Set<string>` de ids
   selecionados).
3. Seleção de um container de destino (reaproveitar `SelectAsync` já
   usado em outros formulários da aba Containers).
4. Ação de estufar todos os fardos selecionados nesse container.

## 4. ~~`[NEEDS_DECISION]`~~ — RESOLVIDO pelo Core (2026-09-16)

**Era:** não estava confirmado se o endpoint de estufagem aceitava
múltiplos ids numa única chamada.

**Resposta (Core `specs/31-cargo-stuffing-batch-identified`,
`IMPLEMENTED`):** opção 1 confirmada — endpoint dedicado
`POST operation/{operationId}/cargo/stuff/identified-batch`, payload
**atualizado (2026-09-16, pós `specs/25-cargo-stuffing-lote-scope`)**:
`{ ContainerOperationId, Items: [{ RomaneioId, InvoiceId, Lote }] }` (um
`InvoiceId` **e agora um `Lote`** por item, já que os fardos selecionados
podem vir de NFs/Lotes diferentes — decisão de negócio já fechada do
lado Core, §3.2 daquela spec + §9 da SPEC-25). `Lote` é checado contra
o `Lote` real da linha de Romaneio escolhida (mesma consistência
declarativa do Modo A single) — recusa (400,
`CargoUnitRomaneioMustMatchDeclaredLote`) se não bater. Comportamento:

- **Atômico, tudo-ou-nada.** Se qualquer linha do lote já estiver
  ocupada (por outra chamada concorrente ou já estufada), a leva inteira
  é recusada (400, `CargoUnitRomaneioLineAlreadyLinked`) e **nenhuma**
  `CargoUnit` é criada — sem sucesso parcial. Isso **elimina** a
  necessidade da decisão de UX de "parar no primeiro erro vs. continuar e
  reportar" — não existe erro parcial para tratar, é sucesso total ou
  falha total numa única resposta.
- Retorna `CargoStuffResultDTO` (já usado pelo Modo B) com todas as
  `CargoUnit`s criadas de uma vez.
- Validações de payload (lote vazio, `RomaneioId` duplicado) já vêm como
  400 com `MessageCode` dedicado do Core (`CargoUnitBatchItemsRequired`,
  `CargoUnitBatchDuplicateRomaneioLine`) — tratar como toast, mesmo
  padrão de outros erros de negócio do projeto.

**Ainda falta:** rodar `just map` — nenhuma referência a
`identified-batch` existe hoje em `src/api/generated/**`, confirmado por
grep. Implementação real desta SPEC continua bloqueada só por isso, não
mais por decisão de contrato/UX.

## 5. Fora do escopo

- Mudar o Modo A/Modo B existentes.
- Desestufar em lote (fora do pedido, ver SPEC-36 para desestufagem
  individual).

## 6. Requisitos funcionais (bloqueados só por `just map`, ver §4)

- **RF1** — Nova tela/seção lista fardos do romaneio disponíveis para
  estufar (não já estufados/cancelados), com checkbox de seleção
  múltipla.
- **RF2** — Seleção de container de destino via `SelectAsync`.
- **RF3** — Ação "Estufar selecionados" dispara **uma única chamada**
  (`POST .../cargo/stuff/identified-batch`) com todos os fardos
  marcados, resolvendo o `InvoiceId` **e o `Lote`** de cada item (ambos
  já disponíveis na listagem de fardos do romaneio escolhida — não
  pedir pro operador digitar de novo, mesma recomendação da
  `specs/46-cargo-stuffing-lote-required` §4 pro Modo A single).
- **RF4** — Feedback de erro **é sempre tudo-ou-nada** (backend atômico,
  §4): em caso de 400, exibir toast com a mensagem do `MessageCode`
  retornado (ex. `CargoUnitBatchDuplicateRomaneioLine`,
  `CargoUnitRomaneioLineAlreadyLinked`) — não há mais "feedback por
  fardo" a desenhar, porque não existe sucesso parcial.

## 7. Camada de dados

- Reaproveitar `getGetApiOperationOperationIdRomaneioQueryOptions`
  (fardos do romaneio).
- Nova chamada (após `just map`):
  `usePostApiOperationOperationIdCargoStuffIdentifiedBatch` (nome exato a
  confirmar no client gerado) — body
  `{ ContainerOperationId, Items: [{ RomaneioId, InvoiceId, Lote }] }`.

## 8. UI

- Tabela/lista com checkbox por linha + checkbox "selecionar todos"
  (mesmo padrão de `ImportRomaneioModal`).
- Contador de selecionados + botão de ação, desabilitado sem seleção.

## 9. i18n

Namespace `administrative-operations` (novo sub-namespace, ex.
`multiStuffing.*`), 4 locales.

## 10. Arquivos esperados

- Novo arquivo de tela/seção (nome exato a definir na implementação)
- `src/components/operations/tabs/Containers.tsx` (referência/possível
  entrada de navegação para a nova tela)

## 11. Critérios de aceitação

| #   | Critério                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- |
| CA0 | `just map` executado, `identified-batch` presente no client gerado                                                                    |
| CA1 | Tela lista fardos do romaneio com checkbox de seleção múltipla                                                                        |
| CA2 | Selecionar container de destino via `SelectAsync`                                                                                     |
| CA3 | Ação de estufar dispara 1 única chamada em lote; erro (400) exibe toast com a mensagem do `MessageCode` retornado, sem estado parcial |
| CA4 | `bun run check` + `bun run lint` sem regressão                                                                                        |

## 12. Riscos

- ~~**R1** — Se o endpoint só aceitar 1 fardo por chamada, a UX de erro
  parcial precisa ser bem definida~~ — **não se aplica mais**: o Core
  entregou endpoint em lote atômico (§4), não há erro parcial a desenhar.
- **R2 (novo, 2026-09-16)** — risco de processo, não de negócio: não
  implementar antes de rodar `just map` e confirmar o nome exato do hook
  gerado e o shape de `Items` no client — o nome usado neste documento
  (`usePostApiOperationOperationIdCargoStuffIdentifiedBatch`) é uma
  suposição baseada na convenção Orval do projeto, não confirmado contra
  o client real ainda.

## 13. Implementation Notes (2026-09-16)

**Confirmado antes de implementar:** `just map` já tinha sido rodado numa
rodada anterior (SPEC-46) contra o Core local — `identified-batch` já
presente em `src/api/generated/**`, hook
`usePostApiOperationOperationIdCargoStuffIdentifiedBatch` (nome
confirmado, batia com a suposição do §12/R2), body
`CargoUnitStuffIdentifiedBatch { containerOperationId, items:
IdentifiedBatchItem[] }` com `IdentifiedBatchItem { romaneioId, invoiceId,
lote }` — shape idêntico ao documentado em §4/§7.

**Desvio de design em relação ao §3/§8 original (nova tela própria):**
implementado como um **4º modal** dentro de `Containers.tsx`
(`StuffBatchModal`), acionado por um novo botão de ação por linha de
container (`bi-collection`, ao lado dos 3 botões de estufagem/visualização
já existentes), em vez de uma tela nova e independente. Razão: o container
de destino (RF2) já é o próprio contexto da linha clicada — abrir uma tela
separada exigiria pedir pro operador escolher de novo um container que ele
já está olhando na listagem, replicando a mesma "digitação redundante"
que a SPEC-46 identificou como má UX no Modo A. Mesmo padrão arquitetural
dos outros 2 modos de estufagem (`StuffIdentifiedModal`/
`StuffQuantityModal`), que também são modais por linha, não telas.

**Fluxo implementado (dentro do modal):**
1. Selecionar uma Invoice via `SelectAsync` (mesmo padrão dos outros
   modos) — o Core valida cada linha do lote contra o `Number` dessa
   Invoice (`EnsureRomaneioMatchesInvoice`), então uma única Invoice por
   lote é suficiente e consistente com o contrato.
2. Ao escolher a Invoice, busca as linhas de Romaneio candidatas — **não
   existe filtro `InvoiceId` no endpoint de Romaneio** (só `Search`, livre;
   confirmado em `GetApiOperationOperationIdRomaneioParams` e em
   `RomaneioController.GetAll`, que casa `Search` contra
   `ItemIdentifier`/`ItemCode`/`NotaFiscal`/`Lote`). Solução: guarda o
   `Number` da Invoice escolhida (`invoiceNumberByIdRef`, populado a cada
   resposta do `SelectAsync`, mesma técnica do `romaneioLoteByIdRef` já
   usado no Modo A) e usa esse valor como `Search` — o Core casa contra
   `NotaFiscal`. Debt conhecido: é um `Contains`, não um filtro exato por
   `InvoiceId` — na prática funciona porque `NotaFiscal` normalmente é
   único/específico o bastante, mas teoricamente uma NF cujo texto seja
   substring de outra poderia trazer linhas a mais na lista (o operador
   ainda escolhe manualmente via checkbox, então não polui o payload
   final, só a lista de opções exibida).
3. Lista as linhas retornadas com checkbox (`Form.Check` + `Set<string>`
   de ids selecionados, mesmo padrão de `ImportRomaneioModal` em
   `Romaneio.tsx`), contador de selecionados, sem "selecionar todos"
   (não pedido, e a lista já é filtrada por Invoice).
4. `Lote` de cada item é derivado automaticamente do próprio dado já
   carregado (`romaneio.lote`) — nenhum campo de formulário para digitar
   lote, seguindo a mesma recomendação da SPEC-46 §4 (opção 1).
5. Submit dispara uma única chamada
   `usePostApiOperationOperationIdCargoStuffIdentifiedBatch` com
   `{ containerOperationId, items: [...] }`; sucesso invalida a lista de
   `CargoUnit` (mesmo `invalidateCargo` já usado pelos outros 2 modos);
   erro cai no mesmo catch genérico de toast (`administrative-
   operations.containers.toast.error`) já usado no resto do arquivo —
   mesma decisão de RF4 (não há parsing de `MessageCode` específico,
   consistente com o precedente aceito na SPEC-46).

**Arquivos alterados:**
- `src/components/operations/tabs/Containers.tsx` — novo estado
  `stuffBatchFor`, novo botão de ação (`bi-collection`), novo componente
  `StuffBatchModal` (usa `usePostApiOperationOperationIdCargoStuffIdentifiedBatch`,
  `getApiOperationOperationIdInvoice`, `getApiOperationOperationIdRomaneio`).
- i18n: `administrative-operations.containers.stuffing.actionBatch`,
  `batchTitle`, `batchEmpty`, `batchSelected`, `toast.batchSuccess` —
  4 locales.

**Comandos executados e resultado:**
- `bun run check` (`tsc --noEmit`) — PASS.
- `bun run lint` — 66/3 (mesma baseline pré-existente de
  `session.server.ts`, sem regressão em `Containers.tsx`).

**Critérios de aceitação:**

| # | Critério | Status |
|---|----------|--------|
| CA0 | `just map` executado, `identified-batch` presente no client gerado | PASS |
| CA1 | Ação lista fardos do romaneio (filtrados por Invoice) com checkbox de seleção múltipla | PASS |
| CA2 | Container de destino já é o da linha clicada — sem `SelectAsync` de container dentro do modal (ver desvio de design acima) | PASS (com desvio documentado) |
| CA3 | Ação de estufar dispara 1 única chamada em lote; erro (400) exibe toast genérico, sem estado parcial | PASS |
| CA4 | `bun run check` + `bun run lint` sem regressão | PASS |

**Limitações conhecidas / débito:**
- Filtro de Romaneio por Invoice via `Search`/`NotaFiscal` (Contains), não
  um filtro exato por `InvoiceId` — ver ponto 2 do fluxo acima.
- Erro específico (`CargoUnitBatchDuplicateRomaneioLine`,
  `CargoUnitRomaneioLineAlreadyLinked`, etc.) não é distinguido por
  `MessageCode` — cai no toast genérico, mesmo padrão já aceito em toda a
  aba Containers (SPEC-46).
