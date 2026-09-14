# SPEC-07-04 — Operações: aba Romaneio

- **ID:** SPEC-07-04
- **Nome:** operation-romaneio
- **Status:** IMPLEMENTED
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/routes/.../administrative/operations/$id/romaneio/**`
  (nova)
- **Depende de:** SPEC-00, SPEC-02, SPEC-SHARE-01 (`InputFileSingle`, pro
  upload da planilha na etapa `analyze` do import — ver §3), SPEC-07-01
  (namespace `administrative-operations.json`, editado aqui), SPEC-07-02
  (shell de abas)

---

## 1. Objetivo

Sub-SPEC extraída da divisão de SPEC-07 (índice geral,
`specs/07-operacoes/spec.md`): aba **Romaneio** — CRUD de fardos + import
em 2 etapas (analyze/apply), real.

**Real vs UI-only:** 100% real (`OperationRomaneioReal` no legado).

`romaneio` **fica em português** no segmento de rota — é o nome do domínio
no Core (`Operation/Romaneio`, hooks gerados
`getApiOperationOperationIdRomaneio...`), não um substantivo comum, mesmo
tratamento que "Vessel"/"Product" (nome próprio do domínio, não traduzido
à força).

## 2. Contexto

Legado: `OperationRomaneioReal`. Fluxo de import documentado no
`AGENTS.md` do Core.

## 3. Escopo

1. `operations/$id/romaneio/index.tsx` — CRUD de fardos.
2. Import de romaneio em 2 etapas: `.../romaneio/import/analyze` (upload
   da planilha via `InputFileSingle`, SPEC-SHARE-01 —
   `PostApiOperationOperationIdRomaneioImportAnalyzeBody.File`) → revisão
   de grupos classificados no front → `.../romaneio/import/apply`, sem
   pular a etapa de revisão.

## 4. Fora do escopo

- Conteúdo das demais abas.
- Export/return de romaneio (`Romaneio.Files.cs` — regiões `Return`/
  `Export` vazias no Core hoje, ver `Plans/Mapa-Paridade-Portal-Core.md`
  §4.2, R1) — não prometer no front.

## 5. Requisitos funcionais

- **RF1** — Consome só hooks Orval gerados de `romaneio`, nunca dado
  mockado.
- **RF2** — Import de romaneio segue o fluxo de 2 etapas do Core
  (`.../romaneio/import/analyze`, upload via `InputFileSingle` → revisão
  de grupos classificados no front → `.../romaneio/import/apply`), sem
  pular a etapa de revisão.
- **RF3** — Sem silent-fail (herda RF2 da SPEC-07-02).

## 6. Requisitos não funcionais

- RNF1 — `bun run check` + `lint` passam.
- RNF2 — Zero Zod à mão (schema gerado de `romaneio`).

## 7. Contrato de rota

Sem rota própria (D2 revertida em SPEC-07-02 §13) — esta aba é um
componente comum, montado pelo shell de `/administrative/operations/$id`
via estado local, dado real (`Romaneio` API).

## 8. Camada de dados

Hooks Orval de `romaneio` (CRUD + import analyze/apply) — já gerados.

## 9. Desenho

```
src/components/operations/tabs/
  Romaneio.tsx
```

## 10. Arquivos esperados

| Arquivo                                                           | Ação                                      |
| ----------------------------------------------------------------- | ----------------------------------------- |
| `src/components/operations/tabs/Romaneio.tsx`                     | criar                                     |
| `src/i18n/dictionaries/*/administrative-operations.json`          | editar — adicionar chaves da aba Romaneio |

## 11. Critérios de aceitação

| #   | Critério                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------- |
| CA1 | Aba funciona ponta a ponta contra o Core (dev)                                                            |
| CA2 | Import de romaneio respeita as 2 etapas (analyze → revisão → apply)                                       |
| CA4 | Upload da planilha (etapa `analyze`) usa `InputFileSingle` (SPEC-SHARE-01), não `<input type="file">` cru |
| CA3 | `bun run check` + `lint` passam                                                                           |

## 12. Riscos

- **R1** — Import de romaneio é o fluxo mais complexo do Core consumido
  nesta leva — revisar `Romaneio.Files.cs` (`Return`/`Export` vazios no
  Core, conforme `Plans/Mapa-Paridade-Portal-Core.md` §4.2) antes de
  prometer export no front.

## 13. Decisões pendentes

Nenhuma.

---

**Próximo passo:** `APROVAR SPEC-07-04`.

---

## Implementation Notes

- **Arquivos criados:**
  - `src/components/operations/tabs/Romaneio.tsx` — CRUD de fardos
    (`CrudListPage` + `CrudRecordModal`, mesmo padrão de
    `VesselPage`/`ContainerPage`) + wizard de import (`ImportRomaneioModal`,
    2 etapas: `analyze` via `InputFileSingle` → revisão dos grupos
    classificados pelo Core → `apply`).
- **Arquivos editados:**
  - `src/routes/_dashboard/_internal/administrative/operations/$id/index.tsx`
    — importa `Romaneio` e renderiza no lugar do placeholder quando
    `tab === "romaneio"` (necessário pra CA1; não estava listado em "Arquivos
    esperados" da spec, mas é a única forma de a aba aparecer de verdade —
    tratado como parte inerente de "montada pelo shell", não como escopo
    novo).
  - `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json`
    — chave nova `romaneio` (CRUD + import), só adições, nenhuma chave
    existente tocada.

- **Comandos executados:**
  - `bun run check` (`tsc --noEmit`) — **VERIFIED**, limpo (sem erros), antes
    e depois da mudança.
  - `bun run lint` — baseline antes de tocar em qualquer arquivo: **66
    problems (3 errors / 63 warnings)**, todos pré-existentes (3 erros em
    `src/lib/session.server.ts`, `react-hooks/rules-of-hooks` — nada relacionado
    a esta SPEC). Depois da implementação: **66 problems (3 errors / 63
    warnings)** — idêntico ao baseline. **VERIFIED**.
  - `just map` — não rodado: nenhuma mudança de contrato do Core nesta SPEC
    (hooks/zod de `romaneio` já existiam gerados).
  - `bun run build:azure` — não rodado (mudança não toca build/servidor/rotas
    de `api/`, só um componente de UI + wiring de aba + i18n).

- **Critérios de aceitação:**

  | # | Critério | Status |
  | --- | --- | --- |
  | CA1 | Aba funciona ponta a ponta contra o Core (dev) | NOT VERIFIED — sem Core rodando neste ambiente, não foi possível testar end-to-end contra a API real. Verificado estaticamente: hooks Orval corretos, contrato de `apply` (certificado=`itemIdentifier`, `createNew`/`conflicts`/`deleteMissing`) conferido linha a linha contra `warren/Core/Processors/RomaneioImport/RomaneioImport.Applier.cs` e `RomaneioImport.Classifier.cs`. |
  | CA2 | Import respeita as 2 etapas (analyze → revisão → apply) | PASS — `ImportRomaneioModal` só chama `apply` a partir do estado `review`, preenchido pela resposta do `analyze`; não há atalho que pule a revisão. |
  | CA4 | Upload da planilha usa `InputFileSingle`, não `<input type="file">` cru | PASS — etapa `analyze` usa `<InputFileSingle>` (SPEC-SHARE-01) dentro de um `useForm` com `zodResolver(PostApiOperationOperationIdRomaneioImportAnalyzeBody)`. |
  | CA3 | `bun run check` + `lint` passam | PASS — ver comandos acima (lint no baseline pré-existente, check limpo). |

- **Decisões tomadas durante a implementação:**
  1. **Campo `peso`/`pesoTara`/`pesoBruto` usa `InputText`, não
     `InputMoney`/`InputNumber`.** `InputMoney` é hard-coded pra moeda
     (prefixo R$/$/€, não serve pra peso em kg); `InputNumber` existente é
     um campo legado quebrado pra um caso específico (força mínimo 1,
     inteiro, checa erro de um campo fixo `installmentsNumber` que não
     existe aqui). O DTO aceita `number | string` com um regex decimal —
     `InputText` cobre isso sem inventar validação nova (a regra de
     formato continua 100% no schema gerado). Não criei/editei nenhum
     Field novo (regra 10) porque isso extrapolaria o escopo de arquivos
     da spec; documentado aqui em vez de silenciosamente decidido.
  2. **`certificado` (usado em `RomaneioImportConflictResolution`) = campo
     `itemIdentifier`.** Não documentado explicitamente no client gerado —
     confirmado por leitura direta de
     `warren/Core/Processors/RomaneioImport/RomaneioImport.{Classifier,Applier}.cs`
     (`certificado`/`fardoCertificado` é sempre `ItemIdentifier` no Core).
     Mesmo raciocínio usado pros arrays `createNew`/`deleteMissing`
     (strings = `itemIdentifier`).
  3. **A revisão do import (etapa 2) usa estado local (`useState`
     `Set`/`Record`) em vez de `react-hook-form` + Zod por linha.** É uma
     lista dinâmica de seleção (quantidade de itens vem da resposta do
     `analyze`, não um DTO de shape fixo) — não é um "formulário" no
     sentido da regra 9 (não há schema gerado pra "seleção de itens a
     importar"). O payload que de fato viaja pro Core
     (`RomaneioImportApply`) é montado a partir dessa seleção e validado
     com `PostApiOperationOperationIdRomaneioImportApplyBody.parse(...)`
     (schema gerado) antes do POST — zero validação manual escrita à mão,
     RNF2 preservado.
  4. **Default de seleção na revisão:** todo fardo `new` vem pré-marcado
     pra criação; todo fardo `missing` vem **desmarcado** (exclusão é
     destrutiva, exige opt-in); todo campo de `conflicts` vem pré-marcado
     com o diff completo (aceitar a planilha por padrão, usuário desmarca
     o que não quiser sincronizar). `foreign`/`invalid`/`duplicated` são
     somente leitura (Core nunca aceita ação sobre eles nesse endpoint).
  5. Grupos `foreign`, `invalid` e `duplicated` são mostrados como listas
     informativas — não prometem export/correção inline (R1 da spec,
     `Return`/`Export` vazios no Core).

- **Lacunas de contrato encontradas no fluxo de import (nunca testado
  end-to-end antes):**
  - Nenhum endpoint ausente. O único ponto que exigiu leitura direta do
    código-fonte do Core (não só do client gerado) foi a equivalência
    `certificado` = `itemIdentifier` — o client gerado não documenta isso
    em lugar nenhum (nem em comentário JSDoc), só o nome do campo na
    resposta de `analyze`/`apply`. Registrado na decisão 2 acima pra quem
    for testar contra o Core de verdade.
  - `RomaneioImportRowDTO.itemIdentifier` é opcional no schema gerado
    (`string | undefined`) mesmo sendo, na prática, sempre preenchido pelo
    Core (`Classifier.cs` sempre popula via `ItemIdentifier`). Tratado com
    fallback `?? ""` nas chaves de `Set`/`Record` — não deveria ocorrer em
    uso real, mas evita `undefined` como chave de lista.

- **Limitações conhecidas:**
  - Não testado contra o Core rodando (CA1 fica `NOT VERIFIED` por esse
    motivo) — recomendo rodar um `analyze`/`apply` real assim que o Core
    estiver disponível neste ambiente, antes de considerar a SPEC
    fechada em produção.
  - Export/return de romaneio permanece fora do escopo (R1), sem UI
    prometida.
