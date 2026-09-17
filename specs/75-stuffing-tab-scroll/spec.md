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

## 2. Escopo (ver §6 pra versão final — reaberta no mesmo dia)

1. `CrudListPage` ganha prop opcional `fillHeight?: boolean`. Ausente
   (padrão pra todo consumidor existente): nenhuma mudança de
   comportamento. Presente: a `div` que envolve a `<Table>`
   (`styles.tableCard`) preenche a altura restante da viewport (medida
   dinamicamente, não um valor fixo) e ganha `overflow-y: auto` +
   cabeçalho de coluna fixo.
2. `StuffingTab` (Estufagem) é o único lugar que liga a prop por agora
   (`fillHeight`), conforme pedido do usuário ("por enquanto limitado à
   aba de estufagem", anotado no `TODO.md`).

## 3. Fora do escopo

- Scroll horizontal (usuário descartou explicitamente).
- Ligar `fillHeight` em outras listagens (Romaneio, Containers, etc.) —
  só a Estufagem por pedido explícito.
- Estender o preenchimento de altura pros estados de carregando/erro/
  vazio (`isLoading`/`isError`/`items.length === 0`) — só a tabela com
  dados usa `fillHeight`; esses 3 estados continuam com o alerta simples
  de tamanho natural (ver §6, reabertura, pra não confundir com "cabeçalho
  fixo" que também ficou fora do escopo original antes de virar item (1)
  da reabertura).

## 4. Critérios de aceitação

- CA1: lista da Estufagem preenche o espaço restante até o fim da tela
  (nem mais, nem menos) — título/busca/toolbar acima e paginação abaixo
  ficam com tamanho natural, fora da área rolável.
- CA2: cabeçalho de coluna (`<thead>`) permanece visível durante a
  rolagem das linhas.
- CA3: com poucos itens (sem preencher o espaço todo), o fundo do card
  continua até a altura calculada — fica visualmente claro que não há
  mais itens abaixo.
- CA4: nenhum outro consumidor de `CrudListPage` (Romaneio, Access,
  etc.) muda de comportamento (prop não usada = sem efeito).
- CA5: `tsc --noEmit` e lint sem erro novo.

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

## 6. Reabertura (2026-09-17, mesmo dia) — altura dinâmica + cabeçalho fixo

Usuário reviu o resultado e pediu 3 ajustes antes mesmo de ver renderizado
(baseado na descrição do prop): (1) o `<thead>` não pode ser afetado pela
rolagem — precisa ficar fixo; (2) altura fixa em px não é o que ele quer —
tudo *fora* da listagem (título, busca, toolbar de seleção) deve ocupar só
o espaço que precisa, a paginação no fim ocupa só o espaço que precisa, e
a listagem cobre exatamente o que sobra até o fim da tela; (3) mesmo com
poucos itens (sem cobrir todo o espaço disponível), o card deve manter o
fundo preenchendo a sobra — deixa claro pro usuário que não há mais itens
abaixo, em vez de a caixa encolher pro tamanho do conteúdo.

**Prop renomeada e reimplementada:** `maxBodyHeight` (número/string fixo)
virou `fillHeight?: boolean` — em vez de o consumidor informar um valor,
o `CrudListPageBody` mede a posição real do card via
`getBoundingClientRect()` (`fillCardRef`) e a altura real da paginação
via outro ref (`fillPaginationRef`, sempre presente envolvendo
`<ListPagination>`, mesmo quando ela renderiza `null` com 1 página só —
nesse caso a altura medida é `0`, sem precisar de caso especial). A
altura final é `window.innerHeight - cardTop - paginationHeight - 24px`
(o mesmo padding inferior de `.content`, `AppShell`), recalculada com
`ResizeObserver` em `document.body` (pega mudança de layout de qualquer
elemento acima, ex. a toolbar de seleção da SPEC-73 aparecendo/
desaparecendo) e em `resize` da janela. Nunca fica menor que 160px
(`FILL_MIN_HEIGHT_PX`), como salvaguarda.

**`height` no lugar de `max-height`:** a diferença crítica pro item (3) —
`max-height` só limita crescimento, não força o card a ocupar o espaço
quando o conteúdo é menor; `height` fixa exatamente o valor medido,
então o fundo do card (`var(--surface)`, já existia no CSS) preenche
visualmente a sobra abaixo da última linha.

**Cabeçalho fixo:** nova classe opt-in `crudTableStickyHead`
(`crud-list-page.module.css`), aplicada só quando `fillHeight` é `true`
— `position: sticky; top: 0` no `<thead> th`, relativo ao próprio
`.tableCard` (que agora é o container de scroll nesse modo). Sem
`fillHeight`, essa classe não é aplicada — outras listagens (Romaneio,
Access) não ganham `position: sticky` nenhum, porque nelas quem rola é
`.content` (a página inteira), e um `<thead>` sticky ali grudaria numa
posição estranha no meio da página.

- `tsc --noEmit`/`lint` sem erro novo após a reescrita.
- **Ainda não verificado visualmente em navegador** — o cálculo via
  `getBoundingClientRect`/`ResizeObserver` é uma técnica padrão pra esse
  problema (não existe cadeia de `height: 100%` entre `.content` e esta
  tela — várias camadas de layout no meio, `PageLayout`/shell da
  Operação/`Tab.Container`, não estabelecem altura), mas só confirma
  medindo na tela de verdade. Se o resultado não bater (ex. calculo
  errado numa combinação de zoom/DPI incomum), é ajuste no
  `crud-list-page.tsx`, não redesenho.