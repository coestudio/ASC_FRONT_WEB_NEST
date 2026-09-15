# SPEC-07-11 — Operações: aba Containers — estufagem (CargoUnit Modo A/B)

- **ID:** SPEC-07-11
- **Nome:** operation-cargo-stuffing
- **Status:** IMPLEMENTED
- **Autor:** portal-dev-agent (reconciliado pós-`just map`, 2026-09-15)
- **Área:** `src/components/operations/tabs/Containers.tsx` (editado —
  criado pela SPEC-07-05, `IMPLEMENTED`), `src/i18n/dictionaries/*/
administrative-operations.json` (editado), e (fora da área de Operações)
  o formulário de cadastro de Container em
  `src/routes/_dashboard/_internal/administrative/registry/container/index.tsx`
  (editado — novo campo `maxWeight`, ver §3.5)
- **Depende de:** SPEC-00, SPEC-02, SPEC-SHARE-01 (`Select`/`SelectAsync`,
  já usados pela SPEC-07-05), SPEC-07-01 (namespace), SPEC-07-02 (shell),
  **SPEC-07-05** (`operation-containers`, `IMPLEMENTED` — esta SPEC
  **substitui/estende** a ação de vínculo container↔operação dela,
  adicionando a ação de estufagem; não reescreve o CRUD de vínculo em si).
  **Dependia também, fora deste repo, de** `warren/Core` **SPEC-22**
  (`cargo-unit-redesign` — CargoUnit redesenhado, extinção de
  `InvoiceItem`, `Container.MaxWeight`) **e SPEC-23**
  (`cargo-stuffing-gates` — endpoints de estufagem Modo A/B + gates de
  peso) — **ambas `IMPLEMENTED` agora no Core**, `just map` já rodou
  nesta branch e trouxe o contrato real (ver §0, histórico do bloqueio).
  A SPEC-19 original do Core
  (`specs/19-romaneio-invoice-container-flow/spec.md`) virou só o índice
  dessas ondas. Esta aba **não** depende diretamente de SPEC-20/SPEC-21
  do Core (as que bloqueiam/bloqueavam a SPEC-07-10, em progresso em
  paralelo, outra branch/agente). Depende ainda, indiretamente, de
  **SPEC-07-10** (`operation-invoice`) só como referência de UX (a
  estufagem escolhe uma Invoice existente) — sem ordem de implementação
  obrigatória entre as duas no NewPortal.

---

## 0. Bloqueio (histórico — resolvido)

**Desbloqueado em 2026-09-15.** `warren/Core` SPEC-22 (`cargo-unit-redesign`)
e SPEC-23 (`cargo-stuffing-gates`) estão `IMPLEMENTED`; `just map` já rodou
nesta branch (`spec-07-11-operation-cargo-stuffing`, commit
`4400ce9 just map: contrato SPEC-14 a 17`, mensagem de commit anterior à
renumeração — ver nota de renumeração no índice do Core) e `tsc --noEmit`
passou limpo. O
client gerado hoje já reflete o modelo pós-SPEC-22/23:
`src/api/generated/endpoints/cargo-unit/cargo-unit.ts` expõe
`usePostApiOperationOperationIdCargoStuffIdentified` (Modo A) e
`usePostApiOperationOperationIdCargoStuffQuantity` (Modo B), `CargoUnitDTO`
não tem mais `Open`/vínculo a `InvoiceItem` (`cargoUnitLinkInvoiceItem.ts`
não existe mais no client gerado), `CargoUnitStatus` ficou só
`Stuffed | Canceled`, e `ContainerDTO`/`ContainerCreate`/`ContainerUpdate`
já têm `maxWeight` (decimal nullable, mesmo shape/pattern de `tara`).

Este texto original do racional de bloqueio permanece abaixo só como
histórico de por que a SPEC nasceu `BLOCKED` — não é mais aplicável.

<details>
<summary>Racional original (histórico, já resolvido)</summary>

Igual à SPEC-07-10 (ver lá §0 para o texto completo do racional): o
contrato consumido aqui — `CargoUnit` redesenhado (nasce só via
`stuff/identified` ou `stuff/quantity`, sem mais `Open`/`Update()`/
`StuffInto()`/`MarkDivergent`/`Reconcile`), `Container.MaxWeight` — era
definido por `warren/Core` **SPEC-22** (`cargo-unit-redesign`) e
**SPEC-23** (`cargo-stuffing-gates`). Nenhuma das duas estava implementada
ainda; pior, **SPEC-22 estava ela própria `BLOCKED` no Core** por uma
decisão de migração de dado de produção ainda pendente lá (quantas
`CargoUnit`s existentes caem em `Status=Open` sem `ContainerOperationId`,
e o que fazer com elas) — ou seja, esta SPEC de frontend estava bloqueada
por uma cadeia de duas dependências, não uma.

</details>

## 1. Objetivo

Estender a aba **Containers** (`SPEC-07-05`, já `IMPLEMENTED`) com a ação
de **estufagem**, como dois fluxos separados (D1, §14 — não modal único):
criar `CargoUnit`(s) dentro de um container já vinculado à operação, no
Modo A (fardo específico do romaneio) ou no Modo B (quantidade). O Modo B
**não** produz sempre unidade anônima: quando a Invoice tem romaneio
(`Source=RomaneioImport`), o backend seleciona automaticamente `quantity`
linhas ainda livres e o resultado é idêntico ao Modo A repetido; só
quando a Invoice é 100% manual é que o Modo B gera unidades
verdadeiramente anônimas (peso médio) — ver §3.2. A tela também exibe o
aviso de peso excedido quando o backend sinalizar (`Container.MaxWeight`
ultrapassado) e bloqueia (erro do servidor) quando não houver saldo
(linha/quantidade de romaneio disponível) suficiente.

## 2. Contexto

`SPEC-07-05` implementou o vínculo container↔operação (fotos, lacres,
status — `ContainerOperationStatus`) como CRUD simples. A SPEC-22/SPEC-23 do Core
introduz um conceito novo, **estufagem**, que não existia no modelo
consumido por aquela SPEC: até então `CargoUnit` nem tinha tela no
NewPortal. Depois da SPEC-22/SPEC-23 do Core, toda `CargoUnit` nasce **dentro**
de um vínculo container↔operação existente (`ContainerOperationId`
obrigatório) — ou seja, a ação de estufagem só faz sentido a partir de um
container já vinculado (fluxo da SPEC-07-05 continua sendo pré-requisito,
não é substituído).

## 3. Escopo

### 3.1 Ação de estufagem na aba Containers

**Decisão fechada com o usuário (D1, ver §14): dois fluxos completamente
separados, não um modal único com toggle.** Na lista de containers
vinculados à operação (já existente, SPEC-07-05), cada linha ganha
**dois botões/ações distintos**: **"Estufar fardo específico"** (Modo A)
e **"Estufar por quantidade"** (Modo B) — cada um abre seu próprio modal/
formulário independente, sem alternância dentro de uma mesma tela.

- **Modo A — fardo específico.** Payload real do endpoint
  (`CargoUnitStuffIdentified`, `src/api/generated/model/
  cargoUnitStuffIdentified.ts`): `{ containerOperationId, romaneioId,
  invoiceId }` — **`invoiceId` é explícito e obrigatório** (D2 fechada,
  ver §14). O Core não resolve a Invoice implicitamente a partir do
  `NotaFiscal` da linha de romaneio; o formulário precisa dos dois campos
  de fato: NF (`Select`/`SelectAsync` sobre as Invoices da operação →
  `invoiceId`) e o fardo específico do romaneio (`SelectAsync` sobre
  `RomaneioDTO` da operação, que já tem `lote`/`notaFiscal`/
  `itemIdentifier` para filtrar/exibir na lista → `romaneioId`). "Lote"
  não é campo do payload — é só filtro de UI para achar a linha certa
  dentro do `SelectAsync` (o endpoint de leitura de romaneio,
  `GET /api/operation/{operationId}/romaneio`, só tem `Search`/`Offset`/
  `Limit`/`Sort` como params — o filtro por NF/lote é client-side sobre o
  texto de busca ou por correspondência exata no rótulo da opção,
  detalhe de implementação, não de contrato).
- **Modo B — quantidade.** Payload real
  (`CargoUnitStuffByQuantity`, `model/cargoUnitStuffByQuantity.ts`):
  `{ containerOperationId, invoiceId, quantity }` — também sem campo de
  "lote" no contrato; só NF (`invoiceId`) + quantidade (`InputNumber`
  sobre o schema gerado). **Importante (ver §3.2):** o resultado desse
  modo depende da origem (`Invoice.source`) da Invoice escolhida — não é
  sempre "unidade anônima".

Em ambos os modos, `containerOperationId` já vem implícito (é a linha da
lista onde o operador clicou em um dos dois botões) — não é um campo
livre do formulário.

### 3.2 Modo B bifurca pela origem (`Source`) da Invoice — mudança de contrato do Core

`warren/Core/specs/23-cargo-stuffing-gates/spec.md` §2 (reescrito, decisão
do usuário 2026-09-15: "peso nunca é estimado, sempre vem de fonte
relacional real") redefine o Modo B:

- **`Invoice.Source == RomaneioImport`:** o Modo B **não** cria unidades
  anônimas. O backend seleciona automaticamente `quantity` linhas de
  Romaneio daquele número ainda **livres** (sem `CargoUnit` vinculada) e
  cria uma `CargoUnit` **identificada** para cada uma — resultado
  **idêntico** ao Modo A repetido `quantity` vezes, só que o operador não
  escolhe qual linha, o backend escolhe. Se não houver `quantity` linhas
  livres, o backend recusa (400) — o gate de saldo aqui é **contagem de
  linhas disponíveis**, não mais soma/estimativa de peso.
- **`Invoice.Source == Manual`:** aí sim o Modo B cria `quantity`
  `CargoUnit`s **verdadeiramente anônimas** (sem `RomaneioId`), peso
  médio = `Invoice.DeclaredGrossWeight / Invoice.DeclaredItemsCount`. Uma
  Invoice `Manual` nunca tem romaneio associado, então esse gate de saldo
  simplesmente não se aplica a ela.

**Impacto no desenho de tela:** o resultado do Modo B precisa comunicar
qual dos dois casos ocorreu:

- **D5 fechada (ver §14):** confirmado — os dois endpoints de estufagem
  devolvem `CargoStuffResultDTO` (`model/cargoStuffResultDTO.ts`):
  `{ cargoUnits?: CargoUnitDTO[], warnings?: string[] }`. `cargoUnits` traz
  as `CargoUnit`s recém-criadas já completas (`id`, `romaneioId`
  nullable, `identified`, pesos), então a tela **não precisa** de uma
  segunda leitura (GET) para montar a lista — o próprio response do
  `stuff/quantity` já contém, por unidade, o `romaneioId` de cada linha
  que o backend escolheu (identificador rastreável, item §3.2). No caso
  `Manual`, os itens de `cargoUnits` vêm com `romaneioId: null` e
  `identified: false` — dá pra distinguir os dois casos só olhando o array
  retornado (sem precisar nem checar `Invoice.source` de novo no cliente,
  embora a UI já saiba isso de antemão pela Invoice escolhida, R5).
- Se a Invoice escolhida for `RomaneioImport`, a tela **exibe a lista**
  (ex.: "3 fardos estufados: identificadores X, Y, Z") a partir do array
  `cargoUnits` do próprio response, não só um contador genérico — o
  operador precisa poder conferir/rastrear quais fardos específicos
  saíram do romaneio.
- Se a Invoice for `Manual`, a tela mostra só a contagem (`cargoUnits.length`,
  todos com `romaneioId: null`) e, opcionalmente, o peso médio usado — sem
  prometer rastreabilidade individual, porque não existe.

### 3.3 Exibição do resultado da estufagem

- Sucesso: refletir a(s) nova(s) `CargoUnit`(s) conforme §3.2 (lista de
  fardos identificados quando aplicável, ou contador simples no caso
  `Manual`).
- **Aviso de peso excedido** (`Container.MaxWeight` ultrapassado, gate
  não bloqueante da SPEC-22/SPEC-23 do Core §3.6 item 3): a resposta ainda é
  200/201, mas o frontend precisa **exibir visivelmente** o aviso (toast
  de warning, não de erro — a operação foi bem-sucedida). **D3 fechada
  (ver §14):** confirmado no client gerado — `CargoStuffResultDTO.warnings`
  (`model/cargoStuffResultDTO.ts`) é `string[]` **no corpo da resposta**
  (não header). A UI lê `response.warnings` (se não vazio) e mostra um
  toast de warning por item da lista (ou concatenado, decisão de
  apresentação livre na implementação — não muda o parsing).
- **Bloqueio de saldo do romaneio** (gate duro): erro 400 do servidor.
  Com o redesenho da SPEC-23 do Core (§3.2 acima), esse gate **degenera
  em disponibilidade de linha**, não soma de peso — Modo A recusa se a
  linha específica já estiver vinculada a outra `CargoUnit`; Modo B
  recusa se não houver `quantity` linhas livres daquela NF (o payload de
  `stuff/quantity` só tem `invoiceId`, sem `lote` — o texto anterior desta
  SPEC citava "NF/Lote" por analogia ao Modo A, mas o gate real do Modo B
  é só por NF/Invoice, não por lote, já que `CargoUnitStuffByQuantity` não
  aceita lote como filtro). A mensagem de erro exibida deve refletir isso
  (ex. "fardo já estufado" / "não há fardos suficientes disponíveis para
  essa NF"), não um genérico "peso excedido" — exibir como erro de
  formulário/toast comum, sem esconder a mensagem real do servidor
  (anti-silent-fail, herdado de SPEC-07-02 RF2).

### 3.4 `CargoUnit` não é mais editável

Nenhuma tela desta SPEC oferece edição de uma `CargoUnit` já criada — só
criação (Modo A/B) e cancelamento: o Core **já expõe** o endpoint
(`POST /api/operation/{operationId}/cargo/{id}/cancel`,
`usePostApiOperationOperationIdCargoIdCancel`, confirmado em
`endpoints/cargo-unit/cargo-unit.ts`) com payload `CargoUnitCancel`
(`model/cargoUnitCancel.ts`): `{ reason: string }` (`maxLength 500`,
obrigatório) — não é mais condicional ("se existir"), a ação existe no
contrato. Um botão **Cancelar** por `CargoUnit` com campo de motivo
obrigatório (mesmo padrão de `InvoiceStatusChange.note` usado em
Confirmar/Cancelar de Invoice, SPEC-07-10 §5 RF4).

### 3.5 Cadastro de Container — campo `MaxWeight`

Fora da área de Operações: o cadastro de Container
(`administrative/registry/container`, SPEC-04,
`src/routes/_dashboard/_internal/administrative/registry/container/index.tsx`)
precisa ganhar o campo novo `maxWeight` (confirmado em `ContainerDTO`/
`ContainerCreate`/`ContainerUpdate`: `number | string | null`, opcional,
mesmo shape/pattern decimal de `tara`) no formulário de criação/edição — é
pré-requisito para o aviso do §3.3 fazer sentido (sem `maxWeight`
cadastrado, não há o que comparar). **RF6/D4 fechados (ver §14):** o
formulário existente já trata `tara` (shape idêntico a `maxWeight`) com
`InputText` (`layouts/Form/Fields`, ver o array `fields: LayoutField[]` na
própria tela) — `maxWeight` segue o mesmo padrão, mesmo Field, mesma
tela, sem `InputNumber`. Namespace i18n confirmado:
`administrative-registry.json`, chaves já usadas no padrão
`administrative-registry.container.form.<campo>` (ex.: `...form.tara`) —
a chave nova é `administrative-registry.container.form.maxWeight` (mais,
se a tabela/coluna também expuser o campo, `...colMaxWeight`, seguindo o
padrão de `colTara`). Tratado aqui como escopo desta SPEC (não uma
SPEC-04 nova) porque é um campo pontual de formulário existente, na mesma
tela, sem mudança estrutural — se na implementação isso se mostrar maior
que um campo (ex.: exigir reformular o formulário todo), é
`SCOPE CONFLICT`, parar e perguntar.

## 4. Fora do escopo

- CRUD do vínculo container↔operação em si (fotos, lacres, status) — já
  coberto pela SPEC-07-05, sem mudança aqui.
- Reidentificação futura de uma `CargoUnit` criada no Modo B contra uma
  linha específica do romaneio — o próprio Core deixa isso fora do
  escopo da SPEC-22 (§4).
- Qualquer tela/hook de `InvoiceItem` — extinto, ver SPEC-07-10 §4.
- Edição de `CargoUnit` — não existe mais no domínio (só criação e
  `Cancel`).
- Valor default de `MaxWeight` por tipo de container (20'/40') — a
  SPEC-22/SPEC-23 do Core explicitamente não define isso, é sempre entrada
  manual.

## 5. Requisitos funcionais

- **RF1** — Estufagem consome só hook(s) Orval gerado(s) pós-`just map`
  da SPEC-22/SPEC-23 do Core (`stuff/identified`, `stuff/quantity`), nunca o
  hook antigo de criação de `CargoUnit` vinculado a `InvoiceItem`.
- **RF2** — Os dois modos (A/B) são **fluxos separados** (dois botões/
  ações distintos na aba Containers, cada um com seu próprio modal — D1,
  §14 fechada, não modal único com toggle), cada um com seu próprio
  formulário `react-hook-form` + `zodResolver` sobre schema gerado.
- **RF3** — Aviso de peso excedido do container é exibido de forma
  visível e não bloqueante (toast de warning) quando o backend sinalizar.
- **RF4** — Erro de saldo de romaneio (linha já vinculada ou linhas
  insuficientes disponíveis, §3.2/§3.3) é exibido como erro padrão
  (bloqueia a ação, mensagem do servidor visível, sem genérico "peso
  excedido").
- **RF5** — Nenhuma tela permite editar uma `CargoUnit` existente — só
  criar (Modo A/B) e cancelar com motivo (`Cancel`, endpoint confirmado
  §3.4).
- **RF6** — Cadastro de Container ganha campo `maxWeight` usando
  `InputText` de `layouts/Form/Fields`, mesmo padrão já usado pelo campo
  `tara` na mesma tela (shape decimal nullable idêntico, confirmado em
  `ContainerCreate`/`ContainerUpdate` — sem `InputNumber`, sem
  `InputMoney`, ver §3.5).
- **RF7** — Sem silent-fail (herda RF2 da SPEC-07-02).
- **RF8** — Resultado do Modo B distingue visualmente o caso
  `Invoice.Source == RomaneioImport` (lista os fardos identificados
  automaticamente selecionados pelo backend) do caso `Manual` (só
  contador + peso médio, sem lista de fardos) — §3.2.

## 6. Requisitos não funcionais

- RNF1 — `bun run check` + `lint` passam.
- RNF2 — Zero Zod à mão — schemas vêm de `just map` sobre o contrato da
  SPEC-22/SPEC-23 do Core.
- RNF3 — Criação de N `CargoUnit`s no Modo B é uma única chamada ao
  endpoint de quantidade (o backend garante a transação, SPEC-22/SPEC-23 do Core
  §6) — o frontend não faz N chamadas sequenciais.

## 7. Contrato de rota

Sem rota própria — ação embutida na aba Containers já existente (mesmo
componente `src/components/operations/tabs/Containers.tsx`, SPEC-07-05),
sem sub-rota nova (segue o precedente D2 revertida, SPEC-07-02 §13).

## 8. Camada de dados

Hooks Orval confirmados em `src/api/generated/endpoints/cargo-unit/
cargo-unit.ts` (nomes reais dos hooks gerados):

- `usePostApiOperationOperationIdCargoStuffIdentified` — Modo A
  (`POST /api/operation/{operationId}/cargo/stuff/identified`), variáveis
  `{ operationId, data: CargoUnitStuffIdentified }`.
- `usePostApiOperationOperationIdCargoStuffQuantity` — Modo B
  (`POST /api/operation/{operationId}/cargo/stuff/quantity`), variáveis
  `{ operationId, data: CargoUnitStuffByQuantity }`.
- `useGetApiOperationOperationIdCargo` — leitura de `CargoUnit`s por
  operação, com `params: GetApiOperationOperationIdCargoParams` que já
  filtra por `ContainerOperationId`, `InvoiceId`, `WithoutRomaneio`,
  `Status` — usar filtrado por `ContainerOperationId` para listar as
  `CargoUnit`s de um container específico na aba (contagem/lista
  existente, complementar ao resultado imediato do POST, §3.2/§3.3).
- `usePostApiOperationOperationIdCargoIdCancel` — `Cancel` de `CargoUnit`
  (`POST /api/operation/{operationId}/cargo/{id}/cancel`), payload
  `CargoUnitCancel { reason }` — confirmado como endpoint próprio (não é
  mais condicional, §3.4).
- `useGetApiOperationOperationIdCargoIdEvents` — histórico de eventos
  (`CargoUnitEventDTO`: `action: Created | Canceled`, `note`,
  `beforeState`/`afterState`) — disponível caso a tela queira mostrar
  trilha de auditoria por `CargoUnit` (não obrigatório pelos critérios de
  aceitação atuais, mas existe no contrato se for útil).
- `useGetApiOperationOperationIdRomaneio` — leitura de `RomaneioDTO` da
  operação (tem `lote`, `notaFiscal`, `itemIdentifier`) para popular o
  `SelectAsync` do fardo específico no Modo A (§3.1); só tem
  `Search`/`Offset`/`Limit`/`Sort` como params — sem filtro server-side
  dedicado por NF/lote nem flag de "linha livre/já vinculada" (a
  disponibilidade real só é sabida no momento do POST, pelo 400 do gate
  de saldo, §3.3).
- Cadastro de Container: hooks já existentes
  (`usePostApiContainer`/`usePutApiContainerId`, SPEC-04) ganham o campo
  `maxWeight` já presente em `ContainerCreate`/`ContainerUpdate` — reusa
  os hooks existentes, só muda o formulário (`fields: LayoutField[]`
  ganha uma entrada a mais, mesmo padrão de `tara`).

## 9. UI

- Editado: `src/components/operations/tabs/Containers.tsx` — duas novas
  ações por linha, "Estufar fardo específico" (Modo A) e "Estufar por
  quantidade" (Modo B), cada uma com modal próprio (D1, §14 fechada —
  fluxos separados, não modal único com toggle).
- Editado: formulário de cadastro de Container
  (`administrative/registry/container`) — campo `maxWeight` novo
  (`InputText`, mesmo padrão de `tara`, §3.5/RF6).
- Toast de warning (peso do container excedido) — reusar o mecanismo de
  toast já padrão do projeto (`react-toastify`), variante de warning se
  existir, senão `info` (não inventar variante nova de componente sem
  necessidade).

## 10. i18n

Namespace existente `administrative-operations.json`, chaves novas em
`containers.stuffing.*` (modos A/B, aviso de peso, erro de saldo). **D4
fechada (ver §14):** confirmado em código — o formulário de
`registry/container` usa o namespace `administrative-registry.json`, com
chaves no padrão `administrative-registry.container.form.<campo>` (ex.:
`...form.tara` já existe). A chave nova do campo `maxWeight` é
`administrative-registry.container.form.maxWeight` (e, se a listagem
também expuser a coluna, `administrative-registry.container.colMaxWeight`,
espelhando `colTara`) — sem criar namespace novo.

## 11. Arquivos esperados

| Arquivo                                                                  | Ação                                        |
| -------------------------------------------------------------------------- | --------------------------------------------- |
| `src/components/operations/tabs/Containers.tsx`                          | editar — ação de estufagem |
| `src/routes/_dashboard/_internal/administrative/registry/container/index.tsx` | editar — campo `maxWeight` |
| `src/i18n/dictionaries/*/administrative-operations.json`                 | editar — chaves de estufagem                 |
| `src/i18n/dictionaries/*/administrative-registry.json`                   | editar — chave `container.form.maxWeight` (e `colMaxWeight` se aplicável) |

## 12. Critérios de aceitação

| #   | Critério                                                                                     |
| --- | ----------------------------------------------------------------------------------------------- |
| CA1 | Modo A cria `CargoUnit` identificada (fardo do romaneio), vinculada ao container escolhido      |
| CA2 | Modo B cria N `CargoUnit`s por quantidade, uma única chamada ao backend                         |
| CA3 | Estufagem que excede saldo de romaneio (linha indisponível/insuficiente) mostra erro visível, não é silenciosa |
| CA4 | Estufagem que excede `Container.MaxWeight` é aceita e mostra aviso visível (não bloqueia)        |
| CA5 | Nenhuma tela permite editar `CargoUnit` existente                                                |
| CA6 | Cadastro de Container tem campo `maxWeight` funcional                                            |
| CA7 | `bun run check` + `lint` passam                                                                  |
| CA8 | Modo A e Modo B são acionados por botões/ações separados, sem modal único com toggle             |
| CA9 | Modo B sobre Invoice `RomaneioImport` exibe os fardos identificados automaticamente selecionados; sobre Invoice `Manual` exibe só contador/peso médio |

## 13. Riscos

- **R1 — Contrato agora existe (histórico).** `just map` já rodou nesta
  branch e trouxe o contrato real (`stuff/identified`, `stuff/quantity`,
  `CargoStuffResultDTO`, `Container.maxWeight`) — risco encerrado. Mantido
  aqui só como registro de que era o risco central original, espelhando a
  SPEC-07-10.
- **R2 — Ergonomia do Modo A: resolvida.** O contrato real
  (`CargoUnitStuffIdentified`) exige `invoiceId` **explícito** — o Core
  não resolve implicitamente a partir do `NotaFiscal` da linha de
  romaneio. Ver D2 fechada (§14) e §3.1.
- **R3 — Migração de dado existente no Core** (histórico, SPEC-22 do Core
  §14): se o Core descartou `CargoUnit`s `Open` (nunca estufadas) na
  migração, containers hoje "vinculados mas sem carga" no NewPortal podem
  não ter mais nada pra mostrar de histórico — não é ação do frontend,
  mas pode gerar confusão ("sumiu a carga") se não for comunicado ao
  usuário final. Continua como aviso de comunicação, não como código;
  não verificado nesta reconciliação se a migração já rodou em produção
  (fora do escopo desta SPEC de frontend confirmar).
- **R4 — Formato do aviso de peso excedido: resolvido.** Confirmado em
  `CargoStuffResultDTO.warnings: string[]` no corpo da resposta (não
  header). Ver D3 fechada (§14) e §3.3.
- **R5 — Modo B, exibição do resultado: resolvida.** O response de
  `stuff/quantity` (`CargoStuffResultDTO.cargoUnits`) já traz as
  `CargoUnit`s criadas com `romaneioId` (nullable) e `identified` — a UI
  monta a lista/contador direto da resposta do POST, sem chamada extra.
  Ver D5 fechada (§14) e §3.2.

## 14. Decisões

**D1 — fechada.** Dois fluxos completamente separados (dois botões/
ações distintos na aba Containers — "Estufar fardo específico" / Modo A,
e "Estufar por quantidade" / Modo B), cada um com seu próprio modal —
**não** modal único com toggle. Decisão do usuário; ver §3.1, §5 RF2, §9.

**D2 — fechada (pós-`just map`, dado técnico, não decisão de negócio).**
`CargoUnitStuffIdentified` (`model/cargoUnitStuffIdentified.ts`) exige
`invoiceId` explícito: `{ containerOperationId, romaneioId, invoiceId }`.
O Core **não** resolve a Invoice implicitamente a partir do `NotaFiscal`
da linha de romaneio. O formulário do Modo A tem, portanto, dois campos
efetivos além do `containerOperationId` implícito: NF (`invoiceId`) e
fardo específico (`romaneioId`) — "Lote" é só filtro de UI dentro do
`SelectAsync` do fardo, não um campo do payload. Ver §3.1.

**D3 — fechada (pós-`just map`, dado técnico).** O aviso de peso excedido
vem em `CargoStuffResultDTO.warnings: string[]`, no **corpo** da resposta
(não header). Ver §3.3.

**D4 — fechada (confirmado em código, sem ambiguidade real).** O
formulário de `registry/container` usa o namespace
`administrative-registry.json`, chaves em
`administrative-registry.container.form.<campo>` (ex.: `...form.tara`
existente). Chave nova: `administrative-registry.container.form.maxWeight`.
Ver §3.5/§10.

**D5 — fechada (pós-`just map`, dado técnico).** `CargoStuffResultDTO`
inclui `cargoUnits?: CargoUnitDTO[]` — cada item já vem com `romaneioId`
(nullable) e `identified`, então o response do `stuff/quantity` sozinho
já é suficiente para a UI montar a lista de fardos identificados
(`RomaneioImport`) ou o contador anônimo (`Manual`), sem segunda leitura.
Ver §3.2.

Nenhuma decisão de negócio ficou pendente nesta reconciliação — todas as
que restavam eram consequência direta do shape do contrato gerado, já
observável no client após o `just map` desta branch. Não há
`[NEEDS_DECISION]` em aberto nesta SPEC.

---

**Status:** `IMPLEMENTED`. Aprovado pelo usuário (`APROVAR SPEC-07-11`) em
2026-09-15 e implementado na mesma sessão. Ver §15 (Implementation Notes)
abaixo.

## 15. Implementation Notes

**Arquivos alterados:**

- `src/components/operations/tabs/Containers.tsx` — três novas ações por
  linha (Modo A `usePostApiOperationOperationIdCargoStuffIdentified`, Modo B
  `usePostApiOperationOperationIdCargoStuffQuantity`, e "ver fardos
  estufados"), quatro novos componentes de modal (`StuffIdentifiedModal`,
  `StuffQuantityModal`, `CargoUnitsModal`, `CancelCargoUnitModal`), cada um
  com seu próprio `useForm` + `zodResolver` sobre o schema gerado do
  respectivo endpoint (`cargo-unit.zod.ts`). `invalidateCargo` adicionado ao
  lado de `invalidateList` (query separada, `CargoUnit` não é a mesma lista
  do vínculo container↔operação).
- `src/routes/_dashboard/_internal/administrative/registry/container/index.tsx`
  — campo `maxWeight` adicionado ao `fields: LayoutField[]` (mesmo
  `InputText`, mesmo padrão de `tara`) e à coluna da listagem
  (`colMaxWeight`), e ao `toFormValues`.
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json` —
  bloco `containers.stuffing.*` novo (ações, títulos, formulário, resultado
  Modo A/B, listagem/cancelamento de `CargoUnit`, toasts) nos 4 locales.
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-registry.json` —
  `container.form.maxWeight` e `container.colMaxWeight` novos nos 4
  locales.

**Comandos executados:**

- `bun run check` (`tsc --noEmit`) — **VERIFIED**, sem erros.
- `bun run lint` (`eslint .`) — **VERIFIED**: 3 erros pré-existentes em
  `src/lib/session.server.ts` (`react-hooks/rules-of-hooks`, confirmados
  como já presentes antes desta SPEC via `git stash` + lint isolado — não
  são desta implementação) e apenas warnings pré-existentes em outros
  arquivos não tocados por esta SPEC. Zero erro/warning novo introduzido em
  `Containers.tsx` ou nos arquivos desta SPEC (rodado `prettier --write`
  nele pra eliminar os 3 warnings de formatação que apareceram durante a
  implementação).
- `just map` — **não rodado** nesta implementação: o contrato consumido já
  estava presente no client gerado desde `4400ce9`/`356ee69` (commits
  anteriores da própria branch, antes desta sessão); nenhuma mudança de
  contrato do Core foi necessária para este trabalho.
- Validação visual em `bun run dev -- --port 5175` (Core local em
  `http://localhost:5766` acessível, `curl` ao `openapi/v1.json` retornou
  200): servidor subiu sem erro de build/import, rota raiz respondeu `307`
  (redirect esperado para `/auth/login`, sem sessão) e o log do Vite não
  mostrou nenhuma exceção. **Não verificado por login interativo** — não
  foi feita navegação autenticada até a aba Containers de uma operação
  real; é um risco residual não coberto por evidência de tela, só por
  `tsc`/`eslint` limpos e inspeção de código.

**Critérios de aceitação:**

| # | Critério | Resultado |
| --- | --- | --- |
| CA1 | Modo A cria `CargoUnit` identificada vinculada ao container | PASS (código) — `StuffIdentifiedModal` chama `usePostApiOperationOperationIdCargoStuffIdentified` com `containerOperationId` implícito + `invoiceId`/`romaneioId` do formulário; não verificado em runtime autenticado |
| CA2 | Modo B cria N `CargoUnit`s numa única chamada | PASS (código) — `StuffQuantityModal` chama `usePostApiOperationOperationIdCargoStuffQuantity` uma única vez, sem loop |
| CA3 | Erro de saldo de romaneio mostra erro visível, não silencioso | PASS — erro 4xx já é exibido pelo interceptor de `mutator.ts` (`toast.warning` com a mensagem real do backend) mais o toast genérico do `catch` do componente (mesmo padrão de `Romaneio.tsx`/`Containers.tsx` pré-existente) |
| CA4 | Peso excedido é aceito e mostra aviso, não bloqueia | PASS (código) — `response.warnings` (200/201) disparam `toast.warning` por item, sem impedir o `toast.success`/fechamento do fluxo |
| CA5 | Nenhuma tela permite editar `CargoUnit` existente | PASS — `CargoUnitsModal` só lista e oferece `Cancelar` (`CancelCargoUnitModal`), nenhum campo de edição |
| CA6 | Cadastro de Container tem campo `maxWeight` funcional | PASS — `InputText` novo no formulário + coluna na listagem, mesmo schema gerado (`PostApiContainerBody`/`PutApiContainerIdBody`) |
| CA7 | `bun run check` + `lint` passam | PASS — `check` limpo; `lint` sem erro/warning novo (os 3 erros existentes são de `session.server.ts`, não tocado) |
| CA8 | Modo A e Modo B acionados por botões separados, sem toggle | PASS — dois botões distintos (`bi-box-seam`/`bi-stack`) abrindo modais independentes |
| CA9 | Modo B distingue `RomaneioImport` (lista) de `Manual` (contador) | PASS (código) — `StuffQuantityModal` decide pela presença de `romaneioId` no array `cargoUnits` da resposta (D5), sem chamada extra |

**Decisões tomadas durante a implementação:**

- A listagem de fardos identificados no resultado do Modo B (CA9) mostra o
  `romaneioId` (uuid) de cada `CargoUnit` criada, não um rótulo legível
  (lote/NF/identificador) — o `CargoStuffResultDTO.cargoUnits[].romaneioId`
  só traz o uuid, não os campos legíveis do `RomaneioDTO`; buscar o rótulo
  exigiria uma segunda chamada por item, que a SPEC explicitamente evita
  (§3.2/D5: "a UI não precisa de uma segunda leitura"). Decisão de
  apresentação dentro do espaço livre que a SPEC deixou ("decisão de
  apresentação livre na implementação", §3.3) — não é `[NEEDS_DECISION]`.
- Adicionado um terceiro botão/ação "ver fardos estufados" (não pedido
  literalmente como item de UI na lista de `Arquivos esperados`, mas
  necessário para cumprir RF5/§3.4, que exige "um botão Cancelar por
  `CargoUnit`" — sem uma superfície pra listar as `CargoUnit`s existentes de
  um container, não haveria onde colocar esse botão). Mesmo componente
  (`Containers.tsx`) já listado nos arquivos esperados da SPEC — não é
  scope creep de arquivo, só de sub-componente dentro dele.
- Coluna `colMaxWeight` na listagem de Container foi implementada (a SPEC
  deixava isso condicional: "se a listagem também expuser a coluna") —
  optado por expor, espelhando 1:1 o padrão já existente de `tara`/`colTara`
  na mesma tela, para consistência visual entre os dois campos de mesmo
  shape.

**Limitações conhecidas:**

- Não houve validação end-to-end autenticada contra o Core local (login +
  navegação até uma operação real com container vinculado + estufagem de
  fato) — só `tsc`/`eslint` limpos, inspeção de código contra o contrato
  gerado, e um boot smoke-test do `vite dev` sem sessão. Ficou como risco
  residual, não como defeito confirmado.
- `bun run check:api` (rodado automaticamente antes do `vite dev`) apontou
  que o contrato do Core **remoto** (`dev-asc-api.alexstewart.com.br`) já
  mudou de novo desde o `just map` desta branch — isso é sobre o ambiente
  remoto de outra branch/feature, não sobre o Core local usado nesta
  implementação (`localhost:5766`, que serviu o `openapi/v1.json` com
  sucesso); não é um bloqueio desta SPEC, só um aviso de que outra SPEC do
  Core avançou em paralelo no ambiente dev compartilhado.
- Nenhuma tela desta SPEC toca a aba de Nota Fiscal (`operation-invoice`,
  SPEC-07-10) nem seus arquivos — confirmado por escopo (fora do
  `git diff` desta implementação).
