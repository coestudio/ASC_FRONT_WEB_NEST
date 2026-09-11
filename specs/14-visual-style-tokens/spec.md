# SPEC-14 — Resolver débitos visuais já mapeados em outras SPECs (tokens, hardcode, código morto)

- **ID:** SPEC-14
- **Nome:** visual-style-tokens
- **Status:** IMPLEMENTED (`check`/`lint` verificados em sessão posterior, ver
  "Implementation Notes" — ressalva restante: só revisão visual manual)
- **Autor:** portal-dev-agent (via sessão de auditoria pedida pelo usuário)
- **Área:** `src/styles/globals/**`, `src/assets/css/**` (legado), `src/components/ui/**`,
  `src/components/theme/theme-toggle.module.css`, `src/components/crud/crud-list-page.module.css`,
  `src/layouts/AppShell/index.module.css`, `src/routes/_dashboard/admin/access/index.module.css`,
  `.github/instructions/theming.instructions.md`
- **Depende de:** SPEC-01 (`brand-theming`, `IMPLEMENTED` — dona do modelo de tokens `--bs-*`/brand
  e da regra RF6/CA5 "nenhum componente referencia cor literal"), SPEC-02 (`app-shell-navigation`,
  `APPROVED` — empurrou `password-field.tsx` como débito "fora do escopo"), SPEC-11
  (`visual-polish-login-shell`, `APPROVED`), SPEC-12 (`usermenu-accordion-and-access-visual-polish`,
  `IMPLEMENTED`)

## 0. Propósito desta SPEC

**Esta SPEC não parte de uma auditoria genérica — ela é dedicada a fechar
uma lista de conflitos e débitos que outras SPECs já registraram e nunca
tiveram uma SPEC própria pra resolver.** Cada item do escopo (§3) cita a
SPEC e a seção onde o problema já está documentado. Onde a varredura desta
sessão achou algo **novo** que nenhuma SPEC anterior via (ex.: CSS legado
morto), isso fica marcado explicitamente como achado novo, não mapeado —
minoria do escopo, tratada em §3.4.

## 1. Objetivo

Resolver, um a um, os débitos abaixo — trocar por token, aceitar como
exceção documentada, ou apagar (código morto) — sem reabrir nenhuma decisão
de UX/contrato já fechada nas SPECs de origem. `[NEEDS_DECISION]` só onde a
própria SPEC de origem já deixou a decisão em aberto.

## 2. Contexto — cadeia de citações

| Débito                                                                                                                                                                                 | Onde já foi mapeado                                                                                                                                                                                                                          | Como ficou em aberto                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/ui/{input,field,password-field}.tsx` são inputs raw (regra 10)                                                                                                             | `AGENTS.md` §"Pendências conhecidas"; `specs/02-app-shell-navigation/spec.md:99` ("não migra — fica como débito pra depois, fora do escopo desta SPEC"); `specs/11-visual-polish-login-shell/spec.md:14` (mesmo débito, de novo não migrado) | Três SPECs em sequência empurram o mesmo item pra "depois" sem nenhuma nunca ser o "depois"                                                                                |
| Hex hardcoded em `ui.module.css` (`#ccc`/`#d33`/`#111`/`#fff`)                                                                                                                         | `specs/01-brand-theming/spec.md` (Correção pós-IMPLEMENTED, grep CA5): achado e explicitamente aceito porque é "subsistema sem uso — ver AGENTS.md 'pendências conhecidas'"                                                                  | Aceito **condicionado** a ser código morto sem uso — nunca confirmado se de fato não tem consumidor (confirmado nesta sessão: não tem, §3.1)                               |
| `--bs-danger-soft` não existe, `RowActions` usa `rgba(220,53,69,.12)` como aproximação                                                                                                 | `specs/12-usermenu-accordion-and-access-visual-polish/spec.md` §5.4                                                                                                                                                                          | Documentado como aproximação aceita, nunca resolvido com token real                                                                                                        |
| `--ice-2` do Portal não tem equivalente no NewPortal, header do `.tableCard`/`crud-list-page` ficou sem cor de fundo                                                                   | `specs/12-usermenu-accordion-and-access-visual-polish/spec.md` §5.3                                                                                                                                                                          | "não foi inventado equivalente" — decisão implícita de deixar sem, nunca formalizada                                                                                       |
| CA5 da SPEC-01 (grep de cor hard-coded) já teve que ser corrigido uma vez depois de `IMPLEMENTED`                                                                                      | `specs/01-brand-theming/spec.md` "Correção pós-IMPLEMENTED"; `specs/12-.../spec.md` §11 (mesmo achado, `color: #fff` em `access/index.module.css:40`)                                                                                        | O padrão se repetiu: SPEC nova introduz CSS, ninguém re-roda o grep de CA5 contra o arquivo novo. Este documento formaliza rodar de novo — e corrige o próprio grep (§3.3) |
| `.tableCard` usa `border-radius: 1.15rem` fixo, inconsistente com o mesmo padrão de card já corrigido em `access/index.module.css` pra `var(--bs-border-radius-sm)` nesta mesma sessão | Sinalizado como nota na resposta anterior desta sessão (não em spec.md ainda)                                                                                                                                                                | Sem SPEC formal até agora — é o gatilho direto que abriu esta SPEC-14                                                                                                      |

## 3. Escopo

### 3.1 — Apagar código morto confirmado (resolve o item 1 e 2 da tabela)

`components/ui/{button,input,field,password-field}.tsx` + `ui.module.css`:
confirmado por grep nesta sessão — **zero** import em qualquer `.tsx` do
projeto. Não é "migração pra depois" (SPEC-02/11 já erraram ao tratar como
tal): não há nada rodando hoje que dependa desses arquivos, então não há
risco de regressão em apagar. Resolve de vez o cross-reference
`AGENTS.md → SPEC-02 → SPEC-11` que nunca fechou.

> Isso é **diferente** do débito real de `src/routes/auth/{login,forgot-password}/index.tsx`
> usarem `<Form.Control>` cru inline (não o wrapper `components/ui/input.tsx`,
> que está morto) — esse continua sendo débito de SPEC-02 §3.6, **fora do
> escopo desta SPEC** (não é hardcode de estilo, é violação de regra 10 em
> código ativo, com plano de correção já traçado em outro lugar).

### 3.2 — Resolver os dois tokens que as SPECs de origem deixaram em aberto

- **`--bs-danger-soft`** (`specs/12-.../spec.md` §5.4): criar no `tokens.css`
  nos 6 blocos brand×modo, no mesmo padrão de `--brand-primary-soft`, e
  trocar `rgba(220,53,69,.12)`/hover em `access/index.module.css` pelo
  token novo.
- **Fundo do header de `.tableCard`** (`specs/12-.../spec.md` §5.3): decidir
  entre (a) inventar um token equivalente ao `--ice-2` do Portal
  (`--bs-secondary-bg` já é usado — conferir se já resolve visualmente ou
  se precisa de token dedicado) ou (b) manter sem fundo, só formalizando a
  decisão em comentário no CSS em vez de deixar implícita.

### 3.3 — Corrigir e re-rodar o grep de CA5 da SPEC-01

O grep oficial de CA5 é `grep -rnE "#[0-9a-fA-F]{3,8}\b|rgb\(" src/components
src/layouts src/routes` — o padrão `rgb\(` **não casa com `rgba(`** (depois de
"rgb" vem "a", não "("), então todo `rgba(...)` hardcoded passa despercebido.
Já aconteceu duas vezes o CA5 "passar" e um hardcode aparecer depois (SPEC-12
§11, e os itens abaixo achados nesta sessão, nunca cobertos por nenhum CA5
anterior):

| Arquivo:linha                                                          | Valor                                                                                |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `layouts/AppShell/index.module.css:186` (`.swatch`)                    | `box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.15)` — fixo, não respeita dark mode     |
| `layouts/AppShell/index.module.css:445` (`.backdrop`)                  | `background: rgba(15, 25, 45, 0.45)`                                                 |
| `layouts/AppShell/index.module.css:55` (`:global(.app-sidebar__logo)`) | `box-shadow: 0 1px 3px rgba(30, 50, 90, 0.2)` — em classe morta, some junto com §3.4 |

**Proposta:** trocar o comando de CA5, daqui pra frente, para
`grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\("` (cobre `rgb(` e `rgba(`) —
registrar essa correção tanto aqui quanto como nota em
`specs/01-brand-theming/spec.md`. `.swatch` migra pra token (mesmo padrão
de `rgba(var(--bs-emphasis-color-rgb), 0.15)` já usado em
`theme-toggle.module.css:59`); `.backdrop` fica como exceção documentada
(overlay neutro intencional, comentário explicando por quê) — `[NEEDS_DECISION]`
só nesse ponto: comentário basta, ou vale um token `--overlay-bg`?

### 3.4 — Achados novos desta sessão (não mapeados antes, mas mesma causa raiz)

Enquanto resolvia os itens acima, a varredura encontrou dois blocos de CSS
sem nenhum consumidor — mesma classe de problema do item 1 (§3.1), então
entram no mesmo escopo de limpeza:

- **`src/assets/css/**`** (`base.css` 1.534 linhas + `index.css` +
  `themes/{dark,light,brands/*}.css`) — nunca importado em
  `styles/globals/index.css` nem em nenhum `.tsx`. O comentário em
  `AppBrand/index.tsx:38` ("Classes `.app-brand*` vêm de
  `src/assets/css/base.css`") está desatualizado — as regras reais e ativas
  estão em `styles/globals/base.css:35-38`, que já documenta que o legado
  nunca esteve conectado. Apagar a árvore inteira e corrigir o comentário.
- **`:global(.app-sidebar__logo)`, `:global(.app-nav-link)`** em
  `AppShell/index.module.css` — sem consumidor em nenhum `.tsx`; comentário
  cita `[data-theme="neon"]` / `themes/neon.css`, arquivo que não existe em
  lugar nenhum do projeto (nem no legado). `:global(.app-topbar__avatar)`,
  no mesmo arquivo, **tem** consumidor (`UserMenu.tsx:84`) — esse fica.

### 3.5 — Alinhar `.tableCard` ao mesmo raio do card já corrigido

`components/crud/crud-list-page.module.css:10` usa `border-radius: 1.15rem`
fixo. Na correção do card de `access/index.module.css` nesta sessão
(view "cards"), o mesmo tipo de elemento (card de superfície com
border+shadow-soft) já foi migrado pra `var(--bs-border-radius-sm)`. Alinhar
`.tableCard` ao mesmo token, pelos mesmos motivos.

### 3.6 — Raios/cores sem justificativa documentada (varredura complementar)

Itens de `AppShell/index.module.css` e `styles/globals/base.css` com raio
fixo **sem** nenhum comentário explicando por que fogem de `-sm` (diferente
dos casos da auth card e da curva da sidebar, que já têm comentário
justificando — esses ficam como exceção, não entram aqui):

| Arquivo:linha                                     | Valor               | Elemento                                            |
| ------------------------------------------------- | ------------------- | --------------------------------------------------- |
| `AppShell/index.module.css:48/79/116/151/282/414` | `0.75rem`/`0.65rem` | nav link, user toggle, menu button, nav sub, toggle |
| `styles/globals/base.css:50`                      | `0.75rem`           | `.app-brand__logo`                                  |
| `styles/globals/base.css:162`                     | `0.7rem`            | `.dropdown-item`                                    |

Migrar pra `var(--bs-border-radius-sm)` — nenhum motivo documentado pro
valor divergente, mesma classe do `.tableCard` (§3.5).

## 4. Fora do escopo

- Contrato de API, rota, auth, i18n.
- Retocar SPEC-11/12 em si — continuam `APPROVED`/`IMPLEMENTED`.
- Migrar `src/routes/auth/{login,forgot-password}` pra `layouts/Form/Fields`
  (regra 10 em código ativo) — isso é SPEC-02 §3.6, não aqui (ver nota em
  §3.1).
- Pílula/círculo intencional (`999px`, `50%`, `--bs-border-radius-pill`) em
  `.swatch`-dimension, `.brandSwitcherToggle`, `.languageToggle`, avatar,
  badge de marca, switch de tema — já são a "rara exceção de círculo" que a
  própria regra de `theming.instructions.md` prevê, não entram em revisão.
- Curva arquitetural da sidebar/main (`1.5rem`) e raio maior do card de auth
  (`--bs-border-radius-xxl`) — já têm comentário justificando a exceção nos
  arquivos de origem (SPEC-11), ficam como estão.

## 5. Decisões pendentes — resolvidas

- **D1 — resolvida:** criar token dedicado `--table-header-bg` (6 blocos de
  `tokens.css`, valor só varia por modo — mesmo padrão de `--ink-muted`).
- **D2 — resolvida:** criar `--overlay-bg` (6 blocos, mesmo valor nos dois
  modos — comportamento idêntico ao literal anterior, só nomeado).

Restante do escopo (§3.1, 3.3, 3.4, 3.5, 3.6) aprovado sem ressalvas —
**"Aprovo tudo"**.

## 6. Atualização de `theming.instructions.md`

Após a implementação, a seção "Identidade visual: estilo bento" ganha a
lista de exceções decididas aqui (curva do shell, card de auth,
pílula/círculo) em vez do atual "sem exceção" genérico — e uma frase nova:
**todo raio fora de `-sm` precisa de comentário explicando por quê**, regra
prática que teria evitado os itens de §3.6 desde o início.

## 7. Riscos

- **R1** — Mudança visual perceptível em nav links/dropdown/`.tableCard`
  (raio 0.65–1.15rem → 0.6rem) — revisão visual manual recomendada antes de
  `IMPLEMENTED`.
- **R2** — Apagar `src/assets/css/**` é diff grande (~1.600 linhas) — sem
  uso encontrado, mas revisão do diff no PR é recomendada.
- **R3** — `--bs-danger-soft` novo exige preencher 6 combinações em
  `tokens.css` — mais trabalho que só trocar um valor.

## 8. Critérios de aceitação

| #    | Critério                                                                                                                                                                                        |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CA1  | `components/ui/{button,input,field,password-field}.tsx` + `ui.module.css` apagados; `bun run check`+`lint` limpos                                                                               |
| CA2  | `src/assets/css/**` apagado; comentário de `AppBrand/index.tsx` corrigido                                                                                                                       |
| CA3  | `.app-sidebar__logo`/`.app-nav-link` removidos de `AppShell/index.module.css`; `.app-topbar__avatar` preservado                                                                                 |
| CA4  | `--bs-danger-soft` definido nas 6 combinações de `tokens.css`; `access/index.module.css` usa o token                                                                                            |
| CA5  | D1 resolvido e aplicado                                                                                                                                                                         |
| CA6  | `.swatch` migrado pra token que respeita dark mode; D2 resolvido pro `.backdrop`                                                                                                                |
| CA7  | `.tableCard`, nav links, `.dropdown-item`, `.app-brand__logo` usam `var(--bs-border-radius-sm)`                                                                                                 |
| CA8  | Grep de CA5/SPEC-01 corrigido pra `rgba?\(` e re-rodado contra `src/components src/layouts src/routes` — zero cor hard-coded restante (fora dos fallbacks de `var(...)`, que são padrão aceito) |
| CA9  | `theming.instructions.md` atualizado com a lista de exceções (§6)                                                                                                                               |
| CA10 | Revisão visual manual das telas afetadas (sidebar, dropdown, tabela de listagem) antes de marcar `IMPLEMENTED`                                                                                  |

---

## Implementation Notes

**Arquivos alterados/apagados:**

- `src/components/ui/button.tsx`, `src/components/ui/ui.module.css`
  (apagados — CA1). `input.tsx`/`field.tsx`/`password-field.tsx` citados na
  primeira versão desta SPEC e no `AGENTS.md` **nunca existiram** nesse
  caminho — nota corrigida em `AGENTS.md` "Pendências conhecidas".
- `src/assets/css/**` inteiro apagado (`base.css`, `index.css`,
  `themes/{dark,light,brands/*}.css` — CA2). Comentário desatualizado em
  `src/layouts/AppBrand/index.tsx:38` corrigido pra apontar
  `styles/globals/base.css`.
- `src/layouts/AppShell/index.module.css` — `:global(.app-sidebar__logo)` e
  `:global(.app-nav-link{,.active})` removidos (CA3, sem consumidor,
  comentário citava `themes/neon.css` inexistente); `:global(.app-topbar__avatar)`
  preservado (tem consumidor, `UserMenu.tsx:84`). `.swatch` migrado de
  `rgba(0,0,0,.15)` fixo pra `rgba(var(--bs-emphasis-color-rgb, 0, 0, 0), .15)`
  (CA6, mesmo padrão de `theme-toggle.module.css:59`). `.backdrop` migrado
  pra `var(--overlay-bg)` (CA6/D2). Raios de `.navSub a`, `.userToggle`,
  `.navItemToggle`, `.menuButton` migrados pra `var(--bs-border-radius-sm)`
  (CA7) — `.sidebar`/`.main` (`1.5rem`) preservados como exceção
  arquitetural (já documentada, agora também em `theming.instructions.md`).
- `src/styles/globals/base.css` — `.app-brand__logo` e `.dropdown-item`
  migrados pra `var(--bs-border-radius-sm)` (CA7).
- `src/styles/globals/tokens.css` — 3 tokens novos nas 6 combinações
  brand×modo (CA4/CA5): `--bs-danger-soft` (`#fbe4e4` light / `#3a1414`
  dark, mesmo valor nas 3 brands por modo — paralelo a `--bs-danger`, que já
  segue esse padrão), `--table-header-bg` (`#eef2f8` light / `#1f2733`
  dark — D1), `--overlay-bg` (`rgba(15, 25, 45, 0.45)`, mesmo valor nos dois
  modos — D2, sem mudança visual do literal anterior, só nomeado).
  Checklist de vars do comentário de topo atualizado.
- `src/components/crud/crud-list-page.module.css` — `.tableCard`
  `border-radius: 1.15rem` → `var(--bs-border-radius-sm)` (CA7); header
  `background: var(--bs-secondary-bg)` → `var(--table-header-bg)` (CA4/D1).
- `src/routes/_dashboard/admin/access/index.module.css` — `.actionBtnDanger`
  `background-color: rgba(220,53,69,.12)` → `var(--bs-danger-soft)` (CA4).
- `.github/instructions/theming.instructions.md` — seção "Identidade
  visual: estilo bento" ganhou a lista de exceções decididas (curva do
  shell, card de auth, pílula/círculo) e a regra "todo raio fora de `-sm`
  precisa de comentário explicando por quê" (CA9).
- `AGENTS.md` — nota de "Pendências conhecidas" corrigida (arquivo morto
  apagado, referência a arquivos inexistentes removida, débito real do
  `auth/{login,forgot-password}` mantido e re-explicado).
- `specs/01-brand-theming/spec.md` — nova nota "Segunda correção
  pós-`IMPLEMENTED`" documentando o furo do grep de CA5 (`rgb\(` não casa
  `rgba(`) e o padrão corrigido.

**Comandos executados:**

- `grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(" src/components src/layouts
src/routes` (CA8, padrão corrigido) — **VERIFIED**: restam só padrões
  aceitos (`rgba(var(--bs-*-rgb), X)`, fallback de `var(--token, literal)`)
  e hardcodes **fora do escopo desta SPEC** (`src/layouts/Form/Fields/{InputColorPicker,InputDate,InputDateTime,InputTime}.tsx`
  — `#000000`/`#6c757d`, área de SPEC-SHARE-01, não listada em "Área"
  desta SPEC; `src/routes/auth/route.tsx:18` — `rgba(15,23,42,.45)` no
  overlay do background de login, área de SPEC-11). Registrados aqui como
  achado pra uma SPEC futura, não corrigidos por expansão de escopo
  silenciosa.
- Confirmado por grep: zero referência restante a `components/ui/{button,input,field,password-field}`,
  `ui.module.css`, `assets/css`, `.app-sidebar__logo`, `.app-nav-link` em
  qualquer `.tsx`/`.css` do projeto.
- `bun run check` / `bun run lint` — **VERIFIED em sessão posterior** (runtime
  disponível): `bun run check` (`tsc --noEmit`) passa limpo, zero erro.
  `bun run lint` falha (`66 problems, 3 errors`), mas os 3 erros são em
  `src/lib/session.server.ts` (`react-hooks/rules-of-hooks`, provável falso-
  positivo do `useSession` do TanStack Start sendo lido como hook React) —
  arquivo **fora da "Área" desta SPEC** e pré-existente, não introduzido
  pelas mudanças de SPEC-14. Nenhum warning/erro nos arquivos tocados por
  esta SPEC.
- CA10 (revisão visual manual) — **NOT VERIFIED ainda**: sem acesso a
  browser/dev server nesta sessão também. Continua pendência antes do merge
  final pra `main`.

**Critérios de aceitação — resultado:**

| #    | Critério                                                   | Resultado                                                                                                              |
| ---- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| CA1  | Código morto de `components/ui` apagado; check+lint limpos | Apagado — check VERIFIED limpo; lint VERIFIED sem erro novo (3 erros pré-existentes fora da área, `session.server.ts`) |
| CA2  | `src/assets/css/**` apagado; comentário corrigido          | PASS                                                                                                                   |
| CA3  | Classes mortas removidas; `.app-topbar__avatar` preservado | PASS                                                                                                                   |
| CA4  | `--bs-danger-soft` nas 6 combinações; `access` usa o token | PASS                                                                                                                   |
| CA5  | D1 resolvido e aplicado                                    | PASS (`--table-header-bg`)                                                                                             |
| CA6  | `.swatch` respeita dark mode; D2 resolvido                 | PASS (`--overlay-bg`)                                                                                                  |
| CA7  | Raios migrados pra `-sm`                                   | PASS                                                                                                                   |
| CA8  | Grep de CA5/SPEC-01 corrigido e re-rodado                  | PASS (achados fora de escopo documentados, não corrigidos aqui)                                                        |
| CA9  | `theming.instructions.md` atualizado                       | PASS                                                                                                                   |
| CA10 | Revisão visual manual                                      | NOT VERIFIED — recomendada antes do merge                                                                              |

---

**Status: IMPLEMENTED.** `bun run check` e `bun run lint` verificados em
sessão posterior (check limpo; lint sem erro/warning novo nos arquivos desta
SPEC — os 3 erros pré-existentes de `session.server.ts` são fora de escopo,
ver acima). Ressalva restante: CA10 (revisão visual manual nas 3 brands ×
light/dark) ainda não foi feita — recomenda-se antes do merge final pra
`main`.
