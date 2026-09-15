# SPEC-07-10 — Operações: aba Nota Fiscal (Invoice)

- **ID:** SPEC-07-10
- **Nome:** operation-invoice
- **Status:** BLOCKED
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/components/operations/tabs/Invoice.tsx` (nova),
  `src/routes/_dashboard/_internal/administrative/operations/$id/index.tsx`
  (editado — nova aba no shell), `src/i18n/dictionaries/*/
administrative-operations.json` (editado)
- **Depende de:** SPEC-00, SPEC-02, SPEC-SHARE-01 (`InputFileMulti`, para
  o upload de múltiplos anexos na criação manual — ver §3 e §14),
  SPEC-07-01 (namespace `administrative-operations.json`), SPEC-07-02
  (shell de abas). **Depende também, fora deste repo, de**
  `warren/Core` **SPEC-14** (`invoice-source-and-documents`) **e
  SPEC-15** (`romaneio-auto-invoice`, depende de 14) — ver §0. A SPEC-13
  original do Core (`specs/13-romaneio-invoice-container-flow/spec.md`)
  virou só o índice dessas ondas; esta aba **não** depende de SPEC-16
  (`cargo-unit-redesign`) nem SPEC-17 (`cargo-stuffing-gates`) — pode
  destravar e ir a implementação assim que 14+15 estiverem prontas no
  Core, em paralelo ao trabalho de 16/17 (que bloqueiam a SPEC-07-11).

---

## 0. Bloqueio (leia antes de tudo)

Esta SPEC nasce **`BLOCKED`**, não `DRAFT` comum. Motivo: o contrato que
ela consome — `Source`/`EntryDate`/`ExitDate`/`ExitTime`/
`TotalInvoiceValue`/`TotalProductsValue` em `InvoiceModel`, criação manual
multipart exigindo anexo, `InvoiceDocument` — é definido por
`warren/Core/specs/14-invoice-source-and-documents/spec.md` (campos novos
+ anexo obrigatório) e `warren/Core/specs/15-romaneio-auto-invoice/
spec.md` (geração automática de NF pelo import de romaneio, depende de
14) — as duas ondas em que a antiga SPEC-13 monolítica do Core
(`specs/13-romaneio-invoice-container-flow/spec.md`, hoje só o índice) foi
dividida que interessam a esta aba. Nenhuma das duas está implementada
ainda. O client gerado atual
(`src/api/generated/endpoints/invoice/invoice.ts`, `model/
invoiceCreate.ts`, `model/invoiceStatus.ts`) reflete o modelo
**pré-SPEC-14/15**: `InvoiceCreate` não tem `Source` nem os campos de data/
valor novos, não é multipart, não exige anexo. `InvoiceItem` (extinto só
mais adiante, pela SPEC-16 `cargo-unit-redesign` do Core — fora da
dependência desta aba, ver §4) ainda existe hoje como controller/hook
gerado (`endpoints/invoice-item/invoice-item.ts`) e pode continuar
existindo mesmo depois de 14+15 estarem prontas — esta SPEC simplesmente
não o referencia (RF1/RNF3), independente de quando ele for removido.

Por regra de território (`portal-dev-agent`, §0 regra 2/território):
**endpoint do Core que não existe no client gerado é `[NEEDS_DECISION]` —
não decido, não invento.** Esta SPEC documenta o desenho pretendido para
quando o contrato existir, mas **não pode avançar de `BLOCKED` para
`APPROVED`/`IN_PROGRESS`** até que, nesta ordem:

1. `warren/Core` SPEC-14 e SPEC-15 sejam aprovadas e implementadas (fora
   deste território — não é o `portal-dev-agent` que decide isso; SPEC-16
   e SPEC-17 do Core **não** precisam estar prontas para esta aba, só
   para a SPEC-07-11);
2. `just map` seja rodado no NewPortal e o diff de
   `src/api/generated/**` confirme os novos hooks/DTOs (`InvoiceSource`,
   campos novos de `InvoiceModel`/DTO, `InvoiceDocument`, criação manual
   multipart);
3. Alguém revise esta SPEC contra o shape **real** gerado (nomes de
   endpoint, formato exato do multipart, nome do campo de arquivos) e
   resolva as decisões pendentes do §14 abaixo, porque a SPEC-14/SPEC-15
   do Core deixam explicitamente em aberto ("decisão de implementação,
   não de negócio") o nome exato dos endpoints e o shape de request/
   response.

Enquanto isso não acontece, **nenhum código desta SPEC deve ser
escrito.**

## 1. Objetivo

Nova aba **Nota Fiscal** no shell de detalhe de Operação
(`/administrative/operations/$id`): listar as `Invoice`s da operação
distinguindo visualmente origem (`Source`: geradas automaticamente pelo
import de romaneio vs. criadas manualmente) e status (`Pending`/
`Confirmed`/`Canceled`); permitir criar uma Nota Fiscal manual com upload
de múltiplos arquivos; permitir confirmar/cancelar uma Nota Fiscal
`Pending`.

Hoje **não existe** nenhuma tela de Invoice no NewPortal — é aba nova, não
migração de UI-only existente.

## 2. Contexto

Legado (`warren/Portal`): sem equivalente direto — não há tela de Invoice
no design antigo mapeado pelas SPECs 07-01 a 07-09. Contrato de negócio:
`warren/Core/specs/13-romaneio-invoice-container-flow/spec.md` (ver §0).

Resumo do que muda no domínio (não decisão desta SPEC, já fechado no
Core):

- Toda `Invoice` nascida do import de romaneio (`Source=RomaneioImport`)
  já nasce `Status=Confirmed`, sem anexo — o operador só visualiza.
- `Invoice` manual (`Source=Manual`) exige ≥1 arquivo anexado já na
  criação, nasce `Status=Pending`, precisa de ação explícita de
  Confirmar/Cancelar depois.
- `InvoiceItem` deixa de existir — esta aba **não** lista nem referencia
  itens de nota, só a nota em si. Rastreabilidade por item passa a
  aparecer, se necessário, na aba Containers (via `CargoUnit`, ver
  SPEC-07-11), não aqui.

## 3. Escopo

1. `Invoice.tsx` (`src/components/operations/tabs/`) — lista paginada das
   Invoices da Operação (hook Orval gerado equivalente ao atual
   `useGetApiOperationOperationIdInvoice`, mas com o shape novo pós-SPEC-14/15
   do Core).
2. Cada linha exibe, no mínimo: número, `Source` (badge visual distinto —
   ex. cor/ícone diferente para `RomaneioImport` vs `Manual`), `Status`
   (badge `Pending`=amarelo/`Confirmed`=verde/`Canceled`=cinza, mesmo
   padrão de badge já usado em outras telas de status do projeto — révisar
   o componente de badge existente antes de criar um novo), datas
   (`EntryDate`/`ExitDate`/`ExitTime` quando presentes), valores
   (`TotalInvoiceValue`/`TotalProductsValue` quando presentes).
3. Ação **Criar Nota Fiscal manual** — modal com formulário
   `react-hook-form` + `zodResolver` sobre o schema gerado da criação
   manual (nome exato só existe depois do `just map`, hoje seria
   equivalente a um `InvoiceCreate` com campo de arquivo(s) adicionado).
   Upload via `InputFileMulti` (`layouts/Form/Fields`, já existe) —
   decisão fechada com o usuário: qualquer tipo de arquivo (PDF, imagem,
   etc.), **não** `InputPhotoMulti` (que força/otimiza para imagem) —
   múltiplos arquivos, sem tipo/slot fixo (a SPEC-14/SPEC-15 do Core não
   distingue tipo de documento, só "comprovante").
4. Ação **Confirmar** / **Cancelar** — visível só em linhas
   `Status=Pending` **e** `Source=Manual` (uma `Invoice` `RomaneioImport`
   nasce direto `Confirmed`, nunca passa por esse fluxo, ver §5 do Core).
   Reusa o padrão de `InvoiceStatusChange` (campo `note`) já existente no
   client gerado hoje (`postApiOperationOperationIdInvoiceIdConfirm`/
   `...Cancel`) — a SPEC-14/SPEC-15 do Core não anuncia mudança nesse endpoint
   específico, mas **confirmar contra o shape real pós-`just map`** antes
   de reusar às cegas (risco §12).
5. Sem edição de Invoice já criada (nem `RomaneioImport` nem `Manual`) —
   o Core não expõe isso (SPEC-14/SPEC-15 do Core §4, "fora do escopo": editar
   Invoice `Confirmed` fica em aberto como débito do próprio Core).

## 4. Fora do escopo

- Qualquer tela/hook de `InvoiceItem` — a extinção dele é escopo da SPEC-16
  (`cargo-unit-redesign`) do Core, **não** de SPEC-14/15; esta aba só
  precisa não referenciá-lo, independente de `endpoints/invoice-item/
invoice-item.ts` já ter desaparecido do client gerado ou não no momento
  em que 14+15 forem mapeadas (pode ainda existir, aguardando a SPEC-16 —
  não é sinal de bloqueio para esta aba, só não usar).
- Estufagem (`CargoUnit`, Modo A/B) — é a SPEC-07-11 (depende de SPEC-16 +
  SPEC-17 do Core, não desta).
- Edição de Invoice já `Confirmed` — débito conhecido e aceito pelo
  próprio Core (SPEC-14 §4), não é gap desta SPEC de frontend.
- Import de NF-e/XML da SEFAZ — fora de escopo também no Core.
- Geração automática de Invoice a partir do romaneio — acontece
  inteiramente no backend (processor de import), a aba só **lê** o
  resultado; nenhuma ação de UI dispara isso (é a SPEC-07-04, aba
  Romaneio, que já existe e continua igual — só o efeito colateral no
  backend muda).

## 5. Requisitos funcionais

- **RF1** — Lista consome só hook(s) Orval gerado(s) pós-`just map` da
  SPEC-14/SPEC-15 do Core, nunca dado mockado nem o shape antigo de
  `InvoiceCreate`/`InvoiceDTO` pré-SPEC-14/15.
- **RF2** — Distinção visual obrigatória de `Source` e `Status` em cada
  linha da lista (badges), usando os enums gerados
  (`invoiceSourceOptions`/`invoiceStatusOptions` equivalentes, gerados por
  `just map`, mesmo padrão do `Select`/enum snapshot já usado em outras
  telas — 13-static-enum-snapshot-naming do NewPortal).
- **RF3** — Criação manual de Invoice usa `react-hook-form` +
  `zodResolver` sobre schema **gerado**, upload via `InputFileMulti`,
  exige pelo menos 1 arquivo antes do submit ser habilitado — **desde que
  essa regra já esteja expressa no schema Zod gerado** (ver §14 D2; se não
  estiver, o gate de "≥1 arquivo" fica só do lado do servidor e a UI
  apenas exibe o erro 400 devolvido, sem inventar `.min()` que não exista
  no schema gerado — regra 2 do AGENTS.md).
- **RF4** — Ação Confirmar/Cancelar só aparece para `Status=Pending` e
  `Source=Manual`; dispara os hooks equivalentes aos atuais
  `usePostApiOperationOperationIdInvoiceIdConfirm`/`...Cancel` (confirmar
  shape real pós-map).
- **RF5** — Sem silent-fail (herda RF2 da SPEC-07-02).

## 6. Requisitos não funcionais

- RNF1 — `bun run check` + `lint` passam.
- RNF2 — Zero Zod à mão — todo schema de formulário vem de `just map`
  sobre o contrato da SPEC-14/SPEC-15 do Core (ou remapeamento de shape, regra 2).
- RNF3 — Nenhum hook do client gerado **pré**-SPEC-14/15 (`invoice-item.ts`,
  `InvoiceCreate` sem `Source`) é usado como base de código novo.

## 7. Contrato de rota

Sem rota própria (segue o precedente das demais abas de SPEC-07-02 a
07-09, D2 revertida) — componente comum montado pelo shell de
`/administrative/operations/$id` via estado local
(`useState<Tab>`), nova entrada `"invoice"` no union de abas do shell.

## 8. Camada de dados

Hooks Orval gerados por `just map` sobre o contrato da SPEC-14/SPEC-15 do Core:

- Leitura: lista de Invoices por Operação (equivalente hoje a
  `useGetApiOperationOperationIdInvoice`, shape novo).
- Criação manual: mutação multipart (nome exato do endpoint definido pela
  implementação do Core, `POST /api/operation/{operationId}/invoice`
  segundo §9 da SPEC-14/SPEC-15 do Core).
- Confirmar/Cancelar: mutações equivalentes às atuais
  `usePostApiOperationOperationIdInvoiceIdConfirm`/`...Cancel` — **revisar
  se sobrevivem sem mudança de shape** depois do `just map` (a SPEC-14 do
  Core não anuncia mudança nelas, mas não garante explicitamente
  estabilidade de shape — checar antes de reusar sem revisão, RF4).

`queryKey` = path do Core, como em toda a camada de dados do projeto —
nada a inventar aqui, herda do Orval.

## 9. UI

- Componente novo: `src/components/operations/tabs/Invoice.tsx`.
- Badges de `Source`/`Status`: reusar componente de badge/status já
  existente no projeto (procurar em `src/components/ui/**` antes de criar
  um novo — fora do escopo desta SPEC inventar um componente de badge se
  já existir um genérico reusável; se não existir nenhum, registrar como
  `SCOPE CONFLICT` na implementação, não decidir sozinho criar um
  `components/ui` novo sem checar primeiro).
- Formulário de criação manual: modal (mesmo padrão de
  `CrudRecordModal`/modal próprio já usado em SPEC-07-05/07-06, decisão de
  qual dos dois na hora de implementar, documentar a escolha).
- Upload: `InputFileMulti` (`layouts/Form/Fields`), sem `accept`
  restritivo salvo indicação do Core.

## 10. i18n

Namespace existente `administrative-operations.json`, chave nova
`invoice.*` (lista, badges de Source/Status, formulário de criação,
ações de Confirmar/Cancelar) — mesma partição usada pelas demais abas
(SPEC-07-01 §criou o namespace, sub-SPECs editam), 4 locales, `pt-BR`
fonte de verdade.

## 11. Arquivos esperados

| Arquivo                                                    | Ação                                          |
| ----------------------------------------------------------- | ---------------------------------------------- |
| `src/components/operations/tabs/Invoice.tsx`                | criar (só depois do desbloqueio, ver §0)       |
| `src/routes/.../operations/$id/index.tsx`                   | editar — nova aba `invoice` no shell           |
| `src/i18n/dictionaries/*/administrative-operations.json`    | editar — chaves `invoice.*`                    |

## 12. Critérios de aceitação

| #   | Critério                                                                                          |
| --- | -------------------------------------------------------------------------------------------------- |
| CA1 | Aba lista Invoices reais da operação, distinguindo `Source` e `Status` visualmente                |
| CA2 | Criação manual exige ≥1 arquivo (client e/ou servidor, conforme §14 D2) e usa `InputFileMulti`     |
| CA3 | Confirmar/Cancelar só aparecem em `Pending`+`Manual` e mudam o status observável na lista          |
| CA4 | Nenhum hook/tipo de `InvoiceItem` é referenciado em código novo                                    |
| CA5 | `bun run check` + `lint` passam                                                                    |

## 13. Riscos

- **R1 — Contrato ainda não existe.** Ver §0. Risco central desta SPEC:
  qualquer implementação antes do `just map` real seria descartável.
- **R2 — Nome/shape exato dos endpoints é decisão de implementação do
  Core** (SPEC-14/SPEC-15 do Core §9, explicitamente "decisão de implementação,
  não de negócio") — esta SPEC de frontend usa nomes **ilustrativos**
  baseados no padrão atual (`postApiOperationOperationIdInvoiceIdConfirm`
  etc.); os nomes reais gerados por `just map` podem diferir e exigem
  ajuste desta SPEC antes de virar código.
- **R3 — Reuso do endpoint de Confirm/Cancel sem mudança anunciada** pode
  quebrar silenciosamente se a SPEC-14/SPEC-15 do Core alterar o DTO de
  `InvoiceStatusChange` como efeito colateral não documentado — checar o
  diff de `just map` linha a linha nesse arquivo também, não só nos
  pontos citados explicitamente na SPEC-14/SPEC-15 do Core.

## 14. Decisões

**D1 — fechada.** Tipo de anexo: `InputFileMulti` (`layouts/Form/Fields`)
— qualquer tipo de arquivo (PDF, imagem, etc.), **não** `InputPhotoMulti`.
Decisão do usuário, sem preview de imagem forçado; ver §3 item 3 e §9.

Decisões ainda pendentes:

```
[NEEDS_DECISION]

D2 — A regra "≥1 arquivo obrigatório" (SPEC-14/SPEC-15 do Core, RF3) vem
expressa no schema Zod gerado (Orval) ou só como validação 400 do
servidor sem reflexo no shape do schema?

Isso só pode ser respondido **depois** do `just map` trazer o schema real
— registrado aqui para não ser esquecido na hora da implementação. Se o
schema gerado não expressar isso (schemas de array de arquivo costumam
não ter `.min()` gerado pelo Orval para multipart), o frontend não pode
inventar essa validação (regra 2, zero Zod à mão) — nesse caso a UI só
desabilita o submit por estado local (não é "schema", é UX), e a
mensagem de erro real vem do 400 do servidor.

Aguardando o contrato real (pós `just map`) para fechar.

---

D3 — Numeração/nome exato dos endpoints reais.

A SPEC-14/SPEC-15 do Core deixa isso como "decisão de implementação, não de
negócio" (§9). Esta SPEC de frontend não pode fixar nomes de hook até o
`just map` rodar — quem retomar esta SPEC depois do desbloqueio precisa
atualizar §8 com os nomes reais antes de codar.

Aguardando `just map` pós-implementação da SPEC-14/SPEC-15 do Core.
```

---

**Status:** `BLOCKED`. Não implementar. Retomar só depois que
`warren/Core` SPEC-14 e SPEC-15 saírem de `DRAFT`, forem implementadas, e
`just map` trazer o contrato real (sem depender de SPEC-16/SPEC-17) —
então resolver D2/D3 acima (D1 já fechada, §14), seguir o ciclo normal
(`WAITING_APPROVAL` → aprovação explícita `APROVAR SPEC-07-10` →
implementação).
