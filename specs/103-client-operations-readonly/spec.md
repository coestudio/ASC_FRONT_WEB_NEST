# SPEC-103 — Operações na área do cliente (só leitura)

- **ID:** SPEC-103
- **Nome:** client-operations-readonly
- **Status:** IMPLEMENTED (2026-09-25) — fechada pelo usuário ("pode
  fechar essa pendência, pois só vai funcionar o e-mail em prod"). Front em
  `main`; Core SPEC-58 em `main` do Core (`6a06de0`). `just map` não é
  necessário (a SPEC-58 não mudou rotas nem DTOs). O teste como
  colaborador (§6) fica para **prod**, onde o e-mail com a senha do
  colaborador funciona — localmente o e-mail não sai.
- **Autor:** claude (2026-09-25)
- **Ticket:** ASCS-73 — "Adicionar tela de operação para o cliente"
- **Área:** `src/components/operations/operations-list.tsx`,
  `src/routes/_dashboard/client/operations/index.tsx`.
- **Depende de (Core):** SPEC-58 (`GET /operation` e `GET /operation/{id}`
  liberados pro externo, filtrados pelo cliente do token) — em
  andamento no backend; SPEC-59 para a verificação do §5. Ver
  `ASC/pending-core-specs-backend.md`.

---

## 1. Objetivo

O colaborador externo vê, em `/client/operations`, só as operações do
cliente dele, usando a **mesma rota** do administrativo
(`GET /api/operation`), sem nada que permita criar, editar ou excluir.

## 2. Estado antes desta SPEC

- `/client/operations` já existia: `<OperationsList readOnly />`.
- `readOnly` é o mesmo modo da área Operacional (SPEC-08).
- A barra de filtros tinha o filtro **Cliente** (`SelectAsync` com
  `getApiClient` → `GET /api/client`, `[RequireInternal]` → 403 pro
  externo) e a lista mandava `ClientId` do filtro.
- Core: `GET /operation` é `[RequireInternal]` → externo recebe 403 (Core
  SPEC-58 resolve).

## 3. Escopo

- **RF1 — Sem filtro de cliente.** `OperationsFilters` ganha
  `showClient`; na área do cliente o filtro some e a lista **nunca** manda
  `ClientId` (o Core filtra pelo token). ✅
- **RF2 — Prop nova `clientArea`.** Implica `readOnly` + RF1. O `readOnly`
  continua igual pra área Operacional; Administrativo > Operações
  (`<OperationsList />`) sem mudança. Rota do cliente passa a usar
  `<OperationsList clientArea />`. ✅
- **RF3 — Nenhuma ação de escrita.** Herdado do `readOnly`, conferido no
  código: botão "Novo" escondido; menu do botão direito só com
  "Visualizar" (`onEdit` indefinido); duplo-clique não faz nada
  (`editOperation`); clique abre o **modal** de visualização (não navega
  pro detalhe do administrativo, onde fica a troca de status); modal em
  modo `view` sem "Salvar" nem "Excluir". ✅
- **RF4 — Modal de visualização sem rotas proibidas.** Verificado, sem
  mudança de código: `SelectAsync` só chama `fetchOptions` quando o campo
  recebe foco (`open`), e no modo `view` os campos ficam num `fieldset
  disabled` (não recebem foco). Os nomes vêm do próprio
  `OperationDetailDTO` via `selectedLabel`
  (`operation-edit-fields.ts:73-89`). Logo o modal não chama
  `/api/client`, `/api/product` nem `/api/vessel`. ✅ (confirmar no teste
  do §6)
- **RF5 — Nomes por linha.** `useOperationEnrichment` usa
  `GET /api/operation/{id}` por linha; passa a funcionar pro externo
  quando o Core SPEC-58 liberar o detalhe. ⏳ depende do Core.

### Fora de escopo

- Abas do detalhe da operação para o cliente (Core SPEC-58 D2: só lista +
  detalhe nesta entrega).

## 4. Pendente após o Core SPEC-58

1. `just map` — a SPEC-58 não muda rotas/DTOs; esperado diff vazio (ou só
   descrições). Se mudar, tratar como parte desta SPEC.
2. RF5 e critérios do §6 com login de colaborador externo.

## 5. Verificação ASCS-68 (Core SPEC-59)

Só verificação, depois do Core SPEC-59: em Administrativo > Clientes,
excluir cliente com operação vinculada → toast com a mensagem do Core
(`ClientHasOperations`). O interceptor (`src/api/mutator.ts`) já usa a
mensagem do corpo da resposta quando existe (`extractBackendMessage`) —
esperado funcionar sem código. Se aparecer "Conflito de dados" ou 500,
corrigir no mutator e registrar aqui.

## 6. Critérios de aceite

- [x] Área do cliente sem filtro "Cliente"; lista não manda `ClientId`.
- [x] Sem botão "Novo", sem "Editar" no menu, duplo-clique inerte.
- [x] Área Operacional e Administrativo > Operações sem mudança de
      comportamento.
- [x] `bun run check` e `bun run lint` limpos.
Pendentes para validar em prod (não bloqueiam o fechamento):

- [ ] (Core SPEC-58) Login como colaborador externo → `/client/operations`
      lista só as operações do cliente dele.
- [ ] (Core SPEC-58) Nomes de cliente/produto aparecem nas linhas (RF5).
- [ ] (Core SPEC-58) Detalhe abre só leitura; **zero 403** na aba Network
      e **zero toasts de erro**.
- [ ] (Core SPEC-59) Verificação do §5.
