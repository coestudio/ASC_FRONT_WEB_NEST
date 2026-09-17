# SPEC-85 — Aba Documentos da Operação: rótulo, coluna Observação e filtro por Tipo

- **ID:** SPEC-85
- **Nome:** operations-documents-tab-refinements
- **Status:** IMPLEMENTED (itens 3.1/3.2/3.3). Item 3.4 (busca por
  Título/nome de arquivo) **não implementado** — bloqueado por
  dependência de Core, ver §6. Aprovação veio da própria instrução de
  tarefa desta sessão (pedido explícito do usuário com passo "implemente
  o que for possível agora", sem a frase literal `APROVAR SPEC-85`, mas
  sem `[NEEDS_DECISION]` de escopo pendente pros itens implementados)
- **Autor:** claude (pedido do usuário, 2026-09-17, com print da tabela
  atual da aba Documentos)
- **Área:** `src/components/operations/tabs/Documents.tsx`,
  `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json`.

---

## 1. Objetivo

Três ajustes pontuais na tabela da aba "Documentos" da tela de detalhe de
Operação (`administrative/operations/$id`):

1. Renomear o rótulo da coluna "Criado em" para "Enviado em".
2. Trocar a coluna "Arquivo" (hoje: nome do arquivo com link) por uma
   coluna "Observação" com preview de 1-2 linhas do campo
   `item.observation`.
3. Paginação (já existe) + filtro por Tipo de arquivo (implementável
   agora) + busca por Título/nome de arquivo (bloqueado — ver §6).

## 2. Contexto — estado atual

`Documents.tsx` já é um CRUD funcional (SPEC-07-06): lista paginada via
`useGetApiOperationOperationIdDocument`/`useSsrSafeQuery`, criação e
edição via modal com `InputText`/`Select`/`InputTextArea`/
`InputFileSingle`. A tabela hoje tem 5 colunas: Título, Tipo, Arquivo
(nome + link), Criado em (`item.createdAt`), Ações
(`CrudRowActions` com "Ver" → `FilePreviewModal` e "Baixar" → link
direto do `item.file.url`).

`GetApiOperationOperationIdDocumentParams`
(`src/api/generated/model/getApiOperationOperationIdDocumentParams.ts`)
hoje aceita `Type?: DocumentType`, `Offset`, `Limit`, `Sort` — **não**
tem `Search`/`Text`/`Query`. Por comparação, endpoints irmãos que já têm
busca por texto usam o parâmetro `Search` (ex.
`GetApiOperationOperationIdRomaneioParams.Search`, também presente em
`Invoice`, `Client`, `Harbor`, `Terminal`, `User`, `Operation`,
`Container` (registro), `Product`, `Vessel`,
`GetApiOperationOperationIdCargoParams`,
`GetApiOperationOperationIdResponsibleEligibleUsersParams`) — confirma
que `Search` é o nome convencionado no projeto pra esse tipo de filtro,
mas `Document` (e `Occurrence`) não o implementam ainda no Core.

`specs/81-listing-standard-search-sort/spec.md` (`WAITING_APPROVAL`,
não aprovada) já fez essa mesma auditoria de forma independente e chegou
à mesma conclusão: busca em `Documents.tsx`/`Occurrences.tsx` depende de
`warren/Core/specs/48-document-occurrence-search-filter` — spec essa que,
conferido agora (2026-09-17), **ainda não existe** no repo `Core`
(`ls Core/specs` vai até `45-container-seal-photo-datetime`; não há
pasta `48-*`). Ou seja, nem o rascunho da spec do lado do Core foi criado
ainda — a dependência é mais forte do que "esperar aprovação", é
"esperar a spec nem existir".

## 3. Escopo

### 3.1 — Renomear rótulo "Criado em" → "Enviado em"

Só o texto exibido (i18n), não a chave. Mantém
`administrative-operations.documents.colCreatedAt` como o nome da chave
(ela ainda descreve corretamente o campo fonte, `item.createdAt`; trocar
o nome da chave por `colUploadedAt` exigiria tocar as 4 traduções e
carrega risco de digitar a chave errada num arquivo e ficar
inconsistente entre locales, sem ganho real — decisão: manter a chave,
só o valor muda) nos 4 locales.

### 3.2 — Coluna "Arquivo" → "Observação"

- Header: chave `colFile` → texto muda para "Observação" (mesma decisão
  do item 3.1: reaproveitar a chave existente em vez de criar
  `colObservation`, já que ela já é usada só nesse `<th>`).
- Célula: em vez de `item.file.url`/`item.file.name` com link, mostra
  `item.observation` truncado em 2 linhas (`-webkit-line-clamp: 2` via
  CSS Module novo, com fallback `—` quando vazio). Sem link — acesso ao
  arquivo continua via "Ver" (`FilePreviewModal`) e "Baixar" no
  `CrudRowActions`, que já existem e não mudam.
- Chave i18n `fileLink` (usada só no link removido) fica órfã — mantida
  no dicionário por ora (fora de escopo remover; risco de quebrar outro
  consumidor não seria alto, mas não faz parte do pedido).

### 3.3 — Filtro por Tipo (implementável agora)

Novo `<Form.Select>` controlado (mesmo padrão de
`src/routes/_dashboard/admin/access/index.tsx:402-418` — select puro do
React-Bootstrap, não é campo de formulário `react-hook-form`, então não
usa `layouts/Form/Fields`), populado com `documentTypeOptions` (mesmo
array já importado pro `Select` do modal de criar/editar), valor
`DocumentType | ""`. Muda `Type` no `GetApiOperationOperationIdDocumentParams`
passado pro `useSsrSafeQuery`, reseta `page` pra 1 ao trocar.

### 3.4 — Busca por Título/nome de arquivo

**Bloqueado** — ver §6. Não implementado nesta SPEC.

## 4. Fora do escopo

- Ordenação de coluna (`sortKey`/ícone) — pedido explícito do usuário foi
  só os 3 itens acima; ordenação de `Documents.tsx` já está mapeada em
  `specs/81-listing-standard-search-sort/spec.md` §4.1 (SPEC própria,
  ainda não aprovada) — não duplicar aqui.
- Qualquer mudança no Core (`warren/Core`) — inclusive criar a spec
  `48-document-occurrence-search-filter` lá. Não é território deste
  agente.
- Filtro client-side "busca tudo e filtra em memória" pra simular busca
  por texto — proibido: quebraria a paginação real (o backend acha que
  só existe 1 página do resultado filtrado, mas `Offset`/`Limit`
  continuam sendo aplicados nos dados brutos, não no filtrado).
- Remover a chave `fileLink` do i18n (órfã, mas fora do pedido).

## 5. Contrato de dados

Nenhuma mudança no client gerado — `Type` já existe em
`GetApiOperationOperationIdDocumentParams`, sem necessidade de `just map`.

## 6. `[NEEDS_DECISION]` / bloqueio de Core

```
[NEEDS_DECISION] — busca por Título/nome de arquivo em Documents.tsx

O Core não expõe parâmetro de busca textual em
GET /api/operation/{operationId}/document (só Type/Offset/Limit/Sort).
O nome convencionado no projeto pra esse parâmetro é `Search` (usado em
Romaneio, Invoice, Client, Harbor, Terminal, User, Operation, Container,
Product, Vessel, Cargo, ResponsibleEligibleUsers).

Não existe ainda nem o rascunho da spec do lado do Core
(`warren/Core/specs/48-document-occurrence-search-filter`, citada em
specs/81 como dependência, mas ausente do repo Core hoje).

Opções:
1. Implementar a spec 48 no warren/Core primeiro (endpoint ganha
   `Search?: string`, casando com o padrão dos irmãos), rodar `just map`
   no front depois, e só então acrescentar `FilterText` em Documents.tsx
   (mesmo padrão de Containers.tsx/Invoice.tsx) — caminho recomendado,
   mesma direção que specs/81 já apontou.
2. Não implementar busca nesta tela por ora, manter só filtro por Tipo +
   paginação.

Impacto: sem a opção 1, o usuário não tem busca textual na aba
Documentos até o Core expor o parâmetro. Filtro por Tipo (3.3) e
paginação (já existente) cobrem parte da necessidade.

Aguardando decisão do usuário — enquanto isso, SPEC-85 entrega os itens
3.1/3.2/3.3 e deixa 3.4 documentado aqui como bloqueado por dependência
de Core (sem SPEC própria criada agora pro lado do Core; se o usuário
quiser, é pedido separado em warren/Core).
```

## 7. Requisitos funcionais

- **RF1** — Header da coluna hoje "Criado em" mostra "Enviado em" nos 4
  locales, mesma fonte de dado (`item.createdAt`).
- **RF2** — Header da coluna hoje "Arquivo" mostra "Observação" nos 4
  locales; célula mostra `item.observation` (ou `—` se vazio), truncado
  visualmente em 2 linhas.
- **RF3** — Novo select de filtro por Tipo (`documentTypeOptions`) acima
  da tabela, ao lado de onde ficaria a busca; ao trocar, refaz a query
  com `Type` setado e volta pra página 1.
- **RF4** — Paginação existente (`ListPagination`) continua funcionando
  com o novo filtro (não quebra offset/limit).
- **RF5** — Ação "Ver" (preview) e "Baixar" no `CrudRowActions`
  continuam intactas — acesso ao arquivo não regride.

## 8. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Coluna antes "Criado em" mostra "Enviado em" nos 4 locales (pt-BR/en/es/zh). |
| CA2 | Coluna antes "Arquivo" mostra "Observação" nos 4 locales, célula com preview de `item.observation` truncado em 2 linhas, sem link de arquivo. |
| CA3 | Select de filtro por Tipo funcional, reseta pra página 1 ao trocar, combina com paginação sem quebrar. |
| CA4 | "Ver" e "Baixar" no dropdown de ações continuam funcionando (preview modal e download). |
| CA5 | Busca por texto **não** implementada nesta SPEC — documentada como bloqueada por dependência de Core em §6, sem filtro client-side fake. |
| CA6 | `bun run check` + `bun run lint` sem regressão (baseline conhecido: erros pré-existentes em `session.server.ts`/`ui-prefs.tsx`). |

## 9. Riscos

- **R1** — Baixo: mudança de label i18n não quebra nada estruturalmente.
- **R2** — Baixo: truncamento via `-webkit-line-clamp` é suportado nos
  browsers-alvo do projeto (Chromium/Firefox/Safari modernos via
  prefixo `-webkit-`, universalmente aceito na prática apesar do nome).
- **R3** — Médio: usuário pode esperar busca por texto funcionando
  "já", já que pediu os 3 itens juntos — mitigado documentando o
  bloqueio explicitamente na resposta final e nesta SPEC.

## 10. Notas de implementação

- **Arquivos alterados:**
  - `src/components/operations/tabs/Documents.tsx` — filtro `Form.Select`
    por `Type` (bind por `opt.key`, mesmo contrato de
    `layouts/Form/Fields/Select.tsx`, não `opt.value`), coluna
    "Observação" renderizando `item.observation` com clamp de 2 linhas
    (`styles.observationPreview`), remoção do link de arquivo da tabela.
  - `src/components/operations/tabs/documents.module.css` (novo) —
    `.observationPreview` com `-webkit-line-clamp: 2`.
  - `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json`
    — `documents.colCreatedAt` → "Enviado em"/"Uploaded at"/"Subido
    el"/"上传时间"; `documents.colFile` → "Observação"/"Notes"/
    "Observaciones"/"备注"; nova chave `documents.filterAllTypes`
    ("Todos os tipos"/"All types"/"Todos los tipos"/"所有类型").
- **Comandos executados:**
  - `bun run check` — VERIFIED, sem erros.
  - `bun run lint` — VERIFIED, 0 erros / 63 warnings (nenhum nos arquivos
    tocados; baseline citado na tarefa era 66/3/63, estado atual do
    `main` já está em 63/0/63 antes desta mudança — sem regressão
    introduzida por esta SPEC).
- **Critérios de aceitação:**

  | # | Resultado |
  | --- | --- |
  | CA1 | PASS — chave `colCreatedAt` com novo texto nos 4 locales. |
  | CA2 | PASS — chave `colFile` com novo texto nos 4 locales; célula usa `item.observation` com clamp 2 linhas via CSS Module, sem link. |
  | CA3 | PASS — `Form.Select` de `Type`, reseta `page` pra 1 no `onChange`, combinado com `Offset`/`Limit` já existentes. |
  | CA4 | PASS — `CrudRowActions` (Ver/Baixar) não alterado. |
  | CA5 | PASS — busca por texto não implementada; documentada em §6. |
  | CA6 | PASS — ver comandos acima. |

- **Decisões tomadas durante a implementação:**
  - Reaproveitar as chaves i18n existentes (`colCreatedAt`, `colFile`) em
    vez de renomeá-las, conforme já avaliado em §3.1/§3.2 (menor risco).
  - Filtro de Tipo usa `<Form.Select>` puro do React-Bootstrap (não
    `layouts/Form/Fields`), mesmo padrão já usado em
    `src/routes/_dashboard/admin/access/index.tsx` pra filtro de
    listagem que não é campo de formulário.
- **Limitações conhecidas:**
  - Busca por Título/nome de arquivo continua indisponível nesta aba —
    depende de `warren/Core` ganhar `Search` em
    `GET /api/operation/{operationId}/document` (spec própria do lado do
    Core ainda não criada, ver §6). Não implementado filtro client-side
    como paliativo (quebraria a paginação real).
  - Chave i18n `documents.fileLink` ficou órfã (usada só no link
    removido da coluna) — mantida no dicionário, fora do escopo desta
    SPEC remover.
