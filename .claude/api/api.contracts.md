# Contrato Front ↔ Core

Como o `NewPortal` consome a API do `warren/Core`. Este arquivo descreve a
fronteira; a fonte de verdade dos tipos é o client gerado em
`src/api/generated/**`.

## Origem do contrato

- Documento: OpenAPI 3.1 servido em runtime pelo Core em
  `{API_URL}/api/openapi/v1.json` (`AddCoreOpenApi()`).
- `API_URL` vem do `.env` (server-only). O Core precisa estar no ar para
  `just map`.
- O Core **não** define `operationId` — nomes gerados saem de verbo+rota
  (`getApiProduct`, `usePostApiProduct`, `getApiProfileMe`).

## Geração (`just map`)

`npx orval` + `npx tsx scripts/staticSnapshots.ts` + `npx tsc --noEmit`.
Saídas (todas 100% geradas, nunca editar):

| Pasta | Conteúdo |
| --- | --- |
| `src/api/generated/endpoints/**` | hooks TanStack Query (client `react-query`, transporte `axios` via `src/api/mutator.ts`) |
| `src/api/generated/model/**` | tipos TS de DTO / ViewModel |
| `src/api/generated/zod/**` | schemas `zod` (regras min/max dos DTOs) |
| `src/api/generated/static/**` | snapshots `x-snapshot` de rotas de enum estáticas do Core (`[StaticEndpoint]`) |
| `src/api/snapshot.json` | marcador de hash do contrato (checado por `check:api` nos hooks `pre*`) |

`npm run check:api` (roda em `predev`/`prebuild`/`prestart`) só **avisa** se o
hash do contrato no ar divergiu do último `just map` — nunca trava.

## Transporte e autenticação

```
hook Orval (browser)
  └─ src/api/mutator.ts  →  fetch("/api/core", { headers: { x-core-path } })
       └─ src/routes/api/core.ts  (proxy BFF, server)
            ├─ lê asc_session (cookie httpOnly selado)
            ├─ anexa Authorization: Bearer <accessToken>
            ├─ CSRF: exige mesma origem em POST/PUT/PATCH/DELETE
            └─ fetch(`${API_URL}${x-core-path}`)  →  Core
```

- O `accessToken` (JWT do Core) **nunca** chega ao JS do browser — fica selado
  no cookie e só o proxy o lê.
- 401 do Core → o proxy devolve `Set-Cookie` que expira `asc_session`; o
  interceptor do `mutator` redireciona para `/auth/login`.
- Erros: o interceptor traduz `ProblemDetails` / mensagens EF Core para PT-BR,
  `toast.warning` em 4xx e `toast.error` em 5xx.

## Chamadas fora do proxy (server → Core direto)

Via `src/lib/core-client.ts` (axios com `API_URL`, server-only), dentro de
server functions (`createServerFn`):

| Server fn | Endpoint Core | Uso |
| --- | --- | --- |
| `loginFn` | `POST /api/auth/login` | login; sela o cookie, devolve só `{ user }` |
| `fetchMeFn` | `GET /api/profile/me` | seed de identidade no SSR |
| `logoutFn` | — | só limpa o cookie (Core não tem logout) |

O `mutator` faz `throw` no SSR de propósito: chamada autenticada ao Core no
servidor **tem** que passar por server fn.

## Padrão de cache (React Query)

- `queryKey` = path do Core (ex.: `["/api/profile/me"]`), a mesma do hook
  gerado — cache compartilhado entre hook e seed do SSR.
- Query options isoladas em `src/lib/queries/<recurso>.ts`.
- SSR semeia via `queryClient.setQueryData(...)` no `loader`/`beforeLoad`;
  o client re-hidrata (`@tanstack/react-router-ssr-query`).

## Validação de input

Zod é **gerado, nunca escrito**. `src/lib/validation/*.ts` importa de
`src/api/generated/zod/**` e só remapeia o shape (nomes de campo). Proibido
criar/editar schema Zod à mão — regra que precisa mudar muda no DTO do Core e
volta pelo `just map`.

## Runtime e deploy

- Runtime padrão: **bun** (`bun run …`); npm é fallback.
- Deploy: **Azure Static Web Apps** — `bun run build:azure` aplica
  `scripts/patch-nitro-azure-swa.mjs` sobre o preset `azure-swa` do Nitro.
  Server routes (`src/routes/api/**`, incl. este proxy) rodam como Azure
  Functions: sem splat, path fixo.
