# SPEC-41 — Nota Fiscal: sub-abas de Comparação NF/Lote

- **ID:** SPEC-41
- **Nome:** invoice-comparison-subtabs
- **Status:** DRAFT (revisado 2026-09-16) — **§4 já resolvido pelo
  Core.** `specs/30-invoice-lote-comparison` já é `IMPLEMENTED`
  (2026-09-16): dois endpoints reais, contrato completo abaixo. Ainda
  não apareceu em `src/api/generated/**` porque `just map` não rodou.
- **Autor:** portal-dev-agent (rascunho); revisão de status 2026-09-16
  (cruzamento com Core `specs/30-invoice-lote-comparison`)
- **Área:** `src/components/operations/tabs/Invoice.tsx`
- **Depende de (Core):** ~~spec Core em andamento~~ — **resolvido**:
  `specs/30-invoice-lote-comparison` (`IMPLEMENTED`). Falta só `just map`.
- **Contexto do pedido:** item do `TODO.md` pedindo que a aba Nota Fiscal
  ganhe sub-abas de comparação, mantendo a listagem atual como a
  primeira sub-aba.

---

## 1. Objetivo

Reestruturar a aba **Nota Fiscal** em 3 sub-abas:

1. **Listagem** — a tela atual de `Invoice.tsx` (CRUD de notas fiscais),
   sem mudança de comportamento.
2. **Comparação NF** — quadro geral comparando quantidade de
   fardos/peso líquido/peso bruto declarado da NF vs. o que já foi
   estufado.
3. **Comparação Lotes** — mesma ideia, mas orientada por lote em vez de
   NF.

## 2. Contexto

`Invoice.tsx` hoje é uma aba única, CRUD de `InvoiceDTO` (criar, ver,
confirmar, cancelar nota fiscal — usando `PostApiOperationOperationIdInvoice`
e afins, já implementado, SPEC-07-10). O pedido do usuário não altera
esse comportamento — só o encapsula como a primeira de 3 sub-abas dentro
da mesma aba "Nota Fiscal" do shell de Operação.

As sub-abas 2 e 3 (Comparação NF/Comparação Lotes) precisam de um dado
que hoje não existe agregado em lugar nenhum do client gerado: cruzar
quantidade/peso **declarado** na NF (ou no lote) contra quantidade/peso
**já estufado** (via `CargoUnit`, que tem `grossWeight` e vínculo a
container, mas não tem, hoje, um agregado pronto por NF/lote).

## 3. Escopo

1. Reestruturar `Invoice.tsx` para ter 3 sub-abas internas (usando
   `Nav`/`Tab` do React-Bootstrap, mesmo padrão de `ProfileModal` — ver
   SPEC-30), movendo o conteúdo atual para a sub-aba "Listagem".
2. Sub-aba "Comparação NF" — bloqueada até o Core expor a rota dedicada
   (§4).
3. Sub-aba "Comparação Lotes" — idem, bloqueada até o Core expor a rota
   dedicada.

## 4. ~~`[NEEDS_DECISION]`~~ — RESOLVIDO pelo Core (2026-09-16)

**Era:** não existia nenhum endpoint de agregação NF↔estufado ou
lote↔estufado.

**Resposta (Core `specs/30-invoice-lote-comparison`, `IMPLEMENTED`):**

- `GET operation/{operationId}/invoice/comparison` → `InvoiceComparisonDTO[]`:
  `InvoiceId`, `Number`, `DeclaredItemsCount`, `DeclaredGrossWeight`,
  `DeclaredNetWeight`, `StuffedItemsCount`, `StuffedGrossWeight`,
  `StuffedNetWeight` — um item por Invoice da operação, mesmo sem nada
  estufado ainda (`Stuffed* = 0`, não some da lista).
- `GET operation/{operationId}/romaneio/comparison-by-lote` →
  `RomaneioLoteComparisonDTO[]`: mesmo shape, mas `Lote` (`string?`) no
  lugar de `InvoiceId`/`Number`. **`Lote: null`** é um item especial —
  representa `CargoUnit`s estufadas sem lote resolvível (dado histórico
  anterior à Core `specs/25-cargo-stuffing-lote-scope`), só aparece na
  lista se existir pelo menos uma unidade nessa situação. A UI precisa
  tratar esse item com um rótulo tipo "Sem lote" em vez de tentar
  exibir `null` cru.
- Sem `MessageCode`/erro específico — são endpoints de leitura pura,
  sempre 200 (lista vazia se a operação não tiver Invoice/Romaneio).

Esta SPEC não está mais bloqueada por decisão de contrato — falta só
`just map`.

## 5. Requisitos funcionais

- **RF1** — `Invoice.tsx` ganha uma navegação de sub-abas (`Nav
  variant="tabs"` ou `pills`, dentro da aba "Nota Fiscal" do shell de
  Operação — 2 níveis de abas, confirmar que isso não conflita
  visualmente com a navegação principal de abas do shell).
- **RF2** — Sub-aba "Listagem" = comportamento atual de `Invoice.tsx`,
  sem regressão nenhuma (CRUD, confirmar, cancelar).
- **RF3** — Sub-aba "Comparação NF": tabela por nota fiscal
  (`GET .../invoice/comparison`) com as 3 métricas declaradas vs.
  estufadas, com indicação visual de divergência (ex. badge vermelho se
  estufado ≠ declarado).
- **RF4** — Sub-aba "Comparação Lotes": mesma ideia
  (`GET .../romaneio/comparison-by-lote`), agrupado por lote — linha
  `Lote: null` exibida com rótulo "Sem lote" (ver §4).

## 6. Fora do escopo

- Qualquer ação corretiva a partir da tela de comparação (ex. "ajustar
  NF" a partir da divergência) — as sub-abas de comparação são só
  visualização, não edição.
- Mudar o CRUD de nota fiscal em si.

## 7. Camada de dados

- RF2: sem mudança (reaproveita o que `Invoice.tsx` já usa hoje).
- RF3: `getGetApiOperationOperationIdInvoiceComparisonQueryOptions`
  (nome exato a confirmar após `just map`).
- RF4: `getGetApiOperationOperationIdRomaneioComparisonByLoteQueryOptions`
  (idem).

## 8. UI

- Sub-navegação dentro da aba, usando `Nav`/`Tab.Container` do
  React-Bootstrap (regra 8, sem Tailwind).
- Tabelas de comparação com badges de divergência (`bg-danger`/`bg-success`),
  mesmo padrão visual de outras tabelas do projeto.

## 9. i18n

Namespace `administrative-operations.invoice` (4 locales):

- `subtabs.listing` / `subtabs.comparisonInvoice` / `subtabs.comparisonLot`
- Chaves de coluna/rótulo das tabelas de comparação (a definir quando o
  contrato do Core for conhecido).

## 10. Arquivos esperados

- `src/components/operations/tabs/Invoice.tsx`
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json`
- `src/api/generated/**` (via `just map`, quando a spec Core existir)

## 11. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA0 | `just map` executado, `invoice/comparison` e `romaneio/comparison-by-lote` presentes no client gerado |
| CA1 | Aba Nota Fiscal tem 3 sub-abas visíveis, "Listagem" selecionada por padrão |
| CA2 | Sub-aba Listagem tem paridade total com o comportamento atual (CRUD de NF) |
| CA3 | Sub-aba Comparação NF mostra as 3 métricas declaradas vs. estufadas por NF |
| CA4 | Sub-aba Comparação Lotes mostra as 3 métricas por lote, incluindo a linha "Sem lote" quando existir |
| CA5 | `bun run check` + `bun run lint` sem regressão |

## 12. Riscos

- ~~Reestruturar `Invoice.tsx` antes do Core estar pronto~~ — não se
  aplica mais, contrato já existe. Ainda vale considerar dividir em duas
  entregas (RF1/RF2 primeiro, RF3/RF4 depois) por tamanho de PR, não por
  dependência.
