# SPEC-07 — Operações: lista e detalhe (Detalhes/Romaneio/Containers/Documentos reais, Relatórios/Responsáveis/Log UI-only)

- **ID:** SPEC-07
- **Nome:** operacoes
- **Status:** DRAFT
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/routes/_dashboard/_internal/administrative/operations/**` (nova)
- **Depende de:** SPEC-00 (namespaces do dicionário), SPEC-02
  (`mock-data-banner`; **não** reusa `crud-list-page` — ver §9, essa lista é
  complexa demais pro molde genérico).

---

## 1. Objetivo

Portar a tela mais complexa do legado: lista de Operações + detalhe com 6
abas. Espelhando o legado (decisão do usuário), **3 abas ficam reais e 3
ficam UI-only** dentro da mesma tela de detalhe.

**Real vs UI-only** (por aba do detalhe):
| Aba | Legado | Aqui |
| --- | --- | --- |
| Detalhes | real (`OperationApi`) | real |
| Romaneio | real (`OperationRomaneioReal`) | real |
| Containers | real (`OperationContainersReal`) | real |
| Documentos | real (`OperationDocumentosReal`) | real |
| Relatórios | mock | **UI-only** |
| Responsáveis | mock (API `Responsible` existe, gerada, nunca chamada) | **UI-only nesta SPEC** — ver D1 (candidata a virar real, API já existe) |
| Log | mock | **UI-only** |

## 2. Contexto

Legado: `Operations/Page.tsx` + `useOperations.ts` (lista, tipo/modo:
estufagem/embarque × fardos/sacas/granel — "granel" sinalizado como sem
`OperationService` correspondente no Core, não portar). `Operations/
Detail.tsx` despacha as 7 abas; as reais usam componentes `*Real`
(`OperationRomaneioReal`, `OperationContainersReal`, `OperationDocumentosReal`),
as mock usam `OPERATIONS` de `data.ts` com um guard `mockOperation &&` que
some silenciosamente se o id mock não bate com o real (risco identificado no
levantamento — **não repetir esse silent-fail** aqui, ver RF5).

## 3. Escopo

Segmentos de rota em inglês (regra 6): `administrativo`→`administrative`,
`operacoes`→`operations`, `detalhes`→`details`, `documentos`→`documents`,
`relatorios`→`reports`, `responsaveis`→`responsible`. `romaneio` **fica em
português** — é o nome do domínio no Core (`Operation/Romaneio`, hooks
gerados `getApiOperationOperationIdRomaneio...`), não um substantivo comum,
mesmo tratamento que "Vessel"/"Product" (nome próprio do domínio, não
traduzido à força).

1. `operations/index.tsx` — lista real (`Operation` API), filtro por
   tipo/status/cliente, `ViewToggle`.
2. `operations/$id/` — layout de abas:
   - `details` — dados da operação (`OperationDetailDTO`).
   - `romaneio` — CRUD de fardos + import analyze/apply (fluxo de 2 etapas
     já documentado no `AGENTS.md` do Core).
   - `containers` — vínculo de containers à operação (`operation-container`
     gerado: fotos, lacres, status).
   - `documents` — CRUD de documentos (`document` gerado, tipos via lookup).
   - `reports` — **UI-only**.
   - `responsible` — **UI-only nesta SPEC** (ver D1).
   - `log` — **UI-only**.

## 4. Fora do escopo

- Modo "granel" (sem `OperationService` correspondente no Core — mesmo corte
  que o legado já fez).
- Emissão real de relatório (mesma razão da SPEC-05/06 — Core não tem).

## 5. Requisitos funcionais

- **RF1** — Lista: paginação/filtro real.
- **RF2** — Abas reais consomem só hooks Orval gerados (`operation`,
  `romaneio`, `operation-container`, `document`), nunca dado mockado.
- **RF3** — Import de romaneio segue o fluxo de 2 etapas do Core
  (`.../romaneio/import/analyze` → revisão de grupos classificados no
  front → `.../romaneio/import/apply`), sem pular a etapa de revisão.
- **RF4** — Abas UI-only usam dado mockado local, comentado como tal, com
  `mock-data-banner` (SPEC-02) visível no topo — nunca disfarçado de real.
- **RF5** — **Sem silent-fail**: se um id não resolve, a aba mostra estado
  vazio/erro explícito — nunca um `&&` que some sem feedback (bug conhecido
  do legado, não repetir).

## 6. Requisitos não funcionais

- RNF1 — `bun run check` + `lint` passam.
- RNF2 — Zero Zod à mão (schemas gerados de `operation`/`romaneio`/
  `document`).

## 7. Contrato de rota

| Rota | Dado |
| --- | --- |
| `/administrative/operations` | real |
| `/administrative/operations/$id` (redirect → `details`) | — |
| `/administrative/operations/$id/details` | real |
| `/administrative/operations/$id/romaneio` | real |
| `/administrative/operations/$id/containers` | real |
| `/administrative/operations/$id/documents` | real |
| `/administrative/operations/$id/reports` | UI-only |
| `/administrative/operations/$id/responsible` | UI-only (ver D1) |
| `/administrative/operations/$id/log` | UI-only |

Abas como sub-rotas (layout `$id.tsx` + `<Outlet/>`), não estado de tab
local — permite deep-link direto pra uma aba.

## 8. Camada de dados

- Real: hooks Orval de `operation`, `romaneio`, `operation-container`,
  `document` — todos já gerados.
- UI-only: dado mockado local por aba, mesmo padrão da SPEC-05/06.

## 9. Desenho

A lista é a única peça reusada fora desta SPEC (pela SPEC-08, em modo
read-only) — por isso nasce como **componente exportável**, não só JSX
dentro da rota:

```
src/components/operations/
  operations-list.tsx     (lista real + filtros; prop `readOnly` esconde
                           criar/editar/deletar — é o que a SPEC-08 importa)

src/routes/_dashboard/_internal/administrative/operations/
  index.tsx               (<OperationsList /> — modo completo)
  $id/
    route.tsx          (layout de abas + tab nav)
    details/index.tsx
    romaneio/index.tsx
    containers/index.tsx
    documents/index.tsx
    reports/index.tsx        (UI-only, com mock-data-banner)
    responsible/index.tsx    (UI-only, ver D1)
    log/index.tsx             (UI-only, com mock-data-banner)
```

`operations-list.tsx` não reusa `crud-list-page` genérico (SPEC-02) porque
os filtros e o enriquecimento de dados (nome de cliente/produto/navio por
item) são mais complexos do que o molde genérico cobre — ver R4 da SPEC-02,
que pede pra revisar `crud-list-page` contra este caso antes de aprovar a
SPEC-02, exatamente pra decidir se ainda compensa tentar encaixar aqui ou se
Operações fica mesmo como componente à parte.

## 10. Arquivos esperados

| Arquivo | Ação |
| --- | --- |
| `src/components/operations/operations-list.tsx` | criar |
| `src/routes/.../administrative/operations/index.tsx` | criar |
| `src/routes/.../administrative/operations/$id/**` | criar (8 arquivos) |
| `src/layouts/AppShell/nav-config.ts` | editar (item Operações) |
| `src/i18n/dictionaries/*/administrative-operations.json` | criar (4 locales) |

## 11. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Lista + 4 abas reais funcionam ponta a ponta contra o Core (dev) |
| CA2 | Import de romaneio respeita as 2 etapas (analyze → revisão → apply) |
| CA3 | 3 abas UI-only claramente marcadas, sem chamada real |
| CA4 | Nenhuma aba "some" silenciosamente por id não encontrado — sempre estado vazio/erro visível |
| CA5 | `bun run check` + `lint` passam |
| CA6 | `operations-list.tsx` é importável e funciona em modo `readOnly` sem editar o arquivo — é o que a SPEC-08 consome |

## 12. Riscos

- **R1** — Import de romaneio é o fluxo mais complexo do Core consumido
  aqui — revisar `Romaneio.Files.cs` (`Return`/`Export` vazios no Core,
  conforme `Plans/Mapa-Paridade-Portal-Core.md` §4.2) antes de prometer
  export no front.
- **R2** — Aba "Responsáveis" real (D1) depende de validar o contrato de
  `Operation/Responsible` — API gerada mas nunca exercitada, pode ter
  lacuna não descoberta até tentar de verdade.

## 13. Decisões pendentes

- **D1** — Aba "Responsáveis": o Core **já tem** a API (`ResponsibleApi`
  gerada, nunca chamada no legado nem aqui ainda). Torna ela real nesta
  SPEC (diferente do legado, que é 100% mock) ou mantém UI-only por
  paridade estrita com a decisão "espelhar Operações"? A decisão do usuário
  foi sobre a *duplicação de tela de detalhe* (SPEC-08), não
  necessariamente sobre cada aba individual — registrar como ponto a
  confirmar.
- **D2** — Abas como sub-rota (`$id/romaneio`) — confirma, ou prefere
  estado de tab local sem mudar URL (like legado)? Recomendação: sub-rota,
  por deep-link e por já ser o padrão de roteamento do TanStack aqui.

---

**Próximo passo:** `APROVAR SPEC-07`.
