# SPEC-30 — Modal de Profile: 3 correções

- **ID:** SPEC-30
- **Nome:** profile-modal-fixes
- **Status:** PARTIALLY_IMPLEMENTED (2026-09-16) — RF2 e RF3 confirmados
  funcionando em tela real pelo usuário; **RF1 (avatar) incompleta**, ver
  §13 (Implementation Notes) — o fix de cache-bust foi implementado mas o
  usuário reportou que o avatar continua sem atualizar visualmente sem
  reload, sem detalhe adicional ainda sobre o que exatamente falhou.
  Retomar nesta SPEC (não abrir uma nova) na próxima sessão de frontend.
- **Status anterior:** WAITING_APPROVAL — decisão de §6.1 fechada com o
  usuário (2026-09-15).
- **Autor:** portal-dev-agent (rascunho); implementação parcial 2026-09-16
- **Área:** `src/components/profile/{profile-modal,detail-tab,address-tab,
  password-tab}.tsx`, `src/lib/avatar-url.ts` (novo),
  `src/layouts/AppShell/UserMenu.tsx`
- **Contexto do pedido:** item único do `TODO.md` já agrupando os 3
  problemas do modal de Profile — mantido como uma SPEC só.

---

## 1. Objetivo

Corrigir 3 problemas do `ProfileModal`:

1. Trocar avatar dá toast de sucesso, mas a imagem só atualiza depois de
   recarregar a página.
2. `Document`/`Phone`/`BirthDate` não podem travar como obrigatórios —
   precisam aceitar vazio (com ressalva: `Document` é `[Required]` de
   verdade no Core, fora do alcance desta SPEC — ver §4/§6).
3. Botão Salvar (dentro de cada aba) e botão Cancelar (no
   `Modal.Footer`) ficam em lugares diferentes — devem ficar lado a lado.

## 2. Contexto

### 2.1 Avatar não atualiza (achado da investigação)

`handleAvatarSelected` (`profile-modal.tsx:48-58`) já faz
`queryClient.setQueryData(profileMeQueryOptions().queryKey, updated)` —
mesma `queryKey` que `useUser()` (`src/hooks/useUser.ts`) consome via
`useQuery`, então o cache **é** atualizado e o componente **deveria**
re-renderizar com a nova URL. A causa mais provável do bug não é o cache
React Query, e sim o `<img src>` do avatar: se o Core devolve uma URL de
blob estável (mesmo caminho/nome de arquivo a cada upload, sem
cache-buster), o browser reaproveita a imagem em cache de disco e não
refaz o request, mesmo com o `src` "trocando" para o mesmo valor visual.
Isso é consistente com o sintoma relatado ("só atualiza depois de
recarregar a página" — o reload força bypass de cache em alguns
navegadores/condições, ou o SSR devolve uma URL já atualizada).

**Não foi possível confirmar 100% a causa sem reproduzir no browser** —
ver §7 NEEDS_DECISION menor.

### 2.2 Campos opcionais travando

`Phone` e `BirthDate` já são opcionais no Core e no schema Zod gerado
(`PostApiProfileMeBody.shape.profile.shape.{phone,birthDate}` —
confirmar `.nullish()`/`.optional()` no schema gerado ao implementar). Se
o formulário está de fato bloqueando vazio nesses dois campos, é um bug
só do front (schema remapeado errado em `detail-tab.tsx`, ou máscara de
input que não deixa limpar o campo — `InputPhone`/`InputDate` usam
`IMaskInput`). `Document`, por outro lado, é `[Required]` de verdade no
Core (`Profile.ViewModel.cs`, confirmado pelo usuário) — mudar isso é
território Core, fora do alcance desta SPEC.

### 2.3 Botões Salvar/Cancelar

Hoje: `Modal.Footer` (`profile-modal.tsx:135-139`) só tem o botão
Cancelar; cada aba (`DetailTab`, `AddressTab`, `PasswordTab`) tem seu
próprio botão Salvar dentro do `<Form>` da aba
(`detail-tab.tsx:110-117`). Isso significa 3 formulários independentes
dentro do mesmo modal, cada um com seu próprio submit — o pedido de "botão
lado a lado" implica decidir como isso convive com 3 forms distintos (ver
§6 NEEDS_DECISION).

## 3. Escopo

1. Investigar e corrigir o avatar não atualizando visualmente após upload
   (RF1).
2. Investigar e corrigir `Phone`/`BirthDate` não aceitando vazio, se
   confirmado que é bug do front (RF2). `Document` fica de fora por ora
   (§4) — o Core já decidiu torná-lo opcional (SPEC-27 do Core), mas
   ainda não implementado; quando `just map` refletir isso, `Document`
   aceitar vazio no `DetailTab` passa a ser trivial (mesmo padrão de RF2),
   não exige nova SPEC aqui.
3. Reposicionar Salvar/Cancelar para ficarem lado a lado (RF3, decisão de
   layout em §6).

## 4. Fora do escopo

- Tornar `Document` opcional no frontend — já decidido no Core (SPEC-27,
  `WAITING_APPROVAL`), mas ainda não implementado lá; esta SPEC não
  implementa nada de `Document` até `just map` refletir a mudança do
  Core.
- Qualquer mudança em `AddressTab`/`PasswordTab` além do reposicionamento
  de botão (RF3) — os bugs 1 e 2 são específicos de avatar e
  `DetailTab`.

## 5. Requisitos funcionais

- **RF1** — Após um upload de avatar bem-sucedido, a imagem exibida no
  `ProfileModal` (e em qualquer outro lugar que leia
  `user.profile.avatarFile.url`, ex. `UserMenu`) atualiza **sem** reload
  de página. Se a causa confirmada for URL estável de blob, a correção
  força um "cache-bust" client-side (ex.: sufixo `?v=<timestamp da
  resposta ou de `Date.now()` no momento do sucesso>` acrescentado à URL
  usada no `<img src>`, sem persistir esse sufixo no cache do React
  Query).
- **RF2** — `Phone` e `BirthDate` aceitam ficar vazios no submit de
  `DetailTab` sem erro de validação, refletindo que já são opcionais no
  Core. Se a investigação mostrar que o schema remapeado já está correto
  e o travamento vem de outro lugar (ex. máscara `IMaskInput` não
  deixando apagar), a correção é nesse componente (`InputPhone` ou
  `InputDate`, `layouts/Form/Fields/**`, regra 10).
- **RF3** — Botões Salvar e Cancelar aparecem lado a lado, na mesma
  barra, para a aba de Detalhes (que é a única com campos alterados
  diretamente ligados ao pedido do usuário — decisão de layout em §6
  cobre as outras abas).

## 6. `[NEEDS_DECISION]`

1. **Layout de Salvar/Cancelar com 3 forms independentes.** RESOLVIDA
   (2026-09-15): **"um Salvar por aba, ambos no rodapé"** — opção B
   adaptada: cada aba mantém seu próprio Salvar (chama o `handleSubmit`
   daquela aba), mas o botão fica posicionado no `Modal.Footer` junto do
   Cancelar (não dentro do `<Form>` da aba) — o Footer troca qual Salvar
   exibe conforme a aba ativa, sem precisar acoplar `Modal.Footer` a um
   `handleSubmit` único compartilhado entre as 3 abas.
2. **`Document` obrigatório no Core.** Território Core, já decidido
   (SPEC-27 do Core: opcional em todos os fluxos), mas ainda não
   implementado — não implementar nada aqui que dependa de `Document`
   aceitar vazio até `just map` refletir a mudança.

## 7. `[NEEDS_DECISION]` menor — reprodução do bug de avatar

A causa exata (§2.1) precisa ser confirmada no browser antes de escrever
o fix definitivo (cache-bust vs. outra causa, ex. SSR servindo uma cópia
antiga de `user` que sobrescreve o cache do client depois do
`setQueryData`). Não bloqueia a aprovação — registrado para constar nas
Implementation Notes.

## 8. Camada de dados

Nenhuma mudança de contrato — `usePatchApiProfileAvatar` e
`usePostApiProfileMe` já existem e já fazem `setQueryData` correto. A
correção do RF1 é 100% de apresentação (como a URL é usada no `<img>`),
não de cache de query.

## 9. UI

- `InputAvatar` (`layouts/Form/Fields/InputAvatar.tsx`) pode precisar de
  um parâmetro extra (ex. `cacheBustKey`) se a opção de cache-bust for a
  escolhida — mudança dentro de `layouts/Form/Fields`, respeitando a
  regra 10.
- Layout de Salvar/Cancelar conforme a decisão do §6.1.

## 10. i18n

Nenhuma chave nova esperada (todas as strings de Profile já existem em
`shell.profileModal.*`).

## 11. Arquivos esperados

- `src/components/profile/profile-modal.tsx`
- `src/components/profile/detail-tab.tsx`
- `src/layouts/Form/Fields/InputAvatar.tsx` (se RF1 exigir)
- `src/layouts/Form/Fields/InputPhone.tsx` / `InputDate.tsx` (se RF2
  confirmar bug de máscara)

## 12. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Após trocar o avatar, a nova imagem aparece no modal e no `UserMenu` sem reload |
| CA2 | Salvar `DetailTab` com `Phone`/`BirthDate` vazios não gera erro de validação e persiste o vazio |
| CA3 | Salvar e Cancelar aparecem lado a lado, conforme a opção decidida no §6.1 |
| CA4 | `Document` mantém o comportamento atual do Core no momento da implementação (obrigatório até o Core publicar SPEC-27; opcional depois de `just map` refletir) |
| CA5 | `bun run check` + `bun run lint` sem regressão |

## 13. Riscos

- **R1** — Se a causa do bug de avatar for do lado do Core (URL
  realmente idêntica sem nenhum diferencial), um cache-bust client-side
  resolve de qualquer forma (força o browser a rebuscar), então o risco é
  baixo mesmo sem confirmar a causa exata previamente.

## 13. Implementation Notes (2026-09-16)

**RF2 e RF3 — confirmados funcionando em tela real** (`admin/access` →
Novo usuário reaproveitando o mesmo `InputDate`; ProfileModal aberto via
`UserMenu` → Perfil), testados manualmente pelo usuário.

**Arquivos alterados:**
- `src/lib/avatar-url.ts` (novo) — `resolveAvatarUrl(avatarFile)`,
  adiciona `?v=<updatedAt>` na URL do avatar pra evitar cache de disco do
  browser servindo a imagem antiga (RF1, hipótese original da SPEC).
  Usado em `profile-modal.tsx` (`previewUrl` do `InputAvatar`) e
  `UserMenu.tsx` (`avatarUrl`).
- `src/components/profile/detail-tab.tsx` — resolver trocado pra
  `withEmptyStringsAsNull(detailSchema)` (helper local, mesmo padrão de
  `crud-record-modal.tsx`/`Containers.tsx`, regra 2 do AGENTS.md) — RF2:
  `Phone`/`BirthDate` agora aceitam ficar vazios no submit (o schema
  gerado já era `.nullish()`, o bug era `""` chegando no lugar de `null`
  na validação). `Document` continua de fora (§4, aguarda Core SPEC-27).
- `src/components/profile/{detail-tab,address-tab,password-tab}.tsx` —
  botão Salvar interno removido de cada `<Form>`; cada `<Form>` ganhou um
  `id` (`profile-{detail,address,password}-form`) e um prop
  `onSubmittingChange` que reporta `formState.isSubmitting` pro modal
  (RF3, decisão §6.1 — "um Salvar por aba, ambos no rodapé").
- `src/components/profile/profile-modal.tsx` — `Modal.Footer` ganhou o
  botão Salvar (`type="submit" form={FORM_ID_BY_TAB[tab]}`, usando o
  atributo HTML nativo `form` pra submeter um form fora da árvore do
  botão), com spinner/disabled vindo de `submittingByTab[tab]` (estado
  por aba, já que os 3 forms continuam montados simultaneamente,
  alternando só visibilidade via `d-none`).

**RF1 — incompleta, não fechar como resolvida.** O fix de cache-bust
(`resolveAvatarUrl`) foi implementado e o `bun run check`/`lint` passam,
mas o usuário testou em tela real e reportou que o avatar **continua**
sem atualizar visualmente sem reload — sem detalhe adicional ainda sobre
em que ponto exatamente falha (se o cache-bust não teve efeito, se o
`previewUrl` não está de fato mudando, se é outro componente lendo o
avatar de outro lugar, etc.). **Próximos passos pra quem retomar:**
1. Confirmar no DevTools (aba Network) se a URL do `<img>` realmente
   ganha o sufixo `?v=...` depois do upload, e se muda entre uploads
   sucessivos.
2. Se a URL muda mas a imagem ainda não atualiza, o problema não é cache
   de disco do browser — investigar se `previewUrl`/`user.profile.
   avatarFile` de fato chega atualizado no componente (pode ser cache do
   React Query não invalidando, ou o backend devolvendo dado desatualizado
   na resposta do `PATCH avatar`).
3. ~~Verificar se existe algum outro consumidor~~ — já checado
   (2026-09-16): grep por `avatarFile` em `src/` confirma que
   `ProfileModal`/`UserMenu` são os únicos 2 lugares que leem
   `avatarFile.url` fora de `src/api/generated`. Não é essa a causa.

**Comandos executados e resultado:**
- `bun run check` (`tsc --noEmit`) — PASS.
- `bun run lint` — 66/3 (mesma baseline pré-existente de
  `session.server.ts`, sem regressão nos arquivos tocados).
