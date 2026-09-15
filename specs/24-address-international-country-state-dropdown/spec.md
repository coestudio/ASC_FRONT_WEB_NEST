# SPEC-24 — Endereço: dropdown de País/Estado (Perfil) e suporte a endereço internacional (Porto/Registry)

- **ID:** SPEC-24
- **Nome:** address-international-country-state-dropdown
- **Status:** IMPLEMENTED — front completo (§17) e Core já implementou o
  pedido de §18 (`state` de endereço aumentado pra `maxLength(100)`,
  confirmado via `just map`); `maxLength={2}` client-side removido dos
  campos de texto livre de Estado nesta rodada. Ver §19.
- **Autor:** portal-dev-agent (rascunho)
- **Área:**
  - `src/components/profile/address-tab.tsx` (aba "Endereço" do
    `ProfileModal` — item 1 do pedido)
  - `src/layouts/Form/Fields/AddressGroup.tsx` (bloco de endereço
    compartilhado, consumido por `administrative/registry/harbor/index.tsx`
    e `administrative/clients/index.tsx` — item 2 do pedido)
  - `src/layouts/Form/Fields/InputCEP.tsx` (mask/validação hoje fixa em
    formato brasileiro)
  - novo `src/data/countries.ts` (lista estática de países, mesmo padrão de
    `src/data/br-states.ts`)
- **Depende de:** nenhuma SPEC anterior (área já `IMPLEMENTED` —
  `AddressGroup` nasceu na SPEC-SHARE-01, `ProfileModal`/`address-tab.tsx`
  em SPEC-02/11)
- **Bloqueia:** nada
- **Contexto do pedido:** dois itens do usuário, confirmados e corrigidos
  por ele durante a análise:
  1. "Alterar no modal o dropdown, alterar campo estado para dropdown e
     país também" — **modal = aba "Endereço" do Perfil**
     (`address-tab.tsx`), não o formulário de Registry (correção do
     usuário: "você colocou como portugal mas o correto é perfil").
  2. "Tem que ter a possibilidade de cadastrar qualquer endereço de
     qualquer país (Porto, Portugal)" — **"Porto" aqui é o cadastro de
     Porto/Harbor** (`administrative/registry/harbor`), no contexto de
     operações de importação/exportação (correção do usuário: "e o porto é
     na questão de importação e exportação") — um porto usado numa
     operação de import/export pode estar em qualquer país, não só no
     Brasil.

---

## 1. Objetivo

1. Fazer o campo "Estado" (já dropdown) ganhar companhia do campo "País"
   como dropdown na aba "Endereço" do Perfil (`address-tab.tsx`) — hoje
   esse formulário nem tem campo de país.
2. Permitir cadastrar o endereço de um Porto/Harbor (`administrative/
   registry/harbor`) localizado fora do Brasil (ex.: Porto, Portugal),
   removendo o acoplamento ao formato brasileiro de CEP/UF que hoje
   `AddressGroup` carrega.

## 2. Contexto — dois formulários, duas causas raiz diferentes

Apesar de os dois pedidos falarem de "endereço", eles vivem em componentes
diferentes:

| Item | Tela | Componente | Estado atual do campo país | Estado atual do campo estado |
| --- | --- | --- | --- | --- |
| 1 | Perfil → aba Endereço | `address-tab.tsx` | **não existe** — schema/form nem inclui `country` | `Select` (`Fields/Select.tsx`) com `brStateOptions` (só BR) — já é dropdown |
| 2 | Registry → Porto (Harbor) | `AddressGroup.tsx` (compartilhado com Clientes) | `InputText` livre, `maxLength=2`, placeholder `"BR"` | `InputText` livre, `maxLength=2` |

## 3. Causa raiz (confirmada em código)

### 3.1 Perfil — `address-tab.tsx`

- `addressSchema` (linhas 16-24) só remapeia `postalCode`, `state`,
  `neighborhood`, `street`, `number`, `complement`, `city` de
  `PutApiProfileAddressBody.shape` — **`country` não é remapeado, não
  existe no formulário**. O DTO gerado (`AddressUpdate`/
  `PutApiProfileAddressBody`) **tem** `country` (`src/api/generated/model/
addressUpdate.ts`, `maxLength 2`, `pattern ^[A-Z]{2}$`) — o campo existe no
  contrato, só não é usado nesta tela.
- `state` (linha 71-77) já usa `Select` (`layouts/Form/Fields/Select.tsx`)
  com `config.options = brStateOptions` (`src/data/br-states.ts`, 27 UFs
  brasileiras) — **já é dropdown**, mas exclusivamente brasileiro (não tem
  como escolher "sem UF"/estrangeiro além de deixar vazio).

### 3.2 Registry (Porto) — `AddressGroup.tsx`

- `AddressGroup` (linhas 58-67) renderiza `state` e `country` como
  `InputText` puro — nenhum dos dois é dropdown.
- `InputCEP` (usado dentro de `AddressGroup`, linha 42-53) tem, hard-coded:
  - Máscara `mask="00000-000"` (`IMaskInput`, `InputCEP.tsx` linha 79) —
    formato exclusivamente brasileiro (8 dígitos, hífen na 5ª posição).
    Um código postal de Portugal (`NNNN-NNN`, 7 dígitos) não encaixa nesse
    padrão.
  - `rules={config.rules || { required: "CEP é obrigatório" }}`
    (`InputCEP.tsx` linha 74) — **sempre obrigatório**, mesmo o DTO gerado
    (`AddressCreate.postalCode: string | null`) sendo nullable no Core.
    `AddressGroup` não passa `config` pro `InputCEP`, então herda esse
    default sempre.
  - Lookup automático via ViaCEP (`layouts/Form/Services/Viacep.ts`) —
    API pública só cobre CEP brasileiro; para outros países, a chamada
    simplesmente não preenche nada (falha graciosamente, não é bug, mas
    reforça que o campo foi desenhado só para BR).
- O DTO do Core (`AddressCreate`/`AddressDTO`, e os `.zod.ts` gerados em
  `client.zod.ts`/`harbor.zod.ts`) já modela `country` como
  `maxLength(2).regex(/^[A-Z]{2}$/)` — ou seja, o contrato **já espera**
  um código ISO-3166-1 alpha-2 (`"PT"`, `"BR"`...), não o nome do país por
  extenso. O front hoje deixa o usuário digitar livre (`placeholder="BR"`,
  sem validação de formato visível na UI, só o erro genérico do Zod se
  errar).
- `state` no Core é `maxLength(2)`, **sem regex** — dimensionado para UF
  brasileira (`SP`, `RJ`...). Para a maioria dos países isso não comporta o
  nome nem a sigla oficial de uma unidade administrativa (ex.: "Porto"
  como distrito de Portugal não tem sigla ISO de 2 letras universalmente
  aceita do mesmo jeito que a UF brasileira) — **isto é um limite do
  contrato do Core, não algo que o front pode contornar sozinho** (regra 2
  do `AGENTS.md`: mudar regra de validação é território do Core). Ver §7
  Decisões Pendentes.

## 4. Comportamento atual (bug/limitação)

1. **Perfil:** usuário não consegue nem visualizar nem editar o país do
   próprio endereço — campo simplesmente não existe na tela, mesmo o Core
   aceitando.
2. **Registry (Porto):** tentar cadastrar um porto em Portugal (ex.: "Porto,
   Portugal") esbarra em pelo menos três atritos de UI:
   - CEP: a máscara `00000-000` não aceita o formato português, e o campo é
     obrigatório mesmo que o usuário não tenha um "CEP" nesse sentido.
   - País: campo texto livre de 2 caracteres sem nenhuma ajuda — o usuário
     tenderia a digitar "Portugal" (8 caracteres) ou "PT" sem saber que
     precisa ser exatamente o código ISO; sem lista, sem feedback do valor
     esperado.
   - Estado/distrito: mesmo problema — campo livre de 2 caracteres, sem
     indicação do que preencher para um distrito português.

## 5. Comportamento esperado

- **Perfil (RF1-RF3):** aba "Endereço" ganha um campo "País" (dropdown,
  lista de países, valor persistido como ISO alpha-2) ao lado do "Estado"
  (dropdown) já existente. Quando o país selecionado não for Brasil, o
  campo "Estado" deixa de usar a lista fixa de UFs (que não se aplica) e
  volta a aceitar texto livre (respeitando o limite de 2 caracteres do
  Core — ver riscos).
- **Registry/Porto (RF4-RF7):** `AddressGroup` ganha um campo "País"
  dropdown (mesma lista de países) e passa a decidir o comportamento do
  CEP e do Estado a partir do país selecionado:
  - País = Brasil (padrão): mantém `InputCEP` com máscara/lookup atual e
    `state` como dropdown de UF (reaproveitando `brStateOptions`).
  - País ≠ Brasil: campo de código postal vira texto livre (sem máscara
    brasileira, sem exigir preenchimento), sem acionar o lookup ViaCEP, e
    `state`/"distrito" vira texto livre.
- Nenhuma alteração de contrato/Zod é feita no front — `country`/`state`
  continuam limitados pelo shape gerado (regra 2); o dropdown só ajuda o
  usuário a preencher um valor que já é válido no schema atual, não amplia
  o que o schema aceita.

## 6. Plano de correção

### 6.1 Base compartilhada — `src/data/countries.ts` (novo arquivo)

- Lista estática de países, mesmo padrão de `src/data/br-states.ts`:
  `{ value: "BR", label: "Brasil" }`, `{ value: "PT", label: "Portugal" }`,
  etc. — código ISO-3166-1 alpha-2 como `value` (é o que o Zod
  `AddressXxx.country` exige), nome exibido como `label`.
- Fonte de dados: lista curada à mão (ISO 3166-1, ~250 entradas), sem
  adicionar dependência nova (`i18n-iso-countries`/similar exigiria
  `[NEEDS_DECISION]` pela regra 3 — allowlist do `bunfig.toml`). Ver §7.1.
- Exporta `countryOptions: FieldOption[]` (mesmo tipo usado por
  `brStateOptions`), pronto para `Select`/`config.options`.

### 6.2 Perfil — `address-tab.tsx`

1. Remapeia `country: PutApiProfileAddressBody.shape.country` no
   `addressSchema` (regra 2 — reuso de shape gerado, zero Zod novo).
2. Adiciona `country: address.country ?? "BR"` em `defaultValues`.
3. Novo campo `<Select fieldName="country" config={{ options:
   countryOptions }} />` na `Row`, ao lado de `state`.
4. `state`: mantém `Select` com `brStateOptions` quando `watch("country")
   === "BR"` (ou vazio); quando outro país, troca para `InputText` livre
   (mesmo `fieldName="state"`, sem lista). Implementação: renderização
   condicional no componente (`methods.watch("country")`), sem duplicar
   `Controller`.
5. Novas chaves i18n: `shell.profileModal.country`,
   `shell.profileModal.selectCountry` (nos 4 locales).

### 6.3 Registry/Clientes — `AddressGroup.tsx`

1. Adiciona campo `country` como `Select` (`countryOptions`), substituindo
   o atual `InputText` de país.
2. `state`: `methods.watch(path("state"... na verdade watch(fieldName +
   ".country"))` decide entre `Select` (BR → `brStateOptions`) e
   `InputText` livre (outro país) — mesmo princípio de 6.2.4.
3. `InputCEP` dentro de `AddressGroup`: passa a receber `config={{ rules: {
   required: false } }}` sempre (o Core já modela `postalCode` como
   nullable — a obrigatoriedade sempre-on do componente hoje contradiz o
   contrato) **e** só é renderizado quando o país for Brasil; para outro
   país, `AddressGroup` renderiza um `InputText` simples (sem máscara, sem
   lookup) no lugar, com label genérico ("Código postal").
4. `AddressGroup` já é `LayoutField` type único reusado — a lógica
   condicional fica encapsulada nele, sem duplicar em cada tela consumidora
   (`administrative/registry/harbor`, `administrative/clients`).
5. Novas chaves i18n (namespace onde `AddressGroup` labels hoje estão
   hard-coded em português direto no componente — avaliar se migram para
   `t()` nesta SPEC ou se ficam como estão, já que hoje `AddressGroup` não
   usa `useT()` em nenhum lugar — ver §7.2, decisão pendente).

### 6.4 `InputCEP.tsx`

- Sem mudança estrutural — continua servindo o caso brasileiro (usado
  também isoladamente em `address-tab.tsx`, que já tem `required: false`
  explícito ali). A mudança de obrigatoriedade em `AddressGroup` (6.3.3) é
  só no ponto de chamada, não no componente.

## 7. Decisões pendentes

```
[NEEDS_DECISION]

7.1 — Fonte da lista de países

Qual a fonte de `src/data/countries.ts`?

1. Lista estática curada à mão neste agente (ISO 3166-1 alpha-2 + nome em
   PT-BR), sem dependência nova — mais rápido, mas nomes traduzidos só em
   pt-BR inicialmente (os outros 3 locales usariam o mesmo texto ou só o
   código até alguém traduzir).
2. Adicionar uma dependência (`i18n-iso-countries` ou similar) para nomes
   localizados nos 4 idiomas de fábrica — exige aprovação explícita pela
   regra 3 (allowlist `bunfig.toml`) e é potencialmente `[NEEDS_DECISION]`
   por si só (nova dependência).

Impacto: opção 1 é mais rápida e não mexe em `bunfig.toml`; opção 2 dá
i18n completo dos nomes de país mas depende de aprovação de dependência.
Recomendação (INFERRED): opção 1 para esta SPEC, com país sempre exibido
"as is" (nome em português) nos 4 locales — troca de escopo mínima.

7.2 — Limite de 2 caracteres do campo "Estado" no Core

O Core modela `AddressXxx.state` como `maxLength(2)` sem regex — dimensionado
para UF brasileira. Para a maioria dos países isso não comporta uma
unidade administrativa real (distrito, província, região). O front, aqui,
só pode deixar o campo como texto livre respeitando esse limite (ex.:
usuário digita uma abreviação de até 2 caracteres, ou deixa em branco) —
**não pode** alterar essa regra (regra 2 do AGENTS.md, contrato é do Core).

Como proceder?

1. Aceitar a limitação como está — endereço internacional fica sem
   "estado/distrito" preenchido de forma significativa além de 2
   caracteres (ex.: só um código curto, ou vazio). Sem pedido ao Core.
2. Abrir pedido formal ao Core (via `core-spec-agent`, fora do território
   deste agente) para `state` virar um campo maior (ex.: `maxLength(100)`,
   igual a `city`/`neighborhood`), permitindo nome completo de província/
   distrito para qualquer país. Front retomaria depois de `just map`.

Aguardando decisão do usuário sobre 7.1 e 7.2 antes de iniciar a
implementação. Nenhum código será alterado até `APROVAR SPEC-24`.
```

## 8. Requisitos funcionais

- **RF1** — Aba "Endereço" do Perfil (`address-tab.tsx`) ganha campo "País"
  (dropdown), persistido via `PUT /api/profile/address`.
- **RF2** — Campo "Estado" do Perfil continua dropdown de UF quando o país
  é Brasil; vira texto livre para qualquer outro país.
- **RF3** — Valor de país é sempre o código ISO alpha-2 esperado pelo Zod
  gerado (`^[A-Z]{2}$`), nunca o nome por extenso.
- **RF4** — `AddressGroup` (Registry/Clientes) ganha campo "País" dropdown.
- **RF5** — `AddressGroup`: campo "Estado" segue a mesma regra condicional
  do RF2 (dropdown de UF só para Brasil).
- **RF6** — `AddressGroup`: campo de código postal deixa de ser obrigatório
  incondicionalmente; para país ≠ Brasil, vira texto livre sem máscara
  brasileira e sem acionar o lookup ViaCEP.
- **RF7** — Cadastrar um Porto (`administrative/registry/harbor`) com
  endereço em outro país (ex.: `country: "PT"`, cidade "Porto") é aceito
  pelo formulário e persiste corretamente via `POST`/`PUT
/api/harbor`.

## 9. Requisitos não funcionais

- RNF1 — Zero schema Zod escrito à mão (regra 2) — só remapeamento de
  `shape` já gerado.
- RNF2 — Nenhuma dependência nova adicionada sem decisão do usuário (§7.1).
- RNF3 — `bun run check` + `bun run lint` depois da mudança.
- RNF4 — 4 locales (`pt-BR`, `en`, `es`, `zh`) recebem as novas chaves de
  i18n com o mesmo shape (`pt-BR` fonte de verdade).

## 10. Contrato de rota

Sem mudança de rota — `ProfileModal` (renderizado no `AppShell`, sem rota
própria) e `administrative/registry/harbor`/`administrative/clients` (já
existentes, SPEC-04/05).

## 11. Camada de dados

Sem mudança — `usePutApiProfileAddress`, `usePostApiHarbor`/
`usePutApiHarborId`, `usePostApiClient`/`usePutApiClientId` já existem
(gerados). Nenhum `just map` necessário — não há mudança de contrato.

## 12. UI

- `Select` (já existe, `layouts/Form/Fields/Select.tsx`) reusado para o
  novo campo país nos dois formulários.
- `InputText` (já existe) reusado para os casos de "estado livre"/"código
  postal livre" fora do Brasil — nenhum Field novo precisa ser criado
  (regra 10 já satisfeita pelos Fields existentes).
- `AddressGroup` ganha lógica condicional interna (`watch` do país) — sem
  mudar sua assinatura pública (`LayoutField` type `"AddressGroup"`
  continua igual para quem já consome).

## 13. i18n

Novas chaves (pt-BR fonte de verdade, replicar nos 4 locales):

- `shell.profileModal.country`, `shell.profileModal.selectCountry`
  (namespace `common.json`, mesmo namespace de `profileModal.*` hoje).
- Labels de `AddressGroup` — hoje hard-coded em string PT direta no
  componente ("CEP", "Logradouro", "Estado", "País"...), não passam por
  `useT()`. Decisão a tomar durante implementação (não bloqueia a
  aprovação): manter como está (débito pré-existente, fora do escopo desta
  SPEC) ou migrar para chaves de i18n na mesma leva. Recomendação
  (INFERRED): manter como está — migrar i18n de `AddressGroup` é escopo
  maior que "adicionar um dropdown", fica para SPEC futura se o usuário
  quiser.

## 14. Arquivos esperados

- `src/data/countries.ts` (novo)
- `src/components/profile/address-tab.tsx` (editado)
- `src/layouts/Form/Fields/AddressGroup.tsx` (editado)
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/common.json` (novas chaves)

## 15. Critérios de aceitação

| # | Critério | Verificação |
| --- | --- | --- |
| CA1 | Aba Endereço do Perfil mostra dropdown "País" | manual, `/dashboard` → menu do usuário → Perfil → Endereço |
| CA2 | Trocar país ≠ Brasil no Perfil transforma "Estado" em texto livre | manual, mesma tela |
| CA3 | Cadastrar Porto com país "Portugal" (`PT`) e cidade "Porto" salva sem erro | manual, `administrative/registry/harbor` → Novo |
| CA4 | CEP deixa de ser obrigatório quando o país não é Brasil, no formulário de Porto | manual, mesma tela |
| CA5 | `bun run check` e `bun run lint` passam | comando |

## 16. Riscos

- **R1** — Limite de 2 caracteres em `state` no Core (§7.2) restringe o
  quanto o campo "Estado/Distrito" é útil para país estrangeiro — mitigado
  documentando a limitação, não escondendo-a do usuário.
- **R2** — Lista de países hard-coded (sem dependência) pode ficar
  desatualizada/incompleta em nomes — aceitável para o escopo deste pedido
  (o valor persistido é o código ISO, não o nome).

## 17. Nota de implementação

`APROVAR SPEC-24` recebido, com as decisões de §7 já resolvidas pelo
usuário (7.1 = lista estática sem dependência nova; 7.2 = abrir pedido
formal ao Core, não fazer workaround no front). A parte front (RF1-RF6) foi
implementada nesta rodada; RF7 (Porto com país estrangeiro persistindo
corretamente) depende de verificação manual do usuário — front está pronto
para isso, mas não há como este agente rodar o Core/reproduzir o submit
real.

### Arquivos alterados

- `src/data/countries.ts` (novo) — lista estática ISO 3166-1 alpha-2 em
  português, `countryOptions: FieldOption[]`.
- `src/components/profile/address-tab.tsx` — `country` remapeado do shape
  gerado (`PutApiProfileAddressBody.shape.country`), novo campo `Select`
  "País", campo "Estado" condicional (dropdown de UF só quando país =
  Brasil, texto livre com `maxLength=2` caso contrário), default
  `country: "BR"` quando ausente.
- `src/layouts/Form/Fields/AddressGroup.tsx` — campo "País" agora `Select`
  (`countryOptions`); "Estado" condicional (mesmo critério acima); campo de
  código postal condicional: `InputCEP` com `config={{ rules: { required:
false } }}` quando país = Brasil (Core já modela `postalCode` como
  nullable), `InputText` livre (`maxLength=10`, sem máscara, sem lookup
  ViaCEP) para qualquer outro país.
- `src/routes/_dashboard/_internal/administrative/registry/harbor/index.tsx`
  e `.../administrative/clients/index.tsx` — `toFormValues` passa a
  defaultar `country: record?.address?.country ?? "BR"` (era `""`, que
  quebraria a regex `^[A-Z]{2}$` do Zod gerado se o usuário nunca tocasse
  no campo — bug preexistente, corrigido de passagem por já estar mexendo
  no mesmo campo).
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/common.json` — novas chaves
  `shell.profileModal.country` / `shell.profileModal.selectCountry`, shape
  idêntico nos 4 locales.

### Comandos executados

- `bun run check` (`tsc --noEmit`) — **VERIFIED**, sem erros.
- `bun run lint` — **VERIFIED**, 66 problemas (3 erros, 63 warnings), número
  idêntico ao baseline antes da mudança (confirmado via `git stash` +
  re-lint) — os 3 erros são débito pré-existente em `src/lib/session.server.ts`,
  não tocado nesta SPEC. Nenhum warning/erro novo nos arquivos alterados.
- `just map` — não executado, não aplicável (nenhuma mudança de contrato do
  Core nesta rodada; a mudança de contrato pedida em §7.2 ainda não foi
  implementada no Core).

### Critérios de aceitação

| # | Critério | Status |
| --- | --- | --- |
| CA1 | Aba Endereço do Perfil mostra dropdown "País" | PASS (código) |
| CA2 | Trocar país ≠ Brasil no Perfil transforma "Estado" em texto livre | PASS (código) |
| CA3 | Cadastrar Porto com país "Portugal" (`PT`) e cidade "Porto" salva sem erro | NOT VERIFIED — depende de teste manual contra o Core rodando |
| CA4 | CEP deixa de ser obrigatório quando o país não é Brasil, no formulário de Porto | PASS (código) |
| CA5 | `bun run check` e `bun run lint` passam | VERIFIED |

### Limitações conhecidas

- O limite de `state` em 2 caracteres no Core (§7.2) continua valendo até
  o pedido formal (§18) ser implementado — endereço internacional funciona,
  mas o campo "Estado/Distrito" só aceita até 2 caracteres livres nesse
  meio-tempo.
- `AddressGroup` mantém os labels hard-coded em português (não usa
  `useT()`) — decisão registrada em §13, fora do escopo desta SPEC.
- CA3 não foi verificado de ponta a ponta (sem acesso ao Core rodando
  neste ambiente) — recomendação: usuário testar manualmente cadastrando
  um porto com país "Portugal" antes de considerar o item 2 do pedido
  original totalmente fechado.

## 18. Pedido formal ao Core (`warren/Core`, via `core-spec-agent`)

> Texto pronto para ser encaminhado junto com o da SPEC-23 (§15 daquela
> SPEC), conforme pedido do usuário.

---

**Assunto:** `AddressDTO`/`AddressCreate`/`AddressUpdate.state` limitado a
2 caracteres — insuficiente para endereço fora do Brasil

**Origem do pedido:** `NewPortal` (`portal-dev-agent`), SPEC-24
(`specs/24-address-international-country-state-dropdown/spec.md`),
autorizado pelo usuário.

**Problema:** o shape de endereço do Core (`AddressDTO`/`AddressCreate`/
`AddressUpdate`, usado por `Profile`, `Client`, `Harbor` e possivelmente
outras entidades) modela `state` como `maxLength(2)` sem regex — dimensionado
para a sigla de UF brasileira (`SP`, `RJ`...). O NewPortal implementou
dropdown de país (ISO 3166-1 alpha-2) e passou a permitir cadastrar
endereços fora do Brasil (ex.: um porto em Portugal, usado em operação de
importação/exportação — `administrative/registry/harbor`), mas o campo
"Estado/Distrito" continua limitado a 2 caracteres livres para qualquer
país que não seja o Brasil, o que não comporta o nome nem uma sigla
oficial de província/distrito/região da maioria dos países.

**Pedido:** avaliar aumentar `state` para um limite compatível com nome de
província/distrito por extenso (ex.: `maxLength(100)`, mesmo limite hoje
usado por `city`/`neighborhood` no mesmo DTO), mantendo compatibilidade
com o uso atual (UF brasileira de 2 letras continua cabendo dentro de um
limite maior). Sem mudança de `country` (já é `maxLength(2)` +
`^[A-Z]{2}$`, ISO alpha-2, e isso já está correto/em uso pelo front).

**Não é pedido desta SPEC:** mudar a estrutura do endereço em si (ex.:
adicionar campo de "distrito" separado de "estado"), nem alterar o
`postalCode` (já é nullable e `maxLength(10)`/`maxLength(20)` a depender do
endpoint, suficiente para os formatos internacionais mais comuns).

**Depois de implementado:** o `NewPortal` roda `just map` para regenerar o
client e revisar o diff; nenhuma mudança adicional de UI é esperada além de
remover a limitação visual de `maxLength={2}` nos campos de texto livre de
"Estado" em `address-tab.tsx`/`AddressGroup.tsx` (SPEC-24 §6.2.4/§6.3.2).

---

## 19. Implementation Notes (fechamento — Core já implementou §18)

Usuário confirmou que implementou o pedido de §18 numa sessão separada
(`core-spec-agent`/`warren/Core`). `just map` (rodado nesta rodada)
confirma: `AddressCreate`/`AddressDTO`/`AddressUpdate.state` e os `zod`
gerados (`client.zod.ts`, `harbor.zod.ts`, `profile.zod.ts`) têm
`stateMax = 100` em todos os endpoints (`postApiClientBodyAddressStateMax`,
`putApiHarborIdBodyAddressStateMax`, `putApiProfileAddressBodyStateMax`
etc. — antes eram `2`).

### Arquivos alterados (fechamento)

- `src/components/profile/address-tab.tsx` — `maxLength={2}` → `maxLength={100}`
  no campo de texto livre de "Estado" (país ≠ Brasil).
- `src/layouts/Form/Fields/AddressGroup.tsx` — mesma mudança, mesmo campo.
- `src/api/generated/**` — regenerado via `just map` (mesma rodada da
  SPEC-23 §16 — um único `just map` cobriu os dois pedidos formais, já que
  o Core implementou os dois na mesma sessão separada do usuário).

### Comandos executados

- `just map` — VERIFIED (mesma execução relatada na SPEC-23 §16, incluindo
  a nota sobre a instabilidade momentânea do Core de dev durante a primeira
  tentativa — sem perda de dado, segunda tentativa regenerou tudo).
- `bun run check` — VERIFIED, sem erros.
- `bun run lint` — VERIFIED, mesma contagem do baseline (66: 3 pré-existentes,
  63 warnings), nenhum novo.

### Critérios de aceitação (atualização)

| # | Critério | Status |
| --- | --- | --- |
| CA1-CA2, CA4-CA5 | Ver §15 (já PASS/VERIFIED na rodada anterior) | — |
| CA3 | Cadastrar Porto com país "Portugal" e cidade "Porto" salva sem erro | NOT VERIFIED — ainda depende de teste manual contra o Core (agora o campo "Estado" também aceita nome completo de distrito, não só 2 caracteres) |
| Novo | Campo "Estado" (país ≠ Brasil) aceita até 100 caracteres, não mais 2 | PASS (código) |

### Limitações conhecidas

- CA3 continua não verificado ponta-a-ponta neste ambiente (sem sessão de
  browser interativa) — recomenda-se teste manual do usuário.
