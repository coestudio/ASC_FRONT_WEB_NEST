# SPEC-54 — Botão "Me adicionar como Responsável"

- **ID:** SPEC-54
- **Nome:** responsible-self-link-button
- **Status:** DRAFT — depende de `warren/Core/specs/44-responsible-self-link`
  (`DRAFT`).
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
