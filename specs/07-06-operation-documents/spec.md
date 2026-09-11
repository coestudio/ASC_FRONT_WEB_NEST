# SPEC-07-06 — Operações: aba Documentos

- **ID:** SPEC-07-06
- **Nome:** operation-documents
- **Status:** DRAFT
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/routes/.../administrative/operations/$id/documents/**`
  (nova)
- **Depende de:** SPEC-00, SPEC-02, SPEC-SHARE-01 (`Select`, para tipo de
  documento, e `InputFileSingle`, para o arquivo do documento), SPEC-07-01
  (namespace `administrative-operations.json`, editado aqui), SPEC-07-02
  (shell de abas)

---

## 1. Objetivo

Sub-SPEC extraída da divisão de SPEC-07 (índice geral,
`specs/07-operacoes/spec.md`): aba **Documentos** — CRUD de documentos da
operação, real.

**Real vs UI-only:** 100% real (`OperationDocumentosReal` no legado).

## 2. Contexto

Legado: `OperationDocumentosReal`.

## 3. Escopo

1. `operations/$id/documents/index.tsx` — CRUD de documentos (`document`
   gerado, tipos via lookup).
2. Upload do arquivo usa `InputFileSingle` (SPEC-SHARE-01) para
   `DocumentDTO.file` — um arquivo por documento, `accept` sem restrição
   forçada (tipo vem do lookup de `DocumentType`, não do MIME).
3. Tipo de documento (`DocumentType`) usa `Select` (SPEC-SHARE-01).

## 4. Fora do escopo

- Conteúdo das demais abas.

## 5. Requisitos funcionais

- **RF1** — Consome só hooks Orval gerados de `document`, nunca dado
  mockado.
- **RF2** — Upload de arquivo via `InputFileSingle` (SPEC-SHARE-01).
- **RF3** — Tipo de documento via `Select` (SPEC-SHARE-01), populado
  pelo lookup de `DocumentType`.
- **RF4** — Sem silent-fail (herda RF2 da SPEC-07-02).

## 6. Requisitos não funcionais

- RNF1 — `bun run check` + `lint` passam.
- RNF2 — Zero Zod à mão (schema gerado de `document`).

## 7. Contrato de rota

| Rota | Dado |
| --- | --- |
| `/administrative/operations/$id/documents` | real |

## 8. Camada de dados

Hooks Orval de `document` (CRUD, lookup de tipo) — já gerados.

## 9. Desenho

```
src/routes/.../administrative/operations/$id/
  documents/index.tsx
```

## 10. Arquivos esperados

| Arquivo | Ação |
| --- | --- |
| `src/routes/.../administrative/operations/$id/documents/index.tsx` | criar |
| `src/i18n/dictionaries/*/administrative-operations.json` | editar — adicionar chaves da aba Documentos |

## 11. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Aba funciona ponta a ponta contra o Core (dev), incluindo upload de arquivo |
| CA2 | `bun run check` + `lint` passam |

## 12. Riscos

Nenhum específico além dos já cobertos pelo índice geral.

## 13. Decisões pendentes

Nenhuma.

---

**Próximo passo:** `APROVAR SPEC-07-06`.
