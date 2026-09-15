# SPEC-04 — Administrativo: Cadastros (Terminal, Porto, Container, Navio, Produto)

- **ID:** SPEC-04
- **Nome:** administrativo-cadastros
- **Status:** IMPLEMENTED
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/routes/_dashboard/_internal/administrative/registry/**` (nova)
- **Depende de:** SPEC-00 (namespaces do dicionário), SPEC-02
  (`crud-list-page`, `crud-record-modal` — esta SPEC só configura, não cria
  os componentes), **SPEC-SHARE-01** (`AddressGroup`, pro campo `address`
  de Harbor, e `SelectAsync`, pro campo `harborId` de Terminal — nenhum dos
  dois é criado aqui, só consumido; esta SPEC não pode mergear em
  `wave-2-parallel-areas` antes de SPEC-SHARE-01)

---

## 1. Objetivo

Portar as 5 telas de cadastro básico, todas com o **mesmo padrão** de CRUD
paginado: Terminal, Porto (Harbor), Container, Navio (Vessel), Produto.
Uma SPEC só porque é o mesmo desenho repetido 5x — evita 5 documentos quase
idênticos.

**Real vs UI-only:** 100% real, as 5. Cada uma já tem client Orval gerado
completo (CRUD + paginação) — `terminal`, `harbor`, `container`, `vessel`,
`product`.

## 2. Contexto

Legado: `Cadastro/Page.tsx` despacha por `:tipo` (rota única parametrizada)
para `TerminalPage`/`PortoPage`/`ContainerPage`/`Vessel/Page`/`ProdutoPage`,
cada uma com seu `useXxx.ts` (hook local de fetch+mutação) — mas o NewPortal
já centraliza isso em `queryOptions`/hooks Orval, então o hook local do
legado **não é portado como padrão**, só a forma da tela.

## 3. Escopo

1. Rota `administrative/registry/` (URL; rótulo exibido continua
   "Administrativo > Cadastro") com sub-rotas por tipo (rotas próprias,
   **não** um `$tipo` dinâmico dispatchando componente — ver D1) para cada
   um dos 5 cadastros.
2. Cada tela: lista paginada + busca + `ViewToggle` + criar/editar (modal) +
   deletar (`ConfirmationModal`).
3. Campos por cadastro (a partir dos DTOs gerados):
   - **Terminal** — `TerminalCreate`/`Update`. `harborId` (FK obrigatória
     pra Harbor) usa `SelectAsync` (SPEC-SHARE-01 — autocomplete por
     digitação sobre `getApiHarbor`), não um `<select>` populado de uma vez
     (lista de portos pode crescer).
   - **Porto (Harbor)** — `HarborCreate`/`Update` (só `name` + `address`;
     **não** inclui terminais — relação é inversa, ver RF4).
   - **Container** — `ContainerCreate`/`Update`.
   - **Navio (Vessel)** — `VesselCreate`/`Update`.
   - **Produto** — `ProductCreate`/`Update`.

## 4. Fora do escopo

- Vínculo de container a uma operação específica (isso é
  `operation-container`, escopo da SPEC-07).
- Import em lote de qualquer um desses cadastros (o legado não tem; Core
  também não expõe).
- Edição do vínculo Harbor↔Terminal (associar/desassociar) — nesta SPEC o
  vínculo é só leitura (ver D2, §13). Anotado como trabalho futuro.

## 5. Requisitos funcionais

- **RF1** — Cada lista pagina/ordena/busca via `Query` do respectivo módulo.
- **RF2** — Criar/editar validam com o schema Zod **gerado** do respectivo
  módulo (`terminalCreate.zod` etc.) — zero Zod à mão.
- **RF3** — Deletar passa por `ConfirmationModal`.
- **RF4** — Harbor mostra terminais relacionados via consulta separada
  (`TerminalDTO.harborId` é quem referencia o Harbor, não o inverso — não
  existe campo de terminais no `HarborDTO`): `getApiTerminal({ HarborId:
harbor.id })` disparado dentro do `extraContent` do `crud-record-modal`
  (mesmo mecanismo já usado pela SPEC-05), mesmo que só leitura nesta SPEC —
  vínculo editável é `[NEEDS_DECISION]`, ver D2.

## 6. Requisitos não funcionais

- RNF1 — `bun run check` + `lint` passam.
- RNF2 — As 5 telas compartilham o **mesmo componente de lista/form
  genérico** sempre que os campos permitirem (evitar 5 cópias quase iguais)
  — ver §9.

## 7. Contrato de rota

| Rota                                 | Componente           |
| ------------------------------------ | -------------------- |
| `/administrative/registry/terminal`  | lista+form Terminal  |
| `/administrative/registry/harbor`    | lista+form Harbor    |
| `/administrative/registry/container` | lista+form Container |
| `/administrative/registry/vessel`    | lista+form Vessel    |
| `/administrative/registry/product`   | lista+form Produto   |

Nomes de segmento em inglês por regra do projeto (regra 6, aplicada a URL
também — decisão confirmada, D3 resolvido): `administrativo`→`administrative`,
`cadastro`→`registry`, `porto`→`harbor`, `navio`→`vessel`, `produto`→`product`.
O rótulo exibido (i18n) continua em português para o usuário.

## 8. Camada de dados

Hooks Orval de `terminal`, `harbor`, `container`, `vessel`, `product` —
todos já gerados com CRUD + `PagedDTO`. Harbor usa adicionalmente
`useGetApiTerminal` (filtro `HarborId`) só para popular a lista de
terminais relacionados no detalhe/modal (RF4) — não é o hook de CRUD
principal da tela.

## 9. Desenho

`crud-list-page`/`crud-record-modal` já existem (SPEC-02) — aqui é só
configuração por módulo, sem recriar lista/form.

**Campo `address` (Harbor)** — `HarborCreate.address` é objeto aninhado
(`AddressCreate`). Usa `AddressGroup` (SPEC-SHARE-01, não criado aqui) —
bloco de campos de endereço reutilizável, também consumido por SPEC-05 pro
campo `address` de Cliente. Nenhuma extensão de `RenderFields`/`LayoutField`
acontece nesta SPEC — só configuração do campo `address` como `AddressGroup`
na config do form de Harbor.

**Campo `harborId` (Terminal)** — FK obrigatória, sem tela dedicada de
"escolher Harbor" no legado (que usava `<Form.Select>` populado com todos
os portos de uma vez). Usa `SelectAsync` (SPEC-SHARE-01, não criado aqui)
configurado sobre o hook Orval de `harbor` (`useGetApiHarbor` com
`Search`).

```
src/routes/_dashboard/_internal/administrative/registry/
  terminal/index.tsx      (usa crud-list-page + config de colunas/campos de Terminal)
  harbor/index.tsx
  container/index.tsx
  vessel/index.tsx
  product/index.tsx
```

Cada rota só declara a **config** (colunas, campos do form, schema);
lista/modal/paginação/confirmação/detalhes vêm do componente genérico da
SPEC-02.

## 10. Arquivos esperados

| Arquivo                                                                                       | Ação                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/.../administrative/registry/{terminal,harbor,container,vessel,product}/index.tsx` | criar (5)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `src/layouts/AppShell/nav/administrative-registry.ts`                                         | criar (fragmento, SPEC-02 §3.1)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `src/i18n/dictionaries/*/administrative-registry.json`                                        | criar (4 locales)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `src/layouts/AppShell/nav/administrativo.ts`                                                  | editar — remover os 5 itens de registry (`administrativoVessel`, `administrativoContainer`, `administrativoTerminal`, `administrativoHarbor`, `administrativoProduct`) hoje hard-coded com rotas antigas em PT; migram pro fragmento novo acima. Não mexer nos demais itens (`administrativoClients`, `administrativoOperations` — escopo de SPEC-05/07. `administrativoLog`/`administrativoOccurrences` **não têm mais spec que os remova** — SPEC-06 cancelada; ficam órfãos no fragmento legado, apontando pra rota antiga, até decisão futura) |

## 11. Critérios de aceitação

| #   | Critério                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------ |
| CA1 | As 5 telas fazem CRUD real contra o Core (dev)                                                                     |
| CA2 | Nenhuma valida com Zod escrito à mão                                                                               |
| CA3 | As 5 telas reusam `crud-list-page`/`crud-record-modal` da SPEC-02 (não criam nem copiam componente próprio)        |
| CA4 | `bun run check` + `lint` passam                                                                                    |
| CA5 | Form de Terminal resolve `harborId` via `SelectAsync` (SPEC-SHARE-01), não `<select>` estático populado de uma vez |
| CA6 | Form de Harbor resolve `address` via `AddressGroup` (SPEC-SHARE-01), não campos `Input*` soltos repetidos          |

## 12. Riscos

- **R1** — Componente genérico ficar genérico demais e difícil de estender
  quando uma tela precisar de algo único (ex.: Harbor com terminais
  relacionados). Mitigação: genérico cobre 80%, cada rota pode compor JSX
  extra ao redor.

## 13. Decisões pendentes

- **D1** — Resolvido: rota por tipo fixo (roteamento file-based não combina
  bem com dispatch por `$tipo` do jeito que o legado fazia), não replica o
  `Cadastro/Page.tsx` dinâmico do legado. Cada rota importa diretamente o
  tipo/schema **gerado** (`TerminalCreate`, `HarborCreate` etc.) — se o
  contrato do Core mudar e `just map` regenerar um shape diferente, a config
  da rota quebra em `tsc --noEmit` (RNF1/CA4), não silenciosamente em
  runtime. Nenhum tipo `any`/cast solto pra contornar isso.
- **D2** — Resolvido: vínculo Harbor↔Terminal é **só leitura** nesta SPEC
  (lista de terminais via `getApiTerminal({HarborId})`, RF4/§8/§9). Edição
  do vínculo (associar/desassociar Terminal a um Harbor) fica fora de
  escopo — anotado como trabalho futuro, sem SPEC própria ainda.
- **D3** — Resolvido: todos os segmentos de rota desta SPEC em inglês
  (`administrative/registry/{terminal,harbor,container,vessel,product}`),
  rótulo em português pro usuário via i18n.
- **D4** — Resolvido pela SPEC-02 + regra inviolável 10 do `AGENTS.md`:
  componente genérico mora em `components/crud/`; cada campo do form é
  `layouts/Form/Fields/*` (nunca `components/ui`, que não tem mais input
  nenhum depois da migração da SPEC-02). Campos compostos/de seleção
  reusados por mais de uma SPEC (`address`, `harborId`) não nascem aqui —
  são `AddressGroup`/`SelectAsync` de SPEC-SHARE-01, só consumidos por
  config — ver §9.

---

**Próximo passo:** nenhum — SPEC concluída.

---

## Implementation Notes

- **Arquivos criados:**
  - `src/routes/_dashboard/_internal/administrative/registry/{terminal,harbor,container,vessel,product}/index.tsx`
    — as 5 telas, cada uma configurando `CrudListPage`/`CrudRecordModal`
    (SPEC-02) com colunas/campos/schema do próprio módulo Orval.
    - **Terminal**: campo `harborId` via `SelectAsync` (SPEC-SHARE-01)
      configurado sobre `getApiHarbor({Search})`; coluna "Porto" resolvida
      por `HarborNameCell` (lookup `useGetApiHarborId` via `useSsrSafeQuery`,
      já que `TerminalDTO` só tem `harborId`, não o nome).
    - **Harbor**: campo `address` via `AddressGroup` (SPEC-SHARE-01);
      `extraContent` do modal em modo `view` mostra terminais relacionados
      (RF4) via `getGetApiTerminalQueryOptions({HarborId})`, só leitura.
    - **Container**: campo `tara` (decimal opcional) como `InputText` — não
      há Field de decimal simples na biblioteca (`InputNumber` força mínimo
      1 e é inteiro, `InputMoney` é formatado como moeda); o schema já aceita
      `number | string`, e a normalização de `""` → `null` (ver abaixo) cobre
      o caso vazio.
    - **Vessel**/**Product**: só `name`, sem nada especial.
  - `src/layouts/AppShell/nav/administrative-registry.ts` — fragmento com os
    5 itens de cadastro, área `administrativo`, apontando pras rotas novas.
  - `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-registry.json` —
    namespace novo (chave `"administrative-registry"`, mesma string do nome
    do arquivo — ver decisão abaixo) com título/descrição/colunas/form/toast/
    confirm por módulo.
- **Arquivos editados:**
  - `src/layouts/AppShell/nav/administrativo.ts` — removidos os 5 itens de
    cadastro (migraram pro fragmento novo); mantidos Home/Clientes/Operações
    (SPEC-05/07) e Log/Ocorrências (órfãos, SPEC-06 cancelada).
  - `src/i18n/dictionaries.ts` — registra o namespace `"administrative-registry"`
    no merge estático do `pt-BR` (o `buildLocale` via `import.meta.glob` já
    cobria os outros 3 locales automaticamente, pelo nome do arquivo).
  - `src/api/mutator.ts` — **fix A** (bug de sessão anterior, confirmado
    presente e corrigido): corpo da requisição não é mais serializado duas
    vezes (`config.data` já vem serializado pelo Axios, `JSON.stringify` de
    novo dobrava a codificação e quebrava todo POST/PUT/PATCH real contra o
    Core); o adapter agora roda a mesma lógica de `settle()` do Axios
    (`validateStatus`) e lança `AxiosError` de verdade pra status fora da
    faixa aceita — sem isso nenhum interceptor de erro rodava e o app tratava
    qualquer resposta (400/401/403/409/500...) como sucesso.
  - `src/components/crud/crud-record-modal.tsx` — **fix B** (confirmado
    presente): `useEffect` de reset do form agora depende só de `[show]`
    (valor de `defaultValues` fica num `ref`, atualizado a cada render sem
    disparar o efeito) — evita apagar seleção em campos controlados quando o
    componente pai re-renderiza com o modal já aberto. Também portada a
    normalização `emptyStringsToNull` (achado de sessão anterior, não listado
    nos 3 fixes originais, mas necessário pros próprios campos desta SPEC:
    `country`/`postalCode` do `AddressGroup` e `tara` do Container são
    opcionais com `.nullish()`/`.nullable()` no schema gerado, mas todo Field
    deixa `""` quando vazio — sem a normalização, deixar esses campos em
    branco travava o submit) — decisão registrada abaixo.
  - `src/routes/_dashboard/_internal.tsx` — **fix C** (confirmado presente):
    `beforeLoad` não usa mais `ensureQueryData` direto (cai no fetch real via
    `mutator.ts`, que recusa chamada autenticada no SSR, crashando em
    refresh/link direto pra qualquer rota administrativo/operacional/
    laboratorio); agora usa `fetchMeFn()` como fallback server-safe, mesmo
    padrão já usado em `src/routes/_dashboard/admin/route.tsx` (SPEC-03).
  - `src/routes/_dashboard/admin/access/index.tsx` — ajustes de baixa
    prioridade pedidos pelo usuário: `PAGE_SIZE` 20 → 3; campos `document`/
    `phone` trocados de `InputText` genérico pra `InputDocument` (aceita CPF
    **ou** CNPJ, compatível com o label "Documento (CPF/CNPJ)" e com o
    `min(11).max(14)` do schema — `InputCPF` validaria só CPF, rejeitando
    CNPJ) e `InputPhone`; `roles` já usava `opt.key` (não `opt.value`) —
    confirmado, sem necessidade de correção.
- **Comandos executados:**
  - `bun run dev` por ~15s só pra regenerar `src/routeTree.gen.ts` (plugin
    do TanStack Router roda no dev/build, sem CLI standalone) — processo
    encerrado depois, nenhum servidor deixado rodando.
  - `bun run check` (`tsc --noEmit`) — **VERIFIED**, sem erros.
  - `bun run lint` — **VERIFIED**: baseline antes de qualquer mudança desta
    sessão = 66 problemas (3 erros, 63 warnings, todos pré-existentes em
    arquivos não tocados: `src/lib/session.server.ts` e vários `Fields/*`
    legados). Depois de todas as mudanças desta SPEC (5 rotas novas + fixes
    A/B/C + ajustes do access): também 66 problemas (3 erros, 63 warnings) —
    nenhum novo erro/warning introduzido (1 warning de `prettier/prettier`
    apareceu durante o trabalho por formatação de import, corrigido com
    `prettier --write` antes do lint final).
  - `just map` — não executado: o contrato do Core não mudou nesta SPEC
    (client Orval de terminal/harbor/container/vessel/product já estava
    gerado).
- **Critérios de aceitação:**

  | #   | Critério                                                                    | Status |
  | --- | ---------------------------------------------------------------------------- | ------ |
  | CA1 | As 5 telas fazem CRUD real contra o Core (dev)                               | PASS (hooks Orval reais, sem mock; não foi possível rodar E2E contra um Core ao vivo neste ambiente — verificado por leitura de contrato/tipos) |
  | CA2 | Nenhuma valida com Zod escrito à mão                                          | PASS   |
  | CA3 | As 5 telas reusam `crud-list-page`/`crud-record-modal` da SPEC-02            | PASS   |
  | CA4 | `bun run check` + `lint` passam                                              | PASS   |
  | CA5 | Form de Terminal resolve `harborId` via `SelectAsync`                        | PASS   |
  | CA6 | Form de Harbor resolve `address` via `AddressGroup`                          | PASS   |

- **Decisões tomadas durante a implementação:**
  - Chave de i18n do namespace novo é `"administrative-registry"` (hífen,
    igual ao nome do arquivo), não `administrativeRegistry` (camelCase) —
    `buildLocale()` em `src/i18n/dictionaries.ts` deriva a chave do nome do
    arquivo verbatim pros locales en/es/zh; usar uma chave diferente no merge
    do `pt-BR` faria os locales não-pt-BR terem uma chave diferente da usada
    em pt-BR, quebrando o lookup silenciosamente (fallback pra key crua) em 3
    dos 4 idiomas. Chamadas ficam como `t("administrative-registry.terminal.title")`
    — sintaticamente válido (string literal), só não é camelCase.
  - Nenhum `src/lib/queries/*.ts` novo criado pras 5 telas — os hooks gerados
    já expõem `getGetApiXxxQueryOptions(params)` prontos (mesmo formato de
    `queryOptions` que `CrudListPage` espera), sem precisar de wrapper nem de
    seed via loader/server fn (diferente de `admin/access`, que precisava
    disso pra outro motivo: popular o multi-select de roles fora do
    `CrudListPage`). Nenhuma das 5 telas tem esse tipo de dependência extra
    de primeira renderização.
  - `HarborNameCell`/o lookup de `selectedLabel` do Terminal e a lista de
    terminais relacionados do Harbor usam `useSsrSafeQuery` (não o hook
    `useGetApiXxx` puro) — mesma regra já documentada em
    `src/lib/queries/use-ssr-safe-query.ts` ("qualquer leitura client-side...
    deve passar por aqui"), aplicada por consistência mesmo esses três casos
    só disparando depois de interação do usuário (portanto já garantidamente
    client-side).
  - `emptyStringsToNull` portado pro `crud-record-modal.tsx` mesmo não estando
    na lista original de 3 fixes — é pré-requisito funcional pros próprios
    campos novos desta SPEC (endereço/tara opcionais); sem ele, CA1
    (CRUD real funcionando) ficaria quebrado pra esses campos vazios.
  - Ações de linha (ver/editar/excluir) das 5 telas usam `btn btn-sm
    btn-outline-*` simples do Bootstrap, sem replicar o CSS Module custom de
    pílulas coloridas de `admin/access` (que é specífico da SPEC-11/escopo
    expandido daquela tela, não pedido aqui).
- **Limitações conhecidas:**
  - Ambiente sem Core rodando — CRUD real não foi exercitado ponta a ponta
    (POST/PUT/DELETE reais contra um banco), só verificado por leitura de
    contrato (tipos gerados, shapes de mutation) e `tsc --noEmit`.
  - Container não tem um Field de "número decimal" dedicado na biblioteca;
    usar `InputText` pra `tara` é funcional mas não formata nem valida o
    número enquanto o usuário digita (só na submissão, via Zod). Criar um
    `InputDecimal` fica fora do escopo desta SPEC (só consumo de Fields
    existentes, D4 do §13).
  - Vínculo Harbor↔Terminal continua só leitura (D2), como já decidido.
