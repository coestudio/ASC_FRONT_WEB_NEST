# SPEC-10 — Correção: hooks Orval client-only quebram no SSR (`crud-list-page` e futuras telas)

- **ID:** SPEC-10
- **Nome:** ssr-safe-client-queries
- **Status:** IN_PROGRESS
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

## 7. Decisão (resolvida — confirmada pelo usuário)

**Opção C escolhida**, isolada (sem combinar com A): a correção acontece
na base compartilhada — `CrudListPage` (SPEC-02) passa a aceitar
*queryOptions* em vez de receber `items`/`isLoading` prontos da rota, e
ele mesmo decide como/quando buscar o dado, com o guard de SSR embutido.
Isso emenda a SPEC-02 (já `IMPLEMENTED`) e evita que qualquer consumidor
futuro (SPEC-04 a SPEC-09) precise lembrar de tratar SSR manualmente —
ninguém mais escreve `useGetApiXxx` direto na rota sem proteção.

`admin/access/index.tsx` (SPEC-03) é adaptado pro novo contrato como parte
desta SPEC, já que é o consumidor existente que precisa parar de quebrar.

Abaixo, as 3 opções levantadas originalmente ficam registradas como
histórico da decisão (não descartar o texto — mostra por que A e B foram
preteridas):

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

**Decisão final:** Opção C, sozinha — sem `ssr: false` por rota (Opção A)
como paliativo separado. `/admin/roles` (se realmente afetado, ver R1)
também passa a depender de `admin/access/index.tsx` estar corrigido, já
que a hipótese é o mesmo bug vazando por chunk compartilhado — não precisa
de tratamento próprio a menos que R1 se confirme falso na validação.

## 8. Contrato de rota

Sem mudança de path — só de comportamento SSR das rotas já existentes
(`/admin/access`, `/admin/roles`) e, se Opção C for escolhida, do contrato
interno de `CrudListPage`.

## 9. Camada de dados

Sem mudança de endpoint/contrato do Core. Muda só *como* o client chama os
hooks já existentes (`useGetApiUser`, `useGetApiUserRoles`).

## 10. Arquivos esperados

| Arquivo | Ação |
| --- | --- |
| `src/components/crud/crud-list-page.tsx` | editar — aceita *queryOptions* (ou uma prop equivalente que encapsule `queryKey`+`queryFn`) em vez de `items`/`isLoading` prontos; embute o guard de SSR (ex.: `enabled`/checagem client-only) internamente, então nenhum consumidor precisa lembrar disso |
| `src/routes/_dashboard/admin/access/index.tsx` | editar — adaptado pro novo contrato de `CrudListPage` |
| `src/routes/_dashboard/admin/roles/index.tsx` | editar, só se a validação (R1) mostrar que precisa de correção própria — expectativa é que não precise |
| `specs/02-app-shell-navigation/spec.md` | editar — nota de emenda pós-`IMPLEMENTED` registrando essa mudança de contrato, com referência a esta SPEC |

## 11. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | `/admin/access` carrega sem erro no primeiro load (SSR), sem "Try again" |
| CA2 | `/admin/roles` idem |
| CA3 | `bun run check` + `lint` passam |
| CA4 | Uma leitura rápida do `crud-list-page.tsx` documenta claramente como uma SPEC futura (04+) deve usá-lo sem repetir o bug — nenhum `useGetApiXxx` cru na rota |
| CA5 | `specs/02-app-shell-navigation/spec.md` tem nota de emenda referenciando a SPEC-10 |

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

## 13. Implementation Notes

Branch: `spec-10-ssr-safe-client-queries` (a partir de `spec-03-admin-access`
— único lugar que já tinha `admin/access/index.tsx`).

**Achado no meio da implementação:** antes de eu começar a Opção C, o
usuário já tinha corrigido o caso concreto (`admin/access`) manualmente
num commit `Worktree SPEC-03` (`40f3e8b`, na branch `spec-03-admin-access`),
usando um padrão **diferente**: seed do cache via `loader` da rota +
server function (`src/lib/queries/user.ts` +
`src/lib/user-fns.ts:fetchUserListFn/fetchUserRolesFn`), o mesmo desenho já
usado por `profileMeQueryOptions`/`fetchMeFn` no `__root.tsx`. Esse fix
**não foi descartado** — é complementar à Opção C, não concorrente:

- O `loader` continua semeando o cache (primeira página, sem busca) —
  evita loading flash na primeira renderização.
- `CrudListPage` (Opção C) passou a buscar via `queryOptions` internamente
  com `useSsrSafeQuery` (guard de SSR embutido) — se o cache já estiver
  quente (seedado pelo loader), usa ele sem refetch; se não estiver (troca
  de página/busca, ou uma rota futura sem loader próprio), busca com
  segurança, sem quebrar no servidor.
- O lookup de roles pro multi-select do form (`userRolesQueryOptions()`),
  usado fora do `CrudListPage`, também passou a usar `useSsrSafeQuery`
  diretamente (não estava no texto original da SPEC-10, que falava só do
  `CrudListPage` — extensão necessária pro mesmo bug não continuar por
  esse hook).

**Arquivos alterados/criados:**
- `src/lib/queries/use-ssr-safe-query.ts` (novo) — wrapper de `useQuery`
  com o guard de SSR (`enabled: typeof window !== "undefined"`).
- `src/components/crud/crud-list-page.tsx` (editado) — contrato novo
  (`queryOptions` em vez de `items`/`isLoading`/`isError`/`total`), busca
  o próprio dado via `useSsrSafeQuery`.
- `src/routes/_dashboard/admin/access/index.tsx` (editado) — adaptado pro
  novo contrato; `useSsrSafeQuery(userRolesQueryOptions())` no lugar do
  `useQuery` cru pro lookup de roles.
- `specs/02-app-shell-navigation/spec.md` (editado) — nota de emenda
  registrando a mudança de contrato do `CrudListPage`.

**Comandos executados:**
- `bun run check` → **VERIFIED**, 0 erros.
- `bun run lint` → **VERIFIED**, mesmo baseline de antes (65 problems, 3
  errors pré-existentes em `session.server.ts`) — zero novo.
- Validação em dev: subi `bun run dev` (porta 8081, a 8080 já estava em
  uso — provavelmente a sessão do próprio usuário) só o tempo de checar
  que não há crash no boot/log do servidor, depois encerrei o processo.
  `curl` sem sessão em `/admin/access` recebeu `307` (redirect pro login,
  guard funcionando) sem nenhum erro de `mutator` no log do servidor.
  **NOT VERIFIED end-to-end autenticado** — precisa do usuário confirmar
  no navegador (sessão real) que `/admin/access` e `/admin/roles` carregam
  sem erro no primeiro load, sem precisar de "Try again" (CA1/CA2).

**Critérios de aceitação:**
| # | Critério | Status |
| --- | --- | --- |
| CA1 | `/admin/access` sem erro no primeiro load | Implementado; NOT VERIFIED autenticado nesta sessão — pedir confirmação do usuário |
| CA2 | `/admin/roles` idem | Implementado (dependia da mesma causa raiz); NOT VERIFIED autenticado |
| CA3 | `bun run check` + `lint` passam | PASS |
| CA4 | `crud-list-page.tsx` documenta o padrão pra SPEC-04+ | PASS — JSDoc do componente + emenda na SPEC-02 |
| CA5 | SPEC-02 com nota de emenda | PASS |

Status mantido `IN_PROGRESS` até CA1/CA2 serem confirmados no navegador
pelo usuário (sessão autenticada real) — só então viro `IMPLEMENTED`.

---

**Próximo passo:** usuário confirmar em `http://localhost:8080/admin/access`
e `/admin/roles` (sessão logada) que carregam sem erro, sem "Try again".
