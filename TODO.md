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

- [ ] Modal de Profile — 3 problemas:
  1. Trocar avatar dá toast de sucesso mas a imagem só atualiza depois de
     recarregar a página (cache/estado não reflete de imediato).
  2. Documento/Telefone/Data de nascimento não podem ser obrigatórios —
     precisa aceitar vazio. Atenção: `Phone`/`BirthDate` já são opcionais
     no Core, bug deve ser só do front; `Document` é `[Required]` de
     verdade no Core (`Profile.ViewModel.cs`) — mudar isso é território
     Core, não só front.
  3. Botão Salvar e botão Cancelar ficam em lugares diferentes (Cancelar
     no `Modal.Footer`, Salvar dentro de cada aba) — colocar um do lado
     do outro.

- [ ] Sidebar (topo): logo do brand não aparece. Nota: isso foi removido
  de propósito antes (`.sidebarHeader` ficou vazio/`aria-hidden`,
  decisão da SPEC-26 já implementada) — usuário quer trazer de volta,
  é reversão de decisão anterior, não bug novo.

- [ ] Relatórios de verdade (aba Reports hoje é mock, SPEC-07-07): Weight
  Report, Packing List, Relatório Fotográfico (baseado nos containers +
  fotos dos containers, emitido em .pdf **e** .docx). Todos em inglês
  fixo, sem precisar de i18n.

- [ ] Aba Nota Fiscal ganha sub-abas: (1) listagem atual, (2) "Comparação
  NF" — quadro geral comparando quantidade de fardos/peso líquido/peso
  bruto declarado da NF vs. o que já foi estufado (precisa de rota
  dedicada no Core), (3) "Comparação Lotes" — mesma ideia mas orientada
  por lote em vez de NF.

- [ ] Tela nova: listar todos os fardos (romaneio) com checkbox,
  selecionar vários de uma vez e estufar todos juntos num único
  container (hoje só dá pra estufar um fardo específico por vez — Modo
  A — ou por quantidade sem escolher qual — Modo B).

- [ ] Lacre de container: investigar/revisar UI depois que o Core
  definir lacrar/deslacrar com histórico (ver item equivalente no
  TODO do Core).

- [ ] Tela dedicada de "desestufagem" de fardos/sacas. Hoje só existe
  via Cancelar dentro do modal "ver fardos estufados" (que já libera a
  linha do romaneio de volta, mas sem tela própria/fluxo claro).

- [ ] Investigar Split/Transferência de Containers (mover fardos de um
  container pra outro, ou dividir um container em dois) — não existe
  hoje.

## Feito
