# SPEC-05 — Administrativo: Clientes (lista real + detalhe UI-only)

- **ID:** SPEC-05
- **Nome:** administrativo-clientes
- **Status:** IMPLEMENTED
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/routes/_dashboard/_internal/administrative/clients/**` (nova)
- **Depende de:** SPEC-00 (namespaces do dicionário), SPEC-02
  (`crud-list-page`, `crud-record-modal` modo `view`, `mock-data-banner`),
  **SPEC-SHARE-01** (`AddressGroup`, pro campo `address` de Cliente — mesmo
  bloco reutilizável consumido por SPEC-04 pro campo `address` de Harbor;
  esta SPEC não pode mergear em `wave-2-parallel-areas` antes de
  SPEC-SHARE-01). **Não** depende de SPEC-04 — as duas consomem
  `AddressGroup` em paralelo, sem ordem entre si.

---

## 1. Objetivo

Portar Clientes: **lista real** (CRUD via `Client` API) e **detalhe do
cliente** — no legado 100% mock (`ClientDetailMockApi`, `RelatorioMockApi`).
Por decisão do usuário, telas mock do legado ganham SPEC agora como
**UI-only**: estrutura real, dado mockado de propósito, não bloqueado
esperando o Core.

**Real vs UI-only:** lista = real (`Client` API, já tem `ClientDetailDTO`
gerado — ver D1, pode já dar pra tornar o detalhe parcialmente real). Página
de detalhe = **UI-only** conforme decisão.

## 2. Contexto

Legado: `Clientes/Page.tsx` + `useClients.ts` — lista real, cards/lista,
busca, criar/editar, offcanvas de detalhe rápido. `ClientPage.tsx` — página
de detalhe completa (histórico, relatórios) 100% mock.

Achado relevante: o client gerado do NewPortal já tem `clientDetailDTO.ts`
— ou seja, **o Core pode já ter mais dado real do que o legado usava**. Essa
SPEC precisa, antes de implementar, checar se `GET /api/client/{id}` cobre o
que a tela de detalhe precisa, e só manter UI-only o que realmente não tem
endpoint (histórico de relatórios, por exemplo).

## 3. Escopo

1. `administrative/clients/index.tsx` (URL; rótulo continua "Clientes") —
   lista real: `crud-list-page`
   (SPEC-02) configurada com `Client` API.
2. Criar/editar — `crud-record-modal` (SPEC-02) modos `create`/`edit`,
   campos de `ClientCreate`/`ClientUpdate`.
3. Detalhes — **não é rota**, é `crud-record-modal` modo `view`, seguindo o
   padrão confirmado (listagem + criar/editar/detalhes tudo em modal, exceto
   Operações). O conteúdo do modal em modo `view` tem 2 seções:
   - Dados cadastrais: **real**, via `ClientDetailDTO` (`GET
/api/client/{id}`) — os mesmos campos do form, só read-only.
   - Relatórios/histórico associados: **UI-only**, array mockado, dentro do
     slot de conteúdo extra do modal (§9 da SPEC-02), com
     `mock-data-banner` (SPEC-02) acima, comentário `// MOCK — sem endpoint
no Core, ver specs/05-administrativo-clientes/spec.md`.

## 4. Fora do escopo

- Geração real de relatório de cliente (depende de backend que não existe —
  ver `Plans/Mapa-Paridade-Portal-Core.md`, "Relatórios operacionais:
  Faltante/não comprovado").
- Vínculo cliente↔colaborador (isso é escopo da SPEC-09, Client Area).

## 5. Requisitos funcionais

- **RF1** — Lista de clientes: CRUD real, paginação, busca, `ViewToggle`.
- **RF2** — Detalhe: dados cadastrais vêm do Core; a UI não trava se o
  detalhe real não tiver campo X que o mock antigo tinha — a seção mock fica
  visualmente separada (ex.: card "Relatórios (dados de exemplo)").
- **RF3** — Nenhuma chamada de rede fingindo ser real para a parte mock —
  dado mockado nunca passa por `fetch`/hook Orval.

## 6. Requisitos não funcionais

- RNF1 — `bun run check` + `lint` passam.
- RNF2 — Zero Zod à mão; reaproveita `clientCreate.zod`/`clientUpdate.zod`.

## 7. Contrato de rota

| Rota                      | Dado                                  |
| ------------------------- | ------------------------------------- |
| `/administrative/clients` | real (lista + modal create/edit/view) |

Sem rota `$id` — detalhe é o modal em modo `view`, aberto por clique na
linha/card, mesmo padrão de toda tela desta leva (exceto Operações).

## 8. Camada de dados

- Real: hooks Orval de `client` (`getApiClient`, `getApiClientId`, create/
  update/delete).
- UI-only: array local tipado no componente (não em `src/lib/queries/`, para
  não parecer uma query real).

## 9. Desenho

Tudo reaproveitado da SPEC-02, zero componente novo além de config:

```
src/routes/_dashboard/_internal/administrative/clients/
  index.tsx     (crud-list-page + crud-record-modal configurados p/ Client;
                 modo "view" injeta a seção de relatórios mock no slot extra)
```

**Campo `address` (Cliente)** — `ClientCreate.address`/`ClientUpdate.address`
são objeto aninhado (`AddressCreate`/`AddressUpdate`), mesma situação do
`HarborCreate.address` na SPEC-04. Esta SPEC **reusa** `AddressGroup`
(SPEC-SHARE-01) — não reimplementa. Por isso a dependência explícita de
SPEC-SHARE-01 no cabeçalho, em vez de SPEC-04 (que também só consome, não
é dona do campo).

## 10. Arquivos esperados

| Arquivo                                               | Ação                                                                                                                                                                                                                          |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/.../administrative/clients/index.tsx`     | criar                                                                                                                                                                                                                         |
| `src/layouts/AppShell/nav/administrative-clients.ts`  | criar (fragmento, SPEC-02 §3.1)                                                                                                                                                                                               |
| `src/i18n/dictionaries/*/administrative-clients.json` | criar (4 locales)                                                                                                                                                                                                             |
| `src/layouts/AppShell/nav/administrativo.ts`          | editar — remover o item `administrativoClients` (rota antiga `/administrativo/clientes`) hoje hard-coded; item equivalente passa a viver em `administrative-clients.ts`. Não mexer nos demais itens (escopo de SPEC-04/06/07) |
| `src/layouts/Form/Fields/Index.ts` / `map.tsx`        | **reusar** `AddressGroup` (SPEC-SHARE-01, não recriar)                                                                                                                                                                        |

## 11. Critérios de aceitação

| #   | Critério                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------- |
| CA1 | Lista faz CRUD real                                                                                       |
| CA2 | Detalhe: seção de cadastro é real, seção de relatórios é visivelmente mock e comentada como tal           |
| CA3 | `grep -n "MOCK"` em `administrative/clients/index.tsx` aponta exatamente a seção de relatórios, nada mais |
| CA4 | `bun run check` + `lint` passam                                                                           |
| CA5 | Não existe `clients/$id.tsx` — detalhe é só o modo `view` do modal                                        |

## 12. Riscos

- **R1** — Investir na UI de relatórios mock e o Core nunca vir a ter esse
  endpoint (módulo "Relatórios operacionais" está classificado "Faltante/não
  comprovado" no mapa de paridade). Aceito pela decisão do usuário — é
  UI-only deliberado.

## 13. Decisões pendentes

- **D1** — Resolvido: `ClientDetailDTO` confirmado — tem `address:
AddressDTO` (obrigatório, mesma situação de campo "grupo" do Harbor, ver
  §9) e `collaborations?: CollaboratorDTO[]`. `collaborations` existe na
  resposta mas fica **fora de escopo** desta SPEC (é SPEC-09, §4) — o modal
  `view` desta SPEC ignora esse campo deliberadamente, não precisa filtrar
  nem esconder ativamente, só não renderizar.
- **D2** — Resolvido pelo padrão confirmado: detalhe é o modal `view`, não
  rota nem offcanvas. Nada a decidir aqui.

---

**Próximo passo:** `APROVAR SPEC-05`.

## Implementation Notes

### Arquivos criados

- `src/routes/_dashboard/_internal/administrative/clients/index.tsx` — lista
  real + modal create/edit/view (`CrudListPage`/`CrudRecordModal`).
- `src/layouts/AppShell/nav/administrative-clients.ts` — fragmento de nav
  "Clientes" apontando pra `/administrative/clients` (reusa a chave i18n
  `navigation.administrativoClients`, já existente).
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-clients.json` —
  namespace novo (colunas, form, seções de detalhe, toasts, confirmação).

### Arquivos editados

- `src/i18n/dictionaries.ts` — registra o namespace `"administrative-clients"`
  no objeto `ptBR` (mesmo padrão de `"administrative-registry"`).
- `src/layouts/AppShell/nav/administrativo.ts` — remove o item
  `administrativoClients` (rota antiga `/administrativo/clientes`); os demais
  itens (`administrativoHome`, `administrativoOperations`,
  `administrativoLog`, `administrativoOccurrences`) não foram tocados.
- `src/routeTree.gen.ts` — regenerado por `vite build` (arquivo gerado, nunca
  editado à mão).

### Comandos executados e resultado

- `bun run lint` (baseline, antes de qualquer mudança): `EXIT 1` — 3 erros
  (`react-hooks/rules-of-hooks` em `src/lib/session.server.ts`, preexistente)
  + 63 warnings — `VERIFIED` (anotado como baseline).
- `bun run check` (baseline): `EXIT 0`, limpo — `VERIFIED`.
- `bun run check` (depois da implementação): `EXIT 0`, limpo — `VERIFIED`.
- `bun run lint` (depois da implementação): `EXIT 1` — exatamente os mesmos 3
  erros + 63 warnings do baseline (66 problemas nos dois casos), nenhum
  arquivo novo apontado — `VERIFIED` (zero regressão).
- `bun run build:azure`: falha com
  `ENOENT: .output/server/functions/index.mjs` — reproduzido também em cima
  do baseline (`git stash` + rebuild, antes de qualquer arquivo desta SPEC)
  com o **mesmo erro**, ou seja, é falha preexistente do worktree, não
  causada por esta implementação — `VERIFIED` (regressão descartada,
  problema não é desta SPEC). `vite build` sozinho (sem o patch do Nitro)
  passou limpo nas duas rodadas, e foi o que triggou a regeneração do
  `routeTree.gen.ts`.

### Critérios de aceitação

| # | Critério | Resultado |
| --- | --- | --- |
| CA1 | Lista faz CRUD real | PASS — `getGetApiClientQueryOptions`/`usePostApiClient`/`usePutApiClientId`/`useDeleteApiClientId`, mesmo padrão de Harbor/Product |
| CA2 | Detalhe: seção de cadastro real, seção de relatórios visivelmente mock e comentada | PASS — `fields` do modal vêm de `ClientDetailDTO` real; `ClientReportsSection` usa `MockDataBanner` + comentário `// MOCK — ...` |
| CA3 | `grep -n "MOCK"` aponta só a seção de relatórios | PASS — único hit é o comentário de `buildMockReports` |
| CA4 | `bun run check` + `lint` passam | PASS (check limpo; lint sem regressão frente ao baseline, mesmos 3 erros preexistentes) |
| CA5 | Não existe `clients/$id.tsx` | PASS — só `clients/index.tsx` |

### Decisões tomadas durante a implementação

- **`ClientDTO` (item de lista) não tem `address`/`razaoSocial`/`ie`/
  `observations`** (só `ClientDetailDTO` tem) — decisão técnica (não
  arquitetural, dentro do que a SPEC já previa em D1): `edit`/`view` nunca
  abrem direto do item de lista. Um clique em "ver"/"editar" dispara
  `GET /api/client/{id}` (`getGetApiClientIdQueryOptions`, via
  `useSsrSafeQuery`) e só monta o `CrudRecordModal` depois que o detalhe
  completo chega — evita o bug de "editar sobrescreve endereço/razão social
  com vazio" que aconteceria se o form partisse só do `ClientDTO` da lista.
  Enquanto a busca do detalhe está em voo, o botão da linha mostra um
  `Spinner` no lugar do ícone e fica desabilitado; erro de rede mostra toast
  (`administrative-clients.toast.loadError`) e cancela a abertura.
- **Campo `document`** — `ClientCreate.document`/`ClientUpdate.document` têm
  `min(14).max(14)` (exatamente 14 dígitos) — só CNPJ é matematicamente
  possível (CPF tem 11). Usado `InputCNPJ` (não `InputDocument`, que aceita
  CPF **ou** CNPJ, usado em `admin/access` pra pessoa física/jurídica).
- **`collaborations` (`ClientDetailDTO`)** — ignorado deliberadamente
  (confirma D1 da SPEC: escopo é SPEC-09), não renderizado nem filtrado.
- **Seção de relatórios mock** — 2 registros fixos (`buildMockReports`),
  tabela Bootstrap simples (nome/tipo/data/status), sem nenhuma chamada de
  rede (RF3) — array local no componente, não em `src/lib/queries/`.

### Limitações conhecidas

- `bun run build:azure` está quebrado neste worktree antes e depois desta
  SPEC (`ENOENT .output/server/functions/index.mjs`) — problema do
  `scripts/patch-nitro-azure-swa.mjs`/toolchain do worktree, fora do escopo
  da SPEC-05 (nenhum arquivo tocado por esta implementação afeta a etapa que
  falha). Recomenda-se abrir isso como item separado se bloquear deploy.
- Não há suíte de teste automatizado; validação foi por leitura de código +
  `tsc`/`eslint` (sem servidor dev rodando neste ambiente sandboxed).
