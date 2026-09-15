# SPEC-07-10 — Operações: aba Nota Fiscal (Invoice)

- **ID:** SPEC-07-10
- **Nome:** operation-invoice
- **Status:** WAITING_APPROVAL
- **Autor:** portal-dev-agent (reconciliada pós-`just map`)
- **Área:** `src/components/operations/tabs/Invoice.tsx` (nova),
  `src/routes/_dashboard/_internal/administrative/operations/$id/index.tsx`
  (editado — nova aba no shell), `src/i18n/dictionaries/*/
administrative-operations.json` (editado)
- **Depende de:** SPEC-00, SPEC-02, SPEC-SHARE-01 (`InputFileSingle`, ver
  §0.1/§3/§14 — **não** `InputFileMulti`, decisão revertida por achado
  técnico pós-map), SPEC-07-01 (namespace `administrative-operations.json`),
  SPEC-07-02 (shell de abas), SPEC-07-06 (`Documents.tsx`, padrão de upload
  reusado por esta aba — ver §0.1). Dependia também, fora deste repo, de
  `warren/Core` **SPEC-14** (`invoice-source-and-documents`) e **SPEC-15**
  (`romaneio-auto-invoice`) — **ambas `IMPLEMENTED`**, `just map` já rodado
  nesta branch (`spec-07-10-operation-invoice`, commit `43bad37`), `tsc
  --noEmit` limpo. Esta SPEC **não** depende de SPEC-16
  (`cargo-unit-redesign`) nem SPEC-17 (`cargo-stuffing-gates`) do Core.

---

## 0. Desbloqueio (era `BLOCKED`, agora reconciliada)

Esta SPEC nasceu `BLOCKED` esperando SPEC-14/15 do Core + `just map`. As
duas já estão `IMPLEMENTED`, o `just map` já rodou nesta branch e o diff de
`src/api/generated/**` foi inspecionado linha a linha contra o texto real
das SPECs 14/15 do Core (`warren/Core/specs/14-invoice-source-and-documents/
spec.md`, `warren/Core/Domain/Operations/Invoice/Invoice.ViewModel.cs`,
`warren/Core/Plugins/OpenApi/FormFileUploadTransformer.cs`). Isso resolve
D2/D3 originais (§14) — mas a inspeção revelou um **achado técnico novo e
bloqueante** que a SPEC original não podia prever (§0.1), então esta SPEC
sai de `BLOCKED` para `WAITING_APPROVAL` (não `APPROVED` direto) com um
`[NEEDS_DECISION]` novo em §14.

### 0.1 — Achado bloqueante: upload multipart de `Files` não veio corrigido

O Core (`Invoice.ViewModel.Create`) declara `Files` como
`List<IFormFile>` (upload multipart real, N arquivos, obrigatório — o
controller lança `MessageCode.InvoiceFileRequired` em 400 se vier vazio,
confirmado no texto de SPEC-14 do Core, critério 3 da tabela de aceitação
e nota "VERIFIED" no fechamento daquela SPEC). O plugin que o Core usa pra
consertar a geração de OpenAPI de `IFormFile`
(`Plugins/OpenApi/FormFileUploadTransformer.cs`) **só trata `IFormFile` e
`IFormFileCollection` únicos** (`IsFormFileType`, linha ~159) — não
reconhece `List<IFormFile>` como campo de arquivo. Resultado: o schema
OpenAPI de `POST /api/operation/{operationId}/invoice` saiu **errado**
para esse campo, e `just map` gerou fielmente esse contrato quebrado:

- `src/api/generated/model/postApiOperationOperationIdInvoiceBody.ts`:
  `Files?: string[]` (deveria ser um array de arquivo binário).
- `src/api/generated/endpoints/invoice/invoice.ts`
  (`postApiOperationOperationIdInvoice`): monta o corpo com
  `URLSearchParams`/`Content-Type: application/x-www-form-urlencoded` e
  faz `Files.forEach(value => formUrlEncoded.append('Files', value))` —
  ou seja, cada arquivo vira uma **string arbitrária no corpo
  urlencoded**, não um blob binário multipart.

Comparar com o endpoint de Documento (que funciona certo, mesmo padrão de
upload já em produção na aba Documentos, SPEC-07-06):
`postApiOperationOperationIdDocument` usa `FormData` +
`Content-Type: multipart/form-data`, e o model gerado tem
`File?: Blob | File` (`IFormFile` **único** no Core, dentro do alcance que
o `FormFileUploadTransformer` cobre).

**Conclusão:** não é engano do frontend nem do Orval — é um gap real do
plugin de OpenAPI do `warren/Core` (`FormFileUploadTransformer.cs` não
cobre array de `IFormFile`). Por regra de território (`portal-dev-agent`
não decide sobre `warren/Core`, e "endpoint do Core que não existe/não
funciona como precisa no client gerado é `[NEEDS_DECISION]`", §0 regra 2 e
§12 do agente), isto vira decisão do usuário em §14 — ver `D-NEW` abaixo.

**O resto do contrato leu limpo:**

- `Number` no Core tem `[Required]`, mas o schema Zod gerado
  (`PostApiOperationOperationIdInvoiceBody.Number`) saiu `.optional()` —
  quirk conhecido de anotação `[Required]` em corpo `[FromForm]`
  multipart complexo (mesma classe de problema do bug de `Files`, mas sem
  impacto funcional: o Core ainda rejeita em runtime se faltar `Number`,
  só não trava no client antes do submit). Registrado como risco menor
  (R4), não bloqueia.
- `usePostApiOperationOperationIdInvoiceIdConfirm` /
  `...Cancel` sobreviveram **sem mudança de shape** — corpo continua
  `InvoiceStatusChange`/`{ note: string, max 500 }`, resposta continua
  `InvoiceDTO`. D3 original fechada: nomes reais confirmados, usar direto.
- `InvoiceItem*` foi removido inteiro do client gerado
  (`endpoints/invoice-item/` não existe mais) — RF1/RNF3/CA4 confirmáveis
  sem ressalva.
- Enums via snapshot estático já existem prontos:
  `src/api/generated/static/invoiceSourceOptions.ts` (`RomaneioImport` /
  `Manual`) e `invoiceStatusOptions.ts` (`Pending`/`Confirmed`/`Canceled`),
  4 idiomas cada — RF2 sem gap.
- Não existe (nem precisa existir) um componente de badge de status
  compartilhado em `src/components/ui/**` — o padrão real do projeto
  (`Containers.tsx`, `Documents.tsx`, `Responsible.tsx`) é `<Badge
  bg="...">` do react-bootstrap inline por tab. Não é `SCOPE CONFLICT`
  criar um badge novo aqui: é seguir o padrão já estabelecido (§9).

## 1. Objetivo

Nova aba **Nota Fiscal** no shell de detalhe de Operação
(`/administrative/operations/$id`): listar as `Invoice`s da operação
distinguindo visualmente origem (`Source`: geradas automaticamente pelo
import de romaneio vs. criadas manualmente) e status (`Pending`/
`Confirmed`/`Canceled`); permitir criar uma Nota Fiscal manual com upload
de arquivo(s); permitir confirmar/cancelar uma Nota Fiscal `Pending`.

Hoje **não existe** nenhuma tela de Invoice no NewPortal — é aba nova, não
migração de UI-only existente.

## 2. Contexto

Legado (`warren/Portal`): sem equivalente direto. Contrato de negócio:
`warren/Core/specs/14-invoice-source-and-documents/spec.md` +
`warren/Core/specs/15-romaneio-auto-invoice/spec.md` (`IMPLEMENTED`).

Resumo do que muda no domínio (já fechado no Core, não decisão desta SPEC):

- Toda `Invoice` nascida do import de romaneio (`Source=RomaneioImport`)
  já nasce `Status=Confirmed`, sem anexo obrigatório — o operador só
  visualiza.
- `Invoice` manual (`Source=Manual`) exige ≥1 arquivo anexado já na
  criação (regra aplicada no servidor, `MessageCode.InvoiceFileRequired`),
  nasce `Status=Pending`, precisa de ação explícita de Confirmar/Cancelar
  depois.
- `InvoiceItem` deixou de existir (confirmado — `endpoints/invoice-item/`
  não está mais no client gerado). Esta aba não lista nem referencia itens
  de nota.

## 3. Escopo

1. `Invoice.tsx` (`src/components/operations/tabs/`) — lista paginada das
   Invoices da Operação via `useGetApiOperationOperationIdInvoice`
   (shape real: `PagedDTOOfInvoiceDTO`).
2. Cada linha exibe, no mínimo: número, `Source` (`<Badge>` — cor/variant
   diferente para `RomaneioImport` vs `Manual`, label via
   `resolveInvoiceSourceLabel`), `Status` (`<Badge>` —
   `Pending`=`warning`, `Confirmed`=`success`, `Canceled`=`secondary`,
   label via `resolveInvoiceStatusLabel` — mesmo padrão visual dos badges
   de status já usados em `Containers.tsx`/`Responsible.tsx`), datas
   (`entryDate`/`exitDate`/`exitTime` quando presentes), valores
   (`totalInvoiceValue`/`totalProductsValue` quando presentes),
   documentos anexados (`documents[]`, contagem e/ou lista de nomes de
   arquivo).
3. Ação **Criar Nota Fiscal manual** — modal com formulário
   `react-hook-form` + `zodResolver` sobre
   `PostApiOperationOperationIdInvoiceBody` (schema gerado). Upload de
   arquivo(s): ver §0.1/§14 `D-NEW` — **decisão de escopo desta rodada**:
   enquanto o Core não expõe um `Files` multipart funcional no endpoint
   de criação de Invoice, o upload de arquivo(s) reusa o padrão já
   existente e funcional de `Documents.tsx`
   (`postApiOperationOperationIdDocument`, `InputFileSingle`, um arquivo
   por chamada, `Content-Type: multipart/form-data` de verdade) marcando
   o documento com `InvoiceId` = id da Invoice recém-criada (`Document`
   já tem esse campo pronto e testado, `PostApiOperationOperationIdDocumentBody.InvoiceId`).
   Fluxo de 2 passos: `POST invoice` (sem `Files`, já que esse campo do
   Core não é utilizável hoje) → para cada arquivo selecionado no
   formulário, `POST document` com `InvoiceId` setado. Ver §8/§14.
4. Ação **Confirmar** / **Cancelar** — visível só em linhas
   `Status=Pending` **e** `Source=Manual`. Usa
   `usePostApiOperationOperationIdInvoiceIdConfirm`/`...Cancel`
   (confirmado sem mudança de shape, corpo `{ note: string }`).
5. Sem edição de Invoice já criada (nem `RomaneioImport` nem `Manual`) —
   `putApiOperationOperationIdInvoiceId` existe no client gerado mas
   nada nesta SPEC aciona edição — fora do escopo (Core não documenta
   regra de negócio pra isso nesta árvore).

## 4. Fora do escopo

- Qualquer tela/hook de `InvoiceItem` — extinto, não existe mais no
  client gerado.
- Estufagem (`CargoUnit`, Modo A/B) — SPEC-07-11 (outra branch, fora
  deste território).
- Edição de Invoice já `Confirmed`/`Pending` via `putApiOperationOperationIdInvoiceId`.
- Import de NF-e/XML da SEFAZ.
- Geração automática de Invoice a partir do romaneio — acontece no
  backend; a aba só **lê** o resultado.
- Corrigir `FormFileUploadTransformer.cs` do Core para suportar
  `List<IFormFile>` — fora do território deste agente (`warren/Core`).
  Se o usuário decidir por essa via em `D-NEW`, é trabalho de outro
  agente/PR no Core, não desta SPEC.

## 5. Requisitos funcionais

- **RF1** — Lista consome só `useGetApiOperationOperationIdInvoice` (hook
  Orval gerado), nunca dado mockado.
- **RF2** — Distinção visual obrigatória de `Source` e `Status` em cada
  linha (badges), usando `invoiceSourceOptions`/`invoiceStatusOptions`
  (`src/api/generated/static/`) + `resolveInvoiceSourceLabel`/
  `resolveInvoiceStatusLabel`.
- **RF3** — Criação manual de Invoice usa `react-hook-form` +
  `zodResolver` sobre `PostApiOperationOperationIdInvoiceBody` (schema
  gerado). Upload de arquivo(s) via o fluxo de 2 passos do §3 item 3
  (reuso de `postApiOperationOperationIdDocument` com `InvoiceId`), **não**
  via o campo `Files` do próprio `PostApiOperationOperationIdInvoiceBody`
  (inutilizável hoje, §0.1). Regra "≥1 arquivo obrigatório": o schema
  gerado **não** expressa isso (`Files` nem é usado; nada no schema de
  Invoice teria como validar quantidade de documentos que serão criados
  depois, em chamadas separadas) — então o gate de "≥1 arquivo" é
  **só estado local da UI** (desabilitar submit até ter 1+ arquivo
  selecionado no formulário), nunca `.min()` inventado num schema Zod
  (regra 2 do AGENTS.md) — e o erro real de negócio, se o usuário
  conseguir burlar a UI, vem do 400 do servidor na criação do `Document`
  ou é simplesmente não replicável (a Invoice já existe `Pending` sem
  documento se a segunda chamada falhar — ver risco R5).
- **RF4** — Ação Confirmar/Cancelar só aparece para `Status=Pending` e
  `Source=Manual`; dispara `usePostApiOperationOperationIdInvoiceIdConfirm`/
  `usePostApiOperationOperationIdInvoiceIdCancel`.
- **RF5** — Sem silent-fail (herda RF2 da SPEC-07-02): toda falha de
  chamada (criação da invoice, criação de cada documento, confirmar,
  cancelar) mostra toast de erro; nenhuma etapa falha em silêncio.

## 6. Requisitos não funcionais

- RNF1 — `bun run check` + `lint` passam.
- RNF2 — Zero Zod à mão — todo schema de formulário vem de `just map`
  (`PostApiOperationOperationIdInvoiceBody`,
  `PostApiOperationOperationIdDocumentBody`) ou remapeamento de shape
  (regra 2).
- RNF3 — Nenhum hook/tipo de `InvoiceItem` é referenciado (não existe
  mais no client gerado, não há como violar isso por acidente).

## 7. Contrato de rota

Sem rota própria (precedente de SPEC-07-02 a 07-09, D2 revertida naquela
SPEC) — componente comum montado pelo shell de
`/administrative/operations/$id` via estado local (`useState<Tab>`), nova
entrada `"invoice"` no union de abas do shell.

## 8. Camada de dados

Hooks Orval gerados (nomes reais confirmados pós-`just map`):

- Leitura lista: `useGetApiOperationOperationIdInvoice(operationId,
  params)` — `GET /api/operation/{operationId}/invoice`, retorna
  `PagedDTOOfInvoiceDTO` (paginação `Offset`/`Limit`, mesmo padrão das
  outras abas). `queryKey` = `getGetApiOperationOperationIdInvoiceQueryKey`.
- Criação manual (passo 1 — dados da nota): `usePostApiOperationOperationIdInvoice`
  — `POST /api/operation/{operationId}/invoice`, corpo
  `PostApiOperationOperationIdInvoiceBody` **sem** preencher `Files` (campo
  inutilizável, §0.1). Retorna `InvoiceDTO` (contém `id` da Invoice
  criada).
- Criação manual (passo 2 — anexos, N chamadas): `usePostApiOperationOperationIdDocument`
  (já existente, usado por `Documents.tsx`) — uma chamada por arquivo
  selecionado, `{ File: file, InvoiceId: invoiceCriada.id, Type: <definir
  default>, Title: <definir> }`. Ver §14 `D-NEW` pra decisão de fallback
  se algum upload falhar após a Invoice já ter sido criada (R5).
- Confirmar: `usePostApiOperationOperationIdInvoiceIdConfirm` — `POST
  /api/operation/{operationId}/invoice/{id}/confirm`, corpo
  `InvoiceStatusChange` (`{ note: string, max 500 }`).
- Cancelar: `usePostApiOperationOperationIdInvoiceIdCancel` — `POST
  /api/operation/{operationId}/invoice/{id}/cancel`, mesmo corpo.

`queryKey` = path do Core em todos os casos, herdado do Orval — nada
inventado.

## 9. UI

- Componente novo: `src/components/operations/tabs/Invoice.tsx`, mesmo
  formato de `Documents.tsx`/`Containers.tsx` (tabela + modal de criação +
  paginação via `ListPagination` + `useSsrSafeQuery`).
- Badges de `Source`/`Status`: `<Badge bg="...">` inline (react-bootstrap),
  seguindo o padrão real do projeto — não existe nem é preciso criar um
  componente de badge compartilhado (§0.1).
- Formulário de criação manual: `Modal` do react-bootstrap (mesmo padrão
  de `Documents.tsx`/`Containers.tsx`, não `CrudRecordModal` — este
  formulário mistura campos de `Invoice` com um upload de múltiplos
  arquivos que dispara chamadas separadas depois do submit principal,
  fora do que `CrudRecordModal` genérico cobre).
- Upload: **`InputFileSingle` usado N vezes** (um campo de arquivo por
  "slot" que o usuário adicionar) OU um componente de lista de arquivos
  local (estado `File[]` + input de arquivo simples que agrega ao array)
  — decisão de implementação, documentar a escolha no código quando
  implementar; **não** é `InputFileMulti` (§0.1 invalidou a premissa de
  que o backend aceitaria N arquivos numa única chamada multipart).

## 10. i18n

Namespace existente `administrative-operations.json`, chave nova
`invoice.*` (lista, badges de Source/Status, formulário de criação,
ações de Confirmar/Cancelar, mensagens de erro parcial do fluxo de 2
passos — ver R5), mesma partição usada pelas demais abas, 4 locales,
`pt-BR` fonte de verdade.

## 11. Arquivos esperados

| Arquivo                                                    | Ação                                          |
| ----------------------------------------------------------- | ---------------------------------------------- |
| `src/components/operations/tabs/Invoice.tsx`                | criar                                          |
| `src/routes/.../operations/$id/index.tsx`                   | editar — nova aba `invoice` no shell           |
| `src/i18n/dictionaries/*/administrative-operations.json`    | editar — chaves `invoice.*`                    |

## 12. Critérios de aceitação

| #   | Critério                                                                                          |
| --- | -------------------------------------------------------------------------------------------------- |
| CA1 | Aba lista Invoices reais da operação, distinguindo `Source` e `Status` visualmente                |
| CA2 | Criação manual exige ≥1 arquivo (gate de UI, §5 RF3) e usa o fluxo de 2 chamadas do §3 item 3      |
| CA3 | Confirmar/Cancelar só aparecem em `Pending`+`Manual` e mudam o status observável na lista          |
| CA4 | Nenhum hook/tipo de `InvoiceItem` é referenciado em código novo                                    |
| CA5 | `bun run check` + `lint` passam                                                                    |

## 13. Riscos

- **R4 — Quirks de anotação do Core em campos `[FromForm]` multipart
  complexos** (`Number` sai `.optional()` no Zod gerado apesar de
  `[Required]` no Core). Sem impacto funcional (servidor ainda valida em
  runtime), só perde validação client-side antecipada nesse campo
  específico — aceitável, não é motivo pra inventar `.min()`/`.nonempty()`
  a mais no schema (regra 2).
- **R5 — Consistência do fluxo de 2 chamadas (criar Invoice, depois N
  documentos).** Se a criação da Invoice for bem-sucedida mas algum
  upload de documento falhar no meio, a Invoice fica `Pending` sem (ou
  com só parte dos) anexo(s) — o Core não expõe transação atômica pra
  isso (o `Files` do endpoint de Invoice existiria pra resolver isso
  atomicamente, mas está inutilizável, §0.1). Mitigação mínima nesta
  SPEC: RF5 (toast de erro claro por chamada) + mensagem indicando que a
  nota foi criada mas nem todos os arquivos subiram, permitindo tentar de
  novo (reusar o botão de anexar da aba Documentos, já existente,
  passando o `InvoiceId`). Não é solução completa — registrar como
  limitação conhecida na implementação.
- **R6 — Se o Core corrigir `FormFileUploadTransformer.cs` e regenerar
  antes desta SPEC ser implementada**, o fluxo de 2 chamadas vira débito
  a simplificar (voltar pra 1 chamada com `Files` de verdade) — não
  reescrever esta SPEC preventivamente; tratar como follow-up quando/se
  acontecer.

## 14. Decisões

**D1 — fechada** (herdada, revisada). Tipo de anexo: qualquer tipo de
arquivo (PDF, imagem, etc.), sem preview de imagem forçado. Mecanismo
mudou de `InputFileMulti` numa chamada multipart única para N chamadas de
`InputFileSingle` via `postApiOperationOperationIdDocument`, por causa do
achado técnico de §0.1 — a intenção de negócio (aceitar qualquer tipo de
arquivo) continua igual, só o transporte muda.

**D2 — fechada.** A regra "≥1 arquivo obrigatório" **não** vem expressa
no schema Zod gerado (nem faria sentido vir, já que o upload não passa
mais pelo schema de criação da Invoice, §0.1/RF3). Gate fica só do lado
da UI (estado local), erro de negócio real fica a cargo do que o servidor
já valida em cada chamada individual.

**D3 — fechada.** Nomes reais confirmados por inspeção do client gerado:
`usePostApiOperationOperationIdInvoice` (criação),
`usePostApiOperationOperationIdInvoiceIdConfirm`/`...Cancel` (mudança de
status, shape idêntico ao anterior), `useGetApiOperationOperationIdInvoice`
(lista). Ver §8.

**D-NEW — RESOLVIDA (2026-09-15).** Usuário escolheu a **opção 2**: o
Core corrigiu `FormFileUploadTransformer` pra reconhecer
`List<IFormFile>`/`IFormFile[]` (commit no Core, branch
`spec-14-16-integration`), e o `just map` foi rerodado nesta branch —
`postApiOperationOperationIdInvoiceBody.Files` agora é `(Blob | File)[]`
real, `multipart/form-data` de verdade, confirmado sem regressão no
upload de arquivo único (`Document.File`). **RF3 volta ao desenho
original**: upload real de N arquivos na própria criação da Invoice, uma
chamada, sem o workaround de 2 chamadas nem o gap de
`InvoiceDTO.documents[]` descrito abaixo (mantido só como registro
histórico da investigação).

<details>
<summary>Registro histórico — análise antes da correção do Core</summary>

```
[NEEDS_DECISION] (RESOLVIDO — ver acima)

D-NEW — O que fazer com o campo `Files` quebrado no Core (§0.1)?

O endpoint de criação de Invoice manual do Core
(`POST /api/operation/{operationId}/invoice`) deveria aceitar N arquivos
binários (`List<IFormFile> Files`, exigido em ≥1 no servidor), mas o
plugin de geração de OpenAPI do Core (`FormFileUploadTransformer.cs`) só
trata `IFormFile`/`IFormFileCollection` únicos, não array — o client
gerado saiu com `Files: string[]` enviado como
`application/x-www-form-urlencoded`, que não sobe arquivo binário nenhum.

Opções:

1. **Implementar agora com o workaround de 2 chamadas** (como esta SPEC
   já desenha em §3/§8/§9: criar a Invoice sem `Files`, depois um
   `POST /api/operation/{operationId}/document` por arquivo com
   `InvoiceId` setado). Vantagem: desbloqueia a aba inteira já nesta
   rodada, reusa um caminho já testado (`Documents.tsx`/SPEC-07-06).
   Desvantagem: não é atômico (R5) e — **confirmado lendo o código do
   Core** (`Controllers/Operation/Invoice/Invoice.Cruid.cs` linha ~110,
   `InvoiceDocumentModel.Create(invoice.Id, invoiceFile.Id)` só é chamado
   dentro do próprio `POST invoice`) — **um `Document` genérico criado com
   `InvoiceId` NÃO aparece em `InvoiceDTO.documents[]`**. São duas tabelas
   diferentes: `InvoiceDocumentModel` (populada só pelo upload multipart
   nativo do endpoint de Invoice, hoje quebrado) vs. `DocumentModel`
   genérico (`operations_documents`, o que a aba Documentos já usa, aceita
   um `InvoiceId` de referência solto mas não alimenta o array de
   documentos da própria nota). Ou seja, a opção 1 funciona como
   "anexar documentos avulsos à operação, e por acaso guardando o id da
   invoice", **não** como "a nota fiscal ter os arquivos que o Core
   espera em `InvoiceDTO.documents[]"` — a aba mostraria a lista de
   documentos genéricos filtrada por `InvoiceId` (nova capacidade a
   construir, o hoje `GET /api/operation/{operationId}/document` não
   filtra por `InvoiceId` nos params gerados — outro gap a resolver na
   implementação se a opção 1 for escolhida) em vez do campo
   `documents[]` nativo da própria `InvoiceDTO`.

2. **Reportar o gap pro time do Core** (estender
   `FormFileUploadTransformer.IsFormFileType`/schema pra reconhecer
   `List<IFormFile>` como array de binário, gerar
   `multipart/form-data` com array de arquivos de verdade), esperar o
   fix + novo `just map`, só então implementar RF3 como desenhado
   originalmente (upload real na criação, 1 chamada). Vantagem: contrato
   correto, atômico, sem o risco R5/pergunta da opção 1. Desvantagem:
   esta SPEC continua parcialmente bloqueada (RF1/RF2/RF4/RF5 dá pra
   fazer já; RF3 fica esperando).

3. **Implementar tudo, exceto a criação manual** nesta rodada (lista +
   badges + confirmar/cancelar), deixar o botão "Criar Nota Fiscal
   manual" fora até a opção 2 acontecer. Meio-termo entre 1 e 2.

Esta é uma decisão técnica de arquitetura de dados (se `Document`
avulso com `InvoiceId` é equivalente ao que o `InvoiceDTO.documents[]`
deveria conter), não uma decisão de negócio já fechada — por isso
registrada aqui em vez de assumida.

Aguardando decisão do usuário.
```

</details>

---

**Status:** `WAITING_APPROVAL`. D1/D2/D3/D-NEW todas fechadas. §3/§8/§9
precisam de uma pequena revisão (remover o desenho de workaround de 2
chamadas que foi escrito enquanto D-NEW estava aberta, voltar pro upload
real de N arquivos numa chamada só) antes de `APROVAR SPEC-07-10` virar
código — não é decisão nova, é só destravar o texto pra refletir a
decisão já tomada.
