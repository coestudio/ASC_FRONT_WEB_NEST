# SPEC-91 — Botão de download sempre visível na listagem de Documentos

- **ID:** 91
- **Nome:** documents-visible-download-button
- **Status:** DRAFT
- **Autor:** claude (triagem de leva de ajustes pré-apresentação, pedido do
  usuário em 2026-09-17)
- **Área:** `src/components/operations/tabs/Documents.tsx`,
  `src/components/crud/crud-row-actions.tsx`

## 1. Objetivo

Item 1 da leva do usuário: "colocar botão de download na listagem de
documento da tabela". Hoje o download existe (não é feature nova), mas fica
**escondido dentro do menu kebab** (`CrudRowActions` → dropdown `⋮`) — o
usuário quer um botão de download **sempre visível** na linha, sem precisar
abrir o menu.

## 2. Contexto (investigado em 2026-09-17)

`Documents.tsx` (linhas 262-277) já monta o download via
`CrudRowActions.extraActions`:

```tsx
<CrudRowActions
  onView={() => setPreviewing(item)}
  extraActions={[
    {
      key: "download",
      icon: "bi-download",
      label: t("administrative-operations.documents.download"),
      href: item.file.url ?? undefined,
      download: item.file.name ?? undefined,
      target: "_blank",
      rel: "noreferrer",
      disabled: !item.file.url,
    },
  ]}
  onEdit={() => setEditing(item)}
/>
```

`extraActions` é renderizado **dentro do dropdown** de `CrudRowActions`
(SPEC-65), entre "Ver" e "Editar" — nunca como botão solto na célula. Ou
seja: a funcionalidade de download existe e funciona (link nativo `<a
href download>`, mesma origem ou storage externo), só não está no lugar que
o usuário quer.

Não há hoje, em `CrudRowActions`, um conceito de "ação sempre visível fora
do menu" — todas as ações passam pelo dropdown (SPEC-55 consolidou o
padrão antigo de botões soltos por linha exatamente pra dropdown, pra
economizar espaço horizontal). Este pedido é, na prática, uma exceção
pontual a essa consolidação.

## 3. Escopo

- Adicionar um botão de ícone (`bi-download`) **fora** do menu kebab, na
  célula de ações da tabela de Documentos, ao lado do toggle `⋮` —
  mesmo `<a>` nativo (`href`/`download`/`target`/`rel`) que já existe hoje
  dentro do `extraActions`, só movido/duplicado pra fora do dropdown.
- Manter "Ver" (preview) e "Editar" dentro do dropdown, como estão hoje.
- Desabilitado (`disabled`/sem `href`) quando `item.file.url` não existir —
  mesmo comportamento atual.

## 4. Fora do escopo

- Mudar `CrudRowActions` pra aceitar uma ação "sempre visível" genérica
  reusável por outras telas — a menos que o usuário confirme que quer isso
  como padrão novo (ver decisão pendente abaixo). Sem essa confirmação, a
  implementação fica local a `Documents.tsx` (botão solto ao lado do
  `CrudRowActions`, sem mudar a assinatura do componente compartilhado).
- Qualquer mudança em `Containers.tsx`/`Occurrences.tsx` (que também usam
  `extraActions`, mas sem pedido do usuário pra essas telas).

## 5. Decisão pendente

```
[NEEDS_DECISION]

O botão de download sempre visível é só pra Documentos, ou deve virar um
padrão novo em `CrudRowActions` (prop tipo `pinnedAction`) reusável por
qualquer tela que hoje usa `extraActions` (ex.: Containers.tsx tem
"photos"/"seal" como extraActions, mas esses não são pedido do usuário)?

Opções:
1. Só Documents.tsx — botão de ícone solto montado localmente ao lado do
   `CrudRowActions`, sem mudar o componente compartilhado. Menor risco,
   mais rápido, mas se amanhã outra tela pedir o mesmo vira código
   duplicado.
2. Prop nova em `CrudRowActions` (ex.: `pinnedAction?: CrudRowExtraAction`)
   que renderiza um botão de ícone fixo antes do toggle `⋮`, reusável.
   Mais trabalho agora, mas correto se o padrão for repetir.

Impacto: opção 2 muda a assinatura pública de um componente usado em 9+
telas (aditivo, não quebra ninguém, mas é mudança de contrato de UI
compartilhada).

Aguardando decisão do usuário.
```

## 6. UI

- Botão de ícone (`btn btn-sm btn-outline-primary` ou `btn-soft`, a
  confirmar com o padrão visual que sair da SPEC-94) com `bi-download`,
  `title`/`aria-label` = mesma chave já usada
  (`administrative-operations.documents.download`).
- Sem chave de i18n nova (reusa a existente).

## 7. Critérios de aceitação (a validar após implementação)

| # | Critério |
| --- | --- |
| 1 | Botão de download aparece sempre visível na linha da tabela de Documentos, sem precisar abrir o menu `⋮` |
| 2 | Clicar baixa o arquivo (mesmo comportamento do `href`/`download` nativo já existente) |
| 3 | Botão desabilitado quando `item.file.url` for `null`/`undefined` |
| 4 | "Ver" e "Editar" continuam no dropdown, sem mudança |
| 5 | `bun run check` e `bun run lint` sem novos erros |

## 8. Riscos

Baixo. Mudança de apresentação isolada, sem contrato de API novo.
