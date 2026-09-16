# SPEC-51 — Botão "X" em todo modal, além do Cancelar

- **ID:** SPEC-51
- **Nome:** modal-close-button
- **Status:** WAITING_APPROVAL — sem `[NEEDS_DECISION]` de escopo, mas
  reverte uma decisão de design anterior explícita (ver §2) — pedido
  direto do usuário conta como a confirmação exigida pela regra "decisão
  já tomada, alguém pede pra mudar → PARE e confirme antes de
  sobrescrever".
- **Autor:** claude (pedido do usuário, 2026-09-16)
- **Área:** `src/components/ui/modal.tsx` (único arquivo — ver §2).
- **Depende de:** nenhuma.

---

## 1. Objetivo

Adicionar o "X" de fechar no cabeçalho de todo modal do NewPortal, além
do(s) botão(ões) já existentes no rodapé (Cancelar/Fechar).

## 2. Contexto — decisão anterior sendo revertida

`src/components/ui/modal.tsx` documenta explicitamente, no comentário do
wrapper:

> "`Modal.Header` nunca leva `closeButton` — o "X" some, a única saída é
> o botão do rodapé."

Isso foi decisão de design deliberada (não bug), aplicada globalmente
porque **todo** consumidor do projeto importa o wrapper `Modal` de
`@/components/ui/modal` em vez do `Modal` cru do `react-bootstrap`
(confirmado: `grep` por `import { Modal } from "react-bootstrap"` só
acha o próprio arquivo do wrapper — nenhum outro lugar do código
bypassa). Por isso a mudança é de **um arquivo só**: adicionar o "X" no
componente `Modal.Header` do wrapper propaga pra todos os ~20 modais do
projeto automaticamente, sem tocar em cada consumidor.

Todos os ~20 usos confirmados já passam `onHide` corretamente pro
`<Modal>` (`grep` confirma isso em `crud-record-modal.tsx`,
`profile-modal.tsx`, `confirmation-modal.tsx`, `file-preview-modal.tsx`,
todas as abas de Operação, etc.) — o "X" do Bootstrap já chama `onHide`
automaticamente, sem precisar de prop extra em lugar nenhum.

## 3. Escopo

`src/components/ui/modal.tsx`: em vez de `Modal.Header =
BootstrapModal.Header` (reexport direto), criar um componente wrapper
que aplica `closeButton` por padrão:

```tsx
function Header({ closeButton = true, ...props }: BootstrapModal.HeaderProps) {
  return <BootstrapModal.Header closeButton={closeButton} {...props} />;
}
Modal.Header = Header;
```

`closeButton` continua sobrescrevível (`<Modal.Header closeButton={false}>`)
pro raro caso que precisar do comportamento antigo — nenhum consumidor
precisa disso hoje, é só a válvula de escape.

`backdrop="static"`/`keyboard={false}` (clique fora / ESC não fecham)
**continuam como estão** — não fazem parte deste pedido, o "X" é uma
ação explícita de clique, coerente com a filosofia already documentada
de "só ação explícita fecha o modal".

## 4. Fora do escopo

- `src/layouts/Windows/Confirmation.tsx` (`WindowsConfirmation`) — não
  tem `Modal.Header` nenhum hoje (só `Modal.Body`), então não ganha "X"
  automaticamente com este fix. **Achado à parte:** este componente não
  tem nenhum consumidor no código (`grep` não encontra import fora do
  próprio arquivo) — parece código morto. Não mexo nele nesta SPEC (fora
  do pedido do usuário); se for pra reativar/consertar, é decisão
  separada.
- Qualquer mudança em `backdrop`/`keyboard` (clique fora/ESC) — não foi
  pedido, mantém o comportamento atual.

## 5. Requisitos funcionais

- **RF1** — Todo `<Modal.Header>` do projeto mostra o "X" no canto,
  clicável, fechando o modal (chama o `onHide` já passado ao `<Modal>`
  pai).
- **RF2** — Nenhuma mudança visual/funcional além do "X" aparecer —
  título, botões de rodapé, comportamento de `backdrop`/`keyboard`
  continuam idênticos.

## 6. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | `ConfirmationModal`, `CrudRecordModal`, `ProfileModal`, `FilePreviewModal` e as ~15 outras instâncias em `components/operations/tabs/**` mostram "X" no header. |
| CA2 | Clicar no "X" fecha o modal (mesmo efeito do botão Cancelar/Fechar do rodapé). |
| CA3 | Clique fora do modal (backdrop) e ESC continuam sem fechar (regressão do comportamento existente). |
| CA4 | `bun run check` + `bun run lint` sem regressão. |

## 7. Riscos

Nenhum — mudança de um arquivo, comportamento aditivo (só adiciona uma
forma a mais de fechar, não remove nenhuma existente).
