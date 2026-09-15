# SPEC-07-05 — Operações: aba Containers

- **ID:** SPEC-07-05
- **Nome:** operation-containers
- **Status:** IMPLEMENTED
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

Sem rota própria (D2 revertida em SPEC-07-02 §13) — esta aba é um
componente comum, montado pelo shell de `/administrative/operations/$id`
via estado local, dado real (`OperationContainer` API).

## 8. Camada de dados

Hooks Orval de `operation-container` (fotos, lacres, status) — já
gerados.

## 9. Desenho

```
src/components/operations/tabs/
  Containers.tsx
```

## 10. Arquivos esperados

| Arquivo                                                             | Ação                                        |
| ------------------------------------------------------------------- | ------------------------------------------- |
| `src/components/operations/tabs/Containers.tsx`                     | criar                                       |
| `src/i18n/dictionaries/*/administrative-operations.json`            | editar — adicionar chaves da aba Containers |

## 11. Critérios de aceitação

| #   | Critério                                                                 |
| --- | ------------------------------------------------------------------------ |
| CA1 | Aba funciona ponta a ponta contra o Core (dev), incluindo upload de foto |
| CA2 | `bun run check` + `lint` passam                                          |

## 12. Riscos

Nenhum específico além dos já cobertos pelo índice geral.

## 13. Decisões pendentes

Nenhuma.

---

## Implementation Notes

- **Arquivos alterados:**
  - `src/components/operations/tabs/Containers.tsx` (criado) — lista
    paginada dos containers vinculados à operação
    (`getGetApiOperationOperationIdContainerQueryOptions`), modal de
    vínculo (`SelectAsync` pra buscar o container existente via
    `getApiContainer`, `InputText` pra tara), modal de edição (`Select`
    com `containerOperationStatusOptions` pro status, `InputText`/
    `InputDate` pra tara/data do lacre) e gerenciamento de fotos
    (`InputPhotoMulti`, upload individual por foto via
    `usePostApiOperationOperationIdContainerIdPhoto`, remoção via
    `useDeleteApiOperationOperationIdContainerIdPhotoPhotoId`).
  - `src/lib/validation/operation-container.ts` (criado) — schema local
    do formulário de fotos (`files: File[]`), remapeando
    `PostApiOperationOperationIdContainerIdPhotoBody.shape.file` (regra 2
    do AGENTS.md, zero regra de validação nova).
  - `src/routes/_dashboard/_internal/administrative/operations/$id/index.tsx`
    (editado) — o shell agora monta `<Containers operationId={id} />`
    quando `tab === "containers"` (antes só mostrava o placeholder
    genérico pra todas as abas).
  - `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json`
    (editado) — chaves novas no namespace `containers.*`, sem tocar nas
    existentes.
- **Comandos executados:**
  - `bun run check` — `tsc --noEmit` sem erros (VERIFIED).
  - `bun run lint` — 66 problems / 3 erros / 63 warnings, idêntico ao
    baseline pré-existente (VERIFIED, nenhum warning/erro novo).
- **Critérios de aceitação:**
  | # | Critério | Status |
  | --- | --- | --- |
  | CA1 | Aba funciona ponta a ponta contra o Core (dev), incluindo upload de foto | Implementado; não testado contra o Core rodando nesta sessão (sem ambiente de dev disponível) — fluxo de vínculo/edição/upload/exclusão de foto segue os hooks gerados e o mesmo padrão dos módulos já validados em produção (registry/container). |
  | CA2 | `bun run check` + `lint` passam | PASS |
- **Decisões tomadas durante a implementação:**
  - Não usei `CrudRecordModal`/`RenderFields` declarativo (`layouts/Form/Fields/map.tsx`)
    porque ele não repassa `config.enumOptions` como a prop `enumOptions`
    que o `Select` (SPEC-SHARE-01) espera — reproduzir esse padrão faria
    o `Select` de status renderizar sem opções (mesmo problema latente já
    presente em `operations-list.tsx`, fora do meu escopo consertar).
    Montei modais próprios (mesmo padrão do `OperationHeader` do shell,
    SPEC-07-02) usando os Fields diretamente.
  - Fotos não têm seleção de `slot` na UI (RF3 da spec só cobre o
    `Select` de status) — todo upload usa `slot: "None"`.
  - Lacres (`seals`) não foram implementados: não estão no RF nem nos
    "Arquivos esperados" da spec (só citados no §1/§2 de contexto),
    escopo mínimo mantido conforme RF1-RF4.
- **Limitações conhecidas:**
  - Sem verificação manual contra o Core rodando (ambiente de dev não
    disponível nesta sessão).

**Status final:** IMPLEMENTED.
