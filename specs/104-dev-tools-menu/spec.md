# SPEC-104 — Ferramentas de desenvolvedor: menu discreto + "Dev mode"

- **ID:** SPEC-104
- **Nome:** dev-tools-menu
- **Status:** IMPLEMENTED (2026-09-25) — pedido do usuário ("deixar isso de
  forma discreta e com mais opções quando clicar"; "adicionar nas
  ferramentas de desenvolvedor um meio para ir para a página /debug e para
  a página /files do back-end"; "só aparece quando for ambiente de
  desenvolvimento e no sidebar aparecer dev-mode e o dropdown com as
  ações"). Branch `feat/104-dev-tools-menu`, aguardando revisão visual do
  usuário antes do merge em `main`.
- **Autor:** claude (2026-09-25)
- **Área:** `src/components/dev-tools/**` (novo),
  `src/routes/__root.tsx`, `src/layouts/AppShell/{UserMenu.tsx,index.tsx,index.module.css}`,
  `src/lib/dev-tools.ts`, `src/i18n/dictionaries/*/common.json`.
- **Depende de (Core):** nada novo. `/files` já existe no Core só em
  Development (`Program/RequestPipeline.cs`, `UseDirectoryBrowser("/files")`).

---

## 1. Antes

- `DevClearCacheButton` (`src/components/ui/dev-clear-cache-button.tsx`):
  bolha **vermelha** de 56px no canto inferior direito, uma ação só (limpar
  cache, com confirmação), montada no `__root`.
- Página de debug existe em `/admin/debug` (SPEC-48, só admin, fora da
  sidebar — acesso só por URL).
- Nada indicava na UI que o ambiente é de desenvolvimento.

## 2. Escopo

- **RF1 — Botão flutuante discreto.** `DevToolsFab` substitui o
  `DevClearCacheButton` (apagado): 36px, contorno neutro, ícone
  `bi-tools`, 45% de opacidade até hover/foco/menu aberto. Cores só por
  token. Clique abre dropdown pra cima com as ações do RF3.
- **RF2 — Só em desenvolvimento.** Tudo depende de
  `VITE_DEVELOPMENT=true` (`isDevToolsEnabled`) — mesma flag de antes.
- **RF3 — Ações** (`useDevTools`, lista única pro botão e pro submenu):
  - **Página de debug** → navega pra `/admin/debug`. Só aparece pra
    `isAdmin` (a rota exige admin).
  - **Arquivos do back-end (/files)** → abre `${VITE_API_URL}/files/` em
    nova aba (link direto pro Core; só aparece se `VITE_API_URL` existir).
  - **Limpar cache local** → mesma ação e confirmação de antes.
- **RF4 — Sidebar.** Selo **dev-mode** ao lado da versão no rodapé da
  sidebar, e submenu **Dev mode** no `UserMenu` (mesmo accordion de
  "Preferências") com as ações do RF3.
- **RF5 — Sem busca extra.** `useDevTools` lê o `profile/me` só do cache
  (`enabled: false`): o botão também aparece nas telas de login, onde uma
  busca real daria 401 e redirecionaria pro login.
- **RF6 — i18n.** `devTools.menuLabel`, `devTools.devMode`,
  `devTools.goToDebug`, `devTools.openFiles` nos 4 locales.

## 3. Critérios de aceite

- [ ] Com `VITE_DEVELOPMENT=true`: botão pequeno e apagado no canto;
      clique abre menu com Debug (admin), Arquivos do back-end e Limpar
      cache.
- [ ] Debug abre `/admin/debug`; Arquivos abre `/files/` do Core em nova
      aba; Limpar cache pede confirmação e limpa como antes.
- [ ] Sidebar mostra `dev-mode` ao lado da versão; menu do usuário tem
      "Dev mode" com as mesmas ações.
- [ ] Não-admin não vê "Página de debug".
- [ ] Sem `VITE_DEVELOPMENT=true`: nada disso aparece.
- [x] `bun run check` e `bun run lint` limpos.

## 4. Observação

`/files` só responde com o Core em **Development** (local). Em dev/prod
publicados o Core não roda em Development, e o front publicado não deve ter
`VITE_DEVELOPMENT=true` — então o item não aparece lá.
