# SPEC-07-02 — Operações: shell de detalhe (abas)

- **ID:** SPEC-07-02
- **Nome:** operation-shell
- **Status:** DRAFT
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

**Próximo passo:** `APROVAR SPEC-07-02`.
