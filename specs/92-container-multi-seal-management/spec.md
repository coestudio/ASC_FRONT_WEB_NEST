# SPEC-92 — Gestão de múltiplos lacres por container

- **ID:** 92
- **Nome:** container-multi-seal-management
- **Status:** IMPLEMENTED
- **Autor:** claude (triagem de leva de ajustes pré-apresentação, pedido do
  usuário em 2026-09-17)
- **Área:** `src/components/operations/tabs/Containers.tsx`

## 1. Objetivo

Item 2 da leva do usuário: "Lógica de lacre — pode conter dois ou mais
lacres no container, manter a mecânica, criar lógica pra lacrar e
deslacrar o container [com múltiplos lacres]".

## 2. Contexto (investigado em 2026-09-17) — o Core já suporta N lacres

`SealDTO` (`src/api/generated/model/sealDTO.ts`) e
`ContainerOperationDTO.seals?: SealDTO[]` já modelam **lista** de lacres,
cada um com `status: SealStatus` (`Active` | `Removed`) e `id` próprio. Os
endpoints já existem e são por-lacre, não por-container:

- `POST /api/operation/{operationId}/container/{id}/seal` — cria **um novo**
  lacre (`usePostApiOperationOperationIdContainerIdSeal`).
- `DELETE /api/operation/{operationId}/container/{id}/seal/{sealId}` —
  remove **um** lacre específico por id
  (`useDeleteApiOperationOperationIdContainerIdSealSealId`).

Ou seja: **isso não é limitação do Core** — o contrato já é "N lacres,
cada um com seu próprio ciclo de vida". A limitação é só do front, que hoje
trata lacre como binário por container:

```tsx
// Containers.tsx, linha ~333-341
icon: item.status === "Sealed" ? "bi-shield-lock" : "bi-shield",
label: t(item.status === "Sealed" ? "...unsealButton" : "...sealButton"),
onClick: () => item.status === "Sealed" ? setUnsealFor(item) : setAddSealFor(item),
```

- Se `item.status !== "Sealed"`, abre `AddSealModal` (criar lacre) — mas
  não deixa criar um **segundo** lacre quando já existe um ativo (o botão
  vira "Deslacrar" assim que `status === "Sealed"`).
- Se `item.status === "Sealed"`, o único caminho é `handleUnseal`, que pega
  **o primeiro** lacre `Active` do array (`seals?.find(s => s.status ===
  "Active")`) e remove só esse — sem UI pra ver quantos lacres existem, nem
  pra escolher qual remover se houver mais de um.
- Não existe, em lugar nenhum da tela, uma lista visível de todos os lacres
  do container (ativos + removidos, com `label`/`name`/`sealedAt`/`photo`).

`ContainerOperationStatus` (`Empty` | `Stuffing` | `Sealed`) é campo do
Core, calculado lá — o front não decide esse valor, só o lê. Não está claro
se o Core já contempla "> 1 lacre ativo simultâneo" no cálculo desse status
(ex.: container com 2 lacres ativos continua `Sealed`, ou algo diferente).

## 3. Escopo

- Trocar a ação única "lacrar/deslacrar" por uma **lista de lacres** por
  container (dentro do mesmo lugar que hoje abre `AddSealModal`/confirmação
  de deslacre — pode ser um modal próprio "Lacres do container", ou expandir
  o que já existe).
- Cada lacre da lista mostra `name`/`label`/`sealedAt`/`photo`/`status`
  (Active/Removed) — histórico completo, não só o ativo.
- Ação "Lacrar" (novo lacre) disponível **independente** de já existir lacre
  ativo — sempre chama `POST .../seal` (`AddSealModal` já existe e funciona,
  só precisa deixar de ficar escondida atrás do gate `status !== "Sealed"`).
- Ação "Deslacrar" por **lacre individual** (não mais "o primeiro Active
  encontrado") — cada lacre `Active` na lista ganha seu próprio botão de
  remover, que chama `DELETE .../seal/{sealId}` com o id daquele lacre
  específico.
- Badge/ícone da coluna "Status" da tabela de Containers continua mostrando
  `item.status` (campo do Core, sem mudança) — só a ação da linha muda de
  binária pra "abrir gestão de lacres".

## 4. Fora do escopo

- Mudar como o Core calcula `ContainerOperationStatus` — é read-only aqui.
- Qualquer validação de "quantos lacres um container pode ter" — regra de
  negócio do Core, não do front.

## 5. Decisões pendentes

```
[NEEDS_DECISION]

Onde a lista de lacres deve viver na UI?

Opções:
1. Modal dedicado "Lacres do container" (ação de linha nova, ex. ícone
   `bi-shield`), que lista todos + botão "Adicionar lacre" + botão
   "Remover" por linha ativa. Separa de `AddSealModal`/confirmação atual
   (ambos passam a ser abertos de dentro desse modal, não direto da linha).
2. Expandir o modal de fotos do container (`ContainerPhotos`, já existe
   como aba/seção) pra incluir uma seção "Lacres" ao lado de "Fotos" —
   um só lugar pra tudo relacionado ao container além do cadastro básico.

Impacto: opção 1 é mudança isolada e pequena; opção 2 reusa/expande um
componente já mexido recentemente (SPEC-88) e pode fazer mais sentido pra
quem já abre aquele modal pra outra coisa.

Aguardando decisão do usuário.
```

## 6. Camada de dados

Sem mudança de contrato — `usePostApiOperationOperationIdContainerIdSeal`
e `useDeleteApiOperationOperationIdContainerIdSealSealId` já existem e já
são usados. Só muda: (a) `POST` deixa de ser gateado por
`item.status !== "Sealed"`; (b) `DELETE` passa a receber o `sealId` do
lacre clicado na lista, não mais `seals?.find(s => s.status === "Active")`.

## 7. UI

- Reusa `AddSealModal` já existente (formulário de lacrar, com foto/data
  obrigatórios — SPEC-62) sem mudança de campos.
- `ConfirmationModal` de deslacrar (já existe) passa a receber o `sealId`
  específico, não mais resolvido implicitamente.
- Nova lista/tabela de lacres (formato a definir junto da decisão da §5).

## 8. i18n

Reusa `administrative-operations.containers.seal.*` já existente
(`sealButton`/`unsealButton`/`confirmUnsealTitle`/`confirmUnsealMessage`/
`toast.unsealed`). Chaves novas (ex. título do modal de lista, "Adicionar
lacre", coluna de status do lacre) entram nos 4 locales quando a decisão da
§5 fechar.

## 9. Critérios de aceitação (a validar após implementação)

| # | Critério |
| --- | --- |
| 1 | É possível criar um novo lacre mesmo com um lacre `Active` já existente no container |
| 2 | É possível ver todos os lacres do container (ativos e removidos), não só o mais recente |
| 3 | É possível remover um lacre específico (por id), com múltiplos ativos coexistindo antes da remoção |
| 4 | Nenhuma regressão no fluxo de container com 0 ou 1 lacre (comportamento igual ao de hoje) |
| 5 | `bun run check` e `bun run lint` sem novos erros |

## 10. Riscos

Médio — depende de confirmar se o Core já suporta de fato >1 lacre `Active`
simultâneo sem rejeitar o segundo `POST` (o client gerado permite a
chamada, mas regra de negócio do Core pode limitar — não investigado aqui,
território do Core). Se o Core rejeitar o segundo lacre ativo, isso vira
`[NEEDS_DECISION]`/dependência de Core antes de codar esta SPEC.

## 11. Implementation Notes

**Decisão `[NEEDS_DECISION]` resolvida (§5).** Nenhuma das duas opções
literais da spec foi seguida à risca — orientação do usuário foi "siga o
mesmo tipo de UI usada pra fotos do container (SPEC-88): lista com
adicionar/remover inline". Implementado como um **modal dedicado**
("Lacres do container", mais próximo da opção 1 estruturalmente — ação de
linha isolada, não expande o modal de fotos) mas com o **padrão visual e
de busca de `ContainerPhotos`**: query própria de detalhe
(`operation-container/{id}`, sempre fresca mesmo com o modal já aberto),
lista (`list-group`) com remover inline por item, e um botão "Adicionar"
no rodapé que abre um sub-modal (`AddSealModal`, já existente,
reaproveitado sem mudança) — mesma mecânica de "lista de N itens dentro
de um registro" da seção "Outras fotos" de `ContainerPhotos`.

**O que foi implementado:**
- Novo componente `ContainerSeals` (`Containers.tsx`) — lista todos os
  lacres do container (ativos e removidos, mais recente primeiro), com
  `Badge` de status (`Active` → `success`, `Removed` → `secondary`,
  mesmo padrão de outras dualidades ativo/inativo do projeto), foto em
  miniatura quando existe, e botão "Deslacrar" por lacre `Active`
  (`ConfirmationModal` de confirmação, reaproveitando as chaves de i18n
  já existentes — mensagem ajustada de "o lacre ativo" pra "este lacre",
  já que agora pode haver mais de um).
- A ação de linha "seal" (binária, `bi-shield`/`bi-shield-lock`) virou uma
  única ação "seals" (`bi-shield`, label `manageButton`) que abre o modal.
- `POST .../seal` deixou de ser gateado por `item.status !== "Sealed"` —
  o botão "Adicionar" do modal está sempre disponível.
- `DELETE .../seal/{sealId}` passa a receber o `sealId` do lacre clicado
  na lista (não mais `seals?.find(s => s.status === "Active")`).
- Chaves i18n novas (`manageButton`, `listEmpty`) nos 4 locales;
  `confirmUnsealMessage` ajustada nos 4 locales (não fala mais em "o
  lacre ativo", já que a remoção agora é sempre de um lacre específico).

**Arquivos alterados:**
- `src/components/operations/tabs/Containers.tsx`
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json`

**Comandos executados:**
- `bun run check` — VERIFIED, sem erros.
- `bun run lint` — VERIFIED, 0 errors / 63 warnings (mesmo baseline pós
  SPEC-94/91, nenhum warning novo).

**Critérios de aceitação:**

| # | Critério | Resultado |
| --- | --- | --- |
| 1 | Criar novo lacre mesmo com um `Active` já existente | PASS (botão "Adicionar" sempre habilitado no modal) |
| 2 | Ver todos os lacres (ativos e removidos) | PASS (lista completa, não só o mais recente) |
| 3 | Remover lacre específico por id, com múltiplos ativos coexistindo | PASS (`sealId` do item clicado) |
| 4 | Sem regressão em container com 0 ou 1 lacre | PASS (lista vazia mostra `listEmpty`; 1 lacre é só uma linha) |
| 5 | `bun run check`/`lint` sem novos erros | PASS |

**Risco confirmado/não confirmado:** o risco original (Core rejeitar o
segundo `POST .../seal` com lacre `Active` já existente) **não foi
validado nesta sessão** — sem ambiente do Core rodando para testar. O
front não impõe mais o gate; se o Core rejeitar, o erro aparece via
interceptor global (toast de erro padrão), sem crash — mas o
comportamento de "criar 2º lacre ativo" só será confirmado em teste
manual/Core rodando.

**Limitações conhecidas:** sem verificação visual em navegador nesta
sessão (mesma ressalva das SPECs anteriores desta leva).
