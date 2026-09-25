# SPEC-101 — Avatar (logo) do Cliente

- **ID:** SPEC-101
- **Nome:** client-avatar
- **Status:** IMPLEMENTED (2026-09-25) — mergeada em `main` a pedido do
  usuário ("faz o merge das duas branches na main"). Depende do Core
  SPEC-57 (`feat/57-client-avatar`) estar em `main` do Core. Teste local
  parcial: upload/remoção não validados localmente (Core local sem SAS do
  Azure Blob → 401 `NoAuthenticationInformation`, usuário optou por não
  mexer em config) — validar em dev.
- **Autor:** claude (pedido do usuário, 2026-09-25)
- **Área:**
  - `src/routes/_dashboard/_internal/administrative/clients/index.tsx`
    (cadastro — interno);
  - `src/routes/_dashboard/client/index.tsx` (área do cliente — externo).
- **Depende de (Core):** SPEC-57 — `ClientDTO.avatarFile`,
  `PATCH`/`DELETE /api/client/{id}/avatar`, `GET /api/client/me`.

---

## 1. Objetivo

Cliente passa a ter foto de avatar/logo:

- **Admin > Clientes:** interno sobe, troca e remove a foto no modal de
  cadastro; o card da listagem mostra a foto no lugar das iniciais.
- **Área do cliente (`/client`):** colaborador externo vê a logo do próprio
  cliente no topo da home e pode trocá-la/removê-la (sujeito à regra de
  permissão do Core — ver §5).

## 2. Contexto — estado atual

- **Core não tem avatar de Client** (levantamento completo na SPEC-57 §2):
  `ClientDTO`/`ClientDetailDTO` sem campo de imagem; nenhum endpoint de
  upload; `/api/client/*` é `RequireInternal`, então o externo nem lê o
  próprio cliente.
- Front já tem toda a peça de UI:
  - `InputAvatar` (`src/layouts/Form/Fields/InputAvatar.tsx`) — preview,
    iniciais, overlay trocar/selecionar, `onFileSelected`, `onRemove`,
    `maxSizeBytes` (regra 10: nada de `<input type="file">` fora dele).
  - Padrão de upload imediato multipart em
    `src/components/profile/profile-modal.tsx`
    (`usePatchApiProfileAvatar` → `mutateAsync({ data: { avatarFile } })`
    → toast → invalida cache).
  - `resolveAvatarUrl` (`src/lib/avatar-url.ts`) — cache-bust por
    `updatedAt` (SPEC-30).
- Card da listagem de clientes (`clients/index.tsx` ~l.319) mostra
  `initials(c.fullName)` em `.avatar` do `index.module.css`.
- `clientId` do externo já vem do `beforeLoad` de `/_dashboard/client`
  (`getClientIdFn`, SPEC-09).

## 3. Escopo

### 3.1 Requisitos funcionais

- **RF1 — Contrato.** Após o Core SPEC-57 no ar: `just map`. Diff esperado
  em `src/api/generated/**`: `ClientDTO.avatarFile`,
  `usePatchApiClientIdAvatar`, `useDeleteApiClientIdAvatar`,
  `useGetApiClientMe`. Nenhum schema Zod escrito à mão (regra 2).
- **RF2 — Card da listagem (admin).** `.avatar` do card renderiza
  `<img src={resolveAvatarUrl(c.avatarFile)}>` (object-fit cover, mesmo
  tamanho/raio atuais) quando houver; senão mantém as iniciais.
- **RF3 — Modal de cadastro (admin), modo editar/visualizar.** Bloco de
  avatar no topo do `CrudRecordModal` com `InputAvatar`
  (`initials` = iniciais do `fullName`, `previewUrl` =
  `resolveAvatarUrl(record.avatarFile)`). Upload **imediato** ao selecionar
  (mesmo padrão do `profile-modal`), independente do "Salvar" do form de
  dados. Em modo visualizar: só leitura (sem overlay).
- **RF4 — Remover (admin).** `onRemove` do `InputAvatar` só aparece quando
  há avatar salvo; abre `ConfirmationModal` e chama
  `DELETE /api/client/{id}/avatar`.
- **RF5 — Modo criar (admin).** Cliente ainda sem `id` → arquivo fica
  pendente no `InputAvatar` e é enviado logo após o `POST` retornar o
  cliente criado. Falha no upload **não** desfaz o cadastro: toast de
  erro específico ("Cliente criado, mas a foto não foi enviada").
- **RF6 — Área do cliente.** Home `/client` ganha cabeçalho com
  `InputAvatar` + nome do cliente, dados via `useGetApiClientMe` (via
  `useSsrSafeQuery`, com o gate de `mounted` da SPEC-10). Upload/remoção
  imediatos em `/api/client/{clientId}/avatar`. Se o Core responder 403
  (externo sem permissão, ver §5), o `InputAvatar` fica só leitura.
- **RF7 — Validação client-side.** `maxSizeBytes` = 5 MB e
  `accept="image/jpeg,image/png,image/webp"` (mesmos limites do Core);
  rejeição com toast pela prop `maxSizeMessage`.
- **RF8 — Cache.** Após upload/remoção: invalidar `["/api/client"]`
  (listagem), `["/api/client/{id}"]` e `["/api/client/me"]` — mesma
  queryKey dos hooks gerados.
- **RF9 — i18n.** Chaves novas em `pt-BR` (fonte) + `en`/`es`/`zh`, no
  namespace das telas (`administrative` / `client`): rótulo, trocar,
  selecionar, remover, confirmação de remoção, sucesso, erro, tamanho
  excedido, "criado sem foto".

### 3.2 Fora de escopo

- Crop/recorte de imagem.
- Mostrar a logo do cliente em outros lugares (topbar, operações,
  relatório final) — SPEC futura se pedido.

## 4. Regras do projeto que se aplicam

- Regra 2: nada de Zod à mão — tipos/schemas só do `just map`.
- Regra 10: input de arquivo só via `InputAvatar`.
- Regra 8: Bootstrap; cor só por token (`--bs-*`), nada hard-coded.
- Regra 7: comentários em PT-BR.
- Gate: `bun run check` + `bun run lint`.

## 5. Decisões em aberto

- **[NEEDS_DECISION] D1** — Externo: qualquer colaborador troca a logo ou
  só `isAdmin`? Decisão mora no Core (SPEC-57 §3.4); o front só reage ao
  403 (RF6).
- **D2** — Upload imediato vs. junto do "Salvar": proposta **imediato**
  (consistência com o avatar do perfil). Confirmar na revisão.

## 6. Critérios de aceite

- [ ] `just map` rodado com Core SPEC-57; diff do generated commitado.
- [ ] Card mostra foto quando existe e iniciais quando não.
- [ ] Editar cliente: selecionar foto → sobe na hora, card e modal
      atualizam sem reload (cache-bust ok).
- [ ] Remover com confirmação → volta às iniciais.
- [ ] Criar cliente com foto → cliente criado e foto enviada; falha no
      upload mostra toast específico e mantém o cliente.
- [ ] `/client` mostra logo + nome; externo com permissão troca/remove;
      sem permissão vê só leitura.
- [ ] Arquivo > 5 MB ou tipo inválido barrado no front com toast.
- [ ] 4 locales com as mesmas chaves.
- [ ] `bun run check` e `bun run lint` limpos.

## 7. Implementação (2026-09-25)

Core SPEC-57 ainda não está no ar → sem `just map`. Para não travar a UI:

- **`src/lib/queries/client-avatar.ts` (TEMPORÁRIO)** — `patchClientAvatar`,
  `deleteClientAvatar`, `clientMeQueryOptions` via `apiRequest` do
  `mutator.ts` (mesmo transporte e mesmas queryKeys dos hooks gerados) +
  `clientAvatarOf()` pra ler `avatarFile` de um `ClientDTO` que ainda não
  tem o campo no tipo. Nenhum schema Zod criado (regra 2).
- `src/components/clients/client-avatar-field.tsx` — bloco reutilizado
  pelas duas telas (upload/remoção imediatos, confirmação, 403 → só
  leitura, modo pendente pra criar). Utilitários em `client-avatar-utils.ts`.
- `InputAvatar` ganhou `accept` e `readOnly`; `CrudRecordModal` ganhou
  `headerContent`.
- i18n: `clientAvatar.*` no `common.json` dos 4 locales.

**Ao chegar o Core (RF1):** `just map` → trocar o adaptador pelos hooks
gerados (`usePatchApiClientIdAvatar`, `useDeleteApiClientIdAvatar`,
`getGetApiClientMeQueryOptions`), trocar `clientAvatarOf(x)` por
`x.avatarFile`, apagar `client-avatar.ts` (manter só
`invalidateClientQueries` se ainda fizer sentido) e conferir se o nome/
shape das rotas bate com o que o backend entregou.

**RF1 concluído (2026-09-25):** `just map` contra o Core local (`84ff8c6`).
Adaptador removido — telas usam `usePatchApiClientIdAvatar`,
`useDeleteApiClientIdAvatar`, `patchApiClientIdAvatar` (upload pós-criação)
e `getGetApiClientMeQueryOptions`, e leem `avatarFile` direto do DTO.
`src/lib/queries/client-avatar.ts` ficou só com `invalidateClientQueries`.

