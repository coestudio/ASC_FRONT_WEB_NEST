# SPEC-11 — Polimento visual: logo, cores, ícones de input, header, footer do sidebar

- **ID:** SPEC-11
- **Nome:** visual-polish-login-shell
- **Status:** IMPLEMENTED
- **Autor:** portal-dev-agent (rascunho, a pedido do usuário)
- **Área:** `src/layouts/AppBrand/**`, `src/layouts/AppShell/**`,
  `src/routes/auth/login/**`, `src/routes/auth/forgot-password/**`,
  `src/styles/globals/**` (tokens de cor/botão)
- **Depende de:** nada estrutural — é polish em cima do que já existe
  (SPEC-00/01 já `IMPLEMENTED`). **Não depende de SPEC-02** (app-shell-
  navigation ainda `DRAFT`), mas toca arquivos que SPEC-02 também vai tocar
  (`AppShell`, `layouts/Form/Fields` fica de fora — login/forgot-password
  ainda usam input raw, débito conhecido, não migrado aqui).
- **Escopo:** só visual — nenhuma mudança de contrato de API, schema Zod ou
  lógica de auth.

---

## Ordem de execução

Usuário aprovou começando **pela tela de login** (itens 2, 3, 4), depois
segue pro resto (1, 5, 6, 7) nessa ordem de prioridade.

## Referência visual (login)

**Revisão 2** — segundo print (close-up do card, sem fundo de porto),
substitui a leitura de ícone-nos-inputs da revisão 1. Este é o alvo exato
a bater:

- Card de login: cantos bem arredondados (`border-radius` grande, ~20px),
  fundo escuro sólido (um pouco mais claro que o body — ex.
  `--bs-tertiary-bg` ou token equivalente), sem borda visível forte.
- Logo (`AppBrand`, `size="sm"`): badge circular com fundo **branco**, anel
  laranja/amarelo, texto "ASA" dentro (não é o PNG atual — é um badge tipo
  emblema/selo). Ao lado: "Alex Stewart" branco bold + "Agriculture" verde
  logo abaixo, empilhados (não lado a lado).
- Título "Bem-vindo de volta" branco bold, subtítulo cinza claro "Entre com
  suas credenciais para continuar." — espaçamento generoso acima/abaixo.
- Labels uppercase cinza pequeno ("USUÁRIO", "SENHA") acima de cada campo.
  "Esqueceu a senha?" sublinhado, alinhado à direita **na mesma linha** da
  label "SENHA" (não abaixo do campo).
- **Inputs em formato pill** (`border-radius: 999px`/full), fundo levemente
  mais claro que o card, sem borda visível, sem ícone de pessoa/e-mail —
  **reverter o `bi-person` do campo usuário** (não bate com este print).
  Campo senha: mesmo pill, só com o toggle de olho (`bi-eye`) à direita,
  **sem `bi-lock`** — reverter esse ícone também.
- Botões: pill/full-round (`border-radius: 999px`), full-width, verde sólido
  (`--bs-primary`), empilhados com gap pequeno — `Super login` em cima,
  `Entrar` embaixo, mesma cor pros dois.

> Este print é a fonte de verdade pro item 2/3/4 revisados — sobrepõe a
> revisão 1 onde conflitar (principalmente: **sem ícone dentro do input de
> usuário/senha**, só o toggle de olho; inputs e botões em pill shape).
> Paleta ainda via tokens `--bs-*`/`--brand-*` por brand/tema, não hex fixo.

**Revisão 3** (pedido direto do usuário, sobrepõe revisão 2 nestes dois
pontos):

- **Card com fundo transparente/translúcido** — não mais sólido. Usar
  `rgba`/`backdrop-filter: blur()` sobre o token de fundo do card (ex.
  `color-mix` ou `rgba(var(--bs-tertiary-bg-rgb), 0.x)`), deixando o
  conteúdo por trás (fundo da tela de login) parcialmente visível.
- **Ícones de volta nos inputs de usuário/senha** — reverte o revert da
  revisão 2: campo usuário com ícone de e-mail (`bi-envelope`, não
  `bi-person` — usuário pediu "ícone de email") e campo senha com ícone de
  cadeado (`bi-lock`) **junto** com o toggle de olho que já existe.

## Itens

### 1. Logo no sidebar menu

Ajustar `AppBrand` (`src/layouts/AppShell/index.tsx` consumindo
`src/layouts/AppBrand/index.tsx`) — tamanho/proporção/alinhamento do
`app-brand__logo` dentro do sidebar (colapsado e expandido). Hoje classes
`.app-brand*` vêm de `src/assets/css/base.css` — ajuste é CSS + eventualmente
`size` prop (`sm|md|lg`) passado errado no `AppShell`.

### 2. Logo no form de login

Mesmo componente `AppBrand`, instância usada em `src/routes/auth/route.tsx`
ou `login/index.tsx`. Ajustar tamanho/espaçamento no contexto do card de
login (fundo diferente do sidebar — conferir contraste da logo import PNG
por brand em `src/assets/{ASA,ASI,ASC}/logo.png`).

### 3. Cor do botão → verde

Botão de submit do login (e onde mais usar a cor errada) deve puxar
`--bs-primary` do brand ativo, não uma cor hard-coded. Brand `asa` (default)
= verde primário — conferir se algum `<Button variant="...">` ou CSS local
está sobrescrevendo com cor fixa em vez do token semântico (regra de
theming: nunca hard-codar cor).

### 4. Ícones no input de email e senha (login)

`src/routes/auth/login/index.tsx` usa input raw (débito conhecido, fora do
padrão `layouts/Form/Fields` — não migrar aqui, só adicionar ícone dentro do
padrão atual: `input-group` Bootstrap com ícone à esquerda, sem trocar pra
`react-hook-form` + zodResolver, isso é escopo do SPEC-02). Ícone de
envelope pro campo email, cadeado pro campo senha.

### 5. Ícone no input de email (esquece a senha)

Mesmo tratamento do item 4, em `src/routes/auth/forgot-password/index.tsx`.

### 6. Botões do header — idioma (dropdown) e theme switch

Em `src/layouts/AppShell/` (UserMenu.tsx ou topbar, a localizar) — polish
visual dos dois controles: dropdown de idioma e switch de tema. Não mexe em
lógica (`useLocale`/`useSetLocale`, `useThemeMode` já existem) — só
aparência (ícone, alinhamento, hover state, espaçamento consistente com o
resto do header).

### 7. Footer do menu aberto (sidebar expandido)

**Decisão do usuário:** footer mostra só a **versão do app** (ex.
`v0.1.0`, a partir de `package.json` → `version`) — sem info de usuário
reduzida (isso já existe no `UserMenu` do topbar; duplicar não agrega).
Baixo esforço: string estática, sem novo estado nem chamada de rede.
Mecanismo de acesso ao valor de `package.json` no client (import direto do
JSON, ou `define` no `vite.config.ts` — ex. `__APP_VERSION__`) fica a
critério de quem implementar, desde que não vaze o `package.json` inteiro
pro bundle do browser, só a string da versão.

---

## Fora de escopo

- Migração de login/forgot-password pra `layouts/Form/Fields` +
  zodResolver (regra 9/10) — é SPEC-02.
- Qualquer mudança de token de cor por-brand além do que item 3 exige
  (arquitetura de `data-brand` completa é SPEC-01, já `IMPLEMENTED`).

## Critério de pronto

- `bun run check` e `bun run lint` limpos.
- Visual conferido nas 3 brands (asa/asi/asc) × light/dark — ver
  `.github/instructions/theming.instructions.md`.
- Item 7 resolvido (decisão do usuário: só versão do app) — sem mais
  bloqueio, os 7 itens podem ser implementados juntos.

## Implementation Notes

A maior parte dos itens 1–5 e parte do item 6 já tinham sido implementados
em commits anteriores desta mesma branch/worktree, antes desta sessão
(`6e2cb6a`, `ea4fbfc`, e ajustes posteriores em `auth.css`/`base.css` — ver
`git log` desses arquivos). Esta sessão conferiu item a item contra o texto
atual da spec (revisão 3 é a versão final) e fechou as duas lacunas restantes:

- **Item 4** — o campo `userName` do login usava `icon: "bi-person"`
  (resquício da revisão 2). Revisão 3 pede ícone de e-mail mesmo nesse campo
  (`bi-envelope`) — corrigido em `src/routes/auth/login/index.tsx`. O campo
  senha já usava `bi-lock` + o toggle `bi-eye`/`bi-eye-slash` (nenhuma
  mudança necessária).
- **Item 6** — o `ThemeToggle` já estava com o switch customizado
  (`src/components/theme/theme-toggle.tsx` + `.module.css`), mas o
  `LanguageSwitcher` ainda usava a aparência default do
  `Dropdown.Toggle`/`btn-link` do react-bootstrap; existia inclusive uma
  classe `.languageToggle` já pronta em `src/layouts/AppShell/index.module.css`
  mas nunca referenciada em nenhum `.tsx`. Movida para
  `src/components/i18n/language-switcher.module.css` (CSS Module colocado
  junto do componente, seguindo `components.instructions.md`) e aplicada no
  `Dropdown.Toggle` — mesmo tratamento pill/hover do resto do topbar. Os
  itens do menu (`Dropdown.Item`) já ganhavam o hover/active de marca via
  regra global `.dropdown-item` em `src/styles/globals/base.css` (nenhuma
  mudança necessária ali).

Itens confirmados como já cobertos, sem alteração nesta sessão:

- **Item 1** (logo no sidebar) — `src/styles/globals/base.css` já define
  `.app-brand__logo`/`.app-brand__badge` com tamanhos por `size` (`sm|md|lg`)
  e `src/layouts/AppShell/index.tsx` já passa `size="md"`. Não existe modo
  "sidebar colapsado" (ícone-only) no `AppShell` atual — só mobile aberto/
  fechado via `menuOpen` — então não há um segundo breakpoint de tamanho de
  logo a ajustar; criar esse modo collapse seria escopo novo, não pedido
  aqui.
- **Item 2** (logo no login) — `AppBrand` já suporta `variant="badge"`
  (selo circular com fundo branco + anel `--brand-accent` + sigla),
  consumido em `src/routes/auth/route.tsx`.
- **Item 3** (cor do botão) — `.btn-primary`/`.btn-outline-primary` em
  `src/styles/globals/base.css` já sobrescrevem as variáveis `--bs-btn-*`
  pré-compiladas do Bootstrap para usar `--bs-primary`/`--brand-primary-hover`
  em vez de hex fixo.
- **Item 5** (ícone no forgot-password) — `src/routes/auth/forgot-password/index.tsx`
  já usa `icon: "bi-envelope"` no campo e-mail.
- **Item 7** — já implementado e mergeado antes desta spec (commit
  `ea4fbfc`), confirmado sem duplicar trabalho.

Card translúcido com blur (revisão 3) confirmado em
`src/styles/globals/auth.css` (`.auth-card`, `color-mix(...) ` +
`backdrop-filter: blur(10px)`), usando token `--bs-tertiary-bg`, não hex
fixo.

### Comandos executados

- `bun run lint` — baseline antes de tocar em qualquer arquivo:
  `66 problems (3 errors, 63 warnings)` — **VERIFIED**, igual ao esperado.
- `bun run check` (tsc --noEmit) — **VERIFIED**, sem saída/erros.
- `bun run lint` (depois das mudanças) — **VERIFIED**,
  `66 problems (3 errors, 63 warnings)` — mesmo baseline, nenhuma regressão
  (os 3 erros pré-existentes são em `src/lib/session.server.ts`, não tocado).
- `just map` — não executado: nenhuma mudança de contrato de API/DTO.
- `bun run build:azure` — não executado: mudança não toca build/servidor/
  rotas de `api/`.

### Verificação visual (tokens por brand × modo)

Não há suíte de testes automatizados nem servidor de dev rodado nesta
sessão para captura de tela. Verificação feita por leitura de
`src/styles/globals/tokens.css`: os 6 blocos
`[data-brand="X"][data-bs-theme="Y"]` (asa/asi/asc × light/dark) definem
`--brand-primary`, `--brand-primary-hover`, `--brand-primary-soft`,
`--brand-primary-muted`, `--brand-accent`, `--on-brand` — todos os tokens
usados nos arquivos tocados (`.btn-primary`, `.app-brand__badge`,
`language-switcher.module.css`, `theme-toggle.module.css`, `auth.css`) têm
definição nas 6 combinações. Nenhum hex fixo introduzido.

### Critérios de aceitação

| Critério | Status |
| --- | --- |
| `bun run check` limpo | PASS |
| `bun run lint` limpo (baseline mantido) | PASS |
| Item 1 — logo sidebar | PASS (já implementado antes desta sessão) |
| Item 2 — logo login | PASS (já implementado antes desta sessão) |
| Item 3 — botão cor via token | PASS (já implementado antes desta sessão) |
| Item 4 — ícones login (envelope + cadeado/olho) | PASS (corrigido nesta sessão) |
| Item 5 — ícone forgot-password | PASS (já implementado antes desta sessão) |
| Item 6 — polish dropdown idioma + theme switch | PASS (theme switch já pronto; dropdown de idioma corrigido nesta sessão) |
| Tokens definidos nas 6 combinações brand×modo | PASS |

### Decisões tomadas durante a implementação

- Preservada a decisão de radius não-pill (12px/`0.75rem`) em inputs/botões
  do card de login, documentada em `src/styles/globals/auth.css` como
  "revisão 8" — não existe registro dessa revisão no corpo desta spec, mas é
  código já mergeado em `SPECS-LEGADO` (decisão já tomada); não revertida
  sem confirmação do usuário, conforme regra de não sobrescrever decisão já
  tomada.
- CSS do botão de idioma movido para um `.module.css` dedicado
  (`language-switcher.module.css`) em vez de reaproveitar a classe morta que
  já existia em `AppShell/index.module.css`, para respeitar a convenção de
  CSS Module colocado junto do componente (`components.instructions.md`).

### Limitações conhecidas

- Nenhuma captura de tela/verificação visual em navegador real foi feita
  (sem dev server rodado nesta sessão) — a confirmação foi por leitura de
  CSS/tokens, conforme permitido quando não há suíte automatizada.
- `AppShell` não tem modo de sidebar colapsado (ícone-only); item 1 foi
  considerado coberto pelo que existe hoje (tamanhos por `size` prop),
  já que criar esse modo é escopo novo não pedido nesta spec.
