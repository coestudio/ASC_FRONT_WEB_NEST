# SPEC-06 — Administrativo: Log e Ocorrências (UI-only)

- **ID:** SPEC-06
- **Nome:** administrativo-log-ocorrencias
- **Status:** DRAFT
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/routes/_dashboard/_internal/administrative/{log,occurrences}/**` (nova)
- **Depende de:** SPEC-00 (namespaces do dicionário), SPEC-02

---

## 1. Objetivo

Portar Log (auditoria) e Ocorrências (incidentes/exceções) como telas
**UI-only** — não existe módulo `log`/`audit`/`occurrence` em
`src/api/generated/**` (client gerado pelo Orval a partir do OpenAPI do
Core) — sem endpoint equivalente hoje. Por decisão do usuário, a estrutura
entra agora mesmo assim, com dado mockado de propósito, pra não travar o
front esperando o backend.

**Real vs UI-only:** as duas telas são 100% UI-only.

## 2. Contexto

Legado: `Log/Page.tsx` e `Ocorrencias/Page.tsx` — cada uma com um array
hardcoded (`LOGS`, `OCORRENCIAS`) e uma tabela filtrável. Nenhuma chamada de
rede em nenhuma das duas.

## 3. Escopo

1. `administrative/log/index.tsx` — tabela de eventos (ator, ação, entidade,
   timestamp), filtro por período/ator/ação, dado mockado tipado.
2. `administrative/occurrences/index.tsx` (URL; rótulo continua
   "Ocorrências") — tabela de ocorrências
   (descrição, severidade, status, responsável), filtro por severidade/
   status, dado mockado tipado.
3. Ambas com `mock-data-banner` (SPEC-02) no topo, marcando visualmente como
   dado de exemplo — não fingir que é real.

## 4. Fora do escopo

- Qualquer persistência (nem local nem remota) — é leitura de array estático
  em memória, igual ao legado.
- Gerar log de verdade a partir de ações do próprio NewPortal (seria
  necessário um endpoint de auditoria no Core, que não existe).

## 5. Requisitos funcionais

- **RF1** — As duas tabelas renderizam o array mockado. Os controles de
  filtro (período/ator/ação no Log; severidade/status em Ocorrências) são
  **visuais apenas** nesta SPEC — mockup de UI, sem lógica de filtragem
  real (não precisam de slot novo em `crud-list-page` nem filtragem
  client-side própria). Filtragem funcional fica para SPEC dedicada, quando
  a integração com dado real acontecer (ver D3).
- **RF2** — Nenhuma delas faz `fetch`/chama hook Orval.
- **RF3** — `mock-data-banner` visível em ambas ("dados de exemplo —
  aguardando endpoint no Core", texto via i18n).

## 6. Requisitos não funcionais

- RNF1 — `bun run check` + `lint` passam.
- RNF2 — Reaproveita `crud-list-page` (SPEC-02) como componente de tabela —
  já é genérico o bastante (recebe `items: T[]` direto), sem precisar de
  extensão nesta SPEC (filtro é só visual, ver RF1/D3).

## 7. Contrato de rota

| Rota | Dado |
| --- | --- |
| `/administrative/log` | UI-only |
| `/administrative/occurrences` | UI-only |

## 8. Camada de dados

Nenhuma — array local tipado em `src/data/` (mesmo padrão que já existe em
`src/data/politicas.ts`/`servicos.ts` para conteúdo estático do site
público), com comentário `// MOCK — sem módulo log/audit/occurrence em
src/api/generated, ver specs/06-.../spec.md`. Não há DTO gerado do Orval
envolvido nesta SPEC — sem dependência da extensão de tipo "grupo" que a
SPEC-04 introduz em `LayoutField`/`RenderFields` (essa dependência só se
aplica a SPEC-05, que consome `ClientCreate.address`).

## 9. Desenho

```
src/data/
  audit-log-mock.ts       (array tipado, comentado como mock)
  occurrences-mock.ts

src/routes/_dashboard/_internal/administrative/
  log/index.tsx
  occurrences/index.tsx
```

Duas telas independentes: fragmento nav e namespace i18n próprios para cada
uma (`administrative-log` / `administrative-occurrences`), mesmo padrão 1:1
já usado por SPEC-04 (`administrative-registry`), SPEC-05
(`administrative-clients`) e SPEC-07 (`administrative-operations`) — não um
fragmento único cobrindo as duas.

## 10. Arquivos esperados

| Arquivo | Ação |
| --- | --- |
| `src/data/audit-log-mock.ts` | criar |
| `src/data/occurrences-mock.ts` | criar |
| `src/routes/.../administrative/log/index.tsx` | criar |
| `src/routes/.../administrative/occurrences/index.tsx` | criar |
| `src/layouts/AppShell/nav/administrative-log.ts` | criar (fragmento, SPEC-02 §3.1 — só o item de Log) |
| `src/layouts/AppShell/nav/administrative-occurrences.ts` | criar (fragmento, SPEC-02 §3.1 — só o item de Ocorrências) |
| `src/i18n/dictionaries/*/administrative-log.json` | criar (4 locales) |
| `src/i18n/dictionaries/*/administrative-occurrences.json` | criar (4 locales) |
| `src/layouts/AppShell/nav/administrativo.ts` | editar — remover `administrativoLog` (`/administrativo/log`) e `administrativoOccurrences` (`/administrativo/ocorrencias`) hoje hard-coded; migram pros dois fragmentos novos acima. Não mexer nos demais itens (escopo de SPEC-04/05/07) |

## 11. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | `grep -rn "getApi\|useQuery\|fetch(" src/routes/.../administrative/{log,occurrences}` não acha nada — confirma zero chamada real |
| CA2 | `mock-data-banner` visível nas duas telas (não um aviso ad hoc reescrito localmente) |
| CA3 | Controles de filtro aparecem na UI das duas telas (mockup visual); nenhuma lógica de filtragem real é esperada nesta SPEC |
| CA4 | `bun run check` + `lint` passam |

## 12. Riscos

- **R1** — Ficar esquecido como "mock pra sempre" se o Core nunca ganhar
  endpoint de auditoria. Mitigação: o aviso na UI e o comentário no código
  deixam isso rastreável; revisitar quando/se `src/api/generated/**` ganhar
  um módulo `log`/`audit`/`occurrence` (sinal de que `just map` já pegou o
  endpoint novo do Core).

## 13. Decisões pendentes

- **D1** — Vale a pena já desenhar o *shape* de dado como se fosse a futura
  `AuditLogDTO`/`OccurrenceDTO` do Core (pra trocar por real depois só na
  camada de dados, sem mexer na UI)? Recomendação: sim.
- **D2** — Estas duas telas continuam em `administrative` como no legado, ou
  fazem mais sentido como seção própria "Auditoria" no nav? Legado mantém em
  Administrativo — manter, mudar depois se pedido.
- **D3** — Resolvido: filtros (período/ator/ação, severidade/status) são
  **só visuais** nesta SPEC, sem filtragem real — é mockup, sem ligação com
  back-end. Integração real (filtragem funcional sobre dado real) fica para
  SPEC dedicada, futura, quando o Core ganhar endpoint de auditoria/
  ocorrências. Não requer extensão de `crud-list-page` nem filtragem
  client-side própria nesta SPEC.

---

**Próximo passo:** `APROVAR SPEC-06`.
