# SPEC-30 — Modal de Profile: 3 correções

- **ID:** SPEC-30
- **Nome:** profile-modal-fixes
- **Status:** DRAFT
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/components/profile/{profile-modal,detail-tab}.tsx`,
  `src/layouts/Form/Fields/InputAvatar.tsx`
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
   confirmado que é bug do front (RF2). `Document` fica de fora (§4).
3. Reposicionar Salvar/Cancelar para ficarem lado a lado (RF3, decisão de
   layout em §6).

## 4. Fora do escopo

- Tornar `Document` opcional — é `[Required]` no Core
  (`Profile.ViewModel.cs`); mudar isso é `[NEEDS_DECISION]` de território
  Core, não resolvido aqui (ver §6).
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

1. **Layout de Salvar/Cancelar com 3 forms independentes.** Opções:
   - **A)** Mover o botão Salvar de cada aba para o `Modal.Footer`,
     ficando ao lado do Cancelar — o Footer passa a chamar
     `methods.handleSubmit` da aba ativa (precisa expor o `handleSubmit`
     de cada aba para o componente pai, ex. via `ref`/callback).
   - **B)** Manter 3 `<Form>` independentes, mas mover o Cancelar para
     dentro de cada aba, ao lado do respectivo Salvar (Footer do Modal
     fica só com um "Fechar" genérico, ou desaparece).
   - Impacto: A é mais próximo do pedido literal ("um do lado do outro",
     citando o Footer como referência de posição), mas exige acoplar o
     `Modal.Footer` ao estado da aba ativa. B é mais simples de
     implementar, mas muda a semântica do Cancelar (deixa de ser "fechar
     o modal" pra virar "cancelar mudanças desta aba" + precisa de um
     "Fechar" separado). **Aguardando decisão do usuário antes da
     aprovação.**
2. **`Document` obrigatório no Core.** Confirmado como território Core
   (`Profile.ViewModel.cs`, `[Required]`). Não é decisão desta SPEC —
   registrar como pendência separada (ver `TODO.md`, nota "aguardando
   Core") e não implementar nada aqui que dependa de `Document` aceitar
   vazio.

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
| CA4 | `Document` continua obrigatório (nenhuma regressão de território Core) |
| CA5 | `bun run check` + `bun run lint` sem regressão |

## 13. Riscos

- **R1** — Se a causa do bug de avatar for do lado do Core (URL
  realmente idêntica sem nenhum diferencial), um cache-bust client-side
  resolve de qualquer forma (força o browser a rebuscar), então o risco é
  baixo mesmo sem confirmar a causa exata previamente.
