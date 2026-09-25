# SPEC-102 — Acessos por área (Laboratório e Operacional)

- **ID:** SPEC-102
- **Nome:** area-access
- **Status:** IMPLEMENTED (2026-09-25) — pedido do usuário ("Laboratorio ->
  Acessos / Operacional -> Acessos. Aqui é onde cada área vai cadastrar um
  novo acesso de usuário"), "fazer só no front". Branch
  `feat/102-area-access`, aguardando revisão/teste do usuário antes do
  merge em `main`.
- **Autor:** claude (2026-09-25)
- **Área:** `src/components/access/access-crud.tsx` (novo, extraído de
  `src/routes/_dashboard/admin/access/index.tsx`),
  `src/routes/_dashboard/_internal/{laboratory,operational}/access/`,
  `src/layouts/AppShell/nav/*`, `src/layouts/AppShell/index.tsx`.
- **Depende de (Core):** nada novo — usa `/api/user` como está.

---

## 1. Objetivo

Item **Acessos** nas seções Laboratório e Operacional da sidebar, com o
mesmo CRUD de usuários do Admin > Acesso, restrito aos papéis da área:

| Área | Rota | Papéis (`InternalRole`) |
| ---- | ---- | ----------------------- |
| Laboratório | `/laboratory/access` | `Laboratory` |
| Operacional | `/operational/access` | `Agent`, `Supervisor` |

## 2. Levantamento da API (Core `84ff8c6`)

- `GET/POST/PUT/DELETE /user` e `PATCH /user/{id}/roles`: `[RequireAdmin]`
  (`Controllers/User/User.Cruid.cs`, `User.Auth.cs:59`). **Só usuário
  `isAdmin` consegue usar a tela**; não-admin receberia 403.
- `GET /user` filtra `Role` **só quando `Type` também vem**
  (`User.Cruid.cs`, bloco `if (query.Type.HasValue) { … Role … }`). O
  Admin > Acesso mandava só `Role` → filtro de papel era ignorado.
- `Role` aceita um papel só (sem "Agent OU Supervisor").
- `POST /user` sempre cria `UserType.Internal`.
- Achado de segurança (fora do escopo, reportar ao backend):
  `POST /user/{id}/reset-password`, `PATCH /user/{id}/activate` e
  `/deactivate` têm só `[Authorize]` — qualquer usuário logado (inclusive
  externo) pode resetar senha / ativar / desativar qualquer usuário.

## 3. Escopo

- **RF1 — Componente único.** `AccessCrud` (extraído do Admin > Acesso) com
  prop `scopeRoles?: InternalRole[]`. Sem a prop = comportamento do Admin >
  Acesso.
- **RF2 — Filtro de papel com escopo.** Só os papéis da área, sem "Todos"
  (sem filtro traria usuários de outras áreas; Core não filtra por mais de
  um papel). Default = primeiro papel da área. Filtro de admin some.
- **RF3 — `Type` junto de `Role`.** Sempre que há filtro de papel manda
  `Type=Internal` — corrige também o filtro do Admin > Acesso.
- **RF4 — Form com escopo.** Multi-select de papéis só com os da área;
  switch "Administrador" some (valor atual do usuário é preservado). Novo
  acesso nasce com o primeiro papel da área.
- **RF5 — Preservar papéis de fora.** Ao salvar numa área, os papéis que o
  usuário já tinha fora do escopo são mantidos (editar em Laboratório não
  apaga `Agent`).
- **RF6 — Só admin.** Item da sidebar com `requiresAdmin` (flag nova em
  `NavItem`, filtrada no `AppShell`); rota com guard que manda não-admin
  pra home da área.
- **RF8 — Foto do usuário** (pedido do usuário: "implementar o upload de
  imagem como você fez no perfil"). `UserAvatarField` no topo do modal
  (`headerContent`), nas 3 telas de Acesso: upload imediato em
  `PATCH /api/user/{id}/avatar` (já existe no Core), limite 2 MB (igual ao
  perfil), só leitura em "visualizar". Modo criar: foto pendente, enviada
  depois do `POST`; falha no upload não desfaz o cadastro. **Sem remover
  foto salva** — o Core não tem rota de remover avatar de usuário (o "x"
  só descarta arquivo pendente).
- **RF7 — i18n.** `navigation.laboratorioAccess`,
  `navigation.operacionalAccess`, `access.laboratory.*`,
  `access.operational.*` nos 4 locales.

### Fora de escopo

- ASCS-73 (operações do cliente filtradas pelo token do colaborador +
  colaborador só leitura no backend): **precisa de Core** — `GET
  /operation` é `[RequireInternal]` e não filtra por cliente; nenhum
  endpoint de escrita checa `RequireExternal`. Não dá só no front.
- Área com admin "local" (admin só do Laboratório): o Core não tem esse
  conceito.

## 4. Riscos conhecidos

- Excluir usuário numa área exclui o usuário inteiro (mesmo que tenha
  papéis de outras áreas) — mesmo `DELETE /user/{id}` do Admin.
- Operacional mostra Agent **ou** Supervisor por vez (limitação do filtro
  do Core).

## 5. Critérios de aceite

- [ ] Admin vê "Acessos" em Laboratório e Operacional; não-admin não vê e,
      acessando a URL direto, volta pra home da área.
- [ ] Laboratório lista só usuários `Laboratory`; Operacional alterna
      Agente/Supervisor.
- [ ] Criar acesso no Laboratório → usuário nasce com `Laboratory`.
- [ ] Editar em Laboratório um usuário com `Agent` + `Laboratory` e salvar
      → continua com `Agent`.
- [ ] Admin > Acesso: filtro de papel passa a filtrar de verdade.
- [ ] Editar usuário → trocar foto sobe na hora; criar usuário com foto →
      foto enviada após o cadastro.
- [ ] `bun run check` e `bun run lint` limpos.
