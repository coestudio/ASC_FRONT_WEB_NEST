# SPEC-18 — CRUD: primitivos compartilhados (mutations, row actions, mounted gate)

- **ID:** SPEC-18
- **Nome:** crud-componentization
- **Status:** IMPLEMENTED
- **Autor:** portal-dev-agent (rascunho + implementação, `APROVAR SPEC-18`
  recebido do usuário)
- **Área:** `src/hooks/**`, `src/components/crud/**` (novo), 9 telas de CRUD já
  `IMPLEMENTED` em `src/routes/**` e `src/components/operations/**`
  (migração dos consumidores)
- **Depende de:** SPEC-10 (`useSsrSafeQuery`, gate de montagem §14),
  SPEC-04/05/07/08/09 (telas consumidoras já implementadas)
- **Branch:** `spec-18-crud-componentization` (já criada/pushada)

---

## 1. Objetivo

Extrair 3 padrões que hoje são copiados quase byte-a-byte entre 8–10 telas de
CRUD simples do projeto, sem mudar nenhum comportamento visível: o hook de
mutação create/update/delete com toast padronizado, o trio de botões de
linha (`eye`/`pencil`/`trash`), e o gate de montagem client-only (SPEC-10
§14). Reduz a superfície de manutenção — hoje uma correção de UX nesse
padrão (ex.: SPEC-11 mudou `mb-3`→`mb-4` no toolbar) precisa ser replicada
manualmente em cada arquivo — sem introduzir uma camada de abstração maior
(um `SimpleCrudPage` de nível de página fica fora, ver §4).

## 2. Contexto

Levantamento estrutural (grep, feito nesta sessão) encontrou a mesma
duplicação em:

| Padrão                                                      | Arquivos (contagem real) |
| ------------------------------------------------------------ | ------------------------- |
| `toFormValues(record)` (forma igual, campos diferentes)      | 9 |
| `confirmDelete`/`pendingDelete` (mutateAsync + toast + finally, idêntico) | 9 |
| Trio de botões `bi-eye`/`bi-pencil`/`bi-trash` cru (JSX inline) | 10 |
| Gate de montagem (`mounted` state + `useEffect`, SPEC-10 §14) | 7 |
| `handleSubmit`/mutation com try/catch + toast               | 18 (todo formulário do projeto — fora de escopo, ver §4) |

Arquivos envolvidos, confirmados nesta sessão lendo o código (não só o
grep):

- `src/routes/_dashboard/_internal/administrative/registry/{harbor,terminal,product,container,vessel}/index.tsx`
  — 5 telas, shape **idêntico**: `toFormValues`, `invalidateList`,
  `handleSubmit` (create/update), `confirmDelete`, trio de botões outline
  (`btn btn-sm btn-outline-{primary,success,danger}`).
- `src/routes/_dashboard/_internal/administrative/clients/index.tsx` — mesmo
  shape, com uma variação: os botões `view`/`edit` mostram `Spinner`
  enquanto busca o detalhe sob demanda (`isLoadingDetail`).
- `src/routes/_dashboard/client/collaborators/index.tsx` — mesmo shape, sem
  botão de editar (Core não expõe update de Collaborator, R3 da SPEC-09) —
  só `view`/`delete`.
- `src/components/operations/tabs/Romaneio.tsx` — mesmo shape (create/
  update/delete + trio), dentro de uma aba, não uma rota.
- `src/components/operations/operations-list.tsx` — só `view`/`edit`
  (sem delete, é lista de leitura), `edit` condicional a `!readOnly`, com o
  mesmo `Spinner` sob demanda de `clients`.
- `src/routes/_dashboard/admin/access/index.tsx` — **shape parecido mas não
  igual**: 5 ações (view/edit/activate-deactivate/resetPassword/delete) num
  único `PendingAction` union, estilo visual de pílula colorida
  (`styles.actionBtn*`, CSS Module próprio), não o outline padrão. Ver §4 —
  decisão de manter fora do escopo de migração de `CrudRowActions`.
- Gate de montagem (`mounted`/`useEffect`, sempre as mesmas 2 linhas):
  `src/components/crud/crud-list-page.tsx`,
  `src/routes/_dashboard/admin/access/index.tsx`,
  `src/routes/_dashboard/_internal/administrative/operations/$id/index.tsx`,
  `src/routes/_dashboard/_internal/administrative/registry/terminal/index.tsx`,
  `src/routes/_dashboard/_internal/administrative/clients/index.tsx`,
  `src/routes/_dashboard/client/collaborators/index.tsx`,
  `src/routes/_dashboard/_internal/operational/operations/$id/index.tsx`.

O que já está bem componentizado e esta SPEC **não toca**: `CrudListPage`/
`CrudListPageBody` (busca+paginação+lista, motor genérico), `CrudRecordModal`
(form modal create/edit/view), `ConfirmationModal`, `LoadingState`,
`ListPagination`, `ViewToggle`, `layouts/Form/Fields/*`.

## 3. Escopo

1. **`useCrudMutations`** (`src/hooks/useCrudMutations.ts`) — hook que
   encapsula o par `try/catch` + `toast.success`/`toast.error` +
   invalidação de query, pros dois fluxos repetidos: `submit(mode, values,
   record?)` (create/update) e `remove(record)` (delete). Não encapsula a
   chamada Orval em si (assinatura de `mutateAsync` varia por entidade —
   `{data}`, `{id,data}`, `{operationId,id,data}`) — recebe callbacks
   `onCreate`/`onUpdate`/`onDelete` já fechados sobre a mutation certa,
   fornecidos pela tela. Ver §9 pra assinatura completa.
2. **`CrudRowActions`** (`src/components/crud/crud-row-actions.tsx`) —
   componente de apresentação com o trio `view`/`edit`/`delete`, cada ação
   opcional (`onView?`/`onEdit?`/`onDelete?`), com suporte a `loading`
   por-botão (troca o ícone por `Spinner`, caso de `clients`/
   `operations-list`) e `disabled`. Estilo fixo: `btn btn-sm
   btn-outline-{primary,success,danger}` (o padrão que já domina — 9 dos 10
   arquivos usam esse visual; só `admin/access` usa pílula, fora do escopo).
3. **`useMounted`** (`src/hooks/useMounted.ts`) — hook de uma linha:
   encapsula as mesmas 2 linhas (`useState(false)` + `useEffect(() =>
   setMounted(true), [])`) repetidas nos 7 arquivos do gate de montagem
   (SPEC-10 §14). Ver §4/§9 pra decisão hook-vs-wrapper.
4. **Migração dos consumidores** — trocar a duplicação pelos 3 primitivos
   acima, sem mudar nenhum comportamento (mesmas mensagens de toast, mesma
   ordem de botões, mesmo `variant` de cor, mesmo fallback de loading):
   - `useCrudMutations`: as 5 telas de `registry/*` +
     `administrative/clients` + `client/collaborators` +
     `components/operations/tabs/Romaneio.tsx` (8 arquivos — shape
     create/update/delete idêntico, sem exceção).
   - `CrudRowActions`: os mesmos 8 arquivos + `operations-list.tsx` (9
     arquivos — inclui esse porque o componente é só apresentação, não
     depende de mutation nenhuma, então o formato `view`/`edit` sem
     `delete` também se encaixa).
   - `useMounted`: os 7 arquivos listados no §2 (inclui `admin/access` —
     essa troca é comportamentalmente nula, as duas linhas são idênticas
     em todo arquivo, então entra mesmo `admin/access` ficando fora da
     migração de `CrudRowActions`).

## 4. Fora do escopo

- **`admin/access` não migra pra `CrudRowActions`.** O `RowActions` de lá
  tem 5 ações (não 3), estilo visual de pílula colorida
  (`index.module.css`, `actionBtnNeutral/Success/Danger`, diferente do
  outline padrão), e o "delete" está dentro de um union
  `PendingAction["kind"]` de 4 variantes (activate/deactivate/
  resetPassword/delete) — forçar esse shape dentro de `CrudRowActions`
  ou de `useCrudMutations.remove` exigiria ou bengalar a API dos dois
  primitivos pra um caso só, ou migrar só `handleSubmit` (create/update) e
  deixar `confirmPending` (delete + 3 outras ações) do jeito que está —
  resultado inconsistente, maior risco pro ganho. Fica de fora inteiro
  desta SPEC (só `useMounted`, que é neutro, entra lá). Se o usuário quiser
  um primitivo pra ação-pílula-multi-kind, é escopo de SPEC futura.
- **`SimpleCrudPage`** (componente de nível de página compondo `CrudListPage`
  + `CrudRecordModal` + `ConfirmationModal` + os 3 primitivos desta SPEC
  pros 5 CRUDs de `registry/*`, que são quase clones) — maior risco,
  decisão de arquitetura maior (que fica pronto/configurável vs que cada
  tela ainda escreve). Fica pra SPEC futura, se aprovada separadamente —
  esta SPEC prepara o terreno (os 3 primitivos) mas não força esse último
  passo.
- **`handleSubmit`/try-catch/toast genérico de formulário** (18 arquivos,
  todo formulário do projeto) — escopo grande demais, a maioria desses
  formulários não é CRUD simples (ex.: telas de operação com múltiplos
  passos, wizard de import). Esta SPEC só cobre o subconjunto CRUD
  create/update/delete com `CrudRecordModal`+`ConfirmationModal`.
- **Nenhuma mudança de contrato de API, schema Zod, rota ou i18n.** Migração
  pura de código client, sem chave de tradução nova (as mensagens de toast
  continuam vindo do mesmo namespace por tela, só passam a ser passadas
  como parâmetro pro hook em vez de citadas inline).
- **`crud-list-page.tsx` continua responsável pela própria busca/paginação**
  — só o `mounted`/`useEffect` interno dele é trocado por `useMounted()`,
  o resto do componente (SPEC-10) não muda.

## 5. Requisitos funcionais

- **RF1** — `useCrudMutations<TValues, TRecord>({ onCreate?, onUpdate?,
  onDelete?, invalidateKey, messages })` expõe `{ submit, remove,
  isSubmitting, isDeleting }`. `submit(mode, values, record?)` chama
  `onCreate`/`onUpdate` conforme `mode`, mostra `toast.success(t(messages
  .created|updated))`, invalida `invalidateKey` via
  `queryClient.invalidateQueries`, e devolve `boolean` (sucesso) pra tela
  decidir fechar o modal. `remove(record)` chama `onDelete`, mostra
  `toast.success(t(messages.deleted))`, invalida a mesma key. Ambos
  capturam exceção e mostram `toast.error(t(messages.error))` — mesmo texto
  de erro genérico que cada tela já usa hoje.
- **RF2** — `CrudRowActions({ onView?, onEdit?, onDelete?, viewLoading?,
  editLoading?, disabled? })` renderiza só os botões cujo callback foi
  passado, na ordem fixa view→edit→delete, com o mesmo `className`/ícone/
  cor que o código duplicado já usa hoje (`btn-outline-primary`+`bi-eye`,
  `btn-outline-success`+`bi-pencil`, `btn-outline-danger`+`bi-trash`).
  `viewLoading`/`editLoading` trocam o ícone por `<Spinner size="sm"
  animation="border" />` e desabilitam o botão (paridade com `clients`/
  `operations-list`).
- **RF3** — `useMounted(): boolean` substitui as 2 linhas duplicadas
  (`useState(false)` + `useEffect(() => setMounted(true), [])`) nos 7
  arquivos do §2/§3. Cada arquivo mantém seu próprio JSX de fallback (o
  hook não decide o que renderizar enquanto `false` — isso já varia por
  tela: spinner puro, spinner com header, dentro ou fora de `PageLayout`).
- **RF4** — As 8 telas de `useCrudMutations` (§3) passam a chamar
  `submit`/`remove` em vez do `try/catch` inline — texto de toast, ordem de
  chamadas e comportamento em erro permanecem os mesmos (mesma chave i18n
  por tela, nenhuma chave nova).
- **RF5** — As 9 telas de `CrudRowActions` (§3) passam a renderizar
  `<CrudRowActions .../>` em vez do JSX de botão cru — mesmo ícone, cor,
  ordem e comportamento de loading/disabled de hoje.
- **RF6** — As 7 telas do gate de montagem passam a chamar `const mounted =
  useMounted()` em vez das 2 linhas duplicadas — mesmo fallback JSX de
  cada arquivo, sem mudança visível.

## 6. Requisitos não funcionais

- RNF1 — `bun run check` + `bun run lint` passam sem novo erro; contagem de
  warning pré-existente não aumenta.
- RNF2 — Zero mudança de comportamento observável: mesmas mensagens de
  toast, mesma ordem/cor/ícone de botão, mesmo comportamento de loading —
  migração é refactor puro, não há requisito novo de produto.
- RNF3 — Nenhum novo pacote, nenhuma mudança de schema Zod, nenhuma rota
  nova, nenhuma chave i18n nova.
- RNF4 — `CrudRowActions` não decide **quem pode ver o quê** (permissão) —
  isso continua na tela (ex.: `operations-list.tsx` só passa `onEdit`
  quando `!readOnly`; `CrudRowActions` só reage a "o callback existe ou
  não", igual o padrão condicional já usado hoje pro botão de editar do
  `collaborators`, que simplesmente nunca é renderizado).

## 7. Contrato de rota

Nenhuma rota nova, nenhum guard novo — todas as 9 rotas envolvidas já são
`IMPLEMENTED` (SPEC-04/05/07/08/09) e mantêm path/guard/loader como estão.
Esta SPEC não mexe em `src/routes/**` fora do corpo dos componentes já
existentes.

## 8. Camada de dados

Nenhuma mudança de camada de dados. `useCrudMutations` não chama o Core
diretamente — recebe callbacks já fechados sobre os hooks Orval
(`usePostApiXxx`/`usePutApiXxxId`/`useDeleteApiXxxId`) que cada tela já
instancia. `invalidateKey` é a mesma `queryKey` que cada tela já usa em
`invalidateList()` hoje (`getGetApiXxxQueryKey()` do client gerado).

## 9. UI — assinatura proposta dos 3 primitivos

```ts
// src/hooks/useCrudMutations.ts
export type CrudMutationMessages = {
  created?: TranslationKey; // omitido = não mostra toast de sucesso nesse passo
  updated?: TranslationKey;
  deleted?: TranslationKey;
  error: TranslationKey; // obrigatório — toast de erro genérico (mesmo texto hoje usado)
};

export function useCrudMutations<TValues, TRecord>(config: {
  onCreate?: (values: TValues) => Promise<unknown>;
  onUpdate?: (values: TValues, record: TRecord) => Promise<unknown>;
  onDelete?: (record: TRecord) => Promise<unknown>;
  invalidateKey: QueryKey;
  messages: CrudMutationMessages;
}): {
  submit: (mode: "create" | "edit", values: TValues, record?: TRecord) => Promise<boolean>;
  remove: (record: TRecord) => Promise<void>;
};
```

```tsx
// src/components/crud/crud-row-actions.tsx
export type CrudRowActionsProps = {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  viewLoading?: boolean;
  editLoading?: boolean;
  disabled?: boolean; // desabilita os 3 (usado por clients/operations-list enquanto busca detalhe)
};
export function CrudRowActions(props: CrudRowActionsProps): JSX.Element;
```

```ts
// src/hooks/useMounted.ts
export function useMounted(): boolean;
```

**Decisão D1 (hook, não wrapper, pro gate de montagem):** um wrapper
`<SsrGate fallback={...}>{children}</SsrGate>` exigiria reestruturar o JSX
de cada um dos 7 arquivos (render-prop ou `children` condicional), porque
hoje o fallback de cada tela é diferente (spinner puro dentro/fora de
`PageLayout`, spinner com header, com ou sem `PageLayout` já aberto por
fora). Um hook `useMounted(): boolean` troca só as 2 linhas de estado,
mantendo a árvore JSX de cada arquivo exatamente como está — menor risco,
menor diff, mesmo racional de "começar pelo menor risco" pedido pelo
usuário para a SPEC inteira.

`CrudRowActions` fica em `src/components/crud/` (não em `components/ui/`)
porque é específico do padrão de lista/CRUD (usa o mesmo vocabulário de
`CrudColumn`/`CrudListPage`/`CrudRecordModal` que já moram lá), não um
componente de apresentação genérico. `useCrudMutations`/`useMounted` ficam
em `src/hooks/` (convenção já existente: `useCan.ts`, `usePagination.ts`,
`useObjectUrl.ts`, reexportados por `src/hooks/index.ts`).

Nenhum campo de formulário novo, nenhum uso de `layouts/Form/Fields`
alterado — os 3 primitivos não são input de formulário (regra 10 não se
aplica).

## 10. i18n

Nenhuma chave nova. `messages.created/updated/deleted/error` de
`useCrudMutations` continuam sendo a mesma `TranslationKey` que cada tela já
usa hoje (ex.: `"administrative-registry.harbor.toast.created"`), só passada
como parâmetro em vez de citada inline dentro do `try/catch`.

## 11. Arquivos esperados

| Arquivo | Ação |
| -------- | ---- |
| `src/hooks/useCrudMutations.ts` | criar |
| `src/hooks/useMounted.ts` | criar |
| `src/hooks/index.ts` | editar (exporta os 2 hooks novos) |
| `src/components/crud/crud-row-actions.tsx` | criar |
| `src/routes/_dashboard/_internal/administrative/registry/harbor/index.tsx` | editar (3 primitivos) |
| `src/routes/_dashboard/_internal/administrative/registry/terminal/index.tsx` | editar (3 primitivos) |
| `src/routes/_dashboard/_internal/administrative/registry/product/index.tsx` | editar (3 primitivos) |
| `src/routes/_dashboard/_internal/administrative/registry/container/index.tsx` | editar (3 primitivos) |
| `src/routes/_dashboard/_internal/administrative/registry/vessel/index.tsx` | editar (3 primitivos) |
| `src/routes/_dashboard/_internal/administrative/clients/index.tsx` | editar (3 primitivos) |
| `src/routes/_dashboard/client/collaborators/index.tsx` | editar (3 primitivos) |
| `src/components/operations/tabs/Romaneio.tsx` | editar (`useCrudMutations` + `CrudRowActions`, sem gate de montagem — não tem) |
| `src/components/operations/operations-list.tsx` | editar (só `CrudRowActions` — sem mutation própria, sem gate de montagem) |
| `src/components/crud/crud-list-page.tsx` | editar (só `useMounted`, interno) |
| `src/routes/_dashboard/admin/access/index.tsx` | editar (só `useMounted` — `RowActions`/`confirmPending` ficam como estão, ver §4) |
| `src/routes/_dashboard/_internal/administrative/operations/$id/index.tsx` | editar (só `useMounted`) |
| `src/routes/_dashboard/_internal/operational/operations/$id/index.tsx` | editar (só `useMounted`) |

## 12. Critérios de aceitação

| #   | Critério |
| --- | -------- |
| CA1 | `useCrudMutations` existe em `src/hooks/`, tipado conforme §9, sem chamar o Core diretamente |
| CA2 | `CrudRowActions` existe em `src/components/crud/`, renderiza só os botões cujo callback foi passado, mesma ordem/ícone/cor de hoje |
| CA3 | `useMounted` existe em `src/hooks/`, uma linha de estado + efeito, sem JSX |
| CA4 | As 8 telas listadas em §3 usam `useCrudMutations` pro create/update/delete — nenhum `try/catch`/`toast` de CRUD inline sobrando nelas |
| CA5 | As 9 telas listadas em §3 usam `CrudRowActions` — nenhum `<button>`/`bi-eye`/`bi-pencil`/`bi-trash` cru sobrando nelas |
| CA6 | Os 7 arquivos do gate de montagem usam `useMounted()` — nenhum `useState(false)`/`useEffect(() => setMounted(true))` duplicado sobrando |
| CA7 | `admin/access/index.tsx` migra **só** o gate de montagem; `RowActions`/`confirmPending` continuam exatamente como estão (mesmo visual de pílula, mesmas 5 ações) |
| CA8 | `bun run check` + `bun run lint` passam, sem novo erro e sem aumento na contagem de warning pré-existente |
| CA9 | Verificação manual: navegar em pelo menos 2 das telas migradas (ex.: `/administrative/registry/harbor`, `/administrative/clients`) e confirmar visualmente que criar/editar/excluir/ver continuam funcionando e mostrando os toasts esperados |

## 13. Riscos

- **R1 — Divergência de assinatura de `mutateAsync` entre entidades**
  (`{data}` vs `{id,data}` vs `{operationId,id,data}`). Mitigado pelo
  design de `useCrudMutations`: ele não conhece a assinatura da mutation,
  só recebe `onCreate`/`onUpdate`/`onDelete` já fechados pela tela — cada
  tela continua livre pra chamar `mutateAsync` do jeito que a entidade
  exige.
- **R2 — Migração de 12 arquivos em uma tacada só é superfície grande pra
  revisar.** Mitigado por ser refactor mecânico e repetitivo (mesmo
  before/depois em 8–9 arquivos quase idênticos) — o risco por arquivo é
  baixo, o risco agregado é de "esquecer" um caso (ex.: não perceber que
  `collaborators` não tem botão de editar). CA5/CA6 cobrem isso
  explicitamente por arquivo.
- **R3 — `admin/access` ficar com uma mistura** (usa `useMounted` mas não
  `CrudRowActions`/`useCrudMutations`) pode parecer inconsistência. Decisão
  registrada em §4/CA7: é proposital, não esquecimento — o resto do
  `RowActions`/`confirmPending` de lá é estruturalmente diferente (5 ações,
  visual de pílula) o bastante pra não caber nos primitivos desta SPEC sem
  forçar a API.

## 14. Decisões pendentes

- **D1 — Resolvida nesta SPEC (ver §9):** gate de montagem vira hook
  (`useMounted`), não wrapper de componente — menor diff, sem
  reestruturação de JSX por tela.
- **D2 — Resolvida nesta SPEC (ver §4):** `admin/access` fica fora da
  migração de `CrudRowActions`/`useCrudMutations` (só ganha `useMounted`).
  Se o usuário quiser um primitivo pro padrão de ação-múltipla-pílula
  (ativar/desativar/reset/deletar), é uma SPEC nova, própria pra esse
  formato.
- **D3 — Resolvida:** usuário decidiu que a migração dos 12 arquivos
  listados no §11 entra no **mesmo PR/branch** dos 3 primitivos novos
  ("tudo num PR só") — mantém §3/§11/§12 como estavam no rascunho, nenhum
  primitivo fica sem consumidor.

---

**Aprovação:** `APROVAR SPEC-18` recebido do usuário, incluindo a decisão
de D3 (§14) — migração completa no mesmo PR.

---

## Implementation Notes

**Arquivos criados:**

- `src/hooks/useCrudMutations.ts` — hook `useCrudMutations<TValues, TRecord,
  TDeleteRecord = TRecord>({ onCreate?, onUpdate?, onDelete?, invalidateKey,
  messages })`, expõe `{ submit, remove, isSubmitting, isDeleting }`. O
  terceiro type param `TDeleteRecord` (default `TRecord`) **não estava no
  rascunho** — apareceu ao migrar `administrative/clients`, onde o registro
  de update (`ClientDetailDTO`, vem do detalhe já carregado) e o de delete
  (`ClientDTO`, item cru da lista) são tipos diferentes. Resolvido com um
  terceiro genérico opcional em vez de forçar um tipo só — os outros 7
  consumidores usam a assinatura de 2 generics (default), sem mudança de uso.
- `src/hooks/useMounted.ts` — `useMounted(): boolean`, as mesmas 2 linhas
  (`useState(false)` + `useEffect(() => setMounted(true), [])`) que estavam
  duplicadas, exatamente como especificado no rascunho (§9, D1).
- `src/components/crud/crud-row-actions.tsx` — `CrudRowActions({ onView?,
  onEdit?, onDelete?, viewLoading?, editLoading?, disabled? })`, conforme
  §9. Reformatado uma vez por `eslint --fix` (só quebra de linha JSX,
  Prettier) — sem mudança de lógica.
- `src/hooks/index.ts` — editado (não criado) pra reexportar `useMounted`,
  `useCrudMutations` e os tipos `CrudMutationMessages`/
  `UseCrudMutationsConfig`, mesmo padrão dos hooks existentes.

**Arquivos migrados (12, como no §11 do rascunho, mais o ajuste do §"Achado"
abaixo):**

| Arquivo | O que mudou |
| -------- | ------------ |
| `src/routes/_dashboard/_internal/administrative/registry/harbor/index.tsx` | `useCrudMutations` + `CrudRowActions` |
| `src/routes/_dashboard/_internal/administrative/registry/terminal/index.tsx` | `useCrudMutations` + `CrudRowActions` + `useMounted` |
| `src/routes/_dashboard/_internal/administrative/registry/product/index.tsx` | `useCrudMutations` + `CrudRowActions` |
| `src/routes/_dashboard/_internal/administrative/registry/container/index.tsx` | `useCrudMutations` + `CrudRowActions` |
| `src/routes/_dashboard/_internal/administrative/registry/vessel/index.tsx` | `useCrudMutations` + `CrudRowActions` |
| `src/routes/_dashboard/_internal/administrative/clients/index.tsx` | `useCrudMutations` (3 generics) + `CrudRowActions` (com `viewLoading`/`editLoading`) + `useMounted` |
| `src/routes/_dashboard/client/collaborators/index.tsx` | `useCrudMutations` (só `onCreate`/`onDelete`, sem `onUpdate` — Core não expõe update de Collaborator) + `CrudRowActions` (sem `onEdit`) + `useMounted` |
| `src/components/operations/tabs/Romaneio.tsx` | `useCrudMutations` + `CrudRowActions`; `useQueryClient`/`invalidateList` mantidos só pro wizard de import (`ImportRomaneioModal`, fora do escopo dos 3 primitivos) |
| `src/components/operations/operations-list.tsx` | só `CrudRowActions` (sem mutation própria — é navegação/detalhe, não CRUD) |
| `src/components/crud/crud-list-page.tsx` | só `useMounted` (interno) |
| `src/routes/_dashboard/admin/access/index.tsx` | só `useMounted` — `RowActions`/`confirmPending` (5 ações, pílula) mantidos como estavam, conforme §4/CA7 |
| `src/routes/_dashboard/_internal/administrative/operations/$id/index.tsx` | só `useMounted` |

**Achado durante a implementação (ajusta o §11 do rascunho):**
`src/routes/_dashboard/_internal/operational/operations/$id/index.tsx`
(listado no rascunho como consumidor de `useMounted`) foi lido antes de
editar e **não tem** o gate de montagem — é uma tela 100% mock (array
estático `MOCK_OPERATIONS`, sem nenhum hook de query), sem `useState(false)`/
`useEffect` de montagem em lugar nenhum do arquivo. O grep original que
alimentou o rascunho da SPEC estava incorreto pra esse arquivo específico —
corrigido aqui por leitura direta do código antes de editar; **nenhuma
mudança foi feita nesse arquivo** (nada para migrar).

**Comandos executados:**

- `bun run check` (`tsc --noEmit`): limpo, sem erro. **VERIFIED**.
- `bun run lint`: `66 problems (3 errors, 63 warnings)` — os 3 erros são os
  mesmos pré-existentes de `src/lib/session.server.ts`
  (`react-hooks/rules-of-hooks`, fora do escopo desta SPEC); os 63 warnings
  batem exatamente com o baseline já registrado na SPEC-17 (nenhum
  novo). Um warning novo apareceu durante a implementação em
  `crud-row-actions.tsx` (`prettier/prettier`, quebra de linha JSX) e foi
  corrigido com `eslint --fix` antes desta contagem final. **VERIFIED**.
- `npm run build`: build completo, sem erro (`✓ built in 510ms`, chunks
  novos gerados: `crud-row-actions-*.mjs`, `crud-list-page-*.mjs` etc.).
  **VERIFIED**. (`build:azure` não rodado — a mudança não toca preset de
  servidor/Nitro/rotas de `api/`, RNF do §10/§8 do AGENTS.md não exige.)

**Critérios de aceitação:**

| #   | Critério | Resultado |
| --- | -------- | --------- |
| CA1 | `useCrudMutations` existe em `src/hooks/`, tipado, sem chamar o Core direto | PASS |
| CA2 | `CrudRowActions` existe em `src/components/crud/`, renderiza só botões com callback passado, mesma ordem/ícone/cor | PASS |
| CA3 | `useMounted` existe em `src/hooks/`, 1 linha de estado + efeito, sem JSX | PASS |
| CA4 | As 8 telas usam `useCrudMutations` pro create/update/delete | PASS |
| CA5 | As 9 telas usam `CrudRowActions`, sem `<button>`/`bi-eye`/`bi-pencil`/`bi-trash` cru sobrando | PASS |
| CA6 | Os 7 arquivos do gate usam `useMounted()` | PASS — 6 migrados + 1 (`operational/operations/$id`) confirmado sem o padrão, nada a migrar (ver "Achado" acima) |
| CA7 | `admin/access` migra só o gate; `RowActions`/`confirmPending` intactos | PASS |
| CA8 | `bun run check` + `bun run lint` sem novo erro/aumento de warning | PASS |
| CA9 | Verificação manual de 2 telas migradas | **NOT VERIFIED** — sem ambiente do Core no ar nesta sessão pra navegar a UI de ponta a ponta; a paridade de comportamento foi garantida por leitura linha-a-linha do diff (mesma mensagem de toast, mesma queryKey, mesma ordem de botão) e pelos 3 comandos automatizados acima, não por clique manual na tela. Recomendo essa verificação visual antes do merge. |

**Decisões tomadas durante a implementação (não estavam 100% no rascunho):**

1. Terceiro type param `TDeleteRecord` em `useCrudMutations` (ver acima) —
   necessário pra `administrative/clients`, não previsto no rascunho porque
   o rascunho não tinha detalhado esse caso de tipos divergentes update×delete.
2. `operational/operations/$id/index.tsx` não migrado — o rascunho listava
   como consumidor de `useMounted`, mas o arquivo não tem esse padrão (ver
   "Achado" acima). Nenhuma linha desse arquivo foi tocada.
3. `collaborators`/`romaneio` (import wizard) mantiveram `useQueryClient`
   local pra invalidação fora do fluxo create/update/delete (o wizard de
   import do Romaneio já tinha seu próprio toast de sucesso/erro,
   independente do CRUD simples) — não fazia sentido forçar esse fluxo
   dentro de `useCrudMutations`, que é só pro trio create/update/delete.

**Limitações conhecidas:**

- CA9 (verificação manual em tela real) não foi executada nesta sessão —
  sem Core rodando local. Recomendado antes do merge/deploy.
- `admin/access` continua com padrão próprio (5 ações, pílula) — decisão
  deliberada do rascunho (§4), não um débito desta implementação.
