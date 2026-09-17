# SPEC-60 — Nova aba "Operacional" (Estufagem/Desestufagem) na Operação

- **ID:** SPEC-60
- **Nome:** operation-operational-tab
- **Status:** DRAFT — decisões de §6 fechadas com o usuário (2026-09-16).
  Falta só `APROVAR SPEC-60` para implementar.
- **Autor:** claude (pedido do usuário, 2026-09-16)
- **Área:** `src/routes/_dashboard/_internal/administrative/operations/$id/index.tsx`
  (lista de abas do shell), `src/components/operations/tabs/Containers.tsx`
  (remove estufagem/desestufagem), novo
  `src/components/operations/tabs/Operational.tsx`,
  `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json`.

---

## 1. Objetivo

Criar uma 10ª aba de nível superior no shell de Operação, **"Operacional"**,
com duas sub-abas — **Estufagem** e **Desestufagem** — reaproveitando a UI e
lógica de estufagem/desestufagem que hoje vivem dentro da aba **Containers**,
removendo-as de lá. Confirmado com o usuário: mesma UI existente (mesmos
modais/endpoints), só muda **onde** fica acessível.

## 2. Contexto (estado atual)

O shell de Operação (`index.tsx`) hoje tem 9 abas (`details`, `romaneio`,
`containers`, `documents`, `invoice`, `reports`, `responsible`, `log`,
`occurrences`) definidas em `TABS`/`type Tab`.

Dentro de `Containers.tsx` (`src/components/operations/tabs/Containers.tsx`),
por linha de container, hoje existem 4 botões de ação sobre carga:

- Estufagem identificada (`stuffIdentifiedFor` → `StuffIdentifiedModal`,
  ícone `bi-box-seam`).
- Estufagem por quantidade (`stuffQuantityFor` → `StuffQuantityModal`,
  ícone `bi-stack`).
- Estufagem em lote/checkbox (`stuffBatchFor` → `StuffBatchModal`, ícone
  `bi-collection`, SPEC-42).
- Ver fardos estufados daquele container (`cargoUnitsFor` →
  `CargoUnitsModal`, ícone `bi-list-ul`) — de onde também se cancela
  (desestufa) um fardo individual.

Além disso, um botão/toggle no topo da tela (`showAllStuffed`,
SPEC-36) mostra/esconde `AllStuffedCargoSection`: listagem de **todos** os
fardos estufados da operação (não só de um container), com ação de
desestufar direto dali.

Nenhuma dessas ações muda o vínculo container↔operação — só criam/cancelam
`CargoUnit`s (`invalidateCargo`, separado de `invalidateList`). Isso já
confirma que dá para extrair tudo isso de `Containers.tsx` sem tocar no
CRUD de vínculo de container (vincular/editar/desvincular/fotos/lacre, que
ficam).

Já existe precedente de sub-abas dentro de uma aba (`Invoice.tsx`, SPEC-41,
`Nav`/`Tab` do react-bootstrap) — mesmo padrão a reaproveitar aqui.

## 3. Escopo

1. **Novo componente** `src/components/operations/tabs/Operational.tsx`,
   recebendo `operationId`, com sub-navegação (mesmo padrão de
   `Invoice.tsx`) entre duas sub-abas:
   - **Estufagem** — listagem de containers da operação (mesma busca/
     paginação já usada em `Containers.tsx`, via
     `getGetApiOperationOperationIdContainerQueryOptions`) com os 3 botões
     de ação por linha (`StuffIdentifiedModal`, `StuffQuantityModal`,
     `StuffBatchModal`) movidos para cá.
   - **Desestufagem** — `AllStuffedCargoSection` movido para cá, sem mais
     precisar de toggle (a sub-aba já é o próprio ponto de entrada).
2. **`Containers.tsx` perde**: os 3 botões de estufagem por linha, o botão
   "ver fardos estufados" por container (`cargoUnitsFor` →
   `CargoUnitsModal`) — confirmado: a sub-aba Desestufagem já cobre essa
   consulta indiretamente (lista geral de fardos estufados da operação) —
   o botão/toggle "ver todos os fardos estufados" e
   `AllStuffedCargoSection`. Mantém: vincular/editar/desvincular
   container, busca, paginação, coluna de fotos, checklist de fotos,
   lacre/deslacre (`ContainerSeal`).
3. **Shell (`index.tsx`)**: novo item `"operational"` em `type Tab` e em
   `TABS`, renderizando `<Operational operationId={id} />`.
4. **i18n**: nova chave `administrative-operations.shell.tabs.operational`
   e namespace novo (`administrative-operations.operational.*`) para
   labels das sub-abas e textos movidos — reaproveitar as strings já
   existentes em `administrative-operations.containers.stuffing.*` e
   `.destuffing.*` (mover ou duplicar as chaves, a definir na
   implementação) nos 4 dicionários (`pt-BR`, `en`, `es`, `zh`).

## 4. Fora do escopo

- Qualquer mudança de contrato/endpoint do Core — os 4 endpoints de
  estufagem/cancelamento já existem e não mudam.
- Qualquer mudança de regra de negócio (quem pode estufar, motivo
  obrigatório de cancelamento, etc.).
- Qualquer filtro "ver fardos estufados deste container específico" na
  sub-aba Desestufagem — a listagem geral (todos os fardos estufados da
  operação) já é considerada suficiente para substituir o botão por
  container removido de `Containers.tsx` (decisão fechada, D2).

## 5. Requisitos funcionais

- RF1: usuário abre a operação, clica na aba "Operacional", vê as duas
  sub-abas ("Estufagem"/"Desestufagem") com o conteúdo hoje só acessível
  via `Containers`.
- RF2: estufar um container (qualquer um dos 3 modos) a partir da sub-aba
  Estufagem tem o mesmo comportamento de hoje (mesma mutation, mesmo
  `invalidateCargo`).
- RF3: desestufar um fardo a partir da sub-aba Desestufagem tem o mesmo
  comportamento de hoje (mesmo endpoint de cancelamento, mesmo motivo
  obrigatório).
- RF4: a aba Containers não mostra mais nenhum botão/seção relacionado a
  carga estufada — só dados do próprio container.

## 6. Decisões — fechadas com o usuário (2026-09-16)

- **D1 — posição da aba "Operacional":** logo após "Containers", conforme
  sugerido.
- **D2 — botão "ver fardos estufados" por container**
  (`cargoUnitsFor`/`CargoUnitsModal`): **sai** de `Containers.tsx`, sem
  substituto direto por container — a listagem geral da sub-aba
  Desestufagem já cobre a consulta indiretamente.
- **D3 — nomenclatura i18n:** rótulos das sub-abas são literalmente
  "Estufagem" e "Desestufagem".

## 7. Critérios de aceitação

- CA1: aba "Operacional" aparece no shell, com as duas sub-abas.
- CA2: os 3 fluxos de estufagem funcionam a partir da nova sub-aba,
  idênticos ao comportamento atual.
- CA3: o fluxo de desestufagem (listagem completa + cancelar) funciona a
  partir da nova sub-aba, idêntico ao comportamento atual.
- CA4: aba Containers não tem mais nenhum botão/seção de estufagem/
  desestufagem (exceto o que D2 decidir manter).
- CA5: `tsc --noEmit` e lint passam sem novo erro.

## 8. Riscos

- Reaproveitar `AllStuffedCargoSection`/modais como estão (só realocando
  arquivo) minimiza risco de regressão — é refactor de localização, não de
  lógica.
- Se D2 decidir mover o "ver fardos estufados" por container também,
  precisa decidir como a sub-aba Desestufagem filtra por container
  específico (parâmetro de rota/estado local) — detalhar na implementação
  se for essa a decisão.
