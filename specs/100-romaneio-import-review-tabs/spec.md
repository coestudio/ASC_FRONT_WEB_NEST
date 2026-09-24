# SPEC-100 — Import de Romaneio: revisão em abas, paginada, para planilhas grandes

- **ID:** SPEC-100
- **Nome:** romaneio-import-review-tabs
- **Status:** IMPLEMENTED (2026-09-24) — RF13 integrado ao Core SPEC-55 (`feat/55-romaneio-import-pending-resolution`); aguardando teste manual do usuário — aprovado pelo usuário ("pode
  escrever essa specs e fazer numa branch separada para eu ver antes de
  migrar para main"). Branch `feat/100-romaneio-import-review-tabs`,
  aguardando revisão visual do usuário antes do merge em `main`.
- **Autor:** claude (pedido do usuário, 2026-09-24)
- **Área:** `src/components/operations/tabs/RomaneioImportModal.tsx`
  (extraído de `Romaneio.tsx`: `ImportRomaneioModal` e seções `Import*Section`).
- **Depende de (Core):** nada novo — usa o mesmo `analyze`/`apply` de hoje
  (`RomaneioImportAnalysisDTO` / `PostApiOperationOperationIdRomaneioImportApplyBody`).

---

## 1. Objetivo

Caso real: planilha de romaneio com **até ~2.500 linhas**. A etapa
"Revisar" do import hoje empilha todas as seções (Novos, Ausentes,
Conflitos, De outra operação, Inválidos, Duplicados) numa rolagem única,
renderizando uma linha/checkbox por item. Com 2.500 itens:

- seções importantes (Ausentes — ação destrutiva; Conflitos) ficam no fim
  de uma rolagem gigante e passam despercebidas;
- milhares de checkboxes no DOM deixam o modal lento;
- não há como marcar/desmarcar em massa nem achar um fardo específico.

**Decisão (com o usuário):** não usar multi-step para a revisão (as
categorias são independentes; forçar sequência só adiciona cliques). O
fluxo continua `Enviar planilha → Revisar`, e a etapa Revisar vira **uma
tela com resumo + abas por categoria**, lista **paginada** e **busca** por
aba, ações em massa por categoria e um rodapé que diz o que o "Aplicar" vai
fazer.

## 2. Contexto — estado atual

- `ImportRomaneioModal` (`Romaneio.tsx` ~l.702): seleção já é estado local
  por id (`Set<string>` para Novos/Ausentes, `Record<id, Set<campo>>` para
  Conflitos) — **mantido**. Payload do `apply` continua passando pelo schema
  gerado (`.parse`) — regra 2 intacta.
- Defaults atuais mantidos: todo Novo marcado, todo campo divergente de
  Conflito marcado, **nenhum Ausente marcado** (exclusão é opt-in).
- `summary.unchanged` existe mas a lista (`unchangedCertificados`) nunca era
  exibida.

## 3. Escopo

### 3.1 Requisitos funcionais

- **RF1 — Resumo.** Badges de contagem do topo continuam (`ImportSummary`).
- **RF2 — Abas por categoria** (`Nav variant="pills"`, mesmo padrão de
  `Invoice.tsx`/`Operational.tsx`): Novos, Ausentes, Conflitos, De outra
  operação, Inválidos, Duplicados, Sem alteração — cada uma com a contagem
  no rótulo. Aba com 0 itens fica **desabilitada**.
- **RF3 — Aba inicial.** Abre na primeira aba com itens na ordem de
  prioridade Conflitos → Ausentes → Novos → De outra operação → Inválidos →
  Duplicados → Sem alteração.
- **RF4 — Destaque de atenção.** Abas Ausentes e Conflitos com itens
  ganham ícone de alerta (`bi-exclamation-triangle-fill`, `text-warning`).
- **RF5 — Busca por aba** (`FilterText`, `layouts/Filters`): filtra por
  certificado (itemIdentifier), código (itemCode), lote e nota fiscal
  quando o DTO tiver o campo; Inválidos filtra também pelo número da linha
  e texto do erro. Trocar de aba limpa a busca e volta à página 1.
- **RF6 — Paginação local** (`ListPagination`), 50 itens por página, sobre
  a lista já filtrada. Mudar a busca volta à página 1.
- **RF7 — Ações em massa** (abas acionáveis):
  - Novos / Ausentes: "Marcar todos (N)" e "Desmarcar todos" — atuam sobre
    **todos os itens filtrados** da categoria (não só a página visível).
    Contador "X de Y marcados" na aba.
  - Conflitos: "Aceitar todos os campos" / "Ignorar todos" — mesma regra.
- **RF8 — Abas informativas** (De outra operação, Inválidos, Duplicados,
  Sem alteração): lista paginada sem checkbox.
- **RF9 — Rodapé com o efeito do Aplicar:** "X serão criados · Y
  atualizados · Z excluídos" (Y = conflitos com ≥1 campo marcado),
  sempre visível ao lado dos botões.
- **RF10 — Confirmação de exclusão.** Se houver ≥1 Ausente marcado,
  "Aplicar" abre `ConfirmationModal` (`variant="danger"`) informando
  quantos fardos serão excluídos. Sem Ausente marcado, aplica direto
  (comportamento atual).
- **RF12 — Ajustar linha inválida** (pedido do usuário, 2026-09-24).
  Cada linha da aba Inválidos tem botão "Ajustar", que abre o formulário
  de fardo (`CrudRecordModal`, modo criar, mesmos campos/schema gerado da
  aba Romaneio) pré-preenchido com os dados da linha. Ao salvar, o fardo é
  **criado na hora** via `POST /operation/{id}/romaneio` (endpoint já
  existente) — decisão do usuário, porque o `apply` do import só aceita
  ids já classificados pelo Core, não linhas corrigidas. A linha fica com
  selo "Corrigido" (sem botão) e o rodapé soma "N corrigidos já criados".
  Erro de validação/duplicidade do Core mantém o formulário aberto.
  **Layout do ajuste (pedido do usuário):** modal próprio
  (`RomaneioFixRowModal`) com duas áreas lado a lado — **Original**
  (valores da planilha, só leitura, "—" vermelho em campo vazio) e
  **Ajuste** (formulário editável, mesmos campos/schema). Os erros da
  linha aparecem num alerta acima das duas áreas. Campo alterado fica
  destacado no Original (linha amarela, valor riscado) e o cabeçalho do
  Ajuste mostra "N campo(s) alterado(s)". Botão "Restaurar original"
  volta o formulário aos valores da planilha. Abaixo de `lg` as áreas
  empilham e o modal fica em tela cheia.
- **RF13 — Só grava depois de resolver todas as pendências** (decisão do
  usuário, 2026-09-24; **substitui** o "criar na hora" do RF12). Depende
  da SPEC do Core `romaneio-import-pending-resolution` (estado de decisão
  no snapshot do import + endpoints `fix-row`, `discard-row`,
  `resolve-duplicate`, `decide` + gate de pendência no `apply`).
  - Pendências: Ausentes (Manter/Excluir), Conflitos (Aceitar campos/
    Ignorar), Inválidos (Ajustar/Descartar), Duplicados (escolher a linha
    que vale/Descartar todas). Novos: default "criar", não é pendência.
    De outra operação e Sem alteração: informativos.
  - Ajustar chama `fix-row`: nada é gravado; a linha é revalidada com as
    regras do import e **muda de aba** conforme a reclassificação do Core
    (pode virar pendência nova — processo dinâmico).
  - Contador geral de pendências no topo, badge por aba, botão "Próxima
    pendência". Aplicar desabilitado enquanto `pending.total > 0`; ao
    clicar, resumo final e OK. Um único `apply` grava tudo (Invoice
    automática e evento de Log continuam no Core).
- **RF11 — Layout.** Modal `size="xl"`, `fullscreen="md-down"`. Corpo com
  rolagem própria (padrão do wrapper `Modal`); header/footer fixos.

### 3.2 Fora do escopo

- Virtualização de lista (`@tanstack/react-virtual`) — seria pacote novo
  (trava do `bunfig.toml`); paginação resolve.
- Download de relatório de linhas inválidas/duplicadas (.xlsx/.csv) —
  candidato a SPEC futura.
- Qualquer mudança no Core ou no contrato do `analyze`/`apply`.
- Etapa de upload (`stepUpload`) — sem mudança.

## 4. i18n

Chaves novas em `administrative-operations.romaneio.import` nos 4 locales
(`pt-BR` canônico, `en`, `es`, `zh`):

- `sections.unchanged`, `sections.unchangedHint`
- `review.searchPlaceholder`, `review.selectAll`, `review.clearAll`,
  `review.acceptAllFields`, `review.ignoreAllFields`,
  `review.selectedCount`, `review.empty`, `review.noResults`,
  `review.footerSummary`
- `confirmDelete.title`, `confirmDelete.message`, `confirmDelete.confirm`

## 5. Arquivos esperados

- `src/components/operations/tabs/RomaneioImportModal.tsx` (novo) —
  `ImportRomaneioModal` extraído de `Romaneio.tsx` (que tinha ~1.150
  linhas) e reescrito.
- `src/components/operations/tabs/Romaneio.tsx` — só importa o modal.
- `src/components/operations/tabs/RomaneioFixRowModal.tsx` (novo) — modal
  de ajuste em duas áreas (RF12).
- `src/components/crud/empty-strings-resolver.ts` (novo) —
  `withEmptyStringsAsNull` extraído de `crud-record-modal.tsx` (sem mudança
  de comportamento) pra ser reusado pelo modal de ajuste.
- `src/components/operations/tabs/RomaneioForm.ts` (novo) —
  `RomaneioFormValues`, `toFormValues` e `buildRomaneioFields` extraídos
  de `Romaneio.tsx`, compartilhados com o ajuste de linha inválida (RF12).
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json`.

## 6. Riscos

- Busca sobre 2.500 itens a cada tecla: filtro em memória com `useMemo`,
  custo desprezível nessa escala.
- "Marcar todos" com busca ativa atua só nos filtrados — rótulo mostra o
  número exato (`Marcar todos (N)`) pra não haver surpresa.

## 7. Critérios de aceitação

- CA1 — Planilha com milhares de linhas: modal abre e responde sem travar;
  só 50 linhas renderizadas por aba/página.
- CA2 — Aba inicial segue RF3; abas vazias desabilitadas.
- CA3 — Marcar/desmarcar todos atua na categoria inteira (filtrada) e o
  payload do `apply` reflete isso.
- CA4 — Com Ausente marcado, Aplicar pede confirmação; sem, não pede.
- CA5 — Rodapé mostra contagens corretas de criar/atualizar/excluir.
- CA6 — Mobile (`md` ou menor): modal em tela cheia, sem scroll horizontal.
- CA7 — `bun run check` e `bun run lint` passam.

## 8. Implementation Notes

- Modal extraído pra `RomaneioImportModal.tsx`; `DIFF_FIELD_LABELS` foi
  junto (único consumidor). Nenhuma mudança de contrato/payload do `apply`.
- Componentes internos: `SelectableTab` (Novos/Ausentes), `ConflictsTab`,
  `ReadOnlyTab` (informativas), `TabToolbar` (busca + ações), `PagedList`
  (vazio/sem resultado/paginação) e hook `useFilteredPage` (filtro em
  memória + fatia de 50).
- Extratores de texto de busca são funções de módulo (estáveis) pra não
  invalidar o `useMemo` do filtro a cada render.
- `ListPagination` só aparece com mais de 1 página dentro da aba (a regra
  "paginação sempre visível" é das listagens principais; aqui ela poluiria
  abas com poucos itens).
- Aba "Sem alteração" passou a listar `unchangedCertificados` (antes só
  existia o contador).
- Gates: `bun run check` limpo; `bun run lint` 0 erros, nenhum warning nos
  arquivos tocados.
- RF12: fardo criado pelo "Ajustar" não entra no payload do `apply`; se o
  mesmo certificado também estiver em Novos, o `apply` pode acusar
  conflito/duplicidade no Core — risco aceito (caso raro: linha inválida
  e válida com o mesmo certificado já cai em Duplicados).
- **Não verificado em runtime** (precisa Core local + planilha grande):
  CA1, CA4 e CA6 dependem de teste manual do usuário na branch.

### RF13 — implementação no front (2026-09-24)

- Decisões guardadas no front, por id: Ausentes `keep|delete`, Conflitos
  `accept|ignore` (+ campos marcados; aceitar exige ≥1 campo), Inválidos e
  Duplicados `descartado`. Sem decisão = pendente. Novos continuam com
  "criar" por padrão (não é pendência).
- Alerta no topo com o total de pendências + botão "Próxima pendência"
  (vai para a aba e a página do primeiro item pendente, na ordem
  Conflitos → Ausentes → Inválidos → Duplicados); selo amarelo com a
  contagem por aba e ✓ verde quando a aba está resolvida; itens pendentes
  destacados em amarelo.
- "Aplicar" desabilitado com pendência; ao clicar, `ConfirmationModal` com
  o resumo (criar/atualizar/excluir/descartadas), vermelho se houver
  exclusão (substitui a confirmação só-de-exclusão do RF10).
- Payload do `apply` inalterado (createNew / conflicts aceitos /
  deleteMissing = "excluir") — funciona com o Core atual. O gate de
  pendência é só no front até o Core validar no servidor.
- Duplicados agrupados por certificado; hoje só "Descartar" (escolher qual
  linha vale depende do Core reclassificar a linha).
- "Ajustar" em Inválidos **desabilitado** com dica: o "criar na hora" do
  RF12 foi removido (gravava sem Invoice automática nem evento de Log).
  `RomaneioFixRowModal` (layout Original × Ajuste) fica pronto para ser
  religado ao `fix-row` quando o endpoint existir no client gerado.

### RF13 — integração com o Core SPEC-55 (2026-09-24)

- `just map` com o Core na branch `feat/55-romaneio-import-pending-resolution`:
  `decide`, `fix-row`, `discard-row`, `resolve-duplicate`; `apply` passou a
  receber só `{ importId }` (contrato quebrado de propósito no Core).
- **Estado de decisão agora vem do servidor** (substitui as decisões locais
  da etapa anterior): cada ação chama o endpoint e a análise devolvida
  substitui a local. Único estado local que sobrou: rascunho dos campos de
  conflito antes de "Aceitar", aba/busca/página e modais.
- Novos nascem **Pendente** no Core (SPEC-55 §3.1, `[NEEDS_DECISION]` em
  aberto lá) — a aba Novos ganhou Criar/Não criar por item e em massa.
- Ajustar → `fix-row`: continua inválida = modal fica aberto com os erros
  novos; válida = toast dizendo para qual aba a linha foi. Nada é gravado.
- Descartar (`discard-row`) e duplicados (`resolve-duplicate`: manter uma
  linha ou descartar todas) **não têm desfazer** no Core → sempre pedem
  confirmação. Em lote, chamadas **sequenciais** (todas reescrevem o mesmo
  snapshot no servidor).
- `withEmptyStringsAsUndefined` saiu de `Romaneio.tsx` para
  `components/crud/empty-strings-resolver.ts` (reuso no modal de ajuste com
  o schema gerado do `fix-row`).
- Gates: `tsc` limpo; `bun run lint` 0 erros. **Não testado em runtime.**

### RF14 — Fardo estufado (Core SPEC-56, 2026-09-24)

Regra do usuário: fardo **estufado** (CargoUnit ativa) não pode ter
identificador, nota fiscal, lote e pesos alterados, nem ser excluído. Quem
garante é o Core (`feat/56-romaneio-stuffed-lock`); o front só antecipa.

- `just map` contra o Core da SPEC-56: `RomaneioImportConflictDTO` ganhou
  `isStuffed`/`lockedFields`; `RomaneioImportMissingItemDTO` ganhou
  `isStuffed`.
- **Aba Romaneio — editar fardo:** se `isStuffed`, os campos travados ficam
  desabilitados com cadeado (`STUFFED_LOCKED_FIELDS` em `RomaneioForm.ts`,
  espelho de `RomaneioModel.StuffedLockedFields`). `LayoutField` ganhou
  `disabled` (repassado pelo `RenderFields` só quando ligado).
- **Import — Conflitos:** selo "Estufado"; campo travado aparece com
  cadeado, sem checkbox, e nunca entra no "Aceitar". Conflito sem campo
  aceitável fica de fora do aceite em massa (o Core já o marca como Ignorar
  automático).
- **Import — Ausentes:** selo "Estufado"; Manter/Excluir desabilitados (o
  Core já o marca "Manter" travado). Fardo estufado não entra nas ações em
  massa — o `decide` é tudo-ou-nada e recusaria o lote inteiro.
- **Aplicar recusado (409 `stuffed`):** fardo estufado entre a revisão e o
  Aplicar. Nada foi gravado; o front recarrega a análise
  (`GET import/{importId}`) e avisa quantos fardos foram estufados — as
  decisões afetadas voltam como pendência.
- Gates: `tsc` limpo; `bun run lint` 0 erros. **Não testado em runtime.**

### RF15 — "De outra operação" mostra onde o fardo está (2026-09-24)

- Pedido do usuário: quando o fardo já está cadastrado, mostrar onde.
- A aba lista, por fardo, a operação dona (`ownerOperationId` do Core):
  "Operação #número · Booking · Cliente" + botão "Abrir operação" (nova
  aba do navegador, pra não perder a revisão do import).
- Cada operação dona é buscada uma única vez (`useQueries` com a mesma
  queryKey do hook gerado `GET /api/operation/{id}`) e só quando a aba é
  aberta. Sem mudança no Core.

### RF16 — Aba Romaneio: fardo estufado explica por que não pode ser excluído (2026-09-24)

- O Core já bloqueia (409 `RomaneioCannotDeleteWithLinkedCargoUnit` em
  delete/delete-batch; `RomaneioBatchStuffedCannotUpdate` no update-batch).
  O front escondia o motivo: checkbox desabilitado sem explicação.
- `CrudSelection` ganhou `disabledReason` (dica no checkbox desabilitado,
  também no `aria-label`) — genérico, qualquer lista pode usar.
- Romaneio: dica "Fardo estufado: não pode ser excluído nem ter nota
  fiscal ou lote alterados…" no checkbox; clicar na linha estufada mostra
  o mesmo aviso (toast, sem repetir); selo "Estufado" no cartão (celular).
- Duplo clique em fardo estufado passa a abrir o **editar** (antes: só
  visualizar), com os campos travados da SPEC-56 — os demais seguem
  editáveis.

