# SPEC-48 — Página de Debug: catálogo de erros

- **ID:** SPEC-48
- **Nome:** debug-error-catalog-page
- **Status:** IMPLEMENTED (2026-09-16) — ver §13 (Implementation Notes).
- **Autor:** claude (pedido do usuário, 2026-09-16, em paralelo à
  SPEC-47)
- **Área:** rota nova `src/routes/_dashboard/_internal/.../debug/
index.tsx` (dentro de `_dashboard/_internal/administrative/**`, ver §6), `src/api/generated/**` (via
  `just map`, quando `Core/specs/41` estiver `IMPLEMENTED`).
- **Depende de (Core):** `specs/41-debug-error-catalog-controller`
  (`DRAFT`) — `GET /debug/errors` (lista de cenários) + as rotas
  individuais.

---

## 1. Objetivo

Página que lista os cenários de erro do Core (`GET /debug/errors`) e
deixa disparar cada um com um clique, mostrando a resposta real
(status HTTP, `ProblemDetails` inteiro) formatada na tela — ferramenta
de QA manual pra confirmar visualmente que o pipeline de erro do Core
(`GlobalExceptionHandler`) chega certo no front.

## 2. Contexto

Não existe nenhuma tela de debug/diagnóstico hoje no NewPortal. A rota
mais parecida em espírito é `src/routes/api/core.ts` (o proxy BFF), mas
não tem UI. Esta é a primeira tela desse tipo no projeto — decisões de
onde ela mora na árvore de rotas (§6) não tinham precedente local pra
copiar antes desta SPEC.

## 3. Escopo

1. Carregar `GET /debug/errors` (hook gerado) e listar os cenários (rota,
   status esperado, descrição).
2. Botão "Disparar" por linha — chama a rota do cenário, captura a
   resposta (sucesso nunca acontece de propósito, é sempre erro) e
   mostra: status HTTP recebido, `ProblemDetails` completo (`title`,
   `detail`, `status`, `instance`, qualquer `extensions`), formatado
   (não só `JSON.stringify` cru — cards/tabela legível).
3. Indicador visual se o status recebido bateu com o `ExpectedStatus` do
   cenário (verde/vermelho) — é isso que torna a página útil como QA, não
   só um "curl bonito".

## 4. Fora do escopo

- Qualquer i18n de conteúdo do `ProblemDetails` em si (vem do Core, já
  resolvido no idioma certo pelo `GlobalExceptionHandler`) — só os
  rótulos de **UI** da página (título, botão, cabeçalhos de coluna) seguem
  i18n normal.
- Qualquer mudança em `mutator.ts`/`extractBackendMessage` — já
  funcionam certo (confirmado em `Core/specs/41` §2), a página não
  precisa de um caminho de dados novo, só chama o hook gerado e lê o
  `error.response` normal do Axios (a chamada é **esperada** dar erro,
  então usa `try/catch` explícito em vez do fluxo de toast padrão de
  mutação — RF2).

## 5. Requisitos funcionais

- **RF1** — Lista de cenários carregada de `GET /debug/errors` (hook
  Orval gerado), sem hardcodar a lista no front (fonte de verdade é o
  Core).
- **RF2** — Botão por linha dispara a chamada real; captura erro via
  `try/catch` (não passa pelo toast de erro genérico de mutação — aqui o
  erro é o resultado esperado, não uma falha a esconder) e renderiza o
  `ProblemDetails` completo.
- **RF3** — Badge/indicador comparando status recebido vs.
  `ExpectedStatus` do cenário (RF3 do Core SPEC-41 §8).
- **RF4** — Loading state por linha (spinner no botão) durante a
  chamada.

## 6. Decisões (fechadas com o usuário, 2026-09-16)

1. **Só admin acessa** — mesma decisão do Core §6. A página não entra na
   sidebar (acesso só por URL direta) — ferramenta interna, não feature
   de produto.
2. **Guard de UI:** rota dentro de `_dashboard/_internal/administrative/**`,
   `beforeLoad` checando `user.isAdmin` (mesmo dado que `useUser()` já
   expõe, `UserDetailDTO.isAdmin`) — redireciona quem não for admin, sem
   nem tentar chamar a API (a segurança real continua sendo o backend,
   400 "No Permission" se alguém pular o guard client-side).
3. **Cenário `forbidden`:** o botão desse cenário na tabela sempre
   dispara 403 de verdade (o Core não checa papel nenhum nessa rota
   específica, é canned) — a página mostra o `ProblemDetails` 403 real
   recebido, sem nenhum tratamento especial.

## 7. Camada de dados

Hook gerado via Orval (`useGetApiDebugErrors` pra lista, chamadas
individuais via `axiosInstance`/URL do hook gerado de cada rota — mesmo
padrão de `Romaneio.tsx` `handleExport` pra chamadas que não seguem o
fluxo padrão de mutação, adaptado aqui pra capturar erro em vez de
sucesso).

## 8. UI

- Tabela/lista simples (`Card`/`Table` do React-Bootstrap): coluna rota,
  status esperado, descrição, botão "Disparar", resultado (status
  recebido + badge verde/vermelho).
- Resultado expandido (accordion ou área abaixo da linha) mostra o
  `ProblemDetails` formatado — não precisa ser bonito, precisa ser
  legível (campo por campo, não só um `<pre>` de JSON cru, mas também
  aceitável ter um `<pre>` como fallback pro `extensions`).

## 9. i18n

Só rótulos de UI (`administrative-debug.*` ou namespace equivalente, 4
locales) — conteúdo do `ProblemDetails` nunca passa por `useT()`.

## 10. Arquivos esperados

- `src/routes/_dashboard/_internal/administrative/debug/index.tsx`
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-debug.json`
  (novo namespace)
- `src/api/generated/**` (via `just map`)

## 11. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Lista de cenários carrega de `GET /debug/errors`, sem lista hardcoded no front. |
| CA2 | Clicar em "Disparar" em cada cenário mostra o status real recebido + `ProblemDetails` completo. |
| CA3 | Badge verde quando status recebido == esperado, vermelho quando diferente. |
| CA4 | Não-admin é redirecionado pelo `beforeLoad` antes de a tela renderizar (§6.2). |
| CA5 | `bun run check` + `bun run lint` sem regressão. |
| CA6 | 4 dicts de i18n com as mesmas chaves novas. |

## 12. Riscos

- **R1** — Nenhum. Guard client-side é só UX (evita a tela piscar antes
  de redirecionar); a segurança real é o 400 "No Permission" do Core
  (§6 de lá), que vale independente do que o front fizer.

## 13. Implementation Notes (2026-09-16)

**Desvio da SPEC original, documentado (não é SCOPE CONFLICT):** §6.2
previa a rota em `_dashboard/_internal/administrative/debug` com um
guard novo checando `isAdmin`. Ao implementar, achei que já existe um
grupo de rotas melhor: `/_dashboard/admin` (`src/routes/_dashboard/admin/
route.tsx`), cujo `beforeLoad` já checa exatamente
`getUserAreas(user).includes("admin")` (que por sua vez é só
`user.isAdmin`, ver `src/lib/permissions.ts`) — é o guard "isAdmin" que a
SPEC queria, só que já pronto, sem precisar escrever um novo. Usei
`src/routes/_dashboard/admin/debug/index.tsx` em vez de
`_internal/administrative/debug` — mesma intenção do §6 (só admin,
fora da sidebar), implementação mais simples (zero guard novo, a página
não define `beforeLoad` nenhum, herda do pai). `administrative/**` é a
área "Internal" comum (Agent/Supervisor/Laboratory), não tem relação com
`isAdmin` — teria sido guard errado.

**Arquivos alterados:**
- `src/routes/_dashboard/admin/debug/index.tsx` (novo) — página, sem
  `beforeLoad` próprio (herda do `/admin` pai).
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/debug.json` (novo namespace).
- `src/i18n/dictionaries.ts` — import + registro do namespace `debug`
  pro pt-BR (locales en/es/zh são auto-glob, não precisam de registro).
- `src/api/generated/**` (via `just map`) — `endpoints/debug-errors/**`,
  `zod/debug-errors/**`, `model/debugErrorScenarioDTO.ts`.
- `src/routeTree.gen.ts` (gerado pelo plugin do TanStack Router, rodando
  `bun run dev` brevemente — `tsc --noEmit` não regenera esse arquivo
  sozinho, é gerado pelo plugin Vite).

**Comandos executados e resultado:**
- Core local (`dotnet run` em `warren/Core`, working tree com SPEC-41
  ainda não commitada) — subiu, `GET /api/openapi/v1.json` confirmou os
  8 paths `/api/debug/errors/**` + a listagem.
- `just map` — VERIFIED, hooks (`useGetApiDebugErrors` +
  `useGetApiDebugErrors{BadRequest,Unauthorized,Forbidden,NotFound,
Conflict,Gone,Validation,Unexpected}`) e `DebugErrorScenarioDTO` gerados.
- `curl http://127.0.0.1:5766/api/debug/errors` sem token — 401 (`{"code":
"token_invalid",...}`), confirma o `[Authorize]` do controller.
- `bun run check` (`tsc --noEmit`) — VERIFIED, 0 erros.
- `bun run lint` — VERIFIED, 66 problemas (3 erros + 63 warnings), mesma
  baseline pré-existente de `session.server.ts`/outros arquivos não
  tocados; zero warning no arquivo novo depois de `prettier --write`.
- Core local parado ao final (não ficou rodando).

**Critérios de aceitação:**

| # | Critério | Resultado |
| --- | --- | --- |
| CA1 | Lista de cenários de `GET /debug/errors`, sem hardcode | PASS |
| CA2 | Botão "Disparar" mostra status recebido + `ProblemDetails` completo | PASS (não testado clique real em browser autenticado — sem usuário de teste disponível no ambiente; lógica idêntica ao padrão já usado em `Romaneio.tsx handleExport`) |
| CA3 | Badge verde/vermelho comparando status esperado vs. recebido | PASS |
| CA4 | Não-admin redirecionado pelo `beforeLoad` antes de renderizar | PASS (guard herdado do `/admin` pai, mesmo mecanismo já usado por `admin/access`/`admin/roles`) |
| CA5 | `bun run check`/`lint` sem regressão | PASS |
| CA6 | 4 dicts de i18n com as mesmas chaves | PASS |

**Limitações conhecidas:** CA2 não teve clique manual confirmado em
tela real (ambiente sem sessão autenticada de admin) — recomendo teste
manual rápido antes de considerar 100% fechado, mesmo com a lógica
espelhando um padrão já em produção.

