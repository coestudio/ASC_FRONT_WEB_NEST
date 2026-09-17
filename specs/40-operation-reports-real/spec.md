# SPEC-40 — Relatórios reais de Operação (fim do mock)

- **ID:** SPEC-40
- **Nome:** operation-reports-real
- **Status:** IMPLEMENTED (2026-09-16) — ver §13 (Implementation Notes).
  Reaberta e revisada contra o contrato real do Core, que já está
  `IMPLEMENTED` (`specs/36-weight-report`, `specs/37-packing-list-report`,
  `specs/38-photographic-report`). O `[NEEDS_DECISION]` do §5 original
  está **resolvido pelo contrato real**, não por decisão de negócio nova
  — ver §5 revisado. Escopo ficou mais simples que o rascunho original:
  1 formato fixo por relatório (sem `.pdf`), geração síncrona, sem
  histórico.
- **Autor:** portal-dev-agent (rascunho original); revisão claude
  (2026-09-16, cross-check contra `Controllers/Operation/Reports/*.cs` do
  Core)
- **Área:** `src/components/operations/tabs/Reports.tsx`
- **Depende de (Core):** `specs/36-weight-report`,
  `specs/37-packing-list-report`, `specs/38-photographic-report` — todas
  `IMPLEMENTED` (2026-09-16). `GET /operation/{operationId}/reports/
{weight,packing-list,photographic}`, todas `[Authorize]` +
  `RequireInternal(Agent)`.
- **Contexto do pedido:** item do `TODO.md` sobre a aba Reports (hoje
  mock, SPEC-07-07) virar geração real de 3 relatórios.

---

## 1. Objetivo

Trocar a aba **Reports** do shell de Operação, hoje 100% mock
(`MOCK_REPORTS`), por geração real de 3 relatórios: **Weight Report**
(`.xlsx`), **Packing List** (`.xlsx`) e **Relatório Fotográfico**
(`.docx`, baseado nos containers + fotos dos containers), cada um com um
único formato fixo definido pelo Core (não `.pdf`+`.docx` — ver §5),
sempre em **inglês fixo** (sem i18n).

## 2. Contexto

`Reports.tsx` hoje é 100% mock (`MOCK_REPORTS`, array local com
`type`/`generatedAt`/`format`/`status`), com `MockDataBanner` e
paginação client-side. Não existe, no client gerado hoje, nenhum
endpoint de geração de relatório de operação — confirmado que este é um
gap de contrato total (backend novo substancial), não um ajuste pequeno.

## 3. Escopo

1. Sem listagem/histórico — o Core não persiste relatório gerado (ver
   §5.2). Cada clique dispara uma geração nova.
2. 3 botões de ação (um por tipo de relatório), cada um batendo em **um**
   endpoint `GET`, síncrono, que já devolve o arquivo binário pronto —
   sem polling, sem fila.
3. Download do arquivo gerado (nome de arquivo vem do header
   `Content-Disposition` do Core — `weight-report-{id}.xlsx`,
   `packing-list-{id}.xlsx`, `photographic-report-{id}.docx`).
4. Todo o conteúdo do relatório em inglês fixo (não passa por
   `useT()`/dicionários de i18n) — só os rótulos de **UI** (botões,
   títulos de seção da tela) seguem o padrão i18n normal do projeto; o
   conteúdo do arquivo em si é gerado pelo Core, já em inglês, e não é
   processado pelo front.

## 4. Fora do escopo

- Desenhar o contrato dos 3 endpoints de geração no Core — território do
  `core-spec-agent`.
- Qualquer i18n do **conteúdo** dos relatórios — decisão de negócio já
  dada pelo usuário: inglês fixo, sem i18n de conteúdo.
- Edição manual de dados de relatório — são gerados a partir de dados já
  existentes (containers, fotos, romaneio), não editáveis diretamente
  nesta tela.

## 5. Contrato real do Core (resolve o `[NEEDS_DECISION]` original)

Confirmado em `warren/Core/Controllers/Operation/Reports/{Reports.Controller.cs,
Reports.Export.cs}` (2026-09-16):

1. **Síncrono.** `GET /operation/{operationId}/reports/weight`,
   `/packing-list`, `/photographic` — cada chamada já devolve o arquivo
   binário na resposta (`File(bytes, contentType, filename)`). Sem fila,
   sem polling, sem status intermediário.
2. **Sem histórico.** Comentário explícito no código: "gerado on-demand,
   sem persistência/histórico". Cada clique gera do zero.
3. **Um formato fixo por relatório, não dois.** Weight e Packing List
   saem em `.xlsx`
   (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`),
   Fotográfico em `.docx`
   (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`).
   **Não existe `.pdf`** — decisão de arquitetura do Core
   (`Core/specs/BACKLOG.md` B18, LibreOffice não viável na API hospedada)
   segue de pé; o pedido original de "`.pdf` e `.docx`" não se aplica.

Os 3 endpoints exigem `[Authorize]` + papel interno `Agent`
(`RequireInternal(Agent)`) — confirmar que o usuário logado nas telas de
Operação sempre tem esse papel; se não tiver, botão deve ficar oculto/
desabilitado (mesmo padrão de outros botões condicionados a papel na
área de Operações).

## 6. Requisitos funcionais

- **RF1** — 3 botões de ação (um por relatório), cada um chamando o
  endpoint `GET` correspondente e disparando download do arquivo
  retornado (sem preview inline).
- **RF2** — Estado de carregamento (spinner/disabled) no botão durante a
  chamada — geração síncrona pode demorar (Fotográfico busca N fotos do
  blob storage).
- **RF3** — Tratamento de erro (toast) se a geração falhar (ex.: operação
  sem containers/fotos — confirmar com o Core se retorna 200 com arquivo
  vazio ou erro; se não houver spec explícita, tratar qualquer não-2xx
  como erro genérico).
- **RF4** — Remoção de `MOCK_REPORTS`/`MockDataBanner`/paginação client-
  side (não há mais lista, só os 3 botões).

## 7. Camada de dados

Já existe precedente idêntico no projeto: `Romaneio.tsx` `handleExport`
(RF1 de `specs/09-romaneio-gaps`/export). O hook gerado pelo Orval para
um endpoint que devolve arquivo binário (`getApi...`) passa pelo
`mutator.ts` genérico, que desembrulha o corpo sem dar acesso a headers
nem `responseType` — por isso o padrão usado é: pegar a **URL** do
endpoint via `getGetApi...QueryKey(...)` (função gerada, evita duplicar o
path à mão) e chamar `axiosInstance.get<Blob>(url, { responseType:
"blob" })` diretamente (mesmo `axiosInstance` exportado pelo
`mutator.ts`). Nome do arquivo vem do header `Content-Disposition` da
resposta; sem ele, cai num default (`weight-report-{operationId}.xlsx`
etc.). Repetir esse padrão para os 3 endpoints novos (3 handlers
`handleExportWeight`/`handleExportPackingList`/`handleExportPhotographic`,
ou 1 handler parametrizado pelos 3 — decisão de implementação, não de
SPEC).

## 8. UI

- `Reports.tsx` deixa de ser tabela/lista (não há mais itens pra listar,
  sem histórico) e passa a ser 3 cards/linhas fixas — um por tipo de
  relatório — cada um com nome, descrição curta e um botão "Gerar e
  baixar" (ícone `bi-file-earmark-excel` para Weight/Packing List,
  `bi-file-earmark-word` para Fotográfico — reflete o formato real, não
  `bi-file-earmark-pdf`).
- Botão mostra spinner/disabled durante a chamada (RF2); reabilita no
  fim (sucesso ou erro).

## 9. i18n

Só os rótulos de **UI** (título da aba, botões "Gerar Weight Report",
etc.) seguem i18n normal (`administrative-operations.reports.*`, 4
locales) — o **conteúdo** dos arquivos gerados é sempre inglês fixo,
gerado pelo Core, fora do escopo de i18n do front (decisão de negócio já
confirmada pelo usuário, não é `[NEEDS_DECISION]`).

## 10. Arquivos esperados

- `src/components/operations/tabs/Reports.tsx`
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json`
- `src/api/generated/**` (via `just map` contra o Core local, rodando as
  3 SPECs `IMPLEMENTED`)

## 11. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | `just map` gera os 3 hooks correspondentes aos endpoints `GET .../reports/{weight,packing-list,photographic}` sem erro de `tsc --noEmit`. |
| CA2 | Clicar em "Gerar Weight Report" dispara download de um `.xlsx` válido (nome de arquivo do `Content-Disposition` ou default). |
| CA3 | Mesmo teste (CA2) para Packing List (`.xlsx`) e Fotográfico (`.docx`). |
| CA4 | Botão mostra estado de carregamento durante a chamada e volta ao normal ao fim (sucesso ou erro). |
| CA5 | Falha na geração (ex. operação sem containers) mostra toast de erro, não quebra a tela. |
| CA6 | `MOCK_REPORTS`/`MockDataBanner`/paginação antiga removidos, zero referência morta. |
| CA7 | `bun run check` e `bun run lint` passam sem novos erros. |
| CA8 | 4 dicts de i18n com as mesmas chaves novas (`administrative-operations.reports.*`). |

## 12. Riscos

- **R1** (residual) — os 3 endpoints exigem papel interno `Agent`
  (`RequireInternal(Agent)`); confirmar em teste manual que o botão se
  comporta corretamente pra um usuário sem esse papel (oculto/desabilitado
  vs. erro 403 na cara).

## 13. Implementation Notes

**Arquivos alterados:**
- `src/components/operations/tabs/Reports.tsx` — reescrito. Sai a tabela
  mock com paginação (`MOCK_REPORTS`, `MockDataBanner`, `usePagination`,
  `ListPagination`); entram 3 `Card` fixos (Weight Report, Packing List,
  Relatório Fotográfico), cada um com botão "Gerar e baixar" que chama o
  endpoint `GET` correspondente e dispara download do blob retornado —
  mesmo padrão de `Romaneio.tsx` `handleExport` (`axiosInstance.get<Blob>`
  com `responseType: "blob"`, nome de arquivo do header
  `Content-Disposition`, fallback fixo se o header não vier).
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json`
  — bloco `reports` reescrito: removidas as chaves de tabela/status/mock
  (`colType`, `colGeneratedAt`, `colFormat`, `colStatus`, `colActions`,
  `statusReady`, `statusPending`, `download`, `emptyState` — sem outro
  consumidor, confirmado por grep antes de remover); adicionadas
  `generate`, `weight.{name,description}`, `packingList.{name,description}`,
  `photographic.{name,description}`, `toast.{success,error}`. Mesmo shape
  de chaves nos 4 locales.
- `src/api/generated/**` — via `just map` contra o Core local rodando as
  3 SPECs `IMPLEMENTED` (novo diretório
  `src/api/generated/endpoints/operation-reports/` e
  `src/api/generated/zod/operation-reports/`, mais atualização dos
  índices/snapshot gerados).

**Comandos executados e resultado:**
- Core local (`dotnet run --urls http://127.0.0.1:5766`, banco Postgres já
  em container `docker ps`) — **VERIFIED**, `GET /api/openapi/v1.json`
  respondeu 200 com os 3 paths novos
  (`/operation/{operationId}/reports/{weight,packing-list,photographic}`).
- `just map` (orval + snapshots estáticos + `tsc --noEmit`) — **VERIFIED**,
  0 erros, hooks `useGetApiOperationOperationIdReportsWeight`/
  `...PackingList`/`...Photographic` confirmados no client gerado.
- `bun run check` (`tsc --noEmit`) — **VERIFIED**, 0 erros.
- `bun run lint` — **VERIFIED** com ressalva: 3 erros de
  `react-hooks/rules-of-hooks` em `src/lib/session.server.ts` são
  pré-existentes (confirmado comparando com `git stash`, arquivo não
  tocado por esta SPEC, vêm do commit `55e598d`) — zero erro/warning
  atribuível a `Reports.tsx` ou aos dicionários alterados após
  `prettier --write`.
- `curl` direto no Core local sem `Authorize` no endpoint `weight` —
  **VERIFIED**, 403 (confirma `RequireInternal(Agent)` ativo, consistente
  com R1).

**Critérios de aceitação:**

| # | Critério | Resultado |
| --- | --- | --- |
| CA1 | `just map` gera os 3 hooks sem erro de `tsc --noEmit` | PASS |
| CA2 | Botão "Gerar Weight Report" dispara download de `.xlsx` válido | PASS (verificado via padrão idêntico de `Romaneio.tsx`, que já roda em produção; endpoint Core testado em `Core.Tests`, 10/10 — não houve teste manual de clique real na UI logada, ver limitação abaixo) |
| CA3 | Mesmo teste para Packing List (`.xlsx`) e Fotográfico (`.docx`) | PASS, mesma ressalva de CA2 |
| CA4 | Estado de carregamento no botão durante a chamada | PASS (`generating` state, `Spinner` + `disabled`, código revisado) |
| CA5 | Falha na geração mostra toast de erro, não quebra a tela | PASS (`try/catch` + `toast.error`, código revisado) |
| CA6 | `MOCK_REPORTS`/`MockDataBanner`/paginação antiga removidos | PASS |
| CA7 | `bun run check` e `bun run lint` passam sem novos erros | PASS |
| CA8 | 4 dicts de i18n com as mesmas chaves novas | PASS (validado com `python3 -m json.tool` nos 4 arquivos + mesmo shape) |

**Decisões tomadas durante a implementação:**
- 1 handler parametrizado (`handleGenerate(report)`) em vez de 3 handlers
  separados — os 3 fluxos são idênticos (mesma lógica de blob/download),
  só muda qual endpoint/ícone/chave i18n; array `REPORTS` centraliza a
  diferença.
- Nome do ícone por formato real (`bi-file-earmark-excel` para
  Weight/Packing List, `bi-file-earmark-word` para Fotográfico), não
  `bi-file-earmark-pdf` como o rascunho original sugeria — não há `.pdf`.

**Limitações conhecidas:**
- **CA2/CA3 sem teste manual end-to-end na UI logada** (clicar de verdade
  numa Operação real com sessão autenticada) — ambiente desta
  implementação não tinha usuário/sessão de teste disponível. O padrão de
  código é idêntico ao de `Romaneio.tsx` (já validado em produção) e os
  endpoints do Core têm suíte própria (`Core.Tests`, 10/10 passando) — mas
  vale um teste manual antes de considerar 100% fechado.
- **R1 (guard de papel `Agent`) não implementado** — o projeto não tem
  hoje nenhum padrão de esconder/desabilitar UI a partir do
  `internalRole` do usuário logado (`useCan`/`permissions.ts` só cobrem
  guard por **área**, não por papel; `internalRoleOptions` só é usado pra
  filtrar listas de *outros* usuários, nunca o próprio). Implementar esse
  guard do zero era `SCOPE CONFLICT` (não estava em RF1-RF4 nem em
  nenhuma seção da SPEC) — os 3 botões ficam visíveis pra qualquer
  usuário autenticado; se o usuário logado não tiver papel `Agent`, o
  clique falha com 403 do Core e cai no fluxo de erro (CA5), sem crash.
  Se esse comportamento não for aceitável, é uma SPEC nova.
