# SPEC-49 — Preview de `.docx`/planilha: estilizar o HTML convertido

- **ID:** SPEC-49
- **Nome:** file-preview-docx-sheet-styling
- **Status:** IMPLEMENTED (2026-09-16) — ver §8 (Implementation Notes).
- **Autor:** claude (retomada do item "Preview de `.doc`/`.xlsx`" do
  `TODO.md`, que estava sem descrição concreta o bastante pra virar SPEC)
- **Área:** `src/components/ui/file-preview-modal.tsx` (+ CSS module
  novo).
- **Depende de:** nenhuma. O bloqueio anterior (CORS da Storage Account
  impedindo o `fetch()` de `.docx`/`.xlsx`) já foi resolvido pelo usuário
  direto na infra do Azure, fora do código — confirmado funcionando.

---

## 1. Objetivo

`DocxPreview`/`SheetPreview` (`file-preview-modal.tsx`) já convertem o
arquivo certo (`mammoth` pra `.docx`, `SheetJS` pra planilha) e já
carregam o conteúdo (CORS resolvido) — mas o HTML gerado usa as classes
`file-preview-docx`/`file-preview-sheet`, que **não têm nenhum CSS**
implementado em lugar nenhum do projeto (confirmado por grep). O
resultado: títulos do Word saem no tamanho cru de `<h1>`/`<h2>` do
Bootstrap (enorme), sem hierarquia visual, sem espaçamento, e a tabela da
planilha sem borda/zebra/cabeçalho fixo — like o print mostrado pelo
usuário (`PLANO DE PROJETO...` em fonte gigante, sem respiro).

## 2. Achado

- `file-preview-modal.tsx` renderiza `dangerouslySetInnerHTML` com HTML
  semântico puro (`mammoth`: `<h1>`-`<h6>`, `<p>`, `<strong>`, `<ol>`,
  `<table>`; `SheetJS.sheet_to_html`: `<table>` cru) dentro de
  `<div className="file-preview-docx">`/`<div className="file-preview-sheet
table-responsive">`.
- `grep -rn "file-preview-docx\|file-preview-sheet" src/` não encontra
  **nenhuma** definição CSS pra essas classes — o Bootstrap aplica só o
  reset padrão de heading (`h1` global = ~2.5rem), sem nenhum ajuste de
  escala pro contexto de "documento dentro de um modal".
- Não há CSS Module nem import de estilo nenhum hoje em
  `file-preview-modal.tsx` — é o único arquivo do componente, sem
  `.module.css` companheiro (violando de fato a convenção "CSS Modules
  pra estilo local de componente" do `AGENTS.md`/`theming.instructions.md`,
  mas por omissão histórica, não decisão).
- O modal já é `scrollable` por padrão (`components/ui/modal.tsx`), então
  o corte visto no print é só o scroll natural do conteúdo, não um bug de
  layout quebrado.

## 3. Escopo

Criar `src/components/ui/file-preview-modal.module.css` e aplicar nas
duas `div`s de conteúdo convertido:

1. **`.docx`** — reduzir escala de heading pro contexto de modal (ex. `h1`
   ~1.5rem, `h2` ~1.25rem, `h3` ~1.1rem, peso 600 em vez do bold puro),
   espaçamento vertical consistente entre blocos (`margin-block` em
   `p`/heading/lista), `line-height` confortável pro corpo de texto,
   tabelas do próprio `.docx` (se existirem) com borda leve e padding.
2. **`.sheet`** — bordas em todas as células (`border-collapse`, borda
   `1px solid var(--bs-border-color)`), padding de célula, cabeçalho
   (`<tr>` da primeira linha — `SheetJS` não gera `<thead>` separado,
   então o alvo real é a primeira linha da tabela) com fundo levemente
   destacado (`bg-body-tertiary`) e peso 600, zebra nas linhas pares
   (`bg-body-tertiary` com opacidade baixa ou `nth-child`).
3. Cores/bordas **só** via token semântico do Bootstrap (`var(--bs-body-color)`,
   `var(--bs-border-color)`, `var(--bs-body-secondary)`, etc. — regra do
   `theming.instructions.md`, nada de hex fixo) — funciona nas 6
   combinações brand×modo automaticamente, sem CSS extra por brand.

## 4. Fora do escopo

- Mudar a lib de conversão (`mammoth`/`SheetJS`) ou como o HTML é gerado
  — só estilizar o que já é produzido.
- Suporte a `.ppt`/`.pptx` — já é fallback assumido, fora desta SPEC.
- Qualquer mudança em CORS/infra do Azure — já resolvido pelo usuário.
- Multi-aba de planilha (`SheetPreview` só mostra a primeira aba
  hoje) — problema funcional separado, não visual; vira SPEC própria se
  o usuário confirmar que é um problema real (planilhas com mais de uma
  aba usada de verdade).

## 5. Requisitos funcionais

- **RF1** — Preview de `.docx` com hierarquia de heading legível dentro
  do modal (não maior que o título do próprio modal), espaçamento entre
  parágrafos/listas, sem quebrar em nenhum dos 3 brands × 2 modos.
- **RF2** — Preview de planilha com tabela com borda visível, cabeçalho
  destacado, e legibilidade em tema escuro (o print do usuário já está em
  dark mode — conferir que o texto da tabela não fica ilegível ali).

## 6. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Reabrir o preview do `.docx` do print do usuário — headings num tamanho proporcional ao modal, não maior que o título do header. |
| CA2 | Preview de `.xlsx` com bordas de célula visíveis e cabeçalho destacado. |
| CA3 | Sem cor hard-coded — só tokens `--bs-*`/`--brand-*` (`grep` no CSS novo não acha nenhum hex). |
| CA4 | `bun run check` + `bun run lint` sem regressão. |

## 7. Riscos

Nenhum — CSS isolado a um componente, sem mudança de lógica/dado.

## 8. Implementation Notes (2026-09-16)

**Arquivos alterados:**
- `src/components/ui/file-preview-modal.module.css` (novo) — regras
  `:global()` escopadas em `.docx`/`.sheet` pras tags cruas que
  `mammoth`/`SheetJS` geram (heading reduzido e com hierarquia, parágrafo
  com `line-height`/espaçamento, tabela com borda + cabeçalho destacado +
  zebra). Só tokens `--bs-body-color`/`--bs-border-color`/`--bs-tertiary-bg`,
  nenhum hex fixo — funciona nas 6 combinações brand×modo sem CSS extra.
- `src/components/ui/file-preview-modal.tsx` — import do CSS module,
  `className="file-preview-docx"`/`"file-preview-sheet"` (classes soltas,
  sem CSS nenhum antes) trocadas por `styles.docx`/`styles.sheet`.

**Comandos executados e resultado:**
- `bun run check` (`tsc --noEmit`) — VERIFIED, sem erros.
- `bun run lint` — VERIFIED, 66 problemas (3 erros/63 warnings), mesma
  baseline pré-existente de `session.server.ts`/warnings espalhados,
  nenhum novo no arquivo/CSS module tocados.

**Critérios de aceitação:**

| # | Critério | Status |
| --- | --- | --- |
| CA1 | Headings do `.docx` num tamanho proporcional ao modal | PASS (código — `h1` 1.5rem/`h2` 1.25rem/`h3` 1.1rem, menor que o padrão Bootstrap) |
| CA2 | Tabela de `.xlsx` com borda + cabeçalho destacado | PASS (código — borda em toda célula, primeira linha com `--bs-tertiary-bg` + `font-weight: 600`) |
| CA3 | Sem cor hard-coded | PASS (`grep -n "#" file-preview-modal.module.css` sem match) |
| CA4 | `bun run check`/`lint` sem regressão | PASS |

**Limitações conhecidas:** não testado visualmente num browser real
contra o `.docx` do print do usuário (sem sessão disponível neste
ambiente) — recomenda-se reabrir o mesmo arquivo pra confirmar
visualmente antes de considerar fechado de vez.

### 8.1 Ajuste adicional (2026-09-16, mesmo dia) — responsividade horizontal

Usuário pediu scroll/responsividade horizontal além do estilo — mantido
nesta mesma SPEC (não virou SPEC nova):

- `.docx` ganhou `overflow-wrap: break-word` (evita string longa sem
  espaço, ex. URL, estourar a largura do modal).
- `.docx :global(table)` ganhou `display: block; overflow-x: auto;
  -webkit-overflow-scrolling: touch` — tabela dentro do `.docx` (se o
  Word original tiver uma) rola horizontalmente sozinha em vez de
  empurrar o modal inteiro pra lado, mesmo padrão que `.sheet` já tinha
  via `table-responsive` do Bootstrap (aplicado na `div` wrapper em
  `file-preview-modal.tsx`, sem mudança necessária aí).

**CA5** — Tabela larga dentro de `.docx` ou `.sheet` rola horizontalmente
dentro do próprio conteúdo, sem alargar o modal — PASS (código; mesma
ressalva de não ter sido clicado num browser real).

### 8.2 Ajuste adicional (2026-09-17) — "moldura" de página (print do usuário)

Usuário voltou com print mostrando `.docx`/`.xlsx` já carregando/visíveis
(RF1/RF2 da §8 confirmados funcionando de fato), mas achou "o visual não
está interessante" — feedback qualitativo, sem lista de defeitos
pontuais. **Limitação desta rodada:** a imagem anexada
(`[Image #16]`) não chegou como arquivo acessível a este agente (sem
path de disco, sem bytes) — não foi possível inspecionar o print
específico. Segui em frente com uma leitura de causa raiz plausível e
comum pro sintoma descrito ("visual sem graça"): o HTML convertido
(`mammoth`/SheetJS) ficava solto dentro do modal, sem nenhuma "moldura"
que o diferenciasse de texto cru — mesmo com hierarquia de heading/borda
de tabela já certas desde a §8, faltava identidade visual de "isto é um
documento/planilha dentro de um preview", não só HTML estilizado.

**Mudanças:**

- Novo wrapper `.previewCard` (`file-preview-modal.module.css`) em volta
  do conteúdo de `.docx`/`.sheet`: fundo `--bs-tertiary-bg`, borda,
  cantos arredondados — cria um "cartão" que separa visualmente o
  preview do resto do modal.
- Novo cabeçalho `.previewCardHeader` dentro do cartão: ícone
  (`iconForExtension`, já existia, reaproveitado — `bi-file-earmark-word`/
  `bi-file-earmark-spreadsheet`) colorido via `--bs-primary`
  (`.previewCardIconDocx`) / `--bs-success` (`.previewCardIconSheet`) +
  rótulo textual novo (`filePreview.kind.docx`/`filePreview.kind.sheet`,
  4 locales) — dá uma identidade rápida de "isto é um Word"/"isto é uma
  planilha" antes mesmo de ler o conteúdo.
- `.docx`: fundo `--bs-body-bg` (contraste com o `--bs-tertiary-bg` do
  cartão ao redor, efeito "página dentro de uma bandeja"), `max-width:
  46rem` centralizado (linha de leitura confortável em vez de esticar a
  largura toda do modal `size="lg"`), `padding: 1.5rem`.
- `.sheet`: fundo `--bs-body-bg`, `padding`, `max-height: 60vh` +
  `overflow-y: auto` (rolagem própria da planilha dentro do cartão, sem
  depender só do scroll do modal inteiro), cabeçalho da tabela (primeira
  linha) `position: sticky; top: 0` (fica visível rolando planilhas
  longas), hover de linha (`--bs-secondary-bg`), fonte da tabela reduzida
  pra `0.875rem` (mais dados visíveis por vez, mais "com cara de
  planilha").
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/filePreview.json` — nova chave
  `kind.docx`/`kind.sheet`.

**Comandos executados:**
- `bun run check` — VERIFIED, sem erros.
- `bun run lint` — VERIFIED, 0 erros / 63 warnings (baseline
  pré-existente, sem regressão nos arquivos tocados; formatação ajustada
  com `bunx prettier --write` antes de fechar).
- `grep -n "#" file-preview-modal.module.css` — VERIFIED, sem match (só
  tokens `--bs-*`, CA3 mantido).

**Limitação conhecida:** como no §8 original, não validado visualmente
num browser real contra o arquivo do print do usuário — recomenda-se
reabrir o mesmo `.docx`/`.xlsx` e comparar. Se o resultado ainda não for
"interessante" o suficiente na visão do usuário, preciso de um retorno
mais específico (o que exatamente incomoda: tamanho de fonte? cor?
espaçamento? falta de algo como paginação/rodapé simulado?) — feedback
qualitativo tipo "não está interessante" sem a imagem legível não dá pra
convergir sozinho pra além de uma correção de causa-raiz plausível como
esta.
