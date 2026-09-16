# SPEC-37 — Containers: checklist de imagens necessárias

- **ID:** SPEC-37
- **Nome:** container-photo-checklist
- **Status:** WAITING_APPROVAL — decisões de §3 fechadas com o usuário
  (2026-09-15).
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/components/operations/tabs/Containers.tsx`
  (`InputPhotoMulti` de fotos do container)
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
