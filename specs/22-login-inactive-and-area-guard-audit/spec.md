# SPEC-22 — Auditoria: login com usuário inativo e acesso de não-Admin

- **ID:** SPEC-22
- **Nome:** login-inactive-and-area-guard-audit
- **Status:** IMPLEMENTED
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/lib/auth-fns.ts`, `src/lib/session.server.ts`,
  `src/routes/auth/login/index.tsx`, `src/lib/permissions.ts`,
  `src/routes/_dashboard/_internal.tsx`, `src/routes/_dashboard/dashboard/index.tsx`
  (só leitura/auditoria — ver §6, sem alteração de comportamento proposta)
- **Depende de:** nenhuma SPEC anterior (auditoria isolada)
- **Contexto do pedido:** usuário pediu correção de dois problemas
  relatados no fluxo de login: (1) usuário com `isActive: false` talvez
  consiga autenticar; (2) usuário não-Admin talvez seja bloqueado no login
  ou pós-login. Esta SPEC documenta a investigação de código (front +
  leitura do Core `warren/Core`, território de outro agente, só para
  confirmar o contrato real) feita **antes** de propor qualquer mudança.

---

## 1. Objetivo

Confirmar, com evidência de código, o comportamento atual dos dois cenários
pedidos e decidir se algo precisa mudar no front. **Resultado da
investigação: nenhum dos dois cenários reproduz um bug no código hoje** —
ver §5. Esta SPEC existe para registrar a auditoria formalmente (SDD) e
oferecer ao usuário a decisão de fechar sem código, ou levantar um cenário
adicional não coberto ainda.

## 2. Contexto

Fonte de verdade do comportamento de login: `warren/Core` (fora do
território deste agente — só leitura, sem edição) +
`src/lib/auth-fns.ts`/`session.server.ts` (front). `getUserAreas` em
`src/lib/permissions.ts` decide as áreas visíveis pós-login.

## 3. Escopo desta auditoria

1. Rastrear o caminho completo de `POST /api/auth/login` (Core) →
   `loginFn` (front) → cookie de sessão → tela de login, para
   `isActive: false`.
2. Rastrear `getUserAreas`/`AREA_HOME`/guards de rota (`_dashboard`,
   `_dashboard/_internal`, `_dashboard/admin`, `_dashboard/dashboard`) para
   usuário Internal **sem** `isAdmin`.
3. Registrar achados residuais (não bloqueantes) encontrados no caminho.

## 4. Fora do escopo

- Qualquer mudança em `warren/Core` (território de outro agente).
- SPEC-23 (toggle Administrador no cadastro/edição) — bug real, tratada
  separadamente.

## 5. Achados

### 5.1 Cenário 1 — login com `isActive: false`

**Comportamento atual (verificado):**

- `warren/Core/Controllers/Auth/Auth.Login.cs` (`POST /api/auth/login`)
  busca o usuário e, **antes** de checar a senha, verifica
  `if (!user.IsActive) return Unauthorized(new { message = "Usuário inativo." })`
  (linhas 37-38). Nenhum token é gerado, nenhuma resposta de sucesso volta
  ao front.
- `src/lib/auth-fns.ts::loginFn` chama `coreClient.post("/api/auth/login", ...)`
  dentro de um `try`; em erro, `coreErrorMessage(err, fallback)` lê
  `err.response.data.message` — que será exatamente `"Usuário inativo."` — e
  relança como `Error(message)`. `writeServerSession(...)` só é chamado
  **depois** desse bloco, isto é, nunca é alcançado se o Core recusou o
  login. Nenhum cookie de sessão é criado.
- `src/routes/auth/login/index.tsx::onSubmit` captura a exceção e mostra
  `toast.error(err.message)` — ou seja, o usuário vê "Usuário inativo."
  (mensagem do Core, já adequada) e permanece na tela de login.
- Reforço adicional (defesa em profundidade, já existente): mesmo que uma
  sessão antiga sobrevivesse e o usuário fosse desativado *durante* uma
  sessão já aberta, `warren/Core/Middleware/Auth.cs:27` re-checa
  `user == null || !user.IsActive` em **toda** requisição autenticada
  subsequente e devolve 401; o proxy BFF (`src/routes/api/core.ts`, ver
  `AGENTS.md` §"Autenticação e sessão") limpa o cookie em 401 do Core.

**Conclusão:** não há bug. Login com `isActive: false` já é bloqueado no
Core (mensagem clara) e o front não cria sessão nesse caminho nem esconde a
mensagem de erro.

### 5.2 Cenário 2 — login e pós-login de usuário Internal não-Admin

**Comportamento atual (verificado):**

- `Auth.Login.cs` não faz nenhuma checagem de `IsAdmin`/`Roles` — qualquer
  usuário ativo com senha correta recebe token, independente de ser Admin.
- `src/lib/permissions.ts::getUserAreas`: para `user.type === Internal`,
  **sempre** inclui `"administrativo"`, `"operacional"`, `"laboratorio"`
  nas áreas — `isAdmin` só adiciona a área extra `"admin"` (`if (user.isAdmin) areas.push("admin")`).
  Um usuário Internal não-Admin recebe `["administrativo", "operacional", "laboratorio"]`.
- `src/routes/_dashboard/dashboard/index.tsx` (home pós-login, SPEC-19)
  redireciona para `AREA_HOME[areas[0]]` → `/administrative` para esse
  usuário. Nenhum bloqueio.
- `src/routes/_dashboard/_internal.tsx` (guard de `administrative`/
  `operational`/`laboratory`) só falha o redirect se
  `!getUserAreas(user).includes("laboratorio")` — como todo usuário
  Internal sempre ganha as três áreas juntas hoje (não há papel que dê só
  uma delas), essa checagem na prática funciona como "é Internal?", e
  não bloqueia usuário não-Admin.
- `src/routes/_dashboard/admin/route.tsx` é o único guard que exige
  `isAdmin` (área `"admin"`) — correto, pois `/admin/access` mapeia pra
  `warren/Core/Controllers/User/User.Cruid.cs`, cujos 5 endpoints têm
  `[RequireAdmin]` no Core. Um não-Admin tentando `/admin/*` é redirecionado
  pra `/dashboard` — comportamento esperado, não é o cenário relatado
  ("login bloqueado"), é acesso à área administrativa restrita (correto).

**Conclusão:** não há bug. Usuário Internal não-Admin loga normalmente e é
redirecionado pra `/administrative` (primeira área da lista); só a área
`/admin/*` (gestão de usuários) é de fato restrita a Admin — e isso é
intencional (espelha o `[RequireAdmin]` do Core).

### 5.3 Achado residual (não bloqueante, registrado por transparência)

- **R1** — `_internal.tsx` testa especificamente `.includes("laboratorio")`
  para proteger as três sub-áreas (`administrative`, `operational`,
  `laboratory`), quando semanticamente deveria testar a área
  correspondente à rota atual. Hoje é inofensivo porque `getUserAreas`
  nunca dá as três separadamente (são "tudo ou nada" pra Internal) — mas se
  o Core algum dia expuser um papel que restrinja só a laboratório (ex.:
  `InternalRole.Laboratory` já existe no enum, mas `getUserAreas` não o usa
  pra diferenciar áreas, só pra "responsável" em Operações, SPEC-21), esse
  guard passa a proteger errado. Não é o bug relatado — registrado como
  débito técnico, não corrigido aqui (mudaria contrato de área, que é
  `[NEEDS_DECISION]`, fora do escopo desta auditoria).

## 6. Plano de correção

**Nenhuma alteração de código proposta** — os dois cenários pedidos já
funcionam conforme o esperado, com evidência de código em ambos os lados
(Core e front). Se o usuário tiver reproduzido um desses bugs manualmente
(ex.: outra versão do Core, cache de sessão antigo, ambiente com deploy
desatualizado), a investigação deve ser refeita com passos de reprodução
exatos (usuário de teste, ambiente, print/log do erro) — o que não foi
fornecido para esta auditoria.

## 7. Critérios de aceitação

| #   | Critério                                                                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------- |
| CA1 | Usuário confirma os achados de §5.1/§5.2 (concorda que não há bug) **ou** fornece passos de reprodução novos    |
| CA2 | Se R1 (§5.3) for considerado relevante, abre-se `[NEEDS_DECISION]` própria sobre o contrato de área por papel     |

## 8. Riscos

- Ver R1 (§5.3).

## 9. Decisões pendentes

```
[NEEDS_DECISION]

Os dois cenários (login inativo, login não-Admin) já funcionam
corretamente pelo código auditado (Core bloqueia isActive=false com
mensagem clara antes de emitir token; front não cria sessão nesse caso;
usuário Internal não-Admin loga e acessa administrativo/operacional/
laboratorio normalmente, só /admin/* é restrito, como esperado).

Como fechar esta SPEC?

1. Fechar como IMPLEMENTED (auditoria concluída, comportamento já correto,
   zero código tocado) — status desta SPEC passa a documentar a
   verificação pra referência futura.
2. Usuário fornece passos de reprodução concretos (ambiente, usuário de
   teste, print/log) de um dos dois cenários funcionando errado hoje, e a
   investigação continua com esse novo dado.
3. Tratar R1 (§5.3, guard de `_internal.tsx` testando só "laboratorio")
   como um item a corrigir por precaução, mesmo sem reprodução de bug —
   nesse caso qual comportamento exato: cada segmento (`administrative`,
   `operational`, `laboratory`) checa sua própria entrada em
   `getUserAreas`, mesmo elas sendo hoje sempre iguais para Internal?

Decisão do usuário: **opção 3** — corrigir R1 por precaução. Ver §14.
```

---

## 14. Implementation Notes

**Decisão aplicada:** opção 3 do `[NEEDS_DECISION]` (§9) — corrigir R1 por
precaução, mesmo sem bug confirmado em produção. Cenários 1 e 2 (§5.1/§5.2)
permanecem "sem bug", nenhuma mudança de comportamento de login foi feita.

**Arquivos alterados/criados:**

- `src/lib/permissions.ts` — novo helper exportado `isInternalUser(user)`
  (`!!user && user.type === UserType.Internal`), usado só pelo guard
  guarda-chuva de `_internal.tsx`.
- `src/routes/_dashboard/_internal.tsx` — troca o guard de
  `getUserAreas(user).includes("laboratorio")` por `isInternalUser(user)`.
  Deixa de checar uma área específica (isso passa a ser responsabilidade de
  cada sub-segmento) e volta a significar exatamente o que o comentário do
  arquivo já dizia: "é Internal?".
- `src/routes/_dashboard/_internal/administrative/route.tsx` — **criado**.
  Layout do segmento `/administrative` (mesmo padrão de
  `_dashboard/admin/route.tsx` e `_dashboard/client/route.tsx`): guard
  próprio checando `getUserAreas(user).includes("administrativo")`,
  `component` só com `<Outlet />`. Agora cobre também as rotas filhas já
  existentes (`clients`, `operations`, `operations/$id`,
  `registry/{container,harbor,product,terminal,vessel}`) sem precisar
  tocá-las — elas passam a herdar este guard automaticamente por estarem
  dentro da pasta `administrative/`.
- `src/routes/_dashboard/_internal/operational/route.tsx` — **criado**,
  mesmo padrão, checando `.includes("operacional")`. Cobre também
  `operations` e `operations/$id` já existentes.
- `src/routes/_dashboard/_internal/laboratory/route.tsx` — **criado**,
  mesmo padrão, checando `.includes("laboratorio")` (texto idêntico ao que
  `_internal.tsx` já checava antes — só muda o escopo: agora só protege
  `/laboratory`, não as três áreas).
- `src/routeTree.gen.ts` — **regenerado automaticamente** (`bun run build`,
  plugin do TanStack Router) para registrar os 3 novos `route.tsx` como pais
  dos arquivos `index.tsx`/filhos já existentes. Não editado à mão.

**Comandos executados e resultado:**

- `bun run build` — `VERIFIED` a regeneração de `src/routeTree.gen.ts`
  (client build completou e gerou os chunks das novas rotas; o
  `.output/public/assets/*route*.js` inclui os 3 layouts novos). O passo de
  build **falha** (`FAILED`) na fase de bundle do servidor, mas por um
  problema **pré-existente e não relacionado**: `Cannot resolve import
"mammoth"` a partir de `src/components/ui/file-preview-modal.tsx` —
  confirmado rodando o build antes desta mudança (via `git stash`) com o
  mesmo erro exato. Causa raiz: `mammoth`/`xlsx` (dependências do
  `package.json`) não estão instaladas em `node_modules` neste ambiente
  (`ls node_modules | grep -x "mammoth\|xlsx"` não retorna nada) — débito de
  ambiente, fora do escopo desta SPEC.
- `bun run check` — `FAILED` com exatamente os mesmos 2 erros de módulo
  ausente (`mammoth`, `xlsx`, em `file-preview-modal.tsx`), confirmados
  pré-existentes (mesmo resultado com `npm run check`). **Nenhum erro nos
  arquivos tocados por esta SPEC** — confirmado filtrando a saída por
  `permissions.ts`/`_internal` (zero linhas).
- `bun run lint` — projeto tem 3 erros pré-existentes em
  `src/lib/session.server.ts` (regra `react-hooks/rules-of-hooks` disparada
  por `useSession` fora de componente/hook — código não tocado por esta
  SPEC) e 63 warnings pré-existentes em outros arquivos. `VERIFIED`
  isoladamente para os arquivos desta SPEC: `bunx eslint
src/lib/permissions.ts src/routes/_dashboard/_internal.tsx
src/routes/_dashboard/_internal/{administrative,operational,laboratory}/route.tsx`
  → zero erros, zero warnings.
- `just map` — não se aplica (nenhuma mudança de contrato do Core nesta
  SPEC).

**Critérios de aceitação (§7):**

| #   | Critério                                                                        | Resultado                                                                 |
| --- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| CA1 | Usuário confirma os achados de §5.1/§5.2 ou fornece reprodução nova              | PASS — usuário confirmou (não pediu reprodução) e escolheu tratar R1      |
| CA2 | Se R1 for relevante, abre-se `[NEEDS_DECISION]` sobre contrato de área por papel | PASS — decisão já tomada na própria SPEC (opção 3), sem novo contrato de área — cada rota passou a checar sua própria entrada em `getUserAreas`, sem mudar o *shape* de `AreaId`/`getUserAreas` |

**Decisões tomadas durante a implementação:**

- Reused o padrão já existente em `admin/route.tsx`/`client/route.tsx`
  (layout `route.tsx` por segmento, com guard em `beforeLoad` + `<Outlet />`)
  em vez de inventar um mecanismo novo — três arquivos praticamente
  idênticos entre si (e ao padrão dos irmãos), só trocando a string de área
  checada.
- `isInternalUser` ficou em `permissions.ts` (não duplicado inline em
  `_internal.tsx`) para poder ser reutilizado se outro guard "é Internal?"
  aparecer no futuro.

**Limitações conhecidas:**

- O erro de build/check de `mammoth`/`xlsx` (pré-existente, não relacionado)
  não foi corrigido — está fora do escopo desta SPEC (SPEC-22 é sobre
  login/guard de área). Fica registrado aqui como achado incidental da
  auditoria, para o usuário decidir se quer abrir uma SPEC própria (`bun
install`/reinstalar dependências deveria resolver, a se confirmar).
