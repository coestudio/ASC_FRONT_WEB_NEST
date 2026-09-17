# SPEC-82 — Breadcrumb dinâmico no topbar (substitui "Portal interno")

- **ID:** SPEC-82
- **Nome:** topbar-dynamic-breadcrumb
- **Status:** IMPLEMENTED — sem `[NEEDS_DECISION]` pendente (usuário
  escolheu via pergunta de escopo, 2026-09-17: "Trocar por breadcrumb
  dinâmico"; R2 resolvido na implementação, ver §8).
- **Autor:** claude (pedido do usuário, 2026-09-17 — screenshot de
  `admin/access` apontando redundância entre o rótulo fixo do topbar e o
  título/descrição da página logo abaixo)
- **Área:** `src/layouts/AppShell/index.tsx`,
  `src/layouts/AppShell/index.module.css`.

---

## 1. Objetivo

Usuário observou (via captura de tela de `admin/access`): o topbar sempre
mostra o texto fixo `"Portal interno"`, e logo abaixo — dentro da área de
conteúdo — cada página já tem seu próprio título grande (`"Acesso"`) e
descrição (`"Usuários com acesso ao sistema e seus perfis."`, via
`PageLayout`/`CrudListPage`). As duas coisas empilhadas parecem redundantes:
ambas "dizem onde o usuário está". Decisão escolhida: trocar o texto fixo
por um **breadcrumb dinâmico** (ex.: `"Administrativo / Acesso"`), que muda
por rota — mantém contexto útil no topbar sem repetir o título da página.

## 2. Contexto — estado atual

- `src/layouts/AppShell/index.tsx:224` — `<div className={\`${styles.topbarTitle} flex-grow-1\`}>Portal interno</div>`,
  texto literal em português, **não vem de i18n** (não existe em nenhum
  `dictionaries/*/*.json`), dentro do `<header className={styles.topbar}>`
  aplicado a toda a área autenticada (`_dashboard`).
- Não existe hoje nenhuma fonte de "trilha" de navegação (breadcrumb) no
  projeto — precisa ser derivada da árvore de rotas ativa no momento do
  render.
- O sidebar já tem uma estrutura de navegação com grupos/itens (`Sidebar`,
  mesmo arquivo) que nomeia cada seção/rota (ex. "Administrativo" → "Acesso")
  — essa é a fonte mais confiável do rótulo de cada nível, em vez de tentar
  derivar do `pathname` cru ou de `PageLayout.title` (que só existe depois
  do conteúdo montar, tarde demais pro topbar).

## 3. Escopo

1. Novo componente (ou lógica inline em `AppShell`) que resolve, a partir da
   rota atual (`useRouterState`/`useMatches` do TanStack Router) e da
   estrutura de navegação já usada pelo sidebar, uma lista de 1 a 3
   segmentos de trilha (ex.: `["Administrativo", "Acesso"]`), usando as
   mesmas chaves i18n que o sidebar já usa pros nomes de seção/rota (não
   duplicar string).
2. `topbarTitle` deixa de ser o texto fixo `"Portal interno"` e passa a
   renderizar os segmentos separados por um divisor visual (ex. `/` ou
   `bi-chevron-right`), com o último segmento em destaque (peso de fonte
   maior) e os anteriores em `text-body-secondary`/opacidade reduzida —
   mesma área/CSS (`.topbarTitle`), sem novo espaço reservado.
3. Rotas sem navegação de sidebar mapeável (ex. tela raiz do dashboard,
   página 404 dentro da área logada) caem num fallback — `[NEEDS_DECISION]`
   na implementação: manter só o nome da própria rota, sem quebrar em
   branco.
4. Truncamento em telas estreitas: mobile já colapsa `.topbarTitle` com
   `text-overflow: ellipsis` (`index.module.css:458-461`) — breadcrumb longo
   deve caber na mesma regra (sem novo CSS de overflow).

## 4. Fora do escopo

- Tornar o breadcrumb clicável/navegável (cada segmento levar a uma rota) —
  fica só como indicador visual nesta leva, a menos que o usuário peça depois.
- Mudar `PageLayout`/`CrudListPage` (título/descrição da página continuam
  como estão — só o topbar muda).
- Adicionar breadcrumb a `_site`/`auth` (fora da área autenticada).

## 5. Requisitos funcionais

- **RF1** — Em qualquer rota dentro de `_dashboard`, o topbar mostra a
  trilha de navegação (grupo → item, conforme estrutura do sidebar) em vez
  do texto fixo `"Portal interno"`.
- **RF2** — Trocar de rota atualiza o breadcrumb imediatamente (reativo à
  navegação do router, sem exigir reload).
- **RF3** — Rota sem mapeamento de sidebar mostra um fallback razoável (não
  string vazia, não `"undefined"`).

## 6. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | `admin/access` mostra algo como "Administrativo / Acesso" no lugar de "Portal interno". |
| CA2 | Navegar entre duas rotas de grupos diferentes atualiza o breadcrumb sem reload. |
| CA3 | Mobile: breadcrumb longo trunca com ellipsis, sem quebrar layout do topbar. |
| CA4 | `bun run check` + `bun run lint` sem regressão. |

## 7. Riscos

- **R1** — Duplicar a estrutura de nomes do sidebar numa segunda lista
  separada seria débito (duas fontes de verdade); mitigação: reusar a
  mesma estrutura/dados do sidebar, não recriar.
- **R2** — Rotas de detalhe com parâmetro dinâmico (ex. `operations/$id`)
  podem não ter um "nome" natural pro segmento final — `[NEEDS_DECISION]`
  na implementação (usar label genérico da rota pai, ou omitir o último
  segmento). **Resolvido:** usar o label do item de nav pai (ver §8) — não
  exige código novo, `getActiveItemTo` já resolve por prefixo mais longo.

## 8. Notas de implementação

- Duas funções novas em `AppShell/index.tsx`, ao lado de `isChildActive`/
  `getActiveItemTo` já existentes: `getBreadcrumb(sections, pathname)`
  devolve `{ section, item }` (ou `null`) reusando exatamente essas duas
  funções — nenhuma lista de rótulos nova, só leitura da mesma `NavSection[]`
  que a sidebar já usa (evita R1).
- R2 resolvido de graça pela reutilização: `operations/$id` não tem item
  próprio no menu, mas `getActiveItemTo` já escolhe o item da seção com o
  `to` mais longo que ainda é prefixo do pathname (ex. "Operações",
  `to: "/administrative/operations"`) — o breadcrumb mostra "Administrativo
  / Operações" na tela de detalhe, sem código extra pro caso dinâmico.
- `topbarTitle` (`<div>` no JSX de `AppShell`) passou a renderizar
  `<span className="text-body-secondary">{seção}</span>` +
  `<i className="bi bi-chevron-right ...">` + `<span
  className="fw-semibold">{item}</span>` quando `breadcrumb` resolve, ou
  `t("shell.topbarFallback")` (nova chave, mesmo texto antigo "Portal
  interno", traduzido nos outros 3 idiomas) quando `getBreadcrumb` retorna
  `null` — RF3. Nenhuma classe CSS nova: reusa `.topbarTitle` (ellipsis já
  existente) + utilitários Bootstrap (`text-body-secondary`, `fw-semibold`),
  conforme sugerido no escopo.
- Chave `shell.topbarFallback` adicionada aos 4 dicionários (`common.json`
  de `pt-BR`/`en`/`es`/`zh`).
- `bun run check`: 0 erros. `bun run lint`: 0 erros, 63 warnings (baseline
  pré-existente, sem regressão). `bun run build` (produção) concluído sem
  erro.
- CA1-CA3 (conteúdo visual exato, atualização reativa ao navegar,
  truncamento mobile) não foram confirmados por screenshot — sem
  ferramenta de captura visual disponível no ambiente desta implementação.
  RF2 (reatividade) é garantida estruturalmente: `breadcrumb` é
  recalculado a cada render a partir de `pathname` (`useLocation()`), a
  mesma fonte reativa que já comanda o estado ativo da sidebar.
