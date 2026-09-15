# SPEC-19 — `/dashboard` como redirect pra home da primeira área

- **ID:** SPEC-19
- **Nome:** dashboard-home-redirect
- **Status:** IMPLEMENTED
- **Autor:** portal-dev-agent (rascunho), aprovado pelo usuário
  (`APROVAR SPEC-19` recebido na mesma mensagem que pediu o rascunho +
  implementação)
- **Área:** `src/lib/permissions.ts`, `src/routes/_dashboard/dashboard/index.tsx`
- **Depende de:** SPEC-02 (guard de área, padrão `beforeLoad` +
  `fetchMeFn`/`profileMeQueryOptions`), SPEC-03/07/08/09/17 (rotas de home
  reais de cada área, todas `IMPLEMENTED`)
- **Branch:** segue de `spec-18-crud-componentization` (branch atual do
  workspace no momento do pedido) — ver nota em "Branch" abaixo.

---

## 1. Objetivo

Hoje `/dashboard` é um placeholder estático ("Bem-vindo ao portal interno.").
No legado (`warren/Portal`), não existe dashboard genérico: `HomeRedirect`
manda o usuário direto pra home da primeira área que ele tem permissão
(`getUserAreas(user)[0]`, via `AREA_HOME`). Esta SPEC replica esse
comportamento no NewPortal, mantendo `/dashboard` como destino de guard
(login, `_site/`, guards de área) mas fazendo dele um redirect, não uma
página.

## 2. Contexto

`/dashboard` é referenciado em 5 lugares:

- `src/layouts/AppShell/index.tsx` — link do logo.
- `src/routes/auth/login/index.tsx` — destino pós-login.
- `src/routes/_dashboard/client/route.tsx` — guard: sem área `client` →
  `/dashboard`.
- `src/routes/_dashboard/admin/route.tsx` — guard: sem área `admin` →
  `/dashboard`.
- `src/routes/_dashboard/_internal.tsx` — guard: sem área interna →
  `/dashboard`.
- `src/routes/_site/index.tsx` — redirect de `/` → `/dashboard`.

Nenhum desses precisa mudar de destino — continuam apontando pra
`/dashboard`; é `/dashboard` que passa a decidir pra onde ir a partir daí.

### Mapeamento de áreas confirmado

`src/lib/permissions.ts` (`getUserAreas`) hoje cobre exatamente as mesmas
áreas do legado, com uma simplificação já existente e fora de escopo aqui:
o legado tem `operacoes` e `operacional` como IDs separados (mas
`AREA_HOME` mapeia os dois pra rotas distintas, `/operacoes` e
`/operacional` — investigação adicional no legado mostra que só
`operacional` é de fato alcançável por `getUserAreas`, já que a função só
devolve `admin | administrativo | operacoes | operacional | laboratorio`
pra usuário Internal, todos ao mesmo tempo); no nosso, um único `AreaId`
`"operacional"` cobre a área equivalente (`/operational`, SPEC-08,
`IMPLEMENTED`) — não há `"operacoes"` no nosso domínio porque não existe
rota nossa equivalente a um `/operacoes` distinto de `/operacional` (SPEC-07
"Operações" ficou dentro da área operacional). Isso não é uma lacuna: é o
shape que o nosso `AreaId` já tem hoje, correto pro nosso conjunto de rotas.

Ordem de `getUserAreas` no nosso projeto (determinística, mesma ordem do
legado em espírito — admin primeiro quando aplicável, depois as áreas
internas fixas):

```ts
// Internal + isAdmin:  ["admin", "administrativo", "operacional", "laboratorio"]
// Internal, não admin: ["administrativo", "operacional", "laboratorio"]
// Externo (client):    ["client"]
// Sem usuário:          []
```

A ordem é definida pela ordem de `.push` em `getUserAreas` — estável e
determinística (não depende de iteração de objeto/Set). `admin` first
confirmed: usuário Internal com `isAdmin === true` cai em `/admin/access`
como primeira área, igual ao legado (`AREA_HOME.admin` também é a primeira
entrada do array de áreas do legado pra Internal).

### Rotas de home reais por área (confirmadas em código, todas `IMPLEMENTED`)

| `AreaId`         | Rota                                                        | Origem                      |
| ---------------- | ------------------------------------------------------------ | ---------------------------- |
| `admin`           | `/admin/access`                                              | SPEC-03                     |
| `administrativo`  | `/administrative`                                            | SPEC-17 (home nova)          |
| `operacional`     | `/operational`                                               | SPEC-08                     |
| `client`          | `/client`                                                    | SPEC-09                     |
| `laboratorio`     | `/laboratory`                                                | placeholder "Página em construção", sem SPEC própria ainda |

**Decisão (confirmada nesta SPEC):** `laboratorio` entra no mapa apontando
pro placeholder existente (`/laboratory`). Não é regressão — é exatamente o
que já se vê hoje se o usuário navega manualmente pra lá pela sidebar; só
estamos permitindo que o redirect de `/dashboard` também alcance esse
destino quando for a primeira área do usuário. Trocar por uma tela real é
escopo de uma SPEC de laboratório futura, não desta.

## 3. Escopo

- Adicionar `AREA_HOME: Record<AreaId, string>` em `src/lib/permissions.ts`,
  espelhando o `AREA_HOME` do legado (mesmo papel: mapa de UI/navegação, não
  guard de segurança — consistente com o papel documentado do arquivo).
- Reescrever `src/routes/_dashboard/dashboard/index.tsx`: remover o
  `PageLayout` placeholder; `beforeLoad` busca o usuário (mesmo padrão dos
  guards irmãos — cache do React Query se já quente, senão `fetchMeFn()`),
  calcula `getUserAreas(user)`, e:
  - se `areas.length > 0`: `throw redirect({ to: AREA_HOME[areas[0]] })`;
  - se `areas.length === 0`: `throw redirect({ to: "/not-found" })` (rota
    `_system/not-found` já existente — equivalente ao `<NotFound />` que o
    legado renderiza inline no `HomeRedirect`; usamos redirect em vez de
    render porque é o padrão de todo guard vizinho nesta árvore de rotas,
    e evita duplicar o componente 404 dentro de `/dashboard`).
- Sem componente próprio: rota vira puramente `beforeLoad`, sem
  `component:` — mesmo shape de `src/routes/_site/index.tsx`, que já hoje é
  só um redirect.

## 4. Fora do escopo

- Mudar qualquer uma das 5 rotas que apontam pra `/dashboard` (elas
  continuam corretas: pós-login, guard de área sem permissão, `_site/`).
- Criar SPEC/tela nova de laboratório.
- Renomear/expandir `AreaId` pra incluir um `"operacoes"` distinto do
  legado — não existe rota nossa que justifique isso hoje.
- Qualquer mudança em `getUserAreas` além de adicionar `AREA_HOME` ao lado
  dele (a lógica de quem vê o quê não muda).

## 5. Prevenção de loop de redirect

Os três guards que hoje mandam de volta pra `/dashboard` quando falta
permissão (`admin/route.tsx`, `client/route.tsx`, `_internal.tsx`) usam
`getUserAreas(user).includes(<area-específica>)`. Com `/dashboard` virando
redirect pra `AREA_HOME[getUserAreas(user)[0]]`:

- Usuário sem área X é mandado pra `/dashboard`, que recalcula
  `getUserAreas(user)` (mesmo usuário, mesmo resultado) e manda pra
  `AREA_HOME[areas[0]]` — a primeira área que ele **tem**. Como X não está
  em `areas` (é por isso que o guard rejeitou), `areas[0] !== X`; não pode
  devolver pra dentro do guard que acabou de rejeitar. Sem ciclo.
- Único jeito de `/dashboard` redirecionar pra si mesmo seria se
  `AREA_HOME[areas[0]]` resolvesse pra `/dashboard` — não resolve, nenhuma
  entrada do mapa aponta pra lá.
- Caso `areas.length === 0` (sessão com `authed=true` mas `fetchMeFn()`
  retornando `null`/usuário sem type reconhecido): vai pra `/not-found`, não
  de volta pro guard pai — sem ciclo.

Esse raciocínio cobre os três guards existentes; nenhum precisa mudar
código pra manter essa garantia (já jogam pra `/dashboard`, que agora é
"esperto" o bastante pra não devolver a bola pro mesmo guard).

## 6. Contrato de rota

```
src/routes/_dashboard/dashboard/index.tsx
Route: "/_dashboard/dashboard/"
beforeLoad: async ({ context }) => {
  // mesmo padrão de admin/route.tsx e client/route.tsx:
  const queryKey = profileMeQueryOptions().queryKey;
  const cached = context.queryClient.getQueryData(queryKey);
  const user = cached ?? (await fetchMeFn());
  if (user && !cached) context.queryClient.setQueryData(queryKey, user);

  const areas = getUserAreas(user as PermissionUser | null);
  const home = areas.length > 0 ? AREA_HOME[areas[0]] : "/not-found";
  throw redirect({ to: home });
}
// sem component
```

Sem `validateSearch`, sem `head` (não renderiza nada — redirect acontece no
`beforeLoad`, antes de qualquer paint).

## 7. Camada de dados

Nenhuma nova. Reusa `profileMeQueryOptions()` (`src/lib/queries/profile.ts`)
e `fetchMeFn()` (`src/lib/auth-fns.ts`), já existentes e já usados pelo
mesmo padrão nos guards irmãos.

## 8. UI

Nenhuma — rota deixa de ter componente. `PageLayout` import é removido de
`dashboard/index.tsx`.

## 9. i18n

Nenhuma chave nova — não há texto visível (a rota nunca renderiza; o
redirect acontece antes do paint tanto no SSR quanto na navegação client).

## 10. Dependências

Nenhuma nova.

## 11. Arquivos esperados

- `src/lib/permissions.ts` — adiciona `AREA_HOME`.
- `src/routes/_dashboard/dashboard/index.tsx` — reescrito como redirect.

## 12. Critérios de aceitação

| # | Critério | Como verificar |
| - | -------- | --------------- |
| 1 | Usuário Internal + `isAdmin` acessando `/dashboard` cai em `/admin/access` | leitura de código (guard determinístico) — `getUserAreas` prioriza `admin` |
| 2 | Usuário Internal não-admin acessando `/dashboard` cai em `/administrative` | idem — `areas[0] === "administrativo"` |
| 3 | Usuário externo (`client`) acessando `/dashboard` cai em `/client` | idem — `getUserAreas` só devolve `["client"]` |
| 4 | Usuário sem nenhuma área (`areas.length === 0`) cai em `/not-found`, não em loop | idem — branch explícito no `beforeLoad` |
| 5 | Nenhum dos guards de área (`admin`, `client`, `_internal`) entra em ciclo de redirect ao mandar de volta pra `/dashboard` | leitura de código — ver §5 |
| 6 | `bun run check` e `bun run lint` passam | rodar os comandos |
| 7 | As 5 rotas que hoje apontam pra `/dashboard` continuam funcionando sem alteração | leitura de código — nenhuma foi tocada |

## 13. Riscos

- Se no futuro `AREA_HOME` ficar dessincronizado de uma rota real (rota
  renomeada sem atualizar o mapa), `/dashboard` redireciona pra um 404 real
  do router (`notFoundComponent` do `__root`) em vez de `/not-found` — risco
  aceito, mesmo tipo de risco que qualquer `redirect({ to: string literal })`
  no projeto já tem hoje (não há checagem de tipo forte de rota existente
  nesses `to:` de string solta pros guards vizinhos).
- `laboratorio` como primeira área de um usuário vai cair no placeholder
  "Página em construção" — comportamento esperado e documentado em §2, não
  um bug desta SPEC.

## 14. Decisões pendentes

Nenhuma — usuário já decidiu ao aprovar (`APROVAR SPEC-19`): laboratório
entra no mapa apontando pro placeholder, e `areas.length === 0` cai em
`/not-found`.

## Branch

O workspace estava em `spec-18-crud-componentization` (limpo, já
implementada) no momento do pedido. Como esta é uma mudança pequena e
isolada (2 arquivos), sem relação com SPEC-18, a implementação segue direto
nessa branch corrente por instrução implícita de continuidade do fluxo (sem
branch nova criada) — **nota**: `specs/BRANCHING.md` não cobre SPEC-19
(criada depois do plano de ondas fechar); se o usuário quiser branch própria
(`spec-19-dashboard-home-redirect`) a partir de `main`/`SPECS-LEGADO`, isso é
uma correção de fluxo git a pedir separadamente — não bloqueia a
implementação em si.

---

## Implementation Notes

- Arquivos alterados:
  - `src/lib/permissions.ts` — `AREA_HOME` adicionado.
  - `src/routes/_dashboard/dashboard/index.tsx` — reescrito como redirect
    (`beforeLoad`, sem `component`).
- Comandos executados:
  - `bun run check` (tsc --noEmit) — `VERIFIED`, sem erros.
  - `bun run lint` — `FAILED` com o baseline pré-existente do repo (3 errors
    em `src/lib/session.server.ts`, arquivo não tocado por esta SPEC;
    confirmado via `git stash` que os mesmos 3 errors + 63 warnings já
    existiam antes desta mudança). Nenhum problema novo introduzido pelos
    2 arquivos desta SPEC (`permissions.ts`, `dashboard/index.tsx`) — grep
    isolado neles não retornou nenhuma linha.
- Critérios de aceitação: ver tabela §12, todos `PASS` (validados por
  leitura de código + check/lint).
- Decisões tomadas durante a implementação: nenhuma além das já registradas
  acima.
- Limitações conhecidas: `laboratorio` continua placeholder (fora de
  escopo); `/not-found` só é alcançável hoje por este redirect (antes era
  código morto sem nenhum link apontando pra ele).
