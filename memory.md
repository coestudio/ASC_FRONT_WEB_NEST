# Memory — ASC_FRONT_WEB_NEST

Estado do projeto em 2026-09-15 (fim de sessão). Ver `AGENTS.md`/`CLAUDE.md` pra convenções — este arquivo é só "onde paramos", não repete regra de arquitetura.

## Branches

- `main` e `atualizacao_thiago_asc` sincronizadas, mesmo commit (`3e06bb3`), ambas no `origin`. Nada pendente de merge.

## SPECs

- `specs/00` a `specs/17` — todas `IMPLEMENTED` (SPEC-17 "administrative-home" fechada nesta sessão). Backlog formal zerado, nenhuma `DRAFT`/`WAITING_APPROVAL`.
- SPEC-07 (índice de Operações) fica em `APPROVED` por design — é só o índice das 9 sub-specs, nunca vira `IMPLEMENTED` sozinha.
- `SPECS-LEGADO` (branch) confirmado fechado/mergeado em `main` — ver `specs/BRANCHING.md` §"Fechamento". Não tem trabalho pendente ali, `main` já foi além.

## Candidatos a SPEC futura (nenhum aprovado ainda)

- Aba **Log** de Operação virar real (`cargoUnitEventDTO`/`CargoUnit`) — endpoint existe mas é granular por cargo, não por operação; precisa decisão de design (agregação vs. drill-down).
- Aba **Relatórios** — bloqueado, Core não tem endpoint de emissão.
- Cores hardcoded residuais fora do escopo da SPEC-14 (`InputColorPicker`/`InputDate`/`InputDateTime`/`InputTime`, `src/routes/auth/route.tsx:18`).
- Revisão visual manual (3 brands × light/dark) da SPEC-14 — nunca feita, marcada `NOT VERIFIED`.
- Compressão/resize de imagem antes do upload (`specs/share-02`).
- Projeção real de operação/romaneio no relatório da área do cliente (SPEC-09, hoje mock — decisão explícita do usuário de deixar assim por ora).
- `useSsrSafeQuery` sem gate de `mounted` em 3 telas (`administrative/registry/terminal`, `administrative/clients`, `client/collaborators`) — risco conhecido de hydration mismatch, não confirmado como bug reproduzido (achado herdado da SPEC-10, ainda não tratado).
- Vendor chunk splitting do bundle JS (chunk raiz ~180KB gzip) — ganho pequeno, baixa prioridade.

## Fixes e features desta sessão (tudo já em `main`)

**Performance/peso:**
1. Imagens comprimidas: `login-bg.jpg` 3.9MB→288KB (webp), `share.jpg` (og:image) 3.9MB→599KB (jpeg q70). `.output/public` do build caiu de 11MB pra 4.5MB.
2. `logo_box.png` duplicado (ASC/ASI, 1.2MB cada) + `.xcf` fonte removidos — dead code, zero import no repo.
3. `LoadingState` (`src/components/ui/loading-state.tsx`) — componente compartilhado, substitui 9 `<Spinner>` soltos duplicados.
4. `defaultPendingComponent` global no router (`src/router.tsx`) — antes: tela branca em toda troca de rota/chunk lazy. `pendingMs`/`pendingMinMs` evita flash em navegação já em cache.

**Bug crítico de backend (`warren/Core`)**, descoberto e corrigido nesta sessão:
5. `GET /api/operation/{id}` quebrava com 500 pra qualquer operação com foto de container. Causa: duas classes `ContainerPhotoDTO` com o mesmo nome em namespaces diferentes (`Container.DTO.cs` tinha uma local morta, divergente da real em `Photos/Photo.DTO.cs`); `ContainerOperationDTO.Photos` apontava pra errada, AutoMapper não achava coerção entre elas. Fix commitado em `warren/Core` (`3dd3388`), deploy no Azure (`dev-asc-api`) confirmado, SPEC criada lá (`specs/08-container-photo-dto-collision-bugfix`). Reproduzido e validado local (Postgres via `docker-compose.db.yml` + `dotnet run`) antes do commit.

**Frontend — UX/bugs:**
6. `InputMultiSelect` (`layouts/Form/Fields/`) trocado de `<Form.Select multiple>` (exigia ctrl/cmd+click, inviável no mobile) pra checkboxes inline (`d-flex flex-wrap`). Único consumidor: campo "Perfis de acesso" em Admin/Access.
7. Super login (`auth/login/index.tsx`) precisava de dois cliques — o botão chamava `onSubmit` direto, bypassando `handleSubmit` do react-hook-form, então `formState.isSubmitting` nunca virava `true` e o botão não dava feedback nenhum durante o request. Fix: `loading` (state próprio) substitui `isSubmitting` nos dois botões, cobre os dois caminhos (form normal + super login).
8. `VITE_DEVELOPMENT` — nova env var, liga/desliga ferramentas de debug (`DevClearCacheButton`, aviso de chave i18n ausente) via `src/lib/dev-tools.ts`, independente do modo de build (`import.meta.env.DEV` antes).
9. SPEC-17 implementada: home do Administrativo com grid de quick actions, mesmo desenho de `operational/index.tsx`.

## Notas de ambiente (achados durante a sessão, não são bug)

- Vite dev server **reinicia sozinho** quando `.env` muda (`[vite] .env changed, restarting server...`) — não precisa matar/subir na mão, mas se sobrar processo duplicado (porta 8081 etc.) dá erro `Failed to fetch dynamically imported module` no browser → precisa fechar a aba e abrir nova (hard refresh não basta, é módulo JS órfão).
- Ambiente local do Core (`warren/Core`) funcional nesta máquina: Postgres via `docker compose -f docker-compose.db.yml up -d` (porta 5433, user/pass/db `warren`/`warren`/`warren_core`, precisa `colima start` primeiro), `dotnet ef database update --context Core.Domain.CoreDbContext`, `dotnet run -- init` pra criar/resetar `SuperAdmin` (senha nova a cada `init`), `dotnet run` sobe em `http://127.0.0.1:5766` com `ASPNETCORE_ENVIRONMENT=Development` (erro 500 vem com stack trace completo no JSON, útil pra debug).
- `warren/Core` tem CI de deploy automático pro dev (`azure-dev-deploy.yml`) — todo push em `main` builda e sobe pro Azure Web App `dev-asc-api` sozinho, ~2min.

## Coisas verificadas e confirmadas OK (sem bug)

- Os 7 modais administrativos (Cliente, Operações, Navio, Container, Terminal, Porto, Produto) — 100% de acordo com schema Zod gerado, nenhum campo faltando.
- Cliente/Produto/Navio/Container já ligados na Operação via `SelectAsync` (busca cadastro real, não duplica). Terminal/Porto não têm campo na Operação — Core não modela essa relação, não é gap de front.
- Select de status no shell de detalhe (`OperationHeader`) já funcionava certo (chamado direto, não via `RenderFields`).
- Admin/Access (`CrudListPage`, `PAGE_SIZE=20`) já pagina certo server-side — sem bug encontrado ali.
- API de dev (`dev-asc-api.alexstewart.com.br`) online e respondendo rápido (~65-80ms) — instabilidade investigada nesta sessão era o bug do item 5, não infra.
