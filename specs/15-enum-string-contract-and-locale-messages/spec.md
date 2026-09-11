# SPEC-15 — Contrato de enum string+Key e mensagens localizadas via `x-locale`

- **ID:** SPEC-15
- **Nome:** enum-string-contract-and-locale-messages
- **Status:** IMPLEMENTED (2026-09-11) — ver "Implementation Notes" (§15).
  Ressalva: CA3/CA4 não verificados manualmente em browser. Achado de
  `admin/access/index.tsx` (`roleFieldOptions`) corrigido como extensão
  pontual autorizada pelo usuário (ver §15).
- **Autor:** portal-dev-agent
- **Área:** `src/api/mutator.ts`, `src/routes/api/core.ts`, `src/lib/core-client.ts`,
  `src/lib/auth-fns.ts`, `src/lib/user-fns.ts` (e demais `*-fns.ts` que chamam
  `coreClient` diretamente), `src/layouts/Form/Fields/Select.tsx`,
  `src/api/generated/**` (regenerado via `just map`)
- **Depende de:** `warren/Core/specs/00-enum-contract`,
  `01-enum-coverage`, `02-localized-messages-infra`,
  `03-localized-messages-registry`, `04-localized-messages-operations`,
  `05-localized-messages-romaneio-import` — todas **IMPLEMENTED** (verificado
  nesta revisão, ver §2). Nenhuma pendência do lado Core bloqueia esta SPEC.
- **Companion (não sobreposta):** `specs/13-static-enum-snapshot-naming/spec.md`
  (`WAITING_APPROVAL`) — cobre o rewrite de `scripts/staticSnapshots.ts` pra
  consumir `x-enum-name` (nome de arquivo/const pelo enum real, mapa `ByKey`,
  helper `resolveXxxLabel`). Esta SPEC **não duplica** aquele escopo — as duas
  nascem da mesma mudança de contrato do Core (SPEC-00) e podem ser aprovadas/
  executadas juntas, mas são PRs independentes.

---

## 1. Objetivo

Sincronizar o NewPortal com dois eixos de contrato que o Core já entrega
(todos `IMPLEMENTED`, nada pendente do lado backend):

1. Todo campo enum sai/entra como **string** (nome do membro C#), não `int`,
   e `EnumOptionDTO` ganhou `Key: string`.
2. Toda mensagem de erro/sucesso do Core (`ProblemDetails.Detail`/
   `MessageDTO.Message`) é resolvida num catálogo multi-idioma, selecionado
   pelo header **`x-locale`** que o request carrega.

Sem isso: formulário com campo `Select` de enum passa a ser rejeitado pelo
Core (400 — o binder não aceita mais `int`), e toda mensagem localizada do
Core cai no fallback genérico do NewPortal, ignorando o idioma ativo do
usuário e o texto real que o Core já manda.

## 2. Contexto

### 2.1 O que o Core já entrega (censo desta revisão)

- **`warren/Core/specs/00-enum-contract`** (IMPLEMENTED) — `JsonStringEnumConverter`
  global: toda resposta com campo enum devolve string (`"type": "Internal"`,
  não `0`); `EnumOptionDTO.Key` novo, sempre igual ao valor serializado;
  `x-enum-name` embutido em `x-snapshot` no OpenAPI (nome do enum C# real,
  ex. `"UserType"`).
- **`warren/Core/specs/01-enum-coverage`** (IMPLEMENTED) — 7 enums novos com
  endpoint Aux funcional: `CargoUnitStatus`, `CargoIdentificationStatus`,
  `ContainerOperationStatus`, `SealName`, `InvoiceItemStatus`, `Gender` +
  os 2 órfãos já existentes `InvoiceStatus`/`RomaneioSource` (só faltava o
  endpoint).
- **`warren/Core/specs/02-localized-messages-infra`** (IMPLEMENTED) —
  header **`x-locale`** (`pt-BR`/`en`/`es`/`zh`, fallback `pt-BR` se ausente/
  inválido) resolve o idioma efetivo via `Middleware/Locale.cs` +
  `ICurrentLocale`; `GlobalExceptionHandler` resolve `ProblemDetails.Detail`
  via `MessageCatalog.Resolve(code, locale, args)` para `DomainException`
  com `Code` preenchido. Onda 1 migrada: Auth/Profile/User.
- **`warren/Core/specs/03-localized-messages-registry`** (IMPLEMENTED) —
  onda 2: Client/Collaborator/Terminal/Harbor/Vessel/Product/Container
  (cadastro) migrados pro catálogo.
- **`warren/Core/specs/04-localized-messages-operations`** (IMPLEMENTED) —
  onda 3: Operation e sub-áreas (Container vínculo, CargoUnit, Document,
  Responsible, Romaneio, Invoice) migradas. `en`/`es`/`zh` de terminologia
  de operação portuária (§8.2/§8.3 daquela SPEC) ainda pendentes de revisão
  por quem conhece o domínio — não bloqueia, o catálogo cai em `pt-BR` para
  esses codes quando `x-locale` pede outro idioma.
- **`warren/Core/specs/05-localized-messages-romaneio-import`** (IMPLEMENTED)
  — onda 4: processor de import de romaneio + os 2 casos irregulares do
  Invoice (`catch` genérico removido, bug de `InvalidOperationException`
  não capturada corrigido para 409). Mesma ressalva de `en`/`es`/`zh`
  pendente do §8.1/§8.2 daquela SPEC.
- Nem toda mensagem do Core passou pelas 4 ondas — restam ~140 `throw` fora
  desses módulos (e alguns achados durante a SPEC-04, ver `[NEEDS_DECISION]`
  lá) ainda no construtor legado `DomainException(string message)`, sempre
  em pt-BR fixo, sem `MessageCode`. Esse construtor legado **continua
  existindo de propósito** no Core (aditivo, não substituído) — o NewPortal
  não pode assumir que toda resposta de erro já vem do catálogo.

### 2.2 O que o NewPortal ainda não fez (achados desta revisão)

- `src/api/mutator.ts` → `extractBackendMessage` lê `data.message`/
  `data.error`/`data.title`, mas **não `data.detail`** — o campo real que
  `ProblemDetails` carrega e que o `GlobalExceptionHandler` (Core) preenche
  via `MessageCatalog.Resolve(...)` desde a SPEC-02. Esse gap já está
  registrado no `AGENTS.md` raiz do ASC ("Contrato de erro e documentação —
  obscurecido no front"), sem SPEC própria até agora — esta é essa SPEC.
- **Nenhum lugar do código manda o header `x-locale`** — nem o proxy BFF
  (`src/routes/api/core.ts`), nem `src/api/mutator.ts`, nem `coreClient`
  (`src/lib/core-client.ts`, instância singleton usada pelos server fns como
  `src/lib/auth-fns.ts`). O cookie `asc_locale`
  (`src/i18n/config.ts` → `LOCALE_COOKIE_NAME`) já existe (seletor de
  idioma da UI) e já usa exatamente os 4 valores que `Langs` serializa
  (`pt-BR`/`en`/`es`/`zh`, confirmado em `src/i18n/config.ts` →
  `locales`) — não precisa de nenhum mapeamento de valor, só precisa ser
  lido e propagado como header em toda chamada ao Core.
- `src/layouts/Form/Fields/Select.tsx` (o componente canônico de todo
  `<select>` de formulário, regra 10 do `AGENTS.md`) usa `opt.value`
  (`EnumOptionDTO.Value`, o **int**) como `value` da `<option>` — é esse
  valor que vai pro `field.value` do `react-hook-form` e é submetido ao
  Core. Depois de `just map` contra o Core novo, o ViewModel só aceita a
  **string** do nome do membro (o binder do `JsonStringEnumConverter`
  rejeita `int` cru antes até de chegar em `[EnumDataType]`) — todo
  formulário com campo `Select` de enum passa a devolver 400 até o
  componente trocar para `opt.key`. Achado concreto (leitura de código),
  não hipotético.
- `src/routes/_dashboard/admin/access/index.tsx` já tem seu próprio
  `resolveEnumOptionName` (shim local, alvo de remoção pela SPEC-13) e já
  indexa por nome/label, não por `.value` numérico — não quebra pelo mesmo
  motivo do `Select.tsx`, mas fica redundante depois que a SPEC-13 rodar.

## 3. Escopo

1. **`just map`** contra um Core com SPEC-00 a 05 `IMPLEMENTED` (já é o caso
   em qualquer ambiente atualizado) — regenerar `src/api/generated/**` e
   revisar o diff como parte da feature (regra do `AGENTS.md` raiz do ASC,
   "Quando o contrato muda"). Efeito esperado: tipos union em vez de
   `number` em todo campo enum, `EnumOptionDTO` com `Key`, hooks/tipos novos
   para os 7 enums da SPEC-01.
2. **Propagar `x-locale` em toda chamada ao Core**:
   - No proxy BFF (`src/routes/api/core.ts`): ler o cookie `asc_locale` do
     `request` recebido e setar o header `x-locale` ao montar o `fetch` para
     `${API_URL}${corePath}` — cobre de uma vez toda chamada autenticada via
     hooks Orval (que passam por `mutator.ts` → `/api/core`), sem precisar
     que o `mutator.ts` conheça locale.
   - Nos server fns que usam `coreClient` (`src/lib/core-client.ts`)
     diretamente e não passam pelo proxy — hoje `src/lib/auth-fns.ts`
     (login, forgot-password/reset) e `src/lib/user-fns.ts`, e qualquer
     outro `*-fns.ts` equivalente: resolver o locale por request (cookie
     `asc_locale` se presente, senão `negotiateLocale(Accept-Language)` —
     mesmo padrão já usado no `__root` pro seed de idioma da UI) e mandar
     `x-locale` explícito por chamada. `coreClient` é uma instância
     singleton sem contexto de request — não dá pra fixar um header
     default nela; a resolução tem que acontecer por chamada.
3. **Corrigir `extractBackendMessage`** (`src/api/mutator.ts`) para ler
   `data.detail` (campo real de `ProblemDetails`) **antes** dos fallbacks
   atuais (`message`/`error`/`title`) — sem remover os fallbacks, que
   continuam cobrindo as ~140 mensagens do Core ainda fora do catálogo
   (construtor legado `string`, ver §2.1) e qualquer resposta de erro que
   não seja `ProblemDetails` (ex. os 400/401/403 crus do proxy BFF
   `src/routes/api/core.ts`, que devolvem `{ message: "..." }`, não
   `ProblemDetails`).
4. **Corrigir `Select.tsx`** para usar `opt.key` (string) como `value` da
   `<option>` e como valor do campo — não `opt.value` (int). Auditar
   (grep por `EnumOptionDTO` e por `.value` em contexto de opção/formulário)
   se existe algum outro consumidor de `EnumOptionDTO` fora de
   `Select.tsx`/`admin/access/index.tsx` que ainda espere bind numérico
   antes de fechar a SPEC como `IMPLEMENTED`.

## 4. Fora do escopo

- Rewrite de `scripts/staticSnapshots.ts` / geração de `ByKey`/
  `resolveXxxLabel` — escopo próprio de `specs/13-static-enum-snapshot-naming/spec.md`,
  aprovação e execução independentes.
- Tradução/revisão de `en`/`es`/`zh` das entradas de catálogo que o Core
  ainda só tem em `pt-BR` (terminologia de operação portuária e
  RomaneioImport, SPEC-04/05 R3 do lado Core) — pendência do lado backend,
  não deste SPEC. O `MessageCatalog.Resolve` do Core já cai em `pt-BR`
  sozinho quando falta tradução; o NewPortal não precisa (nem deve) tentar
  compensar isso client-side.
- Migrar o construtor legado `DomainException(string)` do Core (~140
  `throw` ainda fora do catálogo) — trabalho do lado Core, fora deste repo.
- Qualquer mudança de UI copy além do necessário para exibir a mensagem
  que o Core já manda em `ProblemDetails.Detail`.
- Remover `resolveEnumOptionName` de `admin/access/index.tsx` — ação da
  SPEC-13 (RF5 lá), não desta.

## 5. Requisitos funcionais

- **RF1** — Toda chamada ao Core (via proxy BFF `/api/core` ou via
  `coreClient` direto em server fn) carrega o header `x-locale` com o
  locale ativo do usuário (`asc_locale` ou negociação por
  `Accept-Language`).
- **RF2** — Uma mensagem de erro do Core cujo `MessageCode` já está no
  catálogo (Auth/Profile/User/Client/Terminal/Harbor/Vessel/Product/
  Container/Operation/RomaneioImport — SPEC-02 a 05) aparece no toast do
  NewPortal no idioma ativo do usuário, lida de `ProblemDetails.Detail`.
- **RF3** — Uma mensagem de erro do Core **fora** do catálogo (construtor
  legado `string`, ou erro cru do próprio proxy BFF) continua aparecendo
  no toast via um dos fallbacks existentes — nenhuma regressão de mensagem
  "engolida" por causa da mudança do RF2.
- **RF4** — Um formulário com campo `Select` para um enum (ex. tipo/role de
  usuário) salva com sucesso depois de `just map` — o valor submetido ao
  Core é a string do `Key`, não o `Value` numérico.
- **RF5** — Request sem `x-locale` (caso reste algum ponto não coberto)
  continua funcionando sem erro — o fallback `pt-BR` já é garantia do Core
  (SPEC-02 RF1), não precisa de tratamento extra no NewPortal.

## 6. Requisitos não funcionais

- **RNF1** — `bun run check` + `bun run lint` passam.
- **RNF2** — Nenhuma rota nem contrato de UI muda de shape — só a origem
  do texto exibido e o valor submetido em campos enum.
- **RNF3** — Nomes de arquivo em inglês, comentário em PT-BR (regras 6/7 do
  `AGENTS.md`).
- **RNF4** — `src/api/generated/**` só é tocado por `just map` — nenhuma
  edição manual (regra do `AGENTS.md`: "Nunca editar à mão").

## 7. Desenho

### 7.1 Header `x-locale` no proxy BFF

```ts
// src/routes/api/core.ts — dentro de handler(), antes do fetch ao Core
const localeCookie = request.headers.get("cookie")?.match(/(?:^|;\s*)asc_locale=([^;]+)/)?.[1];
if (localeCookie) headers.set("x-locale", localeCookie);
```

Cobre toda chamada que passa por `mutator.ts` → `/api/core` — que é o
caminho 1 da "Camada de dados" do `AGENTS.md` (hooks Orval / `queryOptions`),
majoritário no app.

### 7.2 Header `x-locale` em server fn com `coreClient` direto

**Decisão (D3, ver §14):** helper compartilhado, não parâmetro explícito do
caller nem parse inline duplicado em cada fn. Novo `getRequestLocale()` (ex.
`src/lib/locale.server.ts`) — lê o cookie `asc_locale` via `getCookie()` do
TanStack Start; se ausente, cai em `negotiateLocale(Accept-Language)` (mesma
função já usada no `__root` pro seed de idioma da UI, `src/i18n/config.ts`).
Cada `createServerFn` que hoje chama `coreClient.post/get(...)` direto
(`auth-fns.ts`, `user-fns.ts`) chama `getRequestLocale()` no próprio corpo e
passa `headers: { "x-locale": locale }` na chamada ao `coreClient` — o
helper centraliza a lógica, mas a chamada em si continua explícita por fn
(não vira default global de `core-client.ts`, que é singleton sem contexto
de request).

### 7.3 `extractBackendMessage` — prioridade de campo

```ts
function extractBackendMessage(err: unknown): string | undefined {
  // ...
  if (typeof data.detail === "string") return data.detail; // ProblemDetails real (Core, SPEC-02+)
  if (data.errors && typeof data.errors === "object") {
    /* mantém como está */
  }
  if (typeof data.message === "string") return data.message; // fallback: proxy BFF / legado
  if (typeof data.error === "string") return data.error;
  if (typeof data.title === "string") return data.title;
  return undefined;
}
```

### 7.4 `Select.tsx` — bind por `key`

```tsx
// value={opt.value} → value={opt.key}
{
  options.map((opt) => (
    <option key={opt.key} value={opt.key}>
      {opt.name[localeKey] ?? opt.name.pt ?? opt.key}
    </option>
  ));
}
```

`FieldOption.value` (usado por `config.options` custom, não vindo de
`EnumOptionDTO`) não muda de tipo — só o mapeamento que hoje faz
`value: opt.value` (linha ~43 de `Select.tsx`) passa a fazer
`value: opt.key`.

## 8. Contrato de rota

Nenhuma rota nova. Efeito observável: header de request novo (`x-locale`)
em toda chamada ao Core; shape de campo enum em request/response já muda
pelo lado do Core (SPEC-00), aqui só passa a ser consumido corretamente.

## 9. Camada de dados

Nenhuma migração — mudança de client/transporte, não de persistência.

## 10. Dependências (fora deste repo)

Nenhuma — todas as SPECs do Core das quais esta depende já estão
`IMPLEMENTED`. Único pré-requisito de ambiente: `just map` precisa rodar
contra uma instância do Core com essas SPECs no ar (`API_URL` apontando
pra ela).

## 11. Arquivos esperados

| Arquivo                                                                                    | Ação                                                                                                                            |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/api/core.ts`                                                                   | editar — lê `asc_locale` do cookie, seta `x-locale` no fetch ao Core                                                            |
| `src/lib/locale.server.ts`                                                                 | criar — `getRequestLocale()` (D3, §7.2/§14): cookie `asc_locale` via `getCookie()`, fallback `negotiateLocale(Accept-Language)` |
| `src/lib/auth-fns.ts`                                                                      | editar — chama `getRequestLocale()`, manda `x-locale` nas chamadas `coreClient`                                                 |
| `src/lib/user-fns.ts`                                                                      | editar — idem                                                                                                                   |
| outros `src/lib/*-fns.ts` com `coreClient` direto (confirmar lista exata em implementação) | editar — idem                                                                                                                   |
| `src/api/mutator.ts`                                                                       | editar — `extractBackendMessage` passa a ler `data.detail` primeiro                                                             |
| `src/layouts/Form/Fields/Select.tsx`                                                       | editar — `value`/`key` da opção passa a usar `opt.key`, não `opt.value`                                                         |
| `src/routes/_dashboard/admin/access/index.tsx`                                             | editar — extensão pontual autorizada (fora da "Área" original): `roleFieldOptions`/`roleLabelByValue` passam a usar `opt.key` |
| `src/api/generated/**`                                                                     | regenerado via `just map` (não editar à mão)                                                                                    |

## 12. Critérios de aceitação

| #   | Critério                                                                                                                                                                                                                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CA1 | `grep -n "data.detail" src/api/mutator.ts` — presente, e antes (na ordem de leitura do código) dos fallbacks existentes                                                                                                                                                                             |
| CA2 | `grep -n "x-locale" src/routes/api/core.ts src/lib/*.ts` — presente nos pontos listados em §11                                                                                                                                                                                                      |
| CA3 | Teste manual: trocar idioma (seletor de idioma → cookie `asc_locale`) e provocar um erro conhecido do catálogo (ex. `POST /api/auth/forgot-password` com e-mail inexistente) em pelo menos 2 idiomas (`pt-BR` e um outro) — toast mostra o texto correto de cada idioma, não o mesmo texto nos dois |
| CA4 | Teste manual: salvar um formulário com campo `Select` de enum (ex. tipo de usuário em `admin`) depois de `just map` — sucesso, sem 400                                                                                                                                                              |
| CA5 | `grep -n "opt.value\|option.value" src/layouts/Form/Fields/Select.tsx` — não referencia mais `EnumOptionDTO.Value` como valor de campo/opção                                                                                                                                                        |
| CA6 | `bun run check` + `bun run lint` passam                                                                                                                                                                                                                                                             |
| CA7 | Nenhuma mensagem de erro deixa de aparecer no toast comparado ao comportamento antes desta SPEC (RF3 — sem regressão de mensagem "engolida")                                                                                                                                                        |

## 13. Riscos

- **R1** — Locale resolvido de forma inconsistente entre o proxy BFF (cookie
  direto) e os server fns que usam `coreClient` (cookie ou
  `Accept-Language`) pode divergir em casos de borda (ex. primeira visita,
  sem cookie ainda) — mitigação: os dois caminhos caem no mesmo fallback
  final do Core (`pt-BR`), então o pior caso é idioma errado numa mensagem
  isolada, nunca erro 500/quebra.
- **R2** — Existem hoje ~140 `throw` no Core fora do catálogo (construtor
  legado) — se `extractBackendMessage` priorizar `data.detail` sem manter
  os fallbacks, essas mensagens (que não são `ProblemDetails.Detail`
  vindo do catálogo, mas o `Message` cru do `DomainException` legado — que
  ainda cai no branch `_ => 500`/`.Message` do `GlobalExceptionHandler`,
  então também aparece como `detail` de um `ProblemDetails`, só que sempre
  pt-BR) continuam funcionando — mitigação já embutida no desenho §7.3
  (fallbacks mantidos, não removidos).
- **R3** — Resolvido (D3, §14) — helper compartilhado `getRequestLocale()`,
  não parâmetro explícito nem parse inline duplicado por fn.

## 14. Decisões

- **D1** — Esta SPEC não duplica `specs/13-static-enum-snapshot-naming/spec.md`
  — tratadas como companions, aprovação/execução independentes (decisão do
  usuário nesta sessão).
- **D2** — Escopo desta SPEC é só o que os specs do Core já `IMPLEMENTED`
  quebram/deixam incompleto no NewPortal (header de locale, leitura de
  `detail`, bind de `Select` por `key`) — não inclui a limpeza dos ~140
  `throw` legados do Core (fora deste repo) nem a tradução `en`/`es`/`zh`
  pendente do lado Core.
- **D3** — Resolvida pelo usuário (nesta sessão): locale nos server fns com
  `coreClient` direto (§7.2) é resolvido por um **helper compartilhado**
  (`getRequestLocale()`, novo `src/lib/locale.server.ts` — cookie
  `asc_locale` via `getCookie()`, fallback `negotiateLocale(Accept-Language)`),
  não por parâmetro explícito do caller nem parse de cookie duplicado em
  cada fn. Justificativa do usuário: fonte única de verdade, sem repetir
  lógica se mais server fns com `coreClient` direto aparecerem depois.

Nenhuma decisão pendente — todas as três resolvidas.

---

## 15. Implementation Notes

**Status: IMPLEMENTED.**

**Arquivos alterados:**

- `src/lib/locale.server.ts` — criado. `getRequestLocale()` (D3): cookie
  `asc_locale` via `getCookie()`, fallback `negotiateLocale(Accept-Language)`.
- `src/routes/api/core.ts` — lê `asc_locale` do header `cookie` da request e
  seta `x-locale` no fetch ao Core.
- `src/lib/auth-fns.ts` — `loginFn` e `fetchMeFn` passam `x-locale:
  getRequestLocale()` nas chamadas `coreClient`.
- `src/lib/user-fns.ts` — `fetchUserListFn` e `fetchUserRolesFn`, idem.
- `src/api/mutator.ts` — `extractBackendMessage` lê `data.detail` antes dos
  fallbacks (`errors`/`message`/`error`/`title`, todos mantidos).
- `src/layouts/Form/Fields/Select.tsx` — bind de opção por `opt.key`
  (string), não mais `opt.value` (int/union). Comentário adicionado
  explicando o motivo (JsonStringEnumConverter).
- `just map` rodado contra o Core real (`dev-asc-api.alexstewart.com.br`) —
  diff resultante: só o timestamp `pulledAt` de `src/api/snapshot.json`
  (mesmo hash de contrato já documentado, `sha256:e3f77a841498…`). O client
  gerado já estava com `EnumOptionDTO.key`/`UserType`/`InternalRole` como
  string antes desta sessão (trabalho de `just map` anterior, fora deste
  chat) — nenhuma mudança adicional em `src/api/generated/**`.

**Comandos executados:**

- `just map` — **VERIFIED**, zero diff de contrato (só timestamp).
- `bun run check` (`tsc --noEmit`) — **VERIFIED**, limpo, zero erro.
- `bun run lint` — **VERIFIED**: `66 problems (3 errors, 63 warnings)`, os 3
  erros são pré-existentes em `src/lib/session.server.ts`
  (`react-hooks/rules-of-hooks`, fora da "Área" desta SPEC, não
  introduzidos por ela) — zero erro/warning novo nos arquivos tocados.

**Critérios de aceitação — resultado:**

| # | Critério | Resultado |
| --- | --- | --- |
| CA1 | `grep -n "data.detail" src/api/mutator.ts` presente antes dos fallbacks | PASS |
| CA2 | `grep -n "x-locale"` nos pontos do §11 | PASS |
| CA3 | Teste manual (2 idiomas, erro do catálogo) | **NOT VERIFIED** — sem acesso a browser/dev server nesta sessão; recomendado antes do merge |
| CA4 | Formulário com `Select` de enum salva sem 400 após `just map` | **NOT VERIFIED manualmente** (sem browser), mas `bind` corrigido e tipos batem (`InternalRole`/`UserType` como string, `Select.tsx` envia `opt.key`) |
| CA5 | `grep` não referencia mais `EnumOptionDTO.Value` como valor de campo | PASS semanticamente — o grep literal ainda acha `opt.value` na linha 76 de `Select.tsx`, mas ali `opt` é o `FieldOption` já mapeado (`value: opt.key` na linha 44); não é mais `EnumOptionDTO.Value` |
| CA6 | `bun run check` + `bun run lint` | PASS (check limpo; lint sem erro novo, mesmos 3 pré-existentes fora de área) |
| CA7 | Nenhuma mensagem "engolida" (fallbacks mantidos) | PASS — fallbacks de `mutator.ts` preservados, `data.detail` só adicionado antes deles |

**Achado da auditoria §3.4 — fora da "Área" desta SPEC, não corrigido aqui:**
`src/routes/_dashboard/admin/access/index.tsx` (`roleFieldOptions`, linha
~197) constrói as opções do `InputMultiSelect` de `roles` usando `opt.value`
do snapshot `internalRoleOptions` (que continua numérico: `100`/`200`/`300`),
enquanto `UserDTO.roles`/`UserCreate.roles` já são `InternalRole[]` — enum
string (`"Agent"`/`"Supervisor"`/`"Laboratory"`) desde o `just map` mais
recente. Isso é uma inconsistência real e concreta (leitura de código, não
hipotética): submeter esse formulário hoje manda valor numérico onde o Core
espera string. `roleLabelByValue` (linha ~209) tem o mesmo problema no
sentido inverso (indexado por número, `u.roles` já vem como string). Como
`admin/access/index.tsx` não está listado em "Área" desta SPEC (§ "Área") e
o §3.4 explicitamente excluía esse arquivo do escopo de auditoria (partindo
da premissa, desatualizada, de que ele já indexava por `key`/nome — válida
antes da SPEC-13 rodar, não depois).

**Resolvido em sessão posterior** — usuário autorizou explicitamente
("pode fazer isso mas seguir o contrato da api ... roles") corrigir como
extensão pontual desta SPEC-15: `roleFieldOptions` passa a usar `opt.key`
(não `opt.value`), `roleLabelByValue` passa a ser `Map<string, string>`
(era `Map<string | number, string>`), alinhado ao contrato real
(`UserDTO.roles`/`UserCreate.roles` = `InternalRole[]`, string). `bun run
check`/`lint` re-verificados após a correção — mesmo resultado (check limpo,
3 erros pré-existentes de `session.server.ts`, nada novo).

**Decisões tomadas durante a implementação:** nenhuma além das já registradas
em §14 (D1-D3); a correção do `roleFieldOptions` foi extensão pontual
autorizada explicitamente pelo usuário, não uma decisão minha.

**Limitações conhecidas:**
- CA3/CA4 não verificados manualmente (sem browser nesta sessão) — recomenda-
  se antes do merge.

---

**Próximo passo:** SPEC `APPROVED` pelo usuário (`APROVAR SPEC-15`, direto na
conversa principal) e **implementada** nesta sessão. Ressalvas: CA3/CA4
pedem verificação manual em browser; achado de `admin/access/index.tsx`
(`roleFieldOptions`) pendente de decisão de escopo.
