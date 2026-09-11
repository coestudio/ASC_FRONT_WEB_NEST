# SPEC-08 — Operacional: Home + Operações (read-only) + detalhe mock separado

- **ID:** SPEC-08
- **Nome:** operacional
- **Status:** DRAFT
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/routes/_dashboard/_internal/operational/**` (nova — URL
  em inglês, `operacional`→`operational`; rótulo continua "Operacional")
- **Depende de:** SPEC-00 (namespaces do dicionário), SPEC-02, SPEC-07
  (reusa a lista de Operações em modo
  read-only)

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
  no topo, mesmo comentário `// MOCK` das SPEC-05/06/07.
- **RF3** — Navegar de "Operacional > Operações" pro detalhe usa um id que
  **não** precisa bater com o id real do Core (é uma tela ilustrativa,
  como no legado) — mas a UI não pode fingir que é dado real.

## 6. Requisitos não funcionais

- RNF1 — `bun run check` + `lint` passam.
- RNF2 — Reuso de componente real: não duplicar o componente de lista da
  SPEC-07, só parametrizar.

## 7. Contrato de rota

| Rota | Dado |
| --- | --- |
| `/operational` | — (Home, só links) |
| `/operational/operations` | real, read-only |
| `/operational/operations/$id` | UI-only |

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
                              criado na SPEC-07, só importado aqui)
    $id/index.tsx              (detalhe mock próprio, NÃO reusa o da SPEC-07)
```

## 10. Arquivos esperados

| Arquivo | Ação |
| --- | --- |
| `src/routes/.../operational/index.tsx` | criar |
| `src/routes/.../operational/operations/index.tsx` | criar |
| `src/routes/.../operational/operations/$id/index.tsx` | criar |
| `src/layouts/AppShell/nav-config.ts` | editar |
| `src/i18n/dictionaries/*/operational.json` | criar (4 locales) |

## 11. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Lista real em modo leitura (sem botão criar/editar/deletar visível) |
| CA2 | Detalhe claramente marcado como mock, independente do detalhe real da SPEC-07 |
| CA3 | `bun run check` + `lint` passam |

## 12. Riscos

- **R1** — Herdar a confusão do legado (duas telas de "detalhe de
  operação" com comportamento diferente) é uma dívida técnica conhecida e
  aceita por decisão do usuário — registrar aqui pra não ser "redescoberta"
  como bug depois.

## 13. Decisões pendentes

- **D1** — Resolvido: usa `mock-data-banner` (SPEC-02), mesmo componente das
  outras SPECs UI-only — nada específico a decidir aqui.

---

**Próximo passo:** `APROVAR SPEC-08`.
