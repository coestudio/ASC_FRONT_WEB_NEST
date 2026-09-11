---
applyTo: 'src/routes/**'
description: 'Use ao criar ou editar rotas do TanStack Router no NewPortal. Fixa o roteamento file-based, os grupos pathless, o padrão de guard em beforeLoad e o seed de dados no loader.'
---

# Routes Instructions

## Roteamento file-based

- Todo `.tsx` em `src/routes/**` é uma rota. Nomes seguem
  [src/routes/README.md](../../src/routes/README.md): `index.tsx` → `/`,
  `$id.tsx` → segmento dinâmico (`$` puro, sem chaves), `{-$x}.tsx` →
  segmento opcional, `$.tsx` → splat (lido via `_splat`), `_layout.tsx` →
  layout route.
- `src/routeTree.gen.ts` é gerado pelo plugin do router. **Nunca editar à
  mão** e nunca importar dele diretamente em código de aplicação.
- Nome de arquivo de rota em inglês; comentário em PT-BR. O nome do arquivo
  também é o segmento de URL — `sobre.tsx` viraria `/sobre`; use `about.tsx`.
- Não criar `src/pages/`, `app/layout.tsx`, `src/routes/_app/` — são
  convenções de Next/Remix. O único root é `src/routes/__root.tsx`.
- Toda rota exporta `Route = createFileRoute("<id>")({ ... })`. O `<id>`
  precisa bater com o caminho do arquivo (incl. a barra final em `index`).

## Grupos existentes (não inventar novos sem SPEC)

| Prefixo | Papel | Guard |
| --- | --- | --- |
| `__root` | shell: head, providers, `<Outlet/>`, toasts | `isAuthedFn` (cookie) → `context.authed` |
| `_dashboard` | área autenticada, aplica `AppShell` | `context.authed` senão `redirect` p/ `/auth/login` |
| `_dashboard/_internal` | áreas internas (lab/adm/op) | `getUserAreas` via `ensureQueryData` |
| `_site` | site público | nenhum |
| `_system` | 404 / erro / manutenção | nenhum |
| `auth` | login / logout / forgot-password | layout próprio em `auth/route.tsx` |
| `api/*` | server handlers (proxy BFF) | ver `api-data.instructions.md` |

Prefixo `_` = pathless (não entra na URL). Uma página de área interna nova
vai em `src/routes/_dashboard/_internal/<area>/index.tsx`.

## Guard de rota

- O guard vive no `beforeLoad`, **nunca** no componente.
- Checagem barata primeiro: `context.authed` (booleano do cookie, resolvido
  uma vez no `__root`). Só quando precisa do usuário: 
  `const user = await context.queryClient.ensureQueryData(profileMeQueryOptions())`
  — bate no cache re-hidratado do SSR, sem round-trip extra.
- Negar acesso = `throw redirect({ to: "...", search: { redirect: location.href } })`.
- `beforeLoad` roda no SSR e na navegação client — não usar `window` sem
  guarda `typeof window`.

## Loader e dados

- Dado que a página precisa no primeiro paint: semear no `loader` com
  `context.queryClient.ensureQueryData(xxxQueryOptions())` e ler no
  componente com o hook (`useUser`, `useQuery(xxxQueryOptions())`).
- Query options isoladas ficam em `src/lib/queries/` com a **mesma queryKey
  do hook Orval**. Ver `api-data.instructions.md`.
- Chamada autenticada ao Core no SSR **só** via server function
  (`createServerFn`), nunca pelo hook client nem pelo `mutator` (ele
  `throw` no SSR de propósito).

## Compatibilidade Azure SWA

- O alvo de deploy é Azure Static Web Apps (`build:azure` +
  `scripts/patch-nitro-azure-swa.mjs` + `staticwebapp.config.json`).
- Server routes (`src/routes/api/**`) rodam como Azure Functions. Só use o
  que o preset `azure-swa` do Nitro suporta — ex.: **splat em server route
  não funciona nesta versão**, por isso o proxy (`api/core.ts`) é de path
  fixo. Ao criar server handler novo, seguir esse formato.
- Regras de rewrite/fallback do SWA vivem em `staticwebapp.config.json` —
  mudança de roteamento server precisa ser refletida lá.

## `validateSearch`, `head`, params

- Query string tipada: `validateSearch: (s) => ({ ... })` retornando o shape
  estreito; ler com `Route.useSearch()`.
- Título/meta da página: `head: () => ({ meta: [{ title: "X — ASC" }] })`.
  `robots: noindex` já está no `__root` (portal interno).

## Componentes de rota

- React-Bootstrap para UI (`<Form.*>`, `<Button>`, `<Card>`, `<Spinner>`).
- Classes utilitárias Bootstrap para layout (`d-flex`, `text-body-secondary`,
  `bg-body`...). Nada de Tailwind.
- Texto visível ao usuário passa por `useT()` quando a tela é internacionalizada
  (as telas internas ainda estão em pt-BR fixo — seguir o que a área já faz).
