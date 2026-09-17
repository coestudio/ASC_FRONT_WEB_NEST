# SPEC-60 — Fallback de enriquecimento em `operations-list.tsx`

- **ID:** SPEC-60
- **Nome:** operations-list-enrichment-fallback
- **Status:** IMPLEMENTED
- **Autor:** portal-dev-agent (rascunho, 2026-09-16 — pente fino de UI/UX
  aprovado pelo usuário na sessão, 5 SPECs pequenas isoladas)
- **Área:** `src/components/operations/operations-list.tsx`
- **Depende de:** nenhuma.

---

## 1. Objetivo

Nunca mostrar o `Guid` cru (`clientId`/`productId`) para o usuário final na
listagem de Operações enquanto o enriquecimento (nome do cliente/produto)
ainda carrega ou se a busca falhar.

## 2. Contexto (achados)

- `useOperationEnrichment` (`operations-list.tsx:81-89`) busca o detalhe da
  operação via `useSsrSafeQuery(getGetApiOperationIdQueryOptions(id))` e
  retorna só `{ clientName, productName, vesselName, detail }` — sem expor
  `isLoading`/`isError` para quem consome o hook hoje.
- `OperationRow` (`operations-list.tsx:668-669`):
  `<td className="fw-semibold">{clientName ?? operation.clientId}</td>` e
  `<td className="text-body-secondary">{productName ?? operation.productId}</td>`
  — enquanto a query não resolveu (`clientName`/`productName` ainda
  `undefined`) ou se falhar, o `Guid` cru aparece na tela.
- `OperationCard` (`operations-list.tsx:703-706`) tem o mesmo padrão
  (`clientName ?? operation.clientId`, `productName ?? operation.productId`)
  no modo cartão do `ViewToggle`.
- Não há precedente de skeleton/placeholder de carregamento inline em
  célula de tabela no projeto — o padrão mais próximo é `LoadingState`
  (`variant="inline"`, mas pensado para substituir a tabela/lista inteira,
  não uma célula) e o próprio `Spinner` do react-bootstrap usado solto em
  vários botões (`Reports.tsx`, `crud-record-modal.tsx`).

## 3. Escopo

1. `useOperationEnrichment` passa a expor também `isLoading`/`isError` da
   query subjacente (`useSsrSafeQuery` já retorna esses campos — só
   precisam ser repassados no objeto de retorno do hook).
2. `OperationRow`/`OperationCard` trocam `clientName ?? operation.clientId`
   e `productName ?? operation.productId` por uma função de apresentação
   local (`renderEnriched` ou equivalente) que:
   - mostra um spinner discreto (`<Spinner animation="border" size="sm" />`,
     mesmo componente já usado em outros pontos do projeto) enquanto
     `isLoading`;
   - mostra `"—"` quando a busca resolveu sem erro mas sem nome (dado
     ausente) ou quando `isError` — nunca o `Guid`.
3. Sem placeholder novo criado em `components/ui` — reuso do `Spinner` do
   react-bootstrap já importado em outros arquivos do mesmo diretório.

## 4. Fora do escopo

- Qualquer mudança no endpoint `GET /operation/{id}` ou no formato de
  `OperationDetailDTO` — território do Core.
- Retry automático além do que `useSsrSafeQuery`/React Query já fazem por
  padrão (comportamento de retry do React Query não é alterado aqui).
- Criar um componente de skeleton genérico reutilizável — fora do escopo
  desta SPEC pontual (se necessário no futuro, é `[NEEDS_DECISION]`/nova
  SPEC).

## 5. Requisitos funcionais

- **RF1** — `useOperationEnrichment` retorna `isLoading`/`isError` além dos
  campos já existentes.
- **RF2** — Célula/coluna de cliente na tabela (`OperationRow`) nunca
  mostra `operation.clientId` — mostra spinner discreto durante
  `isLoading`, `"—"` se `isError` ou se `clientName` vier vazio após
  resolver.
- **RF3** — Mesma regra do RF2 para a coluna de produto
  (`operation.productId` → `productName`).
- **RF4** — Mesma regra do RF2/RF3 aplicada em `OperationCard` (modo
  cartão do `ViewToggle`), no título (cliente) e subtítulo (produto).

## 6. Não funcionais

- Sem regressão de performance perceptível — o enriquecimento já é uma
  query por linha hoje (SPEC anterior), esta SPEC só troca o fallback
  visual, não adiciona chamadas novas.
- Spinner discreto o bastante para não quebrar o alinhamento vertical da
  linha da tabela (`size="sm"`, sem alterar `padding`/`vertical-align` da
  célula).

## 7. Camada de dados

Não se aplica — reusa a mesma query já existente
(`getGetApiOperationIdQueryOptions`), só expõe campos adicionais do
retorno do `useSsrSafeQuery` que já existiam e não eram repassados.

## 8. UI

- `useOperationEnrichment` (mudança de tipo de retorno, mesmo arquivo).
- `OperationRow`/`OperationCard`: substituir o operador `??` por uma
  pequena função/render condicional local (`isLoading` → `Spinner`;
  `isError` ou vazio → `"—"`; senão → o nome).

## 9. i18n

Nenhuma chave nova — `"—"` já é o placeholder padrão usado em várias
outras partes do projeto (`Details.tsx`, `Documents.tsx`, etc.) sem chave
de tradução própria.

## 10. Arquivos esperados

- `src/components/operations/operations-list.tsx`

## 11. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Coluna de cliente nunca mostra `Guid` cru — spinner durante loading, `"—"` em erro/vazio |
| CA2 | Coluna de produto segue a mesma regra do CA1 |
| CA3 | Modo cartão (`OperationCard`) segue a mesma regra para título/subtítulo |
| CA4 | Nenhuma chamada de rede nova introduzida (reuso da query existente) |
| CA5 | `bun run check` + `bun run lint` sem regressão |

## 12. Riscos

- **R1** — Se a busca de enriquecimento falhar de forma persistente (ex.:
  operação referenciando um cliente já excluído no Core), a linha mostra
  `"—"` permanentemente sem indicar a causa — aceitável (nunca pior que
  mostrar um Guid cru), sem retry manual nesta SPEC.

## Implementation Notes

- **Arquivos alterados:** `src/components/operations/operations-list.tsx`.
- **RF1:** `useOperationEnrichment` agora repassa `isLoading`/`isError` do
  `useSsrSafeQuery` subjacente, além dos campos já existentes.
- **RF2/RF3/RF4:** novo componente local `EnrichedName` — spinner
  (`<Spinner animation="border" size="sm" />`) durante `isLoading`; `"—"`
  quando `isError` ou valor vazio; senão o nome resolvido. Usado nas 4
  ocorrências (`OperationRow`: coluna cliente e produto; `OperationCard`:
  título e subtítulo), substituindo `clientName ?? operation.clientId` /
  `productName ?? operation.productId`.
- **Comandos executados:**
  - `bun run check` (tsc --noEmit) — **VERIFIED**, sem erros.
  - `bun run lint` — **VERIFIED**, 66 problems (3 errors, 63 warnings),
    idêntico ao baseline — nenhuma regressão.
- **Critérios de aceitação:**

  | # | Critério | Status |
  | --- | --- | --- |
  | CA1 | Coluna de cliente nunca mostra Guid cru | PASS |
  | CA2 | Coluna de produto segue a mesma regra | PASS |
  | CA3 | Modo cartão segue a mesma regra | PASS |
  | CA4 | Nenhuma chamada de rede nova | PASS (mesma query, só expõe `isLoading`/`isError` já retornados pelo hook) |
  | CA5 | `bun run check` + `bun run lint` sem regressão | PASS |
- **Limitações conhecidas:** validação visual manual (spinner/traço em
  tela real, com throttling de rede) não foi feita nesta sessão (dev
  server não iniciado) — recomenda-se checagem visual antes do merge.
