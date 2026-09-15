# SPEC-26 — Esconder o brand (logo Alex Stewart) da sidebar e do header do shell

- **ID:** SPEC-26
- **Nome:** hide-brand-sidebar-header
- **Status:** IMPLEMENTED — decisões do usuário (§5): 5.1 = só o logo da
  sidebar sai, topbar ("Portal interno") fica como está; 5.2 = a critério
  deste agente (faixa vazia, menor risco de layout); 5.3 = login fora do
  escopo, `AppBrand` mantido lá.
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/layouts/AppShell/index.tsx` (sidebar header + topbar),
  `src/layouts/AppBrand/index.tsx` (componente de brand, não editado, só
  deixa de ser consumido no shell)
- **Depende de:** nenhuma
- **Bloqueia:** nada
- **Contexto do pedido:** "Esconder o brand do sidebar e do header".

---

## 1. Objetivo

Remover a exibição do logo/nome da marca (`AppBrand`) da área autenticada
do portal (`AppShell` — sidebar e topbar), sem afetar a tela de login
(`auth/route.tsx`), que também usa `AppBrand` mas não foi citada no pedido.

## 2. Contexto — onde `AppBrand` aparece hoje

`AppBrand` (`src/layouts/AppBrand/index.tsx`) tem exatamente **dois**
consumidores no projeto inteiro:

```
src/routes/auth/route.tsx      → <AppBrand size="sm" variant="badge" className="auth-brand" />
src/layouts/AppShell/index.tsx → <AppBrand as="link" to="/dashboard" size="md" className={styles.sidebarBrand} />
```

- Em `AppShell`, `AppBrand` só aparece **uma vez**, dentro de
  `.sidebarHeader` (topo da sidebar — logo + "Alex Stewart" + subtítulo da
  marca ativa, ex. "Agriculture"). Ver `index.tsx` linha 159-164.
- O **topbar** (`.topbar`, header horizontal ao lado da sidebar, linha
  190-205) **não renderiza `AppBrand`** hoje — só tem o botão de menu
  mobile, o texto fixo `"Portal interno"` (`.topbarTitle`, sem chave de
  i18n, hard-coded em português) e os controles de tema/idioma/brand
  switcher à direita.

Ou seja: existe hoje **um único** ponto de brand visual no shell
autenticado (o cabeçalho da sidebar) — não dois. O pedido do usuário fala
em "sidebar e header" como se fossem dois elementos de brand distintos.

## 3. Interpretação e decisão necessária

Como só existe um `AppBrand` real no shell (no topo da sidebar), há duas
leituras possíveis do pedido:

1. O usuário está chamando de "header" o próprio `.sidebarHeader` (o topo
   da sidebar, que funciona como cabeçalho dela) — nesse caso "sidebar e
   header" é uma coisa só, e a ação é: remover/ocultar esse único
   `AppBrand` de `AppShell`.
2. O usuário quer também remover o texto `"Portal interno"` do `.topbar`
   (a barra horizontal no topo do conteúdo) — tratando esse texto como
   "branding" do header, mesmo não sendo o componente `AppBrand`
   propriamente dito.

Adoto a leitura mais literal e conservadora (opção 1) como padrão proposto
nesta SPEC, mas o `.topbarTitle` também é abordado como item opcional
(RF3), já que é a única outra peça de "identidade"/branding textual visível
no shell — ver `[NEEDS_DECISION]` abaixo.

## 4. Comportamento atual

- Sidebar: `.sidebarHeader` mostra `AppBrand` (logo PNG da marca ativa +
  "Alex Stewart" + subtítulo), como link para `/dashboard`.
- Topbar: mostra o texto fixo `"Portal interno"` à esquerda, sem logo.

## 5. Comportamento esperado (proposto, sujeito à decisão do usuário)

- **RF1** — `AppShell` deixa de renderizar `AppBrand` no `.sidebarHeader`.
- **RF2** — `.sidebarHeader` não fica vazio/quebrado — precisa de uma
  decisão de substituição (ver `[NEEDS_DECISION]`).
- **RF3 (opcional, decisão do usuário)** — `.topbarTitle` ("Portal
  interno") também é removido/ocultado do `.topbar`.

```
[NEEDS_DECISION]

5.1 — Confirmar interpretação do pedido

Como só existe um `AppBrand` (na sidebar), "esconder do sidebar e do
header" pode significar:

1. Só o `AppBrand` da sidebar some (o `.sidebarHeader` continua existindo,
   mas vazio ou substituído por outra coisa) — `.topbar` fica como está
   (com "Portal interno").
2. O `AppBrand` da sidebar some **e** o texto "Portal interno" do
   `.topbar` também some — os dois elementos de "identidade" do shell
   ficam ocultos.

5.2 — O que aparece no lugar do `AppBrand` na sidebar?

Removendo o logo/nome, `.sidebarHeader` (80px de altura, calculado hoje
para caber o brand — ver comentário `index.module.css` linha 28) precisa
de algum conteúdo, ou de ter a altura/posição do menu ajustada:

1. `.sidebarHeader` vira uma faixa vazia (mesma altura, sem nada dentro) —
   mais simples, menos remoção de CSS, mas deixa espaço em branco.
2. `.sidebarHeader` é removido e a `Nav` de itens sobe para o topo da
   sidebar, sem cabeçalho — precisa recalcular a altura de
   `.sidebar`/`.sidebarNav`/comentário do CSS que hoje casa 80px com
   `.topbar`.
3. `.sidebarHeader` continua existindo mas com outro conteúdo no lugar do
   brand (ex.: nada além do botão de colapsar sidebar, se algum dia
   existir; ou só um espaçador) — a decidir o que exatamente.

5.3 — Login (`auth/route.tsx`) também deveria esconder o `AppBrand`?

O pedido não menciona a tela de login, e `AppBrand` ali usa
`variant="badge"` (um selo circular, visualmente diferente do logo da
sidebar) — entendimento (INFERRED) é que login fica **fora** do escopo
deste pedido. Confirmar.

Aguardando as três decisões (5.1/5.2/5.3) do usuário antes de implementar.
```

## 6. Plano de correção (a confirmar após decisões de §5)

Assumindo a leitura mais provável — opção 1 de 5.1 (só sidebar) + opção 1
de 5.2 (faixa vazia, menor esforço/risco) + opção 1 de 5.3 (login intocado)
— o plano seria:

1. `src/layouts/AppShell/index.tsx`: remover a linha
   `<AppBrand as="link" to="/dashboard" size="md" className={styles.sidebarBrand} />`
   de dentro de `.sidebarHeader`. Se a decisão 5.2 escolher a opção 2/3,
   ajustar `.sidebarHeader`/CSS de acordo (ex.: remover o elemento
   inteiro e recalcular a altura referenciada no comentário de
   `index.module.css` linha 28).
2. Se a decisão 5.1 incluir também o `.topbar`: remover
   `<div className={`${styles.topbarTitle} flex-grow-1`}>Portal
interno</div>` (linha 199) ou seu conteúdo, preservando `flex-grow-1` para
   não quebrar o alinhamento dos botões à direita.
3. Nenhuma mudança em `AppBrand/index.tsx` nem em `auth/route.tsx` — o
   componente continua existindo (ainda usado no login).
4. Revisar `styles.sidebarBrand`/`.sidebarBrand :global(.app-brand__title)`
   (CSS hoje só usado por esse consumidor) — vira código morto se o brand
   sai da sidebar; decidir se apaga ou deixa (regra geral do projeto:
   preferir apagar CSS morto quando a mudança já está tocando o arquivo,
   mas isso é uma limpeza extra — confirmar com o usuário se cabe nesta
   mesma SPEC ou fica de fora, já que não foi pedido explicitamente).

## 7. Fora do escopo

- Qualquer mudança na tela de login (`auth/route.tsx`) — a menos que a
  decisão 5.3 diga o contrário.
- `BrandSwitcher` (`src/components/theme/brand-switcher.tsx`) — o seletor
  de marca (ASA/ASI/ASC) no topbar continua funcionando normalmente; o
  pedido é sobre esconder a exibição do brand, não a troca de tema/marca.

## 8. Requisitos não funcionais

- RNF1 — Sem quebra de layout (sidebar/topbar continuam alinhados,
  `.sidebarHeader`/`.topbar` combinados em altura conforme comentário do
  CSS, se a opção escolhida mantiver as duas faixas).
- RNF2 — `bun run check` + `bun run lint` depois da mudança.

## 9. Contrato de rota

Sem mudança.

## 10. Camada de dados

Não aplicável.

## 11. UI

Edição pontual em `AppShell` — sem novo componente.

## 12. i18n

Se `.topbarTitle` for removido (RF3), a chave de i18n que talvez precise
existir hoje não existe (`"Portal interno"` está hard-coded em português,
sem `t()`) — removê-lo não deixa nenhuma chave órfã. Nenhuma chave nova.

## 13. Arquivos esperados

- `src/layouts/AppShell/index.tsx` (editado)
- `src/layouts/AppShell/index.module.css` (editado, se §5.2 exigir ajuste
  de altura/remoção de classes)

## 14. Critérios de aceitação

| # | Critério | Verificação |
| --- | --- | --- |
| CA1 | Sidebar não mostra mais logo/nome "Alex Stewart" | manual, `/dashboard` |
| CA2 | Layout da sidebar não quebra (sem sobreposição/corte) | manual |
| CA3 (se RF3 aprovado) | Topbar não mostra mais "Portal interno" | manual |
| CA4 | Login continua mostrando o brand normalmente (fora do escopo) | manual, `/auth/login` |
| CA5 | `bun run check` e `bun run lint` passam | comando |

## 15. Riscos

- **R1** — Sem decisão de §5, qualquer implementação corre risco de não
  bater com a expectativa do usuário (ex.: implementar só sidebar quando
  ele queria os dois, ou vice-versa) — por isso a SPEC fica
  `WAITING_APPROVAL` com decisão obrigatória antes de codar.

---

## Implementation Notes

`APROVAR SPEC-26` recebido, com as 3 decisões de §5 resolvidas (5.1: só
sidebar; 5.2: a critério deste agente; 5.3: login fora do escopo).
Implementado nesta rodada, seguindo a opção 1 de 5.2 (faixa vazia — menor
risco de quebra de layout, sem recalcular altura de `.sidebar`/`.topbar`).

- **Arquivos alterados:**
  - `src/layouts/AppShell/index.tsx` — removido `import { AppBrand }`;
    `.sidebarHeader` agora renderiza uma `div` vazia (`aria-hidden="true"`)
    no lugar do link com logo/nome.
  - `src/layouts/AppShell/index.module.css` — removidas as classes
    `.sidebarBrand`/`.sidebarBrand :global(.app-brand__title)` (código
    morto após a remoção do consumidor); `.sidebarHeader` simplificado
    (mantém `height: 80px` + `border-bottom`, removido o `padding` que só
    existia para acomodar o conteúdo do brand).
- **Comandos executados:** `bun run check` — VERIFIED, sem erros.
  `bun run lint` — VERIFIED, contagem de problemas idêntica ao baseline (66:
  3 pré-existentes, 63 warnings), nenhum novo.
- **Critérios de aceitação:**

| # | Critério | Status |
| --- | --- | --- |
| CA1 | Sidebar não mostra mais logo/nome "Alex Stewart" | PASS (código) |
| CA2 | Layout da sidebar não quebra (sem sobreposição/corte) | PASS (código — faixa vazia mantém a mesma altura/borda de antes, só sem conteúdo) |
| CA3 | Topbar continua mostrando "Portal interno" (decisão 5.1: fora do escopo remover) | PASS (não alterado) |
| CA4 | Login continua mostrando o brand normalmente | PASS (não alterado, `auth/route.tsx` intocado) |
| CA5 | `bun run check` e `bun run lint` passam | VERIFIED |

- **Decisões tomadas durante a implementação:** 5.2 resolvida como "faixa
  vazia" (opção 1 do plano) — menor mudança de CSS, sem recalcular a altura
  combinada `.sidebarHeader`/`.topbar` (ambas continuam em 80px).
- **Limitações conhecidas:** verificação visual em runtime não foi feita
  por este agente (sem dev server rodando nesta sessão) — recomenda-se
  conferência rápida em `/dashboard` para confirmar que a faixa vazia no
  topo da sidebar não fica visualmente estranha (ex.: se o usuário preferir
  remover a faixa por completo depois de ver o resultado, é um ajuste
  pequeno adicional).
