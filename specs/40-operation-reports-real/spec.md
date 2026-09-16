# SPEC-40 — Relatórios reais de Operação (fim do mock)

- **ID:** SPEC-40
- **Nome:** operation-reports-real
- **Status:** DRAFT
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/components/operations/tabs/Reports.tsx`
- **Depende de (Core):** spec Core em andamento para geração de
  relatórios de operação (Weight Report, Packing List, Relatório
  Fotográfico). Referenciar por tema ("spec Core de Relatórios de
  Operação") até o `core-spec-agent` publicar o número definitivo.
- **Contexto do pedido:** item do `TODO.md` sobre a aba Reports (hoje
  mock, SPEC-07-07) virar geração real de 3 relatórios.

---

## 1. Objetivo

Trocar a aba **Reports** do shell de Operação, hoje 100% mock
(`MOCK_REPORTS`), por geração real de 3 relatórios: **Weight Report**,
**Packing List** e **Relatório Fotográfico** (baseado nos containers +
fotos dos containers), cada um emitido em **.pdf e .docx**, sempre em
**inglês fixo** (sem i18n).

## 2. Contexto

`Reports.tsx` hoje é 100% mock (`MOCK_REPORTS`, array local com
`type`/`generatedAt`/`format`/`status`), com `MockDataBanner` e
paginação client-side. Não existe, no client gerado hoje, nenhum
endpoint de geração de relatório de operação — confirmado que este é um
gap de contrato total (backend novo substancial), não um ajuste pequeno.

## 3. Escopo

Bloqueado até a spec Core correspondente existir e o client gerado
refletir os endpoints de geração. Quando isso acontecer:

1. Listagem de relatórios já gerados para a operação (histórico), se o
   Core mantiver histórico — a confirmar no contrato real.
2. Ação de gerar cada um dos 3 relatórios (Weight Report, Packing List,
   Relatório Fotográfico), cada um com 2 formatos de saída (.pdf/.docx) —
   6 combinações de geração possíveis, ou 3 gerações que produzem os 2
   formatos de uma vez (a confirmar com o contrato real do Core).
3. Download do arquivo gerado.
4. Todo o conteúdo do relatório em inglês fixo (não passa por
   `useT()`/dicionários de i18n) — só os rótulos de **UI** (botões,
   títulos de seção da tela) seguem o padrão i18n normal do projeto; o
   conteúdo do PDF/DOCX em si é gerado pelo Core, já em inglês, e não é
   processado pelo front.

## 4. Fora do escopo

- Desenhar o contrato dos 3 endpoints de geração no Core — território do
  `core-spec-agent`.
- Qualquer i18n do **conteúdo** dos relatórios — decisão de negócio já
  dada pelo usuário: inglês fixo, sem i18n de conteúdo.
- Edição manual de dados de relatório — são gerados a partir de dados já
  existentes (containers, fotos, romaneio), não editáveis diretamente
  nesta tela.

## 5. `[NEEDS_DECISION]` — dependência de Core

Requisito do ponto de vista do consumidor (sem desenhar o contrato):

> Dado um `operationId`, o front precisa de 3 ações de geração de
> relatório (Weight Report, Packing List, Relatório Fotográfico), cada
> uma produzindo um arquivo (.pdf e/ou .docx) para download, usando dados
> já existentes da operação (romaneio para peso/packing list; containers
> + suas fotos para o relatório fotográfico).

Perguntas em aberto para o Core (não decididas por este agente):

1. Cada relatório é gerado sob demanda (síncrono, resposta já é o
   arquivo) ou assíncrono (fila, front precisa fazer polling de status)?
   Isso muda bastante o desenho de UI (spinner simples vs.
   status "pendente"/"pronto" como já existe no mock atual,
   `status: "ready" | "pending"`).
2. O Core mantém histórico de relatórios já gerados (permitindo
   rebaixar/re-download sem gerar de novo), ou cada clique gera na hora,
   sem histórico?
3. Os dois formatos (.pdf/.docx) são gerados juntos numa única chamada ou
   são 2 ações separadas por relatório?

Esta SPEC fica formalmente **bloqueada** até existir SPEC própria no
Core respondendo essas perguntas, aprovada separadamente, e o `just map`
correspondente.

## 6. Requisitos funcionais (todos bloqueados por §5)

- **RF1** — Listagem/histórico de relatórios (se o Core mantiver
  histórico).
- **RF2** — Ação de gerar cada um dos 3 relatórios.
- **RF3** — Download do arquivo gerado, nos 2 formatos.
- **RF4** — Estado de carregamento durante a geração (síncrono ou
  assíncrono, conforme §5.1).
- **RF5** — Remoção de `MOCK_REPORTS`/`MockDataBanner`.

## 7. Camada de dados

Bloqueado por §5 — depende inteiramente do contrato que o Core expuser
(hooks gerados via `just map`).

## 8. UI

- Reaproveitar layout de tabela/lista já existente em `Reports.tsx`
  (colunas de tipo, data, formato, status), ajustando para os campos
  reais que o Core devolver.
- Botões de geração com ícone (`bi-file-earmark-pdf`/`bi-file-earmark-word`
  ou equivalente).

## 9. i18n

Só os rótulos de **UI** (título da aba, botões "Gerar Weight Report",
etc.) seguem i18n normal (`administrative-operations.reports.*`, 4
locales) — o **conteúdo** dos arquivos gerados é sempre inglês fixo,
gerado pelo Core, fora do escopo de i18n do front (decisão de negócio já
confirmada pelo usuário, não é `[NEEDS_DECISION]`).

## 10. Arquivos esperados

- `src/components/operations/tabs/Reports.tsx`
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json`
- `src/api/generated/**` (via `just map`, quando a spec Core existir)

## 11. Critérios de aceitação

Bloqueado até a decisão do §5 e a spec Core correspondente existirem —
critérios detalhados serão adicionados quando o contrato for conhecido.

## 12. Riscos

- **R1** — Esta é a maior dependência de Core entre as SPECs desta leva
  (3 tipos de relatório × 2 formatos, possível geração assíncrona) — não
  deve ser subestimada como "só consumir endpoint pronto".
