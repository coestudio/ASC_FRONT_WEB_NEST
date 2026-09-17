# SPEC-31 — Polimento da aba Romaneio (exportar + visual tipo Excel)

- **ID:** SPEC-31
- **Nome:** romaneio-tab-polish
- **Status:** IMPLEMENTED (2026-09-16, portal-dev-agent)
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/components/operations/tabs/Romaneio.tsx`
- **Contexto do pedido:** dois itens do `TODO.md` na mesma aba
  (Romaneio), agrupados numa SPEC só.

---

## 1. Objetivo

1. Adicionar botão de exportar o romaneio da operação, consumindo o
   endpoint do Core que já existe.
2. Deixar o visual da listagem mais parecido com a planilha Excel de
   referência do usuário, removendo a coluna de origem (`source`).

## 2. Contexto

### 2.1 Endpoint de exportação (confirmado)

`GET /api/operation/{operationId}/romaneio/export` já existe no client
gerado: `getApiOperationOperationIdRomaneioExport` +
`useGetApiOperationOperationIdRomaneioExport` +
`GetApiOperationOperationIdRomaneioExportParams`, em
`src/api/generated/endpoints/romaneio/romaneio.ts:825+`. Não há trabalho
de Core pendente aqui — é só consumir o que já existe.

### 2.2 Coluna de origem

`Romaneio.tsx` (`columns`, linhas 203-244) tem uma coluna `source`
mostrando `resolveRomaneioSourceLabel` (badge). O pedido do usuário é
remover essa coluna da visualização para deixar a tabela mais parecida
com a planilha Excel original (que não tem esse dado).

## 3. Escopo

1. Botão "Exportar" na aba Romaneio (mesma área do botão "Importar" já
   existente, `Romaneio.tsx:260-265`), chamando o endpoint de export e
   disparando o download do arquivo resultante no browser.
2. Remover a coluna `source` de `columns` em `Romaneio.tsx`.
3. Ajustar o visual da tabela (bordas, espaçamento, tipografia) para se
   aproximar da planilha de referência do usuário — decisão de detalhe
   fica com o usuário no momento da revisão (ver §8, não é
   `[NEEDS_DECISION]` bloqueante, apenas "a validar visualmente").

## 4. Fora do escopo

- Mudar o formato do arquivo exportado (isso é decisão do Core — o
  endpoint já define o que devolve, ex. `.xlsx`, o front só consome).
- Mudar o wizard de import (`ImportRomaneioModal`) — só a listagem
  principal e o botão de export.
- Remover `source` do modelo de dados (`RomaneioDTO.source` continua
  existindo, só não aparece mais na tabela).

## 5. Requisitos funcionais

- **RF1** — Botão "Exportar" na aba Romaneio, ao lado (ou próximo) do
  botão "Importar" existente, chamando
  `getApiOperationOperationIdRomaneioExport(operationId, params)` e
  disparando o download do blob retornado no browser (nome de arquivo:
  usar o que vier no header `Content-Disposition` da resposta, se
  disponível; senão, um nome default com o id/nome da operação —
  confirmar durante a implementação o que o endpoint devolve).
- **RF2** — Enquanto a exportação está em andamento, o botão mostra
  estado de carregamento (`Spinner`, mesmo padrão de outros botões
  assíncronos da tela, ex. `analyzeMutation.isPending` em
  `ImportRomaneioModal`).
- **RF3** — Erro na exportação mostra toast de erro (mesmo padrão
  `toast.error` já usado na aba).
- **RF4** — Coluna `source`/badge de origem removida de `columns` na
  tabela principal da aba.
- **RF5** — Ajuste visual da tabela (grade mais visível tipo planilha,
  alinhamento numérico à direita para colunas de peso, cabeçalho mais
  denso) — a validar com o usuário durante/depois da implementação
  (screenshot antes/depois).

## 6. Não funcionais

- Exportação não deve travar a UI (usar mutation/query assíncrona, não
  bloquear a thread principal).

## 7. Camada de dados

- Usar o hook gerado `useGetApiOperationOperationIdRomaneioExport` (ou a
  função `getApiOperationOperationIdRomaneioExport` diretamente, se o
  padrão de download-sob-clique for mais simples como uma chamada
  disparada por evento em vez de um hook declarativo — confirmar o tipo
  de retorno do endpoint gerado, provavelmente `Blob`, antes de decidir).
- `GetApiOperationOperationIdRomaneioExportParams` — checar se aceita
  filtro de busca (`Search`) para exportar só o filtrado, ou exporta
  sempre a lista completa; documentar o comportamento real encontrado
  nas Implementation Notes.

## 8. UI

- Botão "Exportar" — ícone sugerido `bi-download`, ao lado do botão
  "Importar" (`bi-file-earmark-spreadsheet`) já existente.
- Ajuste visual da tabela: usar utilitárias Bootstrap (`table-bordered`,
  `table-sm`, alinhamento) — nada de CSS customizado fora do padrão do
  projeto, regra 8 (Bootstrap, nunca Tailwind).

## 9. i18n

Namespace `administrative-operations.romaneio` (4 locales):

- `export.button` (label do botão)
- `export.toast.success` / `export.toast.error`

## 10. Arquivos esperados

- `src/components/operations/tabs/Romaneio.tsx`
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json`

## 11. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Clicar em "Exportar" dispara o download de um arquivo (verificado manualmente na rota `/administrative/operations/$id`, aba Romaneio) |
| CA2 | Estado de carregamento visível durante a exportação |
| CA3 | Erro de exportação mostra toast, sem quebrar a tela |
| CA4 | Coluna de origem não aparece mais na tabela |
| CA5 | Visual da tabela revisado com o usuário (screenshot antes/depois nas Implementation Notes) |
| CA6 | `bun run check` + `bun run lint` sem regressão |

## 12. Riscos

- **R1** — Formato exato do arquivo de export (nome, extensão,
  `Content-Disposition`) não confirmado até a implementação — pode exigir
  ajuste fino no tratamento do `Blob`/nome de arquivo.

## Implementation Notes

### Arquivos alterados

- `src/components/operations/tabs/Romaneio.tsx` — botão "Exportar" (RF1-RF3),
  remoção da coluna `source`/badge (RF4), alinhamento numérico da coluna de
  peso e ativação da variante "planilha" da tabela (RF5).
- `src/components/crud/crud-list-page.tsx` — `CrudColumn.align` (opcional) e
  `CrudListPageProps.spreadsheetVariant` (opcional, default `false`/
  `undefined`) — só a aba Romaneio liga essa variante; nenhuma outra
  listagem CRUD muda de visual.
- `src/components/crud/crud-list-page.module.css` — classe
  `.crudTableSpreadsheet` (padding mais denso; a grade/bordas vêm de
  `bordered`/`size="sm"` do próprio `react-bootstrap`, sem CSS a mais).
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json` —
  chave `romaneio.export.{button,toast.success,toast.error}` nos 4 locales.

### Decisões tomadas durante a implementação

- **Transporte do export (§7 da SPEC):** o hook/`fn` gerados pelo Orval
  (`getApiOperationOperationIdRomaneioExport` /
  `useGetApiOperationOperationIdRomaneioExport`) passam por `apiRequest`
  (`src/api/mutator.ts`), que só devolve o corpo já desembrulhado (`T`) —
  sem acesso aos headers da resposta (`Content-Disposition`, necessário pro
  nome do arquivo) e sem forma de pedir `responseType: "blob"` através da
  assinatura gerada (ela nunca passa esse campo pro `AxiosRequestConfig`).
  Solução: chamar `axiosInstance` (também exportado por `mutator.ts`)
  diretamente, com `responseType: "blob"`, reaproveitando a URL do endpoint
  via `getGetApiOperationOperationIdRomaneioExportQueryKey(operationId)`
  (evita duplicar o path à mão). Isso mantém o transporte único (mesmo
  `coreProxyAdapter`, mesmo proxy BFF, mesmo cookie httpOnly) — só contorna
  a limitação do wrapper genérico pra esse caso específico de download
  binário, que não existia antes no client gerado (primeiro endpoint de
  arquivo consumido pelo front).
- **Parâmetro de filtro no export (§7 da SPEC, checado no código gerado):**
  `GetApiOperationOperationIdRomaneioExportParams` só tem `format?:
  RomaneioImportRomaneioFormat` (`Xlsx` | `Csv`) — **não** aceita `Search`.
  O endpoint sempre exporta a lista completa da operação, nunca só o
  filtrado da busca da tela. RF1 não pede seletor de formato — o botão
  chama o endpoint sem parâmetro, deixando o Core aplicar o formato
  default.
- **Nome do arquivo (R1):** extraído do header `Content-Disposition`
  (`filename=`/`filename*=UTF-8''`) quando presente; sem o header, usa
  `romaneio-${operationId}.xlsx` como default. Não foi possível confirmar
  em ambiente real (Core não estava no ar durante a implementação) qual
  formato exato o Core devolve — ver CA1 nas limitações abaixo.
- **Visual "planilha" (RF5):** em vez de alterar o estilo padrão do
  `CrudListPage` (usado por várias outras listagens CRUD, com um visual
  proposital sem grade vertical — SPEC-11), adicionei um prop opt-in
  (`spreadsheetVariant`) que liga `bordered`/`size="sm"` do
  `<Table>` do react-bootstrap + um ajuste de padding via CSS Module. Só a
  aba Romaneio usa `spreadsheetVariant`; nenhuma outra tela muda de
  aparência. Alinhamento numérico da coluna "Peso" via novo campo opcional
  `CrudColumn.align`.
- **Coluna `source` (RF4):** removida de `columns` em `Romaneio.tsx`, junto
  com o import de `resolveRomaneioSourceLabel` (ficaria não usado) e de
  `useLocale` (só era usado nesse render). `RomaneioDTO.source` continua
  existindo no modelo — só não aparece mais na tabela (fora do escopo,
  §4). A chave i18n `romaneio.colSource` foi deixada nos 4 dicionários
  (não é mais referenciada em código, mas removê-la não fazia parte do
  escopo desta SPEC).

### Comandos executados e resultado

- `bun run check` (`tsc --noEmit`) — **VERIFIED**, sem erros.
- `bun run lint` — **VERIFIED** contra baseline: 66 problemas (3 erros, 63
  warnings) antes e depois da mudança, todos em arquivos não tocados por
  esta SPEC (`src/lib/session.server.ts`, `src/lib/ui-prefs.tsx`,
  `src/layouts/Form/**` — débito pré-existente, confirmado rodando o lint
  numa cópia stashada do estado anterior à implementação). Nenhum warning/
  erro novo em `Romaneio.tsx`, `crud-list-page.tsx` ou
  `crud-list-page.module.css`.
- `just map` — não rodado; o contrato do Core não mudou (endpoint de export
  já existia no client gerado, confirmado em código antes de começar).
- `bun run build:azure` — não rodado (mudança não toca build/servidor/rotas
  de `api/`, só componente de apresentação + i18n).

### Critérios de aceitação

| # | Critério | Status |
| --- | --- | --- |
| CA1 | Clicar em "Exportar" dispara o download de um arquivo | **NOT VERIFIED** — Core não estava no ar neste ambiente para teste manual ponta a ponta; implementação segue o contrato do endpoint gerado e o padrão de transporte do projeto (ver decisões acima). Precisa validação manual na rota `/administrative/operations/$id`, aba Romaneio, com o Core no ar. |
| CA2 | Estado de carregamento visível durante a exportação | PASS (código) — `exporting` desabilita o botão e troca o ícone por `Spinner`, mesmo padrão de `ImportRomaneioModal`. Validação visual não verificada manualmente (mesmo motivo do CA1). |
| CA3 | Erro de exportação mostra toast, sem quebrar a tela | PASS (código) — `catch` chama `toast.error`, sem propagar exceção pra árvore de componentes. Não verificado manualmente (mesmo motivo do CA1). |
| CA4 | Coluna de origem não aparece mais na tabela | PASS — coluna `source` removida de `columns`; `bun run check`/`lint` confirmam que não sobrou import morto. |
| CA5 | Visual da tabela revisado com o usuário (screenshot antes/depois) | **NOT VERIFIED** — sem ambiente de dev rodando neste agente pra capturar screenshot; mudança de visual implementada (grade via `bordered`/`size="sm"`, alinhamento numérico) mas precisa revisão visual do usuário antes de considerar fechado de fato. |
| CA6 | `bun run check` + `bun run lint` sem regressão | PASS — ver comandos acima. |

### Limitações conhecidas

- CA1, CA2 (parte visual), CA3 (parte visual) e CA5 não foram verificados
  manualmente contra um Core real nem capturados em screenshot — este
  agente não tinha um ambiente de dev com o Core no ar disponível. A
  implementação segue o contrato do client gerado e o padrão de erro/
  loading já usado no resto da aba, mas fica como pendência de validação
  manual do usuário antes de considerar a SPEC 100% fechada na prática (o
  código está `IMPLEMENTED`, mas os critérios de UX real ficam como
  follow-up).
- Se o Core não devolver `Content-Disposition` (ou devolver num formato
  fora do esperado pela regex), o download ainda funciona, só cai no nome
  default (`romaneio-{operationId}.xlsx`) — sem quebrar o fluxo.
