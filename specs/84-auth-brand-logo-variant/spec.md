# SPEC-84 — Unificar `AppBrand` em `/auth/login` pro `variant="logo"`

- **ID:** SPEC-84
- **Nome:** auth-brand-logo-variant
- **Status:** IMPLEMENTED — sem `[NEEDS_DECISION]` (usuário escolheu via
  pergunta de escopo, 2026-09-17: "Logo (imagem PNG) nas duas").
- **Autor:** claude (pedido do usuário, 2026-09-17: "o brand que aparece na
  tela de /auth/login e no top do sidebar são diferentes... o ideal é que no
  /auth/login use o mesmo brand")
- **Área:** `src/routes/auth/route.tsx`, `src/styles/globals/auth.css`.

---

## 1. Objetivo

Usuário percebeu que a marca exibida em `/auth/login` parece diferente da
exibida no topo da sidebar, mesmo sendo a mesma marca configurada (`asa`
nos dois lugares — confirmado pelo usuário via cookie). Causa raiz
investigada: **não é config de marca divergente**, é o componente
`AppBrand` sendo usado com `variant` diferente em cada lugar — login usa
`variant="badge"` (selo circular com sigla "ASA", decisão da SPEC-11),
sidebar usa o default `variant="logo"` (imagem PNG, decisão da SPEC-29).
Usuário escolheu unificar para `variant="logo"` nas duas telas.

## 2. Contexto — estado atual

- `src/layouts/AppBrand/index.tsx` — componente único, sem CSS module
  próprio (classes globais `.app-brand*` em `src/styles/globals/base.css`).
  Prop `variant?: "logo" | "badge"` (default `"logo"`): `"logo"` renderiza
  `<img src={logo}>` (PNG por marca, `src/assets/{ASA,ASI,ASC}/logo.png`);
  `"badge"` renderiza um selo CSS circular com a sigla (`BRAND_INITIALS`).
- `src/routes/auth/route.tsx:25` — `<AppBrand size="sm" variant="badge"
  className="auth-brand" />` (comentário cita SPEC-11 item 2/5).
- `src/layouts/AppShell/index.tsx:188` — `<AppBrand as="link" to="/"
  size="sm" />` (default `variant="logo"`, comentário cita SPEC-29).
- `src/styles/globals/auth.css:38-44` — `.auth-brand { margin-bottom:
  1.5rem; }` e uma regra hoje **morta** (`.auth-brand .app-brand__logo {
  border-radius: 50%; }`), porque com `variant="badge"` nunca existe
  `.app-brand__logo` dentro de `.auth-brand` — essa regra foi escrita para
  um cenário com `variant="logo"` e nunca foi ativada.

## 3. Escopo

1. `src/routes/auth/route.tsx:25` — trocar `variant="badge"` por
   `variant="logo"` (ou simplesmente remover a prop, já que `"logo"` é o
   default).
2. Conferir visualmente o resultado no card de login: a regra já existente
   `.auth-brand .app-brand__logo { border-radius: 50%; }` passa a ativar
   (deixa a logo com cantos arredondados em círculo, em vez do
   `border-radius: var(--bs-border-radius-sm)` padrão de `.app-brand__logo`)
   — confirmar se esse arredondamento circular é o efeito desejado ou se é
   resquício de quando a ideia original era outra; se não for desejado,
   remover/ajustar essa regra em `auth.css` junto (evitar CSS morto/
   incoerente sobrando).
3. Não mexer em `AppShell` (já está com `variant="logo"`, é a referência).

## 4. Fora do escopo

- Mudar `AppBrand`/`BRAND_CONTENT`/assets — só o `variant` passado no
  login muda.
- Qualquer lógica de seleção/persistência de marca (`BrandSwitcher`
  continua órfão, fora do escopo desta SPEC).

## 5. Requisitos funcionais

- **RF1** — `/auth/login` (e demais telas do grupo `/auth` que usam o
  mesmo `route.tsx`, ex. forgot-password) mostram a logo em imagem (mesmo
  `variant="logo"` da sidebar), não mais o selo com sigla.
- **RF2** — Aparência entre login e sidebar fica visualmente consistente
  (mesma imagem de marca, ajustada só pelo `size`/contexto de cada tela).

## 6. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | `/auth/login` mostra a logo em imagem da marca ativa, não mais o selo com sigla. |
| CA2 | Comparar visualmente login vs. sidebar: mesma logo, mesma marca. |
| CA3 | `auth.css` não fica com regra CSS morta/conflitante após a mudança (ver item 2 do escopo). |
| CA4 | `bun run check` + `bun run lint` sem regressão. |

## 7. Riscos

- **R1** — Baixo: mudança de uma prop + possível ajuste de uma regra CSS
  já existente, sem lógica nova.

## 8. Notas de implementação

- `src/routes/auth/route.tsx:25` — removida a prop `variant="badge"`
  (default do componente já é `"logo"`), mantendo `size="sm"` e
  `className="auth-brand"`.
- `auth.css` mantido sem alteração: a regra `.auth-brand .app-brand__logo
  { border-radius: 50%; }` deixa de ser código morto e passa a valer —
  efeito desejado (logo em círculo dentro do card, consistente com o selo
  circular que existia antes).
- `bun run check` + `bun run lint`: 0 erros, 63 warnings (baseline
  pré-existente, sem regressão).
