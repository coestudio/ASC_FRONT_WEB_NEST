# SPEC-07-06 — Operações: aba Documentos

- **ID:** SPEC-07-06
- **Nome:** operation-documents
- **Status:** IMPLEMENTED
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

Sem rota própria (D2 revertida em SPEC-07-02 §13) — esta aba é um
componente comum, montado pelo shell de `/administrative/operations/$id`
via estado local, dado real (`Document` API).

## 8. Camada de dados

Hooks Orval de `document` (CRUD, lookup de tipo) — já gerados.

## 9. Desenho

```
src/components/operations/tabs/
  Documents.tsx
```

## 10. Arquivos esperados

| Arquivo                                                            | Ação                                        |
| ------------------------------------------------------------------ | ------------------------------------------- |
| `src/components/operations/tabs/Documents.tsx`                     | criar                                       |
| `src/i18n/dictionaries/*/administrative-operations.json`           | editar — adicionar chaves da aba Documentos |

## 11. Critérios de aceitação

| #   | Critério                                                                    |
| --- | --------------------------------------------------------------------------- |
| CA1 | Aba funciona ponta a ponta contra o Core (dev), incluindo upload de arquivo |
| CA2 | `bun run check` + `lint` passam                                             |

## 12. Riscos

Nenhum específico além dos já cobertos pelo índice geral.

## 13. Decisões pendentes

Nenhuma.

---

## Implementation Notes

- **Arquivos alterados:**
  - `src/components/operations/tabs/Documents.tsx` (criado) — lista
    paginada dos documentos da operação
    (`getGetApiOperationOperationIdDocumentQueryOptions`), modal de
    criação (`InputText` pro título, `Select` com `documentTypeOptions`
    pro tipo, `InputTextArea` pra observação, `InputFileSingle` pro
    arquivo, sem `accept` restritivo) e modal de edição (título/tipo/
    observação — o Core não expõe substituição de arquivo via PUT).
  - `src/routes/_dashboard/_internal/administrative/operations/$id/index.tsx`
    (editado, junto com a SPEC-07-05) — o shell agora monta
    `<Documents operationId={id} />` quando `tab === "documents"`.
  - `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json`
    (editado) — chaves novas no namespace `documents.*`, sem tocar nas
    existentes.
- **Comandos executados:**
  - `bun run check` — `tsc --noEmit` sem erros (VERIFIED).
  - `bun run lint` — 66 problems / 3 erros / 63 warnings, idêntico ao
    baseline pré-existente (VERIFIED, nenhum warning/erro novo).
- **Critérios de aceitação:**
  | # | Critério | Status |
  | --- | --- | --- |
  | CA1 | Aba funciona ponta a ponta contra o Core (dev), incluindo upload de arquivo | Implementado; não testado contra o Core rodando nesta sessão (sem ambiente de dev disponível) — fluxo de criação/edição segue os hooks gerados e o mesmo padrão dos módulos já validados em produção. |
  | CA2 | `bun run check` + `lint` passam | PASS |
- **Decisões tomadas durante a implementação:**
  - Mesmo motivo da SPEC-07-05: não usei `CrudRecordModal`/`RenderFields`
    declarativo por causa do `enumOptions` do `Select` não ser repassado
    por `map.tsx` — modal próprio, Fields usados diretamente.
  - Endpoint de documento da operação não tem DELETE no contrato gerado
    (`document.ts`) — sem botão de excluir na tabela (RF1: só hooks
    gerados, nenhum endpoint inventado).
  - `Observation` incluído no formulário (campo do mesmo DTO, opcional)
    mesmo não estando listado nas RF explícitas — não introduz endpoint
    nem regra nova.
- **Limitações conhecidas:**
  - Sem verificação manual contra o Core rodando (ambiente de dev não
    disponível nesta sessão).
  - Sem re-upload de arquivo na edição (limite do contrato do Core, não
    do frontend).

**Status final:** IMPLEMENTED.
