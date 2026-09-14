# SPEC-07-08 — Operações: aba Responsáveis (UI-only nesta leva)

- **ID:** SPEC-07-08
- **Nome:** operation-responsible
- **Status:** IMPLEMENTED
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/routes/.../administrative/operations/$id/responsible/**`
  (nova)
- **Depende de:** SPEC-00, SPEC-02 (`mock-data-banner`), SPEC-07-02 (shell
  de abas)

---

## 1. Objetivo

Sub-SPEC extraída da divisão de SPEC-07 (índice geral,
`specs/07-operacoes/spec.md`): aba **Responsáveis** — UI-only nesta leva,
mas candidata a virar real (o Core **já tem** a API `Responsible`, gerada,
nunca chamada no legado nem aqui ainda — ver D1).

**Real vs UI-only:** UI-only nesta SPEC (D1 registra a possibilidade de
virar real numa próxima iteração, se confirmado).

## 2. Contexto

Legado: aba "Responsáveis" mock, usa `OPERATIONS` de `data.ts`. Diferente
de Relatórios/Log, aqui a API real (`ResponsibleApi`) já existe no Core e
está gerada no client — só nunca foi exercitada por nenhuma tela.

## 3. Escopo

1. `operations/$id/responsible/index.tsx` — UI-only nesta SPEC, dado
   mockado local, `mock-data-banner` (SPEC-02) visível no topo.

## 4. Fora do escopo

- Tornar a aba real nesta rodada (ver D1 — decisão explícita de manter
  UI-only por ora, mesmo com API disponível).
- Conteúdo das demais abas.

## 5. Requisitos funcionais

- **RF1** — Dado mockado local, comentado como tal, com `mock-data-banner`
  visível — nunca disfarçado de real.
- **RF2** — Nenhuma chamada de rede fingindo ser real.
- **RF3** — Sem silent-fail (herda RF2 da SPEC-07-02).

## 6. Requisitos não funcionais

- RNF1 — `bun run check` + `lint` passam.

## 7. Contrato de rota

Sem rota própria (D2 revertida em SPEC-07-02 §13) — esta aba é um
componente comum, montado pelo shell de `/administrative/operations/$id`
via estado local, UI-only (ver D1).

## 8. Camada de dados

Nenhuma nesta SPEC — array local tipado no componente. `ResponsibleApi`
existe e está gerada (`src/api/generated/**`), mas não é consumida aqui
(ver D1).

## 9. Desenho

```
src/components/operations/tabs/
  Responsible.tsx    (UI-only, ver D1)
```

## 10. Arquivos esperados

| Arquivo                                                              | Ação                                          |
| -------------------------------------------------------------------- | --------------------------------------------- |
| `src/components/operations/tabs/Responsible.tsx`                     | criar                                         |
| `src/i18n/dictionaries/*/administrative-operations.json`             | editar — adicionar chaves da aba Responsáveis |

## 11. Critérios de aceitação

| #   | Critério                                           |
| --- | -------------------------------------------------- |
| CA1 | Aba claramente marcada como mock, sem chamada real |
| CA2 | `bun run check` + `lint` passam                    |

## 12. Riscos

- **R1** — Aba "Responsáveis" real (D1, se confirmada numa iteração
  futura) depende de validar o contrato de `Operation/Responsible` — API
  gerada mas nunca exercitada, pode ter lacuna não descoberta até tentar
  de verdade.

## 13. Decisões pendentes

- **D1** — O Core **já tem** a API (`ResponsibleApi` gerada, nunca chamada
  no legado nem aqui ainda). Torna ela real nesta SPEC (diferente do
  legado, que é 100% mock) ou mantém UI-only por paridade estrita com a
  decisão "espelhar Operações"? Mantida UI-only nesta leva — registrado
  como candidata a virar real numa SPEC futura dedicada, não decidida
  aqui.

---

## Implementation Notes

- **Arquivos alterados:**
  - `src/components/operations/tabs/Responsible.tsx` — criado. UI-only
    (D1): dado local (`MOCK_RESPONSIBLES`), comentado como mock, nunca
    projetado de `ResponsibleDTO` real (que existe embutido em
    `OperationDetailDTO.responsibles`, mas não é consumido aqui). Banner
    `MockDataBanner` visível no topo (RF1). Busca por nome/função/e-mail e
    filtro de função via `layouts/Form/Fields` (`InputText`/`Select`, regra
    10 do AGENTS.md), filtro de vínculo (todos/vinculados/não vinculados)
    via botões simples (mesmo padrão não-form de `ViewToggle`,
    `src/components/ui/view-toggle.tsx`). Vincular/desvincular só atualiza
    estado local (`useState`), sem qualquer chamada de rede (RF2).
  - `src/routes/_dashboard/_internal/administrative/operations/$id/index.tsx`
    — import + wiring da aba `responsible` (`tab === "responsible"`) no
    shell de abas (SPEC-07-02), substituindo o placeholder genérico só para
    essa aba.
  - `src/i18n/dictionaries/*/administrative-operations.json` — bloco
    `responsible.*` novo (busca, rótulos de filtro, papéis mock,
    vincular/desvincular, estado vazio) nos 4 locales, mesmo número de
    chaves em todos.
- **Comandos executados:**
  - `bun run check` → **VERIFIED**, `tsc --noEmit` limpo.
  - `bun run lint` → **VERIFIED**, 66 problems / 3 erros / 63 warnings —
    igual ao baseline (após `prettier --write` escopado aos dois arquivos
    de componente tocados/criados nesta rodada, sem `bun run format`
    solto).
- **Critérios de aceitação:**

  | # | Critério | Resultado |
  | --- | --- | --- |
  | CA1 | Aba claramente marcada como mock, sem chamada real | **PASS** — `MockDataBanner` visível, dado 100% local, comentário `// MOCK` no array, nenhum hook Orval importado no componente. |
  | CA2 | `bun run check` + `lint` passam | **PASS** |

- **Decisões tomadas durante a implementação:**
  - Papéis mock (`coordinator`/`analyst`/`assistant`/`supervisor`) são só
    rótulo de exibição, sem relação com `InternalRole` (enum real do
    Core) — evita qualquer confusão de que o filtro reflita permissão
    real.
  - Filtro de vínculo (todos/vinculados/não vinculados) implementado como
    grupo de botões simples (não é `layouts/Form/Fields`, mesmo racional
    de `ViewToggle`: não é um valor de formulário submetido, é um toggle de
    exibição local).
- **Limitações conhecidas:** nenhuma além do que a própria SPEC já registra
  em D1/R1 (candidatura a virar real fica para SPEC futura dedicada).

---

**Próximo passo:** `APROVAR SPEC-07-08`.
