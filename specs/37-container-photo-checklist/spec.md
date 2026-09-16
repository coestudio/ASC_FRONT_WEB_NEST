# SPEC-37 — Containers: checklist de imagens necessárias

- **ID:** SPEC-37
- **Nome:** container-photo-checklist
- **Status:** IMPLEMENTED (2026-09-16) — ver §9 (Implementation Notes).
  Decisões de §3 fechadas com o usuário (2026-09-15).
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/components/operations/tabs/Containers.tsx`
  (checklist de fotos do container, `InputPhotoSingle` por slot)
- **Contexto do pedido:** item do `TODO.md` ("modal de adicionar imagens
  do container precisa de um checklist das imagens necessárias").

---

## 1. Objetivo

Adicionar, ao modal de adicionar fotos de um container
(`OperationContainerPhotosFormValues`/`InputPhotoMulti`, dentro de
`Containers.tsx`), um checklist indicando quais fotos são "necessárias"
e se já foram anexadas.

## 2. Contexto

Hoje o modal de fotos do container usa `InputPhotoMulti` puro — upload
livre de N imagens, sem categorização nem indicação de quais fotos são
esperadas. **Achado corrigido (2026-09-15):** o Core já tem um enum
dedicado pra isso — `ContainerPhotoSlot` (`Domain/Operations/Container/
Photos/*`), com 8 valores: `EmptyExternal`, `EmptyInternal`, `FirstRow`,
`Fifty`, `Hundred`, `FullExternal`, `Sealed`, `ShipownerSeal`. O contrato
do Core (a confirmar exposição via `just map` se ainda não exposto)
já prevê "slot" como conceito de categoria de foto — não é preciso
inventar nem pedir ao Core um campo novo.

## 3. `[NEEDS_DECISION]` — RESOLVIDA (2026-09-15)

1. **A lista é fixa** — RESOLVIDA: sim, é a lista fixa dos 8 valores de
   `ContainerPhotoSlot` (§2), a mesma para todo container/operação.
2. **Configurável?** — não se aplica, a lista fixa do enum já resolve.
3. **Varia por tipo de operação?** — não, os 8 slots valem sempre.
4. **Bloqueia o salvamento?** — RESOLVIDA: **todos os 8 são obrigatórios**
   — o checklist deve indicar quando algum slot ainda não tem foto
   anexada.

## 4. Escopo

1. Modal de fotos do container passa a exibir um checklist com os 8
   `ContainerPhotoSlot`, indicando quais já têm foto anexada e quais
   faltam.
2. Upload de foto associa a categoria (`ContainerPhotoSlot`) escolhida —
   UI a definir na implementação (ex. um `InputPhotoSingle` por slot, ou
   seleção de slot ao anexar em `InputPhotoMulti`).
3. Todos os 8 slots são obrigatórios (§3.4) — decisão de implementação
   se isso vira bloqueio duro de salvar ou só aviso visual forte, dado
   que o pedido original ("checklist") sugere indicador, mas a
   obrigatoriedade dos 8 aponta pra validação real antes de considerar o
   container com fotos completas.

## 5. Fora do escopo

- Qualquer mudança no endpoint de upload de fotos do container
  (`usePostApiOperationOperationIdContainerIdPhoto`) além do que a
  decisão do §3 exigir.

## 6. Arquivos esperados (estimativa, depende de §3)

- `src/components/operations/tabs/Containers.tsx`
- `just map` — confirmar que `ContainerPhotoSlot` já está exposto no
  client gerado; se não estiver, é território Core (expor o enum no
  contrato) antes de implementar aqui.

## 7. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Checklist exibe os 8 valores de `ContainerPhotoSlot`, indicando os já anexados |
| CA2 | Upload de foto associa o slot escolhido |
| CA3 | Ausência de algum dos 8 slots é sinalizada claramente (obrigatórios, §3.4) |
| CA4 | `bun run check` + `bun run lint` sem regressão |

## 8. Riscos

- **R1** — Baixo, decisão de negócio já fechada (§3) com base num enum
  real do Core, não inventado.

## 9. Implementation Notes (2026-09-16)

**Confirmado antes de implementar:** `ContainerPhotoSlot` já estava
exposto no client gerado (`src/api/generated/model/containerPhotoSlot.ts`,
`ContainerPhotoDTO.slot`, `postApiOperationOperationIdContainerIdPhotoBody`)
— o `just map` do §6 já tinha acontecido numa rodada anterior (SPEC-39),
sem trabalho extra de contrato aqui.

**Achado durante a implementação (mesmo gap sinalizado na revisão da
SPEC-38 do Core):** o enum gerado tem **9** valores, não 8 —
`None` + os 8 reais. `None` nunca conta como um dos 8 obrigatórios do
checklist (`ContainerPhotoSlotKey = Exclude<ContainerPhotoSlot, "None">`).

**RF1/RF3 (checklist):** `Containers.tsx` — `ContainerPhotos` monta uma
célula por slot (`ContainerPhotoSlotCell`, ordem fixa do enum,
`PHOTO_CHECKLIST_SLOTS`), cada uma com ícone de check/aviso conforme tem
ou não foto, mais um badge no topo ("Checklist completo" /
"Faltam N fotos") — RF3 (sinalização clara) resolvido nos dois níveis
(por slot e no agregado).

**RF2 (upload associa slot):** substituí o uploader único
(`InputPhotoMulti`, sem slot, sempre `"None"`) por um `InputPhotoSingle`
por célula — cada um já sobe a foto com o slot fixo daquela célula assim
que selecionada (auto-upload via `watch`+`useEffect`, mesmo padrão do
`InputAvatar` em `profile-modal.tsx` e do `SelectAsync` em
`Responsible.tsx`, sem botão "Salvar" extra). Isso muda a UX de "escolher
N fotos e enviar em lote, sem categoria" pra "uma foto por categoria,
sobe na hora" — mudança de comportamento esperada pelo próprio pedido da
SPEC (upload que associa slot só faz sentido por célula).

**Achado extra, fora do RF literal mas necessário pra não perder dado:**
fotos já existentes com `slot = None`/`null` (uploads de antes desta
SPEC, quando tudo subia sem categoria) ficariam invisíveis na nova UI se
eu só renderizasse o checklist — adicionei uma seção "Outras fotos"
abaixo do checklist, mesma grade/remoção de antes, só pra esse caso
legado. Não é um RF novo, é preservação de dado que já existia.

**Arquivos alterados:**
- `src/components/operations/tabs/Containers.tsx`
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json`
  — removidas `photosAdd`/`photosUpload` (órfãs após a troca de UI),
  adicionadas `photosAddToSlot`, `photosOther`,
  `photosChecklistComplete`, `photosChecklistMissing` (`{count}`) e o
  namespace `photoSlots.*` (8 chaves, rótulo de cada slot); `toast.
  photoUploaded` ajustada pra singular (upload agora é sempre 1 foto por
  vez, não mais em lote).
- `src/lib/validation/operation-container.ts` — **apagado**: schema
  (`operationContainerPhotosFormSchema`) ficou com zero consumidores
  depois da troca de UI (confirmado por grep antes de apagar).

**Validação:** `bun run check` (tsc --noEmit) limpo. `bun run lint` sem
findings em `Containers.tsx` nem nos dicionários tocados. CA1-CA3
verificáveis em código; CA4 confirmado.
