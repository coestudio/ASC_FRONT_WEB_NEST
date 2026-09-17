---
applyTo: "src/components/**,src/layouts/**"
description: "Use ao criar ou editar componentes de apresentação e layouts. Fixa React-Bootstrap como base de UI, o padrão de CSS e a regra de que todo input de formulário vem de layouts/Form/Fields."
---

# Components / Layouts Instructions

## Base de UI

- **React-Bootstrap + Bootstrap 5.3. Regra inviolável — nunca Tailwind.**
  `<Form.*>`, `<Button>`, `<Card>`, `<Modal>`, `<Spinner>`, ícones
  `bootstrap-icons` (`<i className="bi bi-x">`) ou `react-bootstrap-icons`.
- **Modal só fecha por ação explícita — regra inviolável.** Nunca importe
  `Modal` direto de `react-bootstrap`; use `@/components/ui/modal`
  (`import { Modal } from "@/components/ui/modal"`), que já vem com
  `backdrop="static"`/`keyboard={false}` por padrão — clicar fora ou
  apertar ESC nunca fecham nenhum modal do projeto. `Modal.Header` nunca
  leva `closeButton` (sem "X" no canto) — a única saída é o botão de
  ação no rodapé (`Cancelar`/`Fechar`/etc.), que chama a função de
  fechar direto no `onClick`, nunca via `onHide` do backdrop/ESC.
- Layout com classes utilitárias Bootstrap (`d-flex`, `gap-2`, `bg-body`,
  `text-body-secondary`, `min-vh-100`). Nada de `tailwindcss` instalado, nada
  de classe utilitária no estilo Tailwind (`flex`, `p-4`, `text-gray-500`) —
  se parece Tailwind, está errado neste projeto.
- Cor/tema: usar tokens semânticos do Bootstrap (`bg-body`, `text-body`,
  `border`) para funcionar em `light`/`dark` automático. Não hard-codar hex
  em componente — tokens vivem em `src/styles/globals/tokens.css`.
- Estilo local: CSS Module (`Componente.module.css` ao lado do `.tsx`).

## `components/` vs `layouts/` — regra inviolável

**Todo input de formulário é `src/layouts/Form/Fields/**`.** Nunca `<input>`,
nunca `<Form.Control>` direto, nunca um campo customizado numa tela ou em
`components/ui`. Falta um tipo de campo → cria ou edita o Field em
`layouts/Form/Fields/`, nunca improvisa inline. Isso não é mais uma decisão
em aberto — é regra 10 do `AGENTS.md`.

- `layouts/Form/Fields/**` — biblioteca canônica de campo: `InputText`,
  `InputTextArea`, `InputEmail`, `InputCPF`, `InputCNPJ`, `InputCEP`,
  `InputPhone`, `InputMoney`, `InputPorcentage`, `InputDate`/`DateTime`/
  `Time`, `InputSwitch`/`SwitchTri`/`Checkbox`, `InputPassword`,
  `InputColorPicker` — ver `Fields/Index.ts` pra lista completa e exportar
  um novo tipo. Cada campo é `Controller`-based (`react-hook-form`) e já
  embute label/erro/Bootstrap; config vem por objeto (`LayoutField`: `type`,
  `fieldName`, `label`, `placeholder`, `col`, `config`).
- `layouts/Form/Dropdown/**` — selects/combobox do mesmo subsistema.
- `layouts/Form/Group/Adress.tsx` — bloco composto (endereço) reusando os
  Fields acima.
- `layouts/Form/Schemas/**`, `Helpers/**`, `Services/Viacep.ts` — utilidades
  do próprio subsistema (normalização, CEP). Reusar antes de escrever de
  novo.
- `components/ui/**` — só o que **não** é input de form: `button`,
  `confirmation-modal`, `view-toggle`, `mock-data-banner`. Nunca um `input`/
  `field`/`password-field` — isso é `layouts/Form/Fields`.
- `components/site/**`, `components/theme/**`, `components/i18n/**` — blocos
  de contexto específico, não-form.
- `layouts/AppShell/**` — sidebar + topbar da área autenticada.
  `layouts/AppBrand`, `layouts/Windows`, `layouts/icons`.

**Débito conhecido:** `src/components/ui/{input,field,password-field}.tsx`
são inputs raw criados antes desta regra existir — violam-na. Migração pra
`layouts/Form/Fields` (incl. as rotas de auth que os usam) é escopo de
`specs/02-app-shell-navigation/spec.md`. Não copiar esse padrão em nada
novo, mesmo antes da SPEC-02 ser implementada.

## `layouts/Filters/**` — campo de filtro/busca de listagem, **não** é `Form/Fields`

**Filtro de listagem (busca livre, filtro de coluna) não é campo de
formulário — vem de `layouts/Filters/**`, nunca de `layouts/Form/Fields`**
(pedido do usuário, SPEC-77 do NewPortal). Motivo: todo campo de
`Form/Fields` é `Controller`-based e sempre renderiza `<Form.Label>` +
uma linha reservada pra mensagem de erro (`<Form.Text>`/
`Form.Control.Feedback`) — faz sentido pra um campo validado dentro de um
formulário, mas nenhum filtro de listagem tem rótulo visível nem
validação, então essa linha de erro sobra sem função nenhuma.

- `layouts/Filters/FilterText.tsx` — campo de texto controlado direto
  (`value`/`onChange`, sem `react-hook-form`/`Controller`), sem label
  visível (`aria-label` pro leitor de tela) e sem linha de erro. Ícone
  opcional (`icon`, `bootstrap-icons`).
- Antes de criar um novo `useForm<{ search: string }>` só pra reaproveitar
  `InputText` num filtro (padrão antigo, removido no SPEC-77 — existiam 4
  cópias quase idênticas espalhadas), usar/estender
  `layouts/Filters/FilterText`.
- Filtro de seleção (dropdown/`Select`/`SelectAsync`) continua fora desta
  pasta por ora — só o filtro de texto foi migrado; se um filtro de
  dropdown precisar do mesmo tratamento (sem label/erro), é SPEC nova,
  não decisão implícita aqui.

## Regras gerais

- Nome de arquivo/pasta em inglês (`user-table.tsx`, não `tabela-usuario.tsx`).
  Comentário de código em PT-BR. (Regras invioláveis do `AGENTS.md`.)
- Componente é apresentação. Busca de dados fica no hook/route loader; o
  componente recebe via props ou lê um hook de query já definido.
- `react-refresh/only-export-components` está ligado (warn): um arquivo de
  componente exporta só o componente (constantes são ok).
- Texto ao usuário via `useT()` quando a área é internacionalizada.
