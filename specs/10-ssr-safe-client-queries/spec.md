# SPEC-10 — Correção: hooks Orval client-only quebram no SSR (`crud-list-page` e futuras telas)

- **ID:** SPEC-10
- **Nome:** ssr-safe-client-queries
- **Status:** DRAFT
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/components/crud/**` (SPEC-02, já `IMPLEMENTED`), `src/routes/_dashboard/admin/access/index.tsx`
  (SPEC-03, já `IMPLEMENTED`), e por extensão toda SPEC 04–09 que ainda vai
  consumir o mesmo padrão.
- **Depende de:** SPEC-02 (`crud-list-page`), SPEC-03 (primeiro consumidor
  real, onde o bug foi reportado)

---

## 1. Objetivo

Corrigir o erro reportado pelo usuário em `/admin/access` e `/admin/roles`:

```
Error: mutator: chamada autenticada ao Core no SSR — use um server fn
(ver specs/auth-httponly-cookie-bff.md §7).
```

A tela só funciona depois de clicar "Try again" (segunda renderização, já
no client) — sintoma clássico de uma chamada que falha no SSR e funciona no
client. Sem correção, **toda SPEC 04–09** vai reproduzir o mesmo erro na
primeira SPEC que usar `crud-list-page` com um hook Orval de leitura direto
na rota (exatamente o padrão descrito no `AGENTS.md` como "Path 1").

## 2. Contexto — causa raiz (confirmada por inspeção de código)

`src/api/mutator.ts` tem uma trava deliberada:

```ts
const coreProxyAdapter: AxiosAdapter = async (config) => {
  if (typeof window === "undefined") {
    throw new Error("mutator: chamada autenticada ao Core no SSR — use um server fn ...");
  }
  ...
```

`src/router.tsx` ativa `setupRouterSsrQueryIntegration` (TanStack Start SSR
Query) — isso significa que **toda** `useQuery` (incluindo os hooks
`useGetApiXxx` gerados pelo Orval) que aparece na árvore de componentes
durante o SSR é executada (e desidratada) no servidor, não só no client.

O único jeito que já existe hoje no código pra evitar esse crash é **semear
o cache antes** via uma server function, e então usar `ensureQueryData`
(que consulta o cache primeiro e só chama o `queryFn` se não achar nada).
É exatamente o que `profileMeQueryOptions()` faz: `__root.loader` roda
`fetchMeFn()` (server fn, via `coreClient` — não passa pelo `mutator.ts`) e
semeia o cache; `_dashboard.tsx`/`_internal.tsx`/`admin/route.tsx` então
chamam `ensureQueryData(profileMeQueryOptions())` com segurança, porque o
cache já está quente.

`src/routes/_dashboard/admin/access/index.tsx` (SPEC-03) **não segue esse
padrão** — chama `useGetApiUser(...)` e `useGetApiUserRoles()` direto no
componente, sem seed nenhum. No SSR, isso executa o `queryFn` desses hooks
imediatamente, cai no `mutator.ts`, e explode.

**Por que `/admin/roles` também mostra o erro**, mesmo sem chamar hook
nenhum (`roles/index.tsx` só usa `useT()` + array estático
`ADMIN_ROLES`): o code-splitting automático do `@tanstack/router-plugin`
(via Vite/Rollup) gera um chunk por rota, mas rotas pequenas/vizinhas do
mesmo grupo (`admin/access`, `admin/roles`) podem acabar fisicamente no
mesmo arquivo de chunk de saída — o stack trace do usuário (`roles:9:18324`)
aponta pra esse chunk físico, que contém o código de `access/index.tsx`
(o culpado real) mesmo quando o usuário está navegando por `/admin/roles`.
Não há indício de bug próprio em `roles/index.tsx` — é o mesmo erro do
`access`, só que atribuído ao nome do chunk onde o bundler colocou o código.
**Não confirmado 100% sem rodar o build** — ver §12 R1.

## 3. Escopo

1. Corrigir `src/routes/_dashboard/admin/access/index.tsx` (SPEC-03) pra
   não quebrar no SSR.
2. Corrigir/documentar o padrão em `src/components/crud/crud-list-page.tsx`
   (SPEC-02) de forma que **todo consumidor futuro** (SPEC-04 a SPEC-09,
   que vão repetir exatamente esse padrão — lista real + hook Orval direto
   na rota) não precise redescobrir o mesmo bug.
3. Validar em dev (`bun run build` + servidor, ou `bun run dev` com SSR
   ativo) que `/admin/access` e `/admin/roles` carregam sem erro na
   primeira renderização (sem precisar de "Try again").

## 4. Fora do escopo

- Mudar a arquitetura de autenticação/BFF (`session.server.ts`,
  `mutator.ts`'s guard em si) — o guard está correto e é intencional
  (impede chamada autenticada vazando pro server sem passar pelo cookie
  selado). Não mexer nele.
- Qualquer SPEC de área (04–09) — esta SPEC só corrige o padrão
  compartilhado; a aplicação do padrão corrigido em cada área é
  responsabilidade de cada SPEC quando for implementada (mas já vai nascer
  correta se a correção for na base compartilhada).

## 5. Requisitos funcionais

- **RF1** — `/admin/access` carrega sem erro na primeira visita (SSR),
  sem precisar de "Try again".
- **RF2** — `/admin/roles` idem.
- **RF3** — O padrão corrigido é reutilizável: uma futura SPEC (04+) que
  usa `crud-list-page` com um hook `useGetApiXxx` não deveria conseguir
  reproduzir esse bug se seguir a documentação/exemplo atualizado.

## 6. Requisitos não funcionais

- RNF1 — `bun run check` + `lint` passam.
- RNF2 — Não reintroduzir SSR de dado sensível fora de server fn (não
  enfraquecer o guard do `mutator.ts`).

## 7. Decisões pendentes — `[NEEDS_DECISION]`

Existem pelo menos 3 formas de corrigir, com trade-offs diferentes. Preciso
que o usuário escolha antes de eu implementar:

**Opção A — `ssr: false` na rota.**
TanStack Router/Start suporta desabilitar SSR por rota
(`export const Route = createFileRoute(...)({ ssr: false, ... })`). A rota
não roda no servidor — primeiro paint é client-only (loading state até
hidratar). Mais simples, 1 linha por rota, combina com o que o `AGENTS.md`
já chama essa leitura de "client-side" (Path 1). Custo: sem HTML útil no
"view-source" dessas telas (SEO irrelevante aqui, área autenticada).

**Opção B — `enabled: typeof window !== "undefined"` em cada hook.**
Cada chamada de `useGetApiXxx` no componente ganha
`{ query: { enabled: typeof window !== "undefined" } }`. Mantém SSR da
casca da página (loading state dentro da tela, não a página toda). Custo:
precisa ser repetido em **todo** hook de leitura de toda SPEC futura — é
fácil esquecer (foi exatamente o que aconteceu aqui). Mitigação possível:
um helper `useClientOnlyQuery`/wrapper que padroniza isso.

**Opção C — mover a responsabilidade pra dentro de `crud-list-page`.**
`CrudListPage` já centraliza toda tela de lista — mas hoje ele recebe
`items`/`isLoading` como props (quem busca o dado é a rota, não o
componente). Mudar isso pra `CrudListPage` aceitar a *queryOptions* em vez
dos dados prontos, e ele mesmo decidir como/quando buscar (com o guard de
SSR embutido), seria a correção mais à prova de erro — ninguém mais
precisaria lembrar de nada. Custo: muda o contrato de `CrudListPage`
(props), o que é uma alteração retroativa numa SPEC já `IMPLEMENTED`
(SPEC-02) — precisa reabrir/emendar aquela spec.

**Recomendação do agente:** Opção A pra `/admin/access` e `/admin/roles`
agora (rápido, baixo risco, desbloqueia o usuário), **e** Opção C como
correção de fundo na SPEC-02 antes da SPEC-04 nascer (pra nenhuma área
futura repetir o bug) — ou seja, as duas combinadas, não uma ou outra.
Mas isso é uma escolha de arquitetura compartilhada — não decido sozinho.

**Aguardando decisão do usuário sobre qual(is) opção(ões) seguir.**

## 8. Contrato de rota

Sem mudança de path — só de comportamento SSR das rotas já existentes
(`/admin/access`, `/admin/roles`) e, se Opção C for escolhida, do contrato
interno de `CrudListPage`.

## 9. Camada de dados

Sem mudança de endpoint/contrato do Core. Muda só *como* o client chama os
hooks já existentes (`useGetApiUser`, `useGetApiUserRoles`).

## 10. Arquivos esperados (depende da opção escolhida)

| Arquivo | Ação (Opção A) | Ação (Opção C, adicional) |
| --- | --- | --- |
| `src/routes/_dashboard/admin/access/index.tsx` | editar (`ssr: false`) | editar (usar novo contrato de `CrudListPage`) |
| `src/routes/_dashboard/admin/roles/index.tsx` | editar (`ssr: false`, se confirmado que precisa — ver R1) | — |
| `src/components/crud/crud-list-page.tsx` | — | editar (aceita `queryOptions`, embute guard SSR) |
| `specs/02-app-shell-navigation/spec.md` | — | editar (nota de emenda pós-`IMPLEMENTED`) |

## 11. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | `/admin/access` carrega sem erro no primeiro load (SSR), sem "Try again" |
| CA2 | `/admin/roles` idem |
| CA3 | `bun run check` + `lint` passam |
| CA4 | Se Opção C: uma leitura rápida do `crud-list-page.tsx` documenta claramente como uma SPEC futura (04+) deve usá-lo sem repetir o bug |

## 12. Riscos

- **R1** — A explicação de "por que `/admin/roles` também falha" (chunk
  compartilhado) é a hipótese mais provável por inspeção de código, mas
  **não foi confirmada rodando o build** (evitei subir `bun run dev` de
  novo nesta sessão por causa do efeito colateral anterior com
  `predev`/`check:api` batendo no Core de dev). Se depois da correção
  `/admin/roles` aind a falhar isoladamente, precisa investigação
  separada.
- **R2** — Opção C (mudar `CrudListPage`) reabre uma SPEC já
  `IMPLEMENTED` (SPEC-02) — precisa ficar registrado como emenda lá
  também, não só aqui.

---

**Próximo passo:** decidir §7 (Opção A, B, C, ou combinação) e então
`APROVAR SPEC-10`.
