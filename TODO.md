# TODO — NewPortal

Anotações curtas — não são dívida técnica (ver `specs/BACKLOG.md`) nem
spec formal (ver `specs/`). Viram spec ou ação rápida depois. Sem
processo formal: adiciona e risca como quiser.

## Pendente

- [x] ~~Paginação enxuta — `list-pagination.tsx` lista página por página
  (quebra com muitas páginas, ex. 300). Trocar por `<< < (página) > >>`.
  Foco esperado é busca, não navegação manual de página.~~ → SPEC-28
- [x] ~~Operação → aba Detalhes: botão pra editar as informações da
  operação.~~ → SPEC-33
- [x] ~~Operação → aba Romaneio: botão pra exportar o romaneio.~~ → SPEC-31
- [x] ~~Operação → aba Romaneio: visual da listagem mais parecido com a
  planilha Excel de exemplo, sem precisar da coluna de origem.~~ → SPEC-31
- [x] ~~Operação → aba Containers: falta paginação + busca na listagem.~~
  Paginação já existia (confirmado); busca → SPEC-38 (`IMPLEMENTED`).
  ~~Além disso, o modal de adicionar imagens do container precisa de um
  "checklist" das imagens necessárias.~~ → SPEC-37 (`IMPLEMENTED` —
  checklist dos 8 `ContainerPhotoSlot`, upload por slot)
- [ ] Preview de `.doc`/`.xlsx` — já existe (`DocxPreview`/`SheetPreview`
  em `file-preview-modal.tsx`), revisar/melhorar (checar o que está
  faltando/errado). **Ainda não virou SPEC** — falta descrever o problema
  real (qual arquivo, o que aparece errado) antes de dar pra especificar.
- [x] ~~Tela de Acesso (`admin/access`): editar se é admin já existe
  (switch no form) — confirmar se está funcionando/se é isso que falta.~~
  Confirmado que já funciona (isAdmin editável desde SPEC-23).
  ~~Falta paginação~~ (paginação já existia, confirmado)
  ~~+ filtro por role + filtro admin/não-admin na listagem.~~ → SPEC-32

- [x] ~~Sidebar principal: em telas menores, com muitos itens
  expandidos, o menu quebra em 2 colunas. Não pode ocorrer.~~ → SPEC-29

- [x] ~~Esconder o switch de marca/brand (`brand-switcher.tsx`) — não deve
  aparecer visualmente, nem no Header nem no UserMenu.~~ → SPEC-29

- [x] ~~Logs/auditoria de operação (Core gera automático: o quê, quando,
  quem — ex. import de romaneio, criação de NF, estufagem). Aba Log hoje
  é mock (`Log.tsx`, SPEC-07-09) — vira a fonte real. Remover do menu
  Administrativo (se existir entrada separada), deixar só dentro da
  página de Operação.~~ → SPEC-39 (`IMPLEMENTED`, Core
  `28-operation-audit-log` também `IMPLEMENTED`)

- [x] ~~Ocorrências (diferente do Log automático) — dentro da Operação,
  adicionado manualmente (admin ou operador): título, nota, imagens.
  Nunca foi implementado (SPEC-06 antiga foi cancelada).~~ → SPEC-43
  (`IMPLEMENTED`, Core `32-operation-occurrences` também `IMPLEMENTED`)

- [x] ~~Verificar suporte mobile: tirar foto na hora pelo celular
  (`InputPhotoSingle`/`InputPhotoMulti` hoje só têm `accept="image/*"`,
  sem `capture`) — além de receber a foto no formulário, garantir que
  fique salva no celular da pessoa também.~~ → SPEC-35 (`IMPLEMENTED` —
  `capture="environment"`; decisão fechada: comportamento padrão do
  celular já basta, sem código extra de "salvar cópia". CA1/R1 —
  abrir câmera direto num Android Chrome/iOS Safari real — segue
  pendente de verificação manual do usuário)

- [x] ~~Campos de data (`InputDate.tsx`) pedem digitar DD/MM/AAAA sem
  seletor visual (calendário). Um `react-datepicker` existia antes e foi
  removido por bug (resetava o valor digitado a cada tecla) — revisar se
  dá pra trazer de volta sem esse problema, ou outra solução de seletor.~~
  → SPEC-34 (`IMPLEMENTED`)

- [x] ~~Modal de Profile — 3 problemas: (avatar não atualiza,
  Phone/BirthDate travando vazio, botões Salvar/Cancelar em lugares
  diferentes)~~ → SPEC-30 (`IMPLEMENTED`, 2026-09-16 — RF1 tinha causa
  raiz no Core, `PATCH /profile/avatar` devolvia dado desatualizado;
  corrigido em `Core/specs/40-profile-avatar-stale-response`, confirmado
  em tela real pelo usuário)

- [x] ~~Sidebar (topo): logo do brand não aparece.~~ → SPEC-29
  (`IMPLEMENTED`, reversão da decisão da SPEC-26)

- [x] ~~Relatórios de verdade (aba Reports hoje é mock, SPEC-07-07): Weight
  Report, Packing List, Relatório Fotográfico...~~ → SPEC-40
  (`IMPLEMENTED`, 2026-09-16, Core `36`/`37`/`38` também `IMPLEMENTED`).
  Sem `.pdf` (fora do escopo do Core, sem LibreOffice hospedado) — só
  `.xlsx`/`.docx`.

- [x] ~~Aba Nota Fiscal ganha sub-abas: (1) listagem atual, (2) "Comparação
  NF"... (3) "Comparação Lotes"...~~ → SPEC-41 (`IMPLEMENTED`, Core
  `30-invoice-lote-comparison` também `IMPLEMENTED`)

- [x] ~~Tela nova: listar todos os fardos (romaneio) com checkbox,
  selecionar vários de uma vez e estufar todos juntos num único
  container...~~ → SPEC-42 (`IMPLEMENTED`, Core
  `31-cargo-stuffing-batch-identified` também `IMPLEMENTED`)

- [x] ~~Lacre de container: investigar/revisar UI depois que o Core
  definir lacrar/deslacrar com histórico...~~ → SPEC-44 (`IMPLEMENTED`,
  Core `33-container-seal-lifecycle-gaps` também `IMPLEMENTED`)

- [x] ~~Tela dedicada de "desestufagem" de fardos/sacas...~~ → SPEC-36
  (`IMPLEMENTED` — seção/toggle dentro da aba Containers, decisão
  fechada)

- [ ] Investigar Split/Transferência de Containers... → SPEC-45,
  `DEFERRED` (confirmado novamente 2026-09-16 pelo usuário: "última
  coisa a ser feita" — sistema ainda precisa ser validado com o
  negócio; Core `34-container-split-transfer-gaps` também `DEFERRED`)

- [x] ~~`Profile.ViewModel.Document` obrigatório~~ — Core resolveu
  (`27-profile-document-optional`, `IMPLEMENTED`). Lado NewPortal
  → SPEC-47 (`IMPLEMENTED`, 2026-09-16 — `InputDocument.tsx` não
  hardcoda mais `required`).

## Feito
