# SPEC-57 — Log de Operação: nome do usuário + polimento pontual

- **ID:** SPEC-57
- **Nome:** operation-log-user-and-polish
- **Status:** IMPLEMENTED
- **Autor:** portal-dev-agent (rascunho, 2026-09-16 — continuação de
  investigação anterior, decisões do usuário já tomadas, ver §5)
- **Área:** `src/components/operations/tabs/Log.tsx`
- **Depende de:** **SPEC-56** (`surface-border-tokens`) — `Log.tsx` usa
  `className="soft-card p-3"` (linha 64), que só vira uma superfície com
  borda de verdade depois que SPEC-56 fechar. Esta SPEC não redefine CSS
  nenhum, só herda o resultado.
- **Contexto do pedido:** achado da investigação — `entry.createdBy` em
  `Log.tsx` hoje mostra o `Guid` cru do usuário ("por
  a3f1c2e4-...") em vez de um nome legível, e o card do log em si foi
  descrito como "feio" (débito conhecido, já registrado como risco R2 na
  SPEC-39 no momento em que ela fechou).

---

## 1. Objetivo

1. Resolver `entry.createdBy` (hoje `Guid` cru) para um nome de usuário
   legível, buscando `GET /api/user/{id}` (`useGetApiUserId`, já gerado)
   uma única vez por id único visível na página atual — não uma chamada
   por entrada de log repetida para o mesmo usuário.
2. Ajuste pontual de hierarquia visual na aba Log (destacar ação/data,
   autor legível) — sem redesign amplo, só o que resolve o "feio" citado
   pelo usuário, herdando a superfície corrigida da SPEC-56.

## 2. Contexto (achados da investigação)

### 2.1 Estado atual (`Log.tsx`, pós SPEC-39)

`Log.tsx` já consome dado real (`GET /operation/{id}/log`, paginado),
sem mock — SPEC-39 fechou isso. O que ficou como débito explícito (SPEC-39
§11, "R2"): `createdBy` só traz o `Guid`, mostrado cru via
`t("administrative-operations.log.byUser", { user: entry.createdBy })`
(`Log.tsx:85-89`). Chave i18n já existe e é genérica o bastante
(`"byUser": "por {user}"`, `pt-BR`) — não precisa mudar, só o valor
passado como `{user}` muda de Guid pra nome.

### 2.2 Endpoint de resolução de usuário (confirmado)

`GET /api/user/{id}` já está no client gerado:
`useGetApiUserId(id, options)` /
`getGetApiUserIdQueryOptions(id, options)`
(`src/api/generated/endpoints/user/user.ts:791+`). Retorna `UserDTO`
(`src/api/generated/model/userDTO.ts`): `userName: string`, `profile:
ProfileDTO` (`ProfileDTO.fullName?: string`), entre outros campos. Nome
legível disponível via `userName` e/ou `profile.fullName` — decisão de
qual priorizar (`fullName` se presente, senão `userName`) fica pra
implementação, documentar em Implementation Notes.

### 2.3 Sem padrão de "batch por id único" hoje no projeto

Não há precedente no código atual de "resolver N ids únicos com N
chamadas deduplicadas" — o padrão mais próximo (`Responsible.tsx`) resolve
enum local via `internalRoleOptions`, não busca por id. `useSsrSafeQuery`
(`src/lib/queries/use-ssr-safe-query.ts`) só envolve **uma** `useQuery`
por chamada — pra várias, a implementação precisa de `useQueries`
(`@tanstack/react-query`) com o mesmo guard de SSR aplicado manualmente
em cada entrada (`enabled: isClient && ...`, já que `useSsrSafeQuery` não
cobre `useQueries` diretamente).

## 3. Escopo

1. Em `Log.tsx`, a partir da página atual de eventos (`items`, já
   paginada pelo Core), calcular o conjunto de `createdBy` únicos
   (`Set<string>`, ids não vazios).
2. Buscar, uma vez por id único, `GET /api/user/{id}`
   (`useGetApiUserId`/`getGetApiUserIdQueryOptions`) — usar `useQueries`
   (não um `useGetApiUserId` chamado em loop, que violaria regras de
   hooks) com o mesmo guard client-only que `useSsrSafeQuery` aplica hoje
   pra chamada única.
3. Montar um mapa local `id -> nome` (a partir de `userName`/
   `profile.fullName`) e usá-lo para renderizar `entry.createdBy` — se a
   busca daquele id ainda está carregando ou falhou, cair para o `Guid`
   cru (fallback, nunca quebra a tela por causa de um usuário que não
   resolveu).
4. Ajuste pontual de hierarquia visual dentro do card de cada entrada
   (ex.: peso tipográfico maior/badge mais destacado para `Action`, data
   com hierarquia secundária clara, autor como linha de rodapé discreta)
   — usando só utilitárias Bootstrap já em uso no projeto (`fw-semibold`,
   `text-body-secondary`, `small`, `Badge`), sem CSS novo além do que
   `.soft-card` (SPEC-56) já fornece.

## 4. Fora do escopo

- Qualquer mudança em `.soft-card`/`.btn-soft` (CSS) — território da
  SPEC-56, esta SPEC só consome o resultado.
- Auditoria visual geral do projeto / destaque de informações genérico
  (itens 3 e 7 da investigação original) — adiados, sem SPEC própria.
- Resolver nome de usuário em qualquer outra tela do projeto — escopo
  restrito a `Log.tsx`.
- Paginação/filtro do log em si (já resolvido pela SPEC-39) — esta SPEC
  não muda `GET /operation/{id}/log`, só o pós-processamento do
  `createdBy` no client.
- Endpoint de batch/lookup de múltiplos usuários de uma vez no Core (ex.:
  `GET /api/user?ids=...`) — não existe hoje no client gerado; se a
  implementação achar que N chamadas individuais (uma por id único) é
  insuficiente em performance, isso é `[NEEDS_DECISION]`/`SCOPE CONFLICT`
  a levantar, não implementado por conta própria.

## 5. Decisões já tomadas (não são `[NEEDS_DECISION]`)

- Batch = deduplicar por **id único visível na página atual** (não por
  todas as páginas do log, não um endpoint de batch novo no Core) —
  evita N chamadas repetidas pro mesmo usuário quando ele aparece em
  várias entradas da mesma página, sem exigir mudança no Core.
- Fonte do nome: `GET /api/user/{id}` (`useGetApiUserId`, já gerado) —
  nenhum endpoint novo necessário.

## 6. Requisitos funcionais

- **RF1** — `Log.tsx` calcula o conjunto de `createdBy` únicos da página
  atual.
- **RF2** — Para cada id único, uma chamada (deduplicada) a
  `GET /api/user/{id}`, via `useQueries` com guard client-only.
- **RF3** — Cada entrada do log mostra o nome resolvido (`userName`
  e/ou `profile.fullName`) em vez do `Guid` cru, quando a busca
  respectiva já resolveu; enquanto carrega ou se falhar, mostra o `Guid`
  (fallback, sem quebrar a tela nem bloquear a lista inteira por causa de
  um usuário).
- **RF4** — Troca de página do log (`ListPagination`) recalcula o
  conjunto de ids únicos e reaproveita o cache do React Query pra ids já
  resolvidos antes (mesmo usuário aparecendo em páginas diferentes não
  gera nova chamada de rede, graças ao cache nativo de queryKey).
- **RF5** — Ajuste de hierarquia visual do card de entrada (ação/data em
  destaque, autor como linha secundária) usando só utilitárias Bootstrap
  já usadas no projeto.

## 7. Não funcionais

- Sem bloquear o carregamento da lista principal do log — a resolução de
  nome é assíncrona e independente; a lista de eventos aparece mesmo que
  a resolução de algum nome ainda esteja em andamento (fallback pro
  Guid, RF3).
- Sem introduzir chamada duplicada pro mesmo id na mesma página
  (RF1+RF2).

## 8. Camada de dados

- Leitura client-side, hook Orval já gerado:
  `getGetApiUserIdQueryOptions(id)` / `useGetApiUserId` — mesma queryKey
  do endpoint (`["/api/user/:id", id]` ou equivalente, conforme gerado),
  reaproveitando cache do React Query entre páginas/entradas.
- `useQueries` (não `useSsrSafeQuery`, que só cobre uma query por
  chamada) — aplicar `enabled: isClient && ...` manualmente em cada
  entrada do array de queries, replicando o guard de SSR que
  `use-ssr-safe-query.ts` já documenta como obrigatório (nunca deixar o
  `queryFn` rodar durante SSR, sob risco do crash descrito nesse
  arquivo).

## 9. UI

- Sem componente novo — ajuste dentro de `Log.tsx`:
  - Nome do usuário no lugar do Guid em
    `t("administrative-operations.log.byUser", { user: <nome ou guid> })`.
  - Hierarquia visual: `Action` como `fw-semibold` (já é hoje),
    `EntityType` como `Badge` (já é hoje), `CreatedOn` como
    `text-body-secondary small` (já é hoje) — revisar se algum desses já
    resolve o "feio" ou se precisa de ajuste extra (ex.: mais respiro
    entre ação e data, ou "por {user}" com ícone `bi-person` pra
    diferenciar visualmente do texto da nota) — detalhe fino de
    implementação, validado com screenshot antes/depois.

## 10. i18n

- Nenhuma chave nova obrigatória — `administrative-operations.log.byUser`
  (`"por {user}"`) já é genérica o bastante para nome ou Guid.
- Se a implementação decidir por um rótulo de fallback explícito (ex.:
  "usuário não encontrado" em vez de mostrar o Guid cru quando a busca
  falha com erro, não só "carregando"), nova chave em
  `administrative-operations.json` (`log.byUnknownUser` ou similar) nos 4
  locales — decisão de detalhe, documentar se usada.

## 11. Arquivos esperados

- `src/components/operations/tabs/Log.tsx`
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json`
  (só se a chave de fallback do §10 for usada)

## 12. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Entrada de log mostra nome de usuário legível (não Guid) quando a resolução tiver sucesso |
| CA2 | Usuário repetido em várias entradas da mesma página do log gera só 1 chamada de rede por id único (verificar via devtools de rede) |
| CA3 | Falha ou carregamento em andamento não quebra a lista — fallback pro Guid, sem erro na tela |
| CA4 | Troca de página do log não refaz chamada pra um id já resolvido antes (cache do React Query) |
| CA5 | Card de entrada de log herda a borda/superfície da SPEC-56 (`.soft-card` já corrigida) |
| CA6 | Ajuste de hierarquia visual revisado com o usuário (screenshot antes/depois) |
| CA7 | `bun run check` + `bun run lint` sem regressão |

## 13. Riscos

- **R1** — Se a página do log tiver muitos ids únicos diferentes (ex.:
  operação com muitos usuários distintos gerando eventos), o número de
  chamadas simultâneas a `/api/user/{id}` cresce linearmente — aceitável
  para o volume esperado de uma página paginada (`DEFAULT_PAGE_SIZE`),
  mas se isso virar problema de performance real, resolver endpoint de
  batch no Core é `[NEEDS_DECISION]` futura, fora do escopo aqui.
- **R2** — `UserDTO` pode não trazer `profile.fullName` preenchido para
  todo usuário (campo opcional) — fallback pra `userName` cobre isso,
  mas confirmar na implementação qual campo o Core popula de forma mais
  consistente.
- **R3** — Dependência de SPEC-56: se SPEC-56 não estiver implementada
  antes desta, `Log.tsx` continua sem borda visível no card — a
  implementação desta SPEC não deve prosseguir até SPEC-56 estar
  `IMPLEMENTED` (ver §"Dependências").

## 14. Dependências

**SPEC-56** (`surface-border-tokens`) precisa estar `IMPLEMENTED` antes
da implementação desta SPEC-57 (`.soft-card` usado em `Log.tsx`). SPEC-57
é independente da SPEC-55.

## Implementation Notes

- **Arquivos alterados:** `src/components/operations/tabs/Log.tsx` (único
  arquivo — não foi necessária nova chave i18n de fallback, a chave
  existente `administrative-operations.log.byUser` já cobria o caso).
- **RF1/RF2 (dedup + `useQueries`):** `uniqueUserIds` calculado via
  `useMemo` a partir de `items` (Set de `createdBy` não vazios). Uma
  entrada de `useQueries` por id único, usando
  `getGetApiUserIdQueryOptions(id)` (mesma queryKey do hook gerado
  `useGetApiUserId`, preservando cache/dedupe nativo do React Query) com
  `enabled: isClient` — guard client-only manual, já que `useSsrSafeQuery`
  só cobre uma query por chamada (§2.3 da spec).
- **RF3 (fallback):** `userNameById` (`Map<string, string>`) só recebe
  entrada quando a busca resolveu com um nome (`profile.fullName ||
  userName`); no render, `userNameById.get(entry.createdBy) ??
  entry.createdBy` cai pro Guid cru em qualquer outro caso (carregando,
  erro, ou sem nome preenchido) — nunca lança/bloqueia a lista.
- **RF4 (cache entre páginas):** nenhuma lógica adicional necessária — a
  queryKey de `getGetApiUserIdQueryOptions(id)` é a mesma independente da
  página do log; troca de página só recalcula `uniqueUserIds` a partir dos
  novos `items`, e o React Query reaproveita o cache de ids já resolvidos.
- **RF5 (hierarquia visual):** `Action` ganhou `fs-6` além do `fw-semibold`
  já existente; separador (`border-top pt-2 mt-1`) entre o corpo da nota e
  a linha de autor, ícone `bi-person` antes do nome — só utilitárias
  Bootstrap + Bootstrap Icons já em uso no projeto, herdando a superfície
  `.soft-card` corrigida pela SPEC-56.
- **Decisão (R2 — `fullName` vs `userName`):** prioriza `profile.fullName`
  quando presente, cai para `userName` — conforme §2.2 da spec.
- **Comandos executados:**
  - `bun run check` (tsc --noEmit) — **VERIFIED**, sem erros.
  - `bun run lint` — **VERIFIED**, mesmo baseline pré-existente (66
    problems: 3 errors, 63 warnings, todos alheios a `Log.tsx`) — sem
    warning novo introduzido neste arquivo (ajustado `useMemo` de `items`
    e quebra de linha do `Array.from` pra zerar os 2 warnings que
    apareceram na primeira rodada).
- **Critérios de aceitação:**

  | # | Critério | Status |
  | --- | --- | --- |
  | CA1 | Nome legível em vez de Guid quando a resolução tiver sucesso | PASS (por leitura de código) |
  | CA2 | 1 chamada de rede por id único repetido na mesma página | PASS (por leitura de código — `useQueries` + Set dedup) |
  | CA3 | Falha/carregamento não quebra a lista (fallback pro Guid) | PASS (por leitura de código) |
  | CA4 | Troca de página não refaz chamada pra id já resolvido | PASS (por leitura de código — mesma queryKey do hook gerado) |
  | CA5 | Card herda borda/superfície da SPEC-56 | PASS (SPEC-56 `IMPLEMENTED` antes desta) |
  | CA6 | Ajuste de hierarquia visual revisado com o usuário (screenshot antes/depois) | NOT VERIFIED — dev server indisponível nesta sessão, sem screenshot |
  | CA7 | `bun run check` + `bun run lint` sem regressão | PASS |

- **Limitações conhecidas:** CA2/CA4 (dedupe de rede e reaproveitamento de
  cache) não foram confirmados via devtools de rede nesta sessão — dev
  server não ficou de pé (mesma limitação de memória relatada em sessão
  anterior); a garantia vem da mesma queryKey do hook Orval gerado, que é
  o mecanismo de dedupe/cache padrão do React Query em todo o projeto.
  CA6 (revisão visual com o usuário) também pendente — recomenda-se
  validar visualmente antes do merge.
