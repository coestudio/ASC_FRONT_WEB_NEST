---
applyTo: 'src/lib/**'
description: 'Use ao mexer em utilidades compartilhadas: sessão, server functions de auth, permissões e preferências de UI. Fixa a fronteira server/client e o papel de cada peça.'
---

# lib Instructions

## Fronteira server / client

- `*.server.ts` = **server-only**. Nunca importar de componente, hook ou
  qualquer módulo que rode no browser. Sinaliza que lê `process.env`,
  cookie de sessão ou chama o Core direto.
- `createServerFn(...)` é o único jeito seguro de expor lógica server ao
  client — ele serializa a fronteira. Ver `auth-fns.ts`.
- Nunca ler `process.env` fora de código server. Variável de browser é
  `import.meta.env.VITE_*`.

## Sessão (`session.server.ts`)

- Cookie `asc_session`, httpOnly, selado (AES+SHA-256 via `useSession`).
  Conteúdo (`accessToken`/`refreshToken`/`expiresAt`/`userId`) é opaco pro
  browser.
- `readServerSession()` devolve `null` se ausente **ou expirado**
  (`EXPIRY_SKEW_MS` de folga). `writeServerSession` / `clearServerSession`
  para o resto.
- `SESSION_SECRET` (≥32 chars) obrigatório — o módulo `throw` no boot sem ele.

## Auth (`auth-fns.ts`, `core-client.ts`)

- `loginFn` → chama `/api/auth/login` no Core via `coreClient` (server→server),
  sela o cookie, devolve **só** `{ user }` (token nunca volta pro client).
- `logoutFn` → só limpa o cookie (Core não tem endpoint de logout).
- `isAuthedFn` → checagem barata do cookie pro guard de rota (não chama Core).
- `fetchMeFn` → identidade fresca pro seed do SSR; `null` em falha.
- `coreClient` é a instância axios única server→Core (`API_URL`, timeout).
  Não instanciar `axios.create()` avulso em cada server fn.

## Permissões (`permissions.ts`)

- `getUserAreas(user)` decide **só o que aparece na UI** (sidebar, botão,
  coluna). **Não é guard de rota** nem segurança — isso é o `beforeLoad` +
  o Core.
- Regra atual: `type === 0` (Internal) vê `administrativo`/`operacional`/
  `laboratorio`, e `admin` se `isAdmin`. `type !== 0` vê só `client`. Sem
  usuário: nada. Se mudar a regra, atualizar o comentário-decisão no topo do
  arquivo.

## Query options (`queries/**`)

Ver `api-data.instructions.md` — queryKey = path do Core, `staleTime` alto,
mesma key do hook Orval.

## Preferências de UI (`ui-prefs.tsx`)

- Provider único de **tema + idioma**, montado no `__root`. Resolve no
  servidor (cookie / `Accept-Language`), mantém no client.
- Hooks públicos: `useT`, `useLocale`, `useSetLocale`, `useThemeMode`,
  `useResolvedTheme`, `useSetThemeMode`. Reexportados por `@/i18n`.
- Não criar um segundo contexto/provider de tema ou i18n.
