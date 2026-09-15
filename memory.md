# Memory — ASC_FRONT_WEB_NEST

Estado do projeto em 2026-09-15. Ver `AGENTS.md`/`CLAUDE.md` pra convenções — este arquivo é só "onde paramos", não repete regra de arquitetura.

## Branches

- `main` e `atualizacao_thiago_asc` sincronizadas, mesmo commit (`3c10c8f`), ambas no `origin`.
- Fluxo da sessão: trabalha em `atualizacao_thiago_asc`, fast-forward pra `main`, push nas duas.

## SPECs

- `specs/00` a `specs/16` — todas `IMPLEMENTED` (SPEC-16 fechada nesta sessão). Backlog formal zerado, nenhuma `DRAFT`/`WAITING_APPROVAL`.
- SPEC-07 (índice de Operações) fica em `APPROVED` por design — é só o índice das 9 sub-specs, nunca vira `IMPLEMENTED` sozinha.

## Candidatos a SPEC futura (nenhum aprovado ainda)

- Aba **Log** de Operação virar real (`cargoUnitEventDTO`/`CargoUnit`) — endpoint existe mas é granular por cargo, não por operação; precisa decisão de design (agregação vs. drill-down).
- Aba **Relatórios** — bloqueado, Core não tem endpoint de emissão.
- Cores hardcoded residuais fora do escopo da SPEC-14 (`InputColorPicker`/`InputDate`/`InputDateTime`/`InputTime`, `src/routes/auth/route.tsx:18`).
- Revisão visual manual (3 brands × light/dark) da SPEC-14 — nunca feita, marcada `NOT VERIFIED`.
- Compressão/resize de imagem antes do upload (`specs/share-02`).
- Projeção real de operação/romaneio no relatório da área do cliente (SPEC-09, hoje mock — decisão explícita do usuário de deixar assim por ora).

## Fixes e features desta sessão (tudo já em `main`)

1. **`opService` faltando** no modal Nova Operação (`operations-list.tsx`) — campo obrigatório do schema sem `LayoutField` correspondente.
2. **Causa raiz real**: `RenderFields` (`layouts/Form/Fields/map.tsx`) não repassava `enumOptions` como prop irmã do `Select` — corrige qualquer `Select` futuro nesse caminho declarativo, não só Operações.
3. **Navegação da lista de Operações** liga na página de detalhe `$id` (7 abas) — existia mas não tinha link nenhum apontando pra ela.
4. **`ListPagination`** (`components/ui/list-pagination.tsx`) — paginação server-side extraída/unificada em `CrudListPage`, Operações, Containers, Documents.
5. **`src/Operations/`** (legado pré-TanStack, não rastreado) removido — poluía `check`/`lint`.
6. **SPEC-16 implementada**: aba Responsáveis virou real (`Operation/Responsible` — get/post/delete), trocando mock. Vincular via modal + `SelectAsync`.
7. **Contrato da API atualizado** (`just map`): `address.state` ganhou `maxLength: 2` (era `-1`, sem limite) em Client/Harbor/Profile; label do enum `operationType.Stuffing` mudou de "Ova de Contêiner" pra "Estufagem".
8. **Upload multipart quebrado**: `mutator.ts` repassava `Content-Type: multipart/form-data` (sem boundary, vindo fixo do Orval) direto pro `fetch`, impedindo o browser de gerar o boundary real — Core rejeitava com 400 "Missing content-type boundary". Fix: descarta esse header quando o body é `FormData`.
9. **Botão de download** na aba Documentos (`<a download>`, ícone `bi-download`).
10. **Todos os botões `outline-secondary` (cinza) → `outline-primary`** (23 arquivos) — Bootstrap `secondary` é cinza neutro fixo por design (`tokens.css`), não seguia brand/tema; trocado pra seguir cor de marca ativa em light/dark.
11. **`usePagination`** (`src/hooks/usePagination.ts`) — hook novo, paginação client-side pra lista já carregada por inteiro (mock ou endpoint sem `Offset`/`Limit`). Aplicado em Log, Reports e Responsáveis, que não tinham paginação nenhuma.

## Coisas verificadas e confirmadas OK (sem bug)

- Os 7 modais administrativos (Cliente, Operações, Navio, Container, Terminal, Porto, Produto) — 100% de acordo com schema Zod gerado, nenhum campo faltando.
- Cliente/Produto/Navio/Container já ligados na Operação via `SelectAsync` (busca cadastro real, não duplica). Terminal/Porto não têm campo na Operação — Core não modela essa relação, não é gap de front.
- Select de status no shell de detalhe (`OperationHeader`) já funcionava certo (chamado direto, não via `RenderFields`).
- Admin/Access (`CrudListPage`, `PAGE_SIZE=20`) já pagina certo server-side — sem bug encontrado ali.
