# SPEC-41 — Nota Fiscal: sub-abas de Comparação NF/Lote

- **ID:** SPEC-41
- **Nome:** invoice-comparison-subtabs
- **Status:** DRAFT
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/components/operations/tabs/Invoice.tsx`
- **Depende de (Core):** spec Core em andamento para rota(s) dedicada(s)
  de comparação NF/Lote (quantidade de fardos, peso líquido, peso bruto
  declarado vs. estufado). Referenciar por tema ("spec Core de Comparação
  NF/Lote") até o `core-spec-agent` publicar o número definitivo.
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

## 4. `[NEEDS_DECISION]` — dependência de Core

O próprio `TODO.md` já registra que a Comparação NF "precisa de rota
dedicada no Core" — confirmado por esta investigação: não existe, no
client gerado, nenhum endpoint de agregação NF↔estufado ou lote↔estufado.
Requisito do ponto de vista do consumidor (sem desenhar o contrato):

> Dado um `operationId` (e, para a segunda comparação, um agrupamento por
> lote), o front precisa de um endpoint que devolva, por NF (ou por
> lote): quantidade de fardos declarada, peso líquido declarado, peso
> bruto declarado, e os mesmos 3 valores já efetivamente estufados
> (agregados a partir de `CargoUnit`).

Esta SPEC fica formalmente **bloqueada** (sub-abas 2 e 3) até existir
SPEC própria no Core respondendo isso, aprovada separadamente, e o
`just map` correspondente. A sub-aba 1 (Listagem = comportamento atual)
não depende de nada novo do Core e pode ser reestruturada desde já.

## 5. Requisitos funcionais

- **RF1** — `Invoice.tsx` ganha uma navegação de sub-abas (`Nav
  variant="tabs"` ou `pills`, dentro da aba "Nota Fiscal" do shell de
  Operação — 2 níveis de abas, confirmar que isso não conflita
  visualmente com a navegação principal de abas do shell).
- **RF2** — Sub-aba "Listagem" = comportamento atual de `Invoice.tsx`,
  sem regressão nenhuma (CRUD, confirmar, cancelar).
- **RF3 (bloqueado por §4)** — Sub-aba "Comparação NF": tabela por nota
  fiscal com as 3 métricas declaradas vs. estufadas, com indicação visual
  de divergência (ex. badge vermelho se estufado ≠ declarado).
- **RF4 (bloqueado por §4)** — Sub-aba "Comparação Lotes": mesma ideia,
  agrupado por lote.

## 6. Fora do escopo

- Qualquer ação corretiva a partir da tela de comparação (ex. "ajustar
  NF" a partir da divergência) — as sub-abas de comparação são só
  visualização, não edição.
- Mudar o CRUD de nota fiscal em si.

## 7. Camada de dados

- RF2: sem mudança (reaproveita o que `Invoice.tsx` já usa hoje).
- RF3/RF4: bloqueado por §4 — depende do(s) endpoint(s) que o Core
  expuser.

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
| CA1 | Aba Nota Fiscal tem 3 sub-abas visíveis, "Listagem" selecionada por padrão |
| CA2 | Sub-aba Listagem tem paridade total com o comportamento atual (CRUD de NF) |
| CA3 (bloqueado) | Sub-aba Comparação NF mostra as 3 métricas declaradas vs. estufadas por NF |
| CA4 (bloqueado) | Sub-aba Comparação Lotes mostra as 3 métricas por lote |
| CA5 | `bun run check` + `bun run lint` sem regressão |

## 12. Riscos

- **R1** — Reestruturar `Invoice.tsx` em sub-abas antes do Core estar
  pronto pode ser feito em duas entregas (RF1/RF2 primeiro, RF3/RF4
  depois) — considerar dividir a implementação se o usuário aprovar
  parcialmente.
