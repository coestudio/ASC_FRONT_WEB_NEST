---
applyTo: "src/styles/**"
description: "Use ao mexer em tokens de tema, cores e identidade visual. Fixa o modelo brand × modo, o mapeamento nas CSS vars do Bootstrap e a proibição de cor hard-coded."
---

# Theming Instructions

## Modelo: duas dimensões ortogonais no `<html>`

| Atributo        | Valores                 | Origem                                                                                    | O que controla                             |
| --------------- | ----------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------ |
| `data-bs-theme` | `light` \| `dark`       | cookie `asc_theme` (`light`/`dark`/`system`), `system` resolve por `prefers-color-scheme` | claro/escuro (API nativa do Bootstrap 5.3) |
| `data-brand`    | `asa` \| `asi` \| `asc` | cookie `asc_brand`, default `asa`; futuramente `/profile/me`                              | **só a paleta**                            |

As duas são independentes: qualquer brand em qualquer modo = 6 combinações.
Brand nunca altera layout, espaçamento, tipografia estrutural — só cor.

## Brands

| `data-brand` | Nome                                   | Primária | Secundária/auxiliar        |
| ------------ | -------------------------------------- | -------- | -------------------------- |
| `asa`        | Alex Stewart Agriculture (**default**) | verde    | amarelo                    |
| `asi`        | Alex Stewart Internacional             | vermelho | marrom `rgb(188, 144, 90)` |
| `asc`        | Alex Stewart Core                      | azul     | ciano                      |

Os valores hex exatos de cada célula (primária/secundária × light/dark) são
definidos na SPEC-01 — não inventar aqui. Referência de origem: o Portal já
tem paletas de marca em `warren/Portal/src/Assets/css/themes/brands/*.css`
(`--brand-primary` por `[data-brand="…"][data-theme="…"]`).

## Onde os tokens vivem

- `src/styles/globals/tokens.css` — blocos por combinação:

  ```css
  /* fallback = asa light */
  :root,
  [data-brand="asa"][data-bs-theme="light"] { --bs-primary: …; --bs-primary-rgb: …; /* … */ }
  [data-brand="asa"][data-bs-theme="dark"]  { … }
  [data-brand="asi"][data-bs-theme="light"] { … }
  [data-brand="asi"][data-bs-theme="dark"]  { … }
  [data-brand="asc"][data-bs-theme="light"] { … }
  [data-brand="asc"][data-bs-theme="dark"]  { … }
  ```

- Cada bloco redefine **as mesmas CSS vars** (`--bs-primary`,
  `--bs-primary-rgb`, `--bs-success`, `--bs-link-color`, tokens `--sidebar-*`,
  etc.). Nenhuma var pode existir só num bloco — as 6 combinações têm o mesmo
  conjunto de chaves.
- `--bs-secondary` no Bootstrap é cinza neutro de UI; a **cor auxiliar de
  marca** (amarelo/marrom/ciano) é um token próprio (ex.: `--brand-accent` +
  `--brand-accent-rgb`), não sobrescreve `--bs-secondary`.
- `index.css` importa nesta ordem: Bootstrap → `tokens.css` → `base.css` →
  `auth.css`. `tokens.css` sempre depois do Bootstrap.

## Identidade visual: estilo "bento"

- O visual do site segue o estilo **bento**: profundidade construída por
  tonalidade (superfícies levemente contrastadas entre si, `bg-body`,
  `bg-body-tertiary`, tokens de card), não por linhas divisórias soltas.
- **`var(--bs-border-radius-sm)` é o raio padrão** de card, painel, bloco,
  botão, input e badge não-pílula — não usar `--bs-border-radius` (base do
  Bootstrap), `-lg`, `-xl` nem um valor solto em `px`/`rem` fora desse token
  pra esse tipo de elemento. **Exceções documentadas (SPEC-14, §3/§4),
  únicas válidas:**
  - Curva arquitetural do shell — `.sidebar`/`.main` em
    `AppShell/index.module.css`, `1.5rem` (par espelhado, não é elemento de
    superfície isolado, é o contorno do layout).
  - Card de destaque de auth — `.auth-card` em `auth.css`,
    `var(--bs-border-radius-xxl, 2rem)` (já é token, só maior que `-sm`,
    justificado em comentário no próprio arquivo).
  - Pílula/círculo — ver item "Círculo é raro" abaixo.
  - **Todo raio fora de `-sm` que não se encaixa numa exceção acima precisa
    de um comentário no CSS explicando por quê — sem comentário, é bug, não
    exceção** (regra que teria evitado os hardcodes que a SPEC-14 corrigiu).
- **Nunca sem borda.** Todo elemento de superfície leva `border` (token
  semântico, nunca cor hard-coded — ver regra abaixo) pra reforçar a
  separação de profundidade que o bento pede.
- **Sombra é sempre bem-vinda.** Card/painel/modal reforça profundidade com
  `box-shadow: var(--shadow-soft)` (ou `--shadow-elegant` pra destaque maior,
  ex. `auth.css`) — não deixar um elemento de superfície só com `border`
  quando o token de sombra está disponível. **Atenção:** `<Card>` puro do
  react-bootstrap (sem classe) **não** vem com isso — todo consumidor
  precisa aplicar border+radius-sm+shadow-soft explicitamente (ver
  `.tableCard` em `crud-list-page.module.css` e `.card` em
  `access/index.module.css` como referência; este último tinha ficado pra
  trás na importação do Portal, corrigido nesta sessão / SPEC-14).
- **Círculo é raro.** `border-radius: 50%` só em casos pontuais e
  intencionais (ex.: avatar, indicador de status) — nunca como raio padrão
  de card/painel/botão.

## Regras

- **Proibido cor hard-coded em componente.** Sempre token semântico:
  `var(--bs-primary)`, classes `text-bg-primary`, `bg-body`, `text-body`,
  `border`, ou o token de marca. Um `#23ab79` ou `rgb(...)` solto em `.tsx` /
  `.module.css` de componente é bug.
- Novo token de cor entra nas **6 combinações** de `tokens.css` de uma vez.
- `color-modes.ts` é só tipo/constante de **modo**. O estado reativo (modo +
  brand) vive no `UiPrefsProvider` (`src/lib/ui-prefs.tsx`). Não criar um
  segundo provider/contexto para brand.
- Script anti-flash no `<head>` (`theme-store.ts` → `THEME_NO_FLASH_SCRIPT`)
  tem que setar **os dois** atributos (`data-bs-theme` e `data-brand`) a
  partir dos cookies antes do primeiro paint.
- Assets por marca ficam em `src/assets/{ASA,ASI,ASC}/` — logo, favicon e
  imagem de share seguem a brand ativa (mecânica na SPEC-01).
- Comentário em PT-BR; nome de arquivo em inglês.

## Estado atual (pré-SPEC-01)

`tokens.css` tem só `[data-bs-theme="light|dark"]` com a paleta ASA
hard-coded e **não conhece `data-brand`**. `ui-prefs.tsx` / `theme-store.ts`
/ `color-modes.ts` só tratam modo. A migração para brand × modo (novo cookie
`asc_brand`, `data-brand` no `<html>`, blocos de token, switcher de brand,
anti-flash) está especificada em `specs/01-brand-theming/spec.md`.
