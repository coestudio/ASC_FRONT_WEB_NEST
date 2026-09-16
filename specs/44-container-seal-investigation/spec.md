# SPEC-44 — Investigação: lacre/deslacre de container com histórico

- **ID:** SPEC-44
- **Nome:** container-seal-investigation
- **Status:** DRAFT (investigação — não desenha solução)
- **Autor:** portal-dev-agent (rascunho)
- **Área investigada:** `src/components/operations/tabs/Containers.tsx`
- **Depende de (Core):** spec Core correspondente de lacrar/deslacrar com
  histórico — número ainda não conhecido; referenciar por tema ("spec
  Core de lacre/deslacre de container") quando publicada.
- **Contexto do pedido:** item do `TODO.md` pedindo para investigar a UI
  de lacre depois que o Core definir o fluxo com histórico — este
  documento é a investigação do estado atual, não uma proposta de
  solução.

---

## 1. Objetivo deste documento

Levantar o que existe **hoje** no frontend relacionado a "lacre" de
container, e listar as perguntas de negócio/contrato que faltam responder
antes de desenhar qualquer solução. **Não propõe implementação.**

## 2. Estado atual (investigação)

Confirmado por grep em `src/components/operations/tabs/Containers.tsx`:
não existe nenhum conceito de "lacrar"/"deslacrar" como ação, nem
histórico de lacre. O que existe é um único campo de formulário:

- `sealDate` — campo de data (`InputDate`), parte do formulário de
  edição de container (`Containers.tsx:192,199,388-389`), lado a lado com
  `tara` e `status` (`Empty`/outros valores de
  `ContainerOperationStatus`). É só um campo de data digitável dentro do
  form de edição — não é uma ação dedicada, não gera evento, não tem
  histórico, não distingue "lacrado"/"deslacrado" como estado.

Não há:

- Nenhum botão "Lacrar"/"Deslacrar" separado.
- Nenhum status de container que represente "lacrado" explicitamente
  (`containerOperationStatusOptions` — conferir os valores exatos do enum
  ao investigar mais a fundo, se necessário; não confirmado aqui que
  "lacrado" seja um dos status).
- Nenhum endpoint ou DTO no client gerado com "seal"/"lacre" no nome além
  do campo `sealDate` já citado.

## 3. `[NEEDS_DECISION]` — perguntas de negócio (sem proposta de solução)

1. **O que muda de estado ao "lacrar"?** Hoje `sealDate` é só uma data
   registrada manualmente — lacrar deveria virar uma ação (com
   timestamp automático, usuário responsável) em vez de um campo de
   data editável livremente?
2. **"Deslacrar" é uma ação distinta de simplesmente apagar a
   `sealDate`?** Se sim, o que a diferencia (motivo obrigatório, como o
   cancelamento de `CargoUnit`? histórico de quem deslacrou e quando)?
3. **O que é "histórico" aqui?** Uma lista de eventos (lacrado em X por
   Y, deslacrado em Z por W, relacrado em...) — isso é conceitualmente
   parecido com o Log de auditoria (SPEC-39) ou é um histórico dedicado
   só de lacre?
4. **Um container pode ser lacrado/deslacrado múltiplas vezes** durante o
   ciclo de vida de uma operação? Ou é uma ação única (lacra uma vez, fim)?
5. **Quem pode lacrar/deslacrar?** Mesma pergunta de papel/permissão que
   aparece em outras SPECs desta leva (SPEC-43) — não assumir sem
   confirmar.

Todas essas perguntas dependem inteiramente do que a spec Core
correspondente vier a definir — este documento não arrisca uma resposta.

## 4. Escopo

Nenhum requisito funcional de implementação nesta SPEC — é
investigação pura. Quando a spec Core de lacre/deslacre existir e for
aprovada, esta SPEC (ou uma nova, numerada na sequência) deve ser
reaberta com RF/CA concretos, agora informados pelas respostas do Core.

## 5. Fora do escopo

- Qualquer mudança de código nesta rodada.
- Desenhar o contrato do Core — território do `core-spec-agent`.

## 6. Arquivos relevantes (referência, nenhum a ser alterado agora)

- `src/components/operations/tabs/Containers.tsx` (campo `sealDate`
  atual, linhas 192/199/388-389)

## 7. Critérios de aceitação

Não se aplica — este documento é investigação, não implementação.

## 8. Riscos

- **R1** — Nenhum risco de implementação (nada é implementado aqui).
  Risco de processo: não avançar para código antes que o Core publique
  e o usuário aprove o desenho de lacre/deslacre.
