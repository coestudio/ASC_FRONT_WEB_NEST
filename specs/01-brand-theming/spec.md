# SPEC-01 — Identidade visual: brand × modo (light/dark)

- **ID:** SPEC-01
- **Nome:** brand-theming
- **Status:** DRAFT
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/styles/**`, `src/lib/ui-prefs.tsx`, `src/routes/__root.tsx`,
  `src/components/theme/**`, `src/components/i18n/**` (padrão do switcher),
  `src/assets/**`
- **Instruction aplicável:** `.github/instructions/theming.instructions.md`

---

## 1. Objetivo

Introduzir **3 brands** (ASA, ASI, ASC) como dimensão de tema independente do
**modo** (light/dark), aplicadas via `data-brand` + `data-bs-theme` no
`<html>`, com a paleta 100% em tokens CSS e zero cor hard-coded em componente.

## 2. Contexto

Hoje:

- `src/styles/globals/tokens.css` — só `[data-bs-theme="light"]` e
  `[data-bs-theme="dark"]`, paleta **ASA hard-coded** (verde `#23ab79` /
  `#61ce70`), tokens `--sidebar-*`. Não conhece brand.
- `src/styles/globals/color-modes.ts` — tipos/const de **modo** apenas
  (`ThemeMode`, `ResolvedTheme`, `systemPrefersDark`, `resolveTheme`).
  Cookie `asc_theme`, storage key `theme`.
- `src/styles/globals/theme-store.ts` — helpers de cookie/DOM +
  `THEME_NO_FLASH_SCRIPT` (script inline no `<head>` que seta `data-bs-theme`
  antes do paint).
- `src/lib/ui-prefs.tsx` — `UiPrefsProvider` (tema + idioma), `readUiPrefs`
  isomórfico, hooks `useThemeMode`/`useResolvedTheme`/`useSetThemeMode`.
- `src/routes/__root.tsx` — `beforeLoad` chama `readUiPrefs()`, `RootShell`
  renderiza `<html data-bs-theme={resolveTheme(themeMode)}>`, injeta o
  no-flash script.
- `src/components/theme/theme-toggle.tsx` — toggle de modo.
- `UserDetailDTO` / `UserAdminDTO` (gerado) **não têm** campo de brand/tenant.
- Referência: `warren/Portal/src/Assets/css/themes/brands/{asa,asi,asc}.css`
  já têm `--brand-primary` por `[data-brand][data-theme]`.

Decisões já tomadas (mensagem do usuário + Q&A):

- **D-fixa-1** Brand = **escolha do usuário/tenant**, trocável em runtime;
  default **`asa`**; quando o Core expuser, vem de `/profile/me`.
- **D-fixa-2** Modo é **global** (uma preferência só, cookie `asc_theme`),
  ortogonal à brand.
- **D-fixa-3** 3 brands: `asa` (verde/amarelo, default), `asi` (vermelho/
  marrom `rgb(188,144,90)`), `asc` (azul/ciano). Cada uma com light (padrão)
  e dark.

## 3. Escopo

1. `data-brand` no `<html>`, cookie `asc_brand`, default `asa`.
2. `tokens.css` reestruturado em 6 blocos `[data-brand="X"][data-bs-theme="Y"]`
   + fallback, com o mesmo conjunto de CSS vars em todos.
3. Token de **cor auxiliar de marca** (`--brand-accent` + `--brand-accent-rgb`)
   — separado de `--bs-secondary` (que continua cinza neutro de UI).
4. `color-modes.ts` (ou um novo `brand.ts` irmão) ganha tipo/const de brand
   (`Brand = "asa" | "asi" | "asc"`, `isBrand`, `DEFAULT_BRAND`, cookie name).
5. `theme-store.ts` — helpers `readBrandCookie`/`writeBrandCookie`/
   `applyBrandToDocument`; `THEME_NO_FLASH_SCRIPT` passa a setar **os dois**
   atributos.
6. `ui-prefs.tsx` — `readUiPrefs` lê `asc_brand`; `UiPrefsProvider` mantém
   `brand` no estado; hooks `useBrand()` / `useSetBrand()`; `<html>` recebe
   `data-brand`.
7. `__root.tsx` — `RootShell` renderiza `data-brand` a partir do contexto.
8. Componente de troca de brand (`src/components/theme/brand-switcher.tsx`),
   mesmo padrão do `LanguageSwitcher` (Dropdown react-bootstrap). Onde ele
   aparece: ponto aberto D4.
9. Varredura e remoção de cor hard-coded nos componentes atuais (`#…`,
   `rgb(...)`) → token.
10. **Assets por brand** (logo, imagens, favicon) seguindo a brand ativa —
    mecânica em D5. `src/layouts/AppBrand/index.tsx` é o componente de marca
    (logo + título/subtítulo) e faz parte deste escopo, mas hoje está
    **quebrado e sem uso** — sobra do port do Portal:
    - `import { Link } from "react-router-dom"` — dependência que não existe
      neste projeto (é TanStack Router aqui).
    - `import { useBrandStore } from "Hooks/useBrand"` — módulo inexistente,
      alias errado (`Hooks/` → o projeto usa `hooks/*` minúsculo).
    - `import ... from "Assets/ASA/logo.png"` / `"Assets/ASI/logo_box.png"` —
      idem, alias errado (`assets/*`), e só cobre `asa`/`asi` (falta `asc`).

    Reescrever como parte da implementação desta SPEC: `Link` do
    `@tanstack/react-router`, fonte de brand = `useBrand()` (§9.4),
    `BRAND_CONTENT` com as 3 brands e imports de `@/assets/{ASA,ASI,ASC}`.

## 4. Fora do escopo

- Campo de brand/tenant no Core (`/profile/me`) — dependência externa; até
  existir, a fonte é só o cookie + switcher. Registrar como `[NEEDS_DECISION]`
  quando a integração for necessária.
- Temas além de light/dark (sem "sépia", "alto contraste" etc.).
- Rebranding dos sites públicos de marketing (`warren/Websites`).
- Editor visual de tema / customização por usuário além de escolher a brand.

## 5. Requisitos funcionais

- **RF1** — Sem cookie `asc_brand`, o app renderiza com `data-brand="asa"`
  (SSR e client), sem flash.
- **RF2** — `useSetBrand("asi")` grava cookie `asc_brand`, muda `data-brand`
  no `<html>` na hora, toda a UI recolore, **sem reload** e sem mudar o modo.
- **RF3** — Modo (light/dark/system) continua funcionando exatamente como
  hoje, independente da brand ativa.
- **RF4** — No SSR, `data-brand` e `data-bs-theme` já vêm corretos no HTML
  (lidos dos cookies), o no-flash script só corrige o caso `system`.
- **RF5** — As 6 combinações (3 brands × 2 modos) têm contraste AA para texto
  sobre superfícies primárias e de corpo.
- **RF6** — Nenhum componente referencia cor literal; tudo via token.

## 6. Requisitos não funcionais

- **RNF1** — `bun run check` + `bun run lint` + `bun run build` + `build:azure`
  passam.
- **RNF2** — Sem dependência nova. Sem mudança de layout/tipografia.
- **RNF3** — `tokens.css`: um único conjunto de nomes de var, 6 blocos.
- **RNF4** — Arquivos em inglês, comentários PT-BR.

## 7. Contrato de rota / 8. Camada de dados

N/A (nenhuma rota nova; nenhum acesso ao Core até o campo de brand existir).

## 9. Desenho

### 9.1 Atributos no `<html>`

```html
<html lang="pt-BR" data-brand="asa" data-bs-theme="light">
```

### 9.2 `tokens.css` — forma

```css
/* Cada bloco redefine O MESMO conjunto de vars. asa+light também é o fallback. */
:root,
[data-brand="asa"][data-bs-theme="light"] {
  --bs-primary: #___; --bs-primary-rgb: _,_,_;
  --brand-accent: #___; --brand-accent-rgb: _,_,_;   /* amarelo */
  --bs-success: var(--bs-primary); --bs-success-rgb: var(--bs-primary-rgb);
  --bs-link-color: var(--bs-primary); --bs-link-color-rgb: var(--bs-primary-rgb);
  --bs-danger: #___; --bs-warning: #___; --bs-info: #___;
  --sidebar-bg: #___; --sidebar-fg: #___; /* … demais --sidebar-* … */
}
[data-brand="asa"][data-bs-theme="dark"]  { /* … */ }
[data-brand="asi"][data-bs-theme="light"] { /* vermelho + marrom rgb(188,144,90) */ }
[data-brand="asi"][data-bs-theme="dark"]  { /* … */ }
[data-brand="asc"][data-bs-theme="light"] { /* azul + ciano */ }
[data-brand="asc"][data-bs-theme="dark"]  { /* … */ }
```

Paleta concreta a preencher (D1). Ponto de partida sugerido, a validar
contraste:

| | primária light | primária dark | accent |
| --- | --- | --- | --- |
| asa | `#23ab79` (atual) | `#61ce70` (atual) | amarelo `#___` |
| asi | vermelho `#___` | vermelho `#___` | `rgb(188,144,90)` = `#bc905a` |
| asc | azul `#___` | azul `#___` | ciano `#___` |

### 9.3 No-flash script (`theme-store.ts`)

```js
try {
  var ck = document.cookie;
  var brand = (ck.match(/(?:^|;\s*)asc_brand=([^;]+)/) || [])[1] || "asa";
  if (brand !== "asa" && brand !== "asi" && brand !== "asc") brand = "asa";
  document.documentElement.setAttribute("data-brand", brand);
  var m = (ck.match(/(?:^|;\s*)asc_theme=([^;]+)/) || [])[1] || "system";
  var dark = m === "dark" || (m === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-bs-theme", dark ? "dark" : "light");
} catch (e) {}
```

### 9.4 `ui-prefs.tsx`

- `UiPrefs` ganha `brand: Brand`.
- `readUiPrefs().server()` lê `getCookie("asc_brand")` → `isBrand` ? : `"asa"`.
- `readUiPrefs().client()` idem via `document.cookie`.
- `UiPrefsProvider`: `useState<Brand>(initial.brand)`, `setBrand` grava cookie
  (`max-age` 1 ano, `SameSite=Lax`) + `applyBrandToDocument`.
- Novos hooks: `useBrand()`, `useSetBrand()`. Exportados via `@/lib/ui-prefs`
  (e re-export por onde fizer sentido).

### 9.5 `__root.tsx`

`RootShell`: `<html lang={locale} data-brand={brand} data-bs-theme={resolveTheme(themeMode)}>`.
`brand` sai de `Route.useRouteContext()` (já vem do `beforeLoad` → `readUiPrefs`).

### 9.6 Brand switcher

`src/components/theme/brand-switcher.tsx` — Dropdown react-bootstrap, itera
uma const `BRANDS` com `{ id, label, mark }`. Colocação: D4.

## 10. Arquivos esperados

| Arquivo | Ação |
| --- | --- |
| `src/styles/globals/tokens.css` | reescrever — 6 blocos brand×modo |
| `src/styles/globals/color-modes.ts` | editar (ou add `brand.ts`) — tipo/const de brand |
| `src/styles/globals/theme-store.ts` | editar — helpers de brand + no-flash script |
| `src/lib/ui-prefs.tsx` | editar — `brand` no estado, hooks, `data-brand` |
| `src/routes/__root.tsx` | editar — `data-brand` no `RootShell` |
| `src/components/theme/brand-switcher.tsx` | criar |
| componentes com cor literal | editar — trocar por token |
| `src/layouts/AppBrand/index.tsx` | reescrever (quebrado hoje — ver §3.10) |
| `src/assets/{ASA,ASI,ASC}/**` | usar conforme D5 (logo, imagens, favicon) |

## 11. Critérios de aceitação

| # | Critério | Verificação |
| --- | --- | --- |
| CA1 | `bun run check` + `lint` + `build` + `build:azure` passam | comando |
| CA2 | Sem cookie → `data-brand="asa"`, sem flash (SSR view-source já traz o atributo) | manual |
| CA3 | Trocar brand no switcher recolore toda a UI na hora, sem reload, sem mudar o modo | manual, 3 brands |
| CA4 | Trocar modo (light/dark/system) funciona igual em cada brand | manual, 6 combinações |
| CA5 | `grep -rnE "#[0-9a-fA-F]{3,8}\b|rgb\(" src/components src/layouts src/routes` não acha cor de marca hard-coded (só neutros justificados/comentados) | comando + revisão |
| CA6 | Contraste AA em texto sobre primária e sobre corpo nas 6 combinações | checagem manual/ferramenta |
| CA7 | Recarregar com `asc_brand=asi` + `asc_theme=dark` abre direto em ASI dark | manual |
| CA8 | `AppBrand` compila e renderiza as 3 brands (logo certo por `data-brand`) sem `react-router-dom` nem alias quebrado | `bun run check` + manual |

## 12. Riscos

- **R1** — `tokens.css` inchar / vars divergirem entre blocos. Mitigação:
  mesma lista de nomes, revisão diff bloco a bloco; considerar um comentário
  "checklist de vars" no topo.
- **R2** — Cor hard-coded escondida em CSS Module ou estilo inline de
  componente (ex.: `auth/route.tsx` tem `rgba(15,23,42,.45)` inline).
  Mitigação: CA5 cobre; tratar caso a caso (overlay neutro pode ficar, cor de
  marca não).
- **R3** — Paleta ASI/ASC sem valores definidos → contraste ruim. Mitigação:
  D1 antes de implementar; validar AA.
- **R4** — `build:azure` e o no-flash script: garantir que o `<html>` gerado
  no SSR já carrega os atributos (o preset azure-swa drena a resposta —
  ver `patch-nitro-azure-swa.mjs`).
- **R5** — Divergência com a fonte de brand futura do Core. Mitigação: isolar
  a leitura num único ponto (`readUiPrefs`), fácil de plugar `/profile/me`.

## 13. Decisões pendentes

- **D1** — Valores hex de cada célula da paleta (primária/accent × light/dark)
  para `asi` e `asc`, e o accent (amarelo) de `asa`. Reaproveitar de
  `warren/Portal/src/Assets/css/themes/brands/*.css`?
- **D2** — `brand` mora em `color-modes.ts` (renomear p/ `theme.ts`?) ou em
  `brand.ts` novo ao lado?
- **D3** — Nome do token auxiliar: `--brand-accent` / `--brand-secondary` /
  `--bs-tertiary`?
- **D4** — Onde fica o brand switcher: só no menu de preferências do
  `AppShell`? também na tela de login? escondido (troca só via Core)?
- **D5** — Logo/favicon/imagem de share por brand: trocar em runtime
  (`<link rel="icon">` dinâmico no `head()`), ou fixo e só a paleta muda?
- **D6** — Default de brand: confirmado `asa` **mesmo no portal interno**
  (que é conceitualmente "Core"/azul)? Ou o default do NewPortal é `asc` e
  `asa` é só o default "de marca" global?
- **D7** — `prototipo`/telas já existentes assumem verde ASA em algum lugar
  fora de `tokens.css`?
- **D8** — Onde `AppBrand` é montado depois de reescrito: topo da sidebar do
  `AppShell` (substituindo texto fixo, se houver), header do `_site`,
  `auth/route.tsx` (troca a logo fixa "Alex Stewart / Core" atual)? Hoje o
  componente não é usado em lugar nenhum.

---

**Próximo passo:** usuário decide D1–D7, depois `APROVAR SPEC-01`.
Sugestão de ordem: implementar SPEC-00 (i18n) e SPEC-01 (theming) em PRs
separados — não têm dependência entre si.
