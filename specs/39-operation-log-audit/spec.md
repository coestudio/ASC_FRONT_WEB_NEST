# SPEC-39 — Log de Operação: auditoria real (fim do mock)

- **ID:** SPEC-39
- **Nome:** operation-log-audit
- **Status:** DRAFT (revisado 2026-09-16) — **§5 já resolvido pelo Core.**
  `specs/28-operation-audit-log` já é `IMPLEMENTED` (2026-09-16):
  `GET /operation/{id}/log`, paginado, filtros opcionais `entityType`/
  `entityId` na query string, retorna `PagedDTO<OperationEventDTO>`
  (`OperationId`/`EntityType`/`EntityId`/`Action`/`Note`/`CreatedOn`/
  `CreatedBy`). Cobre todos os pontos pedidos (romaneio, NF, estufagem,
  container, document). Ainda não apareceu em `src/api/generated/**`
  porque `just map` não rodou depois da implementação do Core.
- **Autor:** portal-dev-agent (rascunho); revisão de status 2026-09-16
  (cruzamento com Core `specs/28-operation-audit-log`)
- **Área:** `src/components/operations/tabs/Log.tsx`,
  `src/layouts/AppShell/nav/administrativo.ts`
- **Depende de (Core):** ~~spec Core em andamento~~ — **resolvido**:
  `specs/28-operation-audit-log` (`IMPLEMENTED`). Falta só `just map`.
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

## 5. ~~`[NEEDS_DECISION]`~~ — RESOLVIDO pelo Core (2026-09-16)

**Era:** não havia endpoint dedicado de "log de operação", só
`CargoUnitEventDTO` (cobria só eventos de `CargoUnit`).

**Resposta (Core `specs/28-operation-audit-log`, `IMPLEMENTED`):**
`CargoUnitEventModel` foi absorvido por `OperationEventModel` — log
único por Operação, não mais por sub-entidade. Contrato real:

- `GET /operation/{operationId}/log` — paginado (`offset`/`limit`/`sort`
  padrão do projeto), filtros opcionais `entityType`/`entityId` na
  query string.
- Retorna `PagedDTO<OperationEventDTO>`: `OperationId`, `EntityType`
  (`Romaneio`/`Invoice`/`CargoUnit`/`Container`/`Document`), `EntityId`,
  `Action` (12 valores — `OperationEventAction`, ex.
  `RomaneioImported`/`InvoiceCreated`/`InvoiceConfirmed`/
  `CargoUnitStuffed`/`CargoUnitCanceled`/`ContainerLinked`/
  `ContainerStatusChanged`/`ContainerSealAdded`/`DocumentCreated`, ver
  lista completa no Core), `Note` (texto legível), `CreatedOn`,
  `CreatedBy` (**só `Guid`, sem nome do usuário** — resolver nome fica
  por conta deste consumidor, ver risco abaixo).
- Cobre exatamente os pontos pedidos no §5 original: criação/import de
  romaneio, criação/edição/confirmação/cancelamento de NF, estufagem/
  cancelamento de `CargoUnit`, vínculo de container + mudança de status +
  lacre, criação de documento.
- **Sem `Aux`/lookup route** pra `EntityType`/`Action` (mesmo precedente
  do `CargoUnitEventAction` antigo — nunca teve rota de lookup) — os
  valores do enum vêm crus no DTO, front precisa mapear label
  manualmente (ou pedir `Aux` numa spec futura se a UI precisar de label
  amigável em vez do nome do enum).

Esta SPEC não está mais bloqueada por decisão de contrato — falta só
`just map` pra expor o endpoint `/log` no client gerado (nenhuma
referência a `operation/{id}/log` existe hoje em
`src/api/generated/**`, confirmar ao implementar).

## 6. Requisitos funcionais (RF1-RF3 bloqueados só por `just map`, ver §5; RF4-RF6 já implementáveis)

- **RF1** — `Log.tsx` consome `GET /operation/{id}/log` (paginado), sem
  mock.
- **RF2** — Cada entrada mostra `Action`/`EntityType` (mapeado pra label
  legível, sem `Aux` do Core — ver §5), `CreatedOn`, `Note`, e
  `CreatedBy` (só `Guid` — decidir na implementação se resolve nome via
  outro endpoint de usuário já existente, ou mostra só o id/iniciais;
  não é `[NEEDS_DECISION]` bloqueante, é detalhe de UI) — mesmo layout
  visual atual (cards), só trocando a fonte.
- **RF3** — Remoção de `MockDataBanner` da aba.
- **RF4** — Remover `navigation.administrativoLog` de
  `nav/administrativo.ts` (não depende do Core — a rota já é órfã hoje).
- **RF5** — Remover a chave i18n `navigation.administrativoLog` dos 4
  dicionários, se confirmado que não é usada em outro lugar.
- **RF6** — Confirmar (grep) se `navigation.administrativoLog` aparece em
  algum outro componente antes de remover — se aparecer, ajustar em vez
  de remover cegamente.

## 7. Camada de dados

RF1-RF3: `getGetApiOperationOperationIdLogQueryOptions` (nome exato a
confirmar no client gerado após `just map`). RF4-RF6 não têm camada de
dados (mudança de navegação/i18n).

## 8. Arquivos esperados

- `src/components/operations/tabs/Log.tsx`
- `src/layouts/AppShell/nav/administrativo.ts`
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/navigation.json`
- `src/api/generated/**` (via `just map`, quando a spec Core existir)

## 9. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA0 | `just map` executado, `operation/{id}/log` presente no client gerado |
| CA1 | Entrada "Log" não aparece mais no menu Administrativo |
| CA2 | Aba Log da Operação mostra eventos reais (`OperationEventDTO`), paginados, sem `MockDataBanner` |
| CA3 | `bun run check` + `bun run lint` sem regressão |

## 10. Riscos

- **R1** — RF4-RF6 (remoção do item de menu órfão) podem ser
  implementados independentemente do Core, adiantando parte do valor
  desta SPEC sem esperar `just map` — considerar dividir em duas
  entregas se o usuário aprovar parcialmente.
- **R2 (novo, 2026-09-16)** — `CreatedBy` só traz `Guid`, sem nome do
  usuário — se a UI quiser mostrar nome legível, precisa cruzar com outro
  endpoint (`/user/{id}` ou equivalente) ou aceitar mostrar só o id;
  decisão de UI a fechar na implementação, não bloqueia o resto da SPEC.
