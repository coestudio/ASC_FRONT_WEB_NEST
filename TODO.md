# TODO — NewPortal

Anotações curtas — não são dívida técnica (ver `specs/BACKLOG.md`) nem
spec formal (ver `specs/`). Viram spec ou ação rápida depois. Sem
processo formal: adiciona e risca como quiser.

## Pendente

- [ ] Paginação enxuta — `list-pagination.tsx` lista página por página
  (quebra com muitas páginas, ex. 300). Trocar por `<< < (página) > >>`.
  Foco esperado é busca, não navegação manual de página.
- [ ] Operação → aba Detalhes: botão pra editar as informações da
  operação.
- [ ] Operação → aba Romaneio: botão pra exportar o romaneio.
- [ ] Operação → aba Romaneio: visual da listagem mais parecido com a
  planilha Excel de exemplo, sem precisar da coluna de origem.
- [ ] Operação → aba Containers: falta paginação + busca na listagem.
  Além disso, o modal de adicionar imagens do container precisa de um
  "checklist" das imagens necessárias.
- [ ] Preview de `.doc`/`.xlsx` — já existe (`DocxPreview`/`SheetPreview`
  em `file-preview-modal.tsx`), revisar/melhorar (checar o que está
  faltando/errado).
- [ ] Tela de Acesso (`admin/access`): editar se é admin já existe
  (switch no form) — confirmar se está funcionando/se é isso que falta.
  Falta paginação + filtro por role + filtro admin/não-admin na
  listagem.

- [ ] Sidebar principal: em telas menores, com muitos itens
  expandidos, o menu quebra em 2 colunas. Não pode ocorrer.

- [ ] Esconder o switch de marca/brand (`brand-switcher.tsx`) — não deve
  aparecer visualmente, nem no Header nem no UserMenu.

- [ ] Logs/auditoria de operação (Core gera automático: o quê, quando,
  quem — ex. import de romaneio, criação de NF, estufagem). Aba Log hoje
  é mock (`Log.tsx`, SPEC-07-09) — vira a fonte real. Remover do menu
  Administrativo (se existir entrada separada), deixar só dentro da
  página de Operação.

- [ ] Ocorrências (diferente do Log automático) — dentro da Operação,
  adicionado manualmente (admin ou operador): título, nota, imagens.
  Nunca foi implementado (SPEC-06 antiga foi cancelada).

- [ ] Verificar suporte mobile: tirar foto na hora pelo celular
  (`InputPhotoSingle`/`InputPhotoMulti` hoje só têm `accept="image/*"`,
  sem `capture`) — além de receber a foto no formulário, garantir que
  fique salva no celular da pessoa também.

- [ ] Campos de data (`InputDate.tsx`) pedem digitar DD/MM/AAAA sem
  seletor visual (calendário). Um `react-datepicker` existia antes e foi
  removido por bug (resetava o valor digitado a cada tecla) — revisar se
  dá pra trazer de volta sem esse problema, ou outra solução de seletor.

## Feito
