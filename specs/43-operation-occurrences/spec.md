# SPEC-43 — Ocorrências manuais da Operação (re-proposta)

- **ID:** SPEC-43
- **Nome:** operation-occurrences
- **Status:** DRAFT
- **Autor:** portal-dev-agent (rascunho)
- **Área:** nova aba/tela dentro do shell de Operação,
  `src/layouts/AppShell/nav/administrativo.ts`
- **Depende de (Core):** spec Core em andamento para persistência de
  ocorrências manuais (título, nota, imagens, vínculo à operação).
  Referenciar por tema ("spec Core de Ocorrências de Operação") até o
  `core-spec-agent` publicar o número definitivo.
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

- Editar/excluir ocorrência já criada — não pedido explicitamente
  (`TODO.md` só fala em "adicionado manualmente"); se o usuário quiser
  edição/exclusão, é extensão a confirmar.
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

## 6. `[NEEDS_DECISION]` — regra de permissão de quem cria

"admin ou operador" — quais são exatamente esses papéis no vocabulário de
`InternalRole`/`getUserAreas` do projeto? `InternalRole` hoje tem
`Agent`/`Supervisor`/`Laboratory` (confirmado em uso na SPEC-16/SPEC-21) —
não há um papel literalmente chamado "Operador" nem uma distinção
"admin ou operador" mapeada 1:1 num enum existente. Precisa de
confirmação do usuário sobre qual regra de UI (`useCan`) e/ou quais
`InternalRole` especificamente podem criar ocorrência, antes de
implementar o gate de UI (lembrando que o gate de **segurança** real é
sempre do Core, `permissions.ts` só decide UI).

## 7. `[NEEDS_DECISION]` — dependência de Core

Requisito do ponto de vista do consumidor (sem desenhar o contrato):

> Dado um `operationId`, o front precisa de um CRUD (pelo menos
> criar+listar) de "ocorrências": título, nota, lista de imagens,
> autor, timestamp — persistido e vinculado à operação.

Esta SPEC fica formalmente **bloqueada** (exceto RF de remoção do item
de menu órfão) até existir SPEC própria no Core respondendo isso,
aprovada separadamente, e o `just map` correspondente.

## 8. Requisitos funcionais

- **RF1 (não bloqueado)** — Remover `navigation.administrativoOccurrences`
  de `nav/administrativo.ts` e a chave i18n correspondente dos 4
  dicionários, se confirmado que não é usada em outro lugar.
- **RF2 (bloqueado por §7)** — Nova aba/seção de Ocorrências, listagem
  paginada.
- **RF3 (bloqueado por §7)** — Criar ocorrência com título, nota,
  imagens.
- **RF4 (bloqueado por §6)** — Gate de UI restringindo quem vê o botão
  de criar, conforme a regra de permissão confirmada.

## 9. Camada de dados

Bloqueado por §7 — depende do(s) endpoint(s) que o Core expuser.

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
| CA1 | Entrada "Ocorrências" não aparece mais no menu Administrativo |
| CA2 (bloqueado) | Nova aba/seção permite criar e listar ocorrências com título/nota/imagens |
| CA3 (bloqueado) | Gate de criação respeita a regra de permissão confirmada no §6 |
| CA4 | `bun run check` + `bun run lint` sem regressão |

## 14. Riscos

- **R1** — Maior risco é confundir esta re-proposta com a SPEC-06
  cancelada e herdar requisitos não confirmados dela — esta SPEC
  deliberadamente não reaproveita nada da SPEC-06 além do tema geral.
