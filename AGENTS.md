# NewPortal — frontend ASC

Frontend do portal interno ASC. Consome a API do backend `warren/Core`.

**Stack:** [TanStack Start](https://tanstack.com/start) (TanStack Router +
TanStack Query) sobre **Vite**, SSR/servidor via **Nitro**. React 19 (React
Compiler ligado), **React-Bootstrap + Bootstrap 5.3**, `react-hook-form`,
`zod`, `react-toastify`. Gerenciado via **Lovable** (não reescrever histórico
publicado — sem force-push/rebase/amend em branch já sincronizada).

## Regras invioláveis

1. **Framework é TanStack (Start/Router/Query), alvo de deploy é Azure Static
   Web Apps.** Toda decisão de build, roteamento e runtime de servidor tem que
   manter a compatibilidade com o SWA — ver `build:azure`,
   `scripts/patch-nitro-azure-swa.mjs`, `staticwebapp.config.json`. Nada de
   adotar outro framework, outro preset de servidor ou um recurso que quebre o
   preset `azure-swa` do Nitro.
2. **Proibido criar ou editar schema Zod.** Os schemas válidos são só os
   gerados pelo Orval em `src/api/generated/zod/**`. `src/lib/validation/*.ts`
   só pode **remapear o shape** (renomear campo) reusando `Xxx.shape.campo`.
   Se uma regra de validação precisa mudar, ela muda no **back-end** (Core) e
   volta pelo `just map` — nunca à mão no front.
3. **Bun é o runtime padrão.** O projeto tem que rodar e buildar com `bun` /
   `bunx` (`bun.lock`, `bunfig.toml`, `mise.toml`). `bunfig.toml` impõe uma
   trava de 24h contra supply-chain e uma allowlist de exceções —
   **confirmar com o usuário antes de adicionar qualquer pacote** à
   allowlist ou às dependências.
4. **npm é runtime secundário.** Manter a compatibilidade sempre que possível
   (`package-lock.json` versionado, scripts `npm run *` funcionando). Se algo
   só funciona em um dos dois, isso é `[NEEDS_DECISION]`.
5. **`.env` NÃO entra no `.gitignore`.** Ele carrega config de
   desenvolvimento e é versionado de propósito — não reflete produção. O que é
   ignorado é `.env.prod` / `.env.dev` / `.env.local` / `.env.prod.json`.
6. **Nome de arquivo sempre em inglês.** Todo arquivo do projeto (código,
   asset, doc) tem nome em inglês. Nada de `relatorio.ts`, `Cadastro.tsx`.
7. **Comentário de código sempre em PT-BR.** Todo comentário (`//`, `/* */`,
   JSDoc, `<!-- -->`) é escrito em português do Brasil.

> **Não é Next.js.** O projeto foi migrado. Qualquer resquício de Next
> (`next/*`, `next-auth`, `NEXT_PUBLIC_*`, `src/app/**`, Server Actions,
> `src/proxy.ts`) é legado a ser removido, não seguido. Alguns comentários
> e arquivos (`memory.md` já removido, `.env.exemple`) ainda citam o desenho
> antigo — ignore e, se tocar no arquivo, corrija.

## Convenções por pasta

Regras específicas vivem em `.github/instructions/*.instructions.md` (cada uma
com um glob `applyTo`). Ao editar dentro de uma pasta coberta, siga o arquivo
correspondente **antes** deste. Cobertura atual:

| `applyTo` | Arquivo |
| --- | --- |
| `src/routes/**` | `routes.instructions.md` |
| `src/api/**`, `src/lib/queries/**` | `api-data.instructions.md` |
| `src/lib/**` | `lib.instructions.md` |
| `src/components/**`, `src/layouts/**` | `components.instructions.md` |
| `src/i18n/**` | `i18n.instructions.md` |
| `src/styles/**` | `theming.instructions.md` |

## Agente

`.claude/agents/portal-dev-agent.md` — agente único de Spec-Driven Development
para este frontend, espelhando o `core-spec-agent` do `warren/Core`. Toda
feature de frontend passa por SPEC aprovada antes de implementação.

## Estrutura

- `src/routes/**` — rotas file-based do TanStack Router. Convenções de nomes em
  [src/routes/README.md](src/routes/README.md). `src/routeTree.gen.ts` é
  **gerado** — nunca editar à mão.
  - `src/routes/__root.tsx` — shell único (head, guard barato de cookie,
    seed do cache de identidade, providers de tema/idioma, `ToastContainer`).
  - Grupos pathless (prefixo `_`, não entram na URL): `_dashboard` (área
    autenticada, aplica `AppShell` + guard de sessão), `_dashboard/_internal`
    (áreas internas: laboratório/administrativo/operacional, guard de área),
    `_site` (site público), `_system` (404, erro, manutenção).
  - `auth/` — grupo de login/logout/forgot-password (não pathless, layout
    próprio em `auth/route.tsx`).
  - `src/routes/api/core.ts` — **proxy BFF** same-origin para o Core.
- `src/router.tsx` / `src/server.ts` / `src/start.ts` — bootstrap do router,
  entrada SSR e integração SSR do React Query. Raramente se mexe.
- `src/api/generated/**` — client 100% gerado pelo Orval (hooks TanStack
  Query, tipos de DTO/ViewModel, schemas zod, snapshots estáticos). **Nunca
  editar à mão.** Regenera com `just map`. Transporte em `src/api/mutator.ts`.
- `src/lib/**` — utilidades compartilhadas. `*.server.ts` = server-only
  (nunca importar de código client). Destaques: `session.server.ts` (cookie
  httpOnly selado), `auth-fns.ts` (server fns de auth), `core-client.ts`
  (axios server→Core), `permissions.ts` (áreas visíveis na UI — **não** é
  guard de rota), `queries/**` (query options do React Query), `ui-prefs.tsx`
  (provider de tema + i18n, hooks `useT`/`useLocale`/`useThemeMode`).
- `src/components/**` — componentes de apresentação. `components/ui/**` é o
  conjunto enxuto atual (usado pelas rotas de auth).
- `src/layouts/**` — `AppShell` (sidebar + topbar da área autenticada),
  `AppBrand`, e `layouts/Form/**` — subsistema grande de campos de formulário
  portado do `warren/Portal`, **hoje não usado por nenhuma rota**. Ver
  pendência abaixo.
- `src/hooks/**` — `useUser`, `useCan` (guard de UI, não de rota).
- `src/i18n/**` — 3 idiomas (`pt-BR` canônico, `en`, `zh`). Dicts em
  `dictionaries/*.json`.
- `src/styles/**` — `styles/globals/**` (Bootstrap import, tokens CSS,
  `theme-store.ts`, script anti-flash de tema). CSS Modules (`*.module.css`)
  para estilo local de componente.
- `src/assets/**` — imagens, css e docs por marca (ASA/ASC/ASI).
- `src/data/**` — dados estáticos de conteúdo (políticas, serviços, telas).

### Aliases de import (`tsconfig.base.json`)

`@/*` → `src/*` (preferido). Também: `api/*`, `components/*`, `hooks/*`,
`lib/*`, `layouts/*`, `i18n/*`, `styles/*`, `config/*`, `data/*`, `helpers/*`,
`plugins/*`, `services/*`, `assets/*`.

## Camada de dados — três caminhos, nesta ordem de preferência

1. **Leitura client-side → hook Orval + `queryOptions`.** As telas de
   listagem/consulta usam os hooks gerados (`useGetApiXxx`) ou, quando o
   mesmo dado é semeado no SSR, um `queryOptions` isolado em
   `src/lib/queries/` com a **mesma queryKey do hook gerado** (o path do
   Core, ex.: `["/api/profile/me"]`). Toda chamada passa pelo `mutator.ts`,
   que bate em `/api/core` com o método real e o path do Core no header
   `x-core-path`.
2. **Proxy BFF `/api/core` (`src/routes/api/core.ts`).** Lê a sessão do
   cookie httpOnly selado, anexa o `Bearer` server-side e repassa a resposta.
   O token **nunca** chega ao JS do browser. Checa CSRF (mesma origem) em
   métodos mutantes. Em 401 do Core, limpa o cookie.
3. **Chamada sensível ou SSR → server function** (`createServerFn`, em
   `src/lib/*-fns.ts` / `*.server.ts`) usando `coreClient` (axios com
   `API_URL` server-only). Login, forgot-password e o seed de identidade do
   SSR (`fetchMeFn`) passam por aqui — nunca por hook client.

`src/api/generated/**` é sempre saída de `just map`. Se o contrato OpenAPI do
Core mudou, rode `just map` e trate o diff como parte da feature.

## Autenticação e sessão

- Sessão = **cookie httpOnly selado** (`asc_session`, AES+SHA-256 via
  `useSession` do TanStack Start), gerido em `src/lib/session.server.ts`.
  Guarda `accessToken`/`refreshToken`/`expiresAt`/`userId` do Core.
- `SESSION_SECRET` (≥32 chars) obrigatório no `.env` — server-only.
- **Guard de rota** = `beforeLoad` da rota. Barato: `_dashboard` checa
  `context.authed` (booleano do cookie, vindo do `__root.beforeLoad` via
  `isAuthedFn`) e faz `throw redirect({ to: "/auth/login", search: { redirect } })`.
  `_dashboard/_internal` checa a área via
  `ensureQueryData(profileMeQueryOptions())` + `getUserAreas`.
- **`src/lib/permissions.ts` decide só o que aparece na UI** (sidebar, botões).
  Não é segurança — a segurança real é o guard de rota + o Core.
- Identidade do usuário logado: `useUser()` / `useCan(area)` no client;
  `profileMeQueryOptions()` para semear/ler o cache.

## i18n e tema

- `useT()` (de `@/lib/ui-prefs`) traduz por chave com ponto (`t("auth.title")`,
  `t("home.welcome", { name })`). `useLocale()` / `useSetLocale()`.
- Quatro locales: `pt-BR` (default e **fonte de verdade** do shape), `en`,
  `es`, `zh` — todos com exatamente as mesmas chaves.
- Dicionário **particionado por namespace**: `src/i18n/dictionaries/<locale>/
  <namespace>.json` (um arquivo por tela/feature + `common.json`), merjado num
  objeto único no load. Detalhes e o estado da migração em
  `.github/instructions/i18n.instructions.md`.
- Locale e tema são resolvidos no servidor (cookie / `Accept-Language`),
  semeados pelo `__root` no contexto do router, mantidos no client pelo
  `UiPrefsProvider`; script anti-flash inline no `<head>`.

## Identidade visual — brand × modo

Duas dimensões **ortogonais** no `<html>`:

- **Modo** — `data-bs-theme="light" | "dark"` (API do Bootstrap 5.3).
  Preferência global e única do usuário (`light` / `dark` / `system`), cookie
  `asc_theme`. `system` resolve por `prefers-color-scheme`.
- **Brand** — `data-brand="asa" | "asi" | "asc"`. Escolha do usuário/tenant
  (default **`asa`**), cookie `asc_brand`, e quando o Core expuser o campo,
  vinda de `/profile/me`. Só troca a **paleta**, nunca o layout.

| Brand | Primária | Secundária/auxiliar |
| --- | --- | --- |
| `asa` — Alex Stewart Agriculture (**default**) | verde | amarelo |
| `asi` — Alex Stewart Internacional | vermelho | marrom `rgb(188, 144, 90)` |
| `asc` — Alex Stewart Core | azul | ciano |

- Tokens ficam em `src/styles/globals/` mapeados nas CSS vars `--bs-*`, em
  blocos `[data-brand="X"][data-bs-theme="Y"]` (6 combinações + fallback).
  Componente **nunca** hard-coda cor — usa token semântico (`--bs-primary`,
  `bg-body`, `text-body`...). Ver `.github/instructions/theming.instructions.md`.
- Hoje o `tokens.css` só tem ASA e não conhece `data-brand` — migração
  descrita em `specs/01-brand-theming/spec.md`.

## Env

- Exposto ao browser: prefixo `VITE_` (`import.meta.env.VITE_*`) — ex.
  `VITE_API_URL`.
- Server-only (server fns, proxy, Nitro): `process.env.*` — `API_URL`,
  `SESSION_SECRET`. **Nunca** importe um módulo `*.server.ts` de código
  client; nunca leia `process.env` fora do servidor.
- `.env` **é versionado** (config de desenvolvimento, não reflete produção) —
  nunca adicionar ao `.gitignore`. O que fica fora do git é `.env.prod` /
  `.env.dev` / `.env.local` / `.env.prod.json`. `.env.exemple` é o template
  (contém entradas legadas de Server Action — não seguir).

## Comandos

Bun é o runtime padrão; os comandos abaixo valem com `bun run …` e, como
fallback, `npm run …`.

| Comando | O quê |
| --- | --- |
| `bun run dev` / `just dev` | dev server (roda `check:api` antes) |
| `bun run build` / `just build` | build de produção |
| `bun run build:azure` | build + `scripts/patch-nitro-azure-swa.mjs` (deploy Azure SWA) |
| `just map` | regenera `src/api/generated/**` do OpenAPI do Core no ar (Core precisa estar rodando; URL em `API_URL`) + `tsc --noEmit` |
| `bun run check` / `type-check` | `tsc --noEmit` |
| `bun run lint` | ESLint |
| `bun run format` | Prettier |

`bun run check` e `bun run lint` são o gate mínimo antes de dar uma feature
por pronta.

## Pendências conhecidas

- **Dois subsistemas de formulário concorrentes**: `src/components/ui/**`
  (enxuto, em uso) vs `src/layouts/Form/**` (portado do Portal, sem uso).
  Consolidação ainda não decidida — o agente trata como `[NEEDS_DECISION]`.
- `specs/` está vazio, mas o código referencia specs que não existem
  (`specs/auth-httponly-cookie-bff.md`, `specs/i18n-and-theme.md`). Recriar
  sob demanda no fluxo SDD.
- Áreas de dashboard (administrativo/operacional/laboratório) ainda são
  páginas "em construção".
- `.env.exemple` e comentários avulsos citam Next.js / Server Actions — lixo
  de migração.
