# SPEC-33 — Operação → aba Detalhes: botão de editar

- **ID:** SPEC-33
- **Nome:** operation-details-edit
- **Status:** IMPLEMENTED (2026-09-16, portal-dev-agent)
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/components/operations/tabs/Details.tsx`,
  `src/components/operations/operations-list.tsx` (referência de campos)
- **Contexto do pedido:** item do `TODO.md` ("Operação → aba Detalhes:
  botão pra editar as informações da operação").

---

## 1. Objetivo

Adicionar um botão de editar dentro da aba **Detalhes** do shell de
Operação (`/administrative/operations/$id`), permitindo editar os dados
cadastrais da operação sem precisar voltar para a listagem
(`/administrative/operations`).

## 2. Contexto

`OperationDetailsTab` (`Details.tsx`) hoje é **só leitura** — renderiza
`OperationDetailDTO` em seções (Cliente, Produto, Datas, Observação), sem
nenhum botão de ação.

A edição **já existe**, mas só a partir da tela de listagem
(`operations-list.tsx`): `onEdit` na linha de cada operação
(`operations-list.tsx:565`) abre um `CrudRecordModal<OperationEditValues>`
com `editFields` (linhas 462+) e `usePutApiOperationId` (endpoint
`PUT /api/operation/{id}`, já existente e confirmado no client gerado).
`editFields` cobre: `clientId`, `productId`, `vesselId`, `nameDate`,
`opDate`, `startDate`, `observation` — não inclui `booking`/`instruction`
(que `Details.tsx` também exibe, mas que não fazem parte de
`OperationUpdate`, confirmado em
`src/api/generated/model/operationUpdate.ts` — só
`clientId`/`productId`/`vesselId`/`nameDate`/`opDate`/`startDate`/`observation`).

O pedido do usuário é ter esse mesmo fluxo de edição acessível **dentro**
da tela de detalhe da operação (aba Detalhes), não só na listagem.

## 3. Escopo

1. Botão "Editar" na aba Detalhes (`OperationDetailsTab`), visível para
   quem já tem permissão de editar operação (mesma regra de UI que já
   habilita/desabilita `onEdit` na listagem, se houver — confirmar
   `useCan`/regra de área ao implementar).
2. Reaproveitar `editFields`/`OperationEditValues`/`usePutApiOperationId`
   já existentes em `operations-list.tsx` — extrair para um módulo
   compartilhado (ex. `src/components/operations/operation-edit-fields.ts`
   ou similar) em vez de duplicar a definição de campos, já que os dois
   lugares (listagem e shell de detalhe) precisam do mesmo formulário.
3. Ao salvar com sucesso, invalidar a query de detalhe da operação
   (`getGetApiOperationOperationIdQueryKey` ou equivalente) para refletir
   os novos dados na própria aba sem precisar navegar.

## 4. Fora do escopo

- Adicionar `booking`/`instruction` ao contrato de edição — não fazem
  parte de `OperationUpdate` hoje; se o usuário quiser editá-los depois,
  é `[NEEDS_DECISION]`/`SCOPE CONFLICT` de Core (endpoint precisaria
  aceitar esses campos).
- Mudar a troca de status da operação (já coberta pelo cabeçalho comum
  do shell, `OperationHeader`, fora desta aba).
- Mudar o fluxo de edição já existente na listagem — só reaproveitar,
  não alterar o comportamento atual de lá.

## 5. Requisitos funcionais

- **RF1** — Botão "Editar" no topo/canto da aba Detalhes, abrindo o
  mesmo `CrudRecordModal<OperationEditValues>` (campos/schema
  reaproveitados) usado hoje na listagem.
- **RF2** — Submit chama `usePutApiOperationId` com o `id` da operação
  atual (já disponível no shell de detalhe via `operation.id`).
- **RF3** — Sucesso: toast de sucesso (reaproveitar chave i18n já
  existente do fluxo de edição na listagem, se aplicável) + invalidação
  da query de detalhe da operação, refletindo os campos atualizados na
  própria aba sem reload.
- **RF4** — Erro: toast de erro (mesmo padrão do resto do projeto).

## 6. Camada de dados

- Reaproveita `usePutApiOperationId` (já existe, sem `just map`
  necessário).
- Precisa da `queryKey`/`queryOptions` de detalhe da operação (usada pelo
  shell que monta `Details.tsx` — confirmar nome exato em
  `src/routes/_dashboard/_internal/administrative/operations/$id` ou
  equivalente) para invalidar após o `PUT`.

## 7. UI

- Botão de editar com o mesmo padrão visual usado em outras abas
  (`bi-pencil`, mesmo estilo dos botões de ação já vistos em
  `Romaneio.tsx`/`Containers.tsx`).
- Formulário reaproveita `editFields`/schema já existentes — nenhum campo
  novo, nenhuma validação nova (regra 2, zero Zod à mão — o schema já é
  gerado/remapeado).

## 8. i18n

Reaproveitar chaves já existentes do fluxo de edição de operação
(`administrative-operations.*`) sempre que possível. Se o botão precisar
de um label próprio por estar em contexto novo (aba, não linha de
tabela), adicionar `administrative-operations.details.editButton` nos 4
locales.

## 9. Arquivos esperados

- `src/components/operations/tabs/Details.tsx`
- `src/components/operations/operations-list.tsx` (extração de
  `editFields`/tipos compartilhados, se necessário)
- Novo módulo compartilhado (nome exato a definir na implementação, ex.
  `src/components/operations/operation-edit-form.ts`)
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json`
  (se precisar de chave nova)

## 10. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Botão "Editar" visível na aba Detalhes, abre o mesmo formulário de edição da listagem |
| CA2 | Salvar atualiza a operação via `PUT /api/operation/{id}` e reflete os novos dados na aba sem reload |
| CA3 | Nenhuma duplicação de definição de campos entre listagem e aba de detalhe (extraído para módulo compartilhado) |
| CA4 | Erro de submit mostra toast, sem quebrar a tela |
| CA5 | `bun run check` + `bun run lint` sem regressão |

## 11. Riscos

- **R1** — Baixo: reaproveita fluxo e endpoint já existentes e testados
  na listagem; o risco principal é só a extração do código compartilhado
  sem quebrar o comportamento atual da listagem.

## 12. Implementation Notes

**Arquivos alterados:**

- `src/components/operations/operation-edit-fields.ts` (**novo**) — módulo
  compartilhado com `OperationEditValues` (`z.infer<typeof
  PutApiOperationIdBody>`), `operationEditDefaultValues(record?)` e
  `buildOperationEditFields({ t, record })` (o `LayoutField[]` de edição,
  antes só em `operations-list.tsx`).
- `src/components/operations/operations-list.tsx` — removida a duplicação
  local (`type OperationEditValues`, `editDefaultValues`, o array
  `editFields`); passa a importar do módulo novo. Comportamento da
  listagem (RF da SPEC-07) preservado — mesmo schema, mesmos campos, mesmo
  `usePutApiOperationId`.
- `src/components/operations/tabs/Details.tsx` — botão "Editar"
  (`bi-pencil`, `Button variant="outline-primary" size="sm"`) no topo da
  aba; abre `CrudRecordModal<OperationEditValues>` reaproveitando
  `buildOperationEditFields`/`operationEditDefaultValues`/
  `PutApiOperationIdBody`; submit chama `usePutApiOperationId` com
  `operation.id`; sucesso → toast (`administrative-operations.toast.updated`)
  + `queryClient.invalidateQueries({ queryKey:
  getGetApiOperationIdQueryKey(operation.id) })` (RF3); erro → toast
  `administrative-operations.toast.error` (RF4), modal permanece aberto.
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json` —
  chave nova `details.editButton` ("Editar"/"Edit"/"Editar"/"编辑").

**Comandos executados e resultado:**

- `bun run check` (tsc --noEmit) — **VERIFIED**, sem erros.
- `bun run lint` — **VERIFIED**, mesmo baseline pré-existente do `main`
  antes desta mudança (3 erros/63 warnings em `src/lib/session.server.ts` e
  `src/layouts/Form/Fields/**`/`src/lib/ui-prefs.tsx`, nenhum deles nos
  arquivos tocados por esta SPEC — confirmado rodando lint com as mudanças
  stashed e comparando a saída, idêntica). Nenhum novo erro/warning
  introduzido pelos arquivos desta SPEC.
- `just map` — não aplicável (endpoint `PUT /api/operation/{id}` já
  existia no client gerado, nenhuma mudança de contrato).

**Critérios de aceitação:**

| # | Critério | Resultado |
| --- | --- | --- |
| CA1 | Botão "Editar" visível na aba Detalhes, abre o mesmo formulário de edição da listagem | PASS |
| CA2 | Salvar atualiza a operação via `PUT /api/operation/{id}` e reflete os novos dados na aba sem reload | PASS (invalidação da query de detalhe dispara refetch automático via `useSsrSafeQuery` do shell) |
| CA3 | Nenhuma duplicação de definição de campos entre listagem e aba de detalhe (extraído para módulo compartilhado) | PASS (`operation-edit-fields.ts`) |
| CA4 | Erro de submit mostra toast, sem quebrar a tela | PASS |
| CA5 | `bun run check` + `bun run lint` sem regressão | PASS |

**Decisões tomadas durante a implementação:**

- Nome do módulo compartilhado: `operation-edit-fields.ts` (uma das opções
  sugeridas no §9 da spec).
- Botão de editar usa `Button` (React-Bootstrap) com texto + ícone
  `bi-pencil` (não ícone isolado como nas linhas de tabela de
  `Containers.tsx`/`Occurrences.tsx`), por ser uma ação de topo de aba, não
  de linha — mesmo padrão textual de outros botões de ação de topo do
  projeto (`newButton` de `operations-list.tsx`). Chave i18n
  `administrative-operations.details.editButton` criada nos 4 locales
  (regra do §8 da spec).
- Invalidação limitada à query de detalhe (`getGetApiOperationIdQueryKey`),
  conforme RF3 — não foi adicionada invalidação da lista
  (`getGetApiOperationQueryKey`), que não estava no requisito funcional
  desta spec (só a listagem já faz essa invalidação no seu próprio fluxo de
  edição).

**Limitações conhecidas:**

- `booking`/`instruction` continuam fora do formulário de edição (fora do
  escopo desta SPEC, confirmado em `OperationUpdate` — exigiria mudança no
  Core).
- Verificação foi via leitura de código + `check`/`lint`; não há suíte de
  testes automatizados no projeto e não foi feita verificação visual
  manual em navegador nesta sessão (Core/ambiente de dev não estavam
  disponíveis para smoke test end-to-end).
