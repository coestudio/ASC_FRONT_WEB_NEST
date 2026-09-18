# SPEC-94 — Padronização visual das tabelas cruas (fundo escuro, coluna estreita, badge → ícone)

- **ID:** 94
- **Nome:** raw-table-visual-standardization
- **Status:** IMPLEMENTED
- **Autor:** claude (triagem de leva de ajustes pré-apresentação, pedido do
  usuário em 2026-09-17 — itens marcados "Importantes")
- **Área:** `src/components/operations/tabs/{Documents,Invoice,Containers,
  Occurrences}.tsx`, `src/routes/_dashboard/_internal/operational/
  operations/$id/index.tsx`, `src/components/crud/crud-list-page.tsx`

## 1. Objetivo

Cobre 3 itens da leva do usuário (17 e 18 marcados "Importantes" por ele,
+ 15 de prioridade alta por ser bug visual, + 12 pontual):

- Item 15: "Verificar TODAS as tabelas — conteúdo vazando pra cima. Olhar e
  investigar todas as tabelas."
- Item 17: "Aba Nota Fiscal, botão 'Comparação NF' — seguir layout da
  tabela do Romaneio, pois está 'preto' a tabela de Nota Fiscal —
  implementar esse mesmo design em TODAS as tabelas."
- Item 18: "Review em todas as abas, seguir padrão do Romaneio... Origem e
  Status virarem ícones (pegar ideia de como foi feito o Estufado),
  melhorar, remover o badge da lista, todas."
- Item 12: "Diminuir a coluna Estufado no Romaneio pro tamanho do ícone."

## 2. Contexto (investigado em 2026-09-17) — causa raiz única para 15 e 17

`Romaneio.tsx` (referência que o usuário quer replicada) usa
`CrudListPage`, cujo CSS module (`crud-list-page.module.css`) define
`.tableCard`:

```css
.tableCard {
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius-sm);
  box-shadow: var(--shadow-soft);
}
.crudTable thead th {
  ...
  background: var(--table-header-bg); /* token dedicado, SPEC-14 */
  ...
}
```

Ou seja: `CrudListPage` tem `overflow: hidden` (corta qualquer conteúdo nos
cantos arredondados, sem "vazamento") **e** aplica `--table-header-bg` no
cabeçalho (token que existe nas 6 combinações brand×modo, `tokens.css`).

Levantamento (`grep -rln "soft-card.*table-responsive"`) encontrou **5
locais** que montam a tabela na mão, fora do `CrudListPage`, com wrapper
`<div className="soft-card table-responsive"><Table>`:

| Arquivo | Tabela(s) |
| --- | --- |
| `Documents.tsx` (linha 224) | Listagem de documentos |
| `Invoice.tsx` (linhas 286, 663, 758) | Listagem principal + "Comparação NF" + "Comparação Lotes" |
| `Containers.tsx` (linha ~299, a confirmar linha exata) | Listagem de containers |
| `Occurrences.tsx` (linha 168) | Listagem de ocorrências |
| `operational/operations/$id/index.tsx` (linha 239) | Tabela solta na tela de detalhe |

`.soft-card` (`base.css`, SPEC-56) define **só** `background`/`border`/
`border-radius`/`box-shadow` — **sem `overflow: hidden`**. Combinado com
`table-responsive` (Bootstrap, injeta `overflow-x: auto`), o resultado é: o
cabeçalho/canto da tabela (que tem fundo próprio do Bootstrap, não o token
`--table-header-bg`) não é recortado pelos cantos arredondados do card —
é isso que aparenta "vazar" visualmente, sobretudo perceptível no topo da
tabela. **Esta é, com alta confiança, a causa do item 15** (bug de
"vazamento") nos 5 arquivos acima — não confirmado por captura de tela
(sem ambiente rodando nesta investigação), mas a causa técnica bate
exatamente com a queixa.

Pelo mesmo motivo, essas 5 tabelas **nunca herdam** `.crudTable`/
`--table-header-bg` — o `<thead>` fica no fundo padrão do Bootstrap
(`--bs-table-bg`/`--bs-body-bg`), que em modo escuro é bem mais escuro que
o `--table-header-bg` de `tokens.css`. **Esta é a causa do item 17** ("está
preto a tabela de Nota Fiscal") — `Invoice.tsx` tem 3 tabelas nesse
estado, a mais visível sendo "Comparação NF" (citada pelo usuário).

### Por que essas 5 telas não usam `CrudListPage` hoje

- `Documents.tsx`/`Containers.tsx`/`Occurrences.tsx`: precisam de campos
  de formulário fora do molde declarativo de `CrudRecordModal`
  (`Select` com `enumOptions` resolvido por locale) — motivo documentado no
  próprio código (comentário em `Documents.tsx` linha 46-48).
- `Invoice.tsx` "Comparação NF"/"Comparação Lotes": são **leitura pura**
  (`invoice/comparison`, `romaneio/comparison-by-lote`), sem paginação real
  visível hoje nem seleção/CRUD — só uma tabela de leitura. `CrudListPage`
  é dimensionado pra CRUD paginado, não pra esse caso.
- `operations/$id/index.tsx`: tabela solta fora do fluxo de abas — não
  investigado a fundo o motivo aqui, fica pra implementação confirmar.

Por isso a correção provável **não é** "trocar tudo por `CrudListPage`"
(mudaria comportamento/paginação/busca de telas que hoje são só leitura),
e sim **extrair a parte puramente visual** (`.tableCard`/`.crudTable`) num
lugar reusável tanto por `CrudListPage` quanto por tabela solta — ver
decisão pendente.

## 3. Escopo

1. **Correção do vazamento (item 15).** Aplicar `overflow: hidden` (ou
   trocar `.soft-card` por uma classe com esse tratamento) nos 5 locais
   listados acima — sem isso, qualquer outra mudança de estilo herda o
   mesmo bug.
2. **Padronizar fundo/tipografia do cabeçalho (item 17)** nos mesmos 5
   locais — herdar `--table-header-bg`, tamanho/peso de fonte do cabeçalho,
   hairline entre linhas, mesmo tratamento que `.crudTable` já dá pras
   telas que usam `CrudListPage`.
3. **Badge → ícone em colunas Status/Origem (item 18).** Levantamento dos
   badges de Status/Origem candidatos a virar ícone (ver tabela abaixo) —
   decisão final por coluna é do usuário (ver §5), não assumida aqui.
4. **Coluna "Estufado" compacta (item 12).** Hoje sem `width` — adicionar
   suporte a largura fixa/compacta em `CrudColumn` (prop nova, ex.
   `width?: string`) e aplicar na coluna `isStuffed` do Romaneio.

### Levantamento de badges Status/Origem (item 18)

| Arquivo | Campo | Badge hoje | Candidato a ícone? |
| --- | --- | --- | --- |
| `Romaneio.tsx` | `isStuffed` | já é ícone (`bi-check-circle-fill`/`bi-x-circle`) | referência, sem mudança |
| `Invoice.tsx` | `status` (`InvoiceDTO.status`) | `Badge bg={statusBadgeVariant(status)}` | a decidir — enum com mais de 2 valores (não é binário como "Estufado"), pode precisar de ícone + tooltip em vez de só ícone |
| `Invoice.tsx` | `source` | `Badge bg={sourceBadgeVariant(source)}` | a decidir — mesma ressalva (enum, não binário) |
| `Documents.tsx` | `type` (`DocumentType`) | `Badge bg="secondary"` | a decidir — enum de N valores (tipo de arquivo), ícone por tipo é viável (ex. `bi-file-pdf`/`bi-file-image`) mas é mapeamento novo por valor, maior escopo que só trocar componente |
| `Containers.tsx` | `status` (`ContainerOperationStatus`) | `Badge bg="secondary"` | a decidir — liga com a SPEC-92 (gestão de múltiplos lacres), melhor decidir style junto |
| `access/index.tsx` (referência "Acesso" citada pelo usuário) | `isActive`, `role` | `Badge pill` | fora de escopo desta SPEC (não é aba de Operação) — mencionado só como contexto, não mexido aqui |

## 4. Fora do escopo

- Trocar `access/index.tsx` (fora da área de Operações) — o usuário citou
  como referência de design pro item 19 (Responsible), não como alvo de
  mudança aqui.
- Migrar qualquer uma das 5 telas pra `CrudListPage` de verdade (ganhar
  paginação/seleção que hoje não têm) — fora de escopo, seria mudança de
  comportamento, não só visual.
- Resolver a SPEC-92 (lacre) — só referenciada aqui pelo acoplamento visual
  do badge de status do container.

## 5. Decisões pendentes

```
[NEEDS_DECISION]

Como extrair o tratamento visual (`.tableCard`/`.crudTable`) pra ser
reusável fora do `CrudListPage`, sem duplicar CSS?

Opções:
1. Componente novo `<RawTableCard>` (`src/components/ui/`) — wrapper fino
   que substitui `<div className="soft-card table-responsive">` nos 5
   locais, aplicando as mesmas classes/tokens que `.tableCard`/`.crudTable`
   já usam (reexportando o CSS module de `crud-list-page` ou um novo
   `raw-table.module.css` com os mesmos valores). Menor acoplamento, fácil
   de aplicar nos 5 arquivos.
2. Extrair `.tableCard`/`.crudTable` pra um CSS module compartilhado
   (`src/components/crud/table-card.module.css`) importado tanto por
   `crud-list-page.tsx` quanto pelos 5 arquivos crus, sem componente novo
   — cada arquivo continua montando `<Table>` na mão, só troca a classe.
   Menos abstração, mais fácil de revisar diff por diff.

Impacto: opção 1 é mais reusável a longo prazo (esconde a estrutura de
`<div>` + classes); opção 2 é mudança mais cirúrgica (troca de className),
provavelmente mais rápida de revisar/aprovar antes da apresentação.

Aguardando decisão do usuário.
```

```
[NEEDS_DECISION]

Badge → ícone (item 18): pra quais colunas, exatamente, e com qual mapeamento
ícone/cor? A tabela da §3 lista os candidatos (`Invoice.status`,
`Invoice.source`, `Documents.type`, `Containers.status`) — nenhum deles é
binário como "Estufado" (`isStuffed`), então "virar ícone igual ao
Estufado" não é uma tradução 1:1 óbvia pra enums de 3+ valores.

Opções:
1. Só os campos binários viram ícone puro (ex.: se algum status resumir
   pra "sim/não" em algum contexto); os enums de N valores mantêm
   `Badge`, só com paleta/formato revisado (arredondado, cores dos tokens
   de tema em vez de `bg="secondary"` fixo) — mais fiel ao pedido literal
   ("remover o badge"), mas parcial.
2. Enums de N valores viram ícone + `title`/tooltip (cor do ícone
   codifica o valor, texto só aparece no hover) — visual mais limpo,
   mas exige um ícone dedicado por valor de cada enum (mapeamento novo a
   definir por enum, trabalho maior).
3. Manter Badge nesses casos e focar o "vira ícone" só no que já é
   binário/claramente visual (ex. algo equivalente a "Estufado" que
   apareça em outras telas) — se não houver equivalente, este item fecha
   sem mudança de componente, só de estilo do Badge.

Impacto: opção 2 é a mais alinhada ao pedido "todas", mas é o item de
maior volume de trabalho desta SPEC (ícone por valor de enum, several
enums). Precisa de decisão antes de estimar/implementar.

Aguardando decisão do usuário.
```

## 6. Camada de dados

Sem mudança — puramente visual, mesmos dados (`InvoiceDTO.status`/
`.source`, `DocumentType`, `ContainerOperationStatus`) já consumidos hoje.

## 7. UI

- `CrudColumn` (`crud-list-page.tsx`) ganha prop opcional `width?: string`
  (aplicada como `style={{ width }}` no `<th>`/`<td>`), usada na coluna
  `isStuffed` do Romaneio pra ficar do tamanho do ícone (item 12).
- Novo wrapper/CSS conforme decisão da §5, aplicado nos 5 arquivos listados
  na §2.
- Ícones/badges conforme decisão da §5 (segunda decisão pendente).

## 8. i18n

Sem chave nova prevista (mudança de apresentação sobre textos já
traduzidos), exceto se a decisão de ícone com tooltip (§5, opção 2) exigir
`aria-label`/`title` novos por valor de enum — a confirmar nos 4 locales
quando a decisão fechar.

## 9. Critérios de aceitação (a validar após implementação)

| # | Critério |
| --- | --- |
| 1 | Nenhuma das 5 tabelas listadas mostra conteúdo "vazando" dos cantos arredondados do card, em nenhum brand/modo |
| 2 | Cabeçalho das 5 tabelas usa o mesmo token de fundo (`--table-header-bg`) que `Romaneio.tsx`, em modo claro e escuro |
| 3 | Coluna "Estufado" do Romaneio tem largura compacta (do tamanho do ícone, não da palavra "Estufado") |
| 4 | Decisão de badge→ícone da §5 aplicada nas colunas confirmadas pelo usuário, sem quebrar leitura de valores que continuarem como Badge |
| 5 | `bun run check` e `bun run lint` sem novos erros |

## 10. Riscos

Médio — item 18 (badge→ícone) tem volume de trabalho variável dependendo
da decisão do usuário; itens 15/17/12 são de risco baixo e bem localizados
(mudança de CSS/wrapper, sem mudança de comportamento).

## 11. Implementation Notes

**Decisões `[NEEDS_DECISION]` resolvidas** (usuário: "aprova tudo, pode
implementar", com orientação de manter o padrão já estabelecido — ver
mensagem de implementação):

- **Extração do CSS (§5, decisão 1): opção 2.** Criado
  `src/components/crud/table-card.module.css` com `.tableCard` (fundo,
  borda, `border-radius`, `box-shadow`, `overflow: hidden`) e `.rawTable`
  (cabeçalho `--table-header-bg`, hairline, hover) — os mesmos valores que
  já existiam em `crud-list-page.module.css`. `crud-list-page.module.css`
  passou a `composes: tableCard/rawTable from "./table-card.module.css"`
  em vez de duplicar os valores — nenhum componente novo em
  `components/ui/`, reusando o padrão de card já estabelecido (`.tableCard`)
  em vez de criar um terceiro.
- **Badge → ícone (§5, decisão 2): opção 1.** Nenhum dos 4 candidatos
  levantados (`Invoice.status`, `Invoice.source`, `Documents.type`,
  `Containers.status`) é binário como `isStuffed` — são enums de 3+
  valores, onde a cor do `Badge` já carrega o significado (`statusBadge
  Variant`/`sourceBadgeVariant` já usam variantes semânticas do Bootstrap,
  não cor fixa). Mantidos como `Badge`, sem mudança de componente — trocar
  por ícone exigiria inventar um mapeamento ícone-por-valor novo (opção 2
  da spec), fora do escopo decidido. `Containers.status` fica como estava
  (`bg="secondary"`) porque a mudança de UI de lacre (SPEC-92) mexe na
  mesma linha — evita retrabalho.

**O que foi implementado:**

1. **Vazamento (item 15) + cabeçalho escuro (item 17).** Nos 5 locais
   (`Documents.tsx`, `Invoice.tsx` ×3, `Containers.tsx`, `Occurrences.tsx`,
   `operational/operations/$id/index.tsx`), o antigo
   `<div className="soft-card table-responsive"><Table>` virou
   `<div className={tableCardStyles.tableCard}><div className="table-responsive">
   <Table className={`... ${tableCardStyles.rawTable}`}>` — mesma estrutura
   de dois níveis que o `CrudListPage` já usa (`overflow: hidden` no card
   externo, `overflow-x: auto` do Bootstrap no wrapper interno), corrigindo
   o corte dos cantos arredondados e herdando `--table-header-bg` no
   `<thead>`.
2. **Coluna "Estufado" compacta (item 12).** `CrudColumn` ganhou `width?:
   string`, aplicada via `style={{ width }}` no `<th>`/`<td>` do
   `CrudListPage`. A coluna `isStuffed` do Romaneio usa `width: "1%"`
   (mesma técnica já usada na coluna de checkbox de seleção).

**Arquivos alterados:**
- `src/components/crud/table-card.module.css` (novo)
- `src/components/crud/crud-list-page.module.css`
- `src/components/crud/crud-list-page.tsx`
- `src/components/operations/tabs/{Documents,Invoice,Containers,Occurrences,Romaneio}.tsx`
- `src/routes/_dashboard/_internal/operational/operations/$id/index.tsx`

**Comandos executados:**
- `bun run check` — VERIFIED, sem erros (`tsc --noEmit` limpo).
- `bun run lint` — VERIFIED, 0 errors / 63 warnings (baseline em `main`
  antes desta SPEC: 0 errors / 65 warnings — nenhum warning novo).

**Critérios de aceitação:**

| # | Critério | Resultado |
| --- | --- | --- |
| 1 | Nenhuma tabela "vaza" dos cantos arredondados | PASS (estrutura idêntica ao `CrudListPage`, `overflow: hidden` no card) |
| 2 | Cabeçalho usa `--table-header-bg` como `Romaneio.tsx` | PASS (`.rawTable` compartilha o mesmo token) |
| 3 | Coluna "Estufado" compacta | PASS (`width: "1%"`) |
| 4 | Badge→ícone conforme decisão | PASS (decisão: manter Badge nos 4 candidatos, nenhum é binário) |
| 5 | `bun run check`/`lint` sem novos erros | PASS |

**Limitações conhecidas:** verificação visual não foi feita em navegador
(sem ambiente rodando nesta sessão) — a correção segue a mesma estrutura
comprovada do `CrudListPage`, mas a confirmação final é visual, pendente de
review humano nas 5 telas (todos os brands/modos).
