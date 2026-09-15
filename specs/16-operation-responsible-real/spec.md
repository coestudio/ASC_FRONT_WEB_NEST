# SPEC-16 — Operações: aba Responsáveis vira real

- **ID:** SPEC-16
- **Nome:** operation-responsible-real
- **Status:** IMPLEMENTED
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/components/operations/tabs/Responsible.tsx` (editado, sem
  rota nova)
- **Depende de:** SPEC-07-08 (`operation-responsible`, `IMPLEMENTED`,
  UI-only) — esta SPEC resolve a decisão D1 deixada em aberto lá.

---

## 1. Objetivo

Trocar a aba **Responsáveis** do detalhe da Operação de mock (array local
`MOCK_RESPONSIBLES`) para dado real, consumindo o módulo `Responsible` do
Core, já gerado e nunca antes exercitado.

## 2. Contexto

A SPEC-07-08 implementou a aba como UI-only por decisão explícita (D1),
registrando o risco de que a API gerada (`ResponsibleApi`) pudesse ter
alguma lacuna nunca testada. Investigação desta SPEC confirmou que **não
há lacuna** — o contrato está completo e simétrico:

- `GET /api/operation/{operationId}/responsible` — lista responsáveis
  vinculados (`GetApiOperationOperationIdResponsibleResponse`, array de
  `{ id, operationId, userId, user: UserDTO, createdAt, updatedAt }`).
- `POST /api/operation/{operationId}/responsible` — vincula um usuário
  (`PostApiOperationOperationIdResponsibleBody = { userId }`).
- `DELETE /api/operation/{operationId}/responsible/{id}` — desvincula
  (usa o `id` do vínculo, não o `userId`).

Fonte de usuários pra buscar/vincular: `GET /api/user` (`getApiUser`),
já com `Search`/`Limit`/`Role` — mesmo padrão de `SelectAsync` já usado em
Cliente/Produto/Navio/Container.

## 3. Escopo

1. Substituir `MOCK_RESPONSIBLES`/`MOCK_ROLES`/estado local de vínculo por:
   - `useGetApiOperationOperationIdResponsible(operationId)` — lista real.
   - `usePostApiOperationOperationIdResponsible()` — vincular (via
     `SelectAsync` buscando em `getApiUser`, mesmo padrão de
     `fetchClientOptions`/`fetchContainerOptions`).
   - `useDeleteApiOperationOperationIdResponsibleId()` — desvincular.
2. Remover `<MockDataBanner />` da aba (deixa de ser mock).
3. Trocar os papéis mock (`coordinator/analyst/assistant/supervisor`) pelos
   reais do Core: `user.type` (`Internal`/`External`) e `user.roles`
   (array de `Agent`/`Supervisor`/`Laboratory`) — exibidos como badges no
   card, sem inventar rótulo que o Core não modela.
4. Filtro de busca (nome/email) e filtro "vinculado/não vinculado"
   continuam, mas operando sobre o dado real.
5. `invalidateQueries` da query de lista após vincular/desvincular (mesmo
   padrão de `invalidateList()` de `operations-list.tsx`).

## 4. Fora do escopo

- Filtro por `role`/`type` real (pode ficar pra iteração futura se você
  quiser — nesta rodada só troco mock por real, sem adicionar filtro novo
  não pedido).
- Qualquer mudança em `Log`/`Relatórios` (fora desta SPEC).

## 5. Requisitos funcionais

- **RF1** — Lista de responsáveis consome só `useGetApiOperationOperationIdResponsible`, nunca mock.
- **RF2** — Vincular abre busca de usuário (`SelectAsync` + `getApiUser`,
  `Search`/`Limit=20`) e dispara `usePostApiOperationOperationIdResponsible`.
- **RF3** — Desvincular dispara `useDeleteApiOperationOperationIdResponsibleId`
  usando o `id` do vínculo (não o `userId`).
- **RF4** — Toast de sucesso/erro nas duas ações (mesmo padrão de
  `administrative-operations.toast.*`, chaves novas no namespace da aba).
- **RF5** — Sem silent-fail: erro de carregamento mostra mensagem, não
  lista vazia disfarçada.

## 6. Camada de dados

Hooks Orval já gerados, path `/api/operation/{operationId}/responsible` —
queryKey própria do hook (`getGetApiOperationOperationIdResponsibleQueryKey`).
Nenhum `just map` necessário (endpoint já existe no client gerado).

## 7. UI

Mesmo componente (`OperationResponsibleTab`), mesmo layout de cards — só
troca a fonte de dado e o vínculo por chamadas reais. Botão "Vincular"
abre um `SelectAsync` (inline ou modal pequeno, a definir na implementação)
pra buscar usuário por nome; ao escolher, dispara o `POST` imediatamente
(mesmo padrão sem botão de salvar extra do `Select` de status em
`OperationHeader`).

## 8. i18n

Chaves novas em `administrative-operations.responsible.*` (4 locales):
- `roles.Internal`/`roles.External` (tipo de usuário)
- `roles.Agent`/`roles.Supervisor`/`roles.Laboratory` (papel interno)
- `linkPlaceholder` (placeholder do `SelectAsync` de busca de usuário)
- `toast.linked`/`toast.unlinked`/`toast.error`/`toast.loadError`

Remove as chaves antigas de papel mock (`roles.coordinator/analyst/assistant/supervisor`)
se não usadas em mais nenhum lugar.

## 9. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | `OperationResponsibleTab` não importa `MOCK_RESPONSIBLES`/`MockDataBanner` |
| CA2 | Lista vem de `useGetApiOperationOperationIdResponsible`, filtrada client-side por busca/vínculo |
| CA3 | Vincular chama `POST` real com `userId` escolhido via `SelectAsync`/`getApiUser` |
| CA4 | Desvincular chama `DELETE` real com o `id` do vínculo |
| CA5 | `bun run check` + `bun run lint` sem regressão (baseline 66/3/63) |

## 10. Riscos

- **R1** — `user.roles` pode vir vazio pra usuários sem papel interno
  atribuído (ex. `External`) — tratar como "sem papel" na exibição, não
  quebrar.

## 11. Decisões pendentes

Nenhuma — API confirmada completa, sem gap.

## 12. Implementation Notes

**Arquivos alterados:**

- `src/components/operations/tabs/Responsible.tsx` — reescrito: sai
  `MOCK_RESPONSIBLES`/`MOCK_ROLES`/`MockDataBanner`; entram
  `useGetApiOperationOperationIdResponsible` (lista),
  `usePostApiOperationOperationIdResponsible` (vincular, via
  `SelectAsync` + `getApiUser`) e `useDeleteApiOperationOperationIdResponsibleId`
  (desvincular pelo `id` do vínculo). Componente passa a receber
  `operationId` por prop (antes não recebia nenhuma).
- `src/routes/_dashboard/_internal/administrative/operations/$id/index.tsx`
  — repassa `operationId={id}` pra `<OperationResponsibleTab />`.
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json`
  — namespace `responsible`: remove `filter.allRoles` e `roles.
  {coordinator,analyst,assistant,supervisor}` (mock, sem outro consumidor);
  adiciona `linkPlaceholder`, `roles.{Internal,External,Agent,Supervisor,
  Laboratory}` (reais do Core) e `toast.{linked,unlinked,error,loadError}`.
  `searchPlaceholder` ajustado de "nome, função ou e-mail" pra "nome ou
  e-mail" nos 4 locales, já que o filtro por função (papel mock) saiu do
  escopo desta rodada (§4 da SPEC).

**Comandos executados:**

- `bun run check` — **VERIFIED**, `tsc --noEmit` sem erro.
- `bun run lint` — **VERIFIED**, `66 problems (3 errors, 63 warnings)`,
  idêntico ao baseline conhecido (3 erros pré-existentes em
  `session.server.ts`, 63 warnings pré-existentes) — zero regressão.
- `just map` — não rodado (RF6/§6 da SPEC: endpoint já existia no client
  gerado, nenhuma mudança de contrato).

**Critérios de aceitação:**

| # | Critério | Resultado |
| --- | --- | --- |
| CA1 | `OperationResponsibleTab` não importa `MOCK_RESPONSIBLES`/`MockDataBanner` | PASS |
| CA2 | Lista vem de `useGetApiOperationOperationIdResponsible`, filtrada client-side por busca/vínculo | PASS |
| CA3 | Vincular chama `POST` real com `userId` escolhido via `SelectAsync`/`getApiUser` | PASS |
| CA4 | Desvincular chama `DELETE` real com o `id` do vínculo | PASS |
| CA5 | `bun run check` + `bun run lint` sem regressão (baseline 66/3/63) | PASS |

**Decisões tomadas durante a implementação:**

- O endpoint `GET /api/operation/{operationId}/responsible` só devolve
  vínculos já criados (não uma lista combinada de "todos os usuários +
  status de vínculo", como o mock simulava). Por isso o botão "Vincular"
  virou uma ação de topo que abre um `Modal` com `SelectAsync` pra buscar
  qualquer usuário do Core (`getApiUser`) e criar o vínculo — em vez do
  padrão antigo de alternar link/unlink direto numa lista fixa de
  candidatos. Cada card da lista real só mostra "Desvincular" (a única ação
  que faz sentido sobre um vínculo já existente). Mantido dentro do texto
  da SPEC (§7: "SelectAsync inline ou modal pequeno, a definir na
  implementação").
- Filtro "vinculado/não vinculado" (RF/§3.4) foi mantido na UI como pedido,
  mas como a fonte de dado real só contém vínculos, a opção "não vinculado"
  sempre resulta em lista vazia — documentado em comentário no código.
  Nenhum filtro novo foi adicionado (fora do escopo, §4); o antigo filtro
  por papel (`Select` de `role`) foi removido porque operava sobre
  `MOCK_ROLES` e não tem equivalente 1:1 direto sem duplicar um `Select`
  cruzando `type`/`roles` — não pedido no RF4 (que só cita busca e
  vínculo continuando).
- Papéis exibidos como badges (`user.type` + cada item de `user.roles`),
  sem combinar num rótulo único inventado, conforme §3.3.

**Limitações conhecidas:**

- R1 documentado na SPEC: usuário com `roles: []` (ex.: `External`) não
  mostra nenhuma badge de papel interno — só a badge de `type`. Não é bug,
  é o dado real (usuário sem papel atribuído).
- Filtro "não vinculado" nunca retorna item (ver decisão acima) — está lá
  só porque a SPEC pediu manter a UI, não porque tem utilidade real com o
  endpoint atual.
