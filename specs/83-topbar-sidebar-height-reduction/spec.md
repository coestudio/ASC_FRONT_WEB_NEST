# SPEC-83 — Reduzir altura de `.topbar`/`.sidebarHeader` de 80px para 60px

- **ID:** SPEC-83
- **Nome:** topbar-sidebar-height-reduction
- **Status:** IMPLEMENTED — sem `[NEEDS_DECISION]`.
- **Autor:** claude (pedido do usuário, 2026-09-17: "a alturas dos height
  estão fixas, correto? 80px do sidebar e do main context... reduzir para
  60px")
- **Área:** `src/layouts/AppShell/index.module.css`.

---

## 1. Objetivo

`.sidebarHeader` e `.topbar` (`AppShell/index.module.css:38` e `:349`) têm
altura travada em `80px`, propositalmente casadas (comentários explícitos:
`"height = 80px, matched by .topbar"` / `"matched by .sidebarHeader"`) pra
que a borda inferior de ambas fique alinhada na mesma linha horizontal.
Usuário pediu reduzir as duas para `60px`.

## 2. Contexto — estado atual

- `.sidebarHeader` (linha 37-44): `height: 80px`, `box-sizing: border-box`,
  padding `0 1.25rem` (só horizontal), conteúdo é a logo/marca (`AppBrand`).
- `.topbar` (linha 348-365): `height: 80px`, `box-sizing: border-box`,
  padding `15px 1.5rem`, `border-bottom: 1px`. Comentário na linha 347
  documenta a conta: `50px conteúdo + 15px padding-top + 15px padding-bottom
  + 1px border-bottom = 80px`.
- Breakpoint mobile (`@media (max-width: 991.98px)`, linha 451-457) já usa
  `.topbar { height: 64px; padding: 0.75rem 1rem; ... }` — **não faz parte
  deste pedido** (já é menor que 60px em padding proporcional, e o usuário
  só citou os dois valores de 80px do layout desktop).

## 3. Escopo

1. `.sidebarHeader` — `height: 80px` → `height: 60px` (padding permanece
   `0 1.25rem`, sem conteúdo vertical a reajustar além do `align-items:
   center` que já centraliza a logo).
2. `.topbar` — `height: 80px` → `height: 60px`; `padding: 15px 1.5rem` →
   `padding: 10px 1.5rem` (mantém a mesma conta com border-bottom de 1px:
   `39px conteúdo + 10px + 10px + 1px = 60px`), ajustando o comentário da
   linha 347 pra refletir a nova conta.
3. Atualizar os comentários `"matched by .topbar"` / `"matched by
   .sidebarHeader"` (linhas 35-36 e 347) só na parte numérica (80→60), o
   resto do texto/raciocínio continua válido.
4. Conferir visualmente que o conteúdo de `.topbar` (avatar `32px`,
   `LanguageSwitcher`, `UserMenu`) ainda cabe dentro dos `39px` de área útil
   vertical (ele já cabia em `50px`, sobra menos margem — se algo cortar,
   ajustar padding vertical pra baixo, não a altura total).

## 4. Fora do escopo

- Breakpoint mobile (`64px`) — inalterado.
- Qualquer outro elemento de altura fixa no shell (`.sidebar`/`.main` usam
  `height: 100%`/`100dvh`, não um pixel fixo).

## 5. Requisitos funcionais

- **RF1** — `.sidebarHeader` e `.topbar` (desktop, ≥992px) medem `60px` de
  altura, ainda alinhados na mesma linha horizontal (borda inferior de
  ambos no mesmo Y).
- **RF2** — Conteúdo interno de ambos (`AppBrand` na sidebar; avatar,
  idioma, menu de usuário no topbar) continua visível e não cortado/
  espremido na nova altura.

## 6. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Inspecionar no browser (≥992px): `.sidebarHeader` e `.topbar` com `60px` de altura computada, bordas alinhadas. |
| CA2 | Nenhum ícone/avatar/texto do topbar corta ou perde `align-items: center`. |
| CA3 | Mobile (`<992px`) permanece com `64px`, sem mudança visual. |
| CA4 | `bun run check` + `bun run lint` sem regressão. |

## 7. Riscos

- **R1** — Baixo: mudança puramente visual de CSS, sem lógica nova. Único
  risco é conteúdo do topbar ficar apertado nos `39px` de área útil — checar
  visualmente antes de fechar (CA2).

## 8. Notas de implementação

- `.sidebarHeader` e `.topbar` (`AppShell/index.module.css`) ajustados pra
  `60px`; `.topbar` teve `padding: 15px 1.5rem` → `10px 1.5rem` (mesma
  conta com border-bottom: `39px conteúdo + 10px + 10px + 1px = 60px`).
  Comentários das linhas atualizados (80→60).
- Breakpoint mobile (`64px`) inalterado, conforme escopo.
- CA2 verificado por cálculo (maior elemento do topbar é
  `.app-topbar__avatar`, `32px`, cabe folgado nos `39px` de área útil com
  `align-items: center`) — sem ferramenta de captura visual disponível no
  ambiente desta implementação para confirmação por screenshot.
- `bun run check` + `bun run lint`: 0 erros, 63 warnings (baseline
  pré-existente, sem regressão).
