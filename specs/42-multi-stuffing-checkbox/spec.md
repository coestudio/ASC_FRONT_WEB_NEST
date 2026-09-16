# SPEC-42 — Tela de estufagem múltipla por checkbox

- **ID:** SPEC-42
- **Nome:** multi-stuffing-checkbox
- **Status:** DRAFT
- **Autor:** portal-dev-agent (rascunho)
- **Área:** nova tela/aba a definir, `src/components/operations/tabs/Containers.tsx`
  (referência dos modos existentes)
- **Depende de (Core):** a confirmar se o endpoint atual de estufagem
  suporta múltiplos `CargoUnit` numa única chamada, ou se precisa de um
  endpoint novo em lote — referenciar por tema ("spec Core de estufagem
  em lote") se o Core precisar mudar; ver §4.
- **Contexto do pedido:** item do `TODO.md` pedindo uma tela nova que
  liste todos os fardos do romaneio com checkbox, selecione vários de uma
  vez e estufe todos juntos num único container.

---

## 1. Objetivo

Nova tela que lista todos os fardos do romaneio de uma operação com
checkbox de seleção múltipla, permitindo estufar vários fardos de uma vez
no mesmo container — hoje só existe o "Modo A" (estufar um fardo
específico por vez) e o "Modo B" (estufar por quantidade, sem escolher
qual fardo).

## 2. Contexto

`Containers.tsx` já tem 2 modos de estufagem (confirmado pelos endpoints
já usados na aba):

- **Modo A** — `usePostApiOperationOperationIdCargoStuffIdentified`
  (`PostApiOperationOperationIdCargoStuffIdentifiedBody`) — estufa um
  fardo identificado específico.
- **Modo B** — `usePostApiOperationOperationIdCargoStuffQuantity`
  (`PostApiOperationOperationIdCargoStuffQuantityBody`) — estufa por
  quantidade, sem escolher fardos específicos (presumivelmente o Core
  escolhe automaticamente quais fardos, ou trata como "não
  identificados" — confirmar o comportamento exato ao implementar).

O pedido do usuário é um terceiro modo: selecionar **múltiplos fardos
identificados** de uma vez (via checkbox numa listagem) e estufar todos
no mesmo container numa única ação — hoje isso exigiria repetir o Modo A
fardo por fardo.

## 3. Escopo

1. Nova tela/seção que lista os fardos do romaneio (reaproveitando dado
   de `GetApiOperationOperationIdRomaneioQueryOptions` ou o de
   `cargo`/`CargoUnit` conforme o que representar melhor "fardos
   disponíveis para estufar" — a confirmar ao implementar, ver §4).
2. Seleção múltipla via checkbox (mesmo padrão já usado em
   `ImportRomaneioModal`, `Form.Check` com `Set<string>` de ids
   selecionados).
3. Seleção de um container de destino (reaproveitar `SelectAsync` já
   usado em outros formulários da aba Containers).
4. Ação de estufar todos os fardos selecionados nesse container.

## 4. `[NEEDS_DECISION]` — confirmar contrato de estufagem em lote

Não está confirmado, sem testar contra o Core, se
`usePostApiOperationOperationIdCargoStuffIdentified` aceita múltiplos ids
numa única chamada ou é estritamente 1 fardo por chamada
(`PostApiOperationOperationIdCargoStuffIdentifiedBody` — confirmar o
shape exato do body gerado ao implementar). Duas situações possíveis:

1. **Se o endpoint já aceita array de ids** — a nova tela é só front:
   monta uma única chamada com os ids selecionados.
2. **Se o endpoint só aceita 1 id por chamada** — a nova tela dispara N
   chamadas sequenciais (uma por fardo selecionado), tratando sucesso
   parcial (alguns fardos estufados, outros com erro) — isso é uma
   decisão de UX que precisa ser confirmada com o usuário (ex.: "parar no
   primeiro erro" vs. "continuar e reportar quais falharam ao final") e
   pode justificar pedir ao Core um endpoint de lote de verdade (fora do
   escopo desta SPEC decidir sozinho — se a opção 2 for confirmada como
   realidade, marcar como `SCOPE CONFLICT`/depender de spec Core nova
   antes de implementar).

**Aguardando confirmação técnica do shape do endpoint (fácil de checar
lendo o client gerado ao iniciar a implementação) e, se for o caso 2,
decisão do usuário sobre o comportamento de erro parcial** antes de
fechar os requisitos funcionais definitivos.

## 5. Fora do escopo

- Mudar o Modo A/Modo B existentes.
- Desestufar em lote (fora do pedido, ver SPEC-36 para desestufagem
  individual).

## 6. Requisitos funcionais (dependem de §4)

- **RF1** — Nova tela/seção lista fardos do romaneio disponíveis para
  estufar (não já estufados/cancelados), com checkbox de seleção
  múltipla.
- **RF2** — Seleção de container de destino via `SelectAsync`.
- **RF3** — Ação "Estufar selecionados" dispara a estufagem de todos os
  fardos marcados no container escolhido — mecanismo exato (chamada
  única vs. N chamadas) definido pela investigação do §4.
- **RF4** — Feedback de sucesso/erro por fardo, se o mecanismo for N
  chamadas (§4.2).

## 7. Camada de dados

- Reaproveitar `getGetApiOperationOperationIdRomaneioQueryOptions`
  (fardos do romaneio) e `usePostApiOperationOperationIdCargoStuffIdentified`
  — confirmar exatamente o shape aceito antes de desenhar a chamada
  final (§4).

## 8. UI

- Tabela/lista com checkbox por linha + checkbox "selecionar todos"
  (mesmo padrão de `ImportRomaneioModal`).
- Contador de selecionados + botão de ação, desabilitado sem seleção.

## 9. i18n

Namespace `administrative-operations` (novo sub-namespace, ex.
`multiStuffing.*`), 4 locales.

## 10. Arquivos esperados

- Novo arquivo de tela/seção (nome exato a definir na implementação)
- `src/components/operations/tabs/Containers.tsx` (referência/possível
  entrada de navegação para a nova tela)

## 11. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Tela lista fardos do romaneio com checkbox de seleção múltipla |
| CA2 | Selecionar container de destino via `SelectAsync` |
| CA3 | Ação de estufar processa todos os fardos selecionados, com feedback claro de sucesso/erro (conforme mecanismo confirmado no §4) |
| CA4 | `bun run check` + `bun run lint` sem regressão |

## 12. Riscos

- **R1** — Se o endpoint só aceitar 1 fardo por chamada (§4.2), a UX de
  erro parcial precisa ser bem definida com o usuário antes da
  implementação, para não deixar o estado do romaneio inconsistente sem
  feedback claro.
