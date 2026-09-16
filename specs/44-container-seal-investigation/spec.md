# SPEC-44 — Investigação: lacre/deslacre de container com histórico

- **ID:** SPEC-44
- **Nome:** container-seal-investigation
- **Status:** IMPLEMENTED (2026-09-16) — ver §9 (Implementation Notes). Core
  `specs/33-container-seal-lifecycle-gaps` já é **`IMPLEMENTED`**
  (2026-09-15, atualizado de `WAITING_APPROVAL`) — contrato real
  existe agora, não é mais desenho fechado só no papel. **Atenção,
  achado novo (2026-09-16):** Core `specs/35-container-status-derived`
  (`IMPLEMENTED`) mexeu **na mesma tela/área** (`Containers.tsx`) — o
  campo `sealDate` que esta investigação documenta abaixo (§2) **não
  existe mais no Core** (`ContainerOperationModel.SealDate` foi
  removido, redundante com `SealModel.CreatedOn`). Qualquer
  implementação desta SPEC-44 precisa ler também a SPEC-35 antes de
  desenhar a tela — ver §3.2 novo abaixo.
- **Autor:** portal-dev-agent (rascunho); revisão de status 2026-09-16
  (cruzamento com Core `specs/33` e `specs/35`)
- **Área investigada:** `src/components/operations/tabs/Containers.tsx`
- **Depende de (Core):** `specs/33-container-seal-lifecycle-gaps`
  (`IMPLEMENTED`) — status na entidade, 1 lacre ativo por vez,
  `DELETE .../seal/{id}` vira soft-delete, consulta dedicada de estado
  atual; e `specs/35-container-status-derived` (`IMPLEMENTED`) — Status
  do Container passa a ser calculado (`Sealed` deriva do lacre ativo),
  `SealDate` extinto.
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
   de estado atual**: **confirmado o endpoint real** —
   `GET operation/{operationId}/container/{id}/seal/current` →
   `SealDTO?`, 200 com corpo `null` quando o container está deslacrado
   (estado válido, não é 404).
4. **Múltiplos lacres ao longo do tempo?** Sim — um container pode ser
   lacrado/deslacrado várias vezes; só não pode ter mais de um `Active`
   simultâneo.
5. **Quem pode lacrar/deslacrar?** Não definido no SPEC-33 do Core
   (território de permissão não tratado ali) — perguntar ao Core/usuário
   se surgir necessidade real na implementação do frontend.

## 3.2 Achado novo — impacto da Core `specs/35-container-status-derived` (2026-09-16)

Descoberto **depois** desta investigação original: uma SPEC do Core
separada (`35-container-status-derived`, `IMPLEMENTED`) reformulou o
próprio `Status` do `ContainerOperationModel`, na mesma área de tela que
esta SPEC-44 investiga. Efeitos que esta SPEC precisa incorporar antes
de desenhar RF/CA de implementação:

- **`ContainerOperationModel.SealDate` foi removido** — o campo livre
  que esta investigação documentou em §2 (`sealDate`, `Containers.tsx:192,
  199,388-389`) **não existe mais do lado Core**. Não é mais "substituir
  por um botão Lacrar/Deslacrar" (§4 item 1) — é remover o campo porque
  ele simplesmente não tem mais coluna nenhuma por trás.
- **`ContainerOperationStatus` agora é `Empty`/`Stuffing`/`Sealed`**
  (3 valores, calculado — nunca mais `Stuffed`/`Shipped`). `Sealed`
  **já é** exatamente "tem lacre ativo" — ou seja, o Status do container
  já reflete sozinho se está lacrado, sem o frontend precisar cruzar
  `Status` com a consulta de `seal/current` separadamente pra saber
  "está lacrado?" (a consulta dedicada continua útil pra saber **qual**
  lacre, não **se** está lacrado).
- `PUT .../container/{id}` não aceita mais `status` nem `sealDate` no
  body — se a tela de edição de container (`Containers.tsx`) hoje manda
  esses campos no update, isso precisa sair do formulário também
  (não é specificamente desta SPEC-44, mas é a mesma tela — coordenar
  as duas implementações juntas, não em PRs separados que se pisam).

## 4. Escopo (frontend, contrato do Core já existe — falta `just map`)

1. Botão "Lacrar" (`POST .../container/{id}/seal`, `AddSeal`) e
   "Deslacrar" (`DELETE .../seal/{id}`, soft-delete) **removendo** o
   campo livre `sealDate` do formulário (não "substituindo por outro
   campo de data" — o dado não existe mais, ver §3.2).
2. Exibir o lacre ativo atual via
   `GET .../container/{id}/seal/current`.
3. Exibir histórico de lacres (linhas com `Status = Removed` inclusas)
   como lista cronológica, se a tela tiver espaço/necessidade — decisão
   de UI na implementação, sem impacto de negócio.
4. Tratar os erros `SealAlreadyActive`/`SealAlreadyRemoved` (400,
   `MessageCode` do Core) como toast, não crash — mesma convenção já
   usada para outros erros de negócio do projeto.
5. **Novo (§3.2):** remover `status`/`sealDate` do formulário de edição
   de container também (`ContainerOperationViewModel.Update` do Core só
   aceita `Tara` agora) — coordenar com quem for reestruturar o form de
   edição de container por causa da SPEC-35, mesma tela.

## 5. Fora do escopo

- Qualquer mudança de código nesta rodada (aguardando `just map`
  expor o contrato de SPEC-33/SPEC-35 do Core, ambas já `IMPLEMENTED`).
- Desenhar o contrato do Core — já fechado em SPEC-33/SPEC-35,
  território do `core-spec-agent`, não desta SPEC.
- Permissão de quem pode lacrar/deslacrar (§3.1.5) — a confirmar depois,
  não bloqueia o desenho de UI.

## 6. Arquivos relevantes

- `src/components/operations/tabs/Containers.tsx` (campo `sealDate`
  atual, linhas 192/199/388-389, a **remover** — não mais substituir por
  §4; e o form de edição de container que hoje manda `status`/`sealDate`
  no `PUT`, também precisa perder esses dois campos, ver §3.2).

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

## 9. Implementation Notes (2026-09-16)

**Achado antes de implementar:** o client gerado já commitado nesta branch
(gerado contra `dev-asc-api.alexstewart.com.br`, `.env`) **não tinha** o
hook `useGetApiOperationOperationIdContainerIdSealCurrent` nem os tipos de
`SealCreate`/`SealDTO`/`SealName` — a API remota de dev ainda não tinha o
deploy de SPEC-33/SPEC-35 do Core. O Core local (`localhost:5766`) já
tinha. Rodei `just map` de novo com um `.env.local` novo (gitignored,
`API_URL=http://localhost:5766`) pra pegar o contrato real antes de
implementar — sem isso, os hooks confirmados no pedido desta tarefa
simplesmente não existiam pra importar. O diff resultante em
`src/api/generated/**` trouxe também contrato de outras SPECs do Core já
implementadas localmente mas não usadas aqui (occurrence tracking/SPEC-39,
`stuff/identified-batch`/SPEC-31/42) — não implementei UI nova pra esses,
só ficou o client gerado disponível pra quando alguém pegar aquelas SPECs.

**Arquivos alterados:**
- `src/components/operations/tabs/Containers.tsx`:
  - Removidos `sealDate`/`status` do formulário de edição de container
    (`updateForm`) — `status` virou só exibição (`Badge`, lido de
    `editing.status`, calculado no Core desde SPEC-35).
  - Novo componente `ContainerSeal` — exibe o lacre ativo via
    `useGetApiOperationOperationIdContainerIdSealCurrent` (CA3), botão
    "Lacrar" (abre `AddSealModal`) e "Deslacrar" (confirmação via
    `ConfirmationModal` + `useDeleteApiOperationOperationIdContainerIdSealSealId`,
    CA1/CA2). Montado dentro do modal de edição de container, ao lado de
    `ContainerPhotos`.
  - Novo componente `AddSealModal` — formulário de lacre: `userId`
    (`SelectAsync` sobre `getApiUser`, mesmo padrão de
    `Responsible.tsx`/`fetchUserOptions` — o Core exige o responsável
    explícito, não necessariamente o usuário logado no portal), `name`
    (`Select` sobre o snapshot `sealNameOptions`), `label`/`description`
    opcionais.
  - Erros de negócio (`SealAlreadyActive`/`SealAlreadyRemoved`) caem no
    mesmo `catch` genérico de toast já usado no resto do arquivo — sem
    extração de `MessageCode` específico (não é o padrão já usado em
    nenhum outro catch deste arquivo).

**Decisões onde a SPEC deixava espaço de julgamento:**
- **Histórico de lacres (§4 item 3, nice-to-have):** não implementado. O
  Core (`Controllers/Operation/Container/Container.Seal.cs`) só expõe
  `AddSeal`/`RemoveSeal`/`GetCurrentSeal` — não há endpoint de listagem de
  lacres (ativos + removidos) por container. `GET /api/container/seals` é
  o endpoint de opções estáticas do enum `SealName`, não uma listagem de
  registros. Sem esse endpoint não há dado pra montar a lista cronológica
  sem inventar contrato novo no Core — registrado aqui como débito, não
  implementado nesta rodada (a SPEC já marcava como opcional/"decisão de
  UI na implementação, sem impacto de negócio").
- **`userId` do lacre:** peguei o mesmo padrão já usado na aba
  Responsáveis (busca assíncrona de usuário, não o usuário logado) — o
  Core exige `userId` explícito e a UI não tinha indicação de que devesse
  ser sempre o operador logado no portal (pode ser diferente de quem
  fisicamente lacrou o container).
- **Permissão de quem pode lacrar/deslacrar (§3.1.5):** continua em
  aberto, como a SPEC já previa — não bloqueou a implementação.

**Comandos executados e resultado:**
- `bun run check` (`tsc --noEmit`) — PASS.
- `bun run lint` (`eslint .`) — sem warnings/erros novos em
  `Containers.tsx`; os 3 erros pré-existentes em `src/lib/session.server.ts`
  (`react-hooks/rules-of-hooks` sobre `useSession` do TanStack Start, falso
  positivo de nome) não são desta SPEC — arquivo não tocado aqui.

**Critérios de aceitação:**

| # | Critério | Status |
|---|----------|--------|
| CA1 | Botão "Lacrar" chama `AddSeal`; erro de negócio vira toast | PASS |
| CA2 | Botão "Deslacrar" chama `DELETE .../seal/{id}` (soft-delete) | PASS |
| CA3 | Lacre ativo atual é exibido via a consulta dedicada de estado atual do Core, não inferido de uma lista | PASS |
| CA4 | Campo livre `sealDate` é removido do form de edição de container | PASS |
| CA5 | `bun run check` + `bun run lint` sem regressão | PASS |

**Limitações conhecidas / débito:**
- Lista de histórico de lacres não implementada (falta endpoint de
  listagem no Core, ver acima) — se vier a importar, é uma SPEC nova no
  Core primeiro.
