# SPEC-44 — Investigação: lacre/deslacre de container com histórico

- **ID:** SPEC-44
- **Nome:** container-seal-investigation
- **Status:** DRAFT — Core `specs/33-container-seal-lifecycle-gaps`
  (`WAITING_APPROVAL`) já tem o desenho fechado (2026-09-15). As
  perguntas de §3 abaixo já têm resposta via Core — ver §3.1 novo. Falta
  só detalhar RF/CA de frontend, o que pode acontecer já, sem esperar a
  implementação do Core (mas a implementação real do frontend depende do
  endpoint/contrato do Core existir).
- **Autor:** portal-dev-agent (rascunho)
- **Área investigada:** `src/components/operations/tabs/Containers.tsx`
- **Depende de (Core):** `specs/33-container-seal-lifecycle-gaps`
  (`WAITING_APPROVAL`) — status na entidade, 1 lacre ativo por vez,
  `DELETE .../seal/{id}` vira soft-delete, consulta dedicada de estado
  atual.
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

Todas essas perguntas dependiam do que a spec Core correspondente viesse
a definir — respondido em §3.1.

## 3.1 Respostas via Core `specs/33-container-seal-lifecycle-gaps` (2026-09-15)

1. **O que muda de estado ao "lacrar"?** `SealModel` ganha campo de
   `Status` (`Active`/`Removed`) — lacrar continua sendo `AddSeal`, mas
   agora **recusa (400)** se já houver um lacre `Active` (não substitui
   automaticamente).
2. **"Deslacrar" é ação distinta?** Sim — `DELETE .../seal/{id}` (mesma
   rota de hoje) passa a ser soft-delete: marca `Status = Removed` em vez
   de apagar a linha.
3. **O que é "histórico"?** Não é evento separado — é a própria linha do
   `SealModel` preservada (nunca apagada), mais uma **consulta dedicada
   de estado atual** (endpoint/campo novo, ex. `GET .../seal/current`, ou
   campo `CurrentSeal` no DTO do container) pra saber o lacre ativo agora
   sem precisar que o frontend infira da lista.
4. **Múltiplos lacres ao longo do tempo?** Sim — um container pode ser
   lacrado/deslacrado várias vezes; só não pode ter mais de um `Active`
   simultâneo.
5. **Quem pode lacrar/deslacrar?** Não definido no SPEC-33 do Core
   (território de permissão não tratado ali) — perguntar ao Core/usuário
   se surgir necessidade real na implementação do frontend.

## 4. Escopo (frontend, depende do endpoint do Core existir)

1. Botão "Lacrar" (chama `AddSeal`) e "Deslacrar" (chama `DELETE
   .../seal/{id}`, agora soft-delete) substituindo o campo livre
   `sealDate` atual.
2. Exibir o lacre ativo atual (via a consulta dedicada que o Core vai
   expor) em vez de um campo de data solto.
3. Exibir histórico de lacres (linhas com `Status = Removed` inclusas)
   como lista cronológica, se a tela tiver espaço/necessidade — decisão
   de UI na implementação, sem impacto de negócio.
4. Tratar o erro `SealAlreadyActive` (400, `MessageCode` novo do Core)
   como toast, não crash — mesma convenção já usada para outros erros de
   negócio do projeto.

## 5. Fora do escopo

- Qualquer mudança de código nesta rodada (aguardando `just map`
  expor o contrato de SPEC-33 do Core implementado).
- Desenhar o contrato do Core — já fechado em SPEC-33, território do
  `core-spec-agent`, não desta SPEC.
- Permissão de quem pode lacrar/deslacrar (§3.1.5) — a confirmar depois,
  não bloqueia o desenho de UI.

## 6. Arquivos relevantes

- `src/components/operations/tabs/Containers.tsx` (campo `sealDate`
  atual, linhas 192/199/388-389, a substituir por §4).

## 7. Critérios de aceitação (implementação, após `just map`)

| # | Critério |
| --- | --- |
| CA1 | Botão "Lacrar" chama `AddSeal`; se já houver lacre ativo, exibe toast com a mensagem de `SealAlreadyActive` |
| CA2 | Botão "Deslacrar" chama `DELETE .../seal/{id}` (soft-delete) |
| CA3 | Lacre ativo atual é exibido via a consulta dedicada de estado atual do Core, não inferido de uma lista |
| CA4 | Campo livre `sealDate` é removido do form de edição de container |
| CA5 | `bun run check` + `bun run lint` sem regressão |

## 8. Riscos

- **R1** — Baixo: desenho de negócio já fechado no Core (SPEC-33). Risco
  de processo residual: não implementar até `just map` expor o contrato
  real (endpoints/DTOs do SPEC-33 ainda não implementados no Core).
