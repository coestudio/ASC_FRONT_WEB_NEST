# SPEC-29 — Sidebar: ajustes visuais (quebra em 2 colunas, brand-switcher, logo)

- **ID:** SPEC-29
- **Nome:** sidebar-visual-fixes
- **Status:** DRAFT
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
