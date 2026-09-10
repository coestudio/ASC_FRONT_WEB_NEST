# SPEC 0001 — AppShell (sidebar + topbar + menu de usuário)

> ⚠️ **DESATUALIZADO** — escrito quando o projeto era Next.js 16 App Router. O
> projeto migrou para TanStack Start (Vite + Nitro); os caminhos `src/app/**`,
> Server Actions e NextAuth citados aqui não valem mais. Mantido como histórico
> de requisitos de UI.

- **status**: APPROVED
- **autor**: project-orchestrator (sessão sem processo formal de SPEC previamente
  estabelecido neste repo `web`; artefato criado retroativamente pelo agente de
  implementação, a pedido explícito do orquestrador, como formalismo mínimo de
  rastreabilidade — ver histórico da sessão)
- **aprovado por**: usuário (thiagomorgado81@gmail.com), confirmação direta na
  sessão de implementação
- **projeto**: `web` (Next.js 16 App Router)

## Contexto

O projeto `web` não usa processo de SDD/SPEC formal até o momento (diferente de
`warren/Portal` e `warren/Core`, que têm `specs/` próprios e não se aplicam
aqui). Esta SPEC documenta, para fins de rastreabilidade e como contrato de
implementação, o escopo já detalhado tecnicamente pelo orquestrador para a
construção da área logada ("AppShell"), replicando visual/comportamento do
projeto irmão `warren/Portal` adaptado à stack do `web`.

## Escopo

### 1. Sessão / permissões
- Estender `src/auth.ts` (`authorize`, callbacks `jwt`/`session`) e
  `src/next-auth.d.ts` para guardar também `type` (number — 0 Internal, 1
  External, campo `UserAdminDTO.type` já devolvido pelo Core no login) na
  sessão, junto de `userName`/`isAdmin`/`accessToken` já existentes.
- Criar `src/lib/permissions.ts`:
  - `AreaId = "admin" | "administrativo" | "operacional" | "client" | "laboratorio"`.
  - `getUserAreas(user)`: usuários Internal (`type === 0`) veem
    `administrativo`, `operacional`, `laboratorio`, e também `admin` se
    `isAdmin === true` (único sinal de admin disponível hoje). Usuários não
    Internal veem só `client`. Sem usuário, nenhuma área.
  - Isso é só para esconder/mostrar item de UI no sidebar — não é proteção de
    rota (isso já existe em `src/proxy.ts`, não alterado por esta SPEC).

### 2. Rotas
- Route group `app/[lang]/(app)/...` compartilhando o layout do AppShell.
- A home real `/[lang]` move para dentro do grupo `(app)` (é tela pós-login).
  `login`/`forgot-password` continuam fora do grupo.
- Estrutura de seções/rotas — **corrigida pra bater exatamente com
  `warren/Portal`** (`src/Layouts/SideBar/index.tsx`, fonte de verdade
  conferida diretamente no código, não só pela descrição inicial do brief),
  labels traduzidas via i18n:
  - Administrador (`admin`, só `isAdmin`): `/admin/acesso`, `/admin/acessos`
    (Perfis de acesso).
  - Administrativo (`administrativo`): `/administrativo` (Início),
    `/administrativo/clientes`, `/operacoes` (fora do prefixo
    `/administrativo` de propósito, igual ao Portal),
    `/administrativo/cadastro/navio`, `/administrativo/cadastro/container`,
    `/administrativo/cadastro/terminal`, `/administrativo/cadastro/porto`,
    `/administrativo/cadastro/produto`, `/administrativo/log`,
    `/administrativo/ocorrencias`.
  - Operacional (`operacional`): `/operacional` (Início),
    `/operacional/operacoes`.
  - Laboratório (`laboratorio`): `/laboratorio`.
  - Área do cliente (`client`): `/client` (Início),
    `/client/relatorio-final`, `/client/acompanhamento`,
    `/client/colaboradores` (4 itens, não só Início — a versão inicial da
    SPEC tinha só Início por brief desatualizado em relação ao Portal real).
  - Cada item de sub-rota tem ícone próprio (não só a seção) — mapeado dos
    ícones Bootstrap Icons (`bi-*`) do Portal pros equivalentes de
    `react-bootstrap-icons`; "Navio" usa um SVG custom (`ship-icon.tsx`,
    cópia do `ShipIcon.tsx` do Portal) porque não existe ícone de navio na
    lib.
- Toda sub-rota que ainda não existe vira página placeholder ("Em
  construção" + nome da tela). `/administrativo`, `/operacional`, `/client`
  (Início de cada área) e `/laboratorio` têm conteúdo levemente mais
  elaborado (saudação + título da área), sem dado real do Core. Nenhum CRUD
  real implementado nesta SPEC.

### 3. Componentes (`src/components/shell/`)
- `app-shell.tsx` — client component raiz (sidebar + topbar + conteúdo),
  usado no `layout.tsx` do grupo `(app)`.
- `sidebar-section.tsx` — item de seção colapsável (accordion), com
  auto-abertura quando contém a rota ativa.
- `user-menu.tsx` — dropdown do rodapé da sidebar (react-bootstrap
  `Dropdown`, `drop="up"`), com:
  - "Perfil" (placeholder desabilitado).
  - "Preferências" (expande inline): Tema (Claro/Escuro, reaproveitando
    `color-modes.ts`), Idioma (pt-BR/en/zh, troca o segmento `[lang]` da
    URL via `usePathname()`), Visualização (Cards/Lista, novo, persistido
    via `useSyncExternalStore` + `localStorage`, mesmo padrão do tema —
    sem consumidor real ainda). Cada opção mostra indicador visual de
    seleção atual.
  - Divisor + "Sair" (reaproveita `signOutAction`).
- `language-switcher.tsx` — dropdown de idioma da topbar.
- Sidebar sempre escura (tokens próprios `--sidebar-*` em `tokens.css`,
  fixos, independentes de `data-bs-theme`); cor de marca/ativo reaproveita
  `--bs-success` (já existente, verde, mesma família de cor do
  `warren/Portal`).
- Responsivo: sidebar vira drawer off-canvas abaixo de ~992px, com botão
  hambúrguer na topbar e backdrop; mobile-first, validado em ~375px.

### 4. i18n
- Novas chaves nos 3 dicionários (`pt-BR`, `en`, `zh`): objeto `nav`
  (labels de seções/itens do sidebar) e objeto `shell` (Perfil,
  Preferências, Idioma, Visualização, Cards, Lista, placeholders). Reaproveita
  `theme.light`/`theme.dark` e `auth.signOut` já existentes.

### 5. Store de view mode
- `src/lib/view-mode.ts`: mesmo padrão de `color-modes.ts`
  (`useSyncExternalStore` + `localStorage`), sem Zustand. Sem consumidor
  real ainda além do próprio menu de preferências.

## Fora de escopo
- CRUD real de qualquer tela listada.
- Proteção de rota por área (permanece só em `src/proxy.ts`, autenticação
  genérica, não por role/área).
- Tela de perfil real.
- Uso real da preferência de Cards/Lista em alguma listagem.

## Critérios de aceitação

| ID | Critério |
|----|----|
| AC-001 | Sessão expõe `session.user.type`; `permissions.ts` retorna as áreas corretas para Internal/isAdmin/External/sem-sessão. |
| AC-002 | Sidebar mostra só as seções permitidas para o usuário logado. |
| AC-003 | Item de rota ativa fica destacado; seção com filho ativo abre automaticamente. |
| AC-004 | Todas as sub-rotas do brief existem (placeholder ou elaboradas), sem link morto. |
| AC-005 | Menu de usuário: Tema (Claro/Escuro) aplica de verdade via `color-modes.ts`, mesma chave de localStorage do toggle já existente. |
| AC-006 | Menu de usuário: Idioma troca a URL preservando o restante do path. |
| AC-007 | Menu de usuário: Visualização persiste Cards/Lista via `localStorage`, com indicador visual da opção ativa. |
| AC-008 | Sidebar vira drawer com backdrop abaixo de ~992px; testado mentalmente em ~375/768/1280px. |
| AC-009 | `npx next build` e `npx eslint .` limpos. |

## Decisões de implementação (registradas, não exigem nova aprovação)
- `admin` exige `isAdmin === true` além de Internal (único sinal disponível).
- Ícones de seção via `react-bootstrap-icons` (já dependência do projeto).
- Bandeira do idioma via emoji (sem novo asset/dependência).
- Cor de marca/ativo = `--bs-success` já existente, em vez de criar um novo
  token `--brand-primary` duplicado — porém com os valores hex corrigidos
  para bater exatamente com a marca "ASA" (Alex Stewart Agriculture) do
  `warren/Portal` (`src/Assets/css/themes/brands/asa.css`): `#23ab79`
  (tema claro) / `#61ce70` (tema escuro), em vez dos verdes genéricos de
  template usados inicialmente. Sidebar bg/fg também ajustados pro valor
  real do tema escuro do Portal (`--sidebar-bg: #1a2029` etc., ver
  `src/Assets/css/themes/dark.css`).
