# SPEC-21 — Operações: aba Responsáveis troca filtro de vínculo por filtro de papel

- **ID:** SPEC-21
- **Nome:** operations-responsible-role-filter
- **Status:** IMPLEMENTED (2026-09-16) — Fase 1 e Fase 2, ver §14
  (Implementation Notes). Fase 2 destravada pela SPEC-39 do Core
  (`GET .../responsible/eligible-users`, `IMPLEMENTED`).
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/components/operations/tabs/Responsible.tsx` (edição —
  SPEC-16, `IMPLEMENTED`), `src/i18n/dictionaries/**` (namespace
  `administrative-operations.responsible`)
- **Depende de:** SPEC-16 (`operation-responsible-real`, `IMPLEMENTED` —
  troca de mock por dado real do módulo `Responsible` do Core)
- **Bloqueia:** nada (Fase 1 aprovada e implementável já; Fase 2 formalmente
  bloqueada aguardando SPEC própria do Core — ver §6 e §13)
- **Contexto do pedido:** segundo item de uma lista de pequenas SPECs
  dedicadas à feature de Operações, pedidas uma a uma pelo usuário depois
  do fechamento de `SPECS-LEGADO → main`. Item 1 (preview de documento) é
  `specs/20-operations-document-preview-modal` — em andamento por outro
  agente em paralelo; esta SPEC não toca `Documents.tsx` nem o modal de
  preview.

---

## 1. Objetivo

Corrigir a aba **Responsáveis** do detalhe de Operação
(`OperationResponsibleTab`) em dois pontos apontados pelo usuário:

1. **Remover** o filtro "Vinculados / Não vinculados" — dead UI real, sem
   utilidade com o endpoint atual (a lista **é**, por definição, sempre
   "vinculados").
2. **Trocar** esse filtro por um filtro de **papel** (`role`/`type` do
   usuário) sobre a própria lista de vinculados.
3. Restringir a busca do botão "Vincular" (`SelectAsync` + `getApiUser`) a
   usuários **ativos** e **ainda não vinculados** a esta operação — parte
   dessa correção esbarra numa lacuna do client gerado (§6).

## 2. Contexto

### 2.1 SPEC-16 e o código atual

SPEC-16 (`IMPLEMENTED`) trocou o mock da aba por dado real
(`useGetApiOperationOperationIdResponsible`), mas manteve na UI um filtro
"Vinculados / Não vinculados" (`LinkedFilter`) que já era sabido, no
próprio texto da SPEC-16 (§"Decisões tomadas", trecho final), como sem
utilidade real:

> "Filtro 'vinculado/não vinculado' (...) foi mantido na UI como pedido,
> mas como a fonte de dado real só contém vínculos, a opção 'não vinculado'
> sempre resulta em lista vazia — documentado em comentário no código."

O comentário citado está em
`src/components/operations/tabs/Responsible.tsx:122-126`:

```tsx
// RF do CA2: o endpoint só devolve vínculos já criados, então todo item
// desta lista está sempre "linked" — o filtro "não vinculados" continua
// existindo na UI (RF da SPEC-16), mas nunca tem resultado com o dado
// real (não há mais candidato solto pra exibir aqui).
if (linkedFilter === "unlinked") return false;
```

O usuário confirmou agora, de forma explícita, que isso deve sair: a lista
da aba **só** mostra vinculados (sem opção de status de vínculo), e o
filtro que faz sentido ali é por **papel** — os mesmos badges já exibidos
em cada card (linhas 222-231): `user.type` (`Internal`/`External`,
namespace `roles.*`) e `user.roles` (array de `InternalRole`:
`Agent`/`Supervisor`/`Laboratory`, mesmo namespace).

### 2.2 Botão "Vincular" hoje (`fetchUserOptions`, linhas 71-77)

```tsx
const fetchUserOptions = (userSearch: string) =>
  getApiUser({ Search: userSearch, Limit: 20 }).then((res) =>
    res.items.map((user) => ({
      value: user.id,
      label: user.profile.fullName || user.profile.email,
    })),
  );
```

Busca em `getApiUser` (`GET /api/user`) sem nenhum filtro de status nem
exclusão de quem já está vinculado a esta operação — um usuário inativo
aparece na busca, e um usuário já vinculado pode ser selecionado de novo
(o `POST` provavelmente falha ou duplica, dependendo do que o Core faz —
não testado, fora do escopo confirmar aqui).

### 2.3 O que `GetApiUserParams` já aceita hoje

Lido em `src/api/generated/model/getApiUserParams.ts` (gerado, `just map`,
não editável à mão):

```ts
export type GetApiUserParams = {
  Search?: string;
  IsActive?: boolean;
  IsAdmin?: boolean;
  Type?: UserType;
  Role?: InternalRole;
  Offset?: number | string;
  Limit?: number | string;
  Sort?: string;
};
```

**Achado relevante:** `IsActive?: boolean` **já existe**. A parte "usuários
ativos" do pedido do usuário **não precisa de endpoint novo** — basta
passar `IsActive: true` em `fetchUserOptions`. O que falta é só a parte
"ainda não vinculados a esta operação" (§6).

## 3. Escopo

**Fase 1 — `APPROVED`, implementável já** (sem dependência de Core):

1. Remover o estado `linkedFilter`, o tipo `LinkedFilter`, o array
   `linkedFilterOptions` e o `btn-group` de "Vinculados/Não vinculados".
2. Adicionar filtro por papel sobre a lista já carregada
   (`query.data`), cruzando `user.type` e `user.roles` — multi-seleção via
   `btn-group` (ver §8/§9, default de UX confirmado, sem objeção do
   usuário até a aprovação).
3. Adicionar `IsActive: true` em `fetchUserOptions` (`getApiUser`) — não
   depende do Core, o param já existe no client gerado.
4. Ajustar i18n: remover `filter.all/linked/unlinked`, adicionar chaves do
   filtro de papel.

**Fase 2 — `BLOCKED`** (decisão do usuário, ver §13: esperar o Core, sem
alternativa client-side):

5. Excluir da busca do `SelectAsync` de "Vincular" os usuários já
   vinculados a esta operação. Não implementar até existir SPEC própria no
   Core (`core-spec-agent`) com o endpoint/parâmetro dedicado, aprovada
   separadamente, e o client gerado (`just map`) refletir isso.

## 4. Fora do escopo

- Qualquer mudança em `Documents.tsx` ou no modal de preview de arquivo
  (SPEC-20, outro agente, em paralelo).
- Mudar o comportamento de vincular/desvincular em si (`POST`/`DELETE`),
  só a busca que alimenta o `SelectAsync`.
- Endpoint novo no Core — esta SPEC só **registra** a necessidade (§6), não
  desenha o contrato (isso é SPEC própria do `core-spec-agent`).

## 5. Requisitos funcionais

- **RF1** — Remover completamente o filtro "Vinculados / Não vinculados"
  (`LinkedFilter`, `linkedFilterOptions`, o `btn-group` correspondente e o
  comentário em `Responsible.tsx:122-126` que documentava a limitação). A
  lista da aba não tem mais controle de status de vínculo — é sempre a
  lista de vinculados, ponto.
- **RF2** — Novo filtro por papel, operando client-side sobre `query.data`
  (a lista já carregada de `ResponsibleDTO[]`), com múltipla seleção
  ("include" = mostra quem tem **qualquer uma** das roles marcadas — `OR`,
  não `AND`). Opções do filtro = união de `user.type`
  (`Internal`/`External`) e `user.roles` (`Agent`/`Supervisor`/
  `Laboratory`), reusando as mesmas chaves de tradução já existentes em
  `administrative-operations.responsible.roles.*` (nenhuma chave de rótulo
  nova, só a estrutura do filtro). Sem seleção nenhuma = sem filtro (mostra
  todos, mesmo comportamento do "Todos os vínculos" antigo).
- **RF3** — `fetchUserOptions` (busca do `SelectAsync` de "Vincular") passa
  `IsActive: true` em toda chamada a `getApiUser` — filtro de "usuário
  ativo" resolvido sem depender do Core (já existe no client gerado).
- **RF4 (Fase 2, `BLOCKED`)** — `fetchUserOptions` não deve devolver
  usuários já vinculados a esta operação. Decisão do usuário (§13): só via
  filtro/endpoint que o próprio Core resolva (§6) — a alternativa
  client-side (opção 3 de §6, comparar `query.data` contra `getApiUser`)
  foi **recusada explicitamente**, não deve ser implementada. RF4 fica
  parado até existir SPEC própria do Core, aprovada, e o `just map`
  correspondente.
- **RF5** — Busca de texto (nome/email) já existente continua funcionando
  em conjunto com o filtro de papel (RF2), sem regressão.

## 6. `[NEEDS_DECISION]` — dependência do Core (bloqueia RF4/Fase 2)

Investigação confirmou que **falta** algo no client gerado hoje:

- `GetApiUserParams` (`GET /api/user`) não tem nenhum parâmetro para
  excluir uma lista de ids, nem para receber um `operationId` e o próprio
  Core resolver "quem ainda não está vinculado a esta operação".
- Não existe, em `src/api/generated/endpoints/responsible/**` ou
  `src/api/generated/endpoints/operation/**`, nenhum endpoint do tipo
  "usuários elegíveis para vincular nesta operação" — só existem
  `GET/POST /api/operation/{operationId}/responsible` e
  `DELETE .../responsible/{id}` (lista/cria/remove vínculo já existente,
  confirmado em `src/api/generated/endpoints/responsible/responsible.ts`).

**Requisito funcional do ponto de vista do consumidor** (o que o front
precisa poder perguntar ao Core — sem desenhar o contrato, isso é escopo
do `core-spec-agent`):

> Dado um `operationId`, o front precisa de uma forma de buscar usuários
> (por nome/email, paginado, como já faz `getApiUser`) que sejam **ativos**
> **e** que **ainda não tenham vínculo de responsável nesta operação** —
> seja um novo parâmetro em `GET /api/user` (algo como excluir por
> `operationId` ou por lista de ids), seja um endpoint dedicado do módulo
> `Responsible`.

Opções levantadas (não é decisão do `portal-dev-agent`, é do Core):

1. Novo parâmetro em `GetApiUserParams` (ex.: excluir por `operationId` —
   o Core já sabe os vínculos da operação e filtra internamente).
2. Endpoint dedicado no módulo `Responsible` (ex.:
   `GET /api/operation/{operationId}/responsible/eligible-users` ou
   equivalente) que já devolve só quem pode ser vinculado.
3. Filtragem 100% client-side comparando `query.data` (lista de vinculados
   já carregada, sem paginação) contra o resultado de `getApiUser` — **não
   recomendado**: `query.data` já é a lista completa de vinculados desta
   operação (sem paginação, ao contrário de `getApiUser`), então dá pra
   excluir os ids client-side sem endpoint novo, mas isso degrada se a
   lista de vinculados crescer muito, e ainda depende do usuário digitar
   pra achar quem falta — não resolve "mostrar só quem pode ser vinculado"
   de forma robusta.

**Nota:** a opção 3 acima é tecnicamente viável **sem** mudança no Core
(comparar `userId` de `query.data` contra o resultado de `getApiUser` e
filtrar no `.then()` de `fetchUserOptions`), mas troca uma lacuna de
contrato por uma gambiarra client-side. **Decisão do usuário (2026-09-15,
ver §13): recusada.** Fase 2 fica formalmente `BLOCKED` até existir SPEC
própria no Core (via `core-spec-agent`) com o endpoint/parâmetro dedicado
(opção 1 ou 2 acima), aprovada separadamente, e o client gerado atualizado
via `just map`.

## 7. Camada de dados

- RF1/RF2/RF5: nenhuma mudança de camada de dados — filtro roda sobre
  `query.data` já carregado por
  `getGetApiOperationOperationIdResponsibleQueryOptions(operationId)`
  (inalterado).
- RF3: `fetchUserOptions` continua chamando `getApiUser` diretamente
  (mesmo padrão hoje), só adiciona `IsActive: true` ao objeto de params.
- RF4 (Fase 2): depende do que o Core expuser (§6) — sem `just map`
  necessário até lá.

## 8. UI

- Remove o `btn-group` de "Vinculados/Não vinculados"
  (`Responsible.tsx:155-174`).
- Novo controle de filtro por papel no lugar (mesma coluna/posição): **UX
  proposta, decisão pendente de confirmação do usuário** (não é
  `[NEEDS_DECISION]` bloqueante, é uma proposta com default razoável) —
  grupo de botões toggle multi-seleção (`btn-group`, mesmo padrão visual
  já usado no filtro antigo), um botão por opção
  (`Internal`/`External`/`Agent`/`Supervisor`/`Laboratory`), cada um
  alternando `active`/`outline` independentemente (não é mais
  single-select como o filtro antigo). Se o usuário preferir um
  `Dropdown` com checkboxes (mais compacto pra 5 opções) em vez de 5
  botões lado a lado, é só sinalizar antes da aprovação.
- Resto do layout do card (badges de papel, botão "Desvincular", busca por
  texto) não muda.

## 9. i18n

Namespace `administrative-operations.responsible` (4 locales:
`pt-BR`/`en`/`es`/`zh`):

- **Remove:** `filter.all`, `filter.linked`, `filter.unlinked` (dead após
  RF1).
- **Adiciona:** `filter.byRole` (label/aria do grupo de filtro, ex.:
  "Filtrar por papel") e `filter.clear` (ação de limpar seleção, se o
  controle final precisar de um botão "limpar" explícito — a definir na
  implementação conforme o controle escolhido em §8).
- `roles.*` (`Internal`/`External`/`Agent`/`Supervisor`/`Laboratory`) já
  existe (SPEC-16) e é reaproveitado como rótulo das opções do filtro —
  nenhuma chave nova ali.

## 10. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | `Responsible.tsx` não tem mais `LinkedFilter`/`linkedFilter`/`linkedFilterOptions`, nem o comentário de `unlinked` sempre vazio |
| CA2 | Filtro por papel é multi-seleção, opera sobre `query.data`, `OR` entre roles marcadas, vazio = sem filtro |
| CA3 | `fetchUserOptions` passa `IsActive: true` em toda chamada a `getApiUser` |
| CA4 | Busca por texto (RF5) continua combinando com o filtro de papel sem regressão |
| CA5 | i18n: 4 locales com as mesmas chaves (`pt-BR` fonte de verdade), sem chave órfã (`filter.all/linked/unlinked` removidas de todos) |
| CA6 | `bun run check` + `bun run lint` sem regressão de baseline |
| CA7 (Fase 2, `BLOCKED` — só avaliável após SPEC do Core) | `fetchUserOptions` não retorna usuário já vinculado a esta operação |

## 11. Riscos

- **R1** — Se `query.data` ficar grande (operação com muitos responsáveis),
  filtrar roles client-side é barato (mesma lista já em memória usada pela
  busca de texto), sem novo risco de performance.
- **R2** — Enquanto a Fase 2 não é destravada (§6), o botão "Vincular"
  continua podendo sugerir um usuário já vinculado — mesma limitação que
  existe hoje (SPEC-16 não resolveu isso), não é regressão desta SPEC.

## 12. Decisões pendentes

1. **Proposta de UX não bloqueante (§8)** — multi-select via `btn-group` de
   5 toggles vs. `Dropdown` com checkboxes. Segue com `btn-group` (mesmo
   padrão visual já usado na aba) se o usuário não sinalizar preferência
   diferente durante a implementação.

Sem outras decisões pendentes para a Fase 1 — ver §13 para o registro da
decisão que resolveu o `[NEEDS_DECISION]` do §6.

## 13. Decisão do usuário sobre a Fase 2 (2026-09-15)

O usuário decidiu **esperar o Core** — não usar a alternativa client-side
(opção 3 do §6). Registro:

- **Fase 1** (RF1 remover filtro Vinculados/Não-vinculados, RF2 filtro
  multi-select por papel via `btn-group`, RF3 `IsActive: true`) —
  `APPROVED`, implementável já.
- **Fase 2** (RF4, excluir usuários já vinculados da busca de "Vincular")
  — fica formalmente **`BLOCKED`** até existir SPEC própria no Core (via
  `core-spec-agent`, fronteira Core×NewPortal do `AGENTS.md` raiz do ASC)
  com o endpoint/parâmetro dedicado, e aprovação separada dessa SPEC do
  Core. Nenhuma filtragem client-side de contorno deve ser implementada
  nesta SPEC.
- Registrado também na tabela "Débitos de integração em aberto" do
  `AGENTS.md` raiz do ASC (`/mnt/unohana/Root/Trabalhos/Programacao/
AlexStwart/ASC/AGENTS.md`), citando esta SPEC.

Ao implementar a Fase 1: RF4/CA7 e o comentário de "opção 3 recusada" (§6)
permanecem como documentação — nenhum código relacionado a excluir
já-vinculados deve ser escrito nesta rodada.

## 14. Implementation Notes (2026-09-16)

Fase 1 e Fase 2 implementadas juntas, na mesma rodada, porque a SPEC-39
do Core (`GET /operation/{operationId}/responsible/eligible-users`) foi
aprovada e implementada primeiro — destravando o `[NEEDS_DECISION]` do
§6 antes de eu tocar em `Responsible.tsx`.

**RF1** — `LinkedFilter`, `linkedFilter`, `linkedFilterOptions` e o
comentário de "unlinked sempre vazio" removidos por completo de
`Responsible.tsx`.

**RF2** — Novo `roleFilter: Set<RoleFilterKey>` (`RoleFilterKey = UserType
| InternalRole`), `ROLE_FILTER_OPTIONS` fixo com as 5 opções
(`Internal`/`External`/`Agent`/`Supervisor`/`Laboratory`), reaproveitando
as chaves `roles.*` já existentes (nenhum rótulo novo). `btn-group` de 5
toggles (decisão §12 seguida sem objeção do usuário durante a
implementação — não sinalizou preferência por `Dropdown`), `OR` entre
selecionados, vazio = sem filtro. Adicionei um botão "Limpar filtro"
(`filter.clear`) que só aparece com alguma seleção ativa — não estava no
RF2 literal, mas é a forma óbvia de zerar um multi-select sem re-clicar
em cada toggle, dentro do espírito de "UX proposta, sem objeção" do §8.

**RF3/RF4 (Fase 2)** — `fetchUserOptions` trocou de `getApiUser` pra
`getApiOperationOperationIdResponsibleEligibleUsers(operationId, {
Search, Limit: 20 })` (client gerado via `just map` contra o Core local
com a SPEC-39). Como o endpoint novo já fixa `Type = Internal`, `IsActive
= true` e exclui quem já tem vínculo (tudo server-side, SPEC-39 §3), RF3
("`IsActive: true`") e RF4 ("não devolver já vinculado") saem resolvidos
de graça, sem parâmetro extra no front — mais simples do que o RF3
literal previa (que assumia continuar em `getApiUser` só com `IsActive`
adicionado).

**RF5** — Busca de texto inalterada, continua combinando com o filtro de
papel (mesmo `useMemo`, ordem dos filtros ajustada: papel primeiro, texto
depois — mesmo resultado, `AND` entre os dois).

**i18n** — `filter.all`/`filter.linked`/`filter.unlinked` removidas dos 4
locales; `filter.byRole` e `filter.clear` adicionadas nos 4
(`pt-BR`/`en`/`es`/`zh`), mesmo texto/estrutura em todos.

**Arquivos alterados:**
- `src/components/operations/tabs/Responsible.tsx`
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json`
- `src/api/generated/**` (via `just map` contra o Core local, SPEC-39)

**Validação:** `just map` (`orval` + `staticSnapshots` + `tsc --noEmit`)
limpo, diff do client gerado restrito ao endpoint novo (sem drift
inesperado de outras SPECs do Core). `bun run check` e `bun run lint`
sem nenhum finding em `Responsible.tsx` nem nos dicionários tocados.
CA1-CA6 verificáveis em código; CA7 (Fase 2) passa a ser válido agora que
a SPEC-39 saiu do papel.

**Correção pós-implementação (2026-09-16, mesmo dia, pedido do
usuário):** RF2 original incluía `user.type` (`Internal`/`External`) nas
opções do filtro (§9 "união de `user.type` e `user.roles`"). O usuário
apontou que isso não faz sentido — Responsável de Operação só pode ser
staff interno (a própria Fase 2/SPEC-39 já garante isso na busca de
vincular), então a distinção `Internal`/`External` nunca varia na
prática e não serve como filtro. `ROLE_FILTER_OPTIONS` reduzido pra só
`InternalRole` (`Agent`/`Supervisor`/`Laboratory`, os 3 papéis reais —
"Operador" citado pelo usuário corresponde ao badge `Supervisor`, rótulo
de tradução inalterado, `roles.Supervisor` continua "Supervisor(a)" em
pt-BR; nenhuma renomeação de rótulo foi pedida, só redução do escopo do
filtro), `RoleFilterKey` agora é só `InternalRole` (não mais união com
`UserType`), lógica do `useMemo` simplificada pra só `matchesRole`. O
badge de `user.type` no card de cada linha (RF já existente da SPEC-16)
**não muda** — só o filtro. `bun run check`/`lint` revalidados, sem
findings novos.

**Segunda correção pós-implementação (2026-09-16, mesmo dia, pedido do
usuário):** opções do filtro trocadas de lista hardcoded
(`ROLE_FILTER_OPTIONS: RoleFilterKey[]`) pro snapshot estático gerado do
enum real do Core — `internalRoleOptions`/`resolveInternalRoleLabel`
(`src/api/generated/static/internalRoleOptions.ts`, `x-snapshot` de
`GET /api/user/roles`, `just map`), mesmo padrão já usado em
`src/data/admin-roles.ts` e `admin/access/index.tsx` (bind por
`opt.key`, label via `resolveInternalRoleLabel(key, locale)` com
`useLocale()`). Motivo: evita 2 fontes de verdade divergentes pro mesmo
enum (lista hardcoded no componente vs. dicionário `roles.*` vs. o
enum real do Core) — se o Core ganhar um `InternalRole` novo, o filtro
agora aparece sozinho depois de um `just map`, sem editar
`Responsible.tsx`. Os badges de papel no card de cada linha (SPEC-16)
continuam via `t("...roles.*")` do dicionário local — não fazem parte
deste pedido, ficaram fora do escopo desta correção.
