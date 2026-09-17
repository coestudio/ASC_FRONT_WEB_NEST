# SPEC-58 — Romaneio: novas colunas de exibição (Instrução/Pilha/Pesos/Contrato)

- **ID:** SPEC-58
- **Nome:** romaneio-display-columns
- **Status:** IMPLEMENTED (2026-09-17)
- **Autor:** claude (pedido do usuário, 2026-09-16)
- **Área:** `src/components/operations/tabs/Romaneio.tsx`,
  `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json`.
- **Depende de:** `specs/53-romaneio-bulk-select-actions` — já
  `IMPLEMENTED` (confirmado antes desta implementação).

---

## 1. Objetivo

Adicionar à tabela da aba Romaneio as colunas: **Instrução**, **Lote**
(já existe), **Pilha**, **Peso Tara**, **Peso** (já existe), **Peso
Bruto**, **Contrato** — todos campos que já existem em `RomaneioDTO` e já
são editáveis no formulário de criar/editar, mas hoje não aparecem na
tabela.

## 2. Contexto — por que depois da SPEC-53

`Romaneio.tsx` hoje mostra só 4 colunas de dado (`itemIdentifier`,
`itemCode`, `lote`, `peso`) + `actions`
(`src/components/operations/tabs/Romaneio.tsx:205-234`). `RomaneioDTO`
(`warren/Core/Domain/Operations/Romaneio/Romaneio.DTO.cs`) já expõe todos
os campos pedidos — nenhum precisa de mudança de contrato/`just map`,
esta SPEC é 100% front-end, só rearranjo de `columns` em `CrudColumn<
RomaneioDTO>[]`.

`specs/53-romaneio-bulk-select-actions` (ainda `DRAFT`, depende por sua
vez de `warren/Core/specs/43`) também mexe na mesma lista de `columns` do
mesmo arquivo: adiciona coluna "Nota Fiscal" (com `sortKey`), coluna
"Estufado" (badge), checkbox de seleção à esquerda, e reordena/remove a
coluna de exclusão individual. Implementar SPEC-58 antes correria risco
de conflito de merge e de decidir posição relativa de colunas duas vezes
— por pedido do usuário, SPEC-58 nasce **depois** de SPEC-53 estar
`IMPLEMENTED`, incorporando o layout de colunas que a SPEC-53 deixar
pronto (checkbox + Fardo + Código + Nota Fiscal + Estufado + as novas
desta SPEC + Peso + Ações).

## 3. Escopo

`columns` de `Romaneio.tsx` ganha, entre `itemCode` e `lote` (posição
exata a confirmar contra o resultado final da SPEC-53 — ver §7), as
colunas novas:

- **Instrução** (`instruction`) — texto livre, sem formatação especial.
- **Pilha** (`pilha`) — texto livre; pode vir vazio (`Pilha` não é
  `[Required]` no Model) — renderiza `"—"` quando vazio, mesmo padrão já
  usado em `peso` (`r.peso != null ? ... : "—"`).
- **Peso Tara** (`pesoTara`) — numérico, `align: "end"`, mesmo padrão de
  `peso`.
- **Peso Bruto** (`pesoBruto`) — numérico, `align: "end"`, mesmo padrão.
- **Contrato** (`contrato`) — texto livre; pode vir vazio (não
  `[Required]`) — `"—"` quando vazio.

`Lote` e `Peso` já existem, sem mudança de comportamento — só de posição
relativa às colunas novas (ordem final §7).

Nenhuma mudança de formulário (`fields`), de import/export, de filtro ou
de ordenação — só a lista de colunas exibidas na tabela.

## 4. Fora do escopo

- Ordenação clicável (`sortKey`) nas colunas novas — SPEC-53 já cobre
  `notaFiscal`/`lote`; se o usuário quiser ordenar por Peso/Pilha/etc.
  depois, é pedido novo, SPEC própria.
- Qualquer mudança em `RomaneioDTO`/Core — todos os campos já existem no
  contrato atual.
- Responsividade/scroll horizontal da tabela com 9-10 colunas de dado —
  se a tabela ficar larga demais em telas estreitas, isso é achado a
  registrar na implementação, não resolvido preventivamente aqui (mesmo
  padrão de `<Table responsive>` já em uso, se já não cobrir).

## 5. Requisitos funcionais

- **RF1** — Coluna "Instrução" mostra `r.instruction`.
- **RF2** — Coluna "Pilha" mostra `r.pilha` ou `"—"` se vazio.
- **RF3** — Coluna "Peso Tara" mostra `r.pesoTara`, alinhada à direita.
- **RF4** — Coluna "Peso Bruto" mostra `r.pesoBruto`, alinhada à direita.
- **RF5** — Coluna "Contrato" mostra `r.contrato` ou `"—"` se vazio.
- **RF6** — Colunas `Lote`/`Peso` já existentes continuam funcionando
  sem regressão, só reposicionadas conforme §7.

## 6. i18n

Chaves novas em `administrative-operations.romaneio.*` (4 locales,
`pt-BR` canônico):

- `colInstruction` — "Instrução"
- `colPilha` — "Pilha"
- `colPesoTara` — "Peso Tara (kg)"
- `colPesoBruto` — "Peso Bruto (kg)" — pedido do usuário disse "Peso .B",
  lido como abreviação de "Peso Bruto"; rótulo completo escolhido pra
  consistência com `colPeso: "Peso (kg)"` já existente (mesmo padrão
  "nome + unidade"). Se o usuário quiser o texto abreviado literal
  ("Peso B."), ajustar na implementação — não muda a chave, só o valor.
- `colContrato` — "Contrato"

(`colLote`/`colPeso` já existem, sem mudança.)

## 7. `[NEEDS_DECISION]` — ordem final das colunas

Ordem exata depende do resultado da SPEC-53 (que roda antes). Proposta
de trabalho, a confirmar quando SPEC-53 estiver `IMPLEMENTED`:

```
[checkbox] Fardo | Código | Nota Fiscal | Instrução | Lote | Pilha |
Peso Tara | Peso | Peso Bruto | Contrato | Estufado | [Ações]
```

Critério usado na proposta: identificadores primeiro (Fardo/Código/NF),
depois os campos de conteúdo na ordem pedida pelo usuário nesta
conversa (Instrução, Lote, Pilha, Peso Tara, Peso, Peso Bruto, Contrato),
Estufado por último antes de Ações (mesmo lugar que SPEC-53 já propõe).
Confirmar com o usuário antes de implementar SPEC-58 — não presumir a
ordem proposta como aprovada só por estar escrita aqui.

## 8. Arquivos esperados

- `src/components/operations/tabs/Romaneio.tsx`
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json`

## 9. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Tabela da aba Romaneio mostra as 5 colunas novas (Instrução, Pilha, Peso Tara, Peso Bruto, Contrato) com dado correto por linha. |
| CA2 | Campos vazios (`Pilha`/`Contrato`) mostram `"—"`, mesmo padrão de `Peso`. |
| CA3 | Colunas numéricas (`Peso Tara`/`Peso Bruto`) alinhadas à direita. |
| CA4 | `Lote`/`Peso` (já existentes) continuam funcionando sem regressão. |
| CA5 | 4 dicts de i18n com as chaves novas, mesmas chaves nos 4 locales. |
| CA6 | `bun run check` + `bun run lint` sem regressão. |

## 10. Riscos

- **R1** — Tabela com muitas colunas pode exigir scroll horizontal em
  telas estreitas — sem solução prevista nesta SPEC (§4), registrar como
  achado se ocorrer.
- **R2** — Depende da SPEC-53 estar implementada antes (§2/§7) — se a
  ordem de implementação for invertida por qualquer motivo, esta SPEC
  precisa ser revisada antes de codar (colunas/posições podem já ter sido
  adicionadas de forma diferente).

## 11. Implementation Notes (2026-09-17)

- SPEC-53 já estava `IMPLEMENTED` ao aprovar esta SPEC — ordem final de
  `columns` usada foi exatamente a proposta em §7: `Fardo | Código |
  Nota Fiscal | Instrução | Lote | Pilha | Peso Tara | Peso | Peso
  Bruto | Contrato | Estufado | Ações` (aprovada pelo usuário junto com
  `APROVAR SPEC-58`).
- `pesoTara`/`pesoBruto` são `number | string` no `RomaneioDTO` (mesmo
  tipo de `peso`) — mesmo padrão de renderização (`!= null ? String(...)
  : "—"`).
- `instruction`/`pilha`/`contrato` são texto livre — usado `r.campo ||
  "—"` (cobre `undefined`/`null`/string vazia igual).
- Chaves i18n novas inseridas na posição correspondente dentro de
  `romaneio.*` nos 4 locales (`colInstruction`, `colPilha`,
  `colPesoTara`, `colPesoBruto`, `colContrato`).
- `tsc --noEmit` limpo; `bun run lint` sem erro novo (baseline de 63
  avisos). Não verificado visualmente em navegador nesta sessão — R1
  (scroll horizontal com mais colunas) fica como achado a confirmar
  depois.
