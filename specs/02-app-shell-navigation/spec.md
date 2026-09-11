# SPEC-02 — AppShell: navegação por área, Profile e biblioteca de componentes compartilhados

- **ID:** SPEC-02
- **Nome:** app-shell-navigation
- **Status:** DRAFT
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

1. Nav config declarativo por área (`src/layouts/AppShell/nav-config.ts`):
   lista de seções → itens (label i18n, rota, ícone), montado dinamicamente
   por `getUserAreas`/`useCan`.
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
   com a mesma API (`useViewMode`, `useIsMobile`, `useResponsiveViewMode`,
   `ViewToggle`), cookie/localStorage em vez do padrão Zustand do legado
   (manter consistência com `ui-prefs.tsx`: `useSyncExternalStore` +
   `localStorage`, já era assim no arquivo apagado — só religar).
6. `src/lib/validation/login.ts` (`loginSchema`) recriado e **conectado**:
   `auth/login/index.tsx` passa a usar
   `useForm({ resolver: zodResolver(loginSchema) })`, e os campos trocam de
   `components/ui/input` + `components/ui/password-field` (raw) para
   `layouts/Form/Fields/InputEmail` + `InputPassword` (regra 10 — o próprio
   `InputPassword` já suporta o link "esqueceu a senha?" via prop
   `recurses.forgotPassword`, então nem precisa recriar esse detalhe).
   `auth/forgot-password/index.tsx` ganha os schemas equivalentes por etapa
   (email / código / nova senha — mesmo shape do que existia em
   `src/lib/validation/reset-password.ts`, também recriado e conectado) e
   troca os mesmos campos raw por `layouts/Form/Fields`.
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
- **RF5** — `useViewMode()` persiste por `localStorage` (chave global) com
  override opcional por tela (`useResponsiveViewMode` força `cards` <768px).
- **RF6** — `auth/login` e `auth/forgot-password` validam via `zodResolver`
  sobre schema gerado/remapeado; nenhuma regra de validação solta em
  `register(...)` sobrevive.

## 6. Requisitos não funcionais

- RNF1 — `bun run check` + `bun run lint` passam.
- RNF2 — Zero cor hard-coded (tokens da SPEC-01).
- RNF3 — Todo label novo entra no namespace `common`/`shell` da SPEC-00 nos
  4 locales.

## 7. Contrato de rota

N/A direto — `AppShell` já é o layout de `_dashboard`. Nenhuma rota nova.

## 8. Camada de dados

- `ProfileModal`: hooks Orval gerados de `profile` (leitura) + mutations
  (update/avatar) — avatar via `requestForm`-equivalente do NewPortal
  (checar se `mutator.ts` já suporta `FormData`; se não, é ajuste desta
  SPEC, não da API layer da SPEC-00/01).
- Sem chamada nova ao Core além de `Profile*` (já existe client gerado).

## 9. Desenho

```
src/layouts/AppShell/
  nav-config.ts        (novo) — seções por AreaId, cada item { labelKey, to, icon }
  index.tsx             (editar) — consome nav-config, renderiza seções via useCan
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
```

## 10. Arquivos esperados

| Arquivo | Ação |
| --- | --- |
| `src/layouts/AppShell/nav-config.ts` | criar |
| `src/layouts/AppShell/index.tsx` | editar |
| `src/layouts/AppShell/UserMenu.tsx` | editar |
| `src/components/profile/*.tsx` | criar |
| `src/components/ui/confirmation-modal.tsx` | criar |
| `src/components/ui/view-toggle.tsx` | criar |
| `src/lib/view-mode.ts` | criar |
| `src/lib/validation/login.ts` | criar (recriado, conectado ao form) |
| `src/lib/validation/reset-password.ts` | criar (recriado, conectado ao form) |
| `src/routes/auth/login/index.tsx` | editar — `zodResolver` + `layouts/Form/Fields` |
| `src/routes/auth/forgot-password/index.tsx` | editar — `zodResolver` por etapa + `layouts/Form/Fields` |
| `src/components/ui/input.tsx` | remover (superado por `layouts/Form/Fields`) |
| `src/components/ui/field.tsx` | remover (idem) |
| `src/components/ui/password-field.tsx` | remover (idem, `InputPassword` já cobre) |
| `src/components/crud/crud-list-page.tsx` | criar |
| `src/components/crud/crud-record-modal.tsx` | criar |
| `src/components/ui/mock-data-banner.tsx` | criar |
| `src/i18n/dictionaries/*/common.json` | editar (4 locales) — nome do namespace é o que sair de SPEC-00 D1, não decidir de novo aqui |

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
| CA8 | `mock-data-banner` é o único lugar do repo com o texto "dados de exemplo" (`grep -rn "dados de exemplo" src` só acha o componente + i18n, nunca hardcoded numa tela) |
| CA9 | `src/components/ui/{input,field,password-field}.tsx` não existem mais; `grep -rn "<input\|Form.Control" src/routes/auth src/components/crud` não acha input cru — só componentes de `layouts/Form/Fields` |

## 12. Riscos

- **R1** — Upload de avatar via multipart pode exigir ajuste no `mutator.ts`
  (hoje pensado para JSON) — validar antes de aprovar implementação.
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

- **D1** — Ícones: `bootstrap-icons` (já em uso) ou `react-bootstrap-icons`
  (também já é dependência)? Padronizar um só.
- **D2** — `ConfirmationModal` cobre também "resetar senha" (ação não
  destrutiva mas sensível) ou isso é um modal à parte?
- **D3** — `useViewMode` global único ou por-tela como no legado
  (`useViewMode(screenKey)` com override)? Legado tem override por tela.

---

**Próximo passo:** `APROVAR SPEC-02`.
