# SPEC-75 — Estufagem: scrollbar vertical na listagem

- **ID:** SPEC-75
- **Nome:** stuffing-tab-scroll
- **Status:** IMPLEMENTED (2026-09-17)
- **Autor:** claude (pedido do usuário, 2026-09-17 — anotado antes no
  `TODO.md`)
- **Área:** `src/components/crud/crud-list-page.tsx` (prop nova, opt-in),
  `src/components/operations/tabs/Operational.tsx` (`StuffingTab`, único
  consumidor que liga a prop por ora).

---

## 1. Objetivo

Pedido do usuário: scrollbar na listagem da sub-aba Estufagem — decisão
fechada via pergunta direta: **vertical, com altura fixa** (não
horizontal) — cabeçalho/toolbar de busca e paginação continuam fixos na
tela, só as linhas da tabela rolam.

## 2. Escopo

1. `CrudListPage` ganha prop opcional `maxBodyHeight?: number | string`.
   Ausente (padrão pra todo consumidor existente): nenhuma mudança de
   comportamento — tabela cresce livre, como sempre foi. Presente: a
   `div` que envolve a `<Table>` (`styles.tableCard`) ganha
   `maxHeight`/`overflow-y: auto`.
2. `StuffingTab` (Estufagem) é o único lugar que liga a prop por agora
   (`maxBodyHeight={480}`), conforme pedido do usuário ("por enquanto
   limitado à aba de estufagem", anotado no `TODO.md`).

## 3. Fora do escopo

- Scroll horizontal (usuário descartou explicitamente).
- Cabeçalho da tabela (`<thead>`) fixo/sticky durante o scroll — não foi
  pedido; a tabela inteira (cabeçalho + linhas) rola dentro da área com
  `maxHeight`. Se o usuário quiser cabeçalho fixo depois, é ajuste
  incremental (CSS `position: sticky` no `<thead>`), não um redesenho.
- Ligar `maxBodyHeight` em outras listagens (Romaneio, Containers, etc.)
  — só a Estufagem por pedido explícito.

## 4. Critérios de aceitação

- CA1: lista da Estufagem com mais fardos do que cabem em ~480px mostra
  scrollbar vertical interna; busca/paginação continuam visíveis fora da
  área rolável.
- CA2: nenhum outro consumidor de `CrudListPage` (Romaneio, Access,
  etc.) muda de comportamento (prop não usada = sem efeito).
- CA3: `tsc --noEmit` e lint sem erro novo.

## 5. Implementation Notes (2026-09-17)

- `maxBodyHeight` fica como número (px) ou string CSS válida
  (`"60vh"`, etc.) — `StuffingTab` usa `480` (px implícito via React
  inline style).
- `.tableCard` já tinha `overflow: hidden` (CSS module, só pra recortar
  cantos arredondados/sombra) — o `overflow-y: auto` inline sobrescreve
  só o eixo vertical pra esse elemento; `overflow-x` continua tratado
  pelo wrapper `.table-responsive` do próprio `<Table responsive>` do
  react-bootstrap, sem conflito.
- `tsc --noEmit`/`lint` sem erro novo. **Não verificado visualmente em
  navegador** nesta sessão (sem sessão logada disponível) — a mudança é
  puramente CSS/prop opcional, risco baixo, mas vale conferir o
  resultado visual (altura de 480px é um chute razoável, pode precisar
  de ajuste fino).