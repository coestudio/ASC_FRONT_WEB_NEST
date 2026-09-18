# SPEC-87 — Polish visual da aba Responsáveis (OperationResponsibleTab)

status: IMPLEMENTED

## Objetivo

Reorganizar a hierarquia visual e a responsividade da aba **Responsáveis**
(`src/components/operations/tabs/Responsible.tsx`, componente
`OperationResponsibleTab`), sem alterar nenhuma regra de negócio (busca,
filtro por papel, vincular, desvincular, "me adicionar" — SPEC-16/21/54).
Pedido do usuário via print em viewport estreito (~450px): badges de
tipo/papel quebrando de forma confusa, cabeçalho de filtros/ações
espremido em 3 colunas, card do responsável não escalando bem pra telas
menores.

## Contexto

- Aba já usa `.soft-card` (SPEC-64) e paginação/busca padrão (`FilterText`,
  `ListPagination`). Nenhuma dessas convenções muda.
- Mesma classe de pedido de polish visual já atendida antes nesta sessão
  (SPEC-58, SPEC-64) — sem mexer em paleta/cor, só em marcação/CSS
  utilitário do Bootstrap.

## Escopo

1. **Card do responsável**: diferenciar visualmente "tipo" (Interno/Externo
   — `item.user.type`) de "papéis" (`item.user.roles`, até 3 chaves reais:
   Agent/Supervisor/Laboratory, `internalRoleOptions`). Tipo vira um rótulo
   textual discreto ao lado do nome (sem badge colorido colidindo com os
   papéis); papéis continuam como badges, mas menores/compactos e num bloco
   visualmente separado.
2. **Layout do card**: passar de uma única linha flex apertada
   (`d-flex flex-row`) para um layout que empilha em coluna abaixo do
   breakpoint `md` e vira linha em `md+`, evitando quebra feia de badge/texto
   truncado em viewport estreito.
3. **Cabeçalho de filtros/ações**: substituir os 3 `Col` (`md={4}/5/3`) por
   duas linhas lógicas com `flex-wrap`: linha 1 = busca + filtro por papel;
   linha 2 = ações ("Me adicionar", "Vincular"), alinhadas à direita em
   telas largas e empilhando em `flex-wrap` em telas estreitas.
4. Nenhuma mudança de cor nova — reusa `Badge bg="secondary"`/`bg="info"`
   (ou troca de variante já suportada pelo Bootstrap, ex. `bg="light"
   text-body-secondary`), tokens `--bs-*`/classes utilitárias existentes.

## Fora do escopo

- Qualquer mudança de contrato de API, filtro, busca, vínculo/desvínculo.
- Qualquer troca de paleta/brand.
- Outras abas do módulo de operação (`Log.tsx` está sendo tocado em paralelo
  por outro agente nesta sessão — sem overlap).

## Requisitos funcionais

- RF1: `item.user.type` continua sendo exibido, mas não mais como
  `Badge bg="secondary"` competindo visualmente com os badges de papel —
  vira texto discreto (`small text-body-secondary`) ao lado do nome.
- RF2: badges de papel (`item.user.roles`) continuam existindo, um por
  papel, com o texto já traduzido via `resolveInternalRoleLabel`/`t(...)`
  (sem mudança de fonte de dado).
- RF3: em viewport estreito, nome + tipo + papéis + contato + botão
  desvincular não quebram badge/texto de forma ilegível — devem empilhar em
  coluna.
- RF4: cabeçalho de busca/filtro/ações não aperta 3 colunas numa única
  `Row` — reorganizado em 2 linhas com wrap.
- RF5: filtro por papel (`internalRoleOptions`, `btn-group`), busca
  (`FilterText`), "me adicionar" (`handleSelfLink`) e "Vincular"
  (`SelectAsync`/modal) continuam funcionalmente idênticos — só reposicionados.

## Requisitos não funcionais

- Sem nova dependência.
- Sem novo componente em `components/ui` ou `layouts/Form/Fields` (não é
  input novo, não é bloco reutilizável novo além do que já existe).
- Sem chave i18n nova — todas as strings usadas já existem no namespace
  `administrative-operations`.

## Camada de dados

Não se aplica — mudança é só de marcação/CSS no componente existente. Sem
mudança de queryKey, sem mudança de contrato, sem `just map`.

## UI

- Arquivo tocado: `src/components/operations/tabs/Responsible.tsx`.
- Sem componente novo. Reorganização de `Row`/`Col`/`div` com classes
  utilitárias Bootstrap (`d-flex`, `flex-column`, `flex-md-row`, `flex-wrap`,
  `gap-*`) e `Badge` já usado no projeto.

## i18n

Nenhuma chave nova — reusa `administrative-operations.responsible.*` já
existentes (`searchPlaceholder`, `filter.byRole`, `filter.clear`,
`selfLink`, `link`, `linkPlaceholder`, `unlink`, `roles.*`, `toast.*`,
`emptyState`).

## Dependências

Nenhuma.

## Arquivos esperados

- `src/components/operations/tabs/Responsible.tsx` (edição)
- `specs/87-responsible-tab-visual-polish/spec.md` (este arquivo)

## Critérios de aceitação

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | `item.user.type` não é mais `Badge bg="secondary"` disputando espaço visual com os badges de papel | PASS |
| 2 | Badges de papel continuam um por `item.user.roles`, mesmo texto/fonte de dado | PASS |
| 3 | Card do responsável empilha em coluna abaixo de `md`, vira linha em `md+` | PASS |
| 4 | Cabeçalho de filtros/ações organizado em 2 linhas com `flex-wrap`, sem 3 `Col` apertadas | PASS |
| 5 | Nenhuma regra de negócio (busca/filtro/vincular/desvincular/"me adicionar") alterada | PASS |
| 6 | `bun run check` sem novo erro | PASS |
| 7 | `bun run lint` sem novo erro/warning (baseline: 0 errors / 63 warnings) | PASS |

## Riscos

- Baixo — mudança isolada de marcação num único componente, sem estado novo
  nem contrato alterado.

## Decisões pendentes

Nenhuma — escopo estritamente visual, dentro da regra "cor via token/variant
já existente", sem tocar Zod/rota/permissão/contrato.

## Implementation Notes

- Arquivo alterado: `src/components/operations/tabs/Responsible.tsx`.
- Cabeçalho de filtros/ações: trocado o único `Row` de 3 `Col` (`md={4}`/
  `md={5}`/`md={3}`) por duas `div.d-flex.flex-wrap` — linha 1 (busca +
  filtro por papel + botão "limpar filtro"), linha 2 (ações "me adicionar"/
  "vincular", `ms-md-auto` pra colar à direita em telas largas e empilhar
  em telas estreitas).
- Card do responsável: `d-flex flex-row` fixo virou
  `d-flex flex-column flex-md-row` (empilha em coluna abaixo de `md`, linha
  em `md+`). Botão "Desvincular" ganhou `align-self-stretch align-self-md-center`
  e `w-100`/`w-md-auto` via classe utilitária pra não ficar esticado feio em
  coluna.
- `item.user.type` (Interno/Externo) trocado de `Badge bg="secondary"` pra
  texto simples (`span.small.text-body-secondary`), ao lado do nome —
  deixa de competir visualmente com os badges de papel. Badges de papel
  (`Badge bg="info" text="dark"`, inalterados) passaram pra um bloco próprio
  abaixo do nome, só renderizado quando `item.user.roles.length > 0`.
- Comandos executados:
  - `bun run check` → `tsc --noEmit`, sem erro (mesma saída limpa do
    baseline).
  - `bun run lint` → `0 errors, 63 warnings` (idêntico ao baseline medido
    antes da mudança — nenhum warning novo introduzido).
- Nenhuma mudança de queryKey, contrato, i18n ou permissão. `just map` não
  se aplica.
- Limitações conhecidas: ajuste é heurístico a partir da descrição do print
  (viewport ~450px) — validação real de pixel-perfect em dispositivo físico
  não foi feita (sem suíte de teste visual no projeto); comportamento foi
  conferido lendo a marcação resultante e comparando com o padrão de outras
  abas polidas na mesma sessão (SPEC-58/64).
