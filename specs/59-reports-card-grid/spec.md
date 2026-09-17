# SPEC-59 — Relatórios: grid de cards + ícones distintos por relatório

- **ID:** SPEC-59
- **Nome:** reports-card-grid
- **Status:** DRAFT — sem `[NEEDS_DECISION]` (layout e ícones já
  decididos pelo usuário, ver §2/§3).
- **Autor:** claude (pedido do usuário, 2026-09-16)
- **Área:** `src/components/operations/tabs/Reports.tsx`.
- **Depende de:** nenhuma. Independente de SPEC-53/58 (aba diferente).

---

## 1. Objetivo

Dois pedidos do usuário para a aba Relatórios:

1. Trocar a lista empilhada (1 card por linha, largura cheia) por um
   **grid** de cards lado a lado.
2. Cada um dos 3 relatórios (Peso, Packing List, Fotográfico) ganha um
   **ícone próprio** — hoje "Peso" e "Packing List" compartilham o mesmo
   ícone (`bi-file-earmark-excel`).

## 2. Contexto — estado atual

`Reports.tsx` (SPEC-40) já usa `Card` por relatório, mas empilhados num
`<div className="d-flex flex-column gap-3">` (linha 99) — um `<Card>` por
`REPORTS.map`, largura cheia, ícone + título/descrição à esquerda, botão
"Gerar" à direita (`Card.Body` com `d-flex justify-content-between`).

`REPORTS` (linhas 16-50) já é um array tipado com `icon: string` por
item — trocar o ícone é só mudar a string, sem tocar em lógica. Hoje:

| `kind` | `icon` atual |
| --- | --- |
| `weight` | `bi-file-earmark-excel` |
| `packingList` | `bi-file-earmark-excel` (mesmo do `weight`) |
| `photographic` | `bi-file-earmark-word` |

## 3. Escopo

### 3.1 Grid responsivo (decisão do usuário: lado a lado, não empilhado)

`<div className="d-flex flex-column gap-3">` (linha 99) vira `<Row
className="g-3">`, cada `<Card>` envolvido num `<Col xs={12} md={6}
lg={4}>` — mesmo padrão de grid já usado em `Details.tsx`/`profile/*-tab.
tsx` (`Row className="g-3"` + `Col`, regra de import `{ Row, Col } from
"react-bootstrap"`). Resultado: 1 coluna em mobile, 2 em tablet/md, 3 em
desktop/lg — os 3 relatórios cabem numa linha só em telas largas.

Layout interno do `Card` mantém o mesmo conteúdo (ícone, título,
descrição, botão "Gerar") — só o arranjo pode precisar ajustar de
`justify-content-between` horizontal pra um layout vertical dentro do
`Card.Body` (ícone/título em cima, botão embaixo), já que o card fica
mais estreito num grid de 3 colunas do que numa linha cheia. Detalhe
final de alinhamento (`d-flex flex-column` vs. manter `justify-content-
between`) é decisão de implementação, mantendo os mesmos elementos.

### 3.2 Ícones distintos por tipo de conteúdo (decisão do usuário)

```
weight        → bi-file-earmark-bar-graph   (dado numérico/balança)
packingList   → bi-file-earmark-spreadsheet (planilha)
photographic  → bi-file-earmark-image       (fotos)
```

Só a string `icon` de cada item de `REPORTS` muda — `fs-2 text-body-
secondary` (classe do `<i>`, linha 104) e o resto do markup continuam
iguais.

## 4. Fora do escopo

- Adicionar novo tipo de relatório — só reorganiza os 3 existentes.
- Mudar o fluxo de geração/download (`handleGenerate`, blob,
  `Content-Disposition`) — inalterado.
- Paginação/histórico de relatórios gerados — os 3 endpoints continuam
  síncronos e sem listagem (mesma nota já documentada no componente).

## 5. Requisitos funcionais

- **RF1** — Os 3 cards de relatório aparecem em grid responsivo (1 col
  mobile, 2 md, 3 lg), não mais empilhados em largura cheia.
- **RF2** — `weight` usa `bi-file-earmark-bar-graph`, `packingList` usa
  `bi-file-earmark-spreadsheet`, `photographic` usa `bi-file-earmark-
image` — os 3 ícones diferentes entre si.
- **RF3** — Botão "Gerar" (com spinner enquanto `generating === report.
  kind`) continua funcional, um card não bloqueia o botão dos outros
  (`disabled={generating !== null}` já existente — a ser revisado: hoje
  desabilita **todos** os botões enquanto qualquer um gera; mantém esse
  comportamento, não é escopo desta SPEC mudar).

## 6. UI

- `Row`/`Col` do `react-bootstrap` (import novo em `Reports.tsx`),
  mesmo padrão `g-3` já usado em `Details.tsx`.
- Ícones: `bi-file-earmark-bar-graph`, `bi-file-earmark-spreadsheet`,
  `bi-file-earmark-image` (Bootstrap Icons, já em uso no projeto via
  `bi bi-*`, sem dependência nova).

## 7. i18n

Nenhuma chave nova — mudança é só layout/ícone, `nameKey`/`descriptionKey`
inalterados.

## 8. Arquivos esperados

- `src/components/operations/tabs/Reports.tsx`

## 9. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Em tela larga (desktop), os 3 cards aparecem lado a lado na mesma linha. |
| CA2 | Em tela estreita (mobile), os cards empilham (1 por linha), sem overflow horizontal. |
| CA3 | Cada um dos 3 relatórios mostra um ícone diferente dos outros dois (`bi-file-earmark-bar-graph`/`bi-file-earmark-spreadsheet`/`bi-file-earmark-image`). |
| CA4 | Botão "Gerar" de cada card continua baixando o arquivo certo (toast de sucesso/erro, nome do arquivo do `Content-Disposition`) — sem regressão do fluxo existente. |
| CA5 | `bun run check` + `bun run lint` sem regressão. |

## 10. Riscos

Nenhum — mudança isolada a um arquivo, puramente visual (layout + string
de ícone), sem tocar em lógica de geração/download.
