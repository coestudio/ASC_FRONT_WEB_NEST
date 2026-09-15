# SPEC-08 — Operacional: Home + Operações (read-only) + detalhe mock separado

- **ID:** SPEC-08
- **Nome:** operacional
- **Status:** IMPLEMENTED
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/routes/_dashboard/_internal/operational/**` (nova — URL
  em inglês, `operacional`→`operational`; rótulo continua "Operacional")
- **Depende de:** SPEC-00 (namespaces do dicionário), SPEC-02, **SPEC-07-01**
  (`operations-list`, sub-SPEC de `specs/07-operacoes/spec.md` — reusa
  `operations-list.tsx` em modo read-only; não depende das demais
  sub-SPECs de SPEC-07)

---

## 1. Objetivo

Portar a área Operacional: Home simples + reuso **read-only** da lista de
Operações (SPEC-07) + uma tela de detalhe **separada e mock**
(`OperacaoDetail`), espelhando a duplicação que já existe no legado — decisão
explícita do usuário de não unificar com o detalhe real da SPEC-07 nesta
rodada.

**Real vs UI-only:** Home = sem dado (só links). Lista = real, reusada em
modo `readOnly` (mesma lista da SPEC-07). Detalhe (`OperacaoDetail`) =
**UI-only**, espelhando que no legado essa tela específica nunca foi
migrada para os componentes `*Real`.

## 2. Contexto

Legado: `Operacional/Home.tsx` (link único pra lista read-only).
`Operacional/OperacaoDetail/Page.tsx` + `ContainerDetail.tsx` — busca por id
no array mock `OPERATIONS`, usa componentes mock (`OperationContainers`,
`OperationFotos`, **não** as versões `*Real` da SPEC-07). É tecnicamente uma
segunda implementação de "detalhe de operação", divergente da de
Administrativo/Operações.

O usuário decidiu manter essa duplicação (não consolidar num componente só)
— então esta SPEC entrega a tela mock separada de propósito, não por
descuido.

## 3. Escopo

1. `operational/index.tsx` — Home com link pra lista.
2. `operational/operations/index.tsx` — reuso do componente de lista da
   SPEC-07 com prop `readOnly` (sem criar/editar/deletar, só visualizar).
3. `operational/operations/$id/index.tsx` — **detalhe próprio e mock**,
   independente do `$id` real de Operações (dado mockado local, com
   containers/fotos mock — não usa `operation-container` gerado aqui).

## 4. Fora do escopo

- Qualquer escrita nesta área (é toda leitura/visualização, por design da
  área Operacional no legado).
- Consolidar com o detalhe real da SPEC-07 (decisão explícita de não
  fazer isso agora).

## 5. Requisitos funcionais

- **RF1** — Lista reusa o mesmo componente de dado real da SPEC-07, só com
  affordances de edição escondidas (`readOnly`).
- **RF2** — Detalhe é claramente mock: `mock-data-banner` (SPEC-02) visível
  no topo, mesmo comentário `// MOCK` das SPEC-05/07.
- **RF3** — Navegar de "Operacional > Operações" pro detalhe usa um id que
  **não** precisa bater com o id real do Core (é uma tela ilustrativa,
  como no legado) — mas a UI não pode fingir que é dado real.

## 6. Requisitos não funcionais

- RNF1 — `bun run check` + `lint` passam.
- RNF2 — Reuso de componente real: não duplicar o componente de lista da
  SPEC-07, só parametrizar.

## 7. Contrato de rota

| Rota                          | Dado               |
| ----------------------------- | ------------------ |
| `/operational`                | — (Home, só links) |
| `/operational/operations`     | real, read-only    |
| `/operational/operations/$id` | UI-only            |

Guard: `_dashboard/_internal` já cobre a área `operacional` (nome da área em
`permissions.ts`/`getUserAreas` não muda — só a URL da rota).

## 8. Camada de dados

- Lista: mesmos hooks Orval de `operation` da SPEC-07.
- Detalhe: dado mockado local (mesmo padrão das SPECs UI-only anteriores).

## 9. Desenho

```
src/routes/_dashboard/_internal/operational/
  index.tsx                 (Home)
  operations/
    index.tsx                (<OperationsList readOnly /> — de
                              src/components/operations/operations-list.tsx,
                              criado na SPEC-07-01, só importado aqui)
    $id/index.tsx              (detalhe mock próprio, NÃO reusa o das
                              sub-SPECs de detalhe da SPEC-07)
```

## 10. Arquivos esperados

| Arquivo                                               | Ação                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/.../operational/index.tsx`                | criar                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `src/routes/.../operational/operations/index.tsx`     | criar                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `src/routes/.../operational/operations/$id/index.tsx` | criar                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `src/layouts/AppShell/nav/operacional.ts`             | **editar** (D2 — já existe, criado como placeholder pela SPEC-02 com URLs em português: `to: "/operacional"`, `/operacional/operacoes`; troca os 2 `to:` para `/operational`, `/operational/operations`, inglês conforme §3. `labelKey`s ficam como estão — `navigation.operacional*` já existe e já está traduzido nos 4 locales, mesmo tratamento da SPEC-03 D4/SPEC-09 D3). Arquivo continua se chamando `operacional.ts` (nome de arquivo não muda, só as rotas dentro) |
| `src/i18n/dictionaries/*/operational.json`            | criar (4 locales)                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

## 11. Critérios de aceitação

| #   | Critério                                                                      |
| --- | ----------------------------------------------------------------------------- |
| CA1 | Lista real em modo leitura (sem botão criar/editar/deletar visível)           |
| CA2 | Detalhe claramente marcado como mock, independente do detalhe real da SPEC-07 |
| CA3 | `bun run check` + `lint` passam                                               |

## 12. Riscos

- **R1** — Herdar a confusão do legado (duas telas de "detalhe de
  operação" com comportamento diferente) é uma dívida técnica conhecida e
  aceita por decisão do usuário — registrar aqui pra não ser "redescoberta"
  como bug depois.

## 13. Decisões pendentes

- **D1** — Resolvido: usa `mock-data-banner` (SPEC-02), mesmo componente das
  outras SPECs UI-only — nada específico a decidir aqui.
- **D2** — Resolvido (mesmo padrão da SPEC-03 D4/SPEC-09 D3):
  `src/layouts/AppShell/nav/operacional.ts` já existe (placeholder da
  SPEC-02, URLs em português e um link presumivelmente incompleto — ver
  §10). Esta SPEC edita esse arquivo — não cria — trocando os `to:` pras
  URLs em inglês definidas no §7.

---

**Próximo passo:** `APROVAR SPEC-08`.

---

## Implementation Notes

**Arquivos criados:**

- `src/routes/_dashboard/_internal/operational/index.tsx` — Home com grid de
  cards (mesmo desenho de `client/index.tsx`, SPEC-09), único card pra
  `/operational/operations`.
- `src/routes/_dashboard/_internal/operational/operations/index.tsx` —
  `<OperationsList readOnly />` dentro de `PageLayout`, sem editar
  `operations-list.tsx` (o `readOnly` já existia da SPEC-07-01).
- `src/routes/_dashboard/_internal/operational/operations/$id/index.tsx` —
  detalhe mock próprio (`MOCK_OPERATIONS` local, comentário `// MOCK`),
  `MockDataBanner` no topo, header com badges (status/tipo/modo), abas
  (Detalhes/Containers/Operacional/Split — as duas últimas placeholder "em
  construção"), tabela de containers mock com modal somente-leitura de
  detalhe (sem inserir/lacrar/editar, por escopo — §4). Estado "não
  encontrado" com link de volta pra lista, mesmo padrão do legado.
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/operational.json` — namespace novo
  (`home.*`, `detail.*`), mesma árvore nos 4 locales.

**Arquivos editados:**

- `src/layouts/AppShell/nav/operacional.ts` — os 2 `to:` trocados de
  `/operacional`/`/operacional/operacoes` pra `/operational`/
  `/operational/operations` (D2). `labelKey`s não mudaram.
- `src/i18n/dictionaries.ts` — import estático de
  `pt-BR/operational.json` + entrada `operational: ptBROperational` no
  objeto `ptBR` (mesmo padrão dos demais namespaces — necessário pro tipo
  `Dictionary` reconhecer as novas chaves).
- `src/routeTree.gen.ts` — regenerado (`vite build`) para incluir as 3 rotas
  novas. Não editado à mão.

**Comandos executados:**

- `bun run lint` (baseline, antes de tocar em qualquer arquivo): `66 problems
  (3 errors, 63 warnings)` — os 3 erros são pré-existentes em
  `src/lib/session.server.ts` (`react-hooks/rules-of-hooks`), fora do escopo
  desta SPEC. **VERIFIED**.
- `bun run check` (baseline): limpo. **VERIFIED**.
- `node_modules/.bin/vite build` (pra regenerar `routeTree.gen.ts` via
  plugin do TanStack Router — `bun run build:azure`/`build` disparam
  `check:api` via hook `pre*`, que exige o Core rodando; rodei o binário do
  Vite direto pra evitar essa dependência de rede só para o build de
  codegen). Build concluído (`✓ built in 457ms`), `.output/` gerado e
  ignorado pelo `.gitignore` (`/.output`), não versionado. **VERIFIED**.
- `bun run check` (depois): limpo, `tsc --noEmit` sem erros. **VERIFIED**.
- `bun run lint` (depois): `66 problems (3 errors, 63 warnings)` — idêntico
  ao baseline, nenhum warning/erro novo introduzido. **VERIFIED**.
- `bunx prettier --write` rodado só nos arquivos tocados por esta SPEC (rota
  `$id/index.tsx` tinha 4 warnings de formatação, corrigidos; os demais
  arquivos já estavam formatados). Não rodei `bun run format` sem escopo.

**Critérios de aceitação:**

| # | Critério | Resultado |
| --- | --- | --- |
| CA1 | Lista real em modo leitura (sem botão criar/editar/deletar visível) | PASS — `<OperationsList readOnly />`, prop já suportada pelo componente da SPEC-07-01 |
| CA2 | Detalhe claramente marcado como mock, independente do detalhe real da SPEC-07 | PASS — `MockDataBanner` no topo, comentário `// MOCK`, dado 100% local, nenhum import de `operation-container` gerado |
| CA3 | `bun run check` + `lint` passam | PASS — check limpo, lint idêntico ao baseline pré-existente |

**Decisões tomadas durante a implementação:**

- Reaproveitei o layout/estilo já estabelecido em `client/index.tsx` (SPEC-09)
  pra Home (grid de `Card` com `Link`), em vez de portar o CSS Bootstrap
  cru (`soft-card`, `eyebrow`) do legado `Operacional/Home.tsx` — mantém
  consistência com o design system atual (Bootstrap + tokens), conforme
  pedido do usuário de "adaptar ao design system atual".
- No detalhe mock, não portei as ações de escrita do legado
  (`ContainerDetail.tsx`: inserir/lacrar/editar via modais com formulário) —
  fora do escopo por definição explícita da própria SPEC (§4: "qualquer
  escrita nesta área"). O modal de detalhe do container é só leitura
  (peso atual/líquido/tara).
- Status/tipo/modo do mock usam chaves de tradução (`statusKey`/`typeKey`/
  `modeKey` + `t()`), não string solta, seguindo a regra de i18n mesmo em
  dado mock (mesmo padrão de `MOCK_STEPS`/`labelKey` em
  `client/tracking/index.tsx`).
- `routeTree.gen.ts` foi regenerado via `vite build` direto (não
  `bun run build`) porque os scripts `npm`/`bun run build*` disparam
  `predev`/`prebuild` → `check:api`, que exige o Core acessível em rede;
  chamar o binário do Vite evita essa dependência só para o codegen de
  rotas.

**Limitações conhecidas:**

- R1 da própria SPEC (duas telas de "detalhe de operação" com comportamento
  diferente — real em Administrativo, mock em Operacional) é dívida técnica
  aceita por decisão do usuário, não uma lacuna desta implementação.
- Não há navegação de linha da lista pro detalhe mock (`operations-list.tsx`
  abre modal inline de visualização, não navega pra rota `$id`) — a SPEC não
  pede essa integração (arquivos esperados não incluem editar
  `operations-list.tsx`), e o `$id` mock é acessível diretamente pela URL,
  como no legado.
