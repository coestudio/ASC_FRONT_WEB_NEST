# SPEC-105 — Sidebar: só um item ativo por seção

- **ID:** SPEC-105
- **Nome:** sidebar-single-active-item
- **Status:** IMPLEMENTED (2026-09-25) — pedido do usuário ("hoje seleciono
  um item fica 2 preenchidos, fazer em todas as áreas: administrativo,
  administrador, operacional, laboratório"). Branch
  `fix/105-sidebar-single-active-item`, revisão do usuário antes do merge.
- **Autor:** claude (2026-09-25)
- **Área:** `src/layouts/AppShell/index.tsx` (`SidebarSection`).

## 1. Problema

Ao abrir um item (ex.: Administrativo > Operações), o item "Início" da
mesma seção também aparecia destacado. `getActiveItemTo` já escolhia só o
item mais específico e passava `active={itemActive}` ao `Nav.Link`, mas o
`<Link>` do TanStack Router (usado via `as={Link}`) se marca ativo sozinho
**por prefixo** de rota: adiciona a classe `.active` (que o CSS
`.navSub a.active` pinta) e `aria-current="page"`. Como `/administrative`
é prefixo de `/administrative/operations`, "Início" ganhava `.active` junto.

Afetava toda seção com um "Início" prefixo dos outros itens:
Administrativo (`/administrative`), Operacional (`/operational`),
Laboratório (`/laboratory`) e Cliente (`/client`).

## 2. Correção

`activeOptions={{ exact: true }}` no `Nav.Link as={Link}`: o `<Link>` só
se marca ativo (classe e `aria-current`) na rota exata. O destaque em rota
de detalhe (ex.: `/administrative/operations/{id}` → "Operações")
continua vindo de `active={itemActive}` (`getActiveItemTo`). Um ponto só —
vale pra todas as seções.

## 3. Critérios de aceite

- [ ] Em cada seção, abrir qualquer item destaca **só** ele (não o Início).
- [ ] "Início" destacado só na própria home da seção.
- [ ] Rota de detalhe (ex.: operação aberta) mantém destacado o item pai
      ("Operações").
- [ ] Cabeçalho da seção continua destacado quando algum item dela está ativo.
- [x] `bun run check` e `bun run lint` limpos.
