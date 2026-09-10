# SPEC 0002 — Conversão para SPA / static export (deploy Azure Static Web Apps)

- **status**: DRAFT (aguardando aprovação)
- **autor**: agente (sessão de análise de deploy)
- **aprovado por**: — (pendente: usuário)
- **projeto**: `web` (`warren/NewPortal`, Next.js 16 App Router)
- **depende de**: SPEC 0001 (AppShell) — não a revoga, mas reescreve as partes
  server-side dela (`proxy.ts`, `signOutAction`, sessão via `auth()`).

## Contexto

O deploy alvo é **Azure Static Web Apps** (workflow já existe em
`.github/workflows/azure-static-web-apps-zealous-glacier-02b86dd0f.yml`, gerado
pelo portal Azure, hoje não-funcional).

SWA serve **apenas arquivos estáticos** — não roda servidor Node. O suporte
"híbrido/SSR" do SWA para Next.js está congelado em Next 12–14 e não cobre
Next 16 + React 19. Logo, a única forma de hospedar este app no SWA é como
**static export** (`output: "export"` → pasta `out/`), o que exige remover
todo o código que roda no servidor em runtime.

Hoje o app depende de servidor em:

| Ponto | Arquivo | Uso server-side |
|---|---|---|
| Middleware | `src/proxy.ts` | proteção de rota + redirect de locale por `Accept-Language` |
| Route handler | `src/app/api/auth/[...nextauth]/route.ts` | endpoints do NextAuth (`/api/auth/*`) que o `SessionProvider`/`useSession` consomem |
| Config NextAuth | `src/auth.ts` | `authorize()` chama o Core; callbacks `jwt`/`session` |
| Server Actions | `src/app/[lang]/login/actions.ts`, `src/app/[lang]/forgot-password/actions.ts`, `src/components/auth/actions.ts` | `"use server"` chamando o Core via `coreClient` (`API_URL`, server-only) |
| Layout raiz | `src/app/[lang]/layout.tsx` | `cookies()` para tema (evita FOUC) |
| Layout `(app)` | `src/app/[lang]/(app)/layout.tsx` | `await auth()` → sessão + `getUserAreas` |
| Home | `src/app/[lang]/(app)/page.tsx` | `await auth()` |
| i18n | `src/i18n/dictionaries/index.ts` | `import "server-only"` |

O que **já é client-side** e pode ser reaproveitado: `SessionProvider`/
`useSession`/`signOut` de `next-auth/react` (serão trocados), store de tema
(`theme-store.ts`, `useSyncExternalStore` + `localStorage`), TanStack Query,
hooks Orval gerados + `src/api/mutator.ts` (axios com interceptors), todo o
`AppShell` e componentes de UI.

## Objetivo

`npm run build` produz `out/` 100% estático, deployável no SWA, com:
- login / esqueci-a-senha funcionando (client → Core direto);
- proteção de rota client-side (redireciona não-logado para `/{lang}/login`);
- expiração de token (checagem periódica, igual hoje);
- i18n por segmento `/{lang}/…` com os 3 locales pré-renderizados;
- tema claro/escuro sem flash;
- deep-link para qualquer rota conhecida (refresh em
  `/pt-BR/administrativo/clientes` funciona).

## Não-objetivos

- Manter `next-auth` (será **removido**).
- SSR, ISR, RSC com fetch server-side, Server Actions, middleware.
- Suporte a locale fora de `["pt-BR", "en", "zh"]`.
- CRUD real de telas ainda não implementadas (segue placeholder).
- Otimização de imagem do Next (`next/image` passa a `unoptimized`).
- Backend linkado ao SWA / Azure Functions.

## Decisões de arquitetura

### D1 — Remover NextAuth, adotar store de auth client-side (Zustand)

Espelha `warren/Portal` (`src/Global/Auth/use.ts` + `src/Routes/RequireAuth.tsx`),
referência já citada em `memory.md`.

- Novo `src/lib/auth/store.ts` — Zustand com `persist` (localStorage, chave
  `asc.auth`):
  - estado: `{ user, accessToken, expiresAt } | null`;
  - ações: `setSession(payload)`, `clear()`;
  - seletores: `useAuth()`, `useIsAuthenticated()`, `isExpired(expiresAt)`
    (com margem de 30s, igual `token-expiry-checker.tsx` atual).
- Novo `src/lib/auth/core-auth.ts` — client axios (usa `NEXT_PUBLIC_API_URL`)
  com as chamadas que hoje estão nas Server Actions / `auth.ts`:
  - `login(userName, password)` → `POST /api/auth/login`, mapeia o
    `LoginResponse` do Core para o payload da store (mesma lógica de
    `src/auth.ts` `authorize`);
  - `forgotPassword(email)`, `validateResetCode(code)`,
    `resetPassword(token, ...)` — movidas de
    `forgot-password/actions.ts` (mesmos endpoints).
- "Super login": o segredo `SUPER_LOGIN_USER/PASSWORD` **não pode** existir
  num bundle client. Opções (decisão do usuário na aprovação):
  - (a) **remover o botão** "Super login" do `login-form.tsx` (recomendado);
  - (b) manter só em build de dev via `NEXT_PUBLIC_SUPER_LOGIN_*` (secret
    exposto no bundle — aceitável só se o ambiente dev for fechado);
  - (c) mover a regra "isAdmin forçado" para o Core.
- Deletar: `src/auth.ts`, `src/next-auth.d.ts`,
  `src/app/api/auth/` (diretório inteiro → some a pasta `src/app/api`),
  `src/components/token-expiry-checker.tsx` (reescrito, ver D3),
  `src/components/auth/actions.ts`, dependências `next-auth` do
  `package.json`.
- `src/components/providers.tsx`: remover `SessionProvider`. Manter
  `QueryClientProvider` + `ToastContainer` + lógica de toast por query param.

### D2 — `mutator.ts` lê o token da store, não de `/api/auth/session`

`src/api/mutator.ts` hoje faz `fetch("/api/auth/session")`. Passa a importar
`useAuth.getState()` (ou um getter dedicado `getAccessToken()` /
`getExpiresAt()` exportado de `src/lib/auth/store.ts`).
- request interceptor: se `isExpired()` → `clear()` + `window.location`
  para `/{lang}/login?toast=expired` (locale corrente lido do `pathname`);
  senão anexa `Authorization: Bearer`;
- response interceptor: 401 → `clear()` + redirect login; 4xx → `toast.warning`;
  5xx → `toast.error` (inalterado).
- Remove o cache de sessão / `fetchSession` / dedupe de promessa (não precisa
  mais — a store é síncrona).

### D3 — Proteção de rota client-side

Substitui `src/proxy.ts`.

- Novo `src/components/auth/require-auth.tsx` (`"use client"`):
  - lê `useAuth()`; se ausente ou `isExpired` → `router.replace`
    para `/{lang}/login?callbackUrl={pathname}&toast=expired`;
  - enquanto resolve (primeiro paint, antes de hidratar a store persistida) →
    render de `null` / spinner full-screen para evitar flash de conteúdo
    protegido;
  - `setInterval` de 30s (migra `token-expiry-checker.tsx`): ao expirar,
    `clear()` + redirect `?toast=expired`.
- `src/app/[lang]/(app)/layout.tsx` vira `"use client"`:
  - envolve `children` em `<RequireAuth>`;
  - obtém `areas` via `getUserAreas(useAuth().user)` (client agora);
  - obtém `dict` via hook de i18n client (ver D5), não `getDictionary`.
- Páginas públicas (`login`, `forgot-password`): guard inverso — se
  autenticado, `router.replace` para `/{lang}`.

### D4 — Locale: sem middleware

`proxy.ts` fazia (i) redirect de `/` e rotas sem locale para `/{locale}/…`
detectando `Accept-Language`; (ii) proteção (coberta por D3).

- **Rota raiz `/`**: criar `src/app/page.tsx` (`"use client"`) que detecta
  locale (`navigator.language` casado com `locales`, fallback `defaultLocale`)
  e faz `router.replace('/' + locale)`. Pré-renderiza como `out/index.html`.
- **`staticwebapp.config.json`** cobre 404 / rotas sem locale conhecido
  (`navigationFallback` → `/index.html`, ver D9).
- Manter `generateStaticParams` no `[lang]/layout.tsx` e adicionar
  `export const dynamicParams = false` para 404 em locale desconhecido.
- `LanguageSwitcher` já troca o segmento via `usePathname()` — inalterado.

### D5 — i18n client-safe

`src/i18n/dictionaries/index.ts` tem `import "server-only"` e é chamado de
Server Components.

- Remover `"server-only"`. O mapa de `import()` de JSON já é client-safe
  (bundle split por locale).
- Novo `src/i18n/provider.tsx` (`"use client"`): contexto que carrega o
  dicionário do locale corrente (do param de rota) e expõe `useDictionary()`.
  Montado no `[lang]/layout.tsx`.
- Alternativa mais simples (sem contexto): cada página client chama um hook
  `useDictionary(lang)` que faz `use(import(...))` com Suspense. Decisão de
  implementação — manter uma única abordagem.
- `getDictionary` pode continuar existindo para uso síncrono em funções puras
  (ex.: `generateMetadata` estático).

### D6 — Tema sem FOUC

`[lang]/layout.tsx` hoje lê `cookies()` e seta `data-bs-theme` no `<html>`
no server. Em export isso vai embora → flash.

- Adicionar **script bloqueante inline** no `<head>` (via
  `<Script id="theme-init" strategy="beforeInteractive">` ou `<script
  dangerouslySetInnerHTML>` no layout) que lê `localStorage["theme"]`
  (`THEME_STORAGE_KEY`) e seta `document.documentElement.dataset.bsTheme`
  antes do primeiro paint.
- `theme-store.ts`: remover a escrita de `document.cookie` em `setThemeMode`
  (cookie não serve mais a nada) — manter só `localStorage`.
- `[lang]/layout.tsx`: remover `import { cookies }` e o `await cookies()`;
  `<html>` sem `data-bs-theme` fixo (o script inline resolve).
- `generateMetadata` do layout: manter, mas usar `getDictionary` síncrono
  (roda em build, ok).

### D7 — Server Actions → chamadas client

| De | Para |
|---|---|
| `login/actions.ts` `loginAction` (`useActionState`) | handler client no `login-form.tsx` chamando `coreAuth.login()` + `useAuth.setSession()` + `router.push(callbackUrl)` |
| `forgot-password/actions.ts` (3 actions) | `src/lib/auth/core-auth.ts` + mutations no `forgot-password-form.tsx` (pode usar `useMutation`) |
| `components/auth/actions.ts` `signOutAction` | `src/components/auth/sign-out-button.tsx` chama `useAuth.clear()` + `router.push('/{lang}/login?toast=logged-out')` |

- `login-form.tsx`: trocar `useActionState(loginAction)` por
  `react-hook-form` + `useState` de `pending`/`error` (o form já usa RHF para
  validação). Códigos de erro (`invalidCredentials` / `invalidInput`)
  preservados para tradução via dicionário.
- Tratamento de erro: replicar o mapeamento de `axios` status 400 →
  `invalidCredentials` que hoje está no `authorize`/actions.

### D8 — Páginas do grupo `(app)` viram client

Todo `src/app/[lang]/(app)/**/page.tsx` que hoje é Server Component (usa
`await params`, `getDictionary`, `auth()`) precisa:
- virar `"use client"`;
- ler `lang` de `useParams()` em vez de `await params`;
- ler dicionário via `useDictionary()` (D5);
- ler usuário via `useAuth()`.

`page.tsx` da home (`(app)/page.tsx`): client, saudação com
`useAuth().user?.email`.

Auditar cada `page.tsx` na conversão (a maioria é placeholder "Em construção"
da SPEC 0001 — trivial). As telas com hooks Orval já são client e não mudam.

### D9 — `staticwebapp.config.json` (novo, na raiz do app)

```jsonc
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/_next/*", "/assets/*", "*.{png,jpg,svg,ico,json,txt,woff2}"]
  },
  "responseOverrides": { "404": { "rewrite": "/404.html" } },
  "globalHeaders": { "cache-control": "no-cache" },
  "mimeTypes": { ".json": "application/json" }
}
```
- Adicionar `src/app/not-found.tsx` (client) → gera `out/404.html`.
- Sem regras de auth aqui (é tudo client). Sem `routes` de role.
- Ajustar `exclude`/headers conforme os assets reais de `out/` após o
  primeiro build.

### D10 — `next.config.ts`

```ts
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  reactCompiler: true,
  // trailingSlash: true,  // avaliar: simplifica o roteamento de arquivos no SWA
};
```
- `next/font/google` (Geist) funciona em export (baixa no build). Se o
  ambiente de CI não tiver rede para o Google Fonts, migrar para
  `next/font/local` — verificar no primeiro build de CI.

### D11 — Workflow do GitHub Actions

Editar `.github/workflows/azure-static-web-apps-zealous-glacier-02b86dd0f.yml`:
- `branches: [ master ]` → `[ main ]` (o default do repo
  `coestudio/ASC_FRONT_WEB_NEST` é `main`; confirmar em que branch o SWA está
  configurado para publicar);
- adicionar step de setup Node 20+ e `npm ci` **antes** do
  `Azure/static-web-apps-deploy` — ou confiar no Oryx (arriscado com Next 16;
  preferir build explícito):
  ```yaml
  - uses: actions/setup-node@v4
    with: { node-version: 20 }
  - run: npm ci
  - run: npm run build
    env:
      NEXT_PUBLIC_API_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}
  ```
- no step de deploy: `app_location: "/"`, `output_location: "out"`,
  `skip_app_build: true`, `api_location: ""`;
- se o repo for deployado como submódulo de outro, ajustar `app_location`.
- `NEXT_PUBLIC_API_URL` é **assado no bundle** no `next build` → tem que estar
  presente no ambiente do job (secret do repo). Configurar por ambiente
  (dev/prod) se houver mais de um SWA.

### D12 — CORS (bloqueador de integração — validar cedo)

Hoje login / forgot-password / (futuramente) dados sensíveis passavam pelo
**servidor Next** (Server Actions / mutator via `/api/auth/session`). No SPA,
**o browser chama o Core diretamente** em todas as rotas.

→ O Core (`warren/Core`) precisa enviar headers CORS liberando a origem do
SWA (`https://<nome>.azurestaticapps.net` e o domínio custom), incl.
`Authorization` e os métodos usados. Abrir tarefa no repo do Core.
Sem isso, nada funciona em produção mesmo com o build correto.

### D13 — Env vars

Só `NEXT_PUBLIC_*` sobrevivem (bundle client). Após a conversão:

| Var | Onde | Observação |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | build (CI secret) + `.env` local | única URL do Core usada em runtime |
| `API_URL` | só local, só para `just map` / `orval` / `checkApiContract` | não vai para o bundle nem para o CI de deploy |
| `AUTH_SECRET`, `NEXTAUTH_URL` | **removidas** | eram do NextAuth |
| `SUPER_LOGIN_USER/PASSWORD` | conforme D1 | remover ou expor via `NEXT_PUBLIC_` (dev) |

- `src/api/mutator.ts` já valida `NEXT_PUBLIC_API_URL` ausente com `throw` —
  manter.
- Rotacionar o `AUTH_SECRET` e `SUPER_LOGIN_PASSWORD` hoje commitados em
  `.env` (ficam no histórico do git de qualquer forma).
- `checkApiContract` (hooks `pre*`) continua não-bloqueante (`exit 0`) — ok
  manter; em CI de deploy roda com `API_URL` ausente → só imprime aviso.

## Arquivos

### Novos
- `src/lib/auth/store.ts`
- `src/lib/auth/core-auth.ts`
- `src/components/auth/require-auth.tsx`
- `src/i18n/provider.tsx` (ou `src/i18n/use-dictionary.ts`)
- `src/app/page.tsx` (redirect de locale na raiz)
- `src/app/not-found.tsx`
- `staticwebapp.config.json`

### Modificados
- `next.config.ts` (D10)
- `.github/workflows/azure-static-web-apps-zealous-glacier-02b86dd0f.yml` (D11)
- `src/components/providers.tsx` (tira `SessionProvider`)
- `src/api/mutator.ts` (D2)
- `src/app/[lang]/layout.tsx` (tira `cookies()`, script de tema, i18n provider)
- `src/app/[lang]/(app)/layout.tsx` (client, `RequireAuth`, `useAuth`)
- `src/app/[lang]/(app)/**/page.tsx` (client — auditar todas)
- `src/app/[lang]/(app)/page.tsx`
- `src/components/auth/login-form.tsx` (D7)
- `src/components/auth/forgot-password-form.tsx` + steps (D7)
- `src/components/auth/sign-out-button.tsx` (D7)
- `src/components/shell/app-shell.tsx` (tira `<TokenExpiryChecker/>` daqui se
  migrado para `RequireAuth`; i18n client)
- `src/styles/globals/theme-store.ts` (tira cookie)
- `src/i18n/dictionaries/index.ts` (tira `server-only`)
- `src/lib/permissions.ts` — tipos `PermissionUser` alinhados ao `user` da
  nova store (hoje herdam do augment do next-auth)
- `package.json` (remove `next-auth`; pina `engines.node`)

### Deletados
- `src/auth.ts`
- `src/next-auth.d.ts`
- `src/app/api/` (diretório — `[...nextauth]/route.ts`)
- `src/proxy.ts`
- `src/components/token-expiry-checker.tsx` (lógica migrada)
- `src/components/auth/actions.ts`
- `src/app/[lang]/login/actions.ts`
- `src/app/[lang]/forgot-password/actions.ts`

## Plano de execução (fases)

1. **F1 — Build estático "casca"**: `next.config` (`output: export`),
   `images.unoptimized`, `src/app/page.tsx`, `not-found.tsx`,
   `dynamicParams=false`. Ainda com NextAuth. Objetivo: ver o que o
   `next build` acusa como incompatível com export (vai listar cada uso de
   API dinâmica). Serve de checklist real.
2. **F2 — Auth store**: `src/lib/auth/*`, `providers.tsx`, `mutator.ts`.
   Sem tocar em UI ainda.
3. **F3 — Login / forgot-password**: D7. Deletar as `actions.ts` e `auth.ts`,
   `src/app/api/`.
4. **F4 — Guard + layout `(app)`**: D3, `require-auth.tsx`, layout client.
   Deletar `proxy.ts`, `token-expiry-checker.tsx`.
5. **F5 — i18n client + tema**: D5, D6.
6. **F6 — Páginas `(app)` client**: D8 (auditar todas).
7. **F7 — SWA config + workflow**: D9, D11. Deploy num SWA de teste.
8. **F8 — CORS no Core** (D12) — paralelo, repo `warren/Core`.

Cada fase fecha com `npm run build` verde.

## Riscos / pontos abertos

- **CORS no Core (D12)** — sem isso o app não funciona publicado; depende de
  outro repo.
- **`SessionProvider` removido** — qualquer componente ainda importando
  `useSession`/`signOut` de `next-auth/react` quebra; `grep` antes de deletar
  (`token-expiry-checker.tsx`, `mutator.ts` conhecidos; conferir o resto).
- **FOUC de auth** — o `persist` do Zustand hidrata após o primeiro paint;
  `RequireAuth` precisa segurar o render até `hasHydrated` para não piscar
  conteúdo protegido nem redirecionar logado para login por engano.
- **Deep-link / refresh** — validar que toda rota conhecida gera `.html` em
  `out/` (route groups + `[lang]`); `trailingSlash` pode ser necessário para
  o SWA casar `/pt-BR/x` → `/pt-BR/x/index.html`.
- **`next/font/google` no CI** — se sem rede, migrar para `next/font/local`.
- **Branch do SWA** — confirmar se o recurso Azure publica de `main` ou
  `master`; o submódulo local está em `master`, o remote default é `main`.
- **Perda de segurança do "server-only"** — `API_URL` deixa de ser segredo;
  login/forgot-password ficam expostos como qualquer chamada client (é o
  trade-off inerente de SPA; o Core já é a fronteira de segurança real).
- **Super login** — decisão pendente (D1 a/b/c).

## Critérios de aceitação

- [ ] `npm run build` gera `out/` sem erros; nenhum aviso de "dynamic usage"
      / "couldn't be rendered statically".
- [ ] `out/` contém `index.html`, `404.html`, e um `.html` por rota conhecida
      nos 3 locales.
- [ ] Nenhuma referência a `next-auth`, `src/auth`, `next/headers` `cookies`,
      `"use server"`, `src/proxy` no `src/` (grep limpo).
- [ ] Servindo `out/` localmente (`npx serve out`): login real contra o Core
      dev funciona; sessão persiste em refresh; logout volta para login.
- [ ] Acesso direto a rota protegida sem sessão → redireciona para
      `/{lang}/login?callbackUrl=…`.
- [ ] Token expirado (forçar `expiresAt` no passado) → redireciona com
      `?toast=expired` em até 30s.
- [ ] Tema persistido não pisca no reload.
- [ ] Deep-link + F5 em `/{lang}/administrativo/clientes` funciona no SWA.
- [ ] Workflow do Actions builda e publica no push para a branch configurada.
- [ ] (Core) headers CORS liberam a origem do SWA.
