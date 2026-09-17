# SPEC-54 — Botão "Me adicionar como Responsável"

- **ID:** SPEC-54
- **Nome:** responsible-self-link-button
- **Status:** IMPLEMENTED — dependência do Core (`specs/44-responsible-self-link`)
  resolvida nesta sessão; `just map` já rodado (hook
  `usePostApiOperationOperationIdResponsibleMe` presente em
  `src/api/generated/endpoints/responsible/responsible.ts`).
- **Autor:** claude (pedido do usuário, 2026-09-16)
- **Área:** `src/components/operations/tabs/Responsible.tsx`.
- **Depende de (Core):** `specs/44-responsible-self-link` (`DRAFT`) —
  `POST .../responsible/me`.

---

## 1. Objetivo

Botão na aba Responsáveis pra se auto-vincular à Operação num clique,
sem passar pelo `SelectAsync` de busca — bypassa a pendência registrada
no `TODO.md` (usuário não se achava na busca).

## 2. Contexto

`Responsible.tsx` já tem um botão "Vincular" (linha ~215) que abre um
modal com `SelectAsync` (busca de usuário elegível). O botão novo fica
ao lado, sem modal — clique já dispara a chamada.

## 3. Escopo

Botão novo "Me adicionar" (`variant="outline-primary"`, ícone
`bi-person-plus`) ao lado do "Vincular" existente:

- Desabilitado (ou oculto — decisão de implementação, tanto faz pro
  requisito) se o usuário logado (`useUser()`) já está na lista de
  vinculados (`list.some(item => item.user.id === user?.id)`).
- Clique chama `POST .../responsible/me` (hook gerado via `just map`),
  sem modal nenhum. Sucesso: toast, invalida a lista
  (`invalidateList()`, já existe). Erro (`409`, já vinculado — corrida
  rara): toast de erro genérico.

## 4. Fora do escopo

- Qualquer mudança no botão "Vincular"/modal de busca existente.
- Resolver a pendência de busca do `TODO.md` (não achar o próprio nome)
  — esta SPEC oferece um caminho que não depende dela, não a resolve.

## 5. Requisitos funcionais

- **RF1** — Botão "Me adicionar" vincula o usuário logado com um clique,
  sem modal/busca.
- **RF2** — Botão desabilitado/oculto quando o usuário já está
  vinculado.

## 6. Camada de dados

`just map` contra o Core com `specs/44` `IMPLEMENTED` — hook novo
`usePostApiOperationOperationIdResponsibleMe` (ou nome equivalente
gerado pelo Orval a partir da rota `POST .../responsible/me`).

## 7. i18n

Chave nova `administrative-operations.responsible.selfLink` (4
locales) — rótulo do botão.

## 8. Arquivos esperados

- `src/components/operations/tabs/Responsible.tsx`
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json`
- `src/api/generated/**` (via `just map`)

## 9. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Clicar em "Me adicionar" vincula o usuário logado sem abrir modal. |
| CA2 | Botão fica desabilitado/oculto quando o usuário já está na lista de vinculados. |
| CA3 | `bun run check` + `bun run lint` sem regressão. |
| CA4 | 4 dicts de i18n com a chave nova. |

## 10. Riscos

Nenhum — mudança isolada a um arquivo, botão aditivo.

## Implementation Notes

- **Arquivos alterados:**
  - `src/components/operations/tabs/Responsible.tsx` — botão
    "Me adicionar como responsável" (`variant="outline-primary"`, ícone
    `bi-person-plus`) ao lado do "Vincular" existente. Usa
    `usePostApiOperationOperationIdResponsibleMe()` (hook gerado, sem
    editar `src/api/generated/**`) e `useUser()` pra saber o `id` do
    usuário logado. Desabilitado quando `list` já contém
    `item.user.id === user?.id` (`isSelfLinked`) ou enquanto a mutation
    está pendente. Sucesso: toast + `invalidateList()` (mesma função já
    usada pelo fluxo de "Vincular"/desvincular). Erro: toast genérico
    (`administrative-operations.responsible.toast.error`, já existente —
    cobre também o caso de corrida 409).
  - `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json`
    — chave nova `responsible.selfLink` nos 4 locales.
- **Comandos executados:**
  - `bun run check` — VERIFIED (sem erro).
  - `bun run lint` — 66 problems / 3 errors / 63 warnings, todos
    pré-existentes em `src/lib/session.server.ts` e `src/lib/ui-prefs.tsx`
    — sem regressão.
  - `just map` — já rodado pelo usuário antes desta sessão de
    implementação (dependência do Core resolvida); não rodado novamente
    aqui.
- **Critérios de aceitação:**

| # | Critério | Resultado |
| --- | --- | --- |
| CA1 | Clicar em "Me adicionar" vincula o usuário logado sem abrir modal. | PASS (chamada direta à mutation, sem modal) |
| CA2 | Botão fica desabilitado/oculto quando o usuário já está na lista de vinculados. | PASS (desabilitado via `isSelfLinked`) |
| CA3 | `bun run check` + `bun run lint` sem regressão. | PASS |
| CA4 | 4 dicts de i18n com a chave nova. | PASS |

- **Decisões tomadas durante a implementação:** o spec.md estava em
  `DRAFT` citando a dependência do Core como pendente — reconfirmado que a
  dependência já foi resolvida (endpoint presente no client gerado,
  `just map` já rodado) antes de implementar; objetivo/escopo do spec.md
  não mudaram, só o status. Optei por **desabilitar** (não ocultar) o
  botão quando já vinculado — opção explicitamente permitida pelo §3
  ("tanto faz pro requisito").
- **Limitações conhecidas:** nenhuma — não mexe no botão "Vincular"/modal
  existente, nem na pendência de busca do `TODO.md` (fora de escopo, §4).
