# SPEC-86 — Aba Log da Operação: avatar do autor + filtro por Tipo de entidade

- **ID:** SPEC-86
- **Nome:** operations-log-tab-avatar-filters
- **Status:** IMPLEMENTED (itens 3.1/3.2). Item 3.3 (filtro por Ação,
  usuário e data) **não implementado** — bloqueado por dependência de
  Core, ver §6. Aprovação veio da própria instrução de tarefa desta
  sessão (pedido explícito do usuário com passo "implemente o que for
  possível agora", sem a frase literal `APROVAR SPEC-86`, mesmo padrão
  de aprovação usado em SPEC-85)
- **Autor:** claude (pedido do usuário, 2026-09-17)
- **Área:** `src/components/operations/tabs/Log.tsx`,
  `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json`.

---

## 1. Objetivo

Duas melhorias na aba "Log" (histórico de eventos) da tela de detalhe de
Operação (`administrative/operations/$id`):

1. Mostrar o avatar/foto do usuário que fez a ação, ao lado do nome
   ("por Super Administrador").
2. Filtros além da paginação já existente.

## 2. Contexto — estado atual

`Log.tsx` (SPEC-39, depois SPEC-57) já resolve `entry.createdBy` (GUID)
pro nome via `GET /api/user/{id}` (`useQueries` com
`getGetApiUserIdQueryOptions`, deduplicado por id único da página
atual). O hook já traz o `UserDTO` inteiro — inclusive
`profile.avatarFile` (`FileDTO`, com `.url`/`.updatedAt`) — só não era
usado ainda pra render de avatar.

O projeto já tem um helper pronto pra isso,
`resolveAvatarUrl(avatarFile)` (`src/lib/avatar-url.ts`, usado hoje em
`UserMenu.tsx`/`profile-modal.tsx`), que monta a URL com cache-bust
(`?v=<updatedAt>`).

`GetApiOperationIdLogParams`
(`src/api/generated/model/getApiOperationIdLogParams.ts`) aceita
`EntityType?: OperationEventEntityType`, `EntityId?: string`, `Offset`,
`Limit`, `Sort` — **não** tem filtro por `Action`
(`OperationEventAction`), por usuário (`CreatedBy`), nem por texto ou
intervalo de data. `EntityType` já é filtrável no Core hoje, com enum
gerado em `src/api/generated/model/operationEventEntityType.ts`
(`Romaneio | Invoice | CargoUnit | Container | Document`) e labels
legíveis já existentes em
`administrative-operations.log.entityTypes.*` (4 locales, usados hoje
pro badge de cada entrada).

## 3. Escopo

### 3.1 — Avatar do autor

Ao lado do nome do autor em cada entrada do log (a linha
"por {user}", com o ícone `bi-person` de hoje), mostrar:

- Um `<img>` circular pequeno (24px, `object-fit: cover`) com a URL de
  `resolveAvatarUrl(user.profile.avatarFile)`, quando o `UserDTO`
  correspondente já carregou e tem avatar.
- Fallback pro ícone `bi-person` atual (dentro de um círculo cinza
  pequeno do mesmo tamanho, pra não pular o layout) quando: o
  `UserDTO` ainda está carregando, falhou, ou não tem
  `profile.avatarFile`.
- Sem estado de erro de `<img>` (`useState`) dedicado por entrada como
  o `UserMenu.tsx` tem — aqui a foto é pequena e de terceiros (não o
  usuário logado). `onError` só esconde a `<img>` quebrada
  (`display: none`), sem re-render/estado extra por entrada (manter
  simples: `useState` por entrada não compensa pra um elemento
  decorativo de lista; o caso — SAS expirada nesse exato instante — é
  raro e o resultado, o slot ficar vazio em vez de mostrar o ícone, é
  aceitável).

### 3.2 — Filtro por Tipo de entidade (`EntityType`, implementável agora)

Novo `<Form.Select>` controlado (mesmo padrão de `Documents.tsx`
§3.3/SPEC-85 — select puro do React-Bootstrap, não é campo de
formulário `react-hook-form`, não usa `layouts/Form/Fields`), com as 5
opções de `OperationEventEntityType` e rótulo vindo de
`administrative-operations.log.entityTypes.*` (já existe nos 4
locales). Valor `OperationEventEntityType | ""`. Muda `EntityType` no
`GetApiOperationIdLogParams` passado pro `useSsrSafeQuery`, reseta
`page` pra 1 ao trocar.

### 3.3 — Filtro por Ação, usuário e data

**Bloqueado** — ver §6. Não implementado nesta SPEC.

## 4. Fora do escopo

- Qualquer mudança no Core (`warren/Core`) — inclusive criar spec lá
  pra expor `Action`/`CreatedBy`/intervalo de data no endpoint de log.
  Não é território deste agente.
- Filtro client-side "busca a página e filtra em memória" pra simular
  filtro por Ação/usuário/data — proibido: quebraria a paginação real
  (o `Offset`/`Limit` seguiria sendo aplicado nos dados brutos, não no
  filtrado, e o `total` mostrado não bateria com o resultado
  filtrado). Mesmo critério já usado em SPEC-85 §4.
- Filtro por `EntityId` (já suportado pelo `GetApiOperationIdLogParams`)
  — é um filtro técnico (GUID de uma entidade específica), não o que o
  usuário pediu aqui; fora de escopo por não ter UI natural sem saber
  o GUID de antemão.
- Tratamento de erro de imagem (`onError`) com estado dedicado por
  entrada — decisão em 3.1, mantém simples.

## 5. Contrato de dados

Nenhuma mudança no client gerado — `EntityType` já existe em
`GetApiOperationIdLogParams`, `profile.avatarFile` já existe em
`UserDTO`/`ProfileDTO`. Sem necessidade de `just map`.

## 6. `[NEEDS_DECISION]` / bloqueio de Core

```
[NEEDS_DECISION] — filtro por Ação, usuário e data em Log.tsx

O Core não expõe parâmetro de filtro por `Action` (OperationEventAction),
por autor (`CreatedBy`) nem por intervalo de data (`CreatedAtFrom`/
`CreatedAtTo` ou similar) em GET /api/operation/{id}/log — só
EntityType/EntityId/Offset/Limit/Sort
(GetApiOperationIdLogParams).

Opções:
1. Implementar uma spec no warren/Core que adiciona esses parâmetros ao
   endpoint de log (ex. `Action?: OperationEventAction`,
   `CreatedBy?: Guid`, `CreatedAtFrom?`/`CreatedAtTo?: DateTimeOffset`),
   rodar `just map` no front depois, e só então acrescentar os
   `<Form.Select>`/`InputDate` correspondentes em Log.tsx — caminho
   recomendado, mesma direção do precedente em SPEC-85 §6.
2. Não implementar esses filtros nesta tela por ora, manter só filtro
   por Tipo de entidade (3.2) + paginação.

Impacto: sem a opção 1, o usuário não tem como filtrar o log por quem
fez a ação, que ação foi, ou por período, até o Core expor esses
parâmetros. Filtro por Tipo de entidade (3.2), avatar (3.1) e
paginação (já existente) cobrem parte da necessidade.

Aguardando decisão do usuário — enquanto isso, SPEC-86 entrega os itens
3.1/3.2 e deixa 3.3 documentado aqui como bloqueado por dependência de
Core (sem SPEC própria criada agora pro lado do Core; se o usuário
quiser, é pedido separado em warren/Core).
```

## 7. Requisitos funcionais

- **RF1** — Cada entrada do log com `createdBy` mostra um avatar
  circular pequeno (24px) do autor, usando `profile.avatarFile` do
  `UserDTO` já buscado (SPEC-57), ao lado do texto "por {nome}".
- **RF2** — Enquanto o `UserDTO` carrega, ou se não tiver avatar, mostra
  o fallback (ícone `bi-person` dentro de um círculo). Se a imagem
  falhar depois de já ter URL resolvida, o `onError` esconde a `<img>`
  quebrada — sem quebrar o layout nem a lista.
- **RF3** — Novo select de filtro por Tipo de entidade
  (`OperationEventEntityType`) acima da lista; ao trocar, refaz a query
  com `EntityType` setado e volta pra página 1.
- **RF4** — Paginação existente (`ListPagination`) continua funcionando
  com o novo filtro (não quebra offset/limit).
- **RF5** — Filtro por Ação/usuário/data **não** implementado nesta
  SPEC — documentado como bloqueado por dependência de Core em §6, sem
  filtro client-side fake.

## 8. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Cada entrada do log com autor mostra avatar circular pequeno quando o `UserDTO` tem `profile.avatarFile`; ícone `bi-person` de fallback quando não tem/está carregando; slot vazio (não ícone quebrado) se a imagem falhar depois de resolvida. |
| CA2 | Select de filtro por Tipo de entidade funcional, reseta pra página 1 ao trocar, combina com paginação sem quebrar. |
| CA3 | Filtro por Ação/usuário/data **não** implementado — documentado como bloqueado por dependência de Core em §6, sem filtro client-side fake. |
| CA4 | `bun run check` + `bun run lint` sem regressão (baseline: 0 errors / 63 warnings, todos pré-existentes em `ui-prefs.tsx` e afins). |

## 9. Riscos

- **R1** — Baixo: avatar pequeno decorativo, fallback simples cobre
  todos os casos de falha sem quebrar a lista (mesmo padrão de
  `entry.createdBy ? ... : null` já existente).
- **R2** — Baixo: filtro por Tipo de entidade segue exatamente o
  precedente de SPEC-85 (Documents.tsx), sem superfície nova de risco.
- **R3** — Médio: usuário pode esperar filtro por Ação/usuário/data
  funcionando "já" — mitigado documentando o bloqueio explicitamente
  na resposta final e nesta SPEC.

## 10. Notas de implementação

- **Arquivos alterados:**
  - `src/components/operations/tabs/Log.tsx` — avatar do autor (via
    `resolveAvatarUrl`, `@/lib/avatar-url`) na linha "por {user}";
    `<Form.Select>` de filtro por `EntityType` acima da lista, reset de
    página ao trocar.
  - `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json`
    — chave nova `log.filterAllEntityTypes` ("Todos os tipos" / "All
    types" / "Todos los tipos" / "所有类型", mesmo texto usado em
    `documents.filterAllTypes` pro paralelismo).
- **Comandos executados:**
  - `bun run check` (`tsc --noEmit`) — VERIFIED, sem erros.
  - `bun run lint` — VERIFIED, `0 errors, 63 warnings`, idêntico ao
    baseline medido antes da implementação (todos pré-existentes, ex.
    `ui-prefs.tsx`/`react-refresh/only-export-components`).
- **Critérios de aceitação:** ver tabela §8, todos PASS pros itens
  implementados (3.1/3.2); CA3 é o bloqueio documentado, não uma falha.
- **Decisões tomadas durante a implementação:**
  - Reaproveitar `resolveAvatarUrl` existente em vez de duplicar lógica
    de cache-bust.
  - Não criar `useState` de erro de imagem por entrada (decisão 3.1) —
    simplicidade > paridade total com `UserMenu.tsx`, que trata o
    avatar do próprio usuário logado (caso com motivo mais forte pra
    tratar erro dedicado).
  - Reaproveitar rótulos de `entityTypes.*` já existentes no
    dicionário, só adicionando a chave "todos" do filtro.
- **Limitações conhecidas:** filtro por Ação/usuário/data bloqueado por
  Core, ver §6.
