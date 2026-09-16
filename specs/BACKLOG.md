# Backlog técnico — NewPortal

Registro vivo de dívida técnica e decisões conscientes de "não fazer agora"
— mesmo padrão já usado em `warren/Core/specs/BACKLOG.md`. Consultar antes
de mexer nas áreas citadas. Itens saem daqui quando resolvidos.

Origem: limpeza de `specs/` em 2026-09-15 — a maior parte das ~37 specs já
`IMPLEMENTED` (SPEC-00 a SPEC-26, `share-01`/`share-02`, e o índice
`07-operacoes`) foi removida da pasta pra reduzir acúmulo, mesmo padrão já
usado no `warren/Core`. Conteúdo completo recuperável via `git log --
specs/` se precisar revisitar. Continuam em `specs/` só as duas com
trabalho real pendente: `21-operations-responsible-role-filter` (Fase 2
`BLOCKED`) e `27-delete-user-unexpected-logout-audit` (Fase 2 `BLOCKED`,
aguardando reprodução do usuário com DevTools). Os itens de dívida que as
specs removidas deixaram em aberto foram migrados pra cá antes da
remoção — nada foi perdido de fato.

**Nota:** `AGENTS.md` (raiz) já tem uma seção própria "Pendências
conhecidas" com o mesmo espírito — este arquivo não a substitui, só cobre
achados específicos de spec que não cabiam lá. Ver os dois antes de mexer
em área correlata.

---

## B1 — `admin-roles.ts`: descrição de cada perfil é placeholder
**Onde:** `src/data/admin-roles.ts`.

Nome/valor de cada papel (`Agent`/`Supervisor`/`Laboratory`) já são reais
(`resolveEnumOptionName`/D1 da SPEC-03), mas `description` é o mesmo
placeholder genérico (`PENDING_DESCRIPTION`) pros 3 — nunca preenchido com
o texto real do que cada perfil acessa no NewPortal. Decisão consciente do
usuário na época: fechar `IMPLEMENTED` com esse item em aberto,
registrado pra não ser esquecido nem redescoberto como bug.

**Quando resolver:** quando o texto real de cada perfil estiver
disponível (não bloqueia nada até lá).
**Como:** editar `PENDING_DESCRIPTION` pra cada um dos 3 registros em
`admin-roles.ts` — mudança de dado estático, sem SPEC nova necessária. Se
o volume de manutenção desse arquivo crescer, reconsiderar D1 (hoje
"estática mantida à mão").

---

## B2 — `AddressGroup`: labels hard-coded em PT, fora do sistema de i18n
**Onde:** `src/layouts/Form/Fields/AddressGroup.tsx` (labels "CEP",
"Logradouro", "Estado", "País" direto em string, sem `useT()`).

Débito pré-existente à SPEC-24 (endereço internacional) — na época a
recomendação foi manter como está ("migrar i18n de `AddressGroup` é
escopo maior que 'adicionar um dropdown'"), não uma decisão definitiva de
nunca fazer.

**Quando resolver:** se o NewPortal precisar rodar de fato num locale
diferente de pt-BR em produção (hoje `en`/`es`/`zh` existem no dicionário
geral, mas esse componente específico ainda não usa nenhum).
**Como:** adicionar as chaves em `common.json` (mesmo namespace de
`AddressGroup`/`profileModal.*`) nos 4 locales e trocar as strings fixas
por `useT()` — mudança local, sem SPEC própria necessária a princípio.

---

## B3 — Débito conhecido não repetido aqui: `useSsrSafeQuery` sem gate de `mounted` em 3 telas
**Onde:** `administrative/registry/terminal`, `administrative/clients`,
`client/collaborators`.

Já documentado em `AGENTS.md` (raiz) → "Pendências conhecidas" (achado da
SPEC-10, reavaliação 2026-09-14) — risco conhecido, não confirmado como
bug reproduzido, não bloqueia nada. Ver lá pro detalhe completo; este
item existe só como ponteiro, pra quem olhar primeiro este arquivo não
perder o achado.
