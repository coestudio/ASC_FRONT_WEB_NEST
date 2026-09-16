# SPEC-45 — Investigação: Split/Transferência de Containers

- **ID:** SPEC-45
- **Nome:** container-split-transfer-investigation
- **Status:** DRAFT (investigação — não desenha solução). Decisão do
  usuário (2026-09-15): **última coisa a ser feita** — sistema ainda
  precisa ser consultado/validado com o negócio (mesma decisão tomada no
  Core SPEC-34). Não avançar nas perguntas de §3 até o usuário reabrir
  isto.
- **Autor:** portal-dev-agent (rascunho)
- **Área investigada:** `src/components/operations/tabs/Containers.tsx`
- **Depende de (Core):** decisão de negócio + spec Core correspondente,
  ainda não existente. Referenciar por tema ("spec Core de
  split/transferência de container") quando publicada.
- **Contexto do pedido:** item do `TODO.md` pedindo para investigar
  split/transferência de containers (mover fardos de um container para
  outro, ou dividir um container em dois) — este documento é a
  investigação do estado atual, não uma proposta de solução.

---

## 1. Objetivo deste documento

Confirmar que a feature não existe hoje, e listar as perguntas de
negócio em aberto. **Não propõe implementação.**

## 2. Estado atual (investigação)

Confirmado: não existe, em `Containers.tsx` nem em nenhum outro
componente do projeto, qualquer ação de "mover fardo de um container
para outro" ou "dividir container". As ações existentes sobre
`CargoUnit`/container hoje são:

- Vincular/editar/desvincular container↔operação
  (`usePostApiOperationOperationIdContainer`,
  `usePutApiOperationOperationIdContainerId`,
  `useDeleteApiOperationOperationIdContainerId`).
- Estufar um fardo identificado num container (Modo A) ou por quantidade
  (Modo B) — sempre "de romaneio para dentro de um container", nunca
  "de um container para outro".
- Cancelar (`desestufar`) um fardo já estufado, que libera a linha do
  romaneio de volta (não move o fardo para outro container diretamente —
  o usuário precisaria desestufar e depois estufar de novo em outro
  container, manualmente, em dois passos).

Não existe, no client gerado, nenhum endpoint com "split"/"transfer"/
"move" no nome relacionado a container ou `CargoUnit`.

## 3. `[NEEDS_DECISION]` — perguntas de negócio (sem proposta de solução)

1. **"Transferência" é diferente de "desestufar + estufar de novo"?**
   Se o resultado final é o mesmo (fardo sai de um container, entra em
   outro), o valor de uma ação dedicada de "transferir" seria só de UX
   (1 clique em vez de 2 ações) ou também de regra de negócio (ex.
   preservar algum histórico/vínculo que o fluxo de 2 passos perderia)?
2. **O que significa "dividir um container em dois"?** Um container é
   uma unidade física (`ContainerOperationDTO`, vínculo
   container↔operação) — "dividir" se refere a criar um segundo vínculo
   de container↔operação e mover parte dos fardos estufados do primeiro
   para o segundo? Ou é um conceito totalmente diferente (ex. dividir a
   carga fisicamente, que nem sempre corresponde a "dois containers" no
   sistema)?
3. **Isso teria impacto em documentos já emitidos** (nota fiscal,
   romaneio, relatórios) que referenciam o container original?
4. **Precisa de histórico/auditoria** da transferência/split (relação com
   SPEC-39, Log de auditoria)?

## 4. Escopo

Nenhum requisito funcional de implementação nesta SPEC — é
investigação pura. Quando as perguntas de negócio acima forem
respondidas pelo usuário e o Core (se necessário) tiver o contrato
correspondente, uma nova SPEC numerada na sequência deve ser aberta com
RF/CA concretos.

## 5. Fora do escopo

- Qualquer mudança de código nesta rodada.
- Desenhar o contrato do Core — território do `core-spec-agent`, e só
  depois que as perguntas de negócio do §3 forem respondidas (parte
  dessas perguntas nem chegam a ser "de contrato", são de regra de
  negócio pura, a decidir pelo usuário antes de envolver o Core).

## 6. Arquivos relevantes (referência, nenhum a ser alterado agora)

- `src/components/operations/tabs/Containers.tsx`

## 7. Critérios de aceitação

Não se aplica — este documento é investigação, não implementação.

## 8. Riscos

- **R1** — Nenhum risco de implementação (nada é implementado aqui).
  Risco de processo: não avançar para código ou para uma spec Core antes
  que as perguntas de negócio do §3 sejam respondidas pelo usuário.
