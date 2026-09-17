# SPEC-77 — Pasta dedicada `layouts/Filters` pra campo de filtro/busca

- **ID:** SPEC-77
- **Nome:** filter-inputs-dedicated-layout
- **Status:** IMPLEMENTED (2026-09-17)
- **Autor:** claude (pedido do usuário, 2026-09-17)
- **Área:** `src/layouts/Filters/` (nova), `src/components/crud/
  crud-list-page.tsx`, `src/components/operations/operations-list.tsx`,
  `src/components/operations/tabs/Containers.tsx`, `src/components/
  operations/tabs/Responsible.tsx`, `AGENTS.md`, `.github/instructions/
  components.instructions.md`.

---

## 1. Objetivo

Usuário percebeu: campo de busca/filtro de listagem reaproveitava
`layouts/Form/Fields/InputText` (regra 10 do AGENTS.md), mas essa
biblioteca é pra campo de **formulário validado** — todo `Field` de lá
sempre renderiza um `<Form.Label>` e reserva uma linha embaixo pra
mensagem de erro (`<Form.Text>text-muted`/`Form.Control.Feedback`), o
que não faz sentido nenhum pra um filtro, que nunca valida nada. Pedido:
criar uma pasta dedicada em `layouts/` só pra esse tipo de input.

## 2. Contexto — 4 cópias quase idênticas

Achado ao investigar: o padrão "campo isolado de busca" já estava
duplicado 4 vezes, cada uma criando um `useForm<{ search: string }>` só
como ponte pra poder usar `InputText` (que exige `methods` de um form de
verdade):

- `ListSearchInput` (`crud-list-page.tsx`) — usado por toda listagem
  `CrudListPage` (Access, Cadastros, Clientes, Romaneio, Estufagem...).
- `OperationsSearchInput` (`operations-list.tsx`).
- `ContainerSearchInput` (`Containers.tsx`, exportada mas só usada
  localmente desde a SPEC-73).
- Uso direto (`searchMethods`) em `Responsible.tsx`.

## 3. Escopo

1. `layouts/Filters/FilterText.tsx` (+ `Index.ts`) — campo de texto
   controlado direto (`value`/`onChange`), **sem** `react-hook-form`/
   `Controller`, sem `<Form.Label>` visível (só `aria-label` pro leitor
   de tela), sem linha de erro. Ícone opcional (`icon`, mesma convenção
   `bootstrap-icons` do `InputText`).
2. As 4 duplicações viram uso direto de `FilterText`, sem wrapper local
   nenhum — `ListSearchInput`/`OperationsSearchInput`/
   `ContainerSearchInput` foram apagadas (não só descontinuadas).
3. Documentação atualizada: `AGENTS.md` (regra 10, aditivo) e
   `.github/instructions/components.instructions.md` — nova seção
   explicando quando usar `Filters` em vez de `Form/Fields`.

## 4. Fora do escopo

- Filtro de seleção (dropdown, `Select`/`SelectAsync` usados em
  `OperationsFilters`, etc.) — continuam vindo de `Form/Fields` por ora.
  Se algum dropdown de filtro precisar do mesmo tratamento (sem label/
  erro), é decisão nova, não implícita aqui.
- Mudar o comportamento de busca em si (debounce, `Search` do Core) —
  só a implementação do campo mudou, o contrato com quem chama
  (`value`/`onChange`) é o mesmo de antes.

## 5. Critérios de aceitação

- CA1: nenhum campo de filtro de listagem mostra rótulo nem linha
  reservada de erro.
- CA2: as 4 telas afetadas (listagens via `CrudListPage`, Operações,
  Containers, Responsáveis) continuam filtrando normalmente.
- CA3: `tsc --noEmit` e lint sem erro novo.

## 6. Implementation Notes (2026-09-17)

- `FilterText` é puramente controlado — sem `useForm`/`Controller`, mais
  simples que as 4 versões antigas (que precisavam de dois `useEffect`
  cada só pra sincronizar `value` externo ↔ estado interno do RHF).
- Imports órfãos removidos junto (`InputText` em `operations-list.tsx`/
  `Responsible.tsx` onde não sobrou outro uso; `useForm`/`useEffect` em
  `crud-list-page.tsx`).
- `tsc --noEmit`/`lint` sem erro novo (mesma baseline de 63 avisos
  pré-existentes, nenhum novo). Não verificado visualmente em navegador
  nesta sessão.
