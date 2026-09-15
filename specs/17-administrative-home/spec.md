# SPEC-17 — Administrativo: Home com quick actions

- **ID:** SPEC-17
- **Nome:** administrative-home
- **Status:** IMPLEMENTED
- **Autor:** portal-dev-agent (rascunho + auto-aprovação, mesmo fluxo usado
  nas SPECs anteriores desta sessão)
- **Área:** `src/routes/_dashboard/_internal/administrative/index.tsx` (nova)
- **Depende de:** SPEC-02 (`_dashboard/_internal` guard + `PageLayout`),
  SPEC-04 (`administrative/registry/*`), SPEC-05 (`administrative/clients`),
  SPEC-07-01 (`administrative/operations`), SPEC-08 (padrão de referência —
  `operational/index.tsx`, grid de `Card`)

---

## 1. Objetivo

Hoje `/administrativo` (item "Início" da seção Administrativo do nav) é
**link morto** — `nav/administrativo.ts` aponta pra uma rota que nunca foi
criada (órfã da SPEC-06, cancelada). Esta SPEC cria a Home real da área
Administrativo em `/administrative`, com quick actions (cards de navegação)
pras 7 telas reais já existentes na área, e corrige o nav pra apontar pro
path novo.

## 2. Contexto

Administrativo hoje tem 7 rotas reais, todas já `IMPLEMENTED`, sem nenhuma
tela de entrada própria — o usuário cai direto num item de submenu:

| Rota                                   | SPEC     |
| --------------------------------------- | -------- |
| `/administrative/clients`               | SPEC-05  |
| `/administrative/operations`            | SPEC-07  |
| `/administrative/registry/vessel`       | SPEC-04  |
| `/administrative/registry/container`    | SPEC-04  |
| `/administrative/registry/terminal`     | SPEC-04  |
| `/administrative/registry/harbor`       | SPEC-04  |
| `/administrative/registry/product`      | SPEC-04  |

O padrão de referência já `IMPLEMENTED` é `operational/index.tsx`
(SPEC-08): `PageLayout` com título/descrição + grid `row g-3` de `Card`
(ícone Bootstrap Icons, título, descrição), cada card um `Link` do router
pra uma rota real. Não há dado carregado — é navegação pura.

`nav/administrativo.ts` já documenta no comentário de topo que
Log/Ocorrências (`administrativoLog`/`administrativoOccurrences`) ficaram
órfãos porque a SPEC-06 (que os implementaria) foi **cancelada** — decisão
já registrada em `specs/BRANCHING.md` §"Fora deste plano". Esta SPEC não
reabre essa decisão.

## 3. Escopo

1. Home de Administrativo em `/administrative` — **só cards de navegação**,
   mesmo desenho do Operacional (SPEC-08): ícone + título + descrição, cada
   card linkando pra uma das 7 rotas reais listadas no §2.
2. Corrigir `nav/administrativo.ts`: item "Início" passa a apontar pra
   `/administrative` (era `/administrativo`, rota que nunca existiu).
3. Namespace i18n novo `administrative-home` (título/descrição da página +
   título/descrição de cada um dos 7 cards), 4 locales.

## 4. Fora do escopo (decisão de escopo proposta, não pergunta — autorização já dada pelo pedido)

- **Contadores/atalhos de criar direto** (ex.: "12 operações em andamento",
  botão "+ Nova operação" direto na Home) — ficam de fora desta rodada.
  Motivo: todo contador real exigiria uma chamada a mais por card (7 chamadas
  na Home só pra popular número, a maioria delas sem endpoint de "contagem"
  dedicado no client gerado — teria que paginar e ler `total`) e um "criar
  direto" duplicaria formulário que já existe dentro de cada tela de lista
  (`CrudListPage`), sem necessidade — o mesmo padrão do Operacional (SPEC-08)
  e do Cliente (SPEC-09) já resolveram "Home de área" só com cards de
  navegação, sem contador. Fica registrado como possível evolução futura, sob
  nova SPEC, se o usuário quiser.
- Log/Ocorrências (`administrativoLog`/`administrativoOccurrences`): SPEC-06
  cancelada, sem rota real — **não entram** nos cards (não dá pra linkar pra
  rota que não existe) e o item de nav correspondente continua órfão, como
  já documentado. Ver §8.
- Criar rota nova de listagem/CRUD — todas as 7 já existem, esta SPEC só
  organiza a entrada.

## 5. Requisitos funcionais

- **RF1** — `/administrative` renderiza `PageLayout` com título "Administrativo"
  e descrição curta, seguido de um grid de 7 cards (mesmo breakpoint do
  Operacional: `col-12 col-sm-6 col-lg-4`).
- **RF2** — Cada card é um `Link` do TanStack Router pra uma das 7 rotas
  reais (clients, operations, registry/vessel, registry/container,
  registry/terminal, registry/harbor, registry/product), com ícone Bootstrap
  Icons coerente com o ícone já usado no item de nav correspondente
  (mesma constante de ícone de `nav/administrative-*.ts`).
- **RF3** — Ordem dos cards segue a mesma ordem dos itens no nav
  (`order` de cada fragmento): Clientes, Operações, Navio, Container,
  Terminal, Porto, Produto.
- **RF4** — `nav/administrativo.ts`: `to` do item `administrativoHome` passa
  de `/administrativo` pra `/administrative`.

## 6. Requisitos não funcionais

- RNF1 — `bun run check` + `bun run lint` passam sem novo erro/warning.
- RNF2 — Reusa `PageLayout` e `Card` do react-bootstrap, sem CSS Module novo
  (o grid `row g-3` não precisa de estilo próprio, mesmo caso do Operacional).
- RNF3 — Nenhuma chamada de rede na Home (só navegação) — guard de área já
  coberto por `_dashboard/_internal` (não recriar guard aqui).

## 7. Contrato de rota

| Rota             | Guard                          | Dado                  |
| ----------------- | ------------------------------ | ---------------------- |
| `/administrative` | `_dashboard/_internal` (área `administrativo`, já existente) | — (Home, só links) |

Path do arquivo: `src/routes/_dashboard/_internal/administrative/index.tsx`
→ `createFileRoute("/_dashboard/_internal/administrative/")`.

## 8. Camada de dados

Nenhuma — a Home não lê nada do Core, só monta uma lista estática de links
(mesmo padrão do `operational/index.tsx`, RF que não depende de
`queryOptions`/hook Orval nenhum).

## 9. UI

- Componente novo: `AdministrativeHomePage` em
  `src/routes/_dashboard/_internal/administrative/index.tsx`, cópia do
  desenho de `operational/index.tsx` (array `CARDS: HomeCard[]` com
  `to`/`icon`/`titleKey`/`descriptionKey`, `.map` num grid `row g-3`).
- Nenhum componente novo em `components/ui` nem `layouts/Form/Fields` — é
  só navegação, sem input de formulário.

## 10. i18n

Namespace novo `administrative-home` (arquivo por locale, mesmo padrão da
migração de SPEC-00), chaves:

```
home.title
home.description
home.cards.clients.title / .description
home.cards.operations.title / .description
home.cards.vessel.title / .description
home.cards.container.title / .description
home.cards.terminal.title / .description
home.cards.harbor.title / .description
home.cards.product.title / .description
```

(Namespace próprio, não reaproveita `administrative-clients`/`-operations`/
`-registry` pra não acoplar a Home ao ciclo de vida de cada namespace de
tela — mesmo racional que levou `operational.home.*` a ser namespace
próprio em vez de embutido em outra tela.)

## 11. Arquivos esperados

| Arquivo                                                              | Ação   |
| ---------------------------------------------------------------------| ------ |
| `src/routes/_dashboard/_internal/administrative/index.tsx`           | criar  |
| `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-home.json`    | criar  |
| `src/i18n/dictionaries.ts`                                           | editar (import + entrada `"administrative-home"`) |
| `src/layouts/AppShell/nav/administrativo.ts`                         | editar (`to` do item Home: `/administrativo` → `/administrative`; comentário de topo atualizado citando esta SPEC) |

## 12. Critérios de aceitação

| #   | Critério                                                                 |
| --- | ------------------------------------------------------------------------ |
| CA1 | `/administrative` renderiza 7 cards, cada um navegando pra uma rota real |
| CA2 | Item "Início" do nav de Administrativo aponta pra `/administrative` e não quebra (rota existe) |
| CA3 | `bun run check` + `bun run lint` passam                                  |
| CA4 | 4 locales com as mesmas chaves em `administrative-home.json`             |

## 13. Riscos

- **R1** — Nenhum. É tela só de navegação, reusando padrão já validado
  (SPEC-08/09) e rotas já existentes — sem contrato de API novo, sem schema
  Zod novo.

## 14. Decisões pendentes

- **D1 — Resolvida (proposta desta SPEC, autorizada pelo pedido do
  usuário):** escopo é só cards de navegação, sem contador/atalho de criar
  direto. Ver §4 pro racional.
- **D2 — Resolvida:** Log/Ocorrências ficam fora dos cards e o item de nav
  correspondente continua órfão — decisão já tomada na SPEC-06 (cancelada),
  não reaberta aqui. Se o usuário quiser revisitar, é uma SPEC nova, própria
  pra essas duas telas.

---

**Aprovação:** `APROVAR SPEC-17` — auto-aprovada pelo agente, conforme
autorização explícita do pedido do usuário ("decida escopo... este pedido já
é a autorização... aprove seguindo o fluxo já estabelecido"), mesmo padrão
usado nas SPECs anteriores desta sessão.

---

## Implementation Notes

**Arquivos criados:**

- `src/routes/_dashboard/_internal/administrative/index.tsx` — Home com grid
  de 7 cards (`row g-3`, `col-12 col-sm-6 col-lg-4`), cópia do desenho de
  `operational/index.tsx` (SPEC-08): array `CARDS: HomeCard[]` com
  `to`/`icon`/`titleKey`/`descriptionKey`, ícones iguais aos usados nos
  fragmentos de nav correspondentes (`bi-people`, `bi-clipboard-data`,
  `bi-water`, `bi-box-seam`, `bi-building`, `bi-geo-alt`, `bi-box2`), ordem
  igual à do nav (Clientes, Operações, Navio, Container, Terminal, Porto,
  Produto).
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-home.json` —
  namespace novo (`home.title`, `home.description`,
  `home.cards.<clients|operations|vessel|container|terminal|harbor|product>.
  {title,description}`), mesma árvore nos 4 locales.

**Arquivos editados:**

- `src/i18n/dictionaries.ts` — import estático de
  `pt-BR/administrative-home.json` + entrada
  `"administrative-home": ptBRAdministrativeHome` no objeto `ptBR` (mesmo
  padrão dos demais namespaces com hífen).
- `src/layouts/AppShell/nav/administrativo.ts` — `to` do item
  `administrativoHome` trocado de `/administrativo` (rota morta) pra
  `/administrative` (RF4); comentário de topo atualizado citando a SPEC-17 e
  reafirmando que Log/Ocorrências continuam órfãos (decisão da SPEC-06,
  cancelada, não reaberta).
- `src/routeTree.gen.ts` — regenerado automaticamente pelo plugin do
  TanStack Router durante `bun run check`/`bun run lint` (não editado à
  mão) — inclui a rota nova `/_dashboard/_internal/administrative/`.

**Comandos executados:**

- `bun run check` (`tsc --noEmit`): limpo, sem erros. **VERIFIED**.
- `bun run lint`: `66 problems (3 errors, 63 warnings)` — os 3 erros são
  pré-existentes em `src/lib/session.server.ts`
  (`react-hooks/rules-of-hooks`), fora do escopo desta SPEC; os 63 warnings
  são pré-existentes em `src/layouts/Form/**` e `src/lib/ui-prefs.tsx`.
  Contagem idêntica ao baseline conhecido da sessão (mesmo total já
  registrado na SPEC-08) — nenhum warning/erro novo introduzido pelos
  arquivos desta SPEC. **VERIFIED**.

**Critérios de aceitação:**

| #   | Critério                                                                 | Resultado |
| --- | ------------------------------------------------------------------------ | --------- |
| CA1 | `/administrative` renderiza 7 cards, cada um navegando pra uma rota real | PASS — 7 `Card`/`Link` no `CARDS`, cada `to` correspondendo a uma rota real já `IMPLEMENTED` |
| CA2 | Item "Início" do nav de Administrativo aponta pra `/administrative` e não quebra (rota existe) | PASS — `nav/administrativo.ts` editado, rota criada no mesmo commit |
| CA3 | `bun run check` + `bun run lint` passam                                  | PASS (lint com o baseline pré-existente inalterado, ver acima) |
| CA4 | 4 locales com as mesmas chaves em `administrative-home.json`             | PASS — mesma árvore de chaves em pt-BR/en/es/zh |

**Decisões tomadas durante a implementação:** nenhuma além das já registradas
em §4/§14 (proposta de escopo do próprio agente, autorizada pelo pedido do
usuário).

**Limitações conhecidas:**

- Log/Ocorrências continuam sem rota real e o item de nav correspondente
  continua órfão (decisão da SPEC-06, cancelada — fora do escopo desta
  SPEC, ver §4/§14 D2).
- Sem contador/atalho de "criar direto" nos cards (decisão de escopo desta
  SPEC, §4) — evolução possível sob nova SPEC, se o usuário quiser.
