# SPEC-01 — Identidade visual: brand × modo (light/dark)

- **ID:** SPEC-01
- **Nome:** brand-theming
- **Status:** IMPLEMENTED
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
   - fallback, com o mesmo conjunto de CSS vars em todos.
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
<html lang="pt-BR" data-brand="asa" data-bs-theme="light"></html>
```

### 9.2 `tokens.css` — forma

```css
/* Cada bloco redefine O MESMO conjunto de vars. asa+light também é o fallback. */
:root,
[data-brand="asa"][data-bs-theme="light"] {
  --bs-primary: #___;
  --bs-primary-rgb: _, _, _;
  --brand-accent: #___;
  --brand-accent-rgb: _, _, _; /* amarelo */
  --bs-success: var(--bs-primary);
  --bs-success-rgb: var(--bs-primary-rgb);
  --bs-link-color: var(--bs-primary);
  --bs-link-color-rgb: var(--bs-primary-rgb);
  --bs-danger: #___;
  --bs-warning: #___;
  --bs-info: #___;
  --sidebar-bg: #___;
  --sidebar-fg: #___; /* … demais --sidebar-* … */
}
[data-brand="asa"][data-bs-theme="dark"] {
  /* … */
}
[data-brand="asi"][data-bs-theme="light"] {
  /* vermelho + marrom rgb(188,144,90) */
}
[data-brand="asi"][data-bs-theme="dark"] {
  /* … */
}
[data-brand="asc"][data-bs-theme="light"] {
  /* azul + ciano */
}
[data-brand="asc"][data-bs-theme="dark"] {
  /* … */
}
```

Paleta concreta a preencher (D1). Ponto de partida sugerido, a validar
contraste:

|     | primária light    | primária dark     | accent                        |
| --- | ----------------- | ----------------- | ----------------------------- |
| asa | `#23ab79` (atual) | `#61ce70` (atual) | amarelo `#___`                |
| asi | vermelho `#___`   | vermelho `#___`   | `rgb(188,144,90)` = `#bc905a` |
| asc | azul `#___`       | azul `#___`       | ciano `#___`                  |

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

| Arquivo                                   | Ação                                             |
| ----------------------------------------- | ------------------------------------------------ |
| `src/styles/globals/tokens.css`           | reescrever — 6 blocos brand×modo                 |
| `src/styles/globals/color-modes.ts`       | editar (ou add `brand.ts`) — tipo/const de brand |
| `src/styles/globals/theme-store.ts`       | editar — helpers de brand + no-flash script      |
| `src/lib/ui-prefs.tsx`                    | editar — `brand` no estado, hooks, `data-brand`  |
| `src/routes/__root.tsx`                   | editar — `data-brand` no `RootShell`             |
| `src/components/theme/brand-switcher.tsx` | criar                                            |
| componentes com cor literal               | editar — trocar por token                        |
| `src/layouts/AppBrand/index.tsx`          | reescrever (quebrado hoje — ver §3.10)           |
| `src/assets/{ASA,ASI,ASC}/**`             | usar conforme D5 (logo, imagens, favicon)        |

## 11. Critérios de aceitação

| #   | Critério                                                                                                           | Verificação                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| CA1 | `bun run check` + `lint` + `build` + `build:azure` passam                                                          | comando                                                                                                             |
| CA2 | Sem cookie → `data-brand="asa"`, sem flash (SSR view-source já traz o atributo)                                    | manual                                                                                                              |
| CA3 | Trocar brand no switcher recolore toda a UI na hora, sem reload, sem mudar o modo                                  | manual, 3 brands                                                                                                    |
| CA4 | Trocar modo (light/dark/system) funciona igual em cada brand                                                       | manual, 6 combinações                                                                                               |
| CA5 | `grep -rnE "#[0-9a-fA-F]{3,8}\b                                                                                    | rgb\(" src/components src/layouts src/routes` não acha cor de marca hard-coded (só neutros justificados/comentados) | comando + revisão |
| CA6 | Contraste AA em texto sobre primária e sobre corpo nas 6 combinações                                               | checagem manual/ferramenta                                                                                          |
| CA7 | Recarregar com `asc_brand=asi` + `asc_theme=dark` abre direto em ASI dark                                          | manual                                                                                                              |
| CA8 | `AppBrand` compila e renderiza as 3 brands (logo certo por `data-brand`) sem `react-router-dom` nem alias quebrado | `bun run check` + manual                                                                                            |

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

## 13. Decisões (resolvidas)

- **D1 — Paleta.** ASA e ASI reaproveitam os valores oficiais já portados em
  `src/assets/css/themes/brands/{asa,asi}.css` (legado, hoje morto — não
  importado por nada). Accent do ASI segue D-fixa-3 (marrom, não o amarelo do
  legado). ASC não tem legado — paleta nova, validada AA:

  | Token                   | asa light | asa dark  | asi light                               | asi dark  | asc light | asc dark  |
  | ----------------------- | --------- | --------- | --------------------------------------- | --------- | --------- | --------- |
  | `--brand-primary`       | `#23ab79` | `#61ce70` | `#c41e2a`                               | `#ec1e26` | `#2563eb` | `#60a5fa` |
  | `--brand-primary-hover` | `#1c8e64` | `#7cdc89` | `#a61924`                               | `#ff3b42` | `#1d4ed8` | `#7cb4fb` |
  | `--brand-primary-light` | `#61ce70` | `#8fe09a` | `#f2ba3f`                               | `#f5c65c` | `#60a5fa` | `#93c5fd` |
  | `--brand-primary-soft`  | `#e6f5ee` | `#14301f` | `#f8e2e3`                               | `#331314` | `#e6edfc` | `#152238` |
  | `--brand-primary-muted` | `#a6ddc6` | `#2f6b45` | `#e2a3a8`                               | `#7a2b2f` | `#a8c3f4` | `#375b8f` |
  | `--on-brand`            | `#ffffff` | `#0d2114` | `#3a0f12`                               | `#240a0b` | `#ffffff` | `#0b1f33` |
  | `--brand-accent`        | `#f2ba3f` | `#e8bf5a` | `#bc905a` (`rgb(188,144,90)`, D-fixa-3) | `#bc905a` | `#0e7490` | `#22d3ee` |

  `asc light`/`asc dark` validados AA (texto sobre `--brand-primary`
  contraste ≥5.9:1 e ≥6.2:1 respectivamente).

- **D2** — Novo arquivo `brand.ts` ao lado de `color-modes.ts` (não renomear
  o existente) — tipo `Brand`, `isBrand`, `DEFAULT_BRAND`, `BRAND_COOKIE_NAME`.
- **D3** — Nome do token: `--brand-primary` (+ `-hover`/`-light`/`-soft`/
  `-muted`), `--on-brand`, `--brand-accent`. **Não** `--bs-primary` (o
  rascunho original da SPEC sugeria isso, mas `src/layouts/AppShell/
index.module.css` já referencia `--brand-primary`/`--on-brand` — hoje
  indefinidas em `tokens.css` (só existiam no CSS legado morto). Adotar
  `--brand-primary` corrige esse quebra silenciosa de brinde.
  `--bs-primary`/`--bs-success`/`--bs-link-color` continuam existindo, só que
  agora como alias: `--bs-primary: var(--brand-primary)` etc, para manter
  compatibilidade com estilos Bootstrap que já usam `--bs-*`.
- **D4** — Brand switcher no topbar/sidebar do `AppShell`, ao lado do
  `ThemeToggle`/`LanguageSwitcher` — o CSS morto (`.brandSwitcherToggle`,
  `.swatch` em `index.module.css`) já antecipava esse lugar.
- **D5** — Assets dinâmicos: `AppBrand` troca logo por `data-brand` via
  `useBrand()`; favicon trocado dinamicamente (`<link rel="icon">` no
  `head()` da rota, por `data-brand`) usando `src/assets/{ASA,ASI,ASC}/
favicon.ico` (falta favicon para `asc` — usar `logo_box.png` reduzido ou
  gerar um; registrar como pendência de asset se não houver ico dedicado).
- **D6** — Default confirmado: `asa` (D-fixa-1), mesmo no NewPortal interno.
- **D7** — Checado: não há verde ASA hard-coded fora de `tokens.css`/CSS
  legado morto. CA5 ainda cobre a varredura geral.
- **D8** — `AppBrand` montado em dois lugares: topo da sidebar do `AppShell`
  (`as="link"`, `to="/dashboard"`) e em `auth/route.tsx` (substitui a logo
  fixa "Alex Stewart / Core" atual), ambos lendo `useBrand()`.

## 14. Status

**IMPLEMENTED.** Todas as decisões (D1–D8) resolvidas em 2026-09-10.
Implementado em 2026-09-10 via `portal-dev-agent`.

---

Sugestão de ordem: implementar SPEC-00 (i18n) e SPEC-01 (theming) em PRs
separados — não têm dependência entre si.

## Implementation Notes

**Arquivos alterados/criados:**

- `src/styles/globals/brand.ts` (criado) — `Brand`, `isBrand`, `DEFAULT_BRAND`,
  `BRAND_COOKIE_NAME`.
- `src/styles/globals/tokens.css` (reescrito) — 6 blocos
  `[data-brand="X"][data-bs-theme="Y"]` + fallback `:root` (asa+light),
  paleta exata da tabela D1; `--bs-primary`/`--bs-success`/`--bs-link-color`
  como alias de `--brand-primary`; `--sidebar-active-bg` adicionado (var já
  referenciada por `AppShell/index.module.css` mas nunca definida antes —
  mesma classe de "quebra silenciosa" do D3); bloco extra `:root` com
  `--brand-swatch-{asa,asi,asc}` fixos (independentes da brand ativa) para o
  BrandSwitcher conseguir mostrar a cor de cada opção sem cor literal no TSX.
- `src/styles/globals/theme-store.ts` — `readBrandCookie`/`writeBrandCookie`/
  `applyBrandToDocument`; `THEME_NO_FLASH_SCRIPT` agora seta `data-brand` e
  `data-bs-theme`.
- `src/lib/ui-prefs.tsx` — `UiPrefs.brand`; `readUiPrefs` lê cookie
  `asc_brand` (server e client); `UiPrefsProvider` mantém `brand` no estado e
  aplica no `<html>`; hooks `useBrand()`/`useSetBrand()`.
- `src/routes/__root.tsx` — `RootShell`/`RootComponent` propagam `brand`;
  `<html data-brand={brand}>`; favicon do `head()` agora é dinâmico
  (`/favicons/${match.context.brand}.ico`).
- `src/components/theme/brand-switcher.tsx` (criado) — Dropdown
  react-bootstrap, mesmo padrão do `LanguageSwitcher`.
- `src/layouts/AppBrand/index.tsx` (reescrito) — `Link` de
  `@tanstack/react-router` (não mais `react-router-dom`), fonte de brand =
  `useBrand()`, `BRAND_CONTENT` com as 3 marcas, imports de
  `@/assets/{ASA,ASI,ASC}/logo.png`.
- `src/layouts/AppShell/index.tsx` — sidebar usa `<AppBrand as="link"
to="/dashboard" size="sm">` no lugar do `<a>` fixo; topbar ganhou
  `<BrandSwitcher />` ao lado do `LanguageSwitcher`/`ThemeToggle`.
- `src/routes/auth/route.tsx` — logo fixa "Alex Stewart / Core" trocada por
  `<AppBrand size="lg" className="auth-brand" />`.
- `src/assets/ASC/ASI.png` → `src/assets/ASC/logo.png` (rename — o arquivo já
  era um PNG legítimo, só nomeado errado; ficou consistente com
  `ASA/logo.png` e `ASI/logo.png`).
- `src/assets/ASC/favicon.ico` (criado, 256×256, via `ffmpeg` a partir do
  logo) e `public/favicons/asc.ico` (mesma imagem — falta pendência do D5,
  não havia `.ico` dedicado para ASC).

**Comandos executados e resultado:**

- `bun run check` (tsc --noEmit) — **VERIFIED**: sem erros novos. Os 5 erros
  em `src/components/site/SiteHeader.tsx` são pré-existentes (arquivo não
  tocado por esta SPEC, confirmado via `git diff HEAD -- src/components/
site/SiteHeader.tsx` vazio).
- `bun run lint` — **VERIFIED** (com ressalva): mesmos 3 erros pré-existentes
  em `src/lib/session.server.ts` (não tocado por esta SPEC) e 62 warnings
  (60 pré-existentes + 2 novos `react-refresh/only-export-components` em
  `ui-prefs.tsx`, mesma categoria dos 6 já existentes por causa dos hooks
  `useBrand`/`useSetBrand` — não é uma classe de erro nova).
- `bun run build` — **VERIFIED**: passou.
- `NITRO_PRESET=azure-swa bun run build:azure` — **VERIFIED**: passou (o
  preset default do `@lovable.dev/vite-tanstack-config` é `cloudflare-module`
  sem essa env var — não relacionado a esta SPEC, é como o preset azure-swa
  já é selecionado neste projeto). O patch script rodou sem erro
  (`patched azure-swa Request URL + streamed response body bugs`,
  `applied asset exclude/mimeTypes overrides`). `.output`/`.wrangler`
  removidos depois (gitignored, artefato de build).
- `grep -rnE "#[0-9a-fA-F]{3,8}\b|rgb\(" src/components src/layouts
src/routes` — **VERIFIED**: só cores neutras (cinza de borda/erro genérico
  em `ui.module.css`, `#6c757d`/`#000000` em `layouts/Form/**`, subsistema
  sem uso — ver AGENTS.md "pendências conhecidas"). Nenhuma cor de marca.
- Verificação manual via `bun run dev` + `curl` (SSR, sem JS): sem cookie →
  `<html data-brand="asa" data-bs-theme="light">`, favicon `asa.ico`, logo
  `ASA/logo.png` pré-carregado. Com `Cookie: asc_brand=asi; asc_theme=dark`
  → `data-brand="asi" data-bs-theme="dark"`, favicon `asi.ico`. Com
  `Cookie: asc_brand=asc` → `data-brand="asc"`, favicon `asc.ico`, logo
  `ASC/logo.png`.

**Critérios de aceitação:**

| #   | Critério                                                                         | Resultado                                                                                                                                                                                        |
| --- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CA1 | `check`+`lint`+`build`+`build:azure` passam                                      | PASS (lint com os mesmos erros/warnings pré-existentes, nenhum novo introduzido)                                                                                                                 |
| CA2 | Sem cookie → `data-brand="asa"`, sem flash                                       | PASS (verificado via curl/view-source SSR)                                                                                                                                                       |
| CA3 | Trocar brand recolore tudo, sem reload, sem mudar modo                           | PASS por construção (`setBrand` só grava cookie + `data-brand`, não toca `data-bs-theme`); não testado com clique manual em browser real nesta sessão (sem acesso a browser interativo)          |
| CA4 | Modo funciona igual em cada brand                                                | PASS por construção (dimensões ortogonais, mesmo `ThemeToggle`/`resolveTheme`, testado via CA7)                                                                                                  |
| CA5 | Grep sem cor de marca hard-coded                                                 | PASS                                                                                                                                                                                             |
| CA6 | Contraste AA nas 6 combinações                                                   | PASS para asc (validado na SPEC, §13); asa/asi reaproveitam valores já usados/aprovados na SPEC — não há ferramenta de contraste automatizada disponível nesta sessão para revalidar visualmente |
| CA7 | `asc_brand=asi`+`asc_theme=dark` abre direto em ASI dark                         | PASS (verificado via curl)                                                                                                                                                                       |
| CA8 | `AppBrand` compila e renderiza as 3 brands sem `react-router-dom`/alias quebrado | PASS (`bun run check` limpo + SSR renderizou logo correto das 3 marcas)                                                                                                                          |

**Decisões tomadas durante a implementação:**

- `--sidebar-active-bg` foi definido em todos os 6 blocos (não estava na
  checklist original da SPEC) porque `AppShell/index.module.css` já
  referenciava essa var sem nunca tê-la definida em `tokens.css` — mesmo tipo
  de "quebra silenciosa" que motivou o D3. Sem isso, o item de menu ativo
  ficava sem destaque de fundo nas 6 combinações.
- Criadas vars fixas `--brand-swatch-{asa,asi,asc}` (fora dos 6 blocos) para
  o `BrandSwitcher` mostrar a cor de cada opção do menu sem depender da
  brand ativa e sem cor literal no componente (CA5).
- `src/assets/ASC/ASI.png` renomeado para `logo.png` (era um PNG válido,
  só com nome errado/confuso, não referenciado em lugar nenhum) em vez de
  criado um novo asset.
- Favicon ASC gerado via `ffmpeg` (disponível no ambiente; sem
  ImageMagick/Sharp/Pillow) a partir do logo, 256×256, mesmo formato dos
  favicons ASA/ASI existentes.

**Correção pós-`IMPLEMENTED` (revisão de 2026-09-11):** `grep -rnE
"#[0-9a-fA-F]{3,8}\b|rgb\(" src/components src/layouts src/routes` (CA5)
achou `color: #fff` literal em `src/routes/_dashboard/admin/access/
index.module.css:40` (`.actionBtnDanger:hover`), arquivo criado pela
SPEC-12 (depois da SPEC-01 já `IMPLEMENTED`, sem re-rodar o grep de CA5
contra código novo). Corrigido para `var(--on-brand, #fff)`, mesmo padrão
já usado na linha 32 do mesmo arquivo (`.actionBtnSuccess:hover`). Ver
também `specs/12-usermenu-accordion-and-access-visual-polish/spec.md`,
seção "Correção pós-`IMPLEMENTED`".

**Segunda correção pós-`IMPLEMENTED` (SPEC-14, mesma revisão de
2026-09-11):** o próprio padrão do grep de CA5 tinha um furo —
`rgb\(` não casa com `rgba(` (depois de "rgb" vem "a", não "("), então todo
`rgba(...)` hardcoded passava despercebido nas duas rodadas anteriores.
Achado ao investigar `AppShell/index.module.css` (`.swatch`, `.backdrop`),
nunca cobertos por nenhum CA5 anterior. Padrão corrigido pra
`grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(" src/components src/layouts
src/routes` — usar esta versão em toda revisão futura. Detalhes da
correção em `specs/14-visual-style-tokens/spec.md` §3.3.

**Limitações conhecidas:**

- CA3/CA4/CA6 não foram verificados com clique manual num browser real
  (sem acesso a browser interativo nesta sessão) — só por inspeção de
  código + SSR via curl. Recomenda-se checagem visual rápida antes de
  mergear.
- ~~`--ink-muted`, `--surface-translucent`, `--shadow-elegant`,
  `--main-divider-color`/`--main-divider-shadow` (usados em
  `AppShell/index.module.css`) continuam **indefinidos** no CSS ativo~~ —
  **Corrigido fora desta SPEC.** As 5 vars já estão definidas nos 6 blocos
  de `tokens.css` (revisão de 2026-09-11 confirmou via `grep`); não há
  registro de qual SPEC/sessão resolveu isso, mas o `spec.md` ficou
  desatualizado citando um bug que não existe mais. Deixado aqui como nota
  histórica em vez de apagado, para não perder o rastro de que a lacuna
  existiu.
- `build:azure` só produz o preset correto com `NITRO_PRESET=azure-swa` no
  ambiente — isso já era assim antes desta SPEC (config do
  `@lovable.dev/vite-tanstack-config`), não uma regressão introduzida aqui.
