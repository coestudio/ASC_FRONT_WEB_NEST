# SPEC-04 — Administrativo: Cadastros (Terminal, Porto, Container, Navio, Produto)

- **ID:** SPEC-04
- **Nome:** administrativo-cadastros
- **Status:** DRAFT
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/routes/_dashboard/_internal/administrative/registry/**` (nova)
- **Depende de:** SPEC-00 (namespaces do dicionário), SPEC-02
  (`crud-list-page`, `crud-record-modal` — esta SPEC só configura, não cria
  os componentes)

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
   - **Terminal** — `TerminalCreate`/`Update`.
   - **Porto (Harbor)** — `HarborCreate`/`Update` (inclui endereço e
     terminais relacionados, conforme já documentado no `AGENTS.md` do Core).
   - **Container** — `ContainerCreate`/`Update`.
   - **Navio (Vessel)** — `VesselCreate`/`Update`.
   - **Produto** — `ProductCreate`/`Update`.

## 4. Fora do escopo

- Vínculo de container a uma operação específica (isso é
  `operation-container`, escopo da SPEC-07).
- Import em lote de qualquer um desses cadastros (o legado não tem; Core
  também não expõe).

## 5. Requisitos funcionais

- **RF1** — Cada lista pagina/ordena/busca via `Query` do respectivo módulo.
- **RF2** — Criar/editar validam com o schema Zod **gerado** do respectivo
  módulo (`terminalCreate.zod` etc.) — zero Zod à mão.
- **RF3** — Deletar passa por `ConfirmationModal`.
- **RF4** — Harbor mostra terminais relacionados (mesmo que só leitura nesta
  SPEC — vínculo editável é `[NEEDS_DECISION]`, ver D2).

## 6. Requisitos não funcionais

- RNF1 — `bun run check` + `lint` passam.
- RNF2 — As 5 telas compartilham o **mesmo componente de lista/form
  genérico** sempre que os campos permitirem (evitar 5 cópias quase iguais)
  — ver §9.

## 7. Contrato de rota

| Rota | Componente |
| --- | --- |
| `/administrative/registry/terminal` | lista+form Terminal |
| `/administrative/registry/harbor` | lista+form Harbor |
| `/administrative/registry/container` | lista+form Container |
| `/administrative/registry/vessel` | lista+form Vessel |
| `/administrative/registry/product` | lista+form Produto |

Nomes de segmento em inglês por regra do projeto (regra 6, aplicada a URL
também — decisão confirmada, D3 resolvido): `administrativo`→`administrative`,
`cadastro`→`registry`, `porto`→`harbor`, `navio`→`vessel`, `produto`→`product`.
O rótulo exibido (i18n) continua em português para o usuário.

## 8. Camada de dados

Hooks Orval de `terminal`, `harbor`, `container`, `vessel`, `product` —
todos já gerados com CRUD + `PagedDTO`.

## 9. Desenho

`crud-list-page`/`crud-record-modal` já existem (SPEC-02) — aqui é só
configuração por módulo, sem recriar lista/form:

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

| Arquivo | Ação |
| --- | --- |
| `src/routes/.../administrative/registry/{terminal,harbor,container,vessel,product}/index.tsx` | criar (5) |
| `src/layouts/AppShell/nav/administrative-registry.ts` | criar (fragmento, SPEC-02 §3.1) |
| `src/i18n/dictionaries/*/administrative-registry.json` | criar (4 locales) |

## 11. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | As 5 telas fazem CRUD real contra o Core (dev) |
| CA2 | Nenhuma valida com Zod escrito à mão |
| CA3 | As 5 telas reusam `crud-list-page`/`crud-record-modal` da SPEC-02 (não criam nem copiam componente próprio) |
| CA4 | `bun run check` + `lint` passam |

## 12. Riscos

- **R1** — Componente genérico ficar genérico demais e difícil de estender
  quando uma tela precisar de algo único (ex.: Harbor com terminais
  relacionados). Mitigação: genérico cobre 80%, cada rota pode compor JSX
  extra ao redor.

## 13. Decisões pendentes

- **D1** — Confirma rota por tipo fixo (recomendado, roteamento file-based
  não combina bem com dispatch por `$tipo` do jeito que o legado fazia) em
  vez de replicar o `Cadastro/Page.tsx` dinâmico do legado.
- **D2** — Vínculo Harbor↔Terminal editável nesta SPEC ou só leitura (edição
  fica pra depois)?
- **D3** — Resolvido: todos os segmentos de rota desta SPEC em inglês
  (`administrative/registry/{terminal,harbor,container,vessel,product}`),
  rótulo em português pro usuário via i18n.
- **D4** — Resolvido pela SPEC-02 + regra inviolável 10 do `AGENTS.md`:
  componente genérico mora em `components/crud/`; cada campo do form é
  `layouts/Form/Fields/*` (nunca `components/ui`, que não tem mais input
  nenhum depois da migração da SPEC-02). Nada a decidir aqui.

---

**Próximo passo:** `APROVAR SPEC-04`.
