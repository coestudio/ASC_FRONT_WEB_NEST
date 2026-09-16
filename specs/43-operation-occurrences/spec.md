# SPEC-43 — Ocorrências manuais da Operação (re-proposta)

- **ID:** SPEC-43
- **Nome:** operation-occurrences
- **Status:** DRAFT (revisado 2026-09-16) — **§6 e §7 já resolvidos pelo
  Core.** `specs/32-operation-occurrences` já é `IMPLEMENTED`
  (2026-09-16): CRUD completo (Create/GetAll/GetById/Update — **sem
  Delete**), qualquer usuário Internal pode criar (sem role específico),
  `Note` obrigatória, edição permitida. Ainda não apareceu em
  `src/api/generated/**` porque `just map` não rodou depois da
  implementação do Core.
- **Autor:** portal-dev-agent (rascunho); revisão de status 2026-09-16
  (cruzamento com Core `specs/32-operation-occurrences`)
- **Área:** nova aba/tela dentro do shell de Operação,
  `src/layouts/AppShell/nav/administrativo.ts`
- **Depende de (Core):** ~~spec Core em andamento~~ — **resolvido**:
  `specs/32-operation-occurrences` (`IMPLEMENTED`). Falta só `just map`.
- **Relação com SPEC-06 (cancelada):** este item nunca foi implementado.
  A SPEC-06 antiga, que cobria esta e outras features, foi cancelada
  antes de qualquer implementação — esta SPEC é uma **re-proposta do
  zero**, não uma continuação. Nenhum requisito da SPEC-06 é herdado por
  suposição; tudo aqui vem só do `TODO.md` e desta investigação.

---

## 1. Objetivo

Adicionar um recurso de **ocorrências manuais** dentro da Operação —
diferente do Log automático (SPEC-39, gerado pelo Core) — onde um
admin ou operador pode registrar manualmente: título, nota (texto livre)
e imagens, vinculado à operação.

## 2. Contexto

Confirmado por grep: não existe hoje nenhum componente, rota ou endpoint
relacionado a "ocorrências" no client gerado nem no código do projeto —
a única referência é a entrada de menu órfã
`navigation.administrativoOccurrences`
(`src/layouts/AppShell/nav/administrativo.ts:37-43`), apontando para
`/administrativo/ocorrencias` (`legacyOrphanRoute: true`, rota morta,
mesma situação da entrada "Log" tratada na SPEC-39).

Não há nenhum DTO, endpoint ou schema no client gerado que sirva de base
para esta feature — é backend novo, não um ajuste de contrato existente.

## 3. Escopo

Bloqueado até o Core expor o(s) endpoint(s) de CRUD de ocorrências. Quando
existir:

1. Nova aba/seção "Ocorrências" dentro do shell de Operação (ao lado de
   Detalhes/Romaneio/Containers/etc.) — decisão de IA de informação a
   confirmar com o usuário (ver §5).
2. Listagem de ocorrências da operação, paginada.
3. Criar ocorrência: título (texto curto), nota (texto livre/textarea),
   imagens (`InputPhotoMulti`, mesmo padrão de containers).
4. Quem pode criar: "admin ou operador" (citação literal do `TODO.md`) —
   a regra de permissão exata (`useCan`/`getUserAreas`) precisa ser
   confirmada com o usuário antes de implementar (ver §6
   `[NEEDS_DECISION]`).
5. Remover a entrada de menu órfã `navigation.administrativoOccurrences`
   de `nav/administrativo.ts` (RF não bloqueado pelo Core — pode ser
   feito já, mesma lógica da SPEC-39 RF4).

## 4. Fora do escopo

- ~~Editar/excluir ocorrência já criada~~ — **correção 2026-09-16**: o
  Core **já implementou edição** (`PUT`, só `Title`/`Note`, sem fotos no
  update). Exclusão continua fora — **não existe `Delete`** no contrato
  do Core (`specs/32-operation-occurrences` não implementou; se vier a
  ser necessário, é `SCOPE CONFLICT` pra levantar com o Core numa spec
  própria).
- Adicionar/remover foto de uma ocorrência já criada — fotos só entram
  no `Create` (multipart), mesmo padrão de `InvoiceDocumentModel`. Debt
  conhecido do lado Core, não desta SPEC.
- Qualquer vínculo automático entre ocorrência manual e o Log automático
  (SPEC-39) — são fontes de dado e propósitos distintos, conforme o
  próprio `TODO.md` frisa ("diferente do Log automático").

## 5. `[NEEDS_DECISION]` — onde a aba entra na navegação

Nova aba dentro do shell de Operação (mesmo nível de
Detalhes/Romaneio/Containers/Invoice/Log/Reports) ou uma seção dentro de
uma aba já existente (ex. dentro de Log, já que são conceitos
relacionados)? O `TODO.md` diz "dentro da Operação", mas não especifica o
nível exato de navegação. Recomendação (não decisão): aba própria, pelo
paralelo com Log (SPEC-39) — mas aguardando confirmação antes de
implementar.

## 6. ~~`[NEEDS_DECISION]`~~ — RESOLVIDO pelo Core (2026-09-16)

**Era:** não estava confirmado quais papéis podem criar ocorrência
("admin ou operador" não mapeia 1:1 num `InternalRole` existente).

**Resposta (Core `specs/32-operation-occurrences` §5.3, `IMPLEMENTED`):**
**qualquer usuário Internal pode criar** — `[Authorize] + [RequireInternal]`
sem role específico (`Role = null`, o middleware só checa
`user.Type == Internal`). Não existe distinção "admin vs. operador" no
gate real do Core — não faz sentido o front implementar uma restrição de
UI (`useCan`) mais estreita que o que o backend permite. Gate de UI:
mostrar o botão de criar pra qualquer usuário Internal autenticado, sem
checagem de role adicional.

## 7. ~~`[NEEDS_DECISION]`~~ — RESOLVIDO pelo Core (2026-09-16)

**Era:** não existia nenhum endpoint de ocorrências no Core.

**Resposta (Core `specs/32-operation-occurrences`, `IMPLEMENTED`):**

- `GET /operation/{operationId}/occurrence` — paginado, `Sortable`
  (`createdOn`/`title`/`updatedAt`, default `createdOn` desc).
- `GET /operation/{operationId}/occurrence/{id}` — detalhe.
- `POST /operation/{operationId}/occurrence` — `[FromForm]`, multipart:
  `Title` (obrigatório), `Note` (obrigatório), `Photos: IFormFile[]`
  (0..N, opcional).
- `PUT /operation/{operationId}/occurrence/{id}` — JSON comum (sem
  arquivo), só `Title`/`Note`.
- **Sem `DELETE`** — não implementado (ver §4).
- DTO (`OperationOccurrenceDTO`): `OperationId`, `Title`, `Note`,
  `CreatedBy`/`CreatedOn` (grátis de `TableDTO`), lista de fotos
  (formato exato a confirmar no client gerado após `just map`).

Esta SPEC não está mais bloqueada por decisão de contrato — falta só
`just map`.

## 8. Requisitos funcionais (bloqueados só por §5 (aba) e `just map`, ver §7)

- **RF1** — Remover `navigation.administrativoOccurrences` de
  `nav/administrativo.ts` e a chave i18n correspondente dos 4
  dicionários, se confirmado que não é usada em outro lugar.
- **RF2** — Nova aba/seção de Ocorrências, listagem paginada
  (`GET .../occurrence`).
- **RF3** — Criar ocorrência com título, nota, imagens (`POST`
  multipart).
- **RF4** — Editar ocorrência (título/nota, `PUT`) — capacidade nova do
  Core, não prevista na versão original desta SPEC.
- **RF5** — Gate de criação: qualquer usuário Internal autenticado (sem
  checagem de role adicional, ver §6).

## 9. Camada de dados

Endpoints reais listados em §7. Nomes exatos dos hooks gerados a
confirmar após `just map`.

## 10. UI

- Formulário de criação: `InputText` (título), `InputTextArea` (nota),
  `InputPhotoMulti` (imagens) — todos já existentes em
  `layouts/Form/Fields`, nenhum campo novo necessário do lado de UI.

## 11. i18n

Namespace `administrative-operations` (novo sub-namespace, ex.
`occurrences.*`), 4 locales — chaves exatas a definir quando o contrato
do Core for conhecido.

## 12. Arquivos esperados

- `src/layouts/AppShell/nav/administrativo.ts` (RF1, não bloqueado)
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/navigation.json` (RF1)
- Novo arquivo de aba/tela (nome exato a definir, bloqueado por §5/§7)
- `src/api/generated/**` (via `just map`, quando a spec Core existir)

## 13. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA0 | `just map` executado, endpoints de `occurrence` presentes no client gerado |
| CA1 | Entrada "Ocorrências" não aparece mais no menu Administrativo |
| CA2 | Nova aba/seção permite criar, listar e editar ocorrências (título/nota/imagens) |
| CA3 | Botão de criar visível pra qualquer usuário Internal, sem gate de role adicional |
| CA4 | `bun run check` + `bun run lint` sem regressão |

## 14. Riscos

- **R1** — Maior risco é confundir esta re-proposta com a SPEC-06
  cancelada e herdar requisitos não confirmados dela — esta SPEC
  deliberadamente não reaproveita nada da SPEC-06 além do tema geral.
