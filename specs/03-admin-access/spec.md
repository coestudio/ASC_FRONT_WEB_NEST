# SPEC-03 — Admin: Acesso (usuários) e Perfis

- **ID:** SPEC-03
- **Nome:** admin-access
- **Status:** IN_PROGRESS
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/routes/_dashboard/admin/**` (nova — irmã de `_internal`, não
  filha, ver §3.1), `src/lib/queries/**`
- **Depende de:** SPEC-00 (namespaces do dicionário), SPEC-02 (nav,
  `crud-list-page`, `crud-record-modal`, `ConfirmationModal`, `ViewToggle`)

---

## 1. Objetivo

Portar a área Admin: **Acesso** (CRUD de usuário — a única tela de escrita
real desta SPEC) e **Perfis** (página estática de referência de roles, sem
API).

**Real vs UI-only:** Acesso é 100% real (`User`/`Access` API). Perfis é
conteúdo estático (texto descritivo dos papéis), não é "mock de dado" —
é documentação in-app, sem pretensão de vir do backend.

## 2. Contexto

Legado: `Pages/Admin/Acesso/Page.tsx` + `List.tsx` + `Create/` (CRUD real via
`UserApi`, toggle cards/lista, modal criar/editar, confirmação de delete e de
reset de senha) e `Pages/Admin/Acesso/RolesPage.tsx` (array hardcoded
descrevendo cada role e o que ela vê/acessa — page de referência, não CRUD).

NewPortal: rota `_dashboard` já protege por `context.authed`; falta o guard
de `admin` (hoje só `_internal` existe, cobrindo administrativo/operacional/
laboratorio). `admin` é meio-irmão de `_internal` na regra de
`getUserAreas` (`isAdmin` dentro de Internal) — precisa de grupo de rota
próprio com guard equivalente.

## 3. Escopo

Segmentos de rota em inglês (regra 6 do `AGENTS.md`, aplicada a URL também
— não só arquivo): `acesso`→`access`, `perfis`→`roles`. O rótulo exibido ao
usuário (menu, título de página) continua em português via i18n; só a URL
muda.

1. Grupo de rota `src/routes/_dashboard/admin/` (fora de `_internal` — guard
   próprio: `context.authed` + `getUserAreas(user).includes("admin")`).
2. `admin/access/index.tsx` — `crud-list-page` (SPEC-02) configurada com
   `GetApiUser`, colunas: nome, usuário, email, perfil, status, tipo, criado
   em.
3. Criar/editar/detalhes — `crud-record-modal` (SPEC-02) nos 3 modos, campos
   de `UserCreate`/`UserUpdate` (validação = schema gerado, zero Zod à mão).
   **Não** um form local próprio da tela.
4. Ações por linha: ativar/desativar, reset de senha (via `ConfirmationModal`
   da SPEC-02), deletar.
5. `admin/roles/index.tsx` — página estática, uma entrada por role
   (`InternalRole`, ver `userAdminDTO`/`internalRole` gerados), descrição de
   permissões — conteúdo i18n **mantido à mão** (decisão D1: estática, não
   deriva de `nav/*.ts` nem de `GetApiUserRoles`). Validar mapeamento de
   roles contra o enum `InternalRole` do Core antes de escrever o texto
   (ver R1).
6. Campo `roles: InternalRole[]` no form de criar/editar usuário (`crud-
   record-modal`) usa um **multi-select dropdown novo**
   (`layouts/Form/Fields/InputMultiSelect.tsx`, decisão D3) — um único
   dropdown com seleção múltipla, populado via `useGetApiUserRoles()`
   (`EnumOptionDTO[]`, label vindo do Core).

## 4. Fora do escopo

- Qualquer edição de permissão granular por rota (não existe no Core hoje).
- Auditoria de quem mudou o quê (isso seria "Log", SPEC-06, UI-only).

## 5. Requisitos funcionais

- **RF1** — Lista pagina/ordena/filtra via `Query` do Core (mesmo padrão de
  paginação documentado em `warren/Core/AGENTS.md`).
- **RF2** — Criar usuário valida com o schema gerado (`UserCreate` zod),
  envia, invalida a lista.
- **RF3** — Editar usuário idem com `UserUpdate`.
- **RF4** — Reset de senha e desativar/ativar passam por `ConfirmationModal`
  antes de disparar a mutation.
- **RF5** — `admin/roles` renderiza sem chamada ao Core (conteúdo estático
  do bundle, i18n; decisão D1).
- **RF6** — Campo `roles` do form de usuário é um `InputMultiSelect`
  (decisão D3, novo Field em `layouts/Form/Fields/`), populado via
  `useGetApiUserRoles()`, integrado a `react-hook-form`/`zodResolver` como
  qualquer outro Field da biblioteca (regra 10 do `AGENTS.md`).

## 6. Requisitos não funcionais

- RNF1 — `bun run check` + `lint` passam.
- RNF2 — Zero schema Zod escrito à mão (regra inviolável do projeto).
- RNF3 — Nomes de arquivo em inglês, comentário em PT-BR, texto via `useT()`.

## 7. Contrato de rota

| Rota | Guard | Componente |
| --- | --- | --- |
| `/admin` (redirect) | `authed` + área `admin` | → `/admin/access` |
| `/admin/access` | idem | lista |
| `/admin/roles` | idem | estática |

## 8. Camada de dados

- Hooks Orval de `user` (`src/api/generated/endpoints/user/**`) — já
  existem, cobrem CRUD + paginação + avatar + roles/types lookup.
- `queryOptions` isolada só se precisar semear no SSR (provavelmente não —
  lista paginada é client-only, como o padrão já documentado).

## 9. Desenho

```
src/routes/_dashboard/admin/
  route.tsx              (guard de área "admin")
  index.tsx               (redirect → acesso)
  access/
    index.tsx              (<CrudListPage> + <CrudRecordModal> da SPEC-02,
                            config de colunas/campos de User — sem
                            componente de form próprio)
  roles/
    index.tsx               (conteúdo estático)
```

## 10. Arquivos esperados

| Arquivo | Ação |
| --- | --- |
| `src/routes/_dashboard/admin/route.tsx` | criar |
| `src/routes/_dashboard/admin/access/index.tsx` | criar |
| `src/routes/_dashboard/admin/roles/index.tsx` | criar |
| `src/layouts/Form/Fields/InputMultiSelect.tsx` | criar (decisão D3 — dropdown único, seleção múltipla, wrapper `react-hook-form`/`Controller` igual aos demais Fields) |
| `src/layouts/Form/Fields/Index.ts` | editar (exportar `InputMultiSelect`) |
| `src/layouts/AppShell/nav/admin.ts` | **editar** (já existe, portado como placeholder pela SPEC-02 com URLs em português e um link quebrado — trocar `to: "/admin/acesso"` → `/admin/access` e `to: "/admin/acessos"` → `/admin/roles`, decisão D4) |
| `src/i18n/dictionaries/*/admin.json` | criar (4 locales) |

## 11. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Usuário sem `admin` em `getUserAreas` recebe redirect ao acessar `/admin/*` |
| CA2 | Criar/editar/desativar/reset de senha funcionam contra o Core real |
| CA3 | `grep` não acha `z.object`/`.refine` novo em `admin/**` (zero Zod à mão) |
| CA4 | `bun run check` + `lint` passam |
| CA5 | `admin/access/**` não define nenhum componente de lista/form próprio — só config passada a `crud-list-page`/`crud-record-modal` (SPEC-02) |

## 12. Riscos

- **R1** — `InternalRole` pode não cobrir 1:1 as roles descritas no
  `RolesPage.tsx` do legado — validar mapeamento antes de escrever o texto
  estático (não inventar role que não existe no enum do Core).
- **R2** — `admin/roles` é conteúdo estático mantido à mão (D1): risco
  conhecido e aceito de ficar desatualizado se o Core ganhar role nova ou
  mudar o que uma role acessa — sem mecanismo automático de alerta. Mitigação:
  revisar manualmente quando `nav/*.ts` ganhar item novo numa área
  restrita por role.

## 13. Decisões pendentes

- **D1** — Resolvido (confirmado pelo usuário): **estática**. `admin/roles`
  (URL; rótulo exibido continua "Perfis") é texto mantido à mão, não deriva
  de `nav/*.ts` nem de `GetApiUserRoles` — mesmo padrão do legado
  (`RolesPage.tsx`). Risco de ficar desatualizado aceito e registrado em R2.
- **D2** — Resolvido (confirmado pelo usuário): o Core **envia a nova senha
  por e-mail** ao usuário-alvo (`POST /api/user/{id}/reset-password`), não
  devolve senha nem link no corpo da resposta (`MessageDTO.message` é só
  texto de confirmação, ex.: "e-mail enviado"). Implicações pra UI:
  - Ação de reset abre `ConfirmationModal` (SPEC-02) explicando que uma nova
    senha será enviada por e-mail ao usuário; ao confirmar, dispara
    `usePostApiUserIdResetPassword` e mostra toast com o `message` retornado.
  - **Não** implementar exibição de senha gerada nem botão de copiar — o
    valor não trafega pro front.
  - Linha/registro sem `profile.email` preenchido (campo `email?: string |
    null` em `ProfileDTO`): a ação de reset deve ficar desabilitada (tooltip
    explicando "usuário sem e-mail cadastrado") em vez de disparar a mutation
    e deixar o Core falhar — evita erro genérico sem contexto pro
    administrador.
- **D3** — Resolvido (confirmado pelo usuário): **multi-select dropdown**.
  Campo `roles: InternalRole[]` no form de criar/editar usuário usa um Field
  novo, `InputMultiSelect` (`layouts/Form/Fields/InputMultiSelect.tsx`) — um
  único dropdown com seleção múltipla (não checkboxes soltos, não múltiplos
  selects). Segue o wrapper `Controller`/Bootstrap dos demais Fields da
  biblioteca (regra 10 do `AGENTS.md`); opções vêm de `useGetApiUserRoles()`
  (`EnumOptionDTO[]`, label já traduzido pelo Core). É o primeiro Field de
  seleção da biblioteca — abre precedente reutilizável pras próximas SPECs
  que precisarem de enum/lookup em dropdown.
- **D4** — Resolvido (confirmado pelo usuário): **corrigir, não criar**.
  `src/layouts/AppShell/nav/admin.ts` já existe (portado como placeholder
  pela SPEC-02) com URLs em português e um link quebrado
  (`to: "/admin/acessos"` duplicando o padrão de "/admin/acesso" em vez de
  apontar pra página de perfis). Esta SPEC edita esse arquivo — não cria —
  trocando os dois `to:` para `/admin/access` e `/admin/roles` (inglês,
  conforme §3), mantendo `labelKey` como já estão
  (`navigation.adminAccess`/`navigation.adminAccessProfiles`, já presentes
  em `navigation.json`).

---

## 14. Implementation Notes (checkpoint parcial — status IN_PROGRESS)

Branch: `spec-03-admin-access` (a partir de `wave-2-parallel-areas`, a partir
de `SPECS-LEGADO`).

**Arquivos alterados/criados:**
- `src/routes/_dashboard/admin/route.tsx` (guard `admin`), `index.tsx`
  (redirect), `access/index.tsx` (lista + CRUD real), `roles/index.tsx`
  (estática, ver limitação abaixo).
- `src/layouts/Form/Fields/InputMultiSelect.tsx` (novo Field, decisão D3) +
  `Index.ts`/`map.tsx`/`Form/types/Input.tsx` editados pra suportar
  `config.options`.
- `src/layouts/AppShell/nav/admin.ts` — corrigido pra `/admin/access` e
  `/admin/roles` (decisão D4).
- `src/data/admin-roles.ts` — array vazio, ver limitação.
- `src/i18n/dictionaries/*/access.json` (4 locales) — **achado durante a
  implementação**: o namespace `access` já existia pré-semeado (SPEC-02) com
  quase todas as chaves necessárias (`title`, `colName`, `form.*`, etc.) —
  usado no lugar de criar `admin.json` novo (§10 original da spec citava
  `admin.json`, corrigido na prática para reuso de `access.json` + chaves
  novas: `viewUser`, `colActions`, `actions.*`, `confirm.*`, `toast.*`,
  `rolesTitle`, `rolesDescription`, `rolesEmpty`).
- `src/components/site/SiteHeader.tsx` — **fora do escopo da SPEC-03**, mas
  corrigido como efeito colateral necessário: a regeneração obrigatória de
  `src/routeTree.gen.ts` (rotas novas) expôs que esse componente (já
  marcado `// STUB` no código) linkava pra rotas (`/servicos`, `/politicas`,
  `/galerias`, `/duvidas`, `/contato`) removidas há muito tempo (commit
  `b4a5206`) sem nunca ter tido o `routeTree.gen.ts` regenerado desde então
  — `bun run check` estava "passando" só porque a árvore de rotas commitada
  estava desatualizada. Troquei os `Link to=` quebrados por `<span>` pra não
  quebrar o check; migração real do header do site é outra frente, não
  desta SPEC.

**Comandos executados:**
- `bun run check` → **VERIFIED**, 0 erros.
- `bun run lint` → **VERIFIED** só quanto a não ter introduzido erro/warning
  novo: baseline do repo (antes desta SPEC, com tudo stashed) já falha com
  "65 problems (3 errors, 62 warnings)" — os 3 erros são pré-existentes em
  `src/lib/session.server.ts` (`react-hooks/rules-of-hooks`, commit antigo
  `4b8479c`, não tocado por esta SPEC). Depois das mudanças desta SPEC: os
  mesmos "65 problems (3 errors, 62 warnings)" — zero novo, confirmado por
  `git stash -u` + `bun run lint` antes/depois.
- `just map` — não rodado (contrato do Core não mudou nesta SPEC).

**Critérios de aceitação (parcial):**
| # | Critério | Status |
| --- | --- | --- |
| CA1 | Redirect de `/admin/*` sem área `admin` | Implementado (guard em `route.tsx`), não testado contra Core rodando nesta sessão |
| CA2 | Criar/editar/desativar/reset de senha reais | Implementado (hooks Orval reais), não testado end-to-end contra Core rodando |
| CA3 | Zero `z.object`/`.refine` novo em `admin/**` | PASS — `grep` não encontra |
| CA4 | `bun run check` + `lint` passam | `check` PASS; `lint` sem regressão (baseline pré-existente já falhava) |
| CA5 | `admin/access/**` só configura `crud-list-page`/`crud-record-modal` | PASS |

**Limitação conhecida — parcialmente resolvida:**
O usuário rodou `just map` contra o Core de dev real durante a sessão, o
que trouxe `src/api/generated/static/getApiUserRoles.ts` — snapshot
estático real (`InternalRole` 100=Agente, 200=Supervisor, 300=Laboratório,
com nomes em pt/en/es/zh). `src/data/admin-roles.ts` foi reescrito pra
importar esse snapshot em vez de ficar vazio — nomes e valores agora são
reais (não inventados), mantendo D1 (estático, sem chamada ao Core em
runtime — o import é build-time de um arquivo já commitado). Ainda
**falta a descrição de cada perfil** ("o que ele vê/acessa no NewPortal")
— não existe no snapshot (só nome+valor) e não foi fornecida; cada card
mostra um texto placeholder explícito
(`"Descrição do que este perfil acessa ainda não confirmada..."`) em vez de
texto chutado.

Também corrigido durante essa verificação: `resolveEnumOptionName()` em
`admin/access/index.tsx` — a chave de idioma de `EnumOptionDTO.name` usa
2 letras (`pt`/`en`/`es`/`zh`), não bate com `Locale` (`"pt-BR"`); o
multi-select de `roles` no form estava resolvendo o label errado antes
dessa correção.

**Precisa de:** a descrição de cada perfil (o que Agente/Supervisor/
Laboratório acessam no NewPortal) antes de RF5/CA poderem ser PASS e o
status avançar pra `IMPLEMENTED`.

Status mantido em `IN_PROGRESS` até essa lacuna ser resolvida (ou o usuário
decidir aceitar o texto placeholder como entrega desta rodada, o que seria
uma nova decisão explícita a registrar aqui).

---

**Próximo passo:** fornecer a descrição de cada perfil (ou confirmar
aceitar o placeholder) para fechar `IMPLEMENTED`.
