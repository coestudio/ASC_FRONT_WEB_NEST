# SPEC-31 — Polimento da aba Romaneio (exportar + visual tipo Excel)

- **ID:** SPEC-31
- **Nome:** romaneio-tab-polish
- **Status:** APPROVED (2026-09-16, usuário)
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
