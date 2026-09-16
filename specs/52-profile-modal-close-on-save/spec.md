# SPEC-52 — Modal de Profile fecha sozinho ao salvar

- **ID:** SPEC-52
- **Nome:** profile-modal-close-on-save
- **Status:** IMPLEMENTED — decisão do §6 confirmada pelo usuário (avatar
  fora do escopo).
- **Autor:** claude (pedido do usuário, 2026-09-16)
- **Área:** `src/components/profile/{detail-tab,address-tab,
password-tab,profile-modal}.tsx`.
- **Depende de:** nenhuma.

---

## 1. Objetivo

Hoje, salvar qualquer aba do `ProfileModal` (Detalhes/Endereço/Senha)
mostra um toast de sucesso mas **não fecha o modal** — usuário pediu que
fechar aconteça automaticamente ao salvar com sucesso.

## 2. Contexto — comportamento atual (confirmado em código)

As 3 abas (`detail-tab.tsx`, `address-tab.tsx`, `password-tab.tsx`) têm
o mesmo formato de `onSubmit`:

```tsx
const onSubmit = methods.handleSubmit(async (data) => {
  try {
    await mutation.mutateAsync({ data });
    // ...invalidação de cache / reset de campo, específico de cada aba...
    toast.success(t("shell.profileModal.saved"));
  } catch {
    toast.error(t("shell.profileModal.saveError"));
  }
});
```

Nenhuma chama algo equivalente a fechar o modal — o `ProfileModal` só
recebe `onClose` como prop pro botão Cancelar do rodapé
(`profile-modal.tsx`), não repassa pra dentro das abas hoje.

## 3. Escopo

1. Cada uma das 3 abas ganha um prop novo `onSaved?: () => void`,
   chamado logo depois de `toast.success(...)` (dentro do `try`, só no
   caminho de sucesso — erro continua sem fechar, RF2).
2. `profile-modal.tsx` passa `onSaved={onClose}` pras 3 abas.
3. `PasswordTab` mantém o `methods.reset(...)` que já faz (limpa os
   campos de senha) antes de chamar `onSaved` — sem mudança nesse
   comportamento, só adiciona o fechamento em seguida.

## 4. Fora do escopo

- Upload de avatar (`handleAvatarSelected` em `profile-modal.tsx`) —
  ver §6, decisão assumida de **não** fechar o modal nesse caso.
- Qualquer mudança em `SPEC-51` (botão "X" no header) — specs
  independentes, ambas mexem em modal mas em arquivos diferentes.

## 5. Requisitos funcionais

- **RF1** — Salvar com sucesso em qualquer uma das 3 abas fecha o
  `ProfileModal` automaticamente, logo após o toast de sucesso.
- **RF2** — Salvar com erro (`catch`) **não** fecha o modal — usuário
  precisa ver o erro e poder tentar de novo sem reabrir o modal do
  zero.

## 6. `[NEEDS_DECISION]` menor — avatar entra no escopo?

Troca de avatar (`handleAvatarSelected`) já tem seu próprio fluxo — não
usa o botão Salvar do rodapé, dispara assim que um arquivo é escolhido,
com toast de sucesso próprio. Assumi (INFERRED, não confirmado) que
"ao salvar" no pedido do usuário se refere ao botão Salvar do rodapé
(as 3 abas de formulário), **não** ao upload de avatar — trocar o
avatar e o modal fechar sozinho em seguida pareceria um comportamento
estranho (usuário pode querer trocar avatar E editar outro campo antes
de fechar). Se essa leitura estiver errada, avisar antes de aprovar —
adicionar o avatar ao escopo é trivial (mesmo padrão, um `onClose()`
extra em `handleAvatarSelected`).

## 7. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Editar nome/e-mail em Detalhes e salvar fecha o modal. |
| CA2 | Editar endereço e salvar fecha o modal. |
| CA3 | Trocar senha (com sucesso) fecha o modal. |
| CA4 | Erro de validação/backend em qualquer aba mantém o modal aberto, com o toast de erro visível. |
| CA5 | `bun run check` + `bun run lint` sem regressão. |

## 8. Riscos

Nenhum — mudança aditiva e reversível, 4 arquivos, sem mudança de
contrato/dado.

## Implementation Notes

- **Arquivos alterados:**
  - `src/components/profile/detail-tab.tsx` — prop `onSaved?: () => void`,
    chamado após `toast.success(...)` no caminho de sucesso.
  - `src/components/profile/address-tab.tsx` — idem.
  - `src/components/profile/password-tab.tsx` — idem, depois do
    `methods.reset(...)` já existente.
  - `src/components/profile/profile-modal.tsx` — passa `onSaved={onClose}`
    pras 3 abas. Upload de avatar (`handleAvatarSelected`) não foi tocado.
- **Comandos executados:**
  - `bun run check` — VERIFIED (sem erro).
  - `bun run lint` — 66 problems / 3 errors / 63 warnings, todos em
    `src/lib/session.server.ts` e `src/lib/ui-prefs.tsx` (baseline
    pré-existente, alheio a esta mudança) — sem regressão.
- **Critérios de aceitação:**

| # | Critério | Resultado |
| --- | --- | --- |
| CA1 | Editar nome/e-mail em Detalhes e salvar fecha o modal. | PASS (código: `onSaved` chamado após sucesso) |
| CA2 | Editar endereço e salvar fecha o modal. | PASS |
| CA3 | Trocar senha (com sucesso) fecha o modal. | PASS |
| CA4 | Erro de validação/backend em qualquer aba mantém o modal aberto, com o toast de erro visível. | PASS (`onSaved` só é chamado dentro do `try`, no caminho de sucesso; `catch` não muda) |
| CA5 | `bun run check` + `bun run lint` sem regressão. | PASS |

- **Decisões tomadas durante a implementação:** nenhuma além da já
  confirmada no §6 (avatar fora do escopo).
- **Limitações conhecidas:** nenhuma.
