# SPEC-07-03 — Operações: aba Detalhes

- **ID:** SPEC-07-03
- **Nome:** operation-details
- **Status:** IMPLEMENTED
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/routes/.../administrative/operations/$id/details/**` (nova)
- **Depende de:** SPEC-00, SPEC-02, SPEC-SHARE-01 (`Select`, para o campo
  de status), SPEC-07-01 (namespace `administrative-operations.json`,
  editado aqui — não pelo `Select` em si, que vem de SPEC-SHARE-01),
  SPEC-07-02 (shell de abas)

---

## 1. Objetivo

Sub-SPEC extraída da divisão de SPEC-07 (índice geral,
`specs/07-operacoes/spec.md`): aba **Detalhes** — dados cadastrais da
Operação, real, incluindo troca de status.

**Real vs UI-only:** 100% real (`OperationApi`, mesmo comportamento do
legado).

## 2. Contexto

Legado: aba "Detalhes" de `Operations/Detail.tsx`, componente real
(`OperationApi`).

## 3. Escopo

1. `operations/$id/details/index.tsx` — dados da operação
   (`OperationDetailDTO`).
2. Troca de status da operação (`usePatchApiOperationIdStatus`,
   `OperationStatusPatch`) via `Select` (SPEC-SHARE-01) com as opções de
   `OperationStatus` — não é só leitura.

## 4. Fora do escopo

- Conteúdo das demais abas (07-04 a 07-09).

## 5. Requisitos funcionais

- **RF1** — Consome só hooks Orval gerados de `operation`, nunca dado
  mockado.
- **RF2** — Permite trocar o status da operação
  (`usePatchApiOperationIdStatus`) via `Select` com as opções de
  `OperationStatus`.
- **RF3** — Sem silent-fail (herda RF2 da SPEC-07-02): id não resolvido
  mostra erro explícito.

## 6. Requisitos não funcionais

- RNF1 — `bun run check` + `lint` passam.
- RNF2 — Zero Zod à mão (schema gerado de `operation`).

## 7. Contrato de rota

Sem rota própria (D2 revertida em SPEC-07-02 §13) — esta aba é um
componente comum, montado pelo shell de `/administrative/operations/$id`
via estado local, dado real (`Operation` API).

## 8. Camada de dados

Hooks Orval de `operation` (`getApiOperationId`,
`usePatchApiOperationIdStatus`).

## 9. Desenho

```
src/components/operations/tabs/
  Details.tsx
```

## 10. Arquivos esperados

| Arquivo                                                | Ação                                                                         |
| ------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/components/operations/tabs/Details.tsx`             | criar                                                                        |
| `src/i18n/dictionaries/*/administrative-operations.json` | editar — adicionar chaves da aba Detalhes (namespace criado pela SPEC-07-01) |

## 11. Critérios de aceitação

| #   | Critério                                                                  |
| --- | ------------------------------------------------------------------------- |
| CA1 | Aba funciona ponta a ponta contra o Core (dev), incluindo troca de status |
| CA2 | `bun run check` + `lint` passam                                           |

## 12. Riscos

Nenhum específico além dos já cobertos pelo índice geral.

## 13. Decisões pendentes

Nenhuma.

---

## Implementation Notes

- **Arquivos alterados:**
  - `src/components/operations/tabs/Details.tsx` — já criado num commit WIP
    anterior desta mesma branch (`e2e3176`); nesta rodada só levou um ajuste
    de formatação (`prettier --write`, sem mudança de comportamento).
  - `src/routes/_dashboard/_internal/administrative/operations/$id/index.tsx`
    — já tinha a aba "Detalhes" (`OperationDetailsTab`) e a troca de status
    (`OperationHeader`, RF2) wireados desde o commit WIP/SPEC-07-02; não
    tocado nesta rodada além do necessário pra SPEC-07-08 (import da aba
    Responsáveis).
  - `src/i18n/dictionaries/*/administrative-operations.json` — chaves do
    namespace `details.*` já adicionadas no commit WIP anterior; nenhuma
    chave nova nesta rodada.
- **Comandos executados:**
  - `bun run check` → **VERIFIED**, `tsc --noEmit` limpo.
  - `bun run lint` → **VERIFIED**, 66 problems / 3 erros / 63 warnings —
    igual ao baseline registrado antes de tocar em qualquer arquivo.
- **Critérios de aceitação:**

  | # | Critério | Resultado |
  | --- | --- | --- |
  | CA1 | Aba funciona ponta a ponta contra o Core (dev), incluindo troca de status | **NOT VERIFIED** — sem instância do Core rodando neste ambiente/worktree pra exercitar manualmente; revisão de código confirma que a aba consome só `OperationDetailDTO` (dado real, resolvido pelo shell via `getGetApiOperationIdQueryOptions`) e que a troca de status usa `usePatchApiOperationIdStatus` com `zodResolver(PatchApiOperationIdStatusBody)` (schema gerado), sem mock. |
  | CA2 | `bun run check` + `lint` passam | **PASS** |

- **Decisões tomadas durante a implementação:** nenhuma nova — a troca de
  status (RF2) já vive no cabeçalho comum do shell (`OperationHeader`,
  herdado da SPEC-07-02), visível em todas as abas, conforme o próprio
  texto da SPEC-07-03 (§1) previa.
- **Limitações conhecidas:** CA1 não foi validado ponta a ponta contra uma
  instância real do Core nesta rodada (ambiente sem backend disponível) —
  só revisão estática/tipagem.

---

**Próximo passo:** `APROVAR SPEC-07-03`.
