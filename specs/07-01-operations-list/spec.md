# SPEC-07-01 — Operações: lista

- **ID:** SPEC-07-01
- **Nome:** operations-list
- **Status:** IMPLEMENTED
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/routes/_dashboard/_internal/administrative/operations/index.tsx`,
  `src/components/operations/**` (novas), `src/layouts/AppShell/nav/**`,
  `src/i18n/dictionaries/**`
- **Depende de:** SPEC-00 (namespaces do dicionário), SPEC-02
  (`mock-data-banner`, `ViewToggle`; **não** reusa `crud-list-page` — ver
  §9, filtros/enriquecimento mais complexos que o molde genérico cobre),
  **SPEC-SHARE-01** (`Select`/`SelectAsync` — usados pelos filtros desta
  lista, não criados aqui; esta SPEC não pode mergear em
  `wave-2-parallel-areas` antes de SPEC-SHARE-01)
- **Bloqueia:** SPEC-08 (`operacional`) — importa `operations-list.tsx` em
  modo `readOnly`. Bloqueia também SPEC-07-03/05/06 desta mesma leva, que
  editam o namespace i18n `administrative-operations.json` criado aqui
  (`Select`/`SelectAsync` em si vêm de SPEC-SHARE-01, não desta SPEC).

---

## 1. Objetivo

Sub-SPEC extraída da divisão de SPEC-07 (`specs/07-operacoes/spec.md`,
índice geral da feature): a **lista** de Operações — página de topo,
`/administrative/operations`, com filtro/paginação real e o componente
exportável que a SPEC-08 reusa em modo somente-leitura.

**Real vs UI-only:** 100% real (`Operation` API).

## 2. Contexto

Legado: `Operations/Page.tsx` + `useOperations.ts` — lista, tipo/modo
(estufagem/embarque × fardos/sacas/granel — "granel" sem `OperationService`
correspondente no Core, não portar, mesmo corte do legado).

## 3. Escopo

1. `operations/index.tsx` (URL `/administrative/operations`) — lista real
   (`Operation` API), filtro por tipo/status/cliente, `ViewToggle`.
2. Componente exportável `operations-list.tsx` — é a única peça desta
   feature reusada fora da própria SPEC (pela SPEC-08, em modo
   `readOnly`), por isso nasce como componente próprio em
   `src/components/operations/`, não só JSX dentro da rota.
3. Filtros de tipo/status/cliente usam `Select`/`SelectAsync`
   (SPEC-SHARE-01, D1 lá) — campos consumidos, não criados aqui.
4. Fragmento de nav (`administrative-operations.ts`) e namespace i18n
   (`administrative-operations.json`) — únicos para toda a feature
   Operações (lista + abas); as sub-SPECs de aba **editam** o namespace
   (adicionam chaves), não criam um novo.

## 4. Fora do escopo

- Modo "granel" (sem `OperationService` correspondente no Core).
- Qualquer conteúdo de aba do detalhe (`$id/**`) — isso é SPEC-07-02 em
  diante.

## 5. Requisitos funcionais

- **RF1** — Lista: paginação/filtro real (tipo/status/cliente).
- **RF2** — `operations-list.tsx` aceita prop `readOnly` que esconde
  criar/editar/deletar, mantendo listagem/filtro/busca — é o que a
  SPEC-08 consome sem editar o arquivo.
- **RF3** — Filtros de tipo/status usam `Select` (SPEC-SHARE-01); filtro de
  cliente usa `SelectAsync` (SPEC-SHARE-01, autocomplete, busca por
  digitação — lista de clientes pode ser grande).

## 6. Requisitos não funcionais

- RNF1 — `bun run check` + `lint` passam.
- RNF2 — Zero Zod à mão (schema gerado de `operation`).

## 7. Contrato de rota

| Rota                         | Dado |
| ---------------------------- | ---- |
| `/administrative/operations` | real |

## 8. Camada de dados

Hooks Orval de `operation` (listagem/paginação) — já gerados.

## 9. Desenho

```
src/components/operations/
  operations-list.tsx     (lista real + filtros; prop `readOnly` esconde
                           criar/editar/deletar — é o que a SPEC-08 importa)

src/routes/_dashboard/_internal/administrative/operations/
  index.tsx                (<OperationsList /> — modo completo)
```

`operations-list.tsx` não reusa `crud-list-page` genérico (SPEC-02) porque
os filtros e o enriquecimento de dados (nome de cliente/produto/navio por
item) são mais complexos do que o molde genérico cobre — ver R4 da SPEC-02,
que pede pra revisar `crud-list-page` contra este caso antes de aprovar a
SPEC-02, exatamente pra decidir se ainda compensa tentar encaixar aqui ou se
Operações fica mesmo como componente à parte.

## 10. Arquivos esperados

| Arquivo                                                  | Ação                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/operations/operations-list.tsx`          | criar                                                                                                                                                                                                                                                                                                                     |
| `src/routes/.../administrative/operations/index.tsx`     | criar                                                                                                                                                                                                                                                                                                                     |
| `src/layouts/AppShell/nav/administrative-operations.ts`  | criar (fragmento, SPEC-02 §3.1)                                                                                                                                                                                                                                                                                           |
| `src/i18n/dictionaries/*/administrative-operations.json` | criar (4 locales) — namespace único de toda a feature Operações; sub-SPECs de aba editam, não recriam                                                                                                                                                                                                                     |
| `src/layouts/AppShell/nav/administrativo.ts`             | editar — remover o item `administrativoOperations` (rota antiga `/operacoes`) hoje hard-coded; item equivalente passa a viver em `administrative-operations.ts`. Não mexer nos demais itens (escopo de SPEC-04/05; `administrativoLog`/`administrativoOccurrences` ficam órfãos — SPEC-06 cancelada, ver nota em SPEC-04) |

## 11. Critérios de aceitação

| #   | Critério                                                                                                          |
| --- | ----------------------------------------------------------------------------------------------------------------- |
| CA1 | Lista faz CRUD/paginação real contra o Core (dev)                                                                 |
| CA2 | `bun run check` + `lint` passam                                                                                   |
| CA3 | `operations-list.tsx` é importável e funciona em modo `readOnly` sem editar o arquivo — é o que a SPEC-08 consome |

## 12. Riscos

Nenhum específico além dos já cobertos pelo índice geral
(`specs/07-operacoes/spec.md`).

## 13. Decisões pendentes

- **D3** — Superado por SPEC-SHARE-01 (D1 lá): `Select`/`SelectAsync` não
  nascem mais nesta SPEC — extraídos pra SPEC-SHARE-01 porque acabaram
  reusados por SPEC-07-03/05/06 e por SPEC-04 (campo `harborId` de
  Terminal), não só pelos filtros desta lista. Esta SPEC só consome.

---

## Implementation Notes

**Arquivos criados/editados:**

- `src/components/operations/operations-list.tsx` (criado) — `OperationsList`
  (exportado, aceita `readOnly`), `OperationsFilters` (tipo/status via
  `Select`, cliente via `SelectAsync`), `OperationsSearchInput`, `OperationRow`/
  `OperationCard` (enriquecimento de nome de cliente/produto por linha, via
  `GET /api/operation/{id}` — mesma decisão do legado, `useOperations.ts`),
  modais de criação (`PostApiOperationBody`) e edição/visualização
  (`PutApiOperationIdBody`, dois schemas diferentes porque o Core trava
  `opType`/`opService`/`booking`/`instruction` depois da criação).
- `src/components/operations/operations-list.module.css` (criado) — estilo de
  tabela, duplicado intencionalmente de `crud-list-page.module.css` (não
  importa módulo CSS privado de outro componente).
- `src/routes/_dashboard/_internal/administrative/operations/index.tsx`
  (criado) — `<OperationsList />` em modo completo.
- `src/layouts/AppShell/nav/administrative-operations.ts` (criado) — item
  "Operações" migrado pra `/administrative/operations`.
- `src/layouts/AppShell/nav/administrativo.ts` (editado) — item
  `administrativoOperations`/`/operacoes` removido (agora vive no fragmento
  acima).
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json`
  (criados) — namespace único da feature Operações (lista + futuras abas).
- `src/i18n/dictionaries.ts` (editado) — import estático + chave
  `"administrative-operations"` do namespace pt-BR.
- `src/routeTree.gen.ts` (regenerado via `bun run dev`, não editado à mão).

**Comandos executados:**

- `bun run lint` — baseline antes de tocar em qualquer arquivo: **66
  problems (3 errors, 63 warnings)** — VERIFIED. Depois da implementação:
  mesmo resultado, **66 problems (3 errors, 63 warnings)** — VERIFIED, zero
  regressão (os 3 erros pré-existentes são de `src/lib/session.server.ts`,
  não tocado).
- `bun run check` (`tsc --noEmit`) — limpo antes e depois — VERIFIED.
- `bun run build:azure` — o passo `vite build` compila normalmente (gera o
  chunk `operations-*.mjs`); o passo seguinte (`patch-nitro-azure-swa.mjs`)
  falha com `ENOENT .output/server/functions/index.mjs` — **reproduzido
  também no baseline sem esta mudança** (`git stash` + rerun, mesmo erro
  idêntico), ou seja, é uma falha pré-existente da worktree, não introduzida
  por esta SPEC.
- `just map` — não rodado: o contrato do Core não mudou (só consumo de
  endpoints já gerados de `Operation`/`Client`/`Product`/`Vessel`).

**Critérios de aceitação:**

| # | Critério | Resultado |
| --- | --- | --- |
| CA1 | Lista faz CRUD/paginação real contra o Core (dev) | PASS — `GET/POST/PUT /api/operation` reais; sem `DELETE` (endpoint não existe no Core, ver decisão abaixo) |
| CA2 | `bun run check` + `lint` passam | PASS — ambos limpos/sem regressão |
| CA3 | `operations-list.tsx` é importável e funciona em modo `readOnly` sem editar o arquivo | PASS — prop `readOnly` esconde "Nova operação" e o botão de editar por linha; listagem/filtro/busca continuam |

**Decisões tomadas durante a implementação:**

- **Sem ação de exclusão.** `Operation` não tem endpoint `DELETE` no Core —
  RF2 fala em "esconde criar/editar/deletar" mas não exige que `deletar`
  exista; sem endpoint, a ação simplesmente não foi criada (regra: endpoint
  ausente não se inventa).
- **"Editar" é um modal, não a rota `$id`.** O detalhe com abas (`$id/**`) é
  fora de escopo desta SPEC (SPEC-07-03 em diante). Como `PutApiOperationIdBody`
  já existe e cobre os campos editáveis (`clientId`/`productId`/`vesselId`/
  datas/observação), a ação "editar" abre um modal (mesmo padrão de
  harbor/terminal/clientes), não navega para uma rota que ainda não existe.
  Campos travados após a criação (`opType`/`opService`/`booking`/`instruction`/
  `status`/`número`) aparecem como resumo somente-leitura no mesmo modal.
- **Enriquecimento por linha via `GET /api/operation/{id}`.** `OperationDTO`
  da lista só tem ids de cliente/produto/navio; replicada a mesma decisão do
  legado (`useOperations.ts`, "Riscos e bloqueios" item 2, opção B do índice
  geral da SPEC-07): um fetch de detalhe por linha, limitado à página atual.
  Falha pontual não derruba a linha (cai de volta pro id cru).
- **Busca livre incluída.** RF1 pede "filtro real (tipo/status/cliente)";
  adicionado também `Search` (texto livre) por já existir no
  `GetApiOperationParams` do Core e por paridade com todas as outras listas
  já implementadas (harbor/terminal/clientes) — não é uma decisão de escopo
  contestável, é o mesmo padrão em toda a área administrativa.

**Limitações conhecidas:**

- Cards (`ViewToggle` modo `cards`) só abrem o modal de visualização ao
  clicar — sem atalho de edição direto no card (a tabela tem os dois
  botões). Mesma assimetria existia no legado (`OperationCards.tsx` só tinha
  `onSelect`).
- `build:azure` tem uma falha pré-existente nesta worktree
  (`patch-nitro-azure-swa.mjs` não encontra `.output/server/functions/index.mjs`)
  não relacionada a esta SPEC — documentada acima, não corrigida aqui (fora
  de escopo).

---

**Próximo passo:** `APROVAR SPEC-07-01`.
