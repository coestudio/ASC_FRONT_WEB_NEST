# SPEC-39 — Log de Operação: auditoria real (fim do mock)

- **ID:** SPEC-39
- **Nome:** operation-log-audit
- **Status:** DRAFT
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/components/operations/tabs/Log.tsx`,
  `src/layouts/AppShell/nav/administrativo.ts`
- **Depende de (Core):** spec Core em andamento para auditoria/logs reais
  de operação (o quê, quando, quem — ex. import de romaneio, criação de
  NF, estufagem). Referenciar por tema ("spec Core de Logs/Auditoria de
  Operação") até o `core-spec-agent` publicar o número definitivo.
- **Contexto do pedido:** item do `TODO.md` sobre a aba Log deixar de ser
  mock, e sobre remover a entrada órfã "Log" do menu Administrativo, se
  existir.

---

## 1. Objetivo

Trocar a aba **Log** do shell de Operação, hoje 100% mock
(`MOCK_LOG`, array local), pela fonte real de auditoria que o Core vier a
expor — e remover a entrada de menu órfã "Log" do Administrativo
(confirmado que existe hoje, apontando para uma rota morta).

## 2. Contexto (achados da investigação)

### 2.1 Estado atual da aba Log

`Log.tsx` é 100% mock: array `MOCK_LOG` local, `MockDataBanner`,
paginação client-side sobre o array (`usePagination`). O comentário no
próprio arquivo (`Log.tsx:9-12`) já registra que `cargoUnitEventDTO` já
existe no Core e "poderia virar a fonte real desta aba — decisão
adiada, fora de escopo" na SPEC-07-09.

### 2.2 Entrada de menu órfã (confirmado, ainda existe)

`src/layouts/AppShell/nav/administrativo.ts:30-36` tem um item
`navigation.administrativoLog` apontando para `/administrativo/log`
(rota em português, antiga, `legacyOrphanRoute: true` — não existe em
`routeTree.gen.ts`, é renderizada como `<a href>` cru que resulta em
404). O comentário no arquivo confirma: "SPEC-06 (que os removeria) foi
cancelada, sem spec própria ainda pra essas duas telas". Esta SPEC
resolve a parte do "Log" dessa pendência (a parte de "Ocorrências" é a
SPEC-43).

## 3. Escopo

1. Quando o Core expuser o(s) endpoint(s) de auditoria de operação, trocar
   `Log.tsx` de mock para dado real (mesmo padrão de outras abas —
   `useSsrSafeQuery`/`getGetApiOperation...QueryOptions`, paginação real
   via `ListPagination`/SPEC-28).
2. Remover a entrada `navigation.administrativoLog` de
   `nav/administrativo.ts` — a aba Log só existe dentro da página de
   Operação (`legacyOrphanRoute` sai do array `items`).
3. Remover `MockDataBanner` da aba (não é mais mock).
4. Remover a chave i18n de menu correspondente
   (`navigation.administrativoLog`) dos 4 dicionários, se não for usada
   em nenhum outro lugar.

## 4. Fora do escopo

- Desenhar o contrato do endpoint de auditoria no Core — território do
  `core-spec-agent`.
- A entrada "Ocorrências" do menu (`navigation.administrativoOccurrences`)
  — coberta pela SPEC-43.
- Qualquer UI de registro manual de evento — auditoria é gerada
  automaticamente pelo Core, não editável pelo usuário (distinção já
  documentada no `TODO.md`: "diferente do Log automático" é o item de
  Ocorrências, SPEC-43).

## 5. `[NEEDS_DECISION]` — dependência de Core

O client gerado hoje não tem nenhum endpoint dedicado de "log de
operação" com o shape esperado (ação, usuário, timestamp, detalhe) —
existe `CargoUnitEventDTO` (mencionado no comentário do código), mas não
foi confirmado neste momento se ele cobre todos os tipos de evento
citados no `TODO.md` (import de romaneio, criação de NF, estufagem) ou só
eventos de `CargoUnit`. **Requisito do ponto de vista do consumidor**
(sem desenhar o contrato):

> Dado um `operationId`, o front precisa de uma lista paginada de eventos
> de auditoria (ação, quem fez, quando, detalhe legível) cobrindo pelo
> menos: criação da operação, mudança de status, import de romaneio,
> criação/edição de fardo, criação/cancelamento de nota fiscal,
> vinculação/estufagem/cancelamento de `CargoUnit`, vinculação de
> container.

Esta SPEC fica formalmente **bloqueada** até existir uma SPEC própria no
Core cobrindo esse endpoint, aprovada separadamente, e o `just map`
correspondente.

## 6. Requisitos funcionais (RF1-RF3 bloqueados por §5; RF4-RF6 já implementáveis)

- **RF1 (bloqueado)** — `Log.tsx` consome o endpoint real de auditoria da
  operação, paginado, sem mock.
- **RF2 (bloqueado)** — Cada entrada mostra ação, usuário, timestamp e
  detalhe — mesmo layout visual atual (cards), só trocando a fonte.
- **RF3 (bloqueado)** — Remoção de `MockDataBanner` da aba.
- **RF4** — Remover `navigation.administrativoLog` de
  `nav/administrativo.ts` (não depende do Core — a rota já é órfã hoje).
- **RF5** — Remover a chave i18n `navigation.administrativoLog` dos 4
  dicionários, se confirmado que não é usada em outro lugar.
- **RF6** — Confirmar (grep) se `navigation.administrativoLog` aparece em
  algum outro componente antes de remover — se aparecer, ajustar em vez
  de remover cegamente.

## 7. Camada de dados

Bloqueado por §5 para RF1-RF3. RF4-RF6 não têm camada de dados (mudança
de navegação/i18n).

## 8. Arquivos esperados

- `src/components/operations/tabs/Log.tsx`
- `src/layouts/AppShell/nav/administrativo.ts`
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/navigation.json`
- `src/api/generated/**` (via `just map`, quando a spec Core existir)

## 9. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Entrada "Log" não aparece mais no menu Administrativo |
| CA2 (bloqueado) | Aba Log da Operação mostra eventos reais, paginados, sem `MockDataBanner` |
| CA3 | `bun run check` + `bun run lint` sem regressão |

## 10. Riscos

- **R1** — RF4-RF6 (remoção do item de menu órfão) podem ser
  implementados independentemente do Core, adiantando parte do valor
  desta SPEC sem esperar a dependência — considerar dividir em duas
  entregas se o usuário aprovar parcialmente.
