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
  Paginação já existia (confirmado); busca depende do Core → SPEC-38.
  ~~Além disso, o modal de adicionar imagens do container precisa de um
  "checklist" das imagens necessárias.~~ → SPEC-37 (`[NEEDS_DECISION]`
  em aberto: quais fotos são "necessárias")
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
  página de Operação.~~ → SPEC-39 (entrada órfã confirmada, aguarda spec
  Core de Logs/Auditoria)

- [x] ~~Ocorrências (diferente do Log automático) — dentro da Operação,
  adicionado manualmente (admin ou operador): título, nota, imagens.
  Nunca foi implementado (SPEC-06 antiga foi cancelada).~~ → SPEC-43
  (re-proposta do zero, aguarda spec Core)

- [x] ~~Verificar suporte mobile: tirar foto na hora pelo celular
  (`InputPhotoSingle`/`InputPhotoMulti` hoje só têm `accept="image/*"`,
  sem `capture`) — além de receber a foto no formulário, garantir que
  fique salva no celular da pessoa também.~~ → SPEC-35
  (`[NEEDS_DECISION]` em aberto: o que "garantir salvo" significa)

- [x] ~~Campos de data (`InputDate.tsx`) pedem digitar DD/MM/AAAA sem
  seletor visual (calendário). Um `react-datepicker` existia antes e foi
  removido por bug (resetava o valor digitado a cada tecla) — revisar se
  dá pra trazer de volta sem esse problema, ou outra solução de seletor.~~
  → SPEC-34 (`[NEEDS_DECISION]` em aberto: reviver lib vs. alternativa)

- [x] ~~Modal de Profile — 3 problemas: (avatar não atualiza,
  Phone/BirthDate travando vazio, botões Salvar/Cancelar em lugares
  diferentes)~~ → SPEC-30 (`[NEEDS_DECISION]` em aberto: layout de
  Salvar/Cancelar com 3 forms independentes)

- [x] ~~Sidebar (topo): logo do brand não aparece.~~ → SPEC-29 (reversão
  da decisão da SPEC-26)

- [x] ~~Relatórios de verdade (aba Reports hoje é mock, SPEC-07-07): Weight
  Report, Packing List, Relatório Fotográfico...~~ → SPEC-40 (aguarda
  spec Core de Relatórios de Operação)

- [x] ~~Aba Nota Fiscal ganha sub-abas: (1) listagem atual, (2) "Comparação
  NF"... (3) "Comparação Lotes"...~~ → SPEC-41 (aguarda spec Core de
  Comparação NF/Lote)

- [x] ~~Tela nova: listar todos os fardos (romaneio) com checkbox,
  selecionar vários de uma vez e estufar todos juntos num único
  container...~~ → SPEC-42 (confirmar no Core se aceita lote numa
  chamada só)

- [x] ~~Lacre de container: investigar/revisar UI depois que o Core
  definir lacrar/deslacrar com histórico...~~ → SPEC-44 (investigação,
  aguarda spec Core)

- [x] ~~Tela dedicada de "desestufagem" de fardos/sacas...~~ → SPEC-36
  (`[NEEDS_DECISION]` em aberto: onde entra na navegação)

- [x] ~~Investigar Split/Transferência de Containers...~~ → SPEC-45
  (investigação, perguntas de negócio em aberto)

- [x] ~~`Profile.ViewModel.Document` obrigatório~~ — 100% território Core
  (`[Required]` em `Profile.ViewModel.cs`), sem trabalho de frontend.
  Aguardando o Core decidir/mudar isso (fora do fluxo SDD deste agente).

## Feito
