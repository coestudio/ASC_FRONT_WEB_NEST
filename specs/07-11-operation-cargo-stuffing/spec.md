# SPEC-07-11 — Operações: aba Containers — estufagem (CargoUnit Modo A/B)

- **ID:** SPEC-07-11
- **Nome:** operation-cargo-stuffing
- **Status:** BLOCKED
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/components/operations/tabs/Containers.tsx` (editado —
  criado pela SPEC-07-05, `IMPLEMENTED`), `src/i18n/dictionaries/*/
administrative-operations.json` (editado), e (fora da área de Operações)
  o formulário de cadastro de Container em
  `src/routes/_dashboard/_internal/administrative/registry/container/**`
  (editado — novo campo `MaxWeight`, ver §3.5)
- **Depende de:** SPEC-00, SPEC-02, SPEC-SHARE-01 (`Select`/`SelectAsync`,
  já usados pela SPEC-07-05), SPEC-07-01 (namespace), SPEC-07-02 (shell),
  **SPEC-07-05** (`operation-containers`, `IMPLEMENTED` — esta SPEC
  **substitui/estende** a ação de vínculo container↔operação dela,
  adicionando a ação de estufagem; não reescreve o CRUD de vínculo em si).
  **Depende também, fora deste repo, de** `warren/Core` **SPEC-16**
  (`cargo-unit-redesign` — CargoUnit redesenhado, extinção de
  `InvoiceItem`, `Container.MaxWeight`; hoje `BLOCKED` no Core por uma
  decisão de migração de dado ainda pendente lá) **e SPEC-17**
  (`cargo-stuffing-gates` — endpoints de estufagem Modo A/B + gates de
  peso; depende de SPEC-15 **e** SPEC-16 no Core) — ver §0. A SPEC-13
  original do Core (`specs/13-romaneio-invoice-container-flow/spec.md`)
  virou só o índice dessas ondas. Esta aba **não** depende diretamente de
  SPEC-14/SPEC-15 do Core (as que bloqueiam a SPEC-07-10) — só
  transitivamente, porque SPEC-17 do Core já exige SPEC-15 como
  pré-requisito lá dentro. Depende ainda, indiretamente, de
  **SPEC-07-10** (`operation-invoice`) só como referência de UX (a
  estufagem escolhe uma Invoice existente) — sem ordem de implementação
  obrigatória entre as duas no NewPortal (07-10 tende a destravar bem
  antes, já que só precisa de SPEC-14+15 do Core).

---

## 0. Bloqueio (leia antes de tudo)

Igual à SPEC-07-10 (ver lá §0 para o texto completo do racional): o
contrato consumido aqui — `CargoUnit` redesenhado (nasce só via
`stuff/identified` ou `stuff/quantity`, sem mais `Open`/`Update()`/
`StuffInto()`/`MarkDivergent`/`Reconcile`), `Container.MaxWeight` — é
definido por `warren/Core` **SPEC-16** (`cargo-unit-redesign`) e
**SPEC-17** (`cargo-stuffing-gates`). Nenhuma das duas está implementada
ainda; pior, **SPEC-16 hoje está ela própria `BLOCKED` no Core** por uma
decisão de migração de dado de produção ainda pendente lá (quantas
`CargoUnit`s existentes caem em `Status=Open` sem `ContainerOperationId`,
e o que fazer com elas) — ou seja, esta SPEC de frontend está bloqueada
por uma cadeia de duas dependências, não uma. O client gerado atual
(`src/api/generated/endpoints/cargo-unit/cargo-unit.ts`, `model/
cargoUnitDTO.ts`, `model/cargoUnitLinkInvoiceItem.ts`) reflete o modelo
**pré-SPEC-16/17**: `CargoUnit` editável, vínculo a `InvoiceItem`
(extinto só com SPEC-16), sem noção de `stuff/identified`/`stuff/
quantity`, sem gate de peso, sem `Container.MaxWeight`.

Esta SPEC **não pode sair de `BLOCKED`** até:

1. `warren/Core` SPEC-16 (incluindo a decisão de migração de dado que a
   bloqueia hoje) e SPEC-17 serem aprovadas e implementadas;
2. `just map` trazer os hooks/DTOs novos (`stuff/identified`, `stuff/
   quantity`, `CargoUnitStatus` simplificado, `CargoUnitDTO` com campos
   derivados, `ContainerDTO.maxWeight`) e a **remoção** do vínculo direto
   a `InvoiceItem` (`cargoUnitLinkInvoiceItem.ts` deve desaparecer ou
   mudar de shape);
3. Revisão desta SPEC contra o shape real — a SPEC-17 do Core deixa
   aberto (§3.6 da antiga SPEC-13, herdado por SPEC-17, "a decidir na
   implementação") se o Modo A recebe `invoiceId` explícito ou resolve a
   Invoice a partir do `NotaFiscal` da linha do romaneio — isso muda o
   formulário do Modo A e **precisa** ser fechado antes de codar (ver
   §14 D2).

Enquanto isso não acontece, **nenhum código desta SPEC deve ser
escrito.**

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
status — `ContainerOperationStatus`) como CRUD simples. A SPEC-16/SPEC-17 do Core
introduz um conceito novo, **estufagem**, que não existia no modelo
consumido por aquela SPEC: até então `CargoUnit` nem tinha tela no
NewPortal. Depois da SPEC-16/SPEC-17 do Core, toda `CargoUnit` nasce **dentro**
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

- **Modo A — fardo específico:** formulário pede NF (Invoice da
  operação, `SelectAsync` ou `Select` dependendo do volume) + Lote
  (`RomaneioModel.Lote`, texto/filtro) + o fardo exato do romaneio
  (linha específica, provavelmente `SelectAsync` sobre as linhas de
  romaneio filtradas por NF+Lote — shape exato depende do endpoint real,
  ver §14 D2).
- **Modo B — quantidade:** formulário pede NF (Invoice) + Lote +
  quantidade de fardos (`InputNumber`). **Importante (ver §3.2):** o
  resultado desse modo depende da origem da Invoice escolhida — não é
  sempre "unidade anônima".

Em ambos os modos, `containerOperationId` já vem implícito (é a linha da
lista onde o operador clicou em um dos dois botões) — não é um campo
livre do formulário.

### 3.2 Modo B bifurca pela origem (`Source`) da Invoice — mudança de contrato do Core

`warren/Core/specs/17-cargo-stuffing-gates/spec.md` §2 (reescrito, decisão
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

- Se a Invoice escolhida for `RomaneioImport`, a resposta do backend
  inclui (presumivelmente) quais linhas de romaneio foram selecionadas
  automaticamente — a tela deve **exibir essa lista** (ex.: "3 fardos
  estufados: identificadores X, Y, Z"), não só um contador genérico,
  porque o resultado é equivalente a ter feito 3 vezes o Modo A e o
  operador precisa poder conferir/rastrear quais fardos específicos
  saíram do romaneio.
- Se a Invoice for `Manual`, a tela mostra só a contagem (não há linha
  física para listar) e, opcionalmente, o peso médio usado — sem
  prometer rastreabilidade individual, porque não existe.
- Shape exato da resposta (se o backend devolve os identificadores das
  linhas selecionadas no Modo B `RomaneioImport`) ainda não existe no
  contrato — confirmar pós-`just map` (ver §14 D5).

### 3.3 Exibição do resultado da estufagem

- Sucesso: refletir a(s) nova(s) `CargoUnit`(s) conforme §3.2 (lista de
  fardos identificados quando aplicável, ou contador simples no caso
  `Manual`).
- **Aviso de peso excedido** (`Container.MaxWeight` ultrapassado, gate
  não bloqueante da SPEC-16/SPEC-17 do Core §3.6 item 3): a resposta ainda é
  200/201, mas o frontend precisa **exibir visivelmente** o aviso (toast
  de warning, não de erro — a operação foi bem-sucedida) — texto e
  formato dependem de como o Core expuser o campo (`warnings: [...]` no
  body ou header, "a decidir na implementação" segundo a SPEC-16/SPEC-17 do Core
  §3.6; revisar o shape real pós-`just map` antes de implementar,
  §14 D3).
- **Bloqueio de saldo do romaneio** (gate duro): erro 400 do servidor.
  Com o redesenho da SPEC-17 do Core (§3.2 acima), esse gate **degenera
  em disponibilidade de linha**, não soma de peso — Modo A recusa se a
  linha específica já estiver vinculada a outra `CargoUnit`; Modo B
  recusa se não houver `quantity` linhas livres daquele NF/Lote. A
  mensagem de erro exibida deve refletir isso (ex. "fardo já estufado" /
  "não há fardos suficientes disponíveis para essa NF/Lote"), não um
  genérico "peso excedido" — exibir como erro de formulário/toast comum,
  sem esconder a mensagem real do servidor (anti-silent-fail, herdado de
  SPEC-07-02 RF2).

### 3.4 `CargoUnit` não é mais editável

Nenhuma tela desta SPEC oferece edição de uma `CargoUnit` já criada — só
criação (Modo A/B) e, se existir ação de cancelar exposta pelo Core
(`Cancel(reason)`, SPEC-16/SPEC-17 do Core §3.5), um botão **Cancelar** por
`CargoUnit` com campo de motivo obrigatório (mesmo padrão de
`InvoiceStatusChange.note` usado em Confirmar/Cancelar de Invoice,
SPEC-07-10 §5 RF4).

### 3.5 Cadastro de Container — campo `MaxWeight`

Fora da área de Operações: o cadastro de Container
(`administrative/registry/container`, SPEC-04) precisa ganhar o campo
novo `MaxWeight` (peso máximo em kg, decimal, opcional/nullable conforme
o DTO gerado) no formulário de criação/edição — é pré-requisito para o
aviso do §3.3 fazer sentido (sem `MaxWeight` cadastrado, não há o que
comparar). Tratado aqui como escopo desta SPEC (não uma SPEC-04 nova)
porque é um campo pontual de formulário existente, na mesma tela, sem
mudança estrutural — se na implementação isso se mostrar maior que um
campo (ex.: exigir reformular o formulário todo), é `SCOPE CONFLICT`,
parar e perguntar.

## 4. Fora do escopo

- CRUD do vínculo container↔operação em si (fotos, lacres, status) — já
  coberto pela SPEC-07-05, sem mudança aqui.
- Reidentificação futura de uma `CargoUnit` criada no Modo B contra uma
  linha específica do romaneio — o próprio Core deixa isso fora do
  escopo da SPEC-16 (§4).
- Qualquer tela/hook de `InvoiceItem` — extinto, ver SPEC-07-10 §4.
- Edição de `CargoUnit` — não existe mais no domínio (só criação e
  `Cancel`).
- Valor default de `MaxWeight` por tipo de container (20'/40') — a
  SPEC-16/SPEC-17 do Core explicitamente não define isso, é sempre entrada
  manual.

## 5. Requisitos funcionais

- **RF1** — Estufagem consome só hook(s) Orval gerado(s) pós-`just map`
  da SPEC-16/SPEC-17 do Core (`stuff/identified`, `stuff/quantity`), nunca o
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
  criar (Modo A/B) e, se exposto, cancelar com motivo.
- **RF6** — Cadastro de Container ganha campo `MaxWeight` usando o Field
  apropriado de `layouts/Form/Fields` (provavelmente `InputMoney` não
  serve — é peso, não moeda; mesmo precedente da SPEC-07-04 decisão 1,
  usar `InputText` sobre o schema gerado, ou `InputNumber` se o schema
  gerado for numérico puro — decidir na implementação conforme o shape
  real do campo gerado).
- **RF7** — Sem silent-fail (herda RF2 da SPEC-07-02).
- **RF8** — Resultado do Modo B distingue visualmente o caso
  `Invoice.Source == RomaneioImport` (lista os fardos identificados
  automaticamente selecionados pelo backend) do caso `Manual` (só
  contador + peso médio, sem lista de fardos) — §3.2.

## 6. Requisitos não funcionais

- RNF1 — `bun run check` + `lint` passam.
- RNF2 — Zero Zod à mão — schemas vêm de `just map` sobre o contrato da
  SPEC-16/SPEC-17 do Core.
- RNF3 — Criação de N `CargoUnit`s no Modo B é uma única chamada ao
  endpoint de quantidade (o backend garante a transação, SPEC-16/SPEC-17 do Core
  §6) — o frontend não faz N chamadas sequenciais.

## 7. Contrato de rota

Sem rota própria — ação embutida na aba Containers já existente (mesmo
componente `src/components/operations/tabs/Containers.tsx`, SPEC-07-05),
sem sub-rota nova (segue o precedente D2 revertida, SPEC-07-02 §13).

## 8. Camada de dados

Hooks Orval gerados por `just map` sobre o contrato da SPEC-16/SPEC-17 do Core:

- `POST /api/operation/{operationId}/cargo/stuff/identified` (Modo A).
- `POST /api/operation/{operationId}/cargo/stuff/quantity` (Modo B).
- Leitura de `CargoUnit`s por container/operação (para exibir contagem/
  lista, se o Core expuser um GET correspondente — confirmar pós-map).
- `Cancel` de `CargoUnit`, se exposto como endpoint próprio.
- Cadastro de Container: hook de update já existente
  (`administrative/registry/container`, SPEC-04) ganha o campo
  `maxWeight` no DTO gerado — reusa o hook de update existente, só muda o
  formulário.

## 9. UI

- Editado: `src/components/operations/tabs/Containers.tsx` — duas novas
  ações por linha, "Estufar fardo específico" (Modo A) e "Estufar por
  quantidade" (Modo B), cada uma com modal próprio (D1, §14 fechada —
  fluxos separados, não modal único com toggle).
- Editado: formulário de cadastro de Container
  (`administrative/registry/container`) — campo `MaxWeight` novo.
- Toast de warning (peso do container excedido) — reusar o mecanismo de
  toast já padrão do projeto (`react-toastify`), variante de warning se
  existir, senão `info` (não inventar variante nova de componente sem
  necessidade).

## 10. i18n

Namespace existente `administrative-operations.json`, chaves novas em
`containers.stuffing.*` (modos A/B, aviso de peso, erro de saldo). Campo
`maxWeight` do cadastro de container entra no namespace já usado por
aquele formulário (`administrative-registry.json` ou equivalente —
confirmar o namespace real usado hoje por `registry/container` antes de
criar um novo).

## 11. Arquivos esperados

| Arquivo                                                                  | Ação                                        |
| -------------------------------------------------------------------------- | --------------------------------------------- |
| `src/components/operations/tabs/Containers.tsx`                          | editar — ação de estufagem (só pós-desbloqueio) |
| `src/routes/.../registry/container/**` (formulário existente)            | editar — campo `MaxWeight`                   |
| `src/i18n/dictionaries/*/administrative-operations.json`                 | editar — chaves de estufagem                 |
| `src/i18n/dictionaries/*/<namespace do cadastro de container>`           | editar — chave `maxWeight`                   |

## 12. Critérios de aceitação

| #   | Critério                                                                                     |
| --- | ----------------------------------------------------------------------------------------------- |
| CA1 | Modo A cria `CargoUnit` identificada (fardo do romaneio), vinculada ao container escolhido      |
| CA2 | Modo B cria N `CargoUnit`s por quantidade, uma única chamada ao backend                         |
| CA3 | Estufagem que excede saldo de romaneio (linha indisponível/insuficiente) mostra erro visível, não é silenciosa |
| CA4 | Estufagem que excede `Container.MaxWeight` é aceita e mostra aviso visível (não bloqueia)        |
| CA5 | Nenhuma tela permite editar `CargoUnit` existente                                                |
| CA6 | Cadastro de Container tem campo `MaxWeight` funcional                                            |
| CA7 | `bun run check` + `lint` passam                                                                  |
| CA8 | Modo A e Modo B são acionados por botões/ações separados, sem modal único com toggle             |
| CA9 | Modo B sobre Invoice `RomaneioImport` exibe os fardos identificados automaticamente selecionados; sobre Invoice `Manual` exibe só contador/peso médio |

## 13. Riscos

- **R1 — Contrato ainda não existe** (ver §0), mesmo risco central da
  SPEC-07-10.
- **R2 — Ergonomia do Modo A em aberto no próprio Core** (SPEC-16/SPEC-17 do Core
  §3.6: "Resolve a Invoice a partir do NotaFiscal da linha do romaneio
  informada (ou exige invoiceId explícito — a decidir na implementação)")
  — o formulário do Modo A muda dependendo dessa escolha (campo
  `invoiceId` explícito vs. resolvido implicitamente pelo backend a
  partir da linha escolhida). Não fechar o desenho do formulário antes de
  saber a resposta real.
- **R3 — Migração de dado existente no Core** (SPEC-16/SPEC-17 do Core §14): se o
  Core decidir descartar `CargoUnit`s `Open` (nunca estufadas) na
  migração, containers hoje "vinculados mas sem carga" no NewPortal podem
  simplesmente não ter mais nada pra mostrar de histórico — não é ação do
  frontend, mas pode gerar confusão ("sumiu a carga") se não for
  comunicado ao usuário final antes do deploy. Registrar como aviso de
  comunicação, não como código.
- **R4 — Formato do aviso de peso excedido é "a decidir na
  implementação"** pelo Core (§3.6 item 3, `warnings` no body ou header)
  — esta SPEC não pode fixar o parsing exato até o shape real existir.
- **R5 — Modo B ficou mais complexo de exibir do que uma simples
  "quantidade estufada"** (§3.2): a tela precisa saber, a partir da
  `Invoice` escolhida, se o resultado vai ser identificado (lista de
  fardos) ou anônimo (só contador) — isso é conhecido **antes** de
  chamar o endpoint (basta olhar `Invoice.Source` já carregada na lista
  de Invoices), então a UI pode antecipar a mensagem/expectativa antes
  do submit, mas o parsing do resultado (quais fardos vieram na
  resposta) só existe depois do `just map` real (ver §14 D5).

## 14. Decisões

**D1 — fechada.** Dois fluxos completamente separados (dois botões/
ações distintos na aba Containers — "Estufar fardo específico" / Modo A,
e "Estufar por quantidade" / Modo B), cada um com seu próprio modal —
**não** modal único com toggle. Decisão do usuário; ver §3.1, §5 RF2, §9.

Decisões ainda pendentes:

```
[NEEDS_DECISION]

D2 — Modo A: `invoiceId` explícito no formulário, ou resolvido
implicitamente pelo backend a partir da linha de romaneio escolhida?

A própria SPEC-16/SPEC-17 do Core (§3.6) deixa isso em aberto como "decisão de
implementação". O formulário do frontend muda dependendo da resposta:
se o backend resolve implicitamente, o operador só escolhe NF+Lote+fardo;
se exige `invoiceId` explícito, o formulário precisa de mais um campo
(provavelmente `SelectAsync` sobre as Invoices da operação).

Aguardando o shape real do endpoint pós-`just map` — não decidir a UI
antes disso.

---

D3 — Formato exato do aviso de peso excedido do container.

A SPEC-16/SPEC-17 do Core (§3.6 item 3) deixa em aberto se o aviso vem no corpo
da resposta (`warnings: [...]`) ou em header. Esta SPEC não pode
implementar o parsing até saber — registrado para revisão pós-`just map`.

---

D4 — Nome do namespace i18n do formulário de cadastro de Container.

Não verificado nesta SPEC qual namespace exato (`administrative-registry.
json` ou outro) o formulário de `registry/container` usa hoje — confirmar
na implementação, sem criar um namespace novo se já existir um.

---

D5 — Shape da resposta do Modo B quando `Invoice.Source ==
RomaneioImport` — o backend devolve os identificadores das linhas de
romaneio selecionadas automaticamente?

A SPEC-17 do Core (§2, reescrita) não especifica se o response do
`stuff/quantity` inclui a lista das linhas de `Romaneio` que o backend
escolheu (necessário para a UI cumprir RF8/CA9 — exibir quais fardos
foram estufados, não só um contador). Se o response não trouxer isso, a
UI teria que fazer uma segunda leitura (GET de `CargoUnit`s do container)
para montar a lista — mais uma chamada, não é decisão de UX, é
consequência do shape do contrato.

Aguardando o shape real do endpoint pós-`just map` para fechar como a
tela busca/exibe essa lista.
```

---

**Status:** `BLOCKED`. Não implementar. Retomar só depois que
`warren/Core` SPEC-16 (e o desbloqueio da decisão de migração de dado que
a trava hoje) e SPEC-17 saírem de `DRAFT`/`BLOCKED`, forem implementadas,
e `just map` trazer o contrato real — então resolver D2/D3/D4/D5 acima
(D1 já fechada, §14), seguir o ciclo normal (`WAITING_APPROVAL` →
aprovação explícita `APROVAR SPEC-07-11` → implementação).
