# SPEC-12 — Registro retroativo: UserMenu accordion, dropdown-item pill, tabela/ações da tela Acesso

- **ID:** SPEC-12
- **Nome:** usermenu-accordion-and-access-visual-polish
- **Status:** IMPLEMENTED (itens 1, 2, 3, 5) / item 4 com pendência não
  resolvida (ver §6 e §8)
- **Autor:** portal-dev-agent (spec escrita **depois** da implementação, a
  pedido do usuário — registro de fato consumado, não fluxo normal de
  aprovação prévia)
- **Área:** `src/layouts/AppShell/UserMenu.tsx`, `src/layouts/AppShell/
  index.tsx`, `src/layouts/AppShell/index.module.css`,
  `src/components/theme/brand-switcher.tsx`, `src/styles/globals/base.css`,
  `src/components/crud/crud-list-page.tsx` (+ `crud-list-page.module.css`
  novo), `src/routes/_dashboard/admin/access/index.tsx` (+ `index.module.css`
  novo), `src/i18n/dictionaries/*/access.json`
- **Depende de:** SPEC-02 (`AppShell`, `crud-list-page` — `IMPLEMENTED`),
  SPEC-03 (`admin/access` — `IMPLEMENTED`), SPEC-10 (`crud-list-page`
  busca via `queryOptions`/`useSsrSafeQuery` — `IMPLEMENTED`), SPEC-11
  (polish visual login/shell — `APPROVED`, mas **não cobre** os itens desta
  SPEC, ver §6)
- **Commits:** `6e2cb6a` (login polish, fora do escopo desta SPEC),
  `835be31` (todo o escopo dos itens 1–5 abaixo), mergeados em
  `SPECS-LEGADO` via `ceac76d`, na branch `spec-10-ssr-safe-client-queries`.

---

## 1. Objetivo

Documentar, **depois do fato**, um conjunto de ajustes visuais implementados
numa sessão que não seguiu o fluxo normal de SDD (SPEC aprovada antes do
código) — o usuário pediu implementação direta durante a sessão e só agora
pediu o registro formal. Esta SPEC não autoriza nada novo; ela **relata o
que já está em produção** (mergeado em `SPECS-LEGADO`) e sinaliza
explicitamente a única divergência de contrato não resolvida (item 4, §6).

## 2. Contexto

Durante a sessão que também produziu a SPEC-11 (polish visual de login), o
usuário pediu, em sequência:

1. Que o submenu "Preferências" do `UserMenu` (dropdown do usuário no
   `AppShell`) parasse de usar os componentes soltos (`ThemeToggle`,
   `BrandSwitcher`, `LanguageSwitcher`) lado a lado dentro do dropdown, e
   virasse um accordion aninhado — mesmo padrão visual de
   `warren/Portal/src/Layouts/SideBar/components/UserMenu.tsx`.
2. Que o item ativo dos submenus não ficasse mais azul (cor padrão do
   Bootstrap para `.dropdown-item.active`), já que o resto da UI usa a
   paleta de brand (`--brand-primary`).
3. Que a tabela da lista genérica (`CrudListPage`) trocasse de `<table>` cru
   para o componente `Table` do react-bootstrap, com um visual mais denso e
   "enterprise" (header uppercase cinza espaçado, hairline entre linhas, sem
   grade vertical), inspirado no padrão real do `warren/Portal`.
4. Que a tela `/admin/access` batesse visualmente com um print de referência
   fornecido pelo usuário: colunas nome/usuário/email/telefone/documento/
   status/ações, 5 botões de ação circulares coloridos por linha, badge de
   status em formato pílula.

O agente sinalizou, durante a sessão, que o item 4 conflitava com o
contrato de colunas já `IMPLEMENTED` na SPEC-03 (§3.2: "colunas: nome,
usuário, email, perfil, status, tipo, criado em") — ver `[NEEDS_DECISION]`/
`SCOPE CONFLICT` levantado nesta mesma sessão. O usuário decidiu
explicitamente: **"só ajustar o visual agora, decidir colunas depois"** —
ou seja, autorizou a implementação do item 4 como está, mas **não** como
uma revisão aprovada da SPEC-03. Essa divergência continua em aberto (§6).

## 3. Escopo

Cinco frentes, implementadas todas no commit `835be31` (exceto o polish de
login, que é `6e2cb6a`/SPEC-11, fora desta SPEC):

1. **`UserMenu` — submenu "Preferências" vira accordion aninhado.**
2. **`.dropdown-item` global — pílula + cor de brand em vez de azul.**
3. **`CrudListPage` — tabela `<table>` cru → `<Table>` do react-bootstrap,
   com densidade/hairline calibrados.**
4. **`admin/access` — colunas telefone/documento, `RowActions` com 5 botões
   circulares, badges em pílula.**
5. **i18n — `colPhone`/`colDocument` em `access.json` (4 locales).**

## 4. Fora do escopo

- Qualquer mudança de contrato de API, schema Zod ou lógica de auth.
- Resolver a divergência de colunas do item 4 contra a SPEC-03 (fica
  pendente, §6 e §8).
- Migração de `admin/access`/`crud-list-page` para `layouts/Form/Fields`
  além do que já existia (nenhum input novo foi introduzido nesta rodada).

## 5. Detalhamento por item

### 5.1 — `UserMenu`: accordion de preferências (`src/layouts/AppShell/UserMenu.tsx`)

Antes: o dropdown do usuário tinha 3 `Dropdown.ItemText` lado a lado, cada
um combinando um label (`shell.theme`/`shell.brand`/`shell.language`) com um
componente próprio (`ThemeToggle`, `BrandSwitcher`, `LanguageSwitcher`).

Depois: um único item "Preferências" (`shell.preferences`, chave já
existente em `common.json` desde a SPEC-02 — nenhuma chave nova aqui) que
expande um accordion com 4 seções (Tema/Marca/Idioma/Visualização), cada
uma expandindo por sua vez uma lista de opções clicáveis
(`dropdown-item` com estado `active`). Reimplementado com hooks já
existentes de `@/lib/ui-prefs` (`useThemeMode`/`useSetThemeMode`/
`useBrand`/`useSetBrand`/`useLocale`/`useSetLocale`) e `@/lib/view-mode`
(`useViewMode`) — nenhum hook novo criado, nenhum componente
`ThemeToggle`/`BrandSwitcher`/`LanguageSwitcher` como filho direto do
dropdown (continuam existindo como arquivos, só não são mais usados aqui).

O CSS de suporte (`.submenu`, `.submenuToggle`, `.submenuCaret`,
`.submenuCaretOpen`, `.accordionOuter`, `.accordionOuterOpen`,
`.accordionInner`, `.swatch`) **já existia** em
`src/layouts/AppShell/index.module.css` antes deste commit (portado numa
sessão anterior, sem consumidor até agora) — não foi criada nenhuma classe
nova para isso, só um novo consumidor.

`BRANDS` (array de `{ id, label, swatch }`) passou de constante privada de
`src/components/theme/brand-switcher.tsx` para `export const BRANDS`, para
ser reaproveitado pela seção "Marca" do accordion sem duplicar a lista.

**Efeito colateral corrigido no mesmo commit** (não pedido explicitamente,
mas necessário para o accordion funcionar corretamente e que o usuário
aprovou ao ver o resultado): `src/layouts/AppShell/index.tsx` — o
acordeão de navegação da sidebar (`SidebarSection`) usava
`max-height: <altura medida>` enquanto aberto; para uma seção com conteúdo
que muda de altura depois de aberta (ex.: permissão carregada depois do
primeiro render), o teto de altura antigo cortava o conteúdo novo. Corrigido
com um estado `settled` que solta o teto (`max-height: none`) depois que a
transição de abertura termina, voltando a usar a altura medida só durante a
animação. `src/layouts/AppShell/index.module.css` — `.navLink.active`,
`.navSubLink.active` e `.navItemToggle.active` (nomes aproximados, ver
diff) passaram de `color: var(--brand-primary)` fixo para
`color: var(--sidebar-active-fg, var(--brand-primary))`, corrigindo um bug
onde o texto do item ativo ficava invisível quando `--sidebar-active-bg` é
um verde sólido (brand `asa`) — `--brand-primary` sobre fundo
`--brand-primary` sólido dá texto correto), e adicionado
`display:flex; flex-direction:column; gap:0.2rem` em `.navSub` (espaço
entre itens do submenu, pedido do usuário na mesma sessão).

### 5.2 — `.dropdown-item` global em pílula + cor de brand (`src/styles/globals/base.css`)

```css
.dropdown-item {
  border-radius: 0.7rem;
}
.dropdown-item:hover,
.dropdown-item:focus {
  background-color: var(--brand-primary-soft);
  color: var(--brand-primary);
}
.dropdown-item.active,
.dropdown-item:active {
  background-color: var(--brand-primary);
  color: var(--on-brand, #fff);
}
```

Pedido explícito do usuário: o item ativo do submenu de preferências (ex.:
tema/marca/idioma selecionado) usava o azul padrão de
`--bs-dropdown-link-active-bg` do Bootstrap, destoando da paleta de brand
usada no resto da UI. Como é um seletor global (`.dropdown-item`, não uma
classe de módulo), o efeito vale para **todo** `Dropdown.Item`/`dropdown-item`
do app, não só o `UserMenu` — checado visualmente contra os outros usos
conhecidos de `Dropdown` no shell (nenhuma quebra percebida, mas não houve
varredura exaustiva de todos os dropdowns do app; ver §7 riscos).

### 5.3 — `CrudListPage`: tabela `<table>` cru → `<Table>` do react-bootstrap

`src/components/crud/crud-list-page.tsx`: a tabela de listagem (view
"lista", alternável via `ViewToggle` com a view "cards") trocou de um
`<table>` HTML cru para `<Table responsive borderless
className="align-middle ${styles.crudTable}">` do react-bootstrap.
`src/components/crud/crud-list-page.module.css` (novo arquivo) define a
classe `.crudTable`, calibrada olhando o padrão real de
`warren/Portal/src/Assets/css/base.css` (bloco `.table`, linhas ~387-409)
e adaptada para os tokens que existem no NEST (`--ink-muted`,
`--bs-border-color`, `--brand-primary-soft` — o Portal usa `--ice-2` para o
fundo do cabeçalho, token que **não existe** no NEST; não foi inventado
equivalente, o cabeçalho ficou sem cor de fundo, só uppercase + hairline):

- Header uppercase, `font-size: 0.72rem`, `letter-spacing: 0.07em`,
  `color: var(--ink-muted)`, hairline (`border-bottom: 1px solid
  var(--bs-border-color)`).
- Corpo com hairline entre linhas (`tbody td { border-bottom: ... }`,
  removido na última linha), `vertical-align: middle`, padding lateral de
  `1.25rem` na primeira/última coluna.
- Hover de linha com `--brand-primary-soft`.
- `--bs-table-bg: transparent` para não conflitar com o fundo do card/página
  por trás.

A prop `borderless` do react-bootstrap zera a borda padrão do Bootstrap
(`.table-borderless > :not(caption) > * > * { border-bottom-width: 0; }`,
especificidade CSS ~(0,1,1)); o hairline customizado de `.crudTable
tbody td`/`.crudTable thead th` tem especificidade maior (~(0,1,2), classe +
2 seletores de tag) e sobrepõe corretamente — confirmado por inspeção do
CSS gerado do Bootstrap, não só por leitura visual.

A view "cards" (grid de `Card`) não foi alterada por este item.

### 5.4 — `admin/access`: colunas telefone/documento, `RowActions`, badges pílula

`src/routes/_dashboard/admin/access/index.tsx`:

- **Colunas trocadas** de `nome, usuário, email, perfil, status, tipo,
  criado em` (contrato original da SPEC-03 §3.2) para
  `nome, usuário, email, telefone, documento, status, ações` — perfil
  (roles), tipo (interno/externo) e criado em **saíram** da tabela; telefone
  (`u.profile.phone`) e documento (`u.profile.document`, ambos campos reais
  de `ProfileDTO`, não inventados) **entraram**. **Ver §6 — divergência não
  resolvida com a SPEC-03.**
- **`RowActions`** — componente extraído, compartilhado entre a `<Table>`
  (view lista) e o `<Card>` (view cards), evitando duplicar o markup dos 5
  botões de ação por linha/card: ver (neutro), editar (verde/brand),
  ativar-desativar (neutro, ícone alterna `bi-slash-circle`/
  `bi-check-circle` conforme `u.isActive`), redefinir senha (verde/brand,
  desabilitado + tooltip se o usuário não tem e-mail), excluir (vermelho/
  `--bs-danger`). Cada botão é um `<button>` circular
  (`border-radius: 999px`, `width/height: 2rem`) com fundo "soft" da cor
  correspondente — classes novas em `src/routes/_dashboard/admin/access/
  index.module.css` (`.actionBtn`, `.actionBtnNeutral`, `.actionBtnSuccess`,
  `.actionBtnDanger`), usando `--brand-primary`/`--brand-primary-soft`/
  `--ink-muted`/`--sidebar-hover`/`--bs-danger` — nenhuma cor hex fixa fora
  do fallback `rgba(220, 53, 69, 0.12)` da variante danger (aproximação de
  `--bs-danger` em opacidade baixa, já que não existe um token
  `--bs-danger-soft` pronto no projeto).
- **Badges de status/tipo** (tabela e card) passaram a usar a prop `pill`
  do `Badge` do react-bootstrap (`<Badge pill bg={...}>`) — confirmado que
  `react-bootstrap@2.10.10` aceita `pill?: boolean` nativamente
  (`node_modules/react-bootstrap/cjs/Badge.d.ts`), não precisou de
  `className="rounded-pill"` alternativo.

### 5.5 — i18n: `colPhone`/`colDocument`

`src/i18n/dictionaries/{pt-BR,en,es,zh}/access.json` ganharam as chaves
`colPhone`/`colDocument` (rótulo de coluna), mantendo as chaves antigas
`colProfile`/`colType`/`colCreatedAt` no dicionário mesmo não sendo mais
usadas pela tabela atual (não removidas — ver §6, a reversão da coluna pode
precisar delas de volta).

## 6. Divergência não resolvida com a SPEC-03 — `[NEEDS_DECISION]`

O item 4 (§5.4) **contradiz** o contrato de colunas da SPEC-03
(`IMPLEMENTED`, §3.2): "colunas: nome, usuário, email, perfil, status,
tipo, criado em". A implementação atual tem
`nome, usuário, email, telefone, documento, status, ações`.

Isto **não foi aprovado retroativamente** como revisão da SPEC-03 — o
usuário decidiu explicitamente, durante a sessão de implementação, "só
ajustar o visual agora, decidir colunas depois". Esta SPEC-12 documenta o
fato consumado (o código está assim, em produção, mergeado em
`SPECS-LEGADO`), mas **não resolve** a divergência de contrato. Ficam duas
perguntas em aberto para o usuário decidir, sem prazo definido:

1. A SPEC-03 deve ser **revisada** (nova revisão do `spec.md`, mudando o
   §3.2 para o conjunto de colunas atual — perfil/tipo/criado em saem
   definitivamente da UI, mesmo que o Core continue expondo esses campos)?
2. Ou a implementação deve **voltar** ao contrato original da SPEC-03
   (perfil/tipo/criado em), tratando telefone/documento como colunas
   adicionais (não substitutas) ou como um pedido separado, ainda a
   desenhar?

Enquanto essa decisão não for tomada, `admin/access` roda em produção com
um contrato de coluna que diverge do único documento que deveria ser fonte
de verdade dele. Nenhuma outra SPEC nova deve copiar esse padrão de colunas
sem essa decisão estar resolvida.

## 7. Riscos

- **R1** — `.dropdown-item` global (§5.2) pode afetar outros `Dropdown` do
  app além do `UserMenu` (ex.: dropdowns de filtro, se existirem) — não foi
  feita varredura exaustiva de todo uso de `Dropdown.Item` no código; risco
  aceito, mitigação é revisão visual pontual se algum outro dropdown ficar
  com aparência inesperada.
- **R2** — a divergência do §6 pode se propagar: se uma SPEC futura de área
  (04–09) copiar o padrão "5 botões circulares + colunas ajustadas ao
  print" sem checar que aqui é um caso pendente de decisão, o débito cresce
  sem controle. Mitigação: este documento existe justamente para registrar
  isso antes que aconteça.
- **R3** — chaves i18n órfãs (`colProfile`/`colType`/`colCreatedAt` em
  `access.json`, §5.5) ficam sem uso até a decisão do §6 — aceito como
  reversível, não removido para não perder o texto se a decisão for
  reverter a coluna.

## 8. Decisões pendentes

- **D1 — `[NEEDS_DECISION]`, ver §6.** Revisar SPEC-03 (formalizando as
  colunas telefone/documento) **ou** reverter `admin/access` para o
  contrato original de colunas da SPEC-03. Sem essa decisão, o item 4
  desta SPEC fica com status "implementado, mas não formalmente aprovado
  contra o contrato vigente" — não vira `IMPLEMENTED` limpo enquanto isso
  não for resolvido.

## 9. Comandos executados (verificação desta sessão de registro)

- `bun run check` → **VERIFIED**, `tsc --noEmit` sem erro (rodado depois de
  escrever esta SPEC — nenhum arquivo de código foi tocado nesta sessão,
  só este `spec.md`).

## 10. Critérios de aceitação (desta SPEC de registro)

| # | Critério | Status |
| --- | --- | --- |
| CA1 | SPEC documenta os 5 itens implementados com base no diff real (`git show 835be31`), não só no resumo do usuário | PASS |
| CA2 | Divergência do item 4 contra a SPEC-03 está registrada como pendência explícita, não aprovada retroativamente | PASS |
| CA3 | `bun run check` limpo (nenhuma mudança de código nesta sessão) | PASS |
| CA4 | Numeração sequencial respeitada (`12`, próximo livre depois de `11`) | PASS |

---

**Status: itens 1, 2, 3, 5 — `IMPLEMENTED` (fato consumado, documentado
retroativamente). Item 4 (colunas de `admin/access`) — implementado em
produção, mas com contrato **não aprovado** contra a SPEC-03 (`D1` em
aberto, §6/§8). Esta SPEC não fecha `IMPLEMENTED` de forma limpa enquanto
`D1` não for decidido.**
