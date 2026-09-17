# SPEC-76 — Estufagem: toolbar de seleção abaixo da busca, acima da listagem

- **ID:** SPEC-76
- **Nome:** stuffing-tab-toolbar-position
- **Status:** IMPLEMENTED (2026-09-17)
- **Autor:** claude (pedido do usuário, 2026-09-17)
- **Área:** `src/components/crud/crud-list-page.tsx` (slot novo, opt-in),
  `src/components/operations/tabs/Operational.tsx` (`StuffingTab`).

---

## 1. Objetivo

Pedido do usuário: a toolbar de seleção ("X selecionados" + botão
"Estufar em container", já revisada na sessão anterior pra ficar sempre
visível com botão desabilitado) precisa ficar **abaixo do campo de
busca e acima da listagem** — antes ficava acima de tudo, inclusive do
título/busca do `CrudListPage`.

## 2. Escopo

1. `CrudListPage` ganha slot opcional `belowSearch?: ReactNode`,
   renderizado depois da linha de busca/toggle/criar e antes da
   listagem (tabela/cards). Ausente, nenhuma mudança de layout pros
   demais consumidores.
2. `StuffingTab` move a toolbar de seleção (antes solta, acima de
   `<CrudListPage>`) pra dentro de `belowSearch`.

## 3. Critérios de aceitação

- CA1: a linha "X selecionados" + botão fica visualmente entre a busca
  e a tabela, não mais acima do título.
- CA2: nenhum outro consumidor de `CrudListPage` muda de comportamento
  (slot não usado = nada renderizado).
- CA3: `tsc --noEmit` e lint sem erro novo.

## 4. Implementation Notes (2026-09-17)

- `tsc --noEmit`/`lint` sem erro novo. Não verificado visualmente em
  navegador nesta sessão.
