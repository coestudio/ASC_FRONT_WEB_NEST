# SPEC-29 — Sidebar: ajustes visuais (quebra em 2 colunas, brand-switcher, logo)

- **ID:** SPEC-29
- **Nome:** sidebar-visual-fixes
- **Status:** IMPLEMENTED (2026-09-16) — ver §13 (Implementation Notes).
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/layouts/AppShell/index.tsx`, `index.module.css`,
  `src/components/theme/brand-switcher.tsx`, `src/layouts/AppShell/UserMenu.tsx`
- **Contexto do pedido:** três itens do `TODO.md`, todos pequenos e na
  mesma área (sidebar/topbar do `AppShell`), agrupados numa SPEC só.

---

## 1. Objetivo

Corrigir três problemas visuais da sidebar principal (`AppShell`):

1. Em telas menores, com muitos itens de menu expandidos, o menu quebra em
   2 colunas — não pode ocorrer.
2. Esconder completamente o `BrandSwitcher` (troca de marca ASA/ASI/ASC) —
   nem no topbar (Header), nem dentro do submenu "Preferências" do
   `UserMenu`.
3. Trazer de volta a logo do brand no topo da sidebar — reversão de uma
   decisão anterior (a SPEC que escondeu a logo foi implementada e depois
   apagada do `specs/` por já estar `IMPLEMENTED`; o histórico do commit
   ainda existe em `git log`, mas não é necessário recuperá-lo — o estado
   atual do código já documenta a decisão anterior em comentário).

## 2. Contexto

### 2.1 Quebra em 2 colunas

`.sidebarNav` (`index.module.css:49-53`) é `flex: 1; overflow-y: auto`
dentro de `.sidebar` (`display: flex; flex-direction: column`). Cada
`SidebarSection` é um acordeão (`index.tsx:35-118`) que expande via
`max-height` medido por `ResizeObserver`. Não há nenhuma regra
`flex-wrap`/`column-count`/`columns` explícita hoje — a suspeita mais
provável é que, em alturas de viewport pequenas (mobile/notebook com
zoom), `.sidebar` (`height: 100dvh`) fica menor que o conteúdo total das
seções expandidas, e o navegador (ou algum ancestral com
`display: flex`/`grid` implícito) força um reflow em colunas. **Precisa
ser reproduzido visualmente antes de corrigir** — não há certeza da causa
raiz só pela leitura do CSS (ver §9 NEEDS_DECISION menor sobre reprodução).

### 2.2 Esconder `BrandSwitcher`

Hoje `<BrandSwitcher />` aparece em dois lugares:

- Topbar (`AppShell/index.tsx:199`, dentro do header, ao lado de
  `LanguageSwitcher`/`ThemeToggle`).
- `UserMenu` → submenu "Preferências" → seção "Marca" (`UserMenu.tsx`,
  `SECTIONS` inclui `{ key: "brand", ... }`, renderizando os botões de
  `BRANDS` importados de `brand-switcher.tsx`).

O pedido é esconder a troca de marca visualmente nos dois lugares — não é
apagar o mecanismo de brand em si (`useBrand`/`useSetBrand`,
`data-brand` no `<html>`), só a UI que deixa o usuário trocar.

### 2.3 Logo do brand no topo

`.sidebarHeader` (`index.module.css:28-34`, `index.tsx:159-162`) é hoje
uma faixa vazia com `aria-hidden="true"`, comentada como "Brand escondido
da sidebar (SPEC-26)". O usuário quer reverter: a logo volta a aparecer
ali. `AppBrand` (`src/layouts/AppBrand/index.tsx`) já existe como
componente — precisa ser conferido se é reutilizável aqui ou se precisa de
ajuste de tamanho para caber nos 80px de altura da faixa.

## 3. Escopo

1. Investigar e corrigir a quebra em 2 colunas (RF1).
2. Remover a renderização do `BrandSwitcher` do topbar (RF2).
3. Remover a seção "Marca" do submenu "Preferências" do `UserMenu` (RF3).
4. Preencher `.sidebarHeader` com a logo do brand ativo, usando
   `AppBrand` ou equivalente (RF4).

## 4. Fora do escopo

- Remover o mecanismo de brand em si (`useBrand`/`useSetBrand`,
  `data-brand`, tokens de tema por marca) — só a UI de troca fica
  escondida, a lógica continua existindo (o Core pode vir a decidir a
  marca via `/profile/me` no futuro, conforme já previsto no
  `AGENTS.md`).
- Qualquer mudança no conteúdo/estrutura dos itens de navegação
  (`nav/*.ts`).

## 5. Requisitos funcionais

- **RF1** — Em nenhuma largura/altura de viewport suportada (≥320px de
  largura, incluindo viewports baixos tipo notebook com zoom) a sidebar
  quebra os itens de menu em múltiplas colunas. A causa exata só é
  confirmada durante a implementação (reprodução visual); a correção deve
  ser documentada nas "Implementation Notes" com o antes/depois.
- **RF2** — `<BrandSwitcher />` não é mais renderizado em
  `AppShell/index.tsx` (topbar).
- **RF3** — A seção `brand` de `SECTIONS` em `UserMenu.tsx` é removida
  (nem o toggle "Marca" nem o corpo com as opções aparecem no dropdown de
  Preferências).
- **RF4** — `.sidebarHeader` renderiza a logo do brand ativo (via
  `AppBrand` ou um recorte dele dimensionado para a faixa de 80px),
  substituindo o `aria-hidden` vazio atual. A logo deve reagir à troca de
  `data-brand` (ainda que a UI de troca esteja escondida por RF2/RF3, o
  brand pode mudar por cookie/perfil).

## 6. Não funcionais

- Não introduzir nova dependência — reusar componentes já existentes
  (`AppBrand`).

## 7. Camada de dados

Não se aplica — mudança puramente de apresentação, reaproveitando
`useBrand()` (já existente, `src/lib/ui-prefs.tsx`) para resolver qual
logo mostrar.

## 8. i18n

Nenhuma chave nova esperada — remove uso de `shell.brand` (label do
submenu) sem substituir por outra chave. Confirmar durante a
implementação se `shell.brand` fica órfã nos 4 dicionários (se sim,
remover das 4; se outro lugar ainda usa a chave, manter).

## 9. `[NEEDS_DECISION]` (não bloqueante, mas registrado)

- A causa exata da quebra em 2 colunas (RF1) não pôde ser confirmada só
  pela leitura estática do CSS/JSX — precisa ser reproduzida no browser
  (viewport pequeno + várias seções expandidas) antes de aplicar a
  correção. Isso não bloqueia a aprovação da SPEC (é trabalho normal de
  debugging durante a implementação), mas fica registrado que o
  diagnóstico em §2.1 é uma hipótese, não uma causa confirmada.

## 10. Arquivos esperados

- `src/layouts/AppShell/index.tsx`
- `src/layouts/AppShell/index.module.css`
- `src/layouts/AppShell/UserMenu.tsx`
- Possível ajuste em `src/layouts/AppBrand/index.tsx` (se precisar de uma
  variante de tamanho) — só se necessário, avaliar durante a
  implementação.
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/navigation.json` ou onde
  `shell.brand` estiver definido, se a chave ficar órfã.

## 11. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Sidebar não quebra em colunas com todas as seções expandidas simultaneamente, em pelo menos 3 viewports testados manualmente (desktop, tablet, mobile) |
| CA2 | `BrandSwitcher` não aparece no topbar |
| CA3 | Seção "Marca" não aparece no submenu Preferências do `UserMenu` |
| CA4 | Logo do brand aparece no topo da sidebar e muda visualmente se `data-brand` mudar (testável via devtools, já que a UI de troca está escondida) |
| CA5 | `bun run check` + `bun run lint` sem regressão |

## 12. Riscos

- **R1** — Sem reproduzir o bug de colunas antes de implementar, o fix
  pode ser paliativo. Mitigação: descrever exatamente o cenário
  reproduzido nas Implementation Notes.

## 13. Implementation Notes (2026-09-16)

**RF1 — causa raiz confirmada por leitura de código, não só reprodução
visual (mais forte que a hipótese do §2.1):** o `.nav` do Bootstrap
(`node_modules/bootstrap/dist/css/bootstrap.min.css` → `.nav{...
display:flex;flex-wrap:wrap;...}`) aplica `flex-wrap: wrap` por padrão.
`<Nav className={`${styles.sidebarNav} flex-column`}>` (`index.tsx`)
combina esse `flex-wrap: wrap` com `flex-direction: column` (utilitário
`flex-column`) dentro de um container de altura limitada
(`.sidebarNav { flex: 1; overflow-y: auto }` dentro de `.sidebar { height:
100dvh }`). Com eixo principal vertical e `wrap` ligado, o flexbox não
estoura o conteúdo pra baixo com scroll — ele abre uma nova "linha" no
eixo cruzado (horizontal), visualmente uma segunda coluna. Fix: `.sidebarNav
{ flex-wrap: nowrap; }` (`index.module.css`). Mecanismo determinístico,
reproduz sempre que o conteúdo das seções expandidas excede a altura
disponível — não depende de viewport específico.

**RF2/RF3 — `BrandSwitcher` escondido:** removido de
`AppShell/index.tsx` (topbar) e de `UserMenu.tsx` (seção "brand" de
`SECTIONS`, bloco de render do submenu, imports `useBrand`/`useSetBrand`/
`BRANDS` não usados mais nesse arquivo). Isso deixou `src/components/
theme/brand-switcher.tsx` com zero consumidores — a primeira passada
apagou o arquivo por ser dead code, mas o usuário pediu explicitamente
pra **manter o componente/CSS existindo, só sem renderizar em lugar
nenhum** (reativável depois sem recriar do zero) — arquivo restaurado
(`git checkout`) e o CSS que só ele usa (`.swatch`, `.brandSwitcherToggle`,
`:global(.brand-switcher-toggle)`) devolvido a `index.module.css`. O
mecanismo de brand (`useBrand`/`useSetBrand`, `data-brand`, tokens por
marca) segue intacto — usado por `AppBrand` (RF4) e `ui-prefs.tsx`, fora
do escopo desta SPEC (§4).

**RF4 — logo de volta em `.sidebarHeader`:** troca do `<div aria-hidden>`
vazio por `<AppBrand as="link" to="/" size="sm" />` (`index.tsx`), tamanho
`sm` (logo 40px) coube nos 80px de altura da faixa sem ajuste em
`AppBrand`. `.sidebarHeader` ganhou `display: flex; align-items: center;
padding: 0 1.25rem` (`index.module.css`) pra centralizar o componente.
Como `.app-brand__title` usa `var(--bs-body-color)` (não ciente do fundo
da sidebar), adicionada uma regra local forçando `color: var(--sidebar-fg)`
só dentro de `.sidebarHeader` — mesmo padrão já usado em `.userFirstName`/
`.userEmail` no mesmo arquivo. `AppBrand` já reage a `data-brand` via
`useBrand()`, então a logo troca em runtime mesmo com a UI de troca
escondida (RF2/RF3) — testável via devtools (CA4).

**i18n:** `shell.brand` ("Marca"/"Brand"/"Marca"/"品牌") removida dos 4
dicionários (`common.json`) — confirmado órfã (nenhum outro `t("shell.
brand")` no projeto).

**Arquivos alterados:**
- `src/layouts/AppShell/index.tsx`
- `src/layouts/AppShell/index.module.css`
- `src/layouts/AppShell/UserMenu.tsx`
- `src/components/theme/brand-switcher.tsx` — sem mudança de conteúdo
  (restaurado após remoção intermediária; mantido a pedido do usuário,
  só sem consumidor em `AppShell`/`UserMenu`)
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/common.json`

**Validação:** `bun run check` (tsc --noEmit) limpo. `bun run lint` sem
nenhum finding nos arquivos tocados (o comando reporta 3 erros/63
warnings pré-existentes em arquivos não relacionados —
`session.server.ts`, `layouts/Form/Fields/**` — confirmados fora do
escopo desta SPEC). CA1 (reprodução visual em 3 viewports) e CA4 (troca
de brand via devtools) ainda pendentes de verificação manual no browser
pelo usuário — dev server rodando (`bun run dev`, `http://localhost:8080`)
junto com o Core local (`dotnet watch run`, `http://127.0.0.1:5766`) para
esse teste.
