# SPEC-72 — `ConfirmationModal`: ordem dos botões e alinhamento no rodapé

- **ID:** SPEC-72
- **Nome:** confirmation-modal-button-order
- **Status:** IMPLEMENTED
- **Autor:** portal-dev-agent (rascunho, 2026-09-16 — usuário apontou via
  screenshot: "trocar de lugar... cancelar à direita e confirmar à
  esquerda... deixar eles alinhados no canto do modal")
- **Área:** `src/components/ui/confirmation-modal.tsx`
- **Depende de:** nenhuma.

---

## 1. Objetivo

No `ConfirmationModal` (usado em toda tela CRUD do projeto pra
confirmação de exclusão e outras ações destrutivas/neutras):
1. Trocar a ordem dos botões — "Confirmar" à esquerda, "Cancelar" à
   direita (hoje é o inverso).
2. Alinhar o par de botões ao canto do modal (hoje fica centralizado).

## 2. Contexto (achado)

`confirmation-modal.tsx:48-63` — `Modal.Footer
className="justify-content-center gap-2 border-top-0 pt-0"` com dois
`<Button>`, nesta ordem no JSX: primeiro "Cancelar" (`outline-primary`),
depois "Confirmar"/`confirmLabel` (`primary`/`danger` conforme
`variant`). `justify-content-center` centraliza o par no rodapé. Nunca
alterado desde a criação (`e828c6e`) — confirmado que a mudança pedida
ainda não tinha sido feita.

Componente único, consumido por toda tela CRUD do projeto (delete,
deslacrar container, etc.) — a mudança é centralizada aqui, sem precisar
tocar cada consumidor.

## 3. Escopo

1. Inverter a ordem dos dois `<Button>` no JSX: "Confirmar" primeiro
   (esquerda), "Cancelar" depois (direita) — mesmas props/variant de
   cada botão, só a ordem no footer.
2. Trocar `justify-content-center` por `justify-content-end` no
   `Modal.Footer` — alinha o par ao canto direito do rodapé (padrão do
   Bootstrap `Modal.Footer`, mesmo alinhamento já usado nos outros
   modais do projeto, ex. `CrudRecordModal`).

## 4. Fora do escopo

- Qualquer outro modal do projeto (`CrudRecordModal`, modais custom de
  `Containers.tsx`/`Invoice.tsx`/etc.) — escopo restrito ao
  `ConfirmationModal` genérico, único citado no achado.
- Qualquer mudança de cor/variant dos botões.

## 5. Requisitos funcionais

- **RF1** — Botão "Confirmar" (`confirmLabel`) renderiza à esquerda do
  par, "Cancelar" (`cancelLabel`) à direita.
- **RF2** — Par de botões alinhado ao canto direito do rodapé do modal
  (`justify-content-end`), não mais centralizado.
- **RF3** — Nenhuma mudança de comportamento (`onConfirm`/`onCancel`,
  loading state, `variant` danger/primary).

## 6. Não funcionais

Nenhuma regressão em `bun run check`/`bun run lint`. Mudança isolada a 1
arquivo, efeito automático em todos os consumidores (componente
compartilhado).

## 7. Camada de dados

Não se aplica.

## 8. UI

- `src/components/ui/confirmation-modal.tsx`: reordena os 2 `<Button>` no
  JSX do `Modal.Footer`; troca a classe de alinhamento.

## 9. i18n

Nenhuma chave nova — `confirmLabel`/`cancelLabel` continuam props com
default em string fixa (mesmo padrão já existente, não introduzido por
esta SPEC).

## 10. Arquivos esperados

- `src/components/ui/confirmation-modal.tsx`

## 11. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | "Confirmar" aparece à esquerda de "Cancelar" no rodapé |
| CA2 | Par de botões alinhado ao canto (não mais centralizado) |
| CA3 | `bun run check` + `bun run lint` sem regressão |

## 12. Riscos

Nenhum — mudança de marcação isolada, sem lógica.

## Implementation Notes

- **Arquivo alterado:** `src/components/ui/confirmation-modal.tsx`.
- **RF1:** ordem dos `<Button>` invertida no JSX — botão de
  confirmar (`variant`/`handleConfirm`/loading) agora vem primeiro,
  botão "Cancelar" depois.
- **RF2:** `Modal.Footer` trocou `justify-content-center` por
  `justify-content-end`.
- **RF3:** nenhuma prop/handler/lógica de loading alterada.
- **Comandos executados:**
  - `bun run check` (tsc --noEmit) — **VERIFIED**, sem erros.
  - `bun run lint` — **VERIFIED**, baseline mantido (66/3/63).
- **Critérios de aceitação:**

  | # | Critério | Status |
  | --- | --- | --- |
  | CA1 | "Confirmar" à esquerda de "Cancelar" | PASS |
  | CA2 | Par alinhado ao canto | PASS |
  | CA3 | `bun run check` + `bun run lint` sem regressão | PASS |
