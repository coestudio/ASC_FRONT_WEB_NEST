# SPEC-07-08 — Operações: aba Responsáveis (UI-only nesta leva)

- **ID:** SPEC-07-08
- **Nome:** operation-responsible
- **Status:** DRAFT
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

| Rota                                         | Dado             |
| -------------------------------------------- | ---------------- |
| `/administrative/operations/$id/responsible` | UI-only (ver D1) |

## 8. Camada de dados

Nenhuma nesta SPEC — array local tipado no componente. `ResponsibleApi`
existe e está gerada (`src/api/generated/**`), mas não é consumida aqui
(ver D1).

## 9. Desenho

```
src/routes/.../administrative/operations/$id/
  responsible/index.tsx    (UI-only, ver D1)
```

## 10. Arquivos esperados

| Arquivo                                                              | Ação                                          |
| -------------------------------------------------------------------- | --------------------------------------------- |
| `src/routes/.../administrative/operations/$id/responsible/index.tsx` | criar                                         |
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

**Próximo passo:** `APROVAR SPEC-07-08`.
