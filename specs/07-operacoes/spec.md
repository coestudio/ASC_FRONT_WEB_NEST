# SPEC-07 — Operações: lista e detalhe (índice geral)

- **ID:** SPEC-07
- **Nome:** operacoes
- **Status:** DRAFT (índice — cada sub-SPEC tem status próprio)
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/routes/_dashboard/_internal/administrative/operations/**`
  (nova)

---

## 1. Objetivo

Portar a tela mais complexa do legado: lista de Operações + detalhe com 7
abas. Espelhando o legado (decisão do usuário), **4 abas ficam reais e 3
ficam UI-only** dentro da mesma tela de detalhe.

Por ser a feature mais complexa da Onda 2, foi **dividida em sub-SPECs**
(decisão do usuário, durante a revisão desta SPEC) — cada uma com sua
própria branch/PR, aprovação e escopo. Este documento é só o **índice
geral**: contexto compartilhado, mapa real vs. UI-only, e a lista de
sub-SPECs com suas dependências. Detalhe de requisitos/critérios de
aceitação/riscos vive em cada sub-SPEC, não aqui.

**Real vs UI-only** (por aba do detalhe):

| Aba | Legado | Aqui | Sub-SPEC |
| --- | --- | --- | --- |
| Lista | real (`OperationApi`) | real | SPEC-07-01 |
| Detalhes | real (`OperationApi`) | real | SPEC-07-03 |
| Romaneio | real (`OperationRomaneioReal`) | real | SPEC-07-04 |
| Containers | real (`OperationContainersReal`) | real | SPEC-07-05 |
| Documentos | real (`OperationDocumentosReal`) | real | SPEC-07-06 |
| Relatórios | mock | **UI-only** | SPEC-07-07 |
| Responsáveis | mock (API `Responsible` existe, gerada, nunca chamada) | **UI-only nesta leva** (candidata a virar real, ver D1 na SPEC-07-08) | SPEC-07-08 |
| Log | mock | **UI-only** | SPEC-07-09 |

Fields de upload compartilhados (Documents/Containers): SPEC-07-00.
Shell de abas (layout comum a todas): SPEC-07-02.

## 2. Contexto

Legado: `Operations/Page.tsx` + `useOperations.ts` (lista, tipo/modo:
estufagem/embarque × fardos/sacas/granel — "granel" sinalizado como sem
`OperationService` correspondente no Core, não portar). `Operations/
Detail.tsx` despacha as 7 abas por estado local (não por URL); as reais
usam componentes `*Real` (`OperationRomaneioReal`, `OperationContainersReal`,
`OperationDocumentosReal`), as mock usam `OPERATIONS` de `data.ts` com um
guard `mockOperation &&` que some silenciosamente se o id mock não bate com
o real (risco identificado no levantamento — **não repetir esse
silent-fail**, regra herdada por todas as sub-SPECs via SPEC-07-02).

## 3. Sub-SPECs e dependências

Segmentos de rota em inglês (regra 6): `administrativo`→`administrative`,
`operacoes`→`operations`, `detalhes`→`details`, `documentos`→`documents`,
`relatorios`→`reports`, `responsaveis`→`responsible`. `romaneio` fica em
português (nome do domínio no Core, ver SPEC-07-04 §3).

| Sub-SPEC | Nome | Depende de | Bloqueia |
| --- | --- | --- | --- |
| SPEC-07-00 | `operations-upload-fields` | SPEC-00 | SPEC-07-05, SPEC-07-06 |
| SPEC-07-01 | `operations-list` | SPEC-00, SPEC-02 | SPEC-08, SPEC-07-03/05/06 (usam `Select`) |
| SPEC-07-02 | `operation-shell` | SPEC-00, SPEC-02 | SPEC-07-03 a SPEC-07-09 |
| SPEC-07-03 | `operation-details` | SPEC-07-01, SPEC-07-02 | — |
| SPEC-07-04 | `operation-romaneio` | SPEC-07-02 | — |
| SPEC-07-05 | `operation-containers` | SPEC-07-00, SPEC-07-01, SPEC-07-02 | — |
| SPEC-07-06 | `operation-documents` | SPEC-07-00, SPEC-07-01, SPEC-07-02 | — |
| SPEC-07-07 | `operation-reports` | SPEC-07-02 | — |
| SPEC-07-08 | `operation-responsible` | SPEC-07-02 | — |
| SPEC-07-09 | `operation-log` | SPEC-07-02 | — |

Cada sub-SPEC nasce de `wave-2-parallel-areas` (ver `specs/BRANCHING.md`
para a árvore completa de branches e ordem de merge) e tem seu próprio
`spec.md` em `specs/07-NN-<slug>/`.

## 4. Fora do escopo (toda a feature)

- Modo "granel" (sem `OperationService` correspondente no Core — mesmo
  corte que o legado já fez).
- Emissão real de relatório (mesma razão da SPEC-05/06 — Core não tem).
- Domínio `CargoUnit`/`InvoiceItem` (`/api/operation/{id}/cargo/**`,
  `/api/operation/{id}/invoice/**` — pesagem, divergência, reconciliação,
  fotos, `cargoUnitEventDTO` paginado). API existe no Core, mas nenhuma
  tela do legado a consome — fora de escopo desta rodada por não ter
  equivalente a portar; candidato a SPEC futura própria (inclusive
  `cargoUnitEventDTO` como possível aba "Log" real, no lugar do mock da
  SPEC-07-09 — decisão adiada, não tomada aqui).

## 5. Namespace i18n e nav compartilhados

Um único fragmento de nav (`administrative-operations.ts`) e um único
namespace i18n (`administrative-operations.json`) cobrem lista + todas as
abas — criados pela SPEC-07-01 (dona da rota de topo), editados
(chaves adicionadas) por cada sub-SPEC de aba/shell subsequente. Nenhuma
sub-SPEC de aba cria fragmento/namespace próprio.

`src/layouts/AppShell/nav/administrativo.ts` — o item legado
`administrativoOperations` (`/operacoes`) é removido pela SPEC-07-01, como
parte da criação do fragmento novo.

## 6. Riscos gerais

- **R1** — Import de romaneio é o fluxo mais complexo do Core consumido
  nesta feature — ver detalhe em SPEC-07-04, R1 (`Romaneio.Files.cs`,
  regiões `Return`/`Export` vazias, `Plans/Mapa-Paridade-Portal-Core.md`
  §4.2).
- **R2** — Aba "Responsáveis" real (D1 na SPEC-07-08) depende de validar o
  contrato de `Operation/Responsible` — API gerada mas nunca exercitada,
  pode ter lacuna não descoberta até tentar de verdade.
- **R3** — Dividir em 10 branches/PRs aumenta a superfície de coordenação
  (ordem de dependência entre elas, ver §3) — mitigado por
  `specs/BRANCHING.md` documentar a árvore completa antes de qualquer uma
  nascer.

## 7. Decisões pendentes (nível de feature)

Decisões específicas de cada aba vivem na sub-SPEC correspondente (ver D1
em SPEC-07-08, D2 em SPEC-07-02, D3 em SPEC-07-01). Nenhuma decisão de
nível de feature em aberto além da divisão em sub-SPECs já registrada
acima.

---

**Próximo passo:** aprovar as sub-SPECs, respeitando a ordem de
dependência do §3 (`APROVAR SPEC-07-00`, `APROVAR SPEC-07-01`,
`APROVAR SPEC-07-02` podem acontecer em paralelo; as demais dependem
delas).
