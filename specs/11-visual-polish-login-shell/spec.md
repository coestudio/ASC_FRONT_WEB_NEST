# SPEC-11 — Polimento visual: logo, cores, ícones de input, header, footer do sidebar

- **ID:** SPEC-11
- **Nome:** visual-polish-login-shell
- **Status:** APPROVED
- **Autor:** portal-dev-agent (rascunho, a pedido do usuário)
- **Área:** `src/layouts/AppBrand/**`, `src/layouts/AppShell/**`,
  `src/routes/auth/login/**`, `src/routes/auth/forgot-password/**`,
  `src/styles/globals/**` (tokens de cor/botão)
- **Depende de:** nada estrutural — é polish em cima do que já existe
  (SPEC-00/01 já `IMPLEMENTED`). **Não depende de SPEC-02** (app-shell-
  navigation ainda `DRAFT`), mas toca arquivos que SPEC-02 também vai tocar
  (`AppShell`, `layouts/Form/Fields` fica de fora — login/forgot-password
  ainda usam input raw, débito conhecido, não migrado aqui).
- **Escopo:** só visual — nenhuma mudança de contrato de API, schema Zod ou
  lógica de auth.

---

## Ordem de execução

Usuário aprovou começando **pela tela de login** (itens 2, 3, 4), depois
segue pro resto (1, 5, 6, 7) nessa ordem de prioridade.

## Referência visual (login)

**Revisão 2** — segundo print (close-up do card, sem fundo de porto),
substitui a leitura de ícone-nos-inputs da revisão 1. Este é o alvo exato
a bater:

- Card de login: cantos bem arredondados (`border-radius` grande, ~20px),
  fundo escuro sólido (um pouco mais claro que o body — ex.
  `--bs-tertiary-bg` ou token equivalente), sem borda visível forte.
- Logo (`AppBrand`, `size="sm"`): badge circular com fundo **branco**, anel
  laranja/amarelo, texto "ASA" dentro (não é o PNG atual — é um badge tipo
  emblema/selo). Ao lado: "Alex Stewart" branco bold + "Agriculture" verde
  logo abaixo, empilhados (não lado a lado).
- Título "Bem-vindo de volta" branco bold, subtítulo cinza claro "Entre com
  suas credenciais para continuar." — espaçamento generoso acima/abaixo.
- Labels uppercase cinza pequeno ("USUÁRIO", "SENHA") acima de cada campo.
  "Esqueceu a senha?" sublinhado, alinhado à direita **na mesma linha** da
  label "SENHA" (não abaixo do campo).
- **Inputs em formato pill** (`border-radius: 999px`/full), fundo levemente
  mais claro que o card, sem borda visível, sem ícone de pessoa/e-mail —
  **reverter o `bi-person` do campo usuário** (não bate com este print).
  Campo senha: mesmo pill, só com o toggle de olho (`bi-eye`) à direita,
  **sem `bi-lock`** — reverter esse ícone também.
- Botões: pill/full-round (`border-radius: 999px`), full-width, verde sólido
  (`--bs-primary`), empilhados com gap pequeno — `Super login` em cima,
  `Entrar` embaixo, mesma cor pros dois.

> Este print é a fonte de verdade pro item 2/3/4 revisados — sobrepõe a
> revisão 1 onde conflitar (principalmente: **sem ícone dentro do input de
> usuário/senha**, só o toggle de olho; inputs e botões em pill shape).
> Paleta ainda via tokens `--bs-*`/`--brand-*` por brand/tema, não hex fixo.

**Revisão 3** (pedido direto do usuário, sobrepõe revisão 2 nestes dois
pontos):

- **Card com fundo transparente/translúcido** — não mais sólido. Usar
  `rgba`/`backdrop-filter: blur()` sobre o token de fundo do card (ex.
  `color-mix` ou `rgba(var(--bs-tertiary-bg-rgb), 0.x)`), deixando o
  conteúdo por trás (fundo da tela de login) parcialmente visível.
- **Ícones de volta nos inputs de usuário/senha** — reverte o revert da
  revisão 2: campo usuário com ícone de e-mail (`bi-envelope`, não
  `bi-person` — usuário pediu "ícone de email") e campo senha com ícone de
  cadeado (`bi-lock`) **junto** com o toggle de olho que já existe.

## Itens

### 1. Logo no sidebar menu

Ajustar `AppBrand` (`src/layouts/AppShell/index.tsx` consumindo
`src/layouts/AppBrand/index.tsx`) — tamanho/proporção/alinhamento do
`app-brand__logo` dentro do sidebar (colapsado e expandido). Hoje classes
`.app-brand*` vêm de `src/assets/css/base.css` — ajuste é CSS + eventualmente
`size` prop (`sm|md|lg`) passado errado no `AppShell`.

### 2. Logo no form de login

Mesmo componente `AppBrand`, instância usada em `src/routes/auth/route.tsx`
ou `login/index.tsx`. Ajustar tamanho/espaçamento no contexto do card de
login (fundo diferente do sidebar — conferir contraste da logo import PNG
por brand em `src/assets/{ASA,ASI,ASC}/logo.png`).

### 3. Cor do botão → verde

Botão de submit do login (e onde mais usar a cor errada) deve puxar
`--bs-primary` do brand ativo, não uma cor hard-coded. Brand `asa` (default)
= verde primário — conferir se algum `<Button variant="...">` ou CSS local
está sobrescrevendo com cor fixa em vez do token semântico (regra de
theming: nunca hard-codar cor).

### 4. Ícones no input de email e senha (login)

`src/routes/auth/login/index.tsx` usa input raw (débito conhecido, fora do
padrão `layouts/Form/Fields` — não migrar aqui, só adicionar ícone dentro do
padrão atual: `input-group` Bootstrap com ícone à esquerda, sem trocar pra
`react-hook-form` + zodResolver, isso é escopo do SPEC-02). Ícone de
envelope pro campo email, cadeado pro campo senha.

### 5. Ícone no input de email (esquece a senha)

Mesmo tratamento do item 4, em `src/routes/auth/forgot-password/index.tsx`.

### 6. Botões do header — idioma (dropdown) e theme switch

Em `src/layouts/AppShell/` (UserMenu.tsx ou topbar, a localizar) — polish
visual dos dois controles: dropdown de idioma e switch de tema. Não mexe em
lógica (`useLocale`/`useSetLocale`, `useThemeMode` já existem) — só
aparência (ícone, alinhamento, hover state, espaçamento consistente com o
resto do header).

### 7. Footer do menu aberto (sidebar expandido)

Ajustar/criar footer do sidebar quando expandido (rodapé com versão, ou
user info reduzido, a definir com usuário — hoje `AppShell` não tem essa
seção ou está incompleta). **Precisa decisão do usuário sobre o que entra
no footer antes de implementar** — este item fica `[NEEDS_DECISION]`.

---

## Fora de escopo

- Migração de login/forgot-password pra `layouts/Form/Fields` +
  zodResolver (regra 9/10) — é SPEC-02.
- Qualquer mudança de token de cor por-brand além do que item 3 exige
  (arquitetura de `data-brand` completa é SPEC-01, já `IMPLEMENTED`).

## Critério de pronto

- `bun run check` e `bun run lint` limpos.
- Visual conferido nas 3 brands (asa/asi/asc) × light/dark — ver
  `.github/instructions/theming.instructions.md`.
- Item 7 desbloqueado só depois do usuário definir o conteúdo do footer.
