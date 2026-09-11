# SPEC-07-02 — Operações: shell de detalhe (abas)

- **ID:** SPEC-07-02
- **Nome:** operation-shell
- **Status:** DRAFT
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/routes/_dashboard/_internal/administrative/operations/$id/**`
  (layout, nova)
- **Depende de:** SPEC-00 (namespaces do dicionário), SPEC-02
- **Bloqueia:** SPEC-07-03 a SPEC-07-09 (todas as abas montam dentro deste
  layout).

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

1. `operations/$id/` — layout de abas com 7 sub-rotas (`details`,
   `romaneio`, `containers`, `documents`, `reports`, `responsible`, `log`)
   — conteúdo de cada uma é escopo das SPECs 07-03 a 07-09.
2. Redirect `$id` (sem sub-rota) → `$id/details`.
3. Resolução do `id` da operação (`useParams`, `useGetApiOperationId` ou
   equivalente) compartilhada pelas abas via contexto de rota — cada aba
   não refaz a própria busca do registro pai.

## 4. Fora do escopo

- Conteúdo de qualquer aba (dado, formulário, tabela) — cada uma é uma
  sub-SPEC própria (07-03 a 07-09).

## 5. Requisitos funcionais

- **RF1** — Abas como sub-rotas (layout `$id/route.tsx` + `<Outlet/>`),
  não estado de tab local — permite deep-link direto pra uma aba (D2).
- **RF2** — **Sem silent-fail**: se o `id` não resolve, o shell mostra
  estado vazio/erro explícito — nunca um `&&` que some sem feedback (bug
  conhecido do legado, não repetir). Cada sub-SPEC de aba herda essa regra
  para os próprios estados de carregamento/erro internos.

## 6. Requisitos não funcionais

- RNF1 — `bun run check` + `lint` passam.

## 7. Contrato de rota

| Rota                                                    | Dado |
| ------------------------------------------------------- | ---- |
| `/administrative/operations/$id` (redirect → `details`) | —    |

(As 7 sub-rotas de aba são contrato das respectivas sub-SPECs 07-03..09.)

## 8. Camada de dados

Hook Orval de `operation` (`getApiOperationId`) para resolver o registro
pai e alimentar o contexto de rota consumido pelas abas.

## 9. Desenho

```
src/routes/_dashboard/_internal/administrative/operations/
  $id/
    route.tsx          (layout de abas + tab nav + resolução do id)
```

## 10. Arquivos esperados

| Arquivo                                                  | Ação  |
| -------------------------------------------------------- | ----- |
| `src/routes/.../administrative/operations/$id/route.tsx` | criar |

## 11. Critérios de aceitação

| #   | Critério                                                                                  |
| --- | ----------------------------------------------------------------------------------------- |
| CA1 | Acessar `/administrative/operations/$id` sem sub-rota redireciona pra `details`           |
| CA2 | `id` inexistente/inválido mostra estado de erro visível, nunca desaparece silenciosamente |
| CA3 | `bun run check` + `lint` passam                                                           |

## 12. Riscos

Nenhum específico além dos já cobertos pelo índice geral
(`specs/07-operacoes/spec.md`).

## 13. Decisões pendentes

- **D2** — Abas como sub-rota (`$id/romaneio`) — confirma, ou prefere
  estado de tab local sem mudar URL (like legado)? Recomendação: sub-rota,
  por deep-link e por já ser o padrão de roteamento do TanStack aqui.

---

**Próximo passo:** `APROVAR SPEC-07-02`.
