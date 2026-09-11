# Spec — Autenticação com cookie httpOnly + BFF

**Status:** fases 1 e 2 implementadas · pendente validação em runtime + fase 3 (limpeza)
**Autor:** —
**Data:** 2026-09-10

**Decisões travadas na revisão:**

- **Sem refresh.** Ao expirar → redireciona para `/auth/login` e o usuário
  refaz login. É intencional (§9, §14.1).
- `SESSION_SECRET` já criado em `.env` local; `.env.exemple` documentado.
  Falta gerar nos ambientes de deploy.
- Build Azure (`build:azure` / Nitro→SWA) será validado depois da implementação.
  **Contexto:** substitui o esquema atual (token em `localStorage` via zustand +
  `_dashboard` com `ssr: false`) pela opção "#3" discutida: token fora do alcance
  de JS, proxy server-side para o Core, guard de rota no servidor.

---

## 1. Motivação

O esquema atual guarda o `accessToken` do Core em `localStorage` (store zustand
`src/lib/auth.ts`) e o injeta no header `Authorization` direto do browser
(`src/api/mutator.ts`). Consequências:

- **XSS** consegue ler o token e exfiltrar a sessão.
- A área autenticada (`/_dashboard`) precisa de `ssr: false` porque o servidor
  não enxerga a sessão — perde SSR e há um flash antes do guard client rodar.
- O guard de rota é puramente client-side (`beforeLoad` checando o store).

**Objetivo:** o token nunca chega ao JavaScript do browser. O browser fala só
com o próprio servidor do Portal (Nitro/TanStack Start), que sela a sessão num
cookie httpOnly e faz o proxy autenticado para o Core.

## 2. Metas e não-metas

### Metas

1. `accessToken` / `refreshToken` só existem no servidor do Portal e dentro de
   um cookie httpOnly selado (criptografado + assinado).
2. `beforeLoad` de `/_dashboard` roda no servidor, lê a sessão do cookie e
   redireciona para `/auth/login` antes de qualquer render — sem `ssr: false`,
   sem flash.
3. Chamadas ao Core a partir do browser passam por um proxy same-origin do
   Portal, que anexa o `Authorization` server-side.
4. `src/lib/auth.ts` continua sendo a fonte de verdade **da identidade do
   usuário** no client (nome, `type`, `isAdmin`, áreas) — mas **sem token**.
5. Login, logout e expiração (401) mantêm store e cookie coerentes.

### Não-metas

- **Refresh de token automático.** O Core hoje **não expõe endpoint de
  refresh** (o `TokenData.refreshToken` existe no modelo, mas não há
  `POST /api/auth/refresh`). Enquanto isso não existir: expiração é dura, o
  usuário refaz login. O cookie já guarda o `refreshToken` para quando o
  endpoint chegar (ver §9).
- Logout server-side no Core (não há `POST /api/auth/logout`) — logout é só
  limpar o cookie + store.
- SSO / OAuth / multi-tenant.
- Migração das rotas de dashboard ainda não portadas (client/*, administrativo,
  operacional) — ortogonal a esta spec.

## 3. Visão geral da arquitetura

```
┌────────── browser ──────────┐        ┌───── Portal (Nitro / TanStack Start) ─────┐        ┌── Core ──┐
│ src/lib/auth.ts (só `user`) │        │  cookie httpOnly selado  "asc_session"    │        │  .NET    │
│ TanStack Query + Orval      │        │  { accessToken, refreshToken, expiresAt }  │        │  API     │
│ baseURL = "/api/core"  ─────┼──POST──┼─► /api/core/$  (proxy)  ──Authorization────┼───────►│          │
│ (cookie vai junto,          │        │                                           │        │          │
│  withCredentials)           │◄───────┼── resposta do Core (stream/json)          │◄───────┤          │
│                             │        │                                           │        │          │
│ /auth/login (form) ─────────┼──RPC───┼─► loginFn (createServerFn)                 │        │          │
│                             │        │     └─ chama Core /api/auth/login          │───────►│          │
│                             │◄───────┼── { user }  + Set-Cookie: asc_session      │◄───────┤          │
│ beforeLoad /_dashboard  ────┼─SSR────┼─► lê cookie, valida expiração, redirect    │        │          │
└─────────────────────────────┘        └───────────────────────────────────────────┘        └──────────┘
```

Primitivas usadas (todas de `@tanstack/react-start/server`, já disponíveis na
versão instalada — `@tanstack/react-start@1.168`):

| Primitiva                                | Uso                                                   |
| ---------------------------------------- | ----------------------------------------------------- |
| `useSession({ password, name, cookie })` | cookie selado (iron/`h3`) — leitura/escrita da sessão |
| `getRequest()` / `getCookies()`          | acesso ao `Request` cru no proxy e no `beforeLoad`    |
| `setResponseHeader` / `setCookie`        | quando não usar `useSession` diretamente              |
| `createServerFn({ method })`             | `loginFn`, `logoutFn`, `sessionFn` (RPC tipado)       |
| route `server.handlers` (ou rota Nitro)  | catch-all `/api/core/$`                               |

## 4. O cookie de sessão

- **Nome:** `asc_session`
- **Flags:** `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` (em produção;
  `import.meta.env.PROD`), `Max-Age` = `TokenData.expiresIn` (segundos).
- **Conteúdo (selado, nunca em claro):**
  ```ts
  interface SessionData {
    accessToken: string;
    refreshToken: string | null;
    expiresAt: string; // ISO — do TokenData do Core
    userId: string; // UserAdminDTO.id — para revalidar via /api/profile/me
  }
  ```
- **Selagem:** `useSession` criptografa (AES) + assina (SHA-256) com
  `SESSION_SECRET` (env server-only, ≥ 32 chars). O browser vê só um blob
  opaco; adulterar invalida.
- **Por que guardar o `accessToken` no cookie e não uma "session id" com store
  server-side:** não há store server-side (Redis/DB) no Portal hoje e o
  `accessToken` do Core já é um JWT stateless. Guardar o JWT selado é o menor
  caminho. Se um dia houver necessidade de revogação imediata, migra-se para
  session id + tabela (§9).
- **`SameSite=Lax`:** permite o cookie em navegação top-level (o redirect do
  guard, links) e bloqueia envio em POST cross-site de formulários. Requisições
  `fetch` cross-site não carregam o cookie. Para o proxy (§6) ainda validamos
  `Origin` em métodos mutantes (defesa em profundidade / CSRF).

## 5. Sem store client — identidade via React Query

**Não há store de auth no client.** `src/lib/auth.ts` (zustand) e
`src/global/Auth/**` são **removidos**, `zustand` sai do `package.json`.

A identidade do usuário no client é uma **query normal do React Query**, chaveada
em `/api/profile/me` (a mesma key que o hook gerado `getGetApiProfileMeQueryOptions()`
já usa):

- **SSR:** `__root` faz `queryClient.ensureQueryData(getGetApiProfileMeQueryOptions())`.
- **Re-hidratação:** `@tanstack/react-router-ssr-query` (nova dep, v1.167.x —
  compatível com router 1.170 / react-query 5.102) desidrata o cache do React
  Query no HTML e o client re-hidrata na montagem. **Zero refetch no boot.**
- **Leitura:** `useUser()` (`src/hooks/useUser.ts`) = wrapper fino sobre
  `useQuery(getGetApiProfileMeQueryOptions())`. `useCan(area)`
  (`src/hooks/useCan.ts`) = `getUserAreas(useUser().data).includes(area)`.
- **`staleTime`:** ~5 min para o `/api/profile/me` (via `queryClient` default ou
  no próprio `queryOptions`), então navegação client-side não refetcha.
- **Invalidação:** `router.invalidate()` no login/logout, ou
  `queryClient.setQueryData` / `invalidateQueries` (edição de perfil, websocket
  futuro — §15).

Fonte de verdade: **servidor** = cookie httpOnly selado; **client** = cache do
React Query re-hidratado. Nunca `localStorage`.

### `src/router.tsx` — mudanças

```ts
import { routerWithQueryClient } from "@tanstack/react-router-ssr-query";
// ...
const router = routerWithQueryClient(
  createRouter({ routeTree, context: { queryClient } /* ... */ }),
  queryClient,
);
```

O `<QueryClientProvider>` manual em `__root` pode sair (o wrapper já provê), ou
fica — validar na implementação.

## 6. Proxy `/api/core`

Rota server-side de path fixo. O client manda o método HTTP real e o
caminho+query do Core no header `x-core-path`; o handler injeta o Bearer do
cookie e repassa a resposta em stream.

> **Mecanismo (resolvido).** O `@tanstack/react-start@1.168` **não** roda
> `server.handlers` de rota em match de splat (`createStartHandler.js`:
> `isExactMatch` exige `rawParams["**"] === undefined`). Solução: rota de
> **path fixo** `src/routes/api/core.ts` (`createFileRoute("/api/core")` com
> `server.handlers` por método, sem `component`) — path exato, `isExactMatch`
> true. O caminho+query real do Core vai no header **`x-core-path`**, o método
> HTTP é o real. Funciona em `vite dev` e no build (mesmo pipeline
> `createStartHandler`), sem Nitro, sem splat, com stream de body.

```
<MÉTODO REAL> /api/core        header x-core-path: /api/<path>?<query>
  → x-core-path ausente/inválido           → 400
  → método mutante e Origin ≠ host          → 403
  → readServerSession() == null             → 401 (sem chamar o Core)
  → fetch(`${API_URL}${x-core-path}`, { method, Authorization: Bearer, body: stream })
  → repassa status + body (stream) da resposta do Core
  → Core respondeu 401                      → Set-Cookie asc_session vazio (Max-Age=0)
  → erro de rede / timeout                  → 502 ProblemDetails
```

- **`API_URL`** (server-only, `process.env.API_URL`) — base do Core.
- **Headers:** repassa os do request menos os hop-by-hop (`host`, `connection`,
  `cookie`, `content-length`, `x-core-path`, …); adiciona `Authorization`.
- **Stream:** `request.body` / `coreRes.body` passam sem buffer (uploads de
  documento, downloads de romaneio).

### `src/api/mutator.ts` — mudanças

- `axiosInstance` usa um **adapter customizado** (`coreProxyAdapter`) em vez de
  bater na rede: monta `x-core-path` a partir de `config.url` + `config.params`
  e faz `fetch("/api/core", { method, headers, body, credentials: "same-origin" })`.
  Suporta `FormData` e `responseType: blob/arraybuffer`.
- No **servidor** o adapter lança — chamadas autenticadas ao Core no SSR devem
  usar server fn (`fetchMeFn`). Nada no escopo atual faz isso.
- Interceptor de response mantido: 401 → `window.location.href = "/auth/login"`
  (hard reload). `VITE_API_URL` deixa de ser usado.
- `VITE_API_URL` deixa de ser usado pelo client. Mantido só se algum script de
  dev precisar bater direto no Core; documentar em `.env.exemple`.

## 7. Reidratação da identidade (sem flash)

O `__root` traz o `user` no **loader** (roda isomórfico; no SSR usa o cookie),
prefetchando a query `/api/profile/me` no `queryClient`. O
`@tanstack/react-router-ssr-query` desidrata esse cache no HTML e o client
re-hidrata — o primeiro render do client já tem o `user`, sem refetch, sem
mismatch.

```ts
// __root
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async () => {
    // guard barato: só checa presença/validade do cookie (server); no client,
    // lê do contexto já resolvido. Ver §8.
    const authed = await isAuthedFn(); // createServerFn GET — bool
    return { authed };
  },
  loader: async ({ context }) => {
    if (!context.authed) return;
    // popula o cache; SSR busca via proxy interno, client re-hidrata
    await context.queryClient.ensureQueryData(profileMeQueryOptions());
  },
  // ...
});
```

- `isAuthedFn` (`createServerFn({ method: "GET" })`): lê `SessionData` do cookie
  selado, retorna `false` se ausente ou `expiresAt` vencido, senão `true`.
  Barato, não chama o Core.
- `profileMeQueryOptions()`: `queryOptions` em cima de `getApiProfileMe` (hook
  gerado) com `staleTime` ~5 min. `UserDetailDTO` tem `type`, `isAdmin`, `roles`
  — suficiente para `src/lib/permissions.ts`.
- No SSR o `getApiProfileMe` bate no proxy `/api/core/api/profile/me` (mesma
  origem) ou direto em `${API_URL}` com o Bearer do cookie — decidir na
  implementação (o proxy same-origin é mais simples de manter).

## 8. Guard de rota

### `src/routes/_dashboard.tsx`

```ts
export const Route = createFileRoute("/_dashboard")({
  // sem ssr:false
  beforeLoad: ({ context, location }) => {
    if (!context.authed) {
      throw redirect({ to: "/auth/login", search: { redirect: location.href } });
    }
  },
  component: DashboardLayout,
});
```

`context.authed` vem do `beforeLoad` do `__root` (§7 — `isAuthedFn`, checagem
barata do cookie no servidor). O redirect acontece server-side no SSR e
client-side na navegação. Sem flash.

### `src/routes/_dashboard/_internal.tsx`

Precisa do `user` (não só do bool), então garante a query e lê dela:

```ts
beforeLoad: async ({ context }) => {
  const user = await context.queryClient.ensureQueryData(profileMeQueryOptions());
  if (!getUserAreas(user).includes("laboratorio")) {
    throw redirect({ to: "/dashboard" });
  }
},
```

`ensureQueryData` no client bate no cache re-hidratado (sem round-trip); no SSR
reusa o que o loader do `__root` já buscou.

## 9. Fluxos

### Login

1. `/auth/login` (form) chama `loginFn({ userName, password })`
   (`createServerFn({ method: "POST" })`).
2. `loginFn` no servidor: `POST ${API_URL}/api/auth/login`.
   - erro → repassa status + mensagem (o client mostra toast).
   - ok → recebe `{ user: UserAdminDTO, tokenData: TokenData }`.
3. `loginFn` sela `SessionData` no cookie (`useSession().update(...)`,
   `Max-Age = tokenData.expiresIn`).
4. `loginFn` retorna **só `{ user }`** (sem token) para o client.
5. Client: `queryClient.setQueryData(profileMeQueryOptions().queryKey, user)` →
   `router.invalidate()` → navega para `search.redirect ?? "/dashboard"`.

### Logout

1. `/auth/logout` chama `logoutFn()`.
2. `logoutFn`: `useSession().clear()` (Set-Cookie expirado). (Sem chamada ao
   Core — não há endpoint.)
3. Client: `queryClient.clear()` → `window.location.href = "/auth/login"`
   (hard reload garante que nada do cache autenticado sobra).

### Sessão expira / 401 em chamada autenticada

1. Proxy detecta `expiresAt` vencido **ou** Core devolve 401.
2. Proxy responde 401 e manda `Set-Cookie: asc_session=; Max-Age=0`.
3. Interceptor de response do `mutator.ts`: `window.location.href = "/auth/login"`
   (hard reload; cache do React Query nasce vazio).

### Recuperação de senha

`/auth/forgot-password` continua chamando os endpoints do Core via proxy
(`postApiAuthForgotPassword`, `postApiAuthResendCode`,
`postApiAuthValidateResetCode`, `postApiAuthResetPassword`) — nenhum deles é
autenticado, o proxy repassa sem `Authorization` quando não há sessão. Sem
mudança de lógica, só o `baseURL`.

### Refresh (futuro — quando o Core expuser)

Proxy, ao ver `expiresAt` perto de vencer (ex.: < 2 min) e havendo
`refreshToken`: chama `POST ${API_URL}/api/auth/refresh`, re-sela o cookie com o
novo `TokenData`, e segue a request original transparentemente. Nenhuma mudança
no client. Colocar um `TODO(refresh)` no proxy apontando para este parágrafo.

## 10. Arquivos afetados

| Arquivo                                                 | Ação                                                                                                                                                       |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/session.server.ts`                             | **novo** — `readServerSession()`, `writeServerSession(data, maxAge)`, `clearServerSession()`, `isExpired()`. Wrapper fino sobre `useSession`. Server-only. |
| `src/server/auth.ts`                                    | **novo** — `loginFn`, `logoutFn`, `isAuthedFn` (`createServerFn`).                                                                                         |
| `src/lib/queries/profile.ts`                            | **novo** — `profileMeQueryOptions()` (`queryOptions` sobre `getApiProfileMe`, `staleTime`).                                                                |
| `src/hooks/useUser.ts` / `src/hooks/useCan.ts`          | **novo** — `useQuery(profileMeQueryOptions())` e gate de área.                                                                                             |
| `server/routes/api/core/[...].ts` (rota Nitro — ver §6) | **novo** — proxy catch-all.                                                                                                                                |
| `src/lib/auth.ts`                                       | **remover** (zustand).                                                                                                                                     |
| `src/global/Auth/**`                                    | **remover** (legado zodios, já quebrado).                                                                                                                  |
| `package.json`                                          | `- zustand`; `+ @tanstack/react-router-ssr-query`.                                                                                                         |
| `src/api/mutator.ts`                                    | `baseURL = "/api/core"`, `withCredentials`, remove interceptor de request; 401 → hard redirect.                                                            |
| `src/router.tsx`                                        | `routerWithQueryClient(...)` para desidratar/re-hidratar o cache.                                                                                          |
| `src/routes/__root.tsx`                                 | `beforeLoad` → `isAuthedFn` no contexto; `loader` prefetcha `profileMeQueryOptions`. Remove `<QueryClientProvider>` manual se o wrapper cobrir.            |
| `src/routes/_dashboard.tsx`                             | remove `ssr: false`; guard via `context.authed`.                                                                                                           |
| `src/routes/_dashboard/_internal.tsx`                   | guard via `ensureQueryData(profileMeQueryOptions())` + `getUserAreas`.                                                                                     |
| `src/routes/auth/login/index.tsx`                       | usa `loginFn`; `setQueryData` + `router.invalidate()`.                                                                                                     |
| `src/routes/auth/logout/index.tsx`                      | usa `logoutFn`; `queryClient.clear()` + hard redirect.                                                                                                     |
| `.env.exemple`                                          | documenta `API_URL` e `SESSION_SECRET`. ✅ feito                                                                                                           |
| `AGENTS.md`                                             | atualiza "Pendências conhecidas" (auth deixa de ser TODO).                                                                                                 |

## 11. Variáveis de ambiente

| Var              | Escopo  | Descrição                                                                                            |
| ---------------- | ------- | ---------------------------------------------------------------------------------------------------- |
| `API_URL`        | server  | Base do Core para o proxy e server fns. Já existe (`core-client.ts`).                                |
| `SESSION_SECRET` | server  | Segredo de selagem do cookie (≥ 32 chars). **Novo.** Gerar com `openssl rand -base64 48`.            |
| `VITE_API_URL`   | browser | Deixa de ser usado pelo runtime. Manter só para scripts de dev que batem direto no Core; ou remover. |

## 12. Migração — em fases

### Fase 0 — env (✅ feito)

`SESSION_SECRET` + `API_URL` no `.env` local e `.env.exemple`. Falta gerar
`SESSION_SECRET` nos ambientes de deploy.

### Fase 1 — server + client, com proxy ainda ausente ✅ feito

- ✅ `+ @tanstack/react-router-ssr-query`, `- zustand`
- ✅ `src/lib/session.server.ts`, `src/server/auth.ts`
  (`loginFn`/`logoutFn`/`isAuthedFn`/`fetchMeFn`)
- ✅ `src/lib/queries/profile.ts`, `src/hooks/useUser.ts` + `useCan.ts`
- ✅ `src/router.tsx` → `setupRouterSsrQueryIntegration({ wrapQueryClient: true })`
- ✅ `src/routes/__root.tsx` → `beforeLoad` (`isAuthedFn`) + `loader` (`fetchMeFn`
  → `setQueryData`); removido o `<QueryClientProvider>` manual
- ✅ `src/routes/_dashboard.tsx` (`context.authed`) / `_internal.tsx`
  (`ensureQueryData` + `getUserAreas`) — sem `ssr:false`
- ✅ `src/routes/auth/login` + `logout` → server fns
- ✅ removidos `src/lib/auth.ts` e `src/global/Auth/**`
- ✅ `npm run check` (tsc) — 0 erros novos (69 pré-existentes em
  `src/layouts`/`src/app`/`src/_legacy`)

Pendente de validação em runtime (`npm run dev`): fluxo de login real,
selagem do cookie, SSR do `fetchMeFn`, split server/client do bundle.

Ao fim da fase 1: guard e identidade funcionam; **chamadas autenticadas ao Core
ainda dão 401** (o `mutator.ts` continua em `VITE_API_URL` sem token). Login,
logout, redirect de guard, `/api/profile/me` no SSR (que roda server-side com o
cookie, direto em `API_URL`) — tudo isso já funciona.

### Fase 2 — proxy ✅ feito (pendente validação em runtime)

- ✅ `src/routes/api/core.ts` — rota de path fixo, `server.handlers` por método,
  `x-core-path` header, stream, checagem de Origin, 401→limpa cookie
- ✅ `src/api/mutator.ts` — adapter customizado → `fetch("/api/core")`;
  `VITE_API_URL` não é mais usado
- ✅ `npm run check` + `vite build` — split server/client correto, rota no
  manifest, bundle do client sem vazamento
- Pendente: `npm run dev` com Core real — smoke test do §13

### Fase 3 — limpeza (parcial)

- ✅ `src/layouts/AppShell/**` — shell novo (sidebar + topbar) sobre
  `useUser`/`useCan`, montado pelo layout `/_dashboard` para todas as rotas do
  dashboard. Links de rotas ainda não migradas são `<a>` (full-page) até virarem
  `<Link>`. Slots de tema/idioma com TODO (o usuário implementa).
- ✅ `src/layouts/SideBar/**` e `src/global/**` removidos.
- Pendente: `AGENTS.md` "Pendências conhecidas"; remover `VITE_API_URL`;
  migrar as rotas do dashboard (aí os `<a>` viram `<Link>` tipado).

**Rollback:** a fronteira é a fase 2. Enquanto o proxy não sobe, a fase 1 é
inócua para as telas de dados (que ainda nem foram migradas) — só troca a
mecânica de login/guard.

## 13. Testes / verificação manual

- [ ] Login com credencial válida → cookie `asc_session` httpOnly setado
      (DevTools → Application → Cookies), `document.cookie` **não** mostra o token.
- [ ] `GET /dashboard` sem cookie (curl) → 302 para `/auth/login` **no HTML do
      servidor** (não só no client).
- [ ] Chamada autenticada (ex.: lista de operações) via `/api/core/...` →
      funciona; request no Network não tem header `Authorization` visível
      (é adicionado no servidor).
- [ ] Expirar o cookie manualmente / esperar `expiresAt` → próxima chamada
      autenticada devolve 401, cookie é limpo, redireciona para login.
- [ ] Logout → cookie some, `/dashboard` volta a redirecionar.
- [ ] Usuário externo (`type !== 0`) → `/laboratory` redireciona para `/dashboard`.
- [ ] Upload de documento e download de romaneio via proxy (stream, sem
      corromper binário).
- [ ] Recuperação de senha (3 passos) segue funcionando pelo proxy sem sessão.
- [ ] SSR: `curl` de `/` (site público) não dispara `isAuthedFn`/prefetch de
      perfil e não quebra quando não há cookie.
- [ ] Navegação client-side entre telas do dashboard não refetcha
      `/api/profile/me` (cache re-hidratado + `staleTime`).

## 14. Riscos / questões em aberto

1. ~~**Sem refresh no Core.**~~ **Resolvido:** expiração é dura por decisão de
   produto — ao vencer, redireciona para `/auth/login` e o usuário refaz login.
   Se o Core um dia expuser `POST /api/auth/refresh`, ver §9 ("Refresh (futuro)")
   para o gancho no proxy; não é requisito.
2. **`getApiProfileMe` a cada boot frio** adiciona 1 request server→Core no SSR.
   O `staleTime` da query corta as navegações client-side; só o reload dispara.
   Aceitável; se pesar, confiar só no `expiresAt` do cookie e pular a
   revalidação (perde detecção de usuário desativado no meio da sessão).
3. **Tamanho do cookie.** JWT do Core + refresh selados devem caber em ~4 KB.
   Medir com um token real; se estourar, migrar para session id + store.
4. **Logout multi-aba.** Cookie httpOnly não dispara evento `storage`. Abas
   abertas só descobrem o logout no próximo 401. Opcional: `BroadcastChannel`
   disparado pelo `logoutFn` no client.
5. **CSRF no proxy.** `SameSite=Lax` + checagem de `Origin` em métodos mutantes
   deve bastar. O `createCsrfMiddleware` de `src/start.ts` cobre server fns
   (`loginFn` etc.), não o proxy — a checagem de `Origin` no proxy é o
   equivalente.
6. **Ambiente Azure SWA.** Confirmar que o build Nitro (`build:azure`) mantém as
   rotas server (proxy Nitro, server fns) como funções e que `Set-Cookie`
   atravessa o proxy do SWA. (Usuário valida após a implementação.)

## 15. Futuro — invalidação externa (websocket)

Quando dados do usuário mudam fora da sessão (foto, nome — editados por um
admin, por exemplo), um websocket empurra o evento e o handler fala **só com o
`queryClient`**, não com store nenhum:

```ts
socket.on("user:updated", (payload: UserDetailDTO) => {
  queryClient.setQueryData(profileMeQueryOptions().queryKey, payload);
  // ou, se o payload for parcial / não confiável:
  queryClient.invalidateQueries({ queryKey: profileMeQueryOptions().queryKey });
});
```

Todo `useUser()` / `useCan()` re-renderiza sozinho. O mesmo padrão serve para
qualquer entidade (`operation:updated`, `client:updated`, …) — o socket vira uma
fonte de invalidação do cache do React Query, e a camada de dados não muda.

Ponto de montagem: um provider/efeito no `__root` component que abre o socket
(autenticado pelo cookie, mesma origem) e registra os handlers. Fora do escopo
desta spec; só o encaixe fica registrado.
