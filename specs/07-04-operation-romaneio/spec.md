# SPEC-07-04 — Operações: aba Romaneio

- **ID:** SPEC-07-04
- **Nome:** operation-romaneio
- **Status:** DRAFT
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/routes/.../administrative/operations/$id/romaneio/**`
  (nova)
- **Depende de:** SPEC-00, SPEC-02, SPEC-07-02 (shell de abas)

---

## 1. Objetivo

Sub-SPEC extraída da divisão de SPEC-07 (índice geral,
`specs/07-operacoes/spec.md`): aba **Romaneio** — CRUD de fardos + import
em 2 etapas (analyze/apply), real.

**Real vs UI-only:** 100% real (`OperationRomaneioReal` no legado).

`romaneio` **fica em português** no segmento de rota — é o nome do domínio
no Core (`Operation/Romaneio`, hooks gerados
`getApiOperationOperationIdRomaneio...`), não um substantivo comum, mesmo
tratamento que "Vessel"/"Product" (nome próprio do domínio, não traduzido
à força).

## 2. Contexto

Legado: `OperationRomaneioReal`. Fluxo de import documentado no
`AGENTS.md` do Core.

## 3. Escopo

1. `operations/$id/romaneio/index.tsx` — CRUD de fardos.
2. Import de romaneio em 2 etapas: `.../romaneio/import/analyze` →
   revisão de grupos classificados no front →
   `.../romaneio/import/apply`, sem pular a etapa de revisão.

## 4. Fora do escopo

- Conteúdo das demais abas.
- Export/return de romaneio (`Romaneio.Files.cs` — regiões `Return`/
  `Export` vazias no Core hoje, ver `Plans/Mapa-Paridade-Portal-Core.md`
  §4.2, R1) — não prometer no front.

## 5. Requisitos funcionais

- **RF1** — Consome só hooks Orval gerados de `romaneio`, nunca dado
  mockado.
- **RF2** — Import de romaneio segue o fluxo de 2 etapas do Core
  (`.../romaneio/import/analyze` → revisão de grupos classificados no
  front → `.../romaneio/import/apply`), sem pular a etapa de revisão.
- **RF3** — Sem silent-fail (herda RF2 da SPEC-07-02).

## 6. Requisitos não funcionais

- RNF1 — `bun run check` + `lint` passam.
- RNF2 — Zero Zod à mão (schema gerado de `romaneio`).

## 7. Contrato de rota

| Rota | Dado |
| --- | --- |
| `/administrative/operations/$id/romaneio` | real |

## 8. Camada de dados

Hooks Orval de `romaneio` (CRUD + import analyze/apply) — já gerados.

## 9. Desenho

```
src/routes/.../administrative/operations/$id/
  romaneio/index.tsx
```

## 10. Arquivos esperados

| Arquivo | Ação |
| --- | --- |
| `src/routes/.../administrative/operations/$id/romaneio/index.tsx` | criar |
| `src/i18n/dictionaries/*/administrative-operations.json` | editar — adicionar chaves da aba Romaneio |

## 11. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Aba funciona ponta a ponta contra o Core (dev) |
| CA2 | Import de romaneio respeita as 2 etapas (analyze → revisão → apply) |
| CA3 | `bun run check` + `lint` passam |

## 12. Riscos

- **R1** — Import de romaneio é o fluxo mais complexo do Core consumido
  nesta leva — revisar `Romaneio.Files.cs` (`Return`/`Export` vazios no
  Core, conforme `Plans/Mapa-Paridade-Portal-Core.md` §4.2) antes de
  prometer export no front.

## 13. Decisões pendentes

Nenhuma.

---

**Próximo passo:** `APROVAR SPEC-07-04`.
