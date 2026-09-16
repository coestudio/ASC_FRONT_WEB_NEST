# SPEC-56 — Tokens de borda para `.soft-card` e `.btn-soft`

- **ID:** SPEC-56
- **Nome:** surface-border-tokens
- **Status:** IMPLEMENTED
- **Autor:** portal-dev-agent (rascunho, 2026-09-16 — continuação de
  investigação anterior, decisões do usuário já tomadas, ver §5)
- **Área:** `src/styles/globals/base.css` (classes globais novas), sem
  tocar componente/rota.
- **Contexto do pedido:** achado da investigação — `.soft-card` e
  `.btn-soft` são usadas em 3 lugares do código mas **nunca foram
  definidas** em nenhum CSS do projeto (confirmado por grep em
  `src/styles/**` e no repo inteiro fora de `node_modules`), então hoje
  renderizam sem borda/fundo/sombra nenhuma — plano de fundo "cru", sem
  a superfície visual que o nome da classe promete.

---

## 1. Objetivo

Definir `.soft-card` e `.btn-soft` como classes globais reais em
`src/styles/globals/base.css`, usando os tokens de tema já existentes
(`--surface`, `--shadow-soft`, `--bs-border-color`), com raio de borda
`var(--bs-border-radius-sm)` (padrão atual do NewPortal — **não** o
`1.15rem` fixo do legado `warren/Portal`, decisão explícita do usuário).

## 2. Contexto (achados da investigação)

### 2.1 Classes usadas, nunca definidas

Grep em `src/`, fora de `node_modules`:

```
src/components/ui/view-toggle.tsx:23   className={`btn btn-sm ${value === "cards" ? "btn-primary" : "btn-soft"}`}
src/components/ui/view-toggle.tsx:31   className={`btn btn-sm ${value === "list" ? "btn-primary" : "btn-soft"}`}
src/components/operations/tabs/Log.tsx:64                    <li key={entry.id} className="soft-card p-3">
src/routes/_dashboard/_internal/administrative/operations/$id/index.tsx:231    <section className="soft-card mb-4">
```

Nenhuma ocorrência de `.soft-card`/`.btn-soft` em `src/styles/**` (nem em
`base.css`, nem em `tokens.css`, nem em nenhum `*.module.css`). As duas
classes hoje não têm nenhum efeito visual — dependem 100% do reset
genérico (`* { box-sizing: border-box; padding: 0; margin: 0; }`,
`base.css:57-61`) e da cor de texto/fundo herdada do body.

### 2.2 Tokens já disponíveis (não precisa criar nenhum)

`src/styles/globals/tokens.css` já define, para as 6 combinações de
brand × modo:

- `--surface` — cor de fundo de superfície elevada (ex.: `#ffffff` no
  claro, `#1a2029` no escuro).
- `--shadow-soft` — sombra suave já usada em outros elementos elevados.
- `--bs-border-color` — cor de borda padrão do tema (sincronizada com o
  resto do Bootstrap).
- `--bs-border-radius-sm` — raio de borda pequeno padrão (`0.6rem` no
  tema atual, `tokens.css:81`) — **o token a usar aqui**, por decisão do
  usuário, em vez de replicar o `1.15rem` fixo do legado.

## 3. Escopo

1. Adicionar em `src/styles/globals/base.css` (ou outro arquivo de
   `src/styles/globals/` já importado no pipeline ativo, se a
   implementação achar mais coerente — mas `base.css` é o mais próximo do
   padrão já usado por outras classes utilitárias globais como
   `.app-brand`) as regras:
   - `.soft-card` — fundo `var(--surface)`, borda `1px solid
     var(--bs-border-color)`, `border-radius: var(--bs-border-radius-sm)`,
     sombra `var(--shadow-soft)`.
   - `.btn-soft` — variante de botão "neutra" com borda visível (fundo
     `var(--surface)` ou transparente — decisão de detalhe visual da
     implementação, mantendo contraste com o `btn-primary` ao lado dela
     em `view-toggle.tsx`), borda `1px solid var(--bs-border-color)`,
     `border-radius: var(--bs-border-radius-sm)`.
2. Nenhuma mudança em componente ou rota — os 3 consumidores existentes
   (`Log.tsx`, `administrative/operations/$id/index.tsx`,
   `view-toggle.tsx`) passam a renderizar com borda automaticamente, sem
   precisar editar o JSX/className deles.

## 4. Fora do escopo

- Qualquer novo consumidor de `.soft-card`/`.btn-soft` (ex.: SPEC-57 só
  **herda** o resultado desta SPEC, não adiciona uso novo além do que já
  existe em `Log.tsx`).
- Auditoria visual geral do projeto / destaque de informações (itens 3 e
  7 da investigação original) — adiados, sem SPEC própria por ora.
- Mudar o valor de `--surface`/`--shadow-soft`/`--bs-border-color` em si
  — só consumir os tokens que já existem.
- Estado `:hover`/`:active`/`:focus` de `.btn-soft` além do mínimo
  necessário pra manter o contraste com `btn-primary` no `ViewToggle` —
  se a implementação achar necessário um ajuste de estado, documentar
  como decisão de detalhe, não redesenho.

## 5. Decisões já tomadas (não são `[NEEDS_DECISION]`)

- **Raio de borda:** `var(--bs-border-radius-sm)` — padrão atual do
  NewPortal. **Não** replicar o `1.15rem` fixo do legado `warren/Portal`
  (decisão explícita do usuário).
- Cores/sombra vêm exclusivamente dos tokens já existentes (`--surface`,
  `--shadow-soft`, `--bs-border-color`) — nenhum valor de cor hard-coded
  novo, respeitando a regra de theming do projeto
  (`.github/instructions/theming.instructions.md`).

## 6. Requisitos funcionais

- **RF1** — `.soft-card` definida em CSS global, com fundo, borda e raio
  visíveis nas 6 combinações de brand × modo (herdado dos tokens, sem
  bloco `[data-brand="X"][data-bs-theme="Y"]` específico nesta classe —
  os tokens já resolvem a variação).
- **RF2** — `.btn-soft` definida em CSS global, com borda visível e
  contraste suficiente ao lado de `.btn-primary` (uso real:
  `ViewToggle`, alternância "cards"/"list").
- **RF3** — Raio de borda das duas classes é `var(--bs-border-radius-sm)`.
- **RF4** — Nenhum componente/rota consumidor é editado — só o CSS global
  muda.

## 7. Não funcionais

- Baixo risco: mudança 100% CSS, sem lógica, sem novo componente, sem
  nova rota — não deve gerar erro de `tsc` nem de lint (arquivo `.css`
  fora do escopo do ESLint de TS).
- Compatível com light/dark e as 3 brands (`asa`/`asi`/`asc`) — validar
  visualmente pelo menos claro/escuro na brand default (`asa`).

## 8. Camada de dados

Não aplicável — mudança é só CSS (`src/styles/globals/**`).

## 9. UI

- Nenhum componente novo. Efeito colateral visível em:
  - `src/components/ui/view-toggle.tsx` (toggle "cards"/"list" — o botão
    não-selecionado ganha borda).
  - `src/components/operations/tabs/Log.tsx` (cada entrada de log vira um
    card com borda, SPEC-39 — atualmente sem borda).
  - `src/routes/_dashboard/_internal/administrative/operations/$id/index.tsx`
    (seção com `className="soft-card mb-4"`, linha 231 — atualmente sem
    borda).

## 10. i18n

Não aplicável — sem texto novo.

## 11. Arquivos esperados

- `src/styles/globals/base.css`

## 12. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | `.soft-card` renderiza com borda, fundo de superfície e raio `var(--bs-border-radius-sm)` em `Log.tsx` e em `administrative/operations/$id/index.tsx` |
| CA2 | `.btn-soft` renderiza com borda visível no botão não-selecionado do `ViewToggle` |
| CA3 | Nenhum arquivo fora de `src/styles/globals/base.css` foi alterado |
| CA4 | Validado visualmente em pelo menos claro e escuro, brand `asa` (default) — screenshot ou descrição nas Implementation Notes |
| CA5 | `bun run check` + `bun run lint` sem regressão |

## 13. Riscos

- **R1** — Baixíssimo: única superfície de risco é contraste visual em
  algum dos 6 pares brand × modo não revisado manualmente — mitigar
  validando pelo menos claro/escuro na brand default (CA4); demais
  brands (`asi`/`asc`) ficam como verificação leve, não bloqueante, dado
  que os tokens já são os mesmos usados em outros componentes elevados
  do projeto.

## 14. Dependências

Nenhuma dependência de entrada. **SPEC-57 depende desta SPEC** (herda
`.soft-card` corrigido em `Log.tsx`) — SPEC-56 deve fechar antes de
SPEC-57 ser implementada (pode ser aprovada/escrita em paralelo, só a
implementação é sequencial).

## Implementation Notes

- **Arquivos alterados:** `src/styles/globals/base.css` (único arquivo,
  conforme CA3).
- `.soft-card` definida com `background: var(--surface)`, `border: 1px
  solid var(--bs-border-color)`, `border-radius:
  var(--bs-border-radius-sm)`, `box-shadow: var(--shadow-soft)` — todos
  tokens já existentes em `tokens.css`, nenhuma cor hard-coded nova.
- `.btn-soft` definida via variáveis do Bootstrap (`--bs-btn-*`), padrão já
  usado em `.btn-primary`/`.btn-outline-primary` no mesmo arquivo: fundo
  `var(--surface)`, borda `var(--bs-border-color)`, hover/active com
  `var(--bs-secondary-bg)` pra dar feedback visual sem depender de cor de
  marca — mantém contraste com `.btn-primary` ao lado dela no
  `ViewToggle`. `border-radius: var(--bs-border-radius-sm)`.
- **Comandos executados:**
  - `bun run check` (tsc --noEmit) — **VERIFIED**, sem erros.
  - `bun run lint` — **VERIFIED**, mesmo baseline de antes da mudança: 66
    problems (3 errors, 63 warnings), todos pré-existentes e alheios a
    este arquivo (confirmado rodando lint com a mudança stashed — mesmo
    resultado). Nenhuma regressão introduzida.
- **Validação visual (CA4):** dev server não foi mantido de pé nesta
  sessão (indisponibilidade de memória relatada em sessão anterior) — não
  foi possível tirar screenshot. Validação feita por leitura de código:
  os 3 consumidores (`view-toggle.tsx`, `Log.tsx`,
  `administrative/operations/$id/index.tsx`) já tinham as classes no
  JSX; as regras novas usam exclusivamente tokens que já resolvem as 6
  combinações de brand × modo (mesmos tokens usados por outras superfícies
  elevadas do projeto, ex. `.app-brand__badge`, cards de outras telas) —
  risco de contraste ruim é baixo (ver R1), mas **validação visual manual
  não foi confirmada nesta rodada**.
- **Critérios de aceitação:**

  | # | Critério | Status |
  | --- | --- | --- |
  | CA1 | `.soft-card` com borda/fundo/raio em `Log.tsx` e `administrative/operations/$id` | PASS (por leitura de código/CSS) |
  | CA2 | `.btn-soft` com borda visível no `ViewToggle` | PASS (por leitura de código/CSS) |
  | CA3 | Só `base.css` alterado | PASS |
  | CA4 | Validado visualmente claro/escuro, brand `asa` | NOT VERIFIED — dev server indisponível nesta sessão |
  | CA5 | `bun run check` + `bun run lint` sem regressão | PASS |

- **Decisões tomadas durante a implementação:** `.btn-soft` usa as
  variáveis `--bs-btn-*` (mesmo padrão de `.btn-primary`/
  `.btn-outline-primary` já existente no arquivo) em vez de propriedades
  CSS soltas, pra herdar corretamente o comportamento de estado
  (hover/active/disabled) do Bootstrap — detalhe de implementação
  permitido pelo §3 item 1 da spec.
- **Limitações conhecidas:** validação visual (CA4) não confirmada por
  screenshot nesta sessão — recomenda-se conferir manualmente antes do
  merge, mas o risco é baixo dado que os tokens já são usados em outras
  superfícies elevadas do tema.
