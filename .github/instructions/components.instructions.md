---
applyTo: 'src/components/**,src/layouts/**'
description: 'Use ao criar ou editar componentes de apresentação e layouts. Fixa React-Bootstrap como base de UI, o padrão de CSS e a pendência dos dois subsistemas de formulário.'
---

# Components / Layouts Instructions

## Base de UI

- **React-Bootstrap + Bootstrap 5.3.** `<Form.*>`, `<Button>`, `<Card>`,
  `<Modal>`, `<Spinner>`, ícones `bootstrap-icons` (`<i className="bi bi-x">`)
  ou `react-bootstrap-icons`.
- Layout com classes utilitárias Bootstrap (`d-flex`, `gap-2`, `bg-body`,
  `text-body-secondary`, `min-vh-100`). **Sem Tailwind.**
- Cor/tema: usar tokens semânticos do Bootstrap (`bg-body`, `text-body`,
  `border`) para funcionar em `light`/`dark` automático. Não hard-codar hex
  em componente — tokens vivem em `src/styles/globals/tokens.css`.
- Estilo local: CSS Module (`Componente.module.css` ao lado do `.tsx`).

## `components/` vs `layouts/`

- `components/ui/**` — blocos reutilizáveis pequenos e sem estado de negócio
  (`button`, `input`, `field`, `data-table`, `form-modal`, `page-header`,
  `empty-state`). É o conjunto **em uso** (rotas de auth). Preferir estender
  este.
- `components/site/**`, `components/theme/**`, `components/i18n/**` — blocos
  de contexto específico.
- `layouts/AppShell/**` — sidebar + topbar da área autenticada.
  `layouts/AppBrand`, `layouts/Windows`, `layouts/icons`.

## Pendência: dois subsistemas de formulário

`src/layouts/Form/**` é um subsistema grande de campos (`InputCPF`,
`InputCEP`, `InputMoney`, `Dropdown*`, schemas, `Viacep`...) portado do
`warren/Portal`. **Hoje nenhuma rota o usa.** Antes de:

- construir um formulário complexo novo, ou
- adicionar/alterar campo em `layouts/Form/**`, ou
- deletar `layouts/Form/**`

o agente **PARA e levanta `[NEEDS_DECISION]`**: consolidar em `components/ui`,
adotar `layouts/Form`, ou manter os dois com fronteira explícita. Não decidir
sozinho.

## Regras gerais

- Nome de arquivo/pasta em inglês (`user-table.tsx`, não `tabela-usuario.tsx`).
  Comentário de código em PT-BR. (Regras invioláveis do `AGENTS.md`.)
- Componente é apresentação. Busca de dados fica no hook/route loader; o
  componente recebe via props ou lê um hook de query já definido.
- `react-refresh/only-export-components` está ligado (warn): um arquivo de
  componente exporta só o componente (constantes são ok).
- Texto ao usuário via `useT()` quando a área é internacionalizada.
