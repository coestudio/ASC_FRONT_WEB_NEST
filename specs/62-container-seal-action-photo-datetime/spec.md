# SPEC-62 — Botão de lacre dinâmico + foto/data/hora no lacrar

- **ID:** SPEC-62
- **Nome:** container-seal-action-photo-datetime
- **Status:** DRAFT — decisões próprias (§1-§3) já claras; **bloqueada por
  `warren/Core/specs/45-container-seal-photo-datetime`** (`DRAFT`,
  decisões fechadas em 2026-09-16: foto obrigatória, `POST .../seal` vira
  multipart numa única chamada, `SealedAt` campo novo editável,
  `RemoveSeal` inalterado). Não implementar antes da SPEC-45 do Core
  estar `IMPLEMENTED` e `just map` rodar contra ela.
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
     mantém o comportamento atual: abre o modal com `ContainerSeal`
     (mostra o lacre ativo + botão/confirmação de deslacrar).
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
- RF3: clique em "Deslacrar" mantém o comportamento atual (painel com
  lacre ativo + confirmação).
- RF4: `AddSealModal` não submete sem foto (validação vem do schema
  gerado, não escrita à mão).
- RF5: data/hora vêm pré-preenchidas com o momento de abertura do modal,
  mas o operador pode alterar antes de enviar.

## 6. Critérios de aceitação

- CA1: botão da linha reflete o estado corretamente nos dois casos.
- CA2: fluxo de lacrar de ponta a ponta (foto + data + hora) funciona
  contra o Core com a SPEC-45 implementada.
- CA3: `tsc --noEmit` e lint sem erro novo.

## 7. Dependência

Bloqueada por `warren/Core/specs/45-container-seal-photo-datetime`
(`DRAFT`, decisões fechadas). Ordem: Core SPEC-45 aprovada (`APROVAR
SPEC-45`) → implementada → `just map` no NewPortal → então esta SPEC pode
ser aprovada (`APROVAR SPEC-62`) e implementada.
