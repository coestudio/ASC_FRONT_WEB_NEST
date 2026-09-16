# SPEC-46 — Estufagem: `Lote` vira campo obrigatório (breaking change do Core)

- **ID:** SPEC-46
- **Nome:** cargo-stuffing-lote-required
- **Status:** IMPLEMENTED (2026-09-16) — ver §9 (Implementation Notes).
  Achado durante revisão cruzada Core↔NewPortal (2026-09-16), não era
  pedido novo do usuário, era **regressão iminente** numa tela já
  `IMPLEMENTED`.
- **Autor:** claude (revisão de sincronização Core↔NewPortal, 2026-09-16)
- **Área:** `src/components/operations/tabs/Containers.tsx`
  (`StuffIdentifiedModal`, `StuffQuantityModal` — ambos já `IMPLEMENTED`,
  SPEC-07-11), e o modal de estufagem em lote descrito na
  `specs/42-multi-stuffing-checkbox` (ainda não implementado).
- **Depende de (Core):** `specs/25-cargo-stuffing-lote-scope`
  (`IMPLEMENTED`, 2026-09-16).

---

## 1. Objetivo

Documentar e corrigir uma **regressão real, não hipotética**: a Core
`specs/25-cargo-stuffing-lote-scope` tornou `Lote` um campo obrigatório
nos payloads de `POST .../cargo/stuff/identified` e
`POST .../cargo/stuff/quantity` — **dois endpoints que o NewPortal já
usa em produção** (`StuffIdentifiedModal`/`StuffQuantityModal` em
`Containers.tsx`, `IMPLEMENTED` desde SPEC-07-11). Assim que `just map`
rodar contra o Core atualizado, essas duas telas passam a ter um campo
obrigatório no schema Zod gerado que o formulário não coleta — erro de
validação/tipo, não é mais só "falta implementar", é "o que já existe
vai parar de funcionar".

## 2. Achado (código atual, confirmado 2026-09-16)

`Containers.tsx:621-623`, comentário explícito no código:

```
// "Lote" não é campo do payload (D2) — só filtro de UI dentro deste
// `SelectAsync`: o rótulo já combina lote/NF/identificador do fardo pra
// o operador achar a linha certa digitando qualquer um dos três.
```

Essa decisão (`D2`, de quando a tela foi implementada — SPEC-07-11) **já
não vale mais** — não é um bug antigo, é uma decisão correta na época que
o Core mudou por baixo depois.

Confirmado nos dois modais:

- **`StuffIdentifiedModal`** (linhas 593-682): form só tem
  `containerOperationId`/`romaneioId`/`invoiceId`. O `Lote` da linha
  escolhida já aparece no **rótulo** do `SelectAsync` (`fetchRomaneioOptions`,
  linha 624-630: `` `${romaneio.lote} · NF ${romaneio.notaFiscal} · ${romaneio.itemIdentifier}` ``)
  — o dado já está disponível na tela, só não é enviado no payload.
- **`StuffQuantityModal`** (linhas 694-802): form só tem
  `containerOperationId`/`invoiceId`/`quantity`. Não há nenhuma
  referência a Lote em lugar nenhum deste modal — nem exibição, nem
  seleção.

Contrato real do Core agora (`specs/25-cargo-stuffing-lote-scope` §9):

- `POST .../cargo/stuff/identified` — `Lote` `[Required][MaxLength(50)]`,
  recusa (400, `CargoUnitRomaneioMustMatchDeclaredLote`) se não bater
  com o `Lote` do `RomaneioModel` da linha escolhida (`RomaneioId`).
- `POST .../cargo/stuff/quantity` — `Lote` `[Required][MaxLength(50)]`.
  Se a Invoice é `RomaneioImport`, escopa a seleção automática de linhas
  livres por NF **e** Lote juntos (recusa 400 se não houver `quantity`
  linhas livres naquela combinação específica). Se `Manual`, grava o
  `Lote` declarado em cada `CargoUnit` criada.
- `POST .../cargo/stuff/identified-batch` (SPEC-31, o modal da
  `specs/42-multi-stuffing-checkbox` ainda não implementado) — `Lote`
  também `[Required]`, **por item** dentro do array `Items` (mesmo
  padrão de `RomaneioId`/`InvoiceId` já serem por item).

## 3. Escopo

1. **`StuffIdentifiedModal`** — adicionar campo `Lote` ao form
   (`InputText` ou reaproveitar o valor já resolvido da linha
   selecionada — ver `[NEEDS_DECISION-1]`). Remover/corrigir o
   comentário `D2` que hoje afirma o oposto.
2. **`StuffQuantityModal`** — adicionar campo `Lote` ao form
   (`InputText` livre — aqui não há uma linha de romaneio pré-selecionada
   pra derivar o valor, o operador digita).
3. **Modal de estufagem em lote** (`specs/42-multi-stuffing-checkbox`,
   ainda não implementado) — já precisa nascer com `Lote` por item desde
   o design, não como retrofit — coordenar com quem for implementar
   aquela SPEC pra não repetir este mesmo erro de sincronia.

## 4. `[NEEDS_DECISION-1]` — `Lote` no Modo A: digitar de novo, ou derivar da linha escolhida?

No Modo A (`StuffIdentifiedModal`), o operador já escolhe a linha do
romaneio (`RomaneioId`) — o `Lote` dela é um dado que a tela **já tem**
(usado no rótulo do `SelectAsync`). O Core exige o campo por consistência
declarativa (evita erro de seleção passar despercebido, não é uma
limitação de disponibilidade — ver `specs/25-cargo-stuffing-lote-scope`
§3.3 no Core).

Opções:
1. **Preencher automaticamente** o campo `Lote` do form assim que o
   operador escolhe a linha do romaneio (`onChange` do `SelectAsync` seta
   `methods.setValue("lote", romaneio.lote)`), campo readonly/desabilitado
   na UI — o operador não digita, só confirma visualmente. Reduz a
   checagem redundante do Core a uma formalidade invisível pro usuário.
2. **Campo de texto livre**, o operador digita o Lote de novo mesmo já
   tendo escolhido a linha — replica a "confirmação redundante
   intencional" que o Core pede (evita erro de seleção _e_ de digitação
   dupla), mas é uma UX pior (campo repetido).

Recomendação (não decisão): opção 1 — o valor já está disponível na
resposta do `SelectAsync`, não faz sentido pedir pro operador digitar de
novo algo que a tela já sabe.

## 5. Fora do escopo

- Mudar o contrato do Core — já fechado (`specs/25`, `IMPLEMENTED`).
- Implementar o modal de estufagem em lote em si (`specs/42`) — só
  garantir que, quando for implementado, já nasça com `Lote` por item.

## 6. Requisitos funcionais

1. `StuffIdentifiedModal` envia `Lote` no payload — sem isso, o `POST`
   falha (Core recusa por schema ausente ou por não bater com a linha).
2. `StuffQuantityModal` envia `Lote` no payload.
3. Comentário `D2` desatualizado (linha 621-623) corrigido/removido.

## 7. Critérios de aceitação

| # | Critério | Depende de |
|---|----------|------------|
| CA0 | `just map` executado, campo `Lote` presente nos 2 schemas Zod gerados (`identified`/`quantity`) | — |
| CA1 | `StuffIdentifiedModal` envia Lote, sucesso e erro de divergência (`CargoUnitRomaneioMustMatchDeclaredLote`) tratados como toast | RF1 |
| CA2 | `StuffQuantityModal` envia Lote | RF2 |
| CA3 | Comentário `D2` corrigido | RF3 |
| CA4 | `bun run check` + `bun run lint` sem regressão |

## 8. Riscos

- **R1 — Prioridade real, não cosmética.** Diferente das outras SPECs de
  sincronização desta rodada (39/42/43/44, que desbloqueiam telas ainda
  mock), esta aqui é sobre **telas já em produção que vão parar de
  aceitar estufagem** assim que o `just map` for rodado contra o Core
  atualizado — se isso já aconteceu e ninguém tratou esta SPEC, vale
  checar o estado atual do `src/api/generated/**` imediatamente.
- R2 — Baixo risco técnico de implementação em si (campo de formulário
  simples nos dois modais).

## 9. Implementation Notes (2026-09-16)

**Arquivos alterados:**
- `src/components/operations/tabs/Containers.tsx`:
  - `StuffIdentifiedModal` — `lote` adicionado ao `defaultValues`, campo
    `InputText` novo (`disabled`) no form. Preenchimento automático via
    `[NEEDS_DECISION-1]` opção 1 (recomendação da SPEC): um
    `romaneioLoteByIdRef` (`useRef<Record<string,string>>`) é populado a
    cada resposta de `fetchRomaneioOptions` (mapeia `romaneio.id →
    romaneio.lote`), e um `useEffect` observando `methods.watch("romaneioId")`
    chama `methods.setValue("lote", ...)` assim que a linha é escolhida —
    sem round-trip novo ao Core, o dado já vinha na mesma resposta que
    monta o rótulo do `SelectAsync`. Comentário `D2` (linha antiga
    621-623, "Lote não é campo do payload") removido/corrigido.
  - `StuffQuantityModal` — `lote` adicionado ao `defaultValues`, campo
    `InputText` livre (sem `disabled`, sem linha pré-selecionada pra
    derivar) logo abaixo de `quantity`.
- `specs/42-multi-stuffing-checkbox` (modal de estufagem em lote,
  `stuff/identified-batch`) — **não implementado nesta rodada** (fora do
  escopo desta SPEC-46 por design, §5); o client gerado já expõe `lote`
  por item em `PostApiOperationOperationIdCargoStuffIdentifiedBatchBody`
  (confirmado após `just map` contra o Core local, ver nota abaixo) pra
  quem for implementar aquela SPEC não repetir o mesmo erro de sincronia.

**Achado antes de implementar (mesmo achado da SPEC-44):** o client
gerado já commitado nesta branch tinha `lote` presente nos schemas Zod de
`stuff/identified`/`stuff/quantity` (`just map` anterior já tinha pego
essa parte do contrato do Core remoto de dev), então CA0 já estava
satisfeito antes de eu começar. Rodei `just map` de novo mesmo assim (motivado
pelo gap da SPEC-44, `seal/current` ausente) contra o Core local
(`localhost:5766`, via `.env.local` novo) — não mudou nada relevante para
esta SPEC-46 além de já confirmar `lote` também no `identified-batch`
(SPEC-31/42, fora de escopo aqui).

**Comandos executados e resultado:**
- `bun run check` (`tsc --noEmit`) — PASS.
- `bun run lint` (`eslint .`) — sem warnings/erros novos em
  `Containers.tsx`.

**Critérios de aceitação:**

| # | Critério | Status |
|---|----------|--------|
| CA0 | `just map` executado, campo `Lote` presente nos 2 schemas Zod gerados (`identified`/`quantity`) | PASS |
| CA1 | `StuffIdentifiedModal` envia Lote, sucesso e erro de divergência tratados como toast (catch genérico já existente) | PASS |
| CA2 | `StuffQuantityModal` envia Lote | PASS |
| CA3 | Comentário `D2` corrigido | PASS |
| CA4 | `bun run check` + `bun run lint` sem regressão | PASS |

**Limitações conhecidas / débito:**
- Erro de divergência (`CargoUnitRomaneioMustMatchDeclaredLote`) cai no
  mesmo `catch` genérico de toast já usado em todo o arquivo — não há
  extração de `MessageCode` específico pra exibir uma mensagem mais
  precisa (nenhum outro catch deste arquivo faz isso hoje; manter
  consistência de padrão em vez de inventar um novo aqui).
- `specs/42-multi-stuffing-checkbox` continua sem implementação — quando
  alguém pegar aquela SPEC, o campo `lote` por item já está disponível no
  client gerado.
