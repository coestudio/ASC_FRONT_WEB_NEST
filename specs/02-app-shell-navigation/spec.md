# SPEC-02 — AppShell: navegação por área, Profile e biblioteca de componentes compartilhados

- **ID:** SPEC-02
- **Nome:** app-shell-navigation
- **Status:** IMPLEMENTED
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/layouts/AppShell/**`, `src/layouts/Form/Fields/**`,
  `src/hooks/**`, `src/components/ui/**`, `src/components/crud/**`,
  `src/lib/queries/**`, `src/routes/auth/**`
- **Depende de:** SPEC-00 (estrutura `dictionaries/<locale>/<namespace>.json`
  precisa existir — `common.json`/`shell.json` desta SPEC só faz sentido
  nesse formato) e, só pro item do brand-switcher no `UserMenu` (§3.2), da
  SPEC-01. O resto de SPEC-02 não depende de SPEC-01.
- **Fundacional para:** SPEC-03 a SPEC-09 (**todas** dependem de algo daqui —
  nav config, `ViewToggle`/`ConfirmationModal`, ou a biblioteca de CRUD/
  mock-banner do §3.7). Nenhuma SPEC de área cria seu próprio componente de
  lista, form ou "isso é mock" — consome daqui.

---

## 1. Objetivo

Portar do legado a navegação por área do `AppShell` (sidebar com seções
Admin/Administrativo/Operacional/Laboratório/Client), o `UserMenu` completo
(perfil, preferências, logout), o modal de perfil (`ProfileModal`) e dois
utilitários reaproveitados por praticamente toda SPEC seguinte: o toggle
cards/lista (`view-mode`, hoje morto no NewPortal) e o modal de confirmação
genérico. Também corrige aqui o débito de formulário sem `zodResolver` em
`auth/login` e `auth/forgot-password` — é o ponto certo pra isso porque esta
SPEC já mexe no padrão de formulário compartilhado (regra inviolável 9 do
`AGENTS.md`) antes de qualquer SPEC de área (03+) começar a copiar padrão.

**Real vs UI-only:** tudo real. `ProfileModal` fala com `Profile*` do Core
(já existe hook gerado). Nav config e utilitários são puro front, sem mock.

**Componentização — por que isso está aqui e não em cada SPEC de área:** o
legado (`warren/Portal`) não tinha uma camada de CRUD/lista compartilhada —
cada tela (`useClients`, `useTerminals`, `useHarbors`, `useContainers`, o
form de Acesso, etc.) reimplementava fetch + paginação + modal do zero, com
pequenas divergências entre si (achado do levantamento de paridade). Tirando
Operações, todas as telas de área seguem o mesmíssimo padrão: listagem (card
ou tabela via `ViewToggle`) + filtros + paginação + criar/editar/detalhes em
modal + confirmação; e, nas telas UI-only, um aviso "dados de exemplo". Se
cada uma nascer com seu próprio
componente, o NewPortal reproduz o problema que motivou esta pergunta. Por
isso a biblioteca de componentes de CRUD e o banner de mock **nascem aqui**,
na SPEC fundacional, antes de qualquer SPEC de área ser implementada — as
de área só configuram (colunas, campos, schema), nunca recriam list/form/
modal.

## 2. Contexto

NewPortal hoje:
- `src/layouts/AppShell/index.tsx` — shell básico (sidebar + topbar), sem nav
  config por área ainda; usa `useT`, `AreaId` de `permissions.ts`.
- `src/hooks/useCan.ts`/`useUser.ts` já existem.
- `src/lib/permissions.ts` já define `AreaId` = `admin | administrativo |
  operacional | client | laboratorio`.
- `view-mode.ts` e `view-toggle.tsx` foram **apagados** por não terem
  consumidor (sessão anterior de limpeza) — revividos aqui porque a SPEC-03+
  precisa deles em toda lista CRUD.
- Não existe modal de confirmação genérico nem `ProfileModal`.
- `src/routes/auth/login/index.tsx` e `forgot-password/index.tsx` usam
  `react-hook-form` **sem** `zodResolver` — validação solta em
  `register(..., { required, minLength, maxLength })`. `loginSchema` (a
  versão Zod remapeada do DTO) já existia mas nunca foi usada pelo
  `useForm` — foi inclusive apagada na limpeza de código morto por falta de
  import real (ver git history de `src/lib/validation/login.ts`). Recriar
  aqui, agora **conectada** ao form.

Legado (`warren/Portal`):
- `Layouts/SideBar/index.tsx` — seções colapsáveis por área, `SidebarSection`,
  estado ativo por rota, visibilidade via `Can`/`useCan`.
- `Layouts/SideBar/BrandSwitcher.tsx`, `LanguageSwitcher.tsx`, `UserMenu.tsx`
  — `UserMenu` abre `ProfileModal`, expõe tema/brand/idioma/view-mode/logout.
- `Pages/Profile/ProfileModal.tsx` + `Detalhes/`, `Address/`, `Password/` —
  modal com abas, upload de avatar via `requestForm` (multipart), extração de
  erro `ProblemDetails`.
- `Layouts/Windows/Confirmation.tsx` — modal de confirmação (delete/reset),
  usado em quase toda tela CRUD do legado.
- `Hooks/useViewMode.ts` + `Components/ViewToggle.tsx` — preferência
  cards/lista, com override por tela e forçar "cards" no mobile.
- `Data/screens.json`/`Pages/Module.tsx`/`Screen.tsx` — **não portar** (órfão,
  sem rota no legado).

## 3. Escopo

1. **Nav config declarativo, montado por merge de fragmentos** (não um
   literal central editado por todo mundo — mesma ideia do dicionário
   particionado da SPEC-00, pra evitar que toda SPEC de área conflite no
   mesmo arquivo quando implementadas em paralelo):
   - `src/layouts/AppShell/nav/types.ts` — `NavItem { labelKey, to, icon?,
     order? }` (**decidido, D1:** `icon` é `string` — nome da classe
     `bootstrap-icons`, ex. `"bi-house-door"`, renderizado como
     `<i className={`bi ${icon}`} aria-hidden />`; é o que já predomina no
     repo — `UserMenu.tsx`, `AppShell/index.tsx`, `InputPassword.tsx` — e já
     entra globalmente via `bootstrap-icons/font/bootstrap-icons.css` em
     `router.tsx`. `react-bootstrap-icons`, usado hoje em `theme-toggle.tsx`
     e `password-field.tsx`, não migra — fica como débito pra depois, fora
     do escopo desta SPEC), `NavFragment { area: AreaId, sectionLabelKey,
     items: NavItem[] }`, e `SECTION_ORDER: AreaId[]` — lista **fixa** (não
     descoberta por glob) com a ordem das seções entre si
     (`["admin", "administrativo", "operacional", "laboratorio",
     "client"]`, igual ao objetivo do §1). `getNavSections` ordena o
     resultado do merge por essa lista antes de retornar — sem ela, a
     ordem das seções seria a ordem alfabética dos nomes de arquivo em
     `nav/`, que não bate com o objetivo. SPEC de área nova que introduz
     uma seção ainda não listada precisa adicionar 1 linha aqui, além do
     próprio arquivo de fragmento.
   - `src/layouts/AppShell/nav/index.ts` — `import.meta.glob('./*.ts',
     { eager: true })` sobre a pasta, mas **filtra** o resultado excluindo
     `types.ts` e o próprio `index.ts` antes de tratar o resto como
     fragmento (`path.endsWith('/types.ts')` / `'/index.ts'`) — o glob
     também casa com esses dois arquivos, que não exportam `NavFragment`;
     sem o filtro o merge quebra. Só depois disso: agrupa por `area`, ordena
     itens dentro de cada seção por `order`, ordena as **seções entre si**
     por `SECTION_ORDER`, expõe `getNavSections(areas: AreaId[])`.
   - **Cada SPEC de área cria o próprio arquivo** de fragmento
     (`nav/admin.ts` na SPEC-03, `nav/administrative-registry.ts` na
     SPEC-04, etc.) — nunca edita `index.ts` nem o fragmento de outra área.
     Duas áreas que contribuem pra mesma seção (ex.: SPEC-04/05/06/07 todas
     em "administrativo") viram arquivos **separados com o mesmo `area`**;
     o merge concatena, não precisa de coordenação entre specs.
   - Sidebar consome `getNavSections(getUserAreas(user))`, igual ao desenho
     anterior.
2. `UserMenu` no `AppShell`: avatar/nome, abre `ProfileModal`, atalhos de
   tema (já existe `theme-toggle`) e brand (depende do `brand-switcher` da
   SPEC-01), `LanguageSwitcher` (já existe), logout (`logoutFn`).
3. `ProfileModal` — 3 abas (Detalhes, Endereço, Senha) + avatar, via
   `Profile*` gerado (`getApiProfileMe`, update, avatar). Erro do Core
   (`ProblemDetails`) já tratado pelo interceptor do `mutator.ts` — não
   duplicar parsing manual como no legado.
4. `src/components/ui/confirmation-modal.tsx` — recriado (foi apagado por
   falta de uso; agora tem consumidor real a partir da SPEC-03).
5. `src/lib/view-mode.ts` + `src/components/ui/view-toggle.tsx` — recriados
   com API parcialmente diferente do legado (**decidido, D3:**
   `useViewMode()` **sem** `screenKey` — 1 preferência global, não por-tela
   como no legado; `useIsMobile`, `useResponsiveViewMode`, `ViewToggle`
   seguem iguais), `localStorage` em vez do padrão Zustand do legado
   (manter consistência com `ui-prefs.tsx`: `useSyncExternalStore` +
   `localStorage`).
6. `src/lib/validation/login.ts` (`loginSchema`) recriado e **conectado**:
   `auth/login/index.tsx` passa a usar
   `useForm({ resolver: zodResolver(loginSchema) })`, e os campos trocam de
   `components/ui/input` + `components/ui/password-field` (raw) para
   `layouts/Form/Fields/InputText` (campo `userName` — **decidido:** não é
   e-mail, o Core aceita usuário genérico (ex. `SuperAdmin`); `InputEmail`
   fica fora de escopo aqui) + `InputPassword` (regra 10).
   O link "esqueceu a senha?" **não** migra pra dentro de `InputPassword` —
   a prop `recurses.forgotPassword` do componente é **removida** (hoje
   aponta pra rota inexistente `/forget-password` via `<a>` cru, sem `Link`
   do TanStack Router — bug pré-existente, não vale recriar). O link
   continua fora do campo, do jeito que já é hoje: renderizado pela tela
   (`auth/login/index.tsx`) com `Link to="/auth/forgot-password"` ao lado do
   label.
   O botão "Super login" (credenciais de teste, hoje hard-coded no
   componente) é **mantido por enquanto** (decisão do usuário), mas para de
   ter usuário/senha hard-coded no código — passa a ler de variáveis de
   ambiente expostas ao browser: `VITE_SUPER_LOGIN_USER` /
   `VITE_SUPER_LOGIN_PASSWORD` (prefixo `VITE_`, regra do `AGENTS.md` de Env).
   O botão só renderiza quando as duas vars estão definidas (ausente por
   padrão, ex. build sem essas vars). Os **nomes** das vars entram no `.env`
   versionado (regra 5) com valor vazio/placeholder; o **valor real** de
   dev (usuário/senha do SuperAdmin) vai em `.env.local` (gitignored,
   por-dev) — nunca committar credencial real no `.env` versionado.
   `auth/forgot-password/index.tsx` ganha os schemas equivalentes por etapa
   (email / código / nova senha — mesmo shape do que existia em
   `src/lib/validation/reset-password.ts`, também recriado e conectado) e
   troca os mesmos campos raw por `layouts/Form/Fields`. A comparação
   "nova senha" === "confirmar senha" (passo 3) **fica fora do schema**
   (regra 2 proíbe `.refine` de regra de negócio em `src/lib/validation/*`)
   — continua manual no `onSubmit`, com `setError("confirmPassword", ...)`
   quando os valores não baterem, igual ao padrão atual do arquivo.
7. **Biblioteca de CRUD compartilhada** (movida pra cá — antes descrita como
   nascendo na SPEC-04, mas SPEC-04 vem depois de SPEC-03, que já precisa
   dela):
   - `src/components/crud/crud-list-page.tsx` — lista genérica: título,
     busca, colunas (tabela) ou card (via `ViewToggle`), paginação,
     estado vazio/erro, botão "novo".
   - `src/components/crud/crud-record-modal.tsx` — modal genérico com
     **3 modos**: `create`, `edit`, `view` (detalhes). `create`/`edit`
     usam `useForm` + `zodResolver` sobre o schema Zod **gerado** passado
     por config, e renderizam os campos a partir de uma lista de
     `LayoutField` (o tipo já existe em `layouts/Form/Fields/Index.ts`) —
     **nunca** um `<input>` montado no componente genérico, sempre
     `layouts/Form/Fields/*` resolvido pelo `type` do `LayoutField`; `view`
     renderiza os mesmos campos read-only (ou um slot de conteúdo extra —
     usado pela SPEC-05 pra encaixar a seção mock de relatórios dentro do
     modal de detalhe do Cliente). É o padrão que o usuário confirmou pra
     **toda tela exceto Operações**: listagem (card ou
     tabela) + filtros + paginação + criar/editar/detalhes, sempre em modal
     — Operações (SPEC-07/08) é a exceção deliberada, com detalhe em rota
     própria de abas porque o conteúdo é grande demais e navegável demais
     pra caber num modal.
   - `src/components/ui/mock-data-banner.tsx` — **um** componente pro aviso
     "dados de exemplo — sem endpoint no Core", usado por toda tela/seção
     UI-only (SPEC-05 a SPEC-09); recebe só o texto/chave i18n, nunca é
     recriado por SPEC de área.

## 4. Fora do escopo

- Conteúdo de cada área (fica para SPEC-03 a SPEC-09).
- `BrandSwitcher` (já é escopo da SPEC-01, aqui só consome).
- Upload de avatar num serviço diferente do que o Core já expõe.

## 5. Requisitos funcionais

- **RF1** — Sidebar mostra só as seções que `getUserAreas(user)` permite,
  igual à regra hoje em `permissions.ts` (não muda a regra, só a UI).
- **RF2** — Item ativo reflete a rota atual (`useLocation`/`useMatches` do
  TanStack Router).
- **RF3** — `UserMenu` abre `ProfileModal`; salvar cada aba reflete no
  `useUser()` (invalidação/`setQueryData` de `profileMeQueryOptions`).
- **RF4** — `ConfirmationModal` genérico: título, corpo, ação destrutiva
  opcional (variant `danger`), `onConfirm` assíncrono com loading.
- **RF5** — `useViewMode()` (sem `screenKey`, D3) persiste por `localStorage`
  numa chave global única; `useResponsiveViewMode` força `cards` <768px por
  cima disso (esse é o único "override", não é por-tela).
- **RF6** — `auth/login` e `auth/forgot-password` validam via `zodResolver`
  sobre schema gerado/remapeado; nenhuma regra de validação solta em
  `register(...)` sobrevive.

## 6. Requisitos não funcionais

- RNF1 — `bun run check` + `bun run lint` passam.
- RNF2 — Zero cor hard-coded (tokens da SPEC-01).
- RNF3 — Todo label novo entra no namespace `common`/`shell` da SPEC-00 nos
  4 locales, **exceto** as strings de `crud-list-page`/`crud-record-modal`/
  `mock-data-banner`, que entram num namespace novo e dedicado `crud`
  (`src/i18n/dictionaries/<locale>/crud.json`, 4 locales) — biblioteca
  compartilhada consumida por SPEC-03 a SPEC-09, não faz sentido misturar
  com `common`/`shell`. SPEC de área não recria nem edita `crud.json`, só
  consome as chaves já existentes (a menos que precise de uma nova, aí
  adiciona a chave — nunca duplica com um texto solto na tela).

## 7. Contrato de rota

N/A direto — `AppShell` já é o layout de `_dashboard`. Nenhuma rota nova.

## 8. Camada de dados

- `ProfileModal`: hooks Orval gerados de `profile` (leitura) + mutations
  (update/avatar) — avatar via `requestForm`-equivalente do NewPortal.
  `mutator.ts` e o proxy `api/core.ts` já suportam `FormData`/multipart sem
  ajuste (ver R1) — não é escopo desta SPEC mexer neles pra isso.
- Sem chamada nova ao Core além de `Profile*` (já existe client gerado).

## 9. Desenho

```
src/layouts/AppShell/
  nav/
    types.ts             (novo) — NavItem, NavFragment
    index.ts              (novo) — glob-merge dos fragmentos, getNavSections()
  index.tsx             (editar) — consome getNavSections(), renderiza seções via useCan
  UserMenu.tsx           (editar) — + ProfileModal, + brand/theme/language/logout
src/components/profile/
  profile-modal.tsx      (novo)
  detail-tab.tsx / address-tab.tsx / password-tab.tsx (novo)
src/components/ui/
  confirmation-modal.tsx (novo — recriado)
  view-toggle.tsx         (novo — recriado)
src/lib/
  view-mode.ts            (novo — recriado, mesma API do arquivo apagado)
src/components/crud/
  crud-list-page.tsx      (novo — genérico, config por módulo)
  crud-record-modal.tsx      (novo — useForm + zodResolver, config por módulo)
src/components/ui/
  mock-data-banner.tsx     (novo)
src/layouts/Form/Fields/
  InputPassword.tsx        (editar) — remove prop/recurso `recurses.forgotPassword`
```

## 10. Arquivos esperados

| Arquivo | Ação |
| --- | --- |
| `src/layouts/AppShell/nav/types.ts` | criar |
| `src/layouts/AppShell/nav/index.ts` | criar |
| `src/layouts/AppShell/index.tsx` | editar |
| `src/layouts/AppShell/UserMenu.tsx` | editar |
| `src/components/profile/*.tsx` | criar |
| `src/components/ui/confirmation-modal.tsx` | criar |
| `src/components/ui/view-toggle.tsx` | criar |
| `src/lib/view-mode.ts` | criar |
| `src/lib/validation/login.ts` | criar (recriado, conectado ao form) |
| `src/lib/validation/reset-password.ts` | criar (recriado, conectado ao form) |
| `src/routes/auth/login/index.tsx` | editar — `zodResolver` + `layouts/Form/Fields` (`InputText` + `InputPassword`), link "esqueceu a senha" fora do campo, Super login lê credenciais de `import.meta.env.VITE_SUPER_LOGIN_USER`/`VITE_SUPER_LOGIN_PASSWORD` |
| `src/routes/auth/forgot-password/index.tsx` | editar — `zodResolver` por etapa + `layouts/Form/Fields` |
| `src/layouts/Form/Fields/InputPassword.tsx` | editar — remove prop `recurses.forgotPassword` (link quebrado, apontava pra rota inexistente) |
| `.env` | editar — adiciona `VITE_SUPER_LOGIN_USER=` / `VITE_SUPER_LOGIN_PASSWORD=` (nomes só, valor vazio) |
| `.env.local` (não versionado) | doc apenas — dev preenche com credencial real do SuperAdmin |
| `src/components/ui/input.tsx` | remover (superado por `layouts/Form/Fields`) |
| `src/components/ui/field.tsx` | remover (idem) |
| `src/components/ui/password-field.tsx` | remover (idem, `InputPassword` já cobre) |
| `src/components/crud/crud-list-page.tsx` | criar |
| `src/components/crud/crud-record-modal.tsx` | criar |
| `src/components/ui/mock-data-banner.tsx` | criar |
| `src/i18n/dictionaries/*/common.json` | editar (4 locales) — nome do namespace é o que sair de SPEC-00 D1, não decidir de novo aqui |
| `src/i18n/dictionaries/*/crud.json` | criar (4 locales) — strings de `crud-list-page`/`crud-record-modal`/`mock-data-banner` |

## 11. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Usuário `Internal` sem `isAdmin` não vê seção "Admin" na sidebar |
| CA2 | `ProfileModal` salva as 3 abas contra o Core real (ambiente de dev) |
| CA3 | `ConfirmationModal` cancela sem side-effect e confirma disparando `onConfirm` |
| CA4 | `useViewMode` sobrevive a reload (localStorage) e força `cards` <768px |
| CA5 | `bun run check` + `bun run lint` passam |
| CA6 | `grep -n "required:\|minLength:\|maxLength:" src/routes/auth/{login,forgot-password}/index.tsx` não acha regra de validação solta — só `zodResolver` |
| CA7 | `crud-list-page`/`crud-record-modal` conseguem cobrir a tela Terminal (o caso mais simples da SPEC-04) só com config, sem editar o componente genérico — valida que a abstração não nasceu forte demais nem fraca demais |
| CA8 | Nenhuma rota monta um aviso de "dados de exemplo" à mão: `grep -rln "<Alert" src/routes` só acha `Alert` legítimo (erro/aviso real da tela), nunca substituindo `MockDataBanner`; o aviso de dado mock só existe via `<MockDataBanner />` (`grep -rn "MockDataBanner" src/routes` lista exatamente as telas que usam dados mock) — critério resiste a mudança de texto/capitalização entre locales/SPECs, ao contrário de checar a string literal |
| CA9 | `src/components/ui/{input,field,password-field}.tsx` não existem mais; `grep -rn "<input\|Form.Control" src/routes/auth src/components/crud` não acha input cru — só componentes de `layouts/Form/Fields` |
| CA10 | Criar um `nav/<qualquer-nome>.ts` novo com um `NavFragment` e nada mais faz aparecer a seção na sidebar — sem editar `nav/index.ts` nem nenhum outro fragmento |
| CA11 | `grep -n "recurses" src/layouts/Form/Fields/InputPassword.tsx` não acha nada; `grep -rn "SuperAdmin\|DayTVjjl2uV4" src` não acha credencial hard-coded — Super login lê de `import.meta.env.VITE_SUPER_LOGIN_*` e some do form quando as vars não estão definidas |
| CA12 | Com fragmentos de todas as áreas presentes (mock de teste cobrindo os 5 `AreaId`), a ordem das seções na sidebar bate exatamente com `SECTION_ORDER`, mesmo se os arquivos de fragmento forem criados fora dessa ordem alfabética |

## 12. Riscos

- **R1** — Upload de avatar via multipart: já verificado antes da aprovação
  — `mutator.ts` trata `FormData` (branch `isForm`, não força
  `content-type: application/json`) e o proxy BFF (`src/routes/api/core.ts`)
  repassa `request.body` como stream (`duplex: "half"`) com todos os
  headers exceto hop-by-hop, então o `content-type: multipart/form-data;
  boundary=...` chega intacto no Core. Risco rebaixado a checklist de fumaça
  (testar 1 upload real em dev), não bloqueio de design.
- **R2** — Nav config crescer sem limite conforme SPEC-03+ entram; manter
  como dado declarativo simples, não lógica.
- **R3** — `crud-list-page`/`crud-record-modal` genéricos demais → viram um
  "framework dentro do projeto" difícil de estender quando uma tela precisa
  de algo fora do molde (ex.: Harbor com terminais relacionados, na
  SPEC-04). Mitigação: o genérico cobre lista+form simples; cada rota pode
  compor JSX extra ao redor — não empurrar toda variação pra dentro do
  componente genérico via prop nova.
- **R4** — Se `crud-list-page` nascer moldado só no caso de Terminal (mais
  simples da SPEC-04) sem olhar pra frente pra Operações (SPEC-07, que tem
  filtros e enriquecimento de dados bem mais complexos), pode precisar de
  retrabalho quando a SPEC-07 chegar. Mitigação: revisar o desenho de
  `crud-list-page` contra os requisitos da SPEC-07 antes de aprovar esta.

## 13. Decisões pendentes

- ~~**D1** — Ícones~~ **Decidido:** `bootstrap-icons` (classe `bi bi-*`) é o
  padrão para tudo novo que a SPEC-02 cria; `react-bootstrap-icons` fica
  como débito nos usos existentes (`theme-toggle.tsx`, `password-field.tsx`
  — este último removido nesta SPEC de qualquer forma). Ver §3.1.
- ~~**D2** — `ConfirmationModal` cobre "resetar senha"~~ **Decidido: fora do
  escopo desta SPEC.** Nenhum requisito aqui usa "resetar senha de outro
  usuário" (a única troca de senha é a do próprio usuário, aba Senha do
  `ProfileModal`). Se uma SPEC de área futura precisar disso, reusa
  `ConfirmationModal` (já genérico o bastante) ou decide na hora.
- ~~**D3** — `useViewMode` global único ou por-tela~~ **Decidido:** global
  único — `useViewMode(): [ViewMode, (m: ViewMode) => void]`, sem
  `screenKey`, 1 chave só de `localStorage` (`asc:view-mode`) pra toda tela
  que usa `crud-list-page`. Não segue o legado (que tinha override por
  tela) — decisão consciente, mais simples de implementar e usar; usuário
  não pode preferir lista numa tela e cards em outra. Ver RF5, §3 item 5.

---

## Implementation Notes

**Arquivos alterados/criados** — bate com a tabela §10 integralmente:
- `src/layouts/AppShell/nav/{types,index,admin,administrativo,operacional,laboratorio,client}.ts` (novo)
- `src/layouts/AppShell/index.tsx`, `UserMenu.tsx` (editados)
- `src/components/profile/{profile-modal,detail-tab,address-tab,password-tab}.tsx` (novo)
- `src/components/ui/{confirmation-modal,view-toggle,mock-data-banner}.tsx` (novo)
- `src/lib/view-mode.ts`, `src/lib/validation/{login,reset-password}.ts` (novo)
- `src/routes/auth/login/index.tsx`, `src/routes/auth/forgot-password/index.tsx` (editados —
  `zodResolver` + `layouts/Form/Fields`)
- `src/layouts/Form/Fields/InputPassword.tsx` (editado — prop `recurses` removida por inteiro,
  não só `forgotPassword`, pra bater com CA11)
- `src/layouts/Form/Fields/InputAvatar.tsx` (novo — não estava na tabela original, necessário pra
  cobrir o upload de avatar do `ProfileModal` sem violar a regra 10; adicionado a `Fields/Index.ts`)
- `src/components/crud/{crud-list-page,crud-record-modal}.tsx` (novo)
- `.env`, `.env.exemple` (editados), `.env.local` (novo, gitignored, credencial real de dev)
- `src/components/ui/{input,field,password-field}.tsx` (removidos)
- `src/i18n/dictionaries/*/common.json` (4 locales, chaves `shell.brand`/`shell.profileModal.*`)
- `src/i18n/dictionaries/*/crud.json` (4 locales, novo) + `src/i18n/dictionaries.ts` (registra o
  namespace `crud` no shape `pt-BR`)

**Comandos executados:**
- `bun run check` (tsc --noEmit): sem erro nos arquivos desta SPEC. Restam 5 erros
  pré-existentes em `src/components/site/SiteHeader.tsx` (rotas `/servicos`, `/politicas` etc. —
  `src/routeTree.gen.ts` está desatualizado/stale, não regenerado desde antes desta sessão;
  confirmado via `git stash` que os erros já existiam antes de qualquer mudança desta SPEC).
  Fora do território de SPEC-02 (`src/components/site/**`, `routeTree.gen.ts` é gerado, nunca
  editado à mão) — **NOT VERIFIED / débito pré-existente, não corrigido aqui**.
- `bun run lint`: sem warning/erro novo em nenhum arquivo tocado por esta SPEC. Restam 3 erros
  pré-existentes em `src/lib/session.server.ts` (`react-hooks/rules-of-hooks` sobre `useSession`
  do TanStack Start) — arquivo não tocado por esta SPEC, confirmado via `git diff --stat`.
- `just map` — não rodado: contrato do Core não mudou nesta SPEC (§8, só consome `Profile*` já
  existente).

**Critérios de aceitação:**

| # | Resultado |
| --- | --- |
| CA1 | Código revisado: `GatedSection` usa `useCan(section.area)` → `getUserAreas` (regra inalterada). NOT VERIFIED em runtime (precisa de sessão real sem `isAdmin`). |
| CA2 | NOT VERIFIED — precisa do Core rodando em dev; fora do alcance desta sessão (sem ambiente). |
| CA3 | VERIFIED por leitura de código — `ConfirmationModal.onConfirm` roda em `try/finally` com `loading`, `onCancel` não chama `onConfirm`. |
| CA4 | VERIFIED por leitura de código — `useViewMode` persiste em `localStorage["asc:view-mode"]`; `useResponsiveViewMode` força `"cards"` via `useIsMobile(767.98)`. |
| CA5 | VERIFIED — ver comandos acima (limpo nos arquivos desta SPEC). |
| CA6 | VERIFIED — `grep -n "required:\|minLength:\|maxLength:" src/routes/auth/{login,forgot-password}/index.tsx` → vazio. |
| CA7 | NOT VERIFIED — só pode ser validado de fato quando a SPEC-04 (tela Terminal) for implementada contra `crud-list-page`/`crud-record-modal`. |
| CA8 | VERIFIED — `grep -rln "<Alert" src/routes` e `grep -rn "MockDataBanner" src/routes` → ambos vazios (nenhuma rota de área existe ainda). |
| CA9 | VERIFIED — `input.tsx`/`field.tsx`/`password-field.tsx` removidos; `grep -rn "<input\|Form.Control" src/routes/auth src/components/crud` → vazio (busca da lista virou `layouts/Form/Fields/InputText` via `ListSearchInput`). |
| CA10 | VERIFIED por desenho — `nav/index.ts` faz `import.meta.glob('./*.ts', { eager: true })` filtrando `types.ts`/`index.ts`; um fragmento novo em `nav/<nome>.ts` entra automaticamente sem editar mais nada. |
| CA11 | VERIFIED — `grep -n "recurses" src/layouts/Form/Fields/InputPassword.tsx` → vazio (prop inteira removida, não só `forgotPassword`); `grep -rn "SuperAdmin\|DayTVjjl2uV4" src` → vazio (só comentário em `validation/login.ts` citando o formato de usuário, sem credencial). |
| CA12 | VERIFIED por desenho — `SECTION_ORDER` fixo em `nav/types.ts`; `buildSections()` em `nav/index.ts` faz `SECTION_ORDER.map(...)` no final, então a ordem de criação dos arquivos de fragmento não importa. |

**Decisões tomadas durante a implementação:**
- `InputAvatar.tsx` criado em `layouts/Form/Fields/` (não estava no §10 original) — necessário pra
  não violar a regra 10 no upload de avatar do `ProfileModal`; é o único lugar do projeto com
  `<input type="file">` cru, propositalmente dentro da biblioteca de Fields.
- Busca da `crud-list-page` (`ListSearchInput`) usa um `useForm` local de 1 campo só pra poder
  usar `InputText` em vez de `Form.Control` cru — exigido pelo CA9 grep cobrir `src/components/crud`.
- `recurses` do `InputPassword` foi removido por inteiro (não só `forgotPassword`) pra bater com
  o grep literal do CA11; `minLength`/`maxLength` viraram props de topo do componente.
- Link "esqueceu a senha" em `auth/login` ficou abaixo do campo de senha (não visualmente "ao lado
  do label", que exigiria alterar `InputPassword` pra aceitar um slot — fora do escopo, que só
  pede a remoção de `recurses.forgotPassword`).

**Limitações conhecidas:**
- `src/routeTree.gen.ts` está stale (não referencia rotas do site público criadas depois da
  última geração) — causa os 5 erros de `SiteHeader.tsx` em `bun run check`, pré-existentes,
  fora do território desta SPEC. Regenerar é responsabilidade de quem tocar `src/routes/**`
  publicamente (`bun run dev`/`build` regenera automaticamente).
- `src/lib/session.server.ts` tem 3 erros de lint pré-existentes (`react-hooks/rules-of-hooks`
  sobre `useSession`), não tocado por esta SPEC.
- CA2 e CA7 exigem ambiente/SPEC seguinte pra validação real (Core rodando em dev; SPEC-04
  implementada).

**Próximo passo:** iniciar SPEC-03 a SPEC-09 consumindo `nav/*`, `ViewToggle`/`ConfirmationModal`
e a biblioteca `crud-list-page`/`crud-record-modal`/`MockDataBanner`.

---

## Emenda (pós-`IMPLEMENTED`) — SPEC-10

`src/components/crud/crud-list-page.tsx` teve o contrato de props alterado
pela **SPEC-10** (`specs/10-ssr-safe-client-queries/spec.md`), depois desta
SPEC-02 já `IMPLEMENTED`. Motivo: o primeiro consumidor real (`admin/access`,
SPEC-03) quebrava no SSR — `CrudListPage` recebia `items`/`isLoading`/
`isError`/`total` prontos da rota, que buscava o dado via hook Orval direto
no componente sem seed, batendo na trava de `mutator.ts`.

**Mudança de contrato:**
- **Antes:** `items: T[]`, `isLoading?: boolean`, `isError?: boolean`,
  `total: number` — a rota buscava o dado e passava pronto.
- **Depois:** `queryOptions: UseQueryOptions<TQueryData, TError, TQueryData, any>`
  (onde `TQueryData extends CrudPagedResult<T> = { items: T[]; total:
  number | string }`) — `CrudListPage` busca o próprio dado internamente via
  `useSsrSafeQuery` (`src/lib/queries/use-ssr-safe-query.ts`, novo em
  SPEC-10), que nunca deixa o `queryFn` rodar no servidor.

**Para SPEC-04 em diante:** toda tela de lista real passa
`queryOptions={xxxListQueryOptions(params)}` (função em
`src/lib/queries/<modulo>.ts`, mesma queryKey do hook Orval gerado) em vez
de chamar `useGetApiXxx`/`useQuery` direto na rota. Se a tela também quiser
first-paint sem loading (melhor UX, não obrigatório), o `loader` da rota
pode semear o cache antes via uma server function
(`src/lib/<modulo>-fns.ts`, mesmo padrão de `fetchMeFn`/`fetchUserListFn`)
— `CrudListPage` usa o cache já quente sem refetch. Ver
`src/routes/_dashboard/admin/access/index.tsx` como referência completa dos
dois padrões combinados.

Nenhum outro contrato da SPEC-02 mudou. `crud-record-modal.tsx` e os demais
componentes compartilhados (`ViewToggle`, `ConfirmationModal`,
`MockDataBanner`) não foram tocados.
