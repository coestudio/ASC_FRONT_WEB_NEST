# SPEC-07-05 — Operações: aba Containers

- **ID:** SPEC-07-05
- **Nome:** operation-containers
- **Status:** DRAFT
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/routes/.../administrative/operations/$id/containers/**`
  (nova)
- **Depende de:** SPEC-00, SPEC-02, SPEC-SHARE-01 (`Select`, para status
  do vínculo, e `InputPhotoMulti`, para fotos do container), SPEC-07-01
  (namespace `administrative-operations.json`, editado aqui), SPEC-07-02
  (shell de abas)

---

## 1. Objetivo

Sub-SPEC extraída da divisão de SPEC-07 (índice geral,
`specs/07-operacoes/spec.md`): aba **Containers** — vínculo de containers
à operação, real (fotos, lacres, status).

**Real vs UI-only:** 100% real (`OperationContainersReal` no legado).

## 2. Contexto

Legado: `OperationContainersReal`.

## 3. Escopo

1. `operations/$id/containers/index.tsx` — vínculo de containers à
   operação (`operation-container` gerado: fotos, lacres, status).
2. Fotos do container usam `InputPhotoMulti` (SPEC-SHARE-01) — múltiplas
   imagens por container, preview em grid, remoção individual antes do
   envio.
3. Status do vínculo (`ContainerOperationStatus`) usa `Select`
   (SPEC-SHARE-01).

## 4. Fora do escopo

- Vínculo de container a um cadastro de container em si — isso é
  `Container` (SPEC-04, cadastro). Aqui é só o vínculo container↔operação.
- Conteúdo das demais abas.

## 5. Requisitos funcionais

- **RF1** — Consome só hooks Orval gerados de `operation-container`, nunca
  dado mockado.
- **RF2** — Upload de fotos via `InputPhotoMulti` (SPEC-SHARE-01).
- **RF3** — Status do vínculo via `Select` (SPEC-SHARE-01) com as opções
  de `ContainerOperationStatus`.
- **RF4** — Sem silent-fail (herda RF2 da SPEC-07-02).

## 6. Requisitos não funcionais

- RNF1 — `bun run check` + `lint` passam.
- RNF2 — Zero Zod à mão (schema gerado de `operation-container`).

## 7. Contrato de rota

| Rota | Dado |
| --- | --- |
| `/administrative/operations/$id/containers` | real |

## 8. Camada de dados

Hooks Orval de `operation-container` (fotos, lacres, status) — já
gerados.

## 9. Desenho

```
src/routes/.../administrative/operations/$id/
  containers/index.tsx
```

## 10. Arquivos esperados

| Arquivo | Ação |
| --- | --- |
| `src/routes/.../administrative/operations/$id/containers/index.tsx` | criar |
| `src/i18n/dictionaries/*/administrative-operations.json` | editar — adicionar chaves da aba Containers |

## 11. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Aba funciona ponta a ponta contra o Core (dev), incluindo upload de foto |
| CA2 | `bun run check` + `lint` passam |

## 12. Riscos

Nenhum específico além dos já cobertos pelo índice geral.

## 13. Decisões pendentes

Nenhuma.

---

**Próximo passo:** `APROVAR SPEC-07-05`.
