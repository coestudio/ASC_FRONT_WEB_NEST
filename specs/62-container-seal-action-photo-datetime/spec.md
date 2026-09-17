# SPEC-62 — Botão de lacre dinâmico + foto/data/hora no lacrar

- **ID:** SPEC-62
- **Nome:** container-seal-action-photo-datetime
- **Status:** IMPLEMENTED (2026-09-16)
- **Autor:** claude (pedido do usuário, 2026-09-16)
- **Área:** `src/components/operations/tabs/Containers.tsx`
  (`ContainerSeal`, `AddSealModal`, botão de lacre da linha).

---

## 1. Objetivo

Dois pedidos do usuário sobre a ação de lacre, na aba Containers (o
botão de lacre dedicado nasceu na SPEC-61, `bi-shield-lock`):

1. O botão da linha deve refletir a situação atual — ícone/tooltip
   "Lacrar" quando o container não tem lacre ativo, "Deslacrar" quando
   tem. Se for "Lacrar", o clique abre **direto** o modal de criar lacre
   (`AddSealModal`), sem passar pela tela intermediária que só mostra
   "nenhum lacre ativo + botão Lacrar" (`ContainerSeal`).
2. `AddSealModal` ganha 3 campos novos: foto do lacre (obrigatória — ver
   Core SPEC-45 D1), data do lacre e hora do lacre — os dois últimos
   pré-preenchidos com a data/hora atual, mas editáveis.

## 2. Contexto

`item.status` de `ContainerOperationDTO` (já vem na listagem de
`Containers.tsx`, sem query extra) é `'Empty' | 'Stuffing' | 'Sealed'`,
calculado no Core com `Sealed` tendo precedência sobre os outros
(SPEC-35) — ou seja, **`item.status === "Sealed"` já basta** pra saber se
o botão deve dizer "Lacrar" ou "Deslacrar", sem precisar da query
`seal/current` só pra decidir o ícone. `item.seals` (mesmo item da
listagem) também já traz o array de lacres com `status: 'Active' |
'Removed'` — o lacre ativo (se houver) dá pra achar ali
(`item.seals?.find(s => s.status === "Active")`) sem outra chamada,
inclusive pro fluxo de deslacrar.

## 3. Escopo

1. Botão da linha (`sealActionButton`, `Containers.tsx`) passa a checar
   `item.status === "Sealed"`:
   - Se **não** sealed → ícone/tooltip "Lacrar" (chave i18n nova ou
     reaproveitar `seal.sealButton`), clique abre `AddSealModal`
     diretamente (novo estado `addSealFor`, mesmo padrão de
     `photosFor`/`sealFor`).
   - Se sealed → ícone/tooltip "Deslacrar" (`seal.unsealButton`), clique
     abre **direto** um `ConfirmationModal` (sem painel intermediário —
     decisão revista na reabertura de §9, ver histórico).
2. `AddSealModal` ganha (schema vem do Zod gerado após `just map` contra
   a SPEC-45 do Core implementada — campo exato de data/hora, `IFormFile`
   vs `File`, a conferir contra o gerado na implementação):
   - `InputPhotoSingle` pra foto do lacre, obrigatório.
   - `InputDate` pra data do lacre.
   - `InputTime` pra hora do lacre.
   - Ambos os campos de data/hora com `defaultValues` calculados a partir
     de `new Date()` no momento em que o modal abre — mesmo padrão de
     "pré-selecionado, mas editável" já usado em outros formulários do
     projeto (confirmar componente exato de data/hora contra
     `layouts/Form/Fields/Index.ts`).
3. Regra 2 do AGENTS.md (schema Zod só gerado) se aplica normalmente —
   os 3 campos novos só entram no formulário depois que `just map`
   trouxer o schema atualizado do Core; nenhum campo é adicionado à mão
   antes disso.

## 4. Fora do escopo

- Qualquer mudança no fluxo de **deslacrar** (`ContainerSeal`,
  `handleUnseal`) — só o "Lacrar" ganha o atalho direto.
- Qualquer mudança de regra de negócio — Core decide (SPEC-45).

## 5. Requisitos funcionais

- RF1: botão da linha mostra "Lacrar" ou "Deslacrar" de acordo com
  `item.status`, sem query adicional.
- RF2: clique em "Lacrar" abre `AddSealModal` direto (sem o painel
  intermediário).
- RF3: clique em "Deslacrar" abre direto um `ConfirmationModal`, sem
  painel intermediário (ver §9).
- RF4: `AddSealModal` não submete sem foto — checagem manual no
  `handleSubmit` (ver §8: o schema gerado não marca `file` como
  obrigatório, mesma limitação já existente no upload de foto de
  container — `[FromForm]` escalar não expõe obrigatoriedade no OpenAPI).
- RF5: data/hora vêm pré-preenchidas com o momento de abertura do modal,
  mas o operador pode alterar antes de enviar.

## 6. Critérios de aceitação

- CA1: botão da linha reflete o estado corretamente nos dois casos.
- CA2: fluxo de lacrar de ponta a ponta (foto + data + hora) funciona
  contra o Core com a SPEC-45 implementada.
- CA3: `tsc --noEmit` e lint sem erro novo.

## 7. Dependência

Dependia de `warren/Core/specs/45-container-seal-photo-datetime`
(`IMPLEMENTED`) — `just map` rodado contra o Core local já com a SPEC-45.

## 8. Implementation Notes (2026-09-16)

- Botão da linha (`Containers.tsx`): `onClick` e ícone/tooltip checam
  `item.status === "Sealed"` — não-sealed abre `addSealFor` →
  `AddSealModal` direto. Ícone: `bi-shield-lock` (deslacrar) vs
  `bi-shield` (lacrar).
- **Reabertura (2026-09-16, mesmo dia):** pedido do usuário depois da
  primeira entrega — "deslacrar" também não deve passar por painel
  intermediário, só um `ConfirmationModal` direto (mesmo padrão de
  `pendingDelete`). Removido o painel `ContainerSeal` (que mostrava
  badge + nome do lacre + botão "Deslacrar" antes do confirm) e a query
  dedicada `seal/current` que ele usava — o lacre ativo já vem no
  próprio item da listagem (`item.seals?.find(s => s.status ===
  "Active")`), sem precisar de mais uma chamada. Novo estado
  `unsealFor` + `handleUnseal` direto no componente `Containers`
  (usa `removeSealMutation` movido pra lá). `ContainerSeal` foi apagada
  (ficou sem nenhum consumidor); chaves i18n órfãs removidas
  (`seal.title`, `seal.activeBadge`, `seal.none`,
  `containers.sealModalTitle`, 4 idiomas).
- `AddSealModal` ganhou `InputPhotoSingle` (`fieldName="file"`) e dois
  campos **fora** do payload tipado: um `useForm` local separado
  (`dateTimeMethods`, mesmo padrão de `ContainerSearchInput`) com
  `sealDate`/`sealTime`, pré-preenchidos via `nowAsDateAndTime()` no
  mount do modal. `handleSubmit` combina os dois num único
  `sealedAt = new Date(\`${sealDate}T${sealTime}:00\`).toISOString()`
  antes de mandar pro backend — o payload tipado (`SealFormValues`,
  inferido de `PostApiOperationOperationIdContainerIdSealBody`) só tem
  `sealedAt` como string única, não os dois campos separados.
- **Achado importante (não previsto no §3 original):** o schema Zod
  gerado marca `file`/`userId`/`name`/`sealedAt` como `.optional()`,
  mesmo sendo obrigatórios no Core — porque a rota usa parâmetros
  `[FromForm]` escalares (não uma classe `[Required]`), e o gerador de
  OpenAPI nativo do .NET não expõe obrigatoriedade de parâmetro de form
  individual (mesma situação pré-existente no upload de foto de
  container, `PostApiOperationOperationIdContainerIdPhotoBody`). Por
  isso a checagem de foto obrigatória é manual (`if (!values.file)`,
  toast com `seal.photoRequired`) — não dá pra confiar no schema/
  resolver pra isso, ajuste em relação ao RF4 original.
- Achado técnico no Core (fora do escopo desta SPEC, registrado aqui pra
  rastreabilidade): a primeira tentativa em `Core/specs/45` usou
  `[FromForm] SealViewModel.Create seal` (uma classe), que gerou schema
  com nomes **PascalCase** (`UserId`, `File`...) — a política de
  camelCase do `System.Text.Json` não se aplica a model binding de
  formulário. Revertido pra parâmetros escalares (`[FromForm] Guid
  userId, ...`), mesmo padrão de `AddPhotoAsync`, pra manter o contrato
  em camelCase — `SealViewModel` foi removida do Core (ver
  `Core/specs/45/spec.md` §7 e commit correspondente).
- i18n: `seal.photoRequired`, `seal.form.photo`, `seal.form.date`,
  `seal.form.time` — 4 idiomas.
- Validação: `tsc --noEmit` e `bun run lint` sem erro/aviso novo. Fluxo
  de ponta a ponta (criar lacre com foto+data+hora) **não testado em
  navegador** nesta sessão — só validado que o contrato sobe corretamente
  no Core local e que o front compila contra o client gerado.
