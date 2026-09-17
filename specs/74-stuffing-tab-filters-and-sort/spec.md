# SPEC-74 — Estufagem: filtro de NF/Lote + ordenação clicável

- **ID:** SPEC-74
- **Nome:** stuffing-tab-filters-and-sort
- **Status:** IMPLEMENTED (2026-09-17)
- **Autor:** claude (pedido do usuário, 2026-09-17)
- **Área:** `src/components/operations/tabs/Operational.tsx`
  (`StuffingTab`).

---

## 1. Objetivo

Pedido do usuário na sub-aba Estufagem (SPEC-73): filtro dedicado de
Nota Fiscal e Lote, mais ordenação clicável nas colunas Fardo, Código,
Nota Fiscal, Lote e Peso (asc/desc).

## 2. Contexto

- Ordenação: `CrudListPage`/`CrudColumn.sortKey` (SPEC-53) já suporta
  cabeçalho clicável (asc → desc → sem ordenação) — `Romaneio.tsx` já
  usa exatamente esse mecanismo pra `notaFiscal`/`lote`. O Core já
  expõe as 5 chaves de sort pedidas
  (`RomaneioViewModel.Query.Sortable`: `itemIdentifier`, `itemCode`,
  `peso`, `notaFiscal`, `lote`) — só falta declarar `sortKey` nas
  colunas do `StuffingTab` e ligar `sort`/`onSortChange`.
- Filtro de NF/Lote: precisa dos 2 parâmetros novos do Core
  (`specs/47-romaneio-notafiscal-lote-filters`) — o `Search` genérico
  atual não permite combinar NF e Lote ao mesmo tempo.

## 3. Escopo

### 3.1 Ordenação (sem dependência do Core)

- Novo estado `sort: string | undefined` em `StuffingTab`, passado como
  `Sort` no `listQueryOptions` e como prop `sort`/`onSortChange` do
  `CrudListPage`.
- As 5 colunas (`itemIdentifier`, `itemCode`, `notaFiscal`, `lote`,
  `peso`) ganham `sortKey` igual ao nome da chave (mesmo valor usado em
  `Romaneio.tsx`).

### 3.2 Filtro de NF/Lote (bloqueado pela SPEC-47 do Core)

- Dois campos de texto novos (`notaFiscalFilter`/`loteFilter`,
  `InputText` isolado, mesmo padrão de `ContainerSearchInput`), no slot
  `filters` do `CrudListPage` (mesmo lugar do seletor "Estufado" em
  `Romaneio.tsx`).
- Passam como `NotaFiscal`/`Lote` no `listQueryOptions` — só depois
  de `just map` trazer os 2 parâmetros novos do Core.
- Mudar qualquer um dos dois volta a `page = 1` (mesmo padrão do
  `search`/`isStuffedFilter` já existentes).

## 4. Fora do escopo

- Mudar `Romaneio.tsx` (a tela original) — filtros novos só na
  Estufagem, por pedido explícito do usuário.
- Filtro exato (a SPEC-47 do Core já decide: parcial/`Contains`).

## 5. Critérios de aceitação

- CA1: clicar no cabeçalho de qualquer uma das 5 colunas ordena
  asc → desc → volta ao padrão.
- CA2 (após SPEC-47 do Core): preencher NF e Lote ao mesmo tempo
  restringe a listagem pelos dois critérios juntos.
- CA3: `tsc --noEmit` e lint sem erro novo.

## 6. Dependência

§3.2 dependia de `warren/Core/specs/47-romaneio-notafiscal-lote-filters`
(`IMPLEMENTED`) — `just map` já rodado contra o Core local com a
SPEC-47 no ar.

## 7. Implementation Notes (2026-09-17)

- `StuffingTab` ganhou `sort`/`onSortChange` (mesmo padrão de
  `Romaneio.tsx`) e `sortKey` nas 5 colunas — sem componente novo, só
  ligação no `CrudListPage` já existente.
- Novo componente `StuffingFilterInput` (genérico, reusado 2x — NF e
  Lote), mesmo padrão de campo isolado de `ContainerSearchInput`, no
  slot `filters` do `CrudListPage` (mesmo lugar do seletor "Estufado"
  em `Romaneio.tsx`). `notaFiscalFilter`/`loteFilter` viram
  `NotaFiscal`/`Lote` no `listQueryOptions`; qualquer mudança reseta
  `page` pra 1.
- Validado contra o Core local (mesmo endpoint testado na SPEC-47,
  contrato já confirmado com dados reais): `tsc --noEmit`/`lint` sem
  erro novo.
