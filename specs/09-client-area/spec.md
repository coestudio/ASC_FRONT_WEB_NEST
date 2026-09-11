# SPEC-09 — Client: Home, Colaboradores (real), Relatório Final e Acompanhamento (UI-only)

- **ID:** SPEC-09
- **Nome:** client-area
- **Status:** DRAFT
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/routes/_dashboard/client/**` (nova — `client` não é
  `_internal`, é a área de usuário externo)
- **Depende de:** SPEC-00 (namespaces do dicionário), SPEC-02; SPEC-07 pelo
  padrão de dado real de operação
  (Relatório Final/Acompanhamento podem derivar de `operation`/`romaneio`
  reais em vez do array mock do legado — ver D2).

---

## 1. Objetivo

Portar a área Client (usuário externo, `type !== Internal`): Home,
**Colaboradores** (o legado usa mock apesar da API `Collaborator` existir e
nunca ter sido chamada — aqui vira **real**, corrigindo essa lacuna),
Relatório Final e Acompanhamento (UI-only, hoje mock no legado).

**Real vs UI-only:**
| Tela | Legado | Aqui |
| --- | --- | --- |
| Home | sem dado | sem dado |
| Colaboradores | mock (API real nunca chamada, colisão de nome) | **real** |
| Relatório Final | mock (`OPERATIONS` + `OperationRomaneio`/`OperationRelatorios` mock) | **UI-only**, mas ver D2 (pode usar `operation`/`romaneio` reais como fonte em vez de array solto) |
| Acompanhamento | mock (steps sintetizados de `OPERATIONS`) | **UI-only**, idem D2 |

## 2. Contexto

Legado: `Client/Home.tsx` (grid de 3 links). `Collaborators/Page.tsx` +
`List.tsx` + `Form.tsx` — CRUD UI real na forma, mas ligado a uma
`CollaboratorApi` **mock local** definida em `Collaborators/data.ts`, que
colide de nome com a `CollaboratorApi` real gerada (nunca importada em lugar
nenhum do legado). `FinalReport/Page.tsx` e `Tracking/Page.tsx` — telas
inteiras sobre o array `OPERATIONS` mockado.

NewPortal já tem `collaborator` no client gerado (`collaboratorCreate.ts`,
`collaboratorDTO.ts`) — API real, pronta, nunca usada em lugar nenhum
(inclusive no legado). Regra desta sessão (`AGENTS.md`/agente): nunca
reinventar dado mock quando existe API real — Colaboradores vira real aqui.

## 3. Escopo

1. `client/index.tsx` — Home, grid de 3 links (mesmo desenho do legado).
Segmentos de rota em inglês: `colaboradores`→`collaborators`,
`relatorio-final`→`final-report`, `acompanhamento`→`tracking`.

2. `client/collaborators/index.tsx` — `crud-list-page` + `crud-record-modal`
   (SPEC-02, 3 modos) configurados pra `Collaborator` API — mesmo padrão de
   toda tela CRUD desta leva, sem componente próprio.
3. `client/final-report/index.tsx` — UI-only por decisão do usuário
   (`mock-data-banner` da SPEC-02); ver D2 pra fonte do dado (array solto vs
   projeção de `operation`/`romaneio` reais do cliente logado).
4. `client/tracking/index.tsx` — idem, UI-only, ver D2.

## 4. Fora do escopo

- Fluxo de proposta/pagamento (`Plans/Escopo-Adiado-Portal-Core.md` —
  formalmente adiado, não é desta leva).
- Emissão real de relatório final (mesma limitação de backend das SPEC-05/06).

## 5. Requisitos funcionais

- **RF1** — Colaboradores: CRUD real, escopado ao cliente logado (o
  endpoint já deve resolver isso pelo token — confirmar em D1).
- **RF2** — Relatório Final/Acompanhamento: dado mockado ou projetado de
  dado real (conforme D2), nunca escrita real.
- **RF3** — Guard de área: `client` só aparece pra `type !== Internal`
  (regra já existente em `permissions.ts`, sem mudança).

## 6. Requisitos não funcionais

- RNF1 — `bun run check` + `lint` passam.
- RNF2 — Zero Zod à mão (`collaboratorCreate.zod` etc.).
- RNF3 — Nome do arquivo/rota não colide com nada de `_internal` (área
  `client` é irmã, não filha, de `_dashboard/_internal`).

## 7. Contrato de rota

| Rota | Guard | Dado |
| --- | --- | --- |
| `/client` | `authed` + área `client` | — |
| `/client/collaborators` | idem | real |
| `/client/final-report` | idem | UI-only (ou projetado, D2) |
| `/client/tracking` | idem | UI-only (ou projetado, D2) |

## 8. Camada de dados

- Real: hooks Orval de `collaborator` (a API gerada, não a mock do legado).
- UI-only/projetado: conforme D2 — se projetado, hooks Orval de
  `operation`/`romaneio` filtrados pelo cliente logado; se mock puro, array
  local comentado como nas SPECs anteriores.

## 9. Desenho

```
src/routes/_dashboard/client/
  route.tsx                (guard: authed + área client)
  index.tsx                 (Home)
  collaborators/index.tsx    (crud-list-page + crud-record-modal — SPEC-02)
  final-report/index.tsx     (UI-only ou projetado, D2)
  tracking/index.tsx          (idem)
```

## 10. Arquivos esperados

| Arquivo | Ação |
| --- | --- |
| `src/routes/_dashboard/client/route.tsx` | criar |
| `src/routes/_dashboard/client/index.tsx` | criar |
| `src/routes/_dashboard/client/collaborators/index.tsx` | criar |
| `src/routes/_dashboard/client/final-report/index.tsx` | criar |
| `src/routes/_dashboard/client/tracking/index.tsx` | criar |
| `src/layouts/AppShell/nav/client.ts` | criar (fragmento, SPEC-02 §3.1) |
| `src/i18n/dictionaries/*/client.json` | criar (4 locales) |

## 11. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Colaboradores faz CRUD real contra o Core (dev) — confirma que a API `Collaborator` funciona de ponta a ponta, coisa que o legado nunca validou |
| CA2 | Usuário `Internal` não acessa `/client/*` (guard de área) |
| CA3 | Relatório Final/Acompanhamento não têm write real, e a fonte do dado (mock ou projetado) está documentada no código | 
| CA4 | `bun run check` + `lint` passam |

## 12. Riscos

- **R1** — API `Collaborator` real nunca foi exercitada em produção (nem
  no legado) — pode ter lacuna de contrato não descoberta até implementar
  de verdade (mesma classe de risco que a aba Responsáveis da SPEC-07).
- **R2** — Se D2 escolher "projetar de dado real", a tela de Acompanhamento
  precisa de um conceito de "etapas" que o Core não modela explicitamente
  (`OperationStatus` é um enum simples, não um histórico de eventos) — pode
  não dar pra fazer uma timeline real fiel, mesmo projetando.

## 13. Decisões pendentes

- **D1** — Confirmar que `GET /api/collaborator` já escopa por cliente via
  token (usuário externo só vê os próprios colaboradores) ou se precisa de
  filtro explícito no front.
- **D2** — Relatório Final/Acompanhamento: mock solto (mais simples, mais
  fiel à decisão "UI-only") ou projeção de `operation`/`romaneio` reais do
  cliente logado (mais valioso, mas esbarra no R2 acima e amplia escopo)?
  Recomendação: começar mock solto nesta SPEC, abrir SPEC futura se quiser
  projetar depois.

---

**Próximo passo:** `APROVAR SPEC-09`.
