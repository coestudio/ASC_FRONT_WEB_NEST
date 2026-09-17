# SPEC-63 — Containers: lista mais compacta + upload de foto avulsa

- **ID:** SPEC-63
- **Nome:** containers-density-and-extra-photos
- **Status:** IMPLEMENTED (2026-09-16)
- **Autor:** claude (pedido do usuário, 2026-09-16)
- **Área:** `src/components/operations/tabs/Containers.tsx`.

---

## 1. Objetivo

Dois ajustes na aba Containers, pedidos pelo usuário depois de usar a
tela:

1. A listagem de containers está com linhas muito altas — dificulta ver
   várias linhas de uma vez ("o contexto como um todo"). Deixar mais
   compacta/densa.
2. Não existe hoje ação pra adicionar uma foto do container que **não**
   seja de um dos 8 slots obrigatórios do checklist (SPEC-37) — só dá pra
   ver fotos "outras" que já existiam com slot fora do checklist (dado
   legado), sem upload novo nessa categoria.

## 2. Contexto

- Tabela principal (`Containers.tsx`, linha ~308): `<Table hover
  className="align-middle mb-0">`, sem `size="sm"` — padding padrão do
  Bootstrap (mais alto). Outras listagens no mesmo arquivo/área que
  precisam de mais linhas visíveis já usam `size="sm"` (`Operational.tsx`
  → `DestuffingTab`/`CargoUnitsModal`). Ações da linha hoje são só 4
  botões (`bi-camera`, `bi-shield-lock`, `bi-pencil`, `bi-trash`, pós
  SPEC-60/61) com `gap-2` — cabem numa linha só, não é o que causa a
  altura.
- `ContainerPhotos` (checklist de fotos): já existe uma seção "Outras
  fotos" (`otherPhotos`, linha ~838) que **só exibe** fotos com `slot`
  fora dos 8 do checklist (incluindo `None`/`null`) — não tem controle de
  upload ali, só aparece se já existir uma foto legada nessa situação.
- O endpoint `POST .../photo` já aceita `slot: "None"` hoje —
  `ContainerPhotoSlot.None = 0` é um valor válido no Core (`Photo.
  Model.cs`), e o schema Zod gerado (`PostApiOperationOperationIdContainerIdPhotoBody`)
  já inclui `zod.literal('None')` na união. **Nenhuma mudança no Core,
  nenhum `just map` necessário** — é só adicionar o controle de upload no
  front chamando a mesma mutation já usada pelo checklist, com
  `slot: "None"`.

## 3. Escopo

1. `<Table>` da listagem principal de containers ganha `size="sm"`
   (mesmo padrão já usado em `Operational.tsx`) — reduz o padding
   vertical das células, mais linhas visíveis sem scroll.
2. `ContainerPhotos` ganha um controle de upload sempre visível (não só
   quando já existem "outras fotos") — mesmo padrão do
   `ContainerPhotoSlotCell` (`InputPhotoSingle` que sobe assim que o
   arquivo é escolhido, sem botão "Salvar" extra), chamando
   `handleUpload` com `slot: "None"`. Fica na mesma seção "Outras fotos"
   (renomeada pra deixar claro que é onde entram fotos fora do
   checklist), acima da grade de fotos já existentes.
3. `handleUpload` (hoje tipado `(slot: ContainerPhotoSlotKey, file:
   File)`) tem o tipo do parâmetro `slot` alargado pra `ContainerPhotoSlot`
   completo (inclui `"None"`) — sem mudança de comportamento, só o tipo.

## 4. Fora do escopo

- Qualquer mudança em `Operational.tsx`/outras abas — só a listagem
  principal de `Containers.tsx`.
- Reduzir/remover colunas da tabela (identifier/tara/status/fotos/ações)
  — só densidade visual (`size="sm"`), não corte de informação.
- Editar/excluir foto avulsa já é coberto pelo botão de remover que já
  existe em cada card da grade de "Outras fotos" (`handleDeletePhoto`) —
  nenhuma mudança aí.

## 5. Requisitos funcionais

- RF1: listagem de containers renderiza com linhas mais baixas
  (`size="sm"`), sem perder nenhuma coluna/ação.
- RF2: dentro do modal de fotos (SPEC-61), sempre existe um controle pra
  adicionar uma foto avulsa, independente do checklist estar completo ou
  não.
- RF3: foto avulsa enviada aparece na grade "Outras fotos", com a mesma
  ação de remover que as demais.

## 6. Critérios de aceitação

- CA1: tabela de containers visivelmente mais compacta.
- CA2: upload de foto avulsa funciona e reflete na UI sem F5 (mesmo
  `invalidateDetail`/`onChanged` já usados pelo checklist).
- CA3: `tsc --noEmit` e lint sem erro novo.

## 7. i18n

Chave nova: `administrative-operations.containers.photosAddOther` (label
do novo controle de upload) — 4 idiomas. `photosOther` (título da seção)
não mudou.

## 8. Implementation Notes (2026-09-16)

- `<Table>` da listagem principal ganhou `size="sm"`.
- Seção "Outras fotos" (`ContainerPhotos`) deixou de ser condicional
  (`otherPhotos.length > 0 ?`) — o título e o novo `AddOtherPhotoControl`
  (upload auto-submit, mesmo padrão de `ContainerPhotoSlotCell` mas sem
  ícone/estado de obrigatoriedade) aparecem sempre; a grade de fotos já
  existentes continua condicional.
- `handleUpload` alargado de `ContainerPhotoSlotKey` pra
  `ContainerPhotoSlot` completo — `AddOtherPhotoControl` chama
  `handleUpload("None", file)`, mesma mutation do checklist
  (`usePostApiOperationOperationIdContainerIdPhoto`), sem endpoint novo.
- `tsc --noEmit` e `lint` sem erro/novo aviso nos arquivos tocados.
