# NewPortal — frontend ASC

Frontend do portal ASC. **Stack: TanStack Start** (TanStack Router + TanStack
Query) sobre **Vite**, build server via **Nitro**. Não é Next.js — o projeto foi
migrado; qualquer resquício de Next.js (`next/*`, `next-auth`, `NEXT_PUBLIC_*`,
`src/app/**`) é legado a ser removido, não seguido.

## Estrutura

- `src/routes/**` — rotas file-based do TanStack Router. Convenções em
  [src/routes/README.md](src/routes/README.md). `src/routeTree.gen.ts` é gerado —
  não editar à mão.
- `src/routes/__root.tsx` — shell da aplicação (único root layout).
- `src/server.ts` / `src/start.ts` — entrada SSR e middlewares do TanStack Start.
- `src/api/generated/**` — client de API 100% gerado pelo Orval a partir do
  OpenAPI do Core (`just map`). Nunca editar à mão. Transporte em
  `src/api/mutator.ts`.
- `src/lib/**`, `src/components/**`, `src/layouts/**`, `src/styles/**` — código
  compartilhado.
- `src/app/**` — **legado Next.js App Router, fora do build** (excluído em
  `tsconfig`/`eslint`). Não importar; migrar o que ainda for necessário para
  `src/routes/**` e depois apagar.

## Env

- Variáveis expostas ao browser: prefixo `VITE_` (`import.meta.env.VITE_*`).
- Server-only (server functions, Nitro): `process.env.*` (ex.: `API_URL`).
- `.env` não é versionado; `.env.exemple` é o template.

## Pendências conhecidas

- Camada de auth (login/sessão) ainda não implementada no TanStack Start — ver
  `TODO` em `src/api/mutator.ts` e `src/lib/validation/login.ts`.
- Rotas de dashboard (administrativo/operacional/laboratório/cliente) e i18n
  client-side ainda não migradas.
- `specs/**` descrevem o desenho antigo (Next.js) e estão desatualizados.

## Comandos

`npm run dev` · `npm run build` · `npm run check` (tsc) · `npm run lint`
