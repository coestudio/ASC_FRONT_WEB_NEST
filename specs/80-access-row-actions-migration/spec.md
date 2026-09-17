# SPEC-80 — Migrar `admin/access` pro padrão de ações da SPEC-79

- **ID:** SPEC-80
- **Nome:** access-row-actions-migration
- **Status:** IMPLEMENTED — sem `[NEEDS_DECISION]`.
- **Autor:** claude (pedido do usuário, 2026-09-17)
- **Área:** `src/routes/_dashboard/admin/access/index.tsx`,
  `src/routes/_dashboard/admin/access/index.module.css`.
- **Depende de:** `specs/79-click-to-reveal-row-actions` (`IMPLEMENTED`) —
  reaproveita `CrudRowActions` (modo controlado) e `CrudListPage.rowActions`/
  `onRowOpen` sem mudança nenhuma nesses componentes.

---

## 1. Objetivo

Usuário percebeu, depois da SPEC-79: as telas administrativas migraram pro
padrão novo (clique revela menu, sem coluna de ações fixa), mas
`admin/access` continua com o padrão antigo — um trio... na verdade um
**quinteto** de botões-pílula sempre visíveis (`RowActions`, ver/editar/
ativar-desativar/resetar senha/excluir). Isso não foi um esquecimento de
mapeamento — é uma exclusão **documentada** desde a SPEC-18 §4 (reafirmada
na SPEC-55 §4 e por isso fora da lista de telas da SPEC-79): `access` tem 5
ações, não as 3 que `CrudRowActions` cobria até então (ver/editar/excluir).
Com `CrudRowActions.extraActions` (SPEC-65) já suportando ações extras
genéricas, a lacuna original deixa de existir — dá pra migrar sem perder
nenhuma das 5 ações.

## 2. Contexto — estado atual

`RowActions` (`index.tsx:90-142`) é um `<div className="d-flex gap-1
flex-wrap">` com 5 `<button>` sempre visíveis, cores fixas por classe CSS
local (`styles.actionBtnNeutral`/`actionBtnSuccess`/`actionBtnDanger`,
`index.module.css`) — compartilhado entre a coluna de ações da tabela
(`columns` linha 298-302) e o card (`renderCard`, linha 429-431).

Ações, na ordem atual:
1. **Ver** (`bi-eye`, neutro) → `setModal({ mode: "view", user: u })`.
2. **Editar** (`bi-pencil`, verde) → `setModal({ mode: "edit", user: u })`.
3. **Ativar/Desativar** (`bi-check-circle`/`bi-slash-circle`, neutro,
   ícone/label dependem de `u.isActive`) → `setPending({ kind: ..., user: u })`.
4. **Resetar senha** (`bi-key`, verde, desabilitado sem e-mail, com
   tooltip) → `setPending({ kind: "resetPassword", user: u })`.
5. **Excluir** (`bi-trash`, vermelho) → `setPending({ kind: "delete", user: u })`.

Todas as 4 últimas (exceto "ver") passam por `PendingAction` +
`ConfirmationModal` (`confirmCopy`/`confirmPending`, já genérico o
suficiente pros 4 tipos).

## 3. Escopo

1. `RowActions` é apagado. A coluna `{ key: "actions", ... }` de `columns`
   sai de `CrudColumn[]` (mesmo padrão das 8 telas da SPEC-79).
2. `CrudListPage` ganha `rowActions`/`onRowOpen` (mesma assinatura das
   demais telas):
   ```tsx
   rowActions={(u, ctl) => (
     <CrudRowActions
       show={ctl.show}
       position={ctl.position}
       onToggle={ctl.onToggle}
       onView={() => setModal({ mode: "view", user: u })}
       onEdit={() => setModal({ mode: "edit", user: u })}
       onDelete={() => setPending({ kind: "delete", user: u })}
       extraActions={[
         {
           key: "toggleActive",
           icon: u.isActive ? "bi-slash-circle" : "bi-check-circle",
           label: t(u.isActive ? "access.actions.deactivate" : "access.actions.activate"),
           onClick: () => setPending({ kind: u.isActive ? "deactivate" : "activate", user: u }),
         },
         {
           key: "resetPassword",
           icon: "bi-key",
           label: t("access.actions.resetPassword"),
           disabled: !u.profile.email,
           onClick: () => setPending({ kind: "resetPassword", user: u }),
         },
       ]}
     />
   )}
   onRowOpen={(u) => setModal({ mode: "view", user: u })}
   ```
   Ordem dos itens no menu segue a mesma convenção de `CrudRowActions`
   (`extraActions` entre "Ver" e "Editar", "Excluir" sempre por último) —
   ordem final: Ver, Ativar/Desativar, Resetar senha, Editar, Excluir.
   Difere levemente da ordem visual antiga (Ver, Editar, Ativar/
   Desativar, Resetar senha, Excluir) porque `extraActions` é injetado
   nesse ponto fixo do componente compartilhado (mesmo comportamento pra
   toda tela que já usa `extraActions`, ex. SPEC-65) — não decisão nova
   desta SPEC, é o contrato já existente do componente.
3. **Tooltip do "resetar senha" sem e-mail** (`title`, hoje só no botão
   pílula): `CrudRowExtraAction` não tem campo de tooltip — vira `disabled`
   simples (sem explicação inline). Se o usuário quiser preservar a
   explicação, é ajuste pontual (`CrudRowExtraAction.disabled` já existe;
   um tooltip exigiria estender o tipo, fora do escopo mínimo aqui).
4. Estilos órfãos (`styles.actionBtn`/`actionBtnNeutral`/`actionBtnSuccess`/
   `actionBtnDanger` em `index.module.css`) são removidos junto (nenhum
   outro uso no arquivo).

## 4. Fora do escopo

- Mudar qualquer regra de negócio (quem pode ativar/desativar/resetar
  senha/excluir) — só a apresentação muda.
- Adicionar tooltip a `CrudRowExtraAction` — ver nota do item 3 do escopo.
- Qualquer outra tela — só `admin/access`.

## 5. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Tabela/card de `admin/access` não mostram mais coluna/botões de ações fixos. |
| CA2 | Clicar num item revela o menu (Ver/Ativar-Desativar/Resetar senha/Editar/Excluir) na posição do clique, mesmo mecanismo da SPEC-79. |
| CA3 | Duplo-clique abre a visualização direto. |
| CA4 | As 5 ações continuam funcionando (mesmos callbacks/mutations de antes, incl. `resetPassword` desabilitado sem e-mail). |
| CA5 | `RowActions` e as classes `actionBtn*` órfãs são removidos (não só descontinuados). |
| CA6 | `bun run check` + `bun run lint` sem regressão. |

## 6. Riscos

- **R1** — Ordem dos itens no menu muda ligeiramente (ver item 2 do
  escopo) — mudança visual esperada, não um bug.

## 7. Notas de implementação

- `RowActions` (função local) apagada; a coluna `{ key: "actions", ... }`
  saiu de `columns` e o bloco `<div className="mt-2"><RowActions .../></div>`
  saiu de `renderCard`.
- `CrudListPage` ganhou `rowActions`/`onRowOpen`, exatamente o formato do
  escopo: `CrudRowActions` com `onView`/`onEdit`/`onDelete` +
  `extraActions` (`toggleActive`, `resetPassword`) — ordem final no menu:
  Ver, Ativar/Desativar, Resetar senha, Editar, Excluir (contrato fixo do
  componente, conforme já observado no item 2 do escopo).
- Tooltip do "resetar senha" sem e-mail virou só `disabled` (sem `title`),
  conforme item 3 do escopo — `CrudRowExtraAction` não tem campo de
  tooltip.
- `styles.actionBtn`/`actionBtnNeutral`/`actionBtnSuccess`/`actionBtnDanger`
  removidos de `index.module.css` (órfãos, único uso era o `RowActions`
  apagado).
- Import de `TranslationKey` também removido (só existia pra tipar o `t`
  recebido por `RowActions`).
- `bun run check`: 0 erros. `bun run lint`: 0 erros, 63 warnings (baseline
  pré-existente, sem regressão). `bun run build` (produção) concluído sem
  erro.
- CA2/CA3 (clique revela menu na posição do clique, duplo-clique abre
  view) não foram confirmados por screenshot — sem ferramenta de captura
  visual disponível no ambiente desta implementação; é o mesmo mecanismo
  controlado (`show`/`position`/`onToggle` de `CrudRowActions`,
  `onRowOpen` de `CrudListPage`) já em produção nas 8 telas da SPEC-79 e
  em `administrative/clients`, sem alteração nesses componentes
  compartilhados.
