# SPEC-03 — Admin: Acesso (usuários) e Perfis

- **ID:** SPEC-03
- **Nome:** admin-access
- **Status:** DRAFT
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
   permissões — conteúdo i18n, sem tabela dinâmica de "que rota cada role
   acessa" (isso seria derivado de `nav-config.ts` da SPEC-02, ver D1).

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
- **RF5** — `admin/perfis` renderiza sem chamada ao Core (conteúdo estático
  do bundle, i18n).

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
| `src/layouts/AppShell/nav-config.ts` | editar (seção Admin) |
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

## 13. Decisões pendentes

- **D1** — `admin/roles` (URL; rótulo exibido continua "Perfis") deriva a lista "o que cada role acessa" do
  `nav-config.ts` (dinâmico, sempre correto) ou é texto estático mantido à
  mão (como o legado, com risco de ficar desatualizado)? Recomendação:
  dinâmico.
- **D2** — Reset de senha gera senha aleatória e mostra uma vez (como
  costuma ser o padrão do Core) ou envia link por e-mail? Depende do que
  `POST /api/user/{id}/reset-password` já faz no Core — confirmar contrato.

---

**Próximo passo:** `APROVAR SPEC-03`.
