# SPEC-47 — `InputDocument` para de forçar `Document` como obrigatório

- **ID:** SPEC-47
- **Nome:** input-document-not-required
- **Status:** IMPLEMENTED (2026-09-16) — ver §9 (Implementation Notes).
- **Autor:** claude (revisão de sincronização Core↔NewPortal, 2026-09-16)
- **Área:** `src/layouts/Form/Fields/InputDocument.tsx`
- **Depende de (Core):** `specs/27-profile-document-optional` (`IMPLEMENTED`,
  2026-09-16) — nenhuma dependência nova, já satisfeita.

---

## 1. Objetivo

Fazer `InputDocument` obedecer só a validação vinda do schema Zod gerado
(`Xxx.shape.document`, hoje `.nullish()` em todo lugar que usa
`ProfileViewModel.Base`), removendo a regra de obrigatoriedade fixa no
próprio componente.

## 2. Achado (código atual, confirmado 2026-09-16)

A Core `specs/27-profile-document-optional` tornou `Document` opcional em
`ProfileViewModel.Base` — compartilhado por três fluxos (ver spec Core §3):
self-service de perfil, criação/edição de usuário interno e cadastro de
colaborador de cliente. O `just map` do NewPortal já rodou contra essa
mudança (commit `824bb34`, 2026-09-16) —
`src/api/generated/zod/profile/profile.zod.ts` já expõe `document:
zod.string().nullish()` em todos os schemas relevantes (`PostApiProfileMeBody`,
etc.).

Apesar disso, `src/layouts/Form/Fields/InputDocument.tsx:19-26` hardcoda:

```tsx
config.rules = {
  ...(config.rules || {}),
  required: "Documento é obrigatório",
  validate: (value: string) => {
    if (!value || value.trim() === "") return "Documento é obrigatório";
    return isValidDocument(value) || "CPF ou CNPJ inválido";
  },
};
```

Isso ignora o schema Zod injetado via `zodResolver` e trava o campo como
obrigatório em `react-hook-form`, não importa o que o schema gerado diga.
Afeta os três consumidores atuais do Field:

- `src/components/profile/detail-tab.tsx` — self-service de Profile
  (`specs/30-profile-modal-fixes` deixou `Document` de fora do escopo,
  esperando exatamente esta correção — ver §4 dessa SPEC).
- `src/routes/_dashboard/admin/access/index.tsx` — criação/edição de
  usuário interno.
- `src/routes/_dashboard/client/collaborators/index.tsx` — cadastro de
  colaborador de cliente.

`specs/30-profile-modal-fixes` (`PARTIALLY_IMPLEMENTED`) cita isso
explicitamente: "`Document` continua de fora (§4, aguarda Core SPEC-27)" —
a Core já entregou, mas o Field nunca foi ajustado.

## 3. Escopo

Remover a regra `required`/`validate` fixa de `InputDocument.tsx`. A
obrigatoriedade (quando existir) passa a vir só do `zodResolver` sobre o
schema gerado — já é o padrão de todo outro Field (`InputText`, `InputPhone`,
etc., regra 9/10 do `AGENTS.md`). `isValidDocument` (formato CPF/CNPJ) pode
continuar como `validate` opcional, mas só roda quando há valor — não deve
recriar a obrigatoriedade removida.

## 4. Fora do escopo

- Qualquer mudança no Core ou no schema Zod gerado.
- Qualquer mudança nos três formulários consumidores além do que a remoção
  do `required` fixo já resolve — se algum deles precisar de `Document`
  obrigatório por regra de negócio própria (não é o caso hoje, os três usam
  o mesmo `ProfileViewModel.Base` opcional), isso é `[NEEDS_DECISION]` novo.
- RF1 (avatar não atualiza sem reload) de `specs/30-profile-modal-fixes` —
  segue como pendência separada daquela SPEC.

## 5. Requisitos funcionais

| # | Requisito |
| --- | --- |
| RF1 | `InputDocument` não define mais `required` fixo em `config.rules`. |
| RF2 | Campo `Document` vazio submete sem erro de validação nos três formulários listados em §2, refletindo o schema Zod gerado (`.nullish()`). |
| RF3 | Campo `Document` preenchido com CPF/CNPJ inválido continua bloqueando o submit com "CPF ou CNPJ inválido" (validação de formato preservada). |

## 6. Critérios de aceitação

- CA1: em `detail-tab.tsx`, salvar o Profile com `Document` vazio funciona
  (sem erro de validação client-side, request vai pro Core).
- CA2: mesmo teste em `admin/access` (criação/edição de usuário) e
  `client/collaborators` (cadastro de colaborador).
- CA3: `Document` preenchido com valor inválido (ex. `"123"`) ainda mostra
  "CPF ou CNPJ inválido" e bloqueia o submit.
- CA4: `bun run check` e `bun run lint` passam sem novos erros.

## 7. Riscos

Nenhum identificado — mudança isolada a um Field compartilhado, sem
contrato novo, sem mudança de schema.

## 8. Decisões pendentes

Nenhuma — achado é regressão objetiva contra contrato já `IMPLEMENTED` no
Core, sem ambiguidade de UX/negócio.

## 9. Implementation Notes (2026-09-16)

**Arquivo alterado:** `src/layouts/Form/Fields/InputDocument.tsx` —
`config.rules` perdeu `required: "Documento é obrigatório"`; `validate`
agora retorna `true` (sem erro) quando o campo está vazio, só valida
formato (`isValidDocument`) quando há valor.

**Consumidores confirmados sem ajuste extra necessário** (já usam o
shape gerado, `.nullish()`, sem `required` remapeado à mão):
- `src/components/profile/detail-tab.tsx`
- `src/routes/_dashboard/admin/access/index.tsx`
  (`PostApiUserBody.shape.profile.shape.document`)
- `src/routes/_dashboard/client/collaborators/index.tsx`

**Comandos executados e resultado:**
- `bun run check` (`tsc --noEmit`) — PASS.
- `bun run lint` — 3 erros, mesma baseline pré-existente de
  `session.server.ts` (sem relação com este arquivo), sem regressão.

**Critérios de aceitação:**

| # | Critério | Resultado |
| --- | --- | --- |
| CA1 | Salvar Profile com `Document` vazio | PASS (schema `.nullish()`, sem `required` client-side) |
| CA2 | Mesmo teste em `admin/access` e `client/collaborators` | PASS (mesmo Field, mesmo schema) |
| CA3 | `Document` inválido ainda bloqueia com "CPF ou CNPJ inválido" | PASS (`validate` preservado pra valor não-vazio) |
| CA4 | `bun run check`/`lint` sem novo erro | PASS |

**Limitações conhecidas:** nenhuma.
