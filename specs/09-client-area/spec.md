# SPEC-09 — Client: Home, Colaboradores (real), Relatório Final e Acompanhamento (UI-only)

- **ID:** SPEC-09
- **Nome:** client-area
- **Status:** IMPLEMENTED. Ver §14.
- **Autor:** portal-dev-agent (rascunho + revisão)
- **Área:** `src/routes/_dashboard/client/**` (nova — `client` não é
  `_internal`, é a área de usuário externo)
- **Depende de:** SPEC-00 (namespaces do dicionário), SPEC-02 (nav —
  **`nav/client.ts` já existe**, criado como placeholder pela SPEC-02, ver
  D3; `crud-list-page`/`crud-record-modal`/`mock-data-banner`). SPEC-07
  **não** é dependência — D2 decidido como mock solto (ver §13).
- **Referenciada por:** `specs/05-administrativo-clientes/spec.md` §13 (D1)
  — `ClientDetailDTO.collaborations` (visto do lado admin, dentro do modal
  `view` de Cliente) é explicitamente posto fora do escopo da SPEC-05 "por
  ser escopo da SPEC-09". Esta SPEC é quem de fato cobre `Collaborator` — ver
  nota em §4.

---

## 1. Objetivo

Portar a área Client (usuário externo, `type !== Internal`): Home,
**Colaboradores** (o legado usa mock apesar da API `Collaborator` existir e
nunca ter sido chamada — aqui vira **real**, corrigindo essa lacuna),
Relatório Final e Acompanhamento (UI-only, hoje mock no legado).

**Real vs UI-only:**

| Tela            | Legado                                                               | Aqui                               |
| --------------- | -------------------------------------------------------------------- | ---------------------------------- |
| Home            | sem dado                                                             | sem dado                           |
| Colaboradores   | mock (API real nunca chamada, colisão de nome)                       | **real**                           |
| Relatório Final | mock (`OPERATIONS` + `OperationRomaneio`/`OperationRelatorios` mock) | **UI-only**, mock solto local (D2) |
| Acompanhamento  | mock (steps sintetizados de `OPERATIONS`)                            | **UI-only**, idem D2               |

## 2. Contexto

Legado: `Client/Home.tsx` (grid de 3 links). `Collaborators/Page.tsx` +
`List.tsx` + `Form.tsx` — CRUD UI real na forma, mas ligado a uma
`CollaboratorApi` **mock local** definida em `Collaborators/data.ts`, que
colide de nome com a `CollaboratorApi` real gerada (nunca importada em lugar
nenhum do legado). `FinalReport/Page.tsx` e `Tracking/Page.tsx` — telas
inteiras sobre o array `OPERATIONS` mockado.

NewPortal já tem `collaborator` no client gerado (`collaboratorCreate.ts`,
`collaboratorDTO.ts`) — API real, pronta, nunca usada em lugar nenhum
(inclusive no legado). Regra desta sessão (`AGENTS.md`/agente): nunca
reinventar dado mock quando existe API real — Colaboradores vira real aqui.

## 3. Escopo

1. `client/index.tsx` — Home, grid de 3 links (mesmo desenho do legado).
   Segmentos de rota em inglês: `colaboradores`→`collaborators`,
   `relatorio-final`→`final-report`, `acompanhamento`→`tracking`.

2. `client/collaborators/index.tsx` — `crud-list-page` + `crud-record-modal`
   (SPEC-02, 3 modos) configurados pra `Collaborator` API — mesmo padrão de
   toda tela CRUD desta leva, sem componente próprio.
3. `client/final-report/index.tsx` — UI-only por decisão do usuário
   (`mock-data-banner` da SPEC-02); array local mockado (D2).
4. `client/tracking/index.tsx` — idem, UI-only, array local mockado (D2).

## 4. Fora do escopo

- Fluxo de proposta/pagamento (`Plans/Escopo-Adiado-Portal-Core.md` —
  formalmente adiado, não é desta leva).
- Emissão real de relatório final (mesma limitação de backend da SPEC-05).
- **Não** inclui edição de Colaborador (ver R3/D1 revisado — o Core não
  expõe `PUT/PATCH` para `Collaborator`, só criar/listar/detalhar/excluir).
- **Não** é a visão do lado administrativo de "clientes e seus
  colaboradores" — isso, quando existir, é outra tela (a SPEC-05 já deixa o
  campo `ClientDetailDTO.collaborations` de fora do modal `view` de Cliente
  citando esta SPEC). Esta SPEC cobre só a autogestão do colaborador pelo
  próprio usuário externo logado.

## 5. Requisitos funcionais

- **RF1** — Colaboradores: **criar/listar/detalhar/excluir** real, escopado
  ao cliente logado. O endpoint gerado é
  `GET/POST /api/client/{clientId}/collaborator` e
  `GET/DELETE /api/client/{clientId}/collaborator/{id}` — recebe `clientId`
  explícito na URL. Não há `PUT`/`PATCH` (sem "editar"). `clientId` vem de
  `UserAdminDTO.collaborator.clientId` (resposta de `POST /api/auth/login`)
  e é persistido na sessão no login — ver D1 (resolvido) e §8.
- **RF2** — Relatório Final/Acompanhamento: dado mockado (array local,
  D2), nunca escrita real.
- **RF3** — Guard de área: `client` só aparece pra `type !== Internal`
  (regra já existente em `permissions.ts`, sem mudança).

## 6. Requisitos não funcionais

- RNF1 — `bun run check` + `lint` passam.
- RNF2 — Zero Zod à mão (`collaboratorCreate.zod` etc.).
- RNF3 — Nome do arquivo/rota não colide com nada de `_internal` (área
  `client` é irmã, não filha, de `_dashboard/_internal`).

## 7. Contrato de rota

| Rota                    | Guard                    | Dado               |
| ----------------------- | ------------------------ | ------------------ |
| `/client`               | `authed` + área `client` | —                  |
| `/client/collaborators` | idem                     | real               |
| `/client/final-report`  | idem                     | UI-only, mock (D2) |
| `/client/tracking`      | idem                     | UI-only, mock (D2) |

## 8. Camada de dados

- Real: hooks Orval de `collaborator` — `useGetApiClientClientIdCollaborator`
  (lista), `useGetApiClientClientIdCollaboratorId` (detalhe/`view`),
  `usePostApiClientClientIdCollaborator` (criar),
  `useDeleteApiClientClientIdCollaboratorId` (excluir, via
  `ConfirmationModal`). Todos exigem `clientId` — origem: **D1 (resolvido)**.
- `clientId` do usuário externo logado: `loginFn`
  (`src/lib/auth-fns.ts`) lê `user.collaborator?.clientId` da resposta de
  `POST /api/auth/login` (`UserAdminDTO.collaborator?: CollaboratorDTO | null`,
  já presente no client gerado) e grava no cookie httpOnly selado
  (`session.server.ts` ganha campo `clientId?: string` ao lado de
  `accessToken`/`refreshToken`/`expiresAt`/`userId`). Fica disponível via
  contexto do router (mesmo padrão de `context.authed`), sem chamada extra
  ao Core nas telas de `/client/collaborators`. `UserDetailDTO`
  (`/api/profile/me`, fonte de `useUser()`) **não** tem `collaborator` —
  por isso o valor precisa ser persistido no login, não relido depois.
- Schema de criação: `CollaboratorCreate` é `{ userName, profile:
ProfileCreate }` — objeto aninhado, mas **não** precisa de `AddressGroup`
  (SPEC-SHARE-01, resolve especificamente o bloco `address` de
  `AddressCreate` — `ProfileCreate` não é um endereço). Segue o mesmo
  padrão já usado por `src/components/profile/detail-tab.tsx` (aba
  Detalhes do `ProfileModal`, SPEC-02): schema local em
  `src/lib/validation/collaborator.ts` **achata** os campos remapeando
  `PostApiClientClientIdCollaboratorBody.shape.profile.shape.<campo>` +
  `.shape.userName` num objeto flat (`fullName`, `document`, `email`,
  `phone`, `birthDate`, `userName`); o wrapper que chama
  `crud-record-modal` reagrupa em `{ userName, profile: {...} }` no
  `onSubmit` antes de disparar a mutation — sem `.refine`/regra nova, só
  remapeamento de shape (regra 2 do `AGENTS.md`). Sem dependência de
  SPEC-SHARE-01.
- UI-only: array local mockado (D2), comentado como nas SPECs anteriores —
  sem hooks Orval de `operation`/`romaneio`.

## 9. Desenho

```
src/routes/_dashboard/client/
  route.tsx                (guard: authed + área client)
  index.tsx                 (Home)
  collaborators/index.tsx    (crud-list-page + crud-record-modal — SPEC-02)
  final-report/index.tsx     (UI-only, mock local, D2)
  tracking/index.tsx          (idem)
```

## 10. Arquivos esperados

| Arquivo                                                | Ação                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/_dashboard/client/route.tsx`               | criar                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `src/routes/_dashboard/client/index.tsx`               | criar                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `src/routes/_dashboard/client/collaborators/index.tsx` | criar                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `src/routes/_dashboard/client/final-report/index.tsx`  | criar                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `src/routes/_dashboard/client/tracking/index.tsx`      | criar                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `src/lib/validation/collaborator.ts`                   | criar — schema achatado (remapeia `PostApiClientClientIdCollaboratorBody`, ver §8)                                                                                                                                                                                                                                                                                                                                          |
| `src/lib/session.server.ts`                            | editar — campo `clientId?: string` no shape da sessão selada                                                                                                                                                                                                                                                                                                                                                                |
| `src/lib/auth-fns.ts`                                  | editar — `loginFn` grava `user.collaborator?.clientId` na sessão (ver D1/§8)                                                                                                                                                                                                                                                                                                                                                |
| `src/layouts/AppShell/nav/client.ts`                   | **editar** (D3 — já existe, criado como placeholder pela SPEC-02 com URLs em português: `to: "/client/relatorio-final"`, `/client/acompanhamento`, `/client/colaboradores`; troca os 3 `to:` para `/client/final-report`, `/client/tracking`, `/client/collaborators`, inglês conforme §3. `labelKey`s ficam como estão — `navigation.client*` já existe e já está traduzido nos 4 locales, mesmo tratamento da SPEC-03 D4) |
| `src/i18n/dictionaries/*/client.json`                  | criar (4 locales) — conteúdo das telas (Home, colunas/campos de Colaboradores, textos de Relatório Final/Acompanhamento); **não** duplica as chaves `navigation.client*` que já existem em `navigation.json`                                                                                                                                                                                                                |

## 11. Critérios de aceitação

| #   | Critério                                                                                                                                                                                                                                                                            |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CA1 | Colaboradores faz criar/listar/detalhar/excluir real contra o Core (dev), escopado ao `clientId` persistido na sessão no login (D1) — confirma que a API `Collaborator` funciona de ponta a ponta, coisa que o legado nunca validou. **Sem** ação de editar (Core não expõe update) |
| CA2 | Usuário `Internal` não acessa `/client/*` (guard de área)                                                                                                                                                                                                                           |
| CA3 | Relatório Final/Acompanhamento não têm write real, e o array mockado local está comentado como tal no código (D2)                                                                                                                                                                   |
| CA4 | `bun run check` + `lint` passam                                                                                                                                                                                                                                                     |
| CA5 | `grep -n "PUT\|PATCH" src/routes/_dashboard/client/collaborators/index.tsx` não acha nada — nenhuma tentativa de "editar" Colaborador                                                                                                                                               |
| CA6 | `src/layouts/AppShell/nav/client.ts` aponta pras 3 rotas em inglês (`final-report`, `tracking`, `collaborators`), nenhum `to:` em português sobrevive                                                                                                                               |

## 12. Riscos

- **R1** — API `Collaborator` real nunca foi exercitada em produção (nem
  no legado) — pode ter lacuna de contrato não descoberta até implementar
  de verdade (mesma classe de risco que a aba Responsáveis, SPEC-07-08).
  Uma lacuna (origem do `clientId`) já apareceu nesta revisão e foi
  resolvida (D1) — pode haver outras, só descobertas ao implementar.
- **R2** — Não se aplica mais: D2 decidiu mock solto, não projeção de dado
  real, então o Acompanhamento não precisa modelar "etapas"/timeline contra
  o Core.
- **R3** (novo, desta revisão) — `Collaborator` não tem `PUT`/`PATCH` no
  Core (só `GET` lista, `GET` por id, `POST` criar, `DELETE`) —
  confirmado lendo `src/api/generated/endpoints/collaborator/collaborator.ts`
  e `src/api/generated/model/collaboratorCreate.ts` (não existe
  `collaboratorUpdate.ts`). "CRUD real" do §1 é, na prática, **CRD** — RF1/
  escopo/CA1 já ajustados acima. Baixo risco de implementação (não bloqueia
  nada, só reduz o que existe pra construir), mas registrar pra não
  prometer "editar" na UI por engano.

## 13. Decisões pendentes

- **D1 — resolvido.** Confirmado pelo usuário: o usuário externo logado é
  ele próprio um `Collaborator`, e o Core já expõe isso — `UserAdminDTO`
  (resposta de `POST /api/auth/login`) ganhou o campo
  `collaborator?: CollaboratorDTO | null` (mapa do Core atualizado,
  conferido em `src/api/generated/model/userAdminDTO.ts` e
  `collaboratorDTO.ts`, que tem `clientId`). Ressalva encontrada nesta
  rodada: `UserDetailDTO` (`GET /api/profile/me`, fonte de `useUser()` no
  resto do app) **não** ganhou o mesmo campo — só a resposta do login tem.
  Decisão do usuário: em vez de pedir mais uma mudança no Core, o
  `clientId` é lido de `user.collaborator?.clientId` dentro de `loginFn` e
  persistido no cookie httpOnly selado da sessão (extensão de
  `session.server.ts`) — ver §8. Não fica mais pendente.
- **D2 — resolvido.** Usuário confirmou a recomendação: mock solto (array
  local) para Relatório Final/Acompanhamento, sem projeção de
  `operation`/`romaneio` reais. Dependência de SPEC-07 cai por completo (ver
  cabeçalho). Se algum dia quiser projeção real, é escopo de SPEC futura.
- **D3** — Resolvido nesta revisão (mesmo padrão da SPEC-03 D4):
  `src/layouts/AppShell/nav/client.ts` **já existe** — foi criado pela
  SPEC-02 como placeholder (parte do CA12 dela, cobrindo os 5 `AreaId`), com
  `to:` em português (`/client/relatorio-final`, `/client/acompanhamento`,
  `/client/colaboradores`) que não batem com os segmentos em inglês desta
  SPEC (§3). Esta SPEC **edita**, não cria, trocando os 3 `to:` — ver §10.
  `labelKey`s (`navigation.clientHome`, `navigation.clientFinalReport`,
  `navigation.clientTracking`, `navigation.clientCollaborators`) continuam
  apontando pro namespace legado `navigation.json` (já existem, já
  traduzidos nos 4 locales) — não migram pro novo `client.json`, que fica só
  pro conteúdo das próprias telas.

---

## 14. Implementation Notes

**Arquivos criados**

- `src/routes/_dashboard/client/route.tsx` — guard `authed` (herdado do
  `/_dashboard` pai) + área `client` (`getUserAreas`), mesmo padrão de
  `src/routes/_dashboard/admin/route.tsx` (busca `profileMeQueryOptions`
  direto via `fetchMeFn` no `beforeLoad`, cache só se já quente). Também lê
  `clientId` via `getClientIdFn()` e devolve no contexto do router pras rotas
  filhas (mesmo padrão de `context.authed`).
- `src/routes/_dashboard/client/index.tsx` — Home, grid de 3 cards
  (`/client/collaborators`, `/client/final-report`, `/client/tracking`).
- `src/routes/_dashboard/client/collaborators/index.tsx` — CRD real
  (Create/Read/Delete) via `CrudListPage`/`CrudRecordModal`, escopado ao
  `clientId` do contexto (`getRouteApi("/_dashboard/client").useRouteContext()`).
  Sem ação de editar (Core não expõe `PUT`/`PATCH` — CA5).
- `src/routes/_dashboard/client/final-report/index.tsx` — UI-only, array
  mockado local (`// MOCK` no comentário), `MockDataBanner`.
- `src/routes/_dashboard/client/tracking/index.tsx` — idem.
- `src/lib/validation/collaborator.ts` — schema achatado remapeando
  `PostApiClientClientIdCollaboratorBody.shape.*` (zero Zod novo à mão).
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/client.json` — namespace novo
  (Home/Colaboradores/Relatório Final/Acompanhamento), sem duplicar
  `navigation.client*`.

**Arquivos editados**

- `src/lib/session.server.ts` — campo `clientId?: string` no `SessionData`.
- `src/lib/auth-fns.ts` — `loginFn` grava `user.collaborator?.clientId` na
  sessão; nova `getClientIdFn` (server fn de leitura, usada pelo guard).
- `src/layouts/AppShell/nav/client.ts` — 3 `to:` trocados de português para
  inglês (`final-report`, `tracking`, `collaborators`); `labelKey`s mantidos.
- `src/i18n/dictionaries.ts` — registra o namespace `client` (import estático
  pt-BR + entrada no objeto `ptBR`; en/es/zh entram sozinhos pelo
  `import.meta.glob` já existente).
- `src/routeTree.gen.ts` — regenerado (`bun run dev`, plugin do TanStack
  Router) para incluir as 5 rotas novas. Diff só aditivo (116 linhas
  inseridas, nada removido/reformatado).

**Comandos executados**

- `bun run lint` (baseline, antes de tocar em qualquer arquivo): `66 problems
  (3 errors, 63 warnings)` — VERIFIED, bate com o baseline informado.
- `bun run dev` (~15s em background, morto em seguida) — só para o plugin do
  TanStack Router regenerar `src/routeTree.gen.ts` com as rotas novas.
  VERIFIED (rotas `/_dashboard/client*` apareceram no arquivo gerado).
- `bun run check` (`tsc --noEmit`) — VERIFIED, zero erro.
- `bun run lint` (final) — VERIFIED, `66 problems (3 errors, 63 warnings)` —
  idêntico ao baseline, zero warning/erro novo.
- `bun run format` foi rodado uma vez durante a implementação e reformatou
  (estilo de aspas) uma quantidade grande de `src/api/generated/**` e de
  `specs/*.md` não relacionados a esta SPEC — **revertido** via
  `git checkout --` antes do commit (confirmado por `git diff --stat` vazio
  nesses caminhos). Nenhum arquivo gerado ou spec de outra SPEC ficou
  modificado no commit final; só os arquivos listados acima.
- `just map` — não rodado; o contrato do Core não mudou nesta SPEC (endpoints
  de `Collaborator` já existiam no client gerado).

**Critérios de aceitação**

| #   | Critério                                                                                  | Status                                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CA1 | Colaboradores faz criar/listar/detalhar/excluir real, escopado ao `clientId` da sessão      | PASS (hooks Orval reais — `usePostApiClientClientIdCollaborator`, `useGetApiClientClientIdCollaboratorId`, `useDeleteApiClientClientIdCollaboratorId`; não foi possível rodar E2E contra um Core ao vivo neste ambiente) |
| CA2 | Usuário `Internal` não acessa `/client/*`                                                  | PASS (guard `getUserAreas(...).includes("client")` no `beforeLoad`, mesmo padrão do `/admin`)                                                                                                                             |
| CA3 | Relatório Final/Acompanhamento sem write real, mock comentado como tal                     | PASS (`// MOCK` em ambos os arquivos, `MockDataBanner` visível)                                                                                                                                                           |
| CA4 | `bun run check` + `lint` passam                                                            | PASS (ver comandos acima)                                                                                                                                                                                                 |
| CA5 | `grep -n "PUT\|PATCH"` em `collaborators/index.tsx` não acha ação de editar                | PASS (única ocorrência é comentário explicando a ausência de editar)                                                                                                                                                      |
| CA6 | `nav/client.ts` aponta pras 3 rotas em inglês, nenhum `to:` em português sobrevive          | PASS                                                                                                                                                                                                                       |

**Lacuna de contrato encontrada (R1)**

`GET /api/client/{clientId}/collaborator` devolve `CollaboratorDTO[]` puro —
**sem** `items`/`total` nem parâmetros `Search`/`Offset`/`Limit`, diferente de
todo outro endpoint de listagem do Core usado até aqui (`PagedDTOOfXxxDTO`).
Contornado client-side: `collaborators/index.tsx` busca o array inteiro e
aplica busca/paginação em memória (`toPagedResult`), documentado em
comentário PT-BR no próprio arquivo — não altera nenhum schema Zod, só a
forma como a tela consome o array já existente. Fica registrado aqui como
achado de implementação (não bloqueou nada, mas é uma divergência de
contrato que outra SPEC/Core pode querer resolver adicionando paginação
real ao endpoint).

**Decisões tomadas durante a implementação**

- `clientId` exposto ao restante da árvore de rotas via `beforeLoad` de
  `/_dashboard/client` (retornado no objeto de contexto, não uma nova query
  Orval) — mesmo padrão de `context.authed` citado no §8 da spec, resolvido
  com uma nova server fn (`getClientIdFn`) em vez de estender o contexto do
  `__root` (mantém o escopo restrito à área `client`, sem tocar
  `__root.tsx`, que não estava na lista de arquivos esperados).
- Modal de `view` de Colaborador busca o detalhe fresco via
  `useGetApiClientClientIdCollaboratorId` (em vez de reusar o item já
  presente na lista) — exercita esse endpoint de ponta a ponta também,
  coerente com o objetivo do R1/CA1 de validar toda a superfície da API
  `Collaborator` nunca testada em produção.
- `titleKeys.edit` do `CrudRecordModal` (prop obrigatória do componente
  compartilhado) aponta pra mesma chave de `create` (`newTitle`) já que o
  modo `edit` nunca é acionado nesta tela — não é uma chave nova de i18n.

**Limitações conhecidas**

- Nenhuma verificação E2E contra um Core rodando de verdade nesta sessão —
  só leitura de contrato/tipos gerados (mesma ressalva já registrada na
  SPEC-04).
- Busca/paginação de Colaboradores é 100% client-side (ver R1 acima); numa
  base de colaboradores muito grande isso buscaria o array inteiro a cada
  refetch.

**Próximo passo:** nenhum — SPEC-09 implementada, sem `[NEEDS_DECISION]`
pendente.
