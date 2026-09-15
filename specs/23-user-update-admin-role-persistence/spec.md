# SPEC-23 — Correção: toggle Administrador e papéis não persistem na edição de usuário

- **ID:** SPEC-23
- **Nome:** user-update-admin-role-persistence
- **Status:** IMPLEMENTED — Core implementou o pedido de §15 (confirmado via
  `just map`: `UserUpdate` ganhou `roles?`/`isAdmin?`); Fase 2 (front)
  implementada nesta rodada. Ver §16.
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/routes/_dashboard/admin/access/index.tsx` (front, já
  documenta a limitação em comentário — ver §3), `warren/Core/Domain/User/User.ViewModel.cs`
  e `warren/Core/Controllers/User/User.Cruid.cs` (fora do território deste
  agente — mudança pertence ao `core-spec-agent`/Core, só referenciada aqui
  como causa raiz)
- **Depende de:** SPEC-03 (`admin-access`, `IMPLEMENTED` — implementou a
  tela onde o bug vive)
- **Bloqueia:** nada além de si mesma
- **Contexto do pedido:** usuário relatou que o switch "Administrador" no
  cadastro/edição de usuário (`admin/access`) não persiste a alteração.

---

## 1. Objetivo

Corrigir a persistência de `isAdmin` (e, junto, `roles`) ao **editar** um
usuário existente — hoje funciona só na **criação**.

## 2. Contexto

`admin/access/index.tsx` (SPEC-03) usa `CrudRecordModal` com um único
`userFormSchema` para os 3 modos (create/edit/view), mas dois conjuntos de
`LayoutField` diferentes: `createFields` inclui `InputMultiSelect` (roles) e
`InputSwitch` (isAdmin); `editFields` **não inclui nenhum dos dois** — o
próprio código já documenta isso em comentário (linhas 60-62):

> "edit só não renderiza isAdmin/roles nem manda no PUT — UserUpdate do
> Core não aceita esses campos"

Ou seja: o comportamento observado pelo usuário (switch não persiste) é
esperado dado o código atual — mas o código atual está incompleto porque o
**Core** (`warren/Core`) nunca implementou a capacidade de editar
`isAdmin`/`roles` de um usuário já existente.

## 3. Causa raiz (confirmada em código, `warren/Core`)

- `Domain/User/User.ViewModel.cs`:
  - `UserViewModel.Create` tem `Roles: List<InternalRole>?` e `IsAdmin: bool?`.
  - `UserViewModel.Update` **não tem nenhum dos dois campos** — só herda de
    `Base` (`UserName`, `Profile`).
- `Controllers/User/User.Cruid.cs::Update` (`PUT /api/user/{id}`), além de
  não receber `Roles`/`IsAdmin` no payload, **também não atualiza**
  `UserName` nem `Address` (só `Profile.FullName/Email/Phone` — nem
  `Profile.Document`/`Profile.BirthDate`, que o front também envia e que o
  Core silenciosamente ignora). Achado adicional, fora do pedido original,
  registrado por transparência — ver R2 (§12).
- O client Orval gerado reflete isso fielmente: `UserUpdate`
  (`src/api/generated/model/userUpdate.ts`) só tem `{ profile: ProfileUpdate;
userName: string }` — **sem** `isAdmin`/`roles`. `UserCreate`
  (`userCreate.ts`) tem os dois. Front não pode "inventar" o campo no
  schema (regra 2 do `AGENTS.md` — zero Zod à mão, e o schema é gerado);
  a única correção legítima é o Core expor o campo e o front rodar
  `just map`.

**Conclusão:** bug real, mas a causa raiz está no Core, não no front. O
front já reagiu à limitação (esconde os campos em modo edição em vez de
mandar um payload que o Core ignoraria silenciosamente) — o que é o
tratamento defensivo correto dado o contrato atual, mas deixa a
funcionalidade "editar admin/papéis de um usuário existente" ausente da UI.

## 4. Comportamento atual (bug)

1. Usuário abre "editar" em `admin/access` para um usuário já cadastrado.
2. O modal de edição não mostra os campos "Administrador" (switch) nem
   "Papéis" (multi-select) — só perfil básico.
3. Mesmo que esses campos existissem visualmente, o Core recusaria
   persistir a mudança (endpoint `PUT /api/user/{id}` não aceita/processa
   esses campos).
4. Resultado percebido pelo usuário: "não tem como tornar um usuário já
   existente Admin (ou tirar), só dá pra definir isso na hora de criar".

## 5. Comportamento esperado

Editar um usuário existente permite alterar `isAdmin` e `roles`, com a
mudança persistida no Core e refletida na lista/detalhe após salvar — igual
à criação hoje.

## 6. Plano de correção

### 6.1 Core (`warren/Core` — fora do território deste agente, delega ao `core-spec-agent`)

1. `UserViewModel.Update` ganha `Roles: List<InternalRole>?` e
   `IsAdmin: bool?` (mesmo shape de `Create`, nullable para não forçar o
   front a sempre mandar).
2. `UserController.Update` passa a aplicar esses campos em `existingUser`
   antes de `_userRepository.Update(...)` (checar se `UserModel` já expõe
   um setter/método pra isso, ex. algo como `existingUser.SetRoles(...)`/
   `existingUser.SetAdmin(...)`, seguindo o padrão Model/Repository do
   `warren/Core/AGENTS.md`).
3. Regra de negócio **decidida pelo usuário** (ver §13): bloquear os dois
   casos — (a) um Admin **não pode** remover o próprio `isAdmin` (rebaixar
   a si mesmo) e (b) o sistema **não pode** ficar sem nenhum Admin (a
   última conta com `isAdmin: true` não pode ser rebaixada por outro
   Admin). A validação (`400`/mensagem de erro clara, não um 500 genérico)
   é responsabilidade do Core — o front só está autorizado a repassar a
   mensagem de erro do Core (mesmo padrão de `coreErrorMessage`,
   `src/lib/auth-fns.ts`), não a decidir a regra no client.

### 6.2 Front (`NewPortal`, este agente — só depois do Core expor o campo e `just map` rodar)

1. `just map` — regenerar `src/api/generated/**`; confirmar que
   `UserUpdate` passa a ter `roles?`/`isAdmin?` opcionais.
2. `src/routes/_dashboard/admin/access/index.tsx`:
   - Unificar `editFields` com `createFields` (ou adicionar os dois campos
     que faltam a `editFields`) — `InputMultiSelect` (roles) e
     `InputSwitch` (isAdmin), mesmo `fieldName`/`config` de `createFields`.
   - `handleSubmit`, ramo `modal.mode === "edit"`: incluir
     `isAdmin: values.isAdmin ?? false, roles: values.roles ?? []` no
     payload de `updateMutation.mutateAsync`, espelhando o ramo de
     `create`.
   - Atualizar o comentário de `userFormSchema` (linhas 60-62) — a
     ressalva "UserUpdate do Core não aceita esses campos" deixa de ser
     verdade.
3. Nenhum schema Zod novo — `userFormSchema` já usa
   `PostApiUserBody.shape.isAdmin`/`.roles` (regra 2, reaproveitando shape
   existente); não precisa mudar.

## 7. Fora do escopo

- Revogação de sessão ativa ao alterar `isAdmin`/`roles` de um usuário
  logado (ex.: token já emitido continua com claims antigas até expirar/
  próxima checagem) — não investigado aqui; relacionado a como o Core
  codifica claims no JWT (`TokenPlugin.GenerateUserToken`), fora do
  território deste agente.

> **Atualização (decisão do usuário, §13):** R2 (`userName`/`document`/
> `birthDate`/endereço não persistirem na edição) **deixou de ser "fora do
> escopo"** — o usuário decidiu incluí-lo no mesmo pedido de mudança de
> contrato ao Core (opção 2 do `[NEEDS_DECISION]` original). Ver RF4-RF7 e
> §15.

## 8. Requisitos funcionais (pós Core habilitar os campos)

- **RF1** — Editar usuário existente permite alterar `isAdmin`.
- **RF2** — Editar usuário existente permite alterar `roles`.
- **RF3** — Mudança persiste no Core e é refletida na lista (`roleLabelByValue`
  na coluna "perfil") e na área visível (`admin` no menu) na próxima vez
  que o usuário afetado carregar a sessão.
- **RF4** — Editar usuário existente permite alterar `userName` (hoje
  enviado pelo front, ignorado pelo Core — achado R2).
- **RF5** — Editar usuário existente permite alterar `profile.document` e
  `profile.birthDate` (hoje enviados pelo front, ignorados pelo Core —
  achado R2).
- **RF6** — Editar usuário existente permite alterar o endereço
  (`AddressDTO`) — a confirmar com o Core se `UserUpdate` deve ganhar
  `address` (hoje nem o front envia esse campo no PUT, nem
  `UserViewModel.Update` o tem — achado R2, ver §15).
- **RF7** — Tentar remover `isAdmin` de si mesmo, ou remover o `isAdmin` do
  último Admin do sistema, é rejeitado pelo Core com mensagem de erro clara
  (não um 500 genérico) — regra de negócio decidida em §13/§6.1.3.

## 9. Requisitos não funcionais

- RNF1 — Zero schema Zod escrito à mão no front (reuso de
  `PostApiUserBody.shape`).
- RNF2 — `bun run check` + `lint` depois da mudança de front.
- RNF3 — `just map` executado e diff de `src/api/generated/**` revisado
  antes de tocar `access/index.tsx`.

## 10. Contrato de rota

Sem mudança — mesma rota `/admin/access` (SPEC-03).

## 11. Camada de dados

- `usePutApiUserId` (já existe, gerado) — payload muda depois do `just map`
  (ganha `isAdmin?`/`roles?` opcionais em `UserUpdate`).

## 12. Riscos

- **R1** — Bloqueado por dependência de outro repositório/agente
  (`warren/Core`). Este agente não pode implementar a parte de Core.
- **R2** — Achado adicional (§3): `userName`/`document`/`birthDate`/
  endereço também não persistem na edição hoje (mesma causa raiz, Core
  ignora no `Update`). **Decisão do usuário (§13): incluído no mesmo
  pedido ao Core**, não fica mais de fora.
- **R3** — Regra de negócio de "remover admin de si mesmo"/"remover o
  último admin" — **decidida pelo usuário (§13): bloquear os dois casos**,
  validação a implementar no Core (ver RF7).

## 13. Decisões pendentes

```
[NEEDS_DECISION] — RESOLVIDO

Causa raiz confirmada: `warren/Core` nunca implementou edição de
`isAdmin`/`roles` de usuário existente (`UserViewModel.Update` não tem
esses campos; `UserController.Update` não os aplica). O front já reagiu
corretamente a essa lacuna (esconde os campos no modo edição em vez de
mandar um payload que seria ignorado) — não é workaround a fazer no front,
é o Core que precisa mudar primeiro (regra 2 do AGENTS.md do NewPortal:
regra de validação/contrato de DTO muda no Core, volta por `just map`).

Como proceder?

1. Abrir a mudança de contrato no `warren/Core` (via `core-spec-agent`,
   território daquele repositório) para `UserViewModel.Update` ganhar
   `Roles`/`IsAdmin`, e só então retomar esta SPEC-23 no front (`just map`
   + os 2 pontos de `access/index.tsx` do §6.2).
2. Também usar essa oportunidade pra corrigir R2 (§12) — `userName`/
   `document`/`birthDate`/endereço no mesmo endpoint — numa única mudança
   de contrato no Core, em vez de duas rodadas.
3. Definir a regra de negócio do R3 (§6.1.3): pode remover `isAdmin` de si
   mesmo? Pode ficar sem nenhum Admin no sistema?

Decisão do usuário — as 3 opções foram aceitas:

1. **Autorizado.** Mudança de contrato no Core aprovada; o usuário vai
   acionar o `core-spec-agent`/`warren/Core` com o pedido formal (§15) fora
   desta sessão (este agente não tem território pra fazer isso diretamente).
2. **Aceito.** R2 entra no mesmo pedido (§15 já cobre os dois).
3. **Definida:** bloquear os dois casos — não remover o próprio `isAdmin`,
   não zerar o último Admin do sistema. Ver RF7/§15.

Esta SPEC **permanece `BLOCKED`** até o Core implementar e `just map`
rodar — a aprovação/decisão acima autoriza o pedido a ser formalizado
(§15), não desbloqueia a Fase 2 (front) por si só.
```

---

## 14. Nota de implementação (parcial — só a parte que já é possível hoje)

`APROVAR SPEC-23` recebido do usuário, e as 3 decisões do `[NEEDS_DECISION]`
(§13) foram respondidas. Ainda assim, **nenhum código de front foi
alterado** por esta SPEC — a Fase 1 (mudança de contrato) é território do
`warren/Core`/`core-spec-agent`, fora do alcance deste agente
(`portal-dev-agent`, território `NewPortal`). O que esta SPEC entrega agora
é o pedido formal abaixo (§15), pronto para ser repassado ao
`core-spec-agent`. Quando o Core implementar e o usuário confirmar (`just
map` + aprovação da Fase 2), este agente retoma por §6.2.

## 15. Pedido formal ao Core (`warren/Core`, via `core-spec-agent`)

> Texto pronto para ser encaminhado como pedido de mudança de contrato —
> cobre os dois achados desta SPEC-23 (toggle Administrador/roles e o R2
> de campos silenciosamente ignorados na edição) e a regra de negócio
> decidida pelo usuário.

---

**Assunto:** `PUT /api/user/{id}` não persiste `isAdmin`/`roles`/`userName`/
`document`/`birthDate` na edição de usuário — só funciona na criação

**Origem do pedido:** `NewPortal` (`portal-dev-agent`), SPEC-23
(`specs/23-user-update-admin-role-persistence/spec.md`), autorizado pelo
usuário.

**Problema:** a tela de gestão de usuários do NewPortal (`/admin/access`,
SPEC-03) permite criar um usuário com `isAdmin`/`roles` definidos
(`POST /api/user`, `UserViewModel.Create`), mas **não permite editar**
esses campos depois — porque `UserViewModel.Update`
(`Domain/User/User.ViewModel.cs`) não tem `Roles`/`IsAdmin`, e
`UserController.Update` (`Controllers/User/User.Cruid.cs::Update`) só
aplica `Profile.FullName`/`Profile.Email`/`Profile.Phone` em `existingUser`
— nem `UserName`, nem `Profile.Document`/`Profile.BirthDate`, nem endereço
são atualizados, mesmo que o client já envie esses valores.

**Pedido:**

1. `UserViewModel.Update` ganha, além do que já tem (`UserName`,
   `Profile`):
   - `Roles: List<InternalRole>?` (nullable, mesmo shape de
     `UserViewModel.Create.Roles`)
   - `IsAdmin: bool?` (nullable, mesmo shape de `UserViewModel.Create.IsAdmin`)
   - Confirmar se `Profile.Update` (`ProfileViewModel.Update`) já cobre
     `Document`/`BirthDate`, ou se precisa dos mesmos ajustes — hoje o
     front (`UserUpdate.profile`) já envia esses dois campos, e o Core os
     ignora silenciosamente.
   - Avaliar se `Update` deve passar a aceitar `Address` também (hoje nem
     o front envia esse campo no PUT, nem `UserViewModel.Update` o tem —
     ficaria a critério do Core decidir se cabe nesta mudança ou numa
     seguinte).
2. `UserController.Update` passa a aplicar `UserName`, `Roles`, `IsAdmin`,
   e os campos de `Profile` que hoje são ignorados, em `existingUser`
   antes de `_userRepository.Update(...)` — seguindo o padrão
   Model/Repository já documentado no `AGENTS.md` do Core (ex.: método
   `existingUser.Update(...)` ganhando os parâmetros que faltam, ou métodos
   dedicados como `existingUser.SetRoles(...)`/`existingUser.SetAdmin(...)`,
   a critério de quem implementar).
3. **Regra de negócio (decidida pelo usuário do NewPortal), a validar no
   Core antes de persistir a atualização:**
   - Um usuário **não pode** remover o próprio `isAdmin` (um Admin não
     rebaixa a si mesmo via este endpoint).
   - O sistema **não pode** ficar sem nenhum Admin — se o usuário sendo
     editado é o **último** com `IsAdmin == true`, a tentativa de setar
     `IsAdmin: false` deve ser rejeitada.
   - Em ambos os casos, responder com erro claro (ex.: `400` +
     `{ message: "..." }`, mesmo formato já usado em `Auth.Login.cs`) —
     não um `500` genérico. O front (`NewPortal`) já tem tratamento pronto
     pra propagar `message` de erro do Core (`coreErrorMessage`,
     `src/lib/auth-fns.ts`, mesmo padrão a reaplicar em
     `admin/access/index.tsx`).
4. Depois de implementado: o `NewPortal` roda `just map` pra regenerar o
   client (`src/api/generated/**`), e a Fase 2 desta SPEC-23 (front) fica
   liberada para: unificar `editFields` com `createFields` em
   `admin/access/index.tsx` (mostrar `isAdmin`/`roles` também no modo
   edição) e incluir esses campos no payload de `PUT /api/user/{id}`.

**Não é pedido desta SPEC:** revogação de sessão ativa quando `isAdmin`/
`roles` mudam durante uma sessão já aberta (o JWT já emitido mantém claims
antigas até expirar) — fora do escopo aqui, pode ser tratado como pedido
separado se o Core/usuário julgar necessário.

---

## 16. Implementation Notes (Fase 2 — front)

Usuário confirmou que implementou o pedido de §15 em uma sessão separada
(`core-spec-agent`/`warren/Core`). `just map` (rodado nesta rodada) confirma:
`UserUpdate` (`src/api/generated/model/userUpdate.ts`) ganhou `roles?:
InternalRole[] | null` e `isAdmin?: boolean | null`, mesmo shape de
`UserCreate`. RF4-RF6 (userName/document/birthDate/endereço) não foram
verificados byte-a-byte no schema (o shape de `profile`/`userName` já
existia antes; se o Core aplica esses campos no `Update` ou ainda os ignora
é comportamento de Controller, não visível só pelo schema OpenAPI) — não
bloqueia RF1-RF3, que são o essencial deste pedido.

### Arquivos alterados (Fase 2)

- `src/routes/_dashboard/admin/access/index.tsx`:
  - `editFields` removido — `createFields` virou `fields`, único array usado
    nos 3 modos (`create`/`edit`/`view`), já que agora têm exatamente os
    mesmos campos (`isAdmin`/`roles` incluídos).
  - `handleSubmit`, ramo `modal.mode === "edit"`: payload de
    `updateMutation.mutateAsync` passa a incluir `isAdmin: values.isAdmin ??
false, roles: values.roles ?? []`, espelhando o ramo de `create`.
  - Comentário de `userFormSchema` atualizado — não cita mais a limitação
    do Core (que deixou de existir).
- `src/api/generated/**` — regenerado via `just map` (ver §17 do diff geral
  desta sessão — inclui também mudanças não relacionadas a esta SPEC,
  como `state` de endereço e novos endpoints de auth, tratados nas SPECs/
  achados correspondentes).

### Comandos executados

- `just map` — **VERIFIED**. Nota: a primeira tentativa coincidiu com uma
  instabilidade momentânea do Core de dev (`GET /api/openapi/v1.json`
  respondeu `500` por ~15s), e como `orval` limpa a pasta de saída antes de
  buscar o spec, isso apagou temporariamente todo `src/api/generated/**` da
  working tree sem conseguir regenerar. Uma segunda tentativa (Core já
  recuperado) regenerou tudo corretamente — `tsc --noEmit` (parte do `just
map`) passou sem erros. Nenhuma perda de dado permanente (nada estava
  commitado antes, e a segunda rodada restaurou o estado a partir do
  contrato atual do Core, que já reflete os dois pedidos formais desta
  sessão).
- `bun run check` — VERIFIED, sem erros.
- `bun run lint` — VERIFIED, mesma contagem do baseline (66: 3 erros
  pré-existentes em `session.server.ts`, 63 warnings), nenhum novo.

### Achado incidental (fora do escopo desta SPEC, registrado por transparência)

O `just map` também trouxe `POST /api/auth/logout` e `POST /api/auth/refresh`
— endpoints que não existiam antes (`src/lib/auth-fns.ts::logoutFn` tinha
comentário "não há endpoint de logout", que deixou de ser verdade). Não
implementado aqui — é uma nova capacidade do Core, fora do escopo desta
SPEC. Potencialmente relevante para a SPEC-27 (logout inesperado ao excluir
usuário) e para o risco de sessão expirar durante uso prolongado — um
fluxo de refresh de token silencioso poderia mitigar isso. Registrado como
achado, não como pedido — decisão de abrir uma SPEC nova fica com o
usuário.

### Critérios de aceitação

| # | Critério | Status |
| --- | --- | --- |
| RF1 | Editar usuário existente permite alterar `isAdmin` | PASS (código — campo visível e enviado no PUT) |
| RF2 | Editar usuário existente permite alterar `roles` | PASS (código) |
| RF3 | Mudança persiste no Core e reflete na lista/área visível | NOT VERIFIED — depende de teste manual (submeter o form e conferir a coluna "perfil"/nova sessão do usuário afetado) |
| RF4-RF6 | userName/document/birthDate/endereço persistem na edição | NOT VERIFIED — comportamento de Controller no Core, não visível via schema |
| RF7 | Bloqueio de auto-rebaixamento / zerar último admin, com mensagem clara | NOT VERIFIED — depende de teste manual; front já propaga mensagem de erro do Core via interceptor de `mutator.ts` (padrão existente, não alterado) |

### Limitações conhecidas

- Não há suíte de testes automatizados — os RF3/RF4-RF6/RF7 pedem
  verificação manual (criar/editar um usuário de teste no ambiente
  apontado, conferir que os campos persistem e que as regras de negócio de
  admin são bloqueadas com mensagem clara).
