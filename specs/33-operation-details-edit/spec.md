# SPEC-33 — Operação → aba Detalhes: botão de editar

- **ID:** SPEC-33
- **Nome:** operation-details-edit
- **Status:** APPROVED (2026-09-16, usuário)
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
