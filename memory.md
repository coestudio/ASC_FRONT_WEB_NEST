# ASC Web - Memory File (2026-09-09)

## Ultimo estado
- **Build**: passando (`npm run build` OK)
- **Branch**: main (tudo untracked em `web/`, nao commitado ainda)

## O que foi feito

### Tema (light/dark)
- `light` (default) e `dark` apenas — sem "system"
- Primary verde `#23ab79` (light) / `#61ce70` (dark)
- Theme toggle no sidebar, cookie `theme` salvo
- Server lê cookie e seta `data-bs-theme` no `<html>` direto

### Layout (AppShell)
- Sidebar com seções: Admin, Administrativo, Operacional, Laboratorio, Client
- Topbar com titulo da pagina + language switcher
- Nav config em `src/components/shell/nav-config.ts`

### Auth & API
- NextAuth v5 (JWT strategy) com Credentials provider
- `src/auth.ts`: login contra Core API, retorna accessToken
- `src/api/mutator.ts`: axios interceptor com toast notifications
  - Request: busca session, anexa Bearer token, checa expiração
  - Response: 401 → signOut + redirect login, 4xx → toast.warning, 5xx → toast.error
- Token expiry check: `TokenExpiryChecker` com setInterval 30s no AppShell

### Toast (react-toastify)
- `react-toastify` instalado, CSS em `globals/index.css`
- Toasts via URL params: `?toast=welcome|logged-out|expired|reset-success`
- Providers le no mount e mostra toast + limpa param

### i18n
- 3 idiomas: pt-BR, en, zh
- Dictionaries em `src/i18n/dictionaries/`
- Seção `access` adicionada para a pagina de Acesso

### Paginas implementadas
- **Login** (`/[lang]/login`) — form com toast no erro
- **Forgot Password** (`/[lang]/forgot-password`) — multi-step com toast
- **Admin > Acesso** (`/[lang]/(app)/admin/acesso`) — CRUD de usuarios com modal React-Bootstrap
- **Home** (`/[lang]`) — welcome page simples

### UI Components (reutilizaveis)
- `src/components/ui/page-header.tsx`
- `src/components/ui/search-toolbar.tsx`
- `src/components/ui/data-table.tsx`
- `src/components/ui/empty-state.tsx`
- `src/components/ui/form-modal.tsx`
- `src/components/ui/form-fields.tsx`

### Middleware
- `src/proxy.ts`: proteção de rotas, redirect pra login com `?toast=expired`

## O que falta (proximo passo)

### REMOVER SEÇÃO CLIENT
- **Arquivos pra deletar**: `src/app/[lang]/(app)/client/` (page.tsx + subpastas)
- **Nav config**: remover bloco `client` de `src/components/shell/nav-config.ts`
- **Permissions**: remover `"client"` do type `AreaId` em `src/lib/permissions.ts` e ajustar `getUserAreas()`
- **Dictionaries**: remover chaves `client*` dos 3 dicts (pt-BR, en, zh)
- **SECTION_ICONS**: remover entrada `client` do objeto

### HOME DEFAULT (como no Portal)
- Portal mostra area Home baseada no tipo de usuario
- Criar pagina home dentro de `(app)` que mostra area baseada nas permissoes
- ou redirecionar pra primeira area disponivel do usuario

### PENDENCIAS GERAIS
- Paginas de listagem e CRUD para outras areas (Administrativo, Operacional, Laboratorio)
- Testes automatizados
- Deploy config

## Referencia Portal
- Codigo fonte: `/Users/thiagomorgado/Desktop/ASC/warren/Portal/`
- Auth store: `src/Global/Auth/use.ts` (Zustand + isExpired)
- Route guard: `src/Routes/RequireAuth.tsx` (setInterval 30s)
- API handler: `src/Api/handlerResponse.ts`

## Tech Stack
- TanStack Start (TanStack Router + Query) sobre Vite, SSR via Nitro
- React-Bootstrap + Bootstrap 5.3
- TanStack Query
- Orval (API hooks gerados)
- Auth: **pendente** (next-auth removido na migração; ver TODO em src/api/mutator.ts)
- react-toastify
- TypeScript

> NOTA: este arquivo tem trechos escritos quando o projeto ainda era Next.js
> (App Router, Server Actions, `src/app`, NextAuth, `src/proxy.ts`). Essas
> partes são histórico — o alvo atual é TanStack Start e `src/routes`.
