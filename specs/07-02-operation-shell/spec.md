# SPEC-07-02 — Operações: shell de detalhe (abas)

- **ID:** SPEC-07-02
- **Nome:** operation-shell
- **Status:** IMPLEMENTED
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/routes/_dashboard/_internal/administrative/operations/$id/**`
  (rota única, nova), `src/components/operations/tabs/**` (componentes de
  aba, um por sub-SPEC)
- **Depende de:** SPEC-00 (namespaces do dicionário), SPEC-02
- **Bloqueia:** SPEC-07-03 a SPEC-07-09 (todas as abas montam dentro deste
  shell — D2, §13: estado local, não sub-rota).

---

## 1. Objetivo

Sub-SPEC extraída da divisão de SPEC-07 (`specs/07-operacoes/spec.md`,
índice geral): o **shell** da página de detalhe de uma Operação — layout de
abas (`$id/route.tsx` + `<Outlet/>`), navegação entre abas, resolução do
`id`, e a regra anti-silent-fail que vale para toda aba montada aqui
dentro. Nenhuma aba tem conteúdo próprio nesta SPEC — isso é
SPEC-07-03..09.

## 2. Contexto

Legado: `Operations/Detail.tsx` despacha 7 abas por estado local (não por
URL); as abas mock usam `OPERATIONS` de `data.ts` com um guard
`mockOperation &&` que **some silenciosamente** se o id mock não bate com
o real (risco identificado no levantamento — **não repetir esse
silent-fail** aqui, ver RF2).

## 3. Escopo

1. `operations/$id/index.tsx` — rota única (sem sub-rota por aba) que
   renderiza a navegação de abas (`details`, `romaneio`, `containers`,
   `documents`, `reports`, `responsible`, `log`) e o componente da aba ativa
   via **estado local** (`useState`, D2 revertida — ver §13). Conteúdo de
   cada aba é escopo das SPECs 07-03 a 07-09, como componente em
   `src/components/operations/tabs/<Nome>.tsx`, importado e renderizado
   condicionalmente pelo shell — não como rota própria.
2. Aba inicial (ao entrar em `$id`) é `details` — sem redirect de rota (não
   há sub-rota pra redirecionar), só o estado local nasce com `"details"`.
3. Resolução do `id` da operação (`useParams`, `useGetApiOperationId` ou
   equivalente) feita uma vez no shell e passada por prop pros componentes
   de aba — cada aba não refaz a própria busca do registro pai.

## 4. Fora do escopo

- Conteúdo de qualquer aba (dado, formulário, tabela) — cada uma é uma
  sub-SPEC própria (07-03 a 07-09).
- Deep-link direto pra uma aba específica (ex. compartilhar URL já na aba
  Romaneio) — consequência aceita de D2 (§13): sem sub-rota, a URL não
  carrega qual aba está ativa.

## 5. Requisitos funcionais

- **RF1** — Abas como **estado local** do shell (`useState`, sem mudar a
  URL) — mesmo comportamento do legado (D2 revertida, §13). Nenhuma
  sub-rota `$id/<aba>` é criada; o conteúdo de cada aba é um componente
  comum (`src/components/operations/tabs/<Nome>.tsx`) montado/desmontado
  por condicional, não por roteamento.
- **RF2** — **Sem silent-fail**: se o `id` não resolve, o shell mostra
  estado vazio/erro explícito — nunca um `&&` que some sem feedback (bug
  conhecido do legado, não repetir). Cada sub-SPEC de aba herda essa regra
  para os próprios estados de carregamento/erro internos.

## 6. Requisitos não funcionais

- RNF1 — `bun run check` + `lint` passam.

## 7. Contrato de rota

| Rota                              | Dado |
| ---------------------------------- | ---- |
| `/administrative/operations/$id`  | —    |

Rota única — nenhuma sub-rota por aba (D2 revertida, §13). O estado da aba
ativa vive só no componente, nunca na URL. As 7 sub-SPECs (07-03 a 07-09)
não têm contrato de rota próprio — cada uma expõe um componente consumido
por este shell.

## 8. Camada de dados

Hook Orval de `operation` (`getApiOperationId`) para resolver o registro
pai e alimentar (via prop) os componentes de aba.

## 9. Desenho

```
src/routes/_dashboard/_internal/administrative/operations/
  $id/
    index.tsx          (shell: tab nav + estado local da aba ativa +
                         resolução do id + render condicional do
                         componente de src/components/operations/tabs/*)

src/components/operations/tabs/
  Details.tsx          (SPEC-07-03)
  Romaneio.tsx          (SPEC-07-04)
  Containers.tsx        (SPEC-07-05)
  Documents.tsx         (SPEC-07-06)
  Reports.tsx           (SPEC-07-07)
  Responsible.tsx        (SPEC-07-08)
  Log.tsx               (SPEC-07-09)
```

## 10. Arquivos esperados

| Arquivo                                                  | Ação  |
| -------------------------------------------------------- | ----- |
| `src/routes/.../administrative/operations/$id/index.tsx` | criar |

## 11. Critérios de aceitação

| #   | Critério                                                                                  |
| --- | ----------------------------------------------------------------------------------------- |
| CA1 | Acessar `/administrative/operations/$id` mostra a aba `details` ativa por padrão, sem sub-rota nem redirect |
| CA2 | `id` inexistente/inválido mostra estado de erro visível, nunca desaparece silenciosamente |
| CA3 | Trocar de aba não muda a URL (D2) e não perde o `id` resolvido (sem refetch por aba)      |
| CA4 | `bun run check` + `lint` passam                                                           |

## 12. Riscos

Nenhum específico além dos já cobertos pelo índice geral
(`specs/07-operacoes/spec.md`).

## 13. Decisões pendentes

- **D2** — Resolvida pelo usuário: **estado de tab local**, sem sub-rota —
  contra a recomendação original desta SPEC (que sugeria sub-rota por
  deep-link). Paridade direta com o comportamento do legado
  (`Operations/Detail.tsx`, que já despachava por estado local). Consequência
  aceita: sem deep-link direto pra uma aba específica (§4); conteúdo de cada
  aba nasce como componente em `src/components/operations/tabs/<Nome>.tsx`
  (não como rota), consumido pelo shell via render condicional.

---

## Implementation Notes

- **Arquivos criados:**
  - `src/routes/_dashboard/_internal/administrative/operations/$id/index.tsx`
    — shell: resolução do `id` (`Route.useParams`), busca do registro pai
    via `useSsrSafeQuery(getGetApiOperationIdQueryOptions(id))` (gate de
    `mounted` antes de montar o corpo que chama o hook, mesmo padrão de
    `CrudListPage`/SPEC-10), header com número/cliente/tipo/serviço/status
    (`OperationHeader`), troca de status via `Select`
    (`layouts/Form/Fields/Select`) com `zodResolver(PatchApiOperationIdStatusBody)`
    disparando `usePatchApiOperationIdStatus` a cada mudança (sem botão de
    salvar — paridade com o `Form.Select` do legado), `Nav` de 7 abas
    (estado local `useState<Tab>`, D2) e placeholder genérico de conteúdo
    de aba (SPEC-07-03 a 07-09 substituem o placeholder por componente
    real).
  - `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json`
    — namespace único da árvore SPEC-07 (§5 do índice geral), criado aqui
    com só as chaves do shell (`shell.*`); lista (SPEC-07-01) e demais
    abas adicionam chaves ao mesmo arquivo depois.
- **Arquivos editados:**
  - `src/i18n/dictionaries.ts` — import + chave `"administrative-operations"`.
  - `src/routeTree.gen.ts` — gerado (`bun run build`), não editado à mão.
- **Comandos executados:**
  - `bun run lint` (baseline, antes de tocar em qualquer arquivo): 66
    problems / 3 errors / 63 warnings — `VERIFIED`.
  - `bun run check` (baseline): limpo — `VERIFIED`.
  - `bun run build` (pra regenerar `routeTree.gen.ts` — não há CLI de
    codegen isolado no projeto): sucesso — `VERIFIED`.
  - `bun run check` (pós-implementação): limpo — `VERIFIED`.
  - `bun run lint` (pós-implementação): 66 problems / 3 errors / 63
    warnings — mesmo total do baseline, zero regressão, nenhum warning/erro
    nos arquivos tocados — `VERIFIED`.
  - `npx prettier --write` só no arquivo da rota (não no repo inteiro).
- **Critérios de aceitação:**

  | # | Critério | Resultado |
  | --- | --- | --- |
  | CA1 | Acessar `/administrative/operations/$id` mostra a aba `details` ativa por padrão, sem sub-rota nem redirect | PASS — `useState<Tab>("details")` inicial, nenhuma sub-rota criada |
  | CA2 | `id` inexistente/inválido mostra estado de erro visível, nunca desaparece silenciosamente | PASS — `query.isError \|\| !query.data` renderiza alerta com retry, nunca um `null`/`&&` silencioso |
  | CA3 | Trocar de aba não muda a URL (D2) e não perde o `id` resolvido (sem refetch por aba) | PASS — `tab` é `useState` local, `operation` (já resolvido) é passado por escopo, não refeito por aba |
  | CA4 | `bun run check` + `lint` passam | PASS — check limpo, lint sem regressão sobre o baseline |

- **Decisões tomadas durante a implementação:**
  - Nenhum componente de aba (`src/components/operations/tabs/**`) foi
    criado — a tabela "Arquivos esperados" (§10) desta SPEC só lista o
    `index.tsx` do shell; os 7 arquivos de aba do §9 (Desenho) pertencem às
    sub-SPECs 07-03 a 07-09, que ainda não existem nesta lineage
    (`SPECS-LEGADO`, não `wave-2-parallel-areas`). O shell renderiza um
    placeholder genérico (`shell.tabPlaceholder`) no lugar de cada aba até
    a sub-SPEC correspondente trocar isso por um componente real — decisão
    técnica de escopo (INFERRED), não de arquitetura.
  - `administrative-operations.json` (4 locales) foi criado por esta SPEC
    mesmo o índice geral atribuindo a criação à SPEC-07-01 — como
    `SPEC-07-01` está sendo implementada em paralelo, em outro worktree
    isolado (não está presente nesta branch, que nasce de `SPECS-LEGADO`),
    e o shell precisa de texto de UI (abas, header, mensagens de erro), o
    namespace nasceu aqui com só as chaves `shell.*`. Conflito de merge
    esperado e aceito quando as duas branches convergirem em
    `wave-2-parallel-areas` (mesmo racional do índice geral, §5: "editado
    por cada sub-SPEC subsequente").
  - Troca de status implementada como `useForm` de um campo só + `watch` +
    efeito que dispara o PATCH a cada mudança (sem botão "salvar"),
    seguindo à risca a regra 9/10 do AGENTS.md (todo campo de formulário
    via `layouts/Form/Fields`, com `zodResolver` sobre schema gerado) e o
    precedente já existente de `ListSearchInput`
    (`src/components/crud/crud-list-page.tsx`) — mesmo padrão, "formulário"
    de um campo local sem submit explícito.
  - Sem breadcrumb — não existe componente de breadcrumb no design system
    atual (`grep` não encontrou nenhum) e a SPEC não pede um; fora de
    escopo.
  - Distinção 404 vs. erro genérico (como no legado `notFound`/`loadError`)
    não foi replicada — o padrão já estabelecido no restante da base
    (`clients/index.tsx`) trata todo `isError` de forma genérica, com
    toast automático do interceptor global (`mutator.ts`); CA2 exige só
    "estado de erro visível", que o alerta com retry já cobre.
- **Limitações conhecidas:**
  - Rota só é alcançável hoje por URL direta — não há item de navegação
    nem link a partir de uma lista (`/administrative/operations` ainda não
    existe nesta lineage; nasce em SPEC-07-01, em worktree separado).
  - Nenhuma aba tem conteúdo real (por design desta SPEC) — todas mostram
    o mesmo placeholder até SPEC-07-03..09.
  - `administrative-operations.json` provavelmente entra em conflito de
    merge com a versão de SPEC-07-01 ao convergir em
    `wave-2-parallel-areas` — esperado, não resolvido aqui.

**Próximo passo:** SPEC-07-03 a SPEC-07-09 substituem o placeholder de cada
aba por um componente real, consumindo `operation`/`id` já resolvidos por
este shell.
