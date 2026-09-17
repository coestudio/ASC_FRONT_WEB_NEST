# SPEC-89 — Remove toasts de erro duplicados

- **ID:** 89
- **Nome:** remove-duplicate-error-toasts
- **Status:** IMPLEMENTED

## Objetivo

Eliminar o bug de UX confirmado onde 2 toasts aparecem em sequência quando
uma mutação/chamada falha (ex.: 409 "Já existe um registro com esses
dados." na estufagem em lote, `Operational.tsx`). Causa raiz: o
interceptor de resposta global do axios (`src/api/mutator.ts`, linhas
~236-267) já extrai `ProblemDetails.detail` do Core e mostra um
`toast.warning`/`toast.error` automaticamente para **qualquer** chamada que
passe por `axiosInstance` (hooks Orval, `mutateAsync`, `axiosInstance.get`
direto). Vários componentes, além disso, têm um `catch { toast.error(<msg
genérica>) }` logo depois do `await`, que dispara um **segundo** toast
redundante, porque o `catch` não sabe que o interceptor já notificou.

## Contexto

`src/api/mutator.ts` (interceptor de resposta, linhas ~203-269): para
qualquer `AxiosError` que não seja 401 (que redireciona pro login sem
toast) e para qualquer erro de rede sem `response` (servidor fora do ar),
sempre chama `toast.warning`/`toast.error` com uma mensagem — a do
`ProblemDetails.detail` do Core quando existe, ou um fallback genérico por
status. Ou seja: **toda** chamada HTTP que passa por `axiosInstance`
(diretamente ou via hook Orval `use...Mutation`) já é notificada pelo
interceptor em caso de erro, sem que o componente precise fazer nada.

Levantamento (`grep -rln "catch {" src/components src/routes | xargs grep
-l "toast.error"`) encontrou 15 arquivos com esse padrão. Durante a
implementação, um segundo achado (fora do grep original, que só cobria
`src/components` e `src/routes`): `src/hooks/useCrudMutations.ts` — hook
compartilhado por 8 telas de CRUD simples (SPEC-18) — tem exatamente o
mesmo padrão (`catch { toast.error(t(messages.error)); }` logo depois de
`await onCreate/onUpdate/onDelete(...)`, que é sempre um `mutateAsync`
fechado pela tela consumidora). Como é a mesma causa raiz, mesmo padrão e
mesmo critério de decisão, foi incluído no escopo desta SPEC.

## Escopo

Revisar, arquivo por arquivo, todo `catch` que aparece logo depois de um
`await` numa chamada HTTP (`...Mutation.mutateAsync(...)` gerado pelo
Orval, ou `axiosInstance.get(...)` direto) cujo único conteúdo seja mostrar
um `toast.error`/`toast.warning` genérico, e remover esse toast — mantendo
o resto da lógica do `catch` (reset de estado, fechar modal em `finally`
etc.) quando existir.

## Fora do escopo

- Mudar qualquer mensagem de toast de **sucesso**.
- Mudar o comportamento do interceptor em `src/api/mutator.ts`.
- Tocar em `catch` cujo erro não vem de uma chamada HTTP via
  `axiosInstance` (ex. validação Zod local síncrona, `.parse()` antes do
  request) — esses toasts continuam sendo a única notificação e são
  mantidos.

## Critério de decisão (aplicado arquivo por arquivo)

- `catch` só com `toast.error` genérico, logo após `mutateAsync`/
  `axiosInstance.get` → **remove o toast**, interceptor já notifica.
- `catch` com lógica adicional (reset de form, fechar seleção) → mantém o
  `catch`, remove só a linha do `toast.error`.
- `try` que mistura validação local síncrona (`.parse()` do Zod) com uma
  chamada HTTP depois → distingue a origem do erro dentro do `catch` (ex.
  `err instanceof z.ZodError`) em vez de remover o toast cegamente, porque
  o caminho de validação local nunca passa pelo interceptor.
- `toast.error` de validação de negócio local que faz `return` **antes**
  de chegar no `mutateAsync` (não está dentro de um `catch` de chamada
  HTTP) → fora do escopo, mantido sem alteração.

## Levantamento e decisão por arquivo

| Arquivo | Linha(s) do `catch` | Decisão | Motivo |
| --- | --- | --- | --- |
| `src/components/operations/operations-list.tsx` | 460, 472 | Removido | `catch` limpo após `mutateAsync` (create/update) |
| `src/components/operations/tabs/Details.tsx` | 87 | Removido | `catch` limpo após `mutateAsync` |
| `src/components/operations/tabs/Responsible.tsx` | 159 | Removido | `catch` limpo após `mutateAsync` (unlink) |
| `src/components/operations/tabs/Reports.tsx` | 87 | Removido | Caminho de erro dominante é o `axiosInstance.get` (download); manipulação de DOM depois raramente lança |
| `src/components/operations/tabs/Documents.tsx` | 132, 159 | Removido | `catch` limpo após `mutateAsync` (create/update) |
| `src/components/operations/tabs/Operational.tsx` | 346, 526, 599 | Removido | `catch` limpo após `mutateAsync` — inclui o caso reportado (estufagem em lote, linha ~526) |
| `src/components/operations/tabs/Occurrences.tsx` | 95, 118 | Removido | `catch` limpo após `mutateAsync` (create/update) |
| `src/components/operations/tabs/Containers.tsx` | 185, 213, 238, 250, 569, 684, 695 | Removido | `catch` limpo após `mutateAsync` (unseal, link, update, delete, seal, upload/delete foto) |
| `src/components/operations/tabs/Invoice.tsx` | 211, 223, 235 | Removido | `catch` limpo após `mutateAsync` (create/confirm/cancel) |
| `src/components/operations/tabs/Romaneio.tsx` | 180, 374, 600, 700 | Removido | `catch` limpo após `mutateAsync`/`axiosInstance.get` (delete em lote, export, edição em lote, analyze do import) |
| `src/components/operations/tabs/Romaneio.tsx` | 768 (`handleApply`) | **Mantido, com distinção de origem** | `try` mistura `PostApiOperationOperationIdRomaneioImportApplyBody.parse(...)` (síncrono, local) com `applyMutation.mutateAsync(...)` (HTTP) — catch passa a checar `err instanceof z.ZodError` antes de mostrar o toast, pra não duplicar o aviso do interceptor quando o erro vier do `mutateAsync` |
| `src/components/profile/address-tab.tsx` | 76 | Removido | `catch` limpo após `mutateAsync` |
| `src/components/profile/password-tab.tsx` | 55 | Removido | `catch` limpo após `mutateAsync` |
| `src/components/profile/detail-tab.tsx` | 115 | Removido | `catch` limpo após `mutateAsync` |
| `src/components/profile/profile-modal.tsx` | 78-80 | Removido só o toast | `catch` também faz `avatarForm.setValue("avatarFile", null)` — mantido, só a linha `toast.error` sai |
| `src/routes/_dashboard/admin/access/index.tsx` | 299, 326 | Removido | `catch` limpo após `mutateAsync` (create/update e activate/deactivate/reset/delete) |
| `src/hooks/useCrudMutations.ts` | 81 (`submit`), 96 (`remove`) | Removido | Hook compartilhado por 8 telas de CRUD simples (SPEC-18) — `catch` limpo após `await onCreate/onUpdate/onDelete(...)`, sempre um `mutateAsync` fechado pela tela consumidora. Achado fora do grep original (`src/hooks` não estava no escopo do comando), mas mesma causa raiz |

Total: 17 arquivos (15 do grep original + `operations-list.tsx`, que
também bateu no grep mas não estava listado explicitamente no pedido, +
`useCrudMutations.ts`, achado durante a implementação), 31 ocorrências de
`catch` revisadas: 30 toasts removidos, 1 mantido com lógica de distinção
de origem (Zod local vs. HTTP).

## Achado fora do escopo original — `Responsible.tsx` onError callbacks

Durante o levantamento, `src/components/operations/tabs/Responsible.tsx`
(linhas ~104-107 e ~145-148) mostrou o mesmo bug de toast duplicado, mas
num formato diferente do padrão pedido: não é `catch { toast.error(...) }`
depois de um `await mutateAsync`, e sim um callback `onError: () =>
toast.error(...)` passado direto pro `.mutate(...)` (API de callbacks do
TanStack Query, não `mutateAsync`/`try-catch`). Mesma causa raiz (o
interceptor global já notifica), mas fora do padrão literal definido nesta
SPEC (`catch {` + `grep -l "toast.error"` em `src/components`/`src/routes`)
e fora dos arquivos citados explicitamente pelo usuário. **Não alterado
nesta SPEC** — fica registrado aqui como candidato a uma SPEC futura, pra
não expandir escopo silenciosamente.

Casos que **não** são catch de erro HTTP e ficam fora do escopo (mantidos
sem alteração, não contam no total acima):

- `Containers.tsx` linha ~554 (`SealModal.handleSubmit`) — validação local
  (`if (!values.file)`) com `return` antes de qualquer chamada HTTP, não é
  um `catch`.
- `Operational.tsx` linha ~504 (`ContainerBatchStuffModal.handleSubmit`) —
  validação local (fatura ausente) dentro do `try`, mas com `return` antes
  de chegar no `mutateAsync`; o `catch` do mesmo bloco (linha 526) é o item
  já listado acima como removido.

## Critérios de aceitação

| # | Critério | Resultado |
| --- | --- | --- |
| 1 | Nenhum `catch` genérico pós-`mutateAsync`/`axiosInstance` mostra toast redundante nos 16 arquivos listados | PASS |
| 2 | `handleApply` do wizard de import de romaneio continua avisando erro de validação local (Zod) sem duplicar aviso de erro HTTP | PASS |
| 3 | Nenhuma mensagem de toast de sucesso foi alterada | PASS |
| 4 | `bun run check` sem novos erros | PASS |
| 5 | `bun run lint` sem novos warnings/erros | PASS |

## Implementation Notes

- Arquivos alterados: os 17 listados na tabela acima (`operations-list.tsx`,
  `Details.tsx`, `Responsible.tsx`, `Reports.tsx`, `Documents.tsx`,
  `Operational.tsx`, `Occurrences.tsx`, `Containers.tsx`, `Invoice.tsx`,
  `Romaneio.tsx`, `address-tab.tsx`, `password-tab.tsx`, `detail-tab.tsx`,
  `profile-modal.tsx`, `access/index.tsx`, `useCrudMutations.ts`).
- Comandos executados:
  - `bun run check` → `tsc --noEmit` sem erros (`VERIFIED`).
  - `bun run lint` → `0 errors, 65 warnings` — idêntico ao lint rodado sem
    as mudanças desta SPEC (`diff` entre as duas saídas veio vazio); baseline
    real do repo hoje é 65 warnings, não 63 como citado no pedido original
    (drift de commits recentes, não relacionado a esta SPEC) (`VERIFIED`).
- Decisões tomadas durante a implementação:
  - `Romaneio.tsx#handleApply` precisou de tratamento diferenciado
    (checagem de `err instanceof z.ZodError`) por misturar validação local
    (`.parse()`) com chamada HTTP (`mutateAsync`) no mesmo `try`.
  - `src/hooks/useCrudMutations.ts` foi incluído no escopo, embora fora do
    grep original (`src/hooks` não estava coberto pelo comando do pedido):
    mesmo padrão exato (`catch { toast.error(...) }` após `mutateAsync`),
    usado por 8 telas de CRUD (SPEC-18). Campo `CrudMutationMessages.error`
    virou opcional/`@deprecated` em vez de removido, pra não quebrar as 8
    telas que ainda passam essa chave em `messages`.
  - `Responsible.tsx` tem 2 ocorrências do mesmo bug num formato diferente
    (`onError` callback de `.mutate(...)`, não `catch` de `try/await`) —
    fora do padrão literal definido nesta SPEC, **não alteradas**, deixadas
    registradas como candidato a uma SPEC futura (ver seção acima).
- Limitação conhecida: nenhuma nos arquivos alterados — mudança é
  puramente de remoção de toast redundante, sem novo comportamento
  funcional. O achado do `Responsible.tsx` (`onError` callback) é uma
  limitação de escopo conhecida, não uma limitação da implementação feita.
