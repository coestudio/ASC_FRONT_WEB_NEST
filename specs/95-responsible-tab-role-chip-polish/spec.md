# SPEC-95 — Remoção do badge de papel e polish visual da aba Responsável

- **ID:** 95
- **Nome:** responsible-tab-role-chip-polish
- **Status:** IMPLEMENTED
- **Autor:** claude (triagem de leva de ajustes pré-apresentação, pedido do
  usuário em 2026-09-17 — item marcado "Importante")
- **Área:** `src/components/operations/tabs/Responsible.tsx`

## 1. Objetivo

Item 19 da leva do usuário: "Tela de Responsável: remover o badge, melhorar
a visualização com bom UI/UX, deixar bonito pra apresentação, pode seguir o
design da aba de Acesso."

## 2. Contexto (investigado em 2026-09-17)

`Responsible.tsx` já passou por um polish visual na SPEC-87: lista em
cards (`.soft-card p-3`, um por responsável), avatar com iniciais,
nome + tipo (Interno/Externo, virou rótulo discreto na SPEC-87, antes era
badge que competia com os badges de papel). O que **sobrou** de `Badge` é
só um: os papéis do usuário (`item.user.roles`), linha 307-317:

```tsx
{item.user.roles.length > 0 ? (
  <div className="d-flex flex-wrap gap-1 mt-1">
    {item.user.roles.map((role) => (
      <Badge key={role} bg="info" text="dark">
        {t(`administrative-operations.responsible.roles.${role}`)}
      </Badge>
    ))}
  </div>
) : null}
```

Referência citada pelo usuário, `src/routes/_dashboard/admin/access/
index.tsx`: também usa `Badge pill` pra `isActive`/`role` (linhas 241, 378,
381) — ou seja, a tela de referência **não é "sem badge"**, ela usa
`Badge pill bg="success"/"secondary"/"info"` num formato mais compacto
(`pill`, `me-1`) dentro de uma listagem `CrudListPage`. A leitura mais
provável do pedido não é "essa tela não deve ter nenhum indicador visual
de papel", e sim "o `Badge` retangular `bg='info' text='dark'` de hoje
está feio/genérico — adota o mesmo nível de acabamento (pill, cores
consistentes com os tokens de tema) que `admin/access` usa".

## 3. Escopo

- Revisar o chip de papel (`item.user.roles`) pra um formato mais refinado
  — candidatos: `Badge pill` (mesmo componente, só troca formato/cor, menor
  esforço) ou um chip customizado fora de `Badge` (maior controle visual,
  mais esforço). Ver decisão pendente.
- Revisar hierarquia geral do card (espaçamento, tamanho de fonte do
  nome/tipo/papéis/contato) comparando lado a lado com `admin/access`.
- Manter a estrutura de card por responsável (avatar + nome + tipo + papéis
  + contato + botão desvincular) — sem mudar a interação (SPEC-87 já
  resolveu o botão "Desvincular" estourando o card, commit `f17c193`).

## 4. Fora do escopo

- Mudar `admin/access/index.tsx` (só referência visual, não alvo).
- Mudar a lógica de vínculo/desvínculo de responsável.

## 5. Decisão pendente

```
[NEEDS_DECISION]

"Remover o badge" — remove de fato todo indicador visual de papel (só
texto), ou troca o `Badge bg="info" text="dark"` atual por um formato mais
refinado (ex. `Badge pill`, mesma ideia de `admin/access`)?

Opções:
1. Sem `Badge` nenhum — papéis viram texto simples separado por vírgula
   ou "·" (ex. "Agente, Supervisor"), sem chip colorido. Mais limpo, mas
   perde o destaque visual de "isso é uma lista de tags", que pode ser
   intencional (usuário pode ter vários papéis).
2. `Badge pill` (mesmo componente `react-bootstrap`, só troca forma/cor),
   igual ao padrão de `admin/access` que o usuário citou como referência.
   Resolve "está feio" sem perder o destaque de múltiplos papéis.
3. Chip customizado fora de `Badge` (ex. `span` com `.rounded-pill` e
   tokens de tema direto, sem depender do componente `Badge` do
   react-bootstrap) — mais controle de estilo, mais código novo.

Impacto: opção 2 é a mais rápida e mais alinhada à referência que o
próprio usuário deu; opção 1 é a leitura mais literal do pedido
("remover o badge") mas diverge da referência citada (que também usa
badge, só que `pill`).

Aguardando decisão do usuário.
```

## 6. UI

A definir conforme decisão da §5 — sem novo componente compartilhado
previsto além do que já existe (`Badge` do react-bootstrap, ou um chip
simples inline se a opção 3 for escolhida).

## 7. i18n

Sem chave nova — reusa `administrative-operations.responsible.roles.*` já
existente.

## 8. Critérios de aceitação (a validar após implementação)

| # | Critério |
| --- | --- |
| 1 | Papéis do responsável exibidos conforme a opção escolhida na §5, sem `Badge bg="info" text="dark"` retangular genérico |
| 2 | Nenhuma regressão no fluxo de desvincular responsável |
| 3 | Visual comparável em nível de acabamento ao card de `admin/access` (citado pelo usuário como referência) |
| 4 | `bun run check` e `bun run lint` sem novos erros |

## 9. Riscos

Baixo — mudança de apresentação isolada a um componente (`Responsible.tsx`)
já recentemente trabalhado (SPEC-87, commit `f17c193`).

## 10. Implementation Notes

**Decisão `[NEEDS_DECISION]` resolvida (§5).** Instrução do usuário: seguir
**literalmente** o que `admin/access/index.tsx` já faz hoje pro mesmo tipo
de dado (papel/role do usuário) — não a leitura genérica de "opção 2"
sugerida na spec original. Investigação: em `admin/access/index.tsx`,
`Badge pill` é usado só pra campos **binários** (`isActive` linha 241/378,
`type` Interno/Externo linha 381) — a coluna "papel" (`u.roles`, mesmo tipo
de dado multi-valor de `Responsible.tsx`) é **texto simples** separado por
vírgula (linha 234: `u.roles.map((r) => roleLabelByValue.get(r) ?? r).join(", ")`),
sem `Badge` nenhum. Ou seja, seguir literalmente a referência citada =
**opção 1** (texto puro), não opção 2 — a leitura mais próxima do pedido
"remover o badge" bate exatamente com o que a referência já faz pro mesmo
dado.

**O que foi implementado:** o `Badge bg="info" text="dark"` por papel virou
um único `<div className="small text-body-secondary mt-1">` com os papéis
unidos por `", "` — mesmo formato/classe de texto secundário que o rótulo
de tipo (Interno/Externo) logo acima já usava (SPEC-87), agora os dois
seguem a mesma linguagem visual. Import `Badge` removido de
`Responsible.tsx` (ficou sem uso). Estrutura do card (avatar, nome,
contato, botão desvincular) mantida sem mudança — já alinhada ao nível de
acabamento de `admin/access` desde a SPEC-87, sem divergência adicional
encontrada na revisão lado a lado.

**Arquivos alterados:** `src/components/operations/tabs/Responsible.tsx`.

**Comandos executados:**
- `bun run check` — VERIFIED, sem erros.
- `bun run lint` — VERIFIED, 0 errors / 63 warnings (mesmo baseline, sem
  warning novo — remoção do import não usado inclusive evita um warning a
  mais).

**Critérios de aceitação:**

| # | Critério | Resultado |
| --- | --- | --- |
| 1 | Papéis sem `Badge bg="info" text="dark"` retangular | PASS |
| 2 | Sem regressão no fluxo de desvincular | PASS (nenhuma lógica tocada) |
| 3 | Acabamento comparável a `admin/access` | PASS (mesmo tratamento literal: texto simples pra papel multi-valor) |
| 4 | `bun run check`/`lint` sem novos erros | PASS |

**Limitações conhecidas:** sem verificação visual em navegador nesta
sessão (mesma ressalva das SPECs anteriores desta leva).
