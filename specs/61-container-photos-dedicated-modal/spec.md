# SPEC-61 — Modais dedicados para fotos e lacre do container

- **ID:** SPEC-61
- **Nome:** container-photos-dedicated-modal
- **Status:** DRAFT — decisões fechadas com o usuário (2026-09-16). Falta
  só `APROVAR SPEC-61` para implementar.
- **Autor:** claude (pedido do usuário, 2026-09-16)
- **Área:** `src/components/operations/tabs/Containers.tsx`.

---

## 1. Objetivo

Dar acesso direto a duas ações hoje escondidas dentro do modal de
**editar** container (tara + lacre + fotos), cada uma através de um
**botão dedicado** na linha do container, abrindo um **modal próprio**
para cada uma — sem precisar passar pelo modal de editar tara:

1. Checklist de fotos (`ContainerPhotos`, SPEC-37) — ícone câmera.
2. Lacrar/deslacrar (`ContainerSeal`) — ícone lacre/cadeado (confirmado
   pelo usuário: mesma lógica de descoberta ruim das fotos se aplica ao
   lacre).

O modal de editar container passa a ter **só** o campo de tara — vira um
formulário de edição de verdade, sem seções extra empilhadas embaixo do
`Modal.Footer`.

## 2. Contexto (achado ao especificar SPEC-60)

Hoje, em `Containers.tsx`:

- A coluna "Fotos" (`colPhotos`, linha ~362) só mostra a contagem
  (`item.photos?.length ?? 0`), sem ação de clique.
- `ContainerPhotos` (checklist dos 8 `ContainerPhotoSlot`, upload/remoção
  por slot) e `ContainerSeal` (lacrar/deslacrar) só são renderizados
  dentro do `Modal` de **editar** container (`editing`, aberto pelo ícone
  lápis `bi-pencil`), empilhados abaixo do `Modal.Footer` do formulário de
  tara (`Containers.tsx:505-518`).
- Usuário reportou não ter percebido a ação de adicionar fotos — e, ao
  revisar, confirmou que o mesmo problema de descoberta vale para lacrar/
  deslacrar: a única entrada pra ambos é o botão de editar tara, que não
  sugere nem "fotos" nem "lacre".

## 3. Escopo

1. Dois novos botões de ação por linha em `Containers.tsx` — câmera
   (fotos) e lacre/cadeado (selo) — ao lado dos demais botões da linha
   (estufagem sai daqui por conta da SPEC-60; ficam vincular/editar/
   desvincular + estes dois novos).
2. Novo `Modal` dedicado só de fotos (`photosFor`, mesmo padrão de estado
   dos demais modais da tela — `useState<ContainerOperationDTO | null>`),
   contendo **só** `ContainerPhotos`.
3. Novo `Modal` dedicado só de lacre (`sealFor`, mesmo padrão de estado),
   contendo **só** `ContainerSeal`.
4. `ContainerPhotos`/`ContainerSeal` são reaproveitados como estão (mesmas
   props `operationId`/`containerLinkId`/`onChanged`), só mudam os modais
   que os hospedam.
5. Modal de **editar** (`editing`) perde `<ContainerSeal ... />` e
   `<ContainerPhotos ... />` — vira só o formulário de tara (campo +
   `Modal.Footer` de salvar/cancelar, sem nada empilhado embaixo).

## 4. Fora do escopo

- Qualquer mudança em `ContainerPhotos`/`ContainerPhotoSlotCell`/
  `ContainerSeal` em si (upload, checklist, slots, regra de lacre/
  deslacre) — só os modais que os hospedam mudam.
- Tornar a coluna "Fotos" clicável como atalho adicional, ou expor status
  de lacre como coluna clicável — decisão fechada: só os botões dedicados.
- Mudança de contrato/endpoint — endpoints de foto e lacre já existem e
  não mudam.

## 5. Requisitos funcionais

- RF1: botão de câmera na linha do container abre modal só com o
  checklist de fotos daquele container.
- RF2: botão de lacre na linha do container abre modal só com
  `ContainerSeal` daquele container.
- RF3: upload/remoção de foto e lacrar/deslacrar dentro desses modais têm
  o mesmo comportamento de hoje (mesmas mutations, mesmo `invalidateList`
  via `onChanged`).
- RF4: modal de editar mostra só o campo de tara — sem checklist de fotos
  nem seção de lacre.

## 6. Critérios de aceitação

- CA1: botões de câmera e lacre visíveis na linha de cada container.
- CA2: modal de fotos mostra só o checklist; modal de lacre mostra só o
  `ContainerSeal`; nenhum dos dois mostra tara ou o outro conteúdo.
- CA3: modal de editar (pencil) não mostra mais fotos nem lacre.
- CA4: `tsc --noEmit` e lint sem novo erro.

## 7. Riscos

- Baixo — reaproveita componentes existentes (`ContainerPhotos`,
  `ContainerSeal`), só muda os modais/estados que os abrem. Mesmo padrão
  de outros modais já na tela (`stuffIdentifiedFor`, `cargoUnitsFor`,
  etc.).

## 8. Relação com SPEC-60

Independente — `SPEC-60` mexe em estufagem/desestufagem; esta mexe em
fotos. Podem ser implementadas em qualquer ordem entre si, mas ambas
tocam `Containers.tsx` — se implementadas em sequência, a segunda deve
conferir se o merge da primeira já mudou a lista de botões da linha antes
de posicionar o botão novo.
