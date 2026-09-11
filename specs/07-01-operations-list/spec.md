# SPEC-07-01 — Operações: lista

- **ID:** SPEC-07-01
- **Nome:** operations-list
- **Status:** DRAFT
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

**Próximo passo:** `APROVAR SPEC-07-01`.
