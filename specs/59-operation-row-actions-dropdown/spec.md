# SPEC-59 — Unificar ações de linha pro `CrudRowActions` (dropdown kebab)

- **ID:** SPEC-59
- **Nome:** operation-row-actions-dropdown
- **Status:** IMPLEMENTED
- **Autor:** portal-dev-agent (rascunho, 2026-09-16 — pente fino de UI/UX
  aprovado pelo usuário na sessão, 5 SPECs pequenas isoladas)
- **Área:** `src/components/crud/crud-row-actions.tsx`,
  `src/components/operations/tabs/{Documents,Occurrences}.tsx`
- **Depende de:** nenhuma (independente das demais 4 SPECs desta leva).

---

## 1. Objetivo

Unificar as ações de linha de `Documents.tsx` (preview/download/editar) e
`Occurrences.tsx` (editar) para o mesmo dropdown kebab `CrudRowActions` já
usado nas outras 9 telas do projeto (`operations-list.tsx`,
`administrative/clients`, `administrative/registry/{harbor,terminal,
product,container,vessel}`, `client/collaborators`, `Romaneio.tsx`) — hoje
essas duas abas ainda usam botões de ícone soltos direto na `<td>`.

## 2. Contexto (achados)

- `CrudRowActions` (`src/components/crud/crud-row-actions.tsx`) só aceita
  `onView`/`onEdit`/`onDelete` (mais os respectivos `*Loading`) — suficiente
  para `Occurrences.tsx` (só precisa de `onEdit`), mas não cobre
  `Documents.tsx`, que tem 3 ações: preview (abre `FilePreviewModal`),
  download (link `<a href download>` para o arquivo) e editar.
- `Documents.tsx:209-243` — 3 botões de ícone soltos numa `<div className="d-flex gap-1">`
  dentro da `<td>`: `bi-eye` (preview, `onClick`), `bi-download` (`<a>` com
  `href`/`download`/`target="_blank"`, desabilitado via classe `disabled`
  quando `!item.file.url`) e `bi-pencil` (editar, `onClick`).
- `Occurrences.tsx:170-178` — 1 botão de ícone solto (`bi-pencil`, editar).
  Sem exclusão (Core não expõe `DELETE` pra Occurrence, ver comentário
  `Occurrences.tsx:43`) e sem preview/download (não se aplica a
  ocorrências).
- Usuário confirmou explicitamente que quer unificar pro kebab mesmo com
  menos ações por linha que o padrão CRUD genérico, e que `CrudRowActions`
  pode ganhar mais flexibilidade (ex.: prop genérica de ações extras) se
  precisar cobrir preview/download.

## 3. Escopo

1. `CrudRowActions` ganha uma prop nova opcional `extraActions` — array de
   itens de ação adicionais renderizados entre "Ver" e "Editar" no menu,
   cada um com `{ key, icon, label, onClick?, href?, download?, target?,
   rel?, disabled? }`. Quando `href` está presente, o item renderiza como
   `<Dropdown.Item>` com `href`/`download`/`target`/`rel` repassados
   (react-bootstrap `Dropdown.Item` já suporta esses atributos por
   default, renderiza como âncora); quando só `onClick`, comportamento
   idêntico aos itens existentes (`onView`/`onEdit`/`onDelete`).
   Assinatura pública existente (`onView`/`onEdit`/`onDelete`/
   `viewLoading`/`editLoading`/`disabled`) permanece **inalterada** — os 9
   consumidores atuais não mudam nada.
2. `Documents.tsx` — trocar os 3 botões soltos por um único
   `<CrudRowActions>`: `onView` = abrir preview (`setPreviewing(item)`),
   `extraActions` = 1 item de download (`icon: "bi-download"`, `href:
   item.file.url`, `download: item.file.name`, `target: "_blank"`, `rel:
   "noreferrer"`, `disabled: !item.file.url`), `onEdit` = abrir edição
   (`setEditing(item)`). Sem `onDelete` (Core não expõe exclusão de
   documento nesta tela — mesmo escopo de hoje).
3. `Occurrences.tsx` — trocar o botão solto de editar por
   `<CrudRowActions onEdit={() => setEditing(item)} />` (sem `onView`/
   `onDelete`/`extraActions` — só a ação que já existe).
4. Rótulos de i18n: `CrudRowActions` já usa chaves genéricas
   (`crud.list.rowActionsView`/`rowActionsEdit`/`rowActionsToggle`) — o
   item de download novo (`extraActions`) recebe seu rótulo via prop
   `label` (string já traduzida pelo componente chamador, mesmo padrão que
   `label`/`icon` de outras props de UI no projeto), reusando a chave já
   existente `administrative-operations.documents.download` (já usada como
   `title`/`aria-label` do botão antigo).

## 4. Fora do escopo

- Mudar `.soft-card`/wrapper de tabela (`Documents.tsx`/`Occurrences.tsx`)
  — SPEC-58.
- Adicionar exclusão de documento/ocorrência — não existe no contrato do
  Core, fora de escopo.
- Mudar o comportamento de qualquer um dos 9 consumidores já existentes de
  `CrudRowActions` — prop nova é aditiva/opcional, sem migração necessária.

## 5. Requisitos funcionais

- **RF1** — `CrudRowActionsProps` ganha `extraActions?: CrudRowExtraAction[]`,
  tipo exportado com `{ key: string; icon: string; label: string; onClick?:
  () => void; href?: string; download?: string; target?: string; rel?:
  string; disabled?: boolean }`.
- **RF2** — Itens de `extraActions` renderizam entre "Ver" e "Editar" no
  `Dropdown.Menu`, cada um só se presente no array (mesmo padrão condicional
  dos itens fixos).
- **RF3** — `Documents.tsx` usa `CrudRowActions` com `onView` (preview),
  `extraActions` (1 item de download) e `onEdit` — sem os 3 botões soltos
  antigos.
- **RF4** — `Occurrences.tsx` usa `CrudRowActions` com só `onEdit` — sem o
  botão solto antigo.
- **RF5** — Coluna "Ações" das duas tabelas (`colActions`) passa a
  renderizar um único toggle kebab, igual às demais 9 telas.

## 6. Não funcionais

- Nenhum dos 9 consumidores existentes de `CrudRowActions` muda de
  comportamento (prop nova é opcional/aditiva).
- Acessibilidade do item de download preserva `aria-label`/`title`
  equivalentes ao botão antigo (via `label` da ação, usado como texto
  visível do `Dropdown.Item`, mesmo padrão dos itens fixos que já usam
  `t(...)` como texto, não `aria-label` isolado).

## 7. Camada de dados

Não se aplica — mudança de apresentação/interação, nenhum hook/query
tocado.

## 8. UI

- `src/components/crud/crud-row-actions.tsx`: novo tipo `CrudRowExtraAction`
  exportado, `extraActions` mapeado para `<Dropdown.Item>` adicionais.
- `Documents.tsx`/`Occurrences.tsx`: `<td>` da coluna de ações passa a
  renderizar só `<CrudRowActions .../>`.

## 9. i18n

- Reusa `administrative-operations.documents.download` (já existe, 4
  locales) como `label` do item de download em `extraActions`.
- Reusa `crud.list.rowActionsView`/`rowActionsEdit`/`rowActionsToggle` (já
  existem) para os itens fixos.
- Nenhuma chave nova.

## 10. Arquivos esperados

- `src/components/crud/crud-row-actions.tsx`
- `src/components/operations/tabs/Documents.tsx`
- `src/components/operations/tabs/Occurrences.tsx`

## 11. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | `CrudRowActions` aceita `extraActions` sem quebrar os 9 consumidores existentes (props antigas inalteradas) |
| CA2 | `Documents.tsx` mostra 1 toggle kebab por linha com preview/download/editar dentro do menu |
| CA3 | `Occurrences.tsx` mostra 1 toggle kebab por linha com editar dentro do menu |
| CA4 | Download continua funcionando via atributo nativo `download`/`href` do `Dropdown.Item` (sem JS extra) |
| CA5 | `bun run check` + `bun run lint` sem regressão |

## 12. Riscos

- **R1** — `Dropdown.Item` do react-bootstrap desabilitado (`disabled`)
  ainda renderiza como `<a>` sem `href` quando `disabled` é true (padrão do
  componente) — mesmo efeito do `aria-disabled`/classe `disabled` do botão
  antigo, sem regressão funcional esperada.
- **R2** — Menos ações visíveis "de cara" na linha (agora atrás de 1 clique
  no kebab) — trade-off aceito explicitamente pelo usuário nesta sessão.

## Implementation Notes

- **Arquivos alterados:** `src/components/crud/crud-row-actions.tsx`,
  `src/components/operations/tabs/Documents.tsx`,
  `src/components/operations/tabs/Occurrences.tsx`.
- **RF1/RF2:** novo tipo exportado `CrudRowExtraAction` (`key`, `icon`,
  `label`, `onClick?`, `href?`, `download?`, `target?`, `rel?`,
  `disabled?`) e prop `extraActions?: CrudRowExtraAction[]` em
  `CrudRowActionsProps`. Itens renderizados via `.map` entre "Ver" e
  "Editar" no `Dropdown.Menu`, cada `Dropdown.Item` repassando
  `href`/`download`/`target`/`rel`/`onClick`/`disabled` diretamente
  (react-bootstrap já suporta esses atributos no componente `Anchor`
  default).
- **RF3:** `Documents.tsx` — os 3 botões soltos (`bi-eye`/`bi-download`/
  `bi-pencil`) substituídos por um único `<CrudRowActions
  onView={...} extraActions={[...]} onEdit={...} />`; a ação de download
  vira um item de `extraActions` (`href: item.file.url`, `download:
  item.file.name`, `target: "_blank"`, `rel: "noreferrer"`, `disabled:
  !item.file.url`), reusando a chave i18n
  `administrative-operations.documents.download` já existente como
  `label`.
- **RF4:** `Occurrences.tsx` — botão solto de editar substituído por
  `<CrudRowActions onEdit={() => setEditing(item)} />`.
- **RF5:** ambas as colunas "Ações" agora renderizam só o toggle kebab.
- **Nota:** a chave i18n `administrative-operations.documents.preview`
  (usada antes como `title`/`aria-label` do botão de preview solto) ficou
  órfã nos 4 dicionários — não removida (fora do escopo desta SPEC,
  limpeza de i18n não solicitada; chave inofensiva sem consumidor).
- **Comandos executados:**
  - `bun run check` (tsc --noEmit) — **VERIFIED**, sem erros.
  - `bun run lint` — **VERIFIED**, 66 problems (3 errors, 63 warnings),
    idêntico ao baseline — nenhuma regressão.
- **Critérios de aceitação:**

  | # | Critério | Status |
  | --- | --- | --- |
  | CA1 | `CrudRowActions` aceita `extraActions` sem quebrar os 9 consumidores existentes | PASS (prop opcional, assinatura antiga preservada) |
  | CA2 | `Documents.tsx` mostra 1 kebab por linha com preview/download/editar | PASS |
  | CA3 | `Occurrences.tsx` mostra 1 kebab por linha com editar | PASS |
  | CA4 | Download funciona via atributo nativo `href`/`download` | PASS (repassado direto ao `Dropdown.Item`) |
  | CA5 | `bun run check` + `bun run lint` sem regressão | PASS |
- **Limitações conhecidas:** validação visual manual (comportamento real
  de clique/download no browser) não foi feita nesta sessão (dev server
  não iniciado) — recomenda-se checagem visual/funcional antes do merge.
