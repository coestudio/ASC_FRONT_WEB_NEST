# SPEC-07-07 — Operações: aba Relatórios (UI-only)

- **ID:** SPEC-07-07
- **Nome:** operation-reports
- **Status:** DRAFT
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/routes/.../administrative/operations/$id/reports/**`
  (nova)
- **Depende de:** SPEC-00, SPEC-02 (`mock-data-banner`), SPEC-07-02 (shell
  de abas)

---

## 1. Objetivo

Sub-SPEC extraída da divisão de SPEC-07 (índice geral,
`specs/07-operacoes/spec.md`): aba **Relatórios** — UI-only, dado mockado,
mesma decisão de UI-only mockup já aplicada em SPEC-05.

**Real vs UI-only:** 100% UI-only (mock no legado também).

## 2. Contexto

Legado: aba "Relatórios" mock, usa `OPERATIONS` de `data.ts`.

## 3. Escopo

1. `operations/$id/reports/index.tsx` — UI-only, dado mockado local,
   `mock-data-banner` (SPEC-02) visível no topo.

## 4. Fora do escopo

- Emissão real de relatório (mesma razão da SPEC-05 — Core não tem
  endpoint).
- Conteúdo das demais abas.

## 5. Requisitos funcionais

- **RF1** — Dado mockado local, comentado como tal, com `mock-data-banner`
  visível — nunca disfarçado de real.
- **RF2** — Nenhuma chamada de rede fingindo ser real — dado mockado nunca
  passa por `fetch`/hook Orval.
- **RF3** — Sem silent-fail (herda RF2 da SPEC-07-02).

## 6. Requisitos não funcionais

- RNF1 — `bun run check` + `lint` passam.

## 7. Contrato de rota

Sem rota própria (D2 revertida em SPEC-07-02 §13) — esta aba é um
componente comum, montado pelo shell de `/administrative/operations/$id`
via estado local, UI-only (mock).

## 8. Camada de dados

Nenhuma — array local tipado no componente (mesmo padrão da SPEC-05).

## 9. Desenho

```
src/components/operations/tabs/
  Reports.tsx        (UI-only, com mock-data-banner)
```

## 10. Arquivos esperados

| Arquivo                                                          | Ação                                        |
| ---------------------------------------------------------------- | ------------------------------------------- |
| `src/components/operations/tabs/Reports.tsx`                     | criar                                       |
| `src/i18n/dictionaries/*/administrative-operations.json`         | editar — adicionar chaves da aba Relatórios |

## 11. Critérios de aceitação

| #   | Critério                                           |
| --- | -------------------------------------------------- |
| CA1 | Aba claramente marcada como mock, sem chamada real |
| CA2 | `bun run check` + `lint` passam                    |

## 12. Riscos

Nenhum específico além dos já cobertos pelo índice geral.

## 13. Decisões pendentes

Nenhuma.

---

**Próximo passo:** `APROVAR SPEC-07-07`.
