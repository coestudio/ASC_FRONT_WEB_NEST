# SPEC-47 — Investigação: import de romaneio "some" (wizard mostra sucesso, fardo não aparece na listagem)

- **ID:** SPEC-47
- **Nome:** romaneio-import-silent-noop
- **Status:** IMPLEMENTED (fix pontual do sintoma confirmado em código — toast
  enganoso; ver §7 pra causa raiz mais provável, não confirmável sem
  reprodução ao vivo, e pra o que fica em aberto)
- **Autor:** portal-dev-agent
- **Área:** `src/components/operations/tabs/Romaneio.tsx`
  (`ImportRomaneioModal.handleApply`), `src/i18n/dictionaries/*/administrative-operations.json`
- **Depende de:** nenhuma
- **Bloqueia:** nada
- **Contexto do pedido:** "Ao importar um arquivo `.xlsx` diferente na aba
  Romaneio de uma Operação, o wizard mostra tela de sucesso, mas o fardo
  importado não aparece na listagem depois." Arquivo real usado pra
  reproduzir: `Romaneio - MEDLOG - 23.07.xlsx` (2433 linhas).

---

## 1. Objetivo

Investigar por que o wizard de import de romaneio (`ImportRomaneioModal`,
fluxo `analyze` → revisão → `apply`) reporta sucesso sem o fardo aparecer
depois na listagem, e corrigir o que for confirmável em código do front sem
tocar `warren/Core` (fora do meu território).

## 2. Método de investigação

Sem ferramenta de automação de browser disponível neste agente (só
Bash/Read/Write/Edit) e sem credencial de superadmin do Core dev
(`Commands/Init.cs` gera senha aleatória no primeiro boot, não recuperável
sem acesso ao banco), não foi possível dirigir o fluxo completo via UI real
nem simular a chamada HTTP autenticada ao Core. A investigação foi feita por:

1. Leitura completa do fluxo front (`ImportRomaneioModal` em `Romaneio.tsx`).
2. Leitura do processamento correspondente no Core (território alheio, só
   leitura p/ diagnóstico — nenhuma edição):
   `Processors/RomaneioImport/RomaneioImport.{Parser,Classifier,Applier}.cs`.
3. Replicação em Python (`openpyxl`) da lógica exata de parse/validação de
   `RomaneioImportParser.ParseRow` sobre o arquivo real
   (`Romaneio - MEDLOG - 23.07.xlsx`), pra medir quantas linhas seriam
   válidas/inválidas e por quê, sem depender do Core rodando.

## 3. O que está confirmado em código (front)

- `handleApply` (linha ~461-487, antes do fix) monta o payload
  (`createNew`/`conflicts`/`deleteMissing`) a partir da seleção do usuário —
  por padrão **tudo vem pré-selecionado**: `new` inteiro em `selectedNew`,
  `missing` vazio (exclusão exige opt-in, correto), e todo campo divergente
  de cada conflito em `conflictFields` (`handleAnalyze`, linha ~416-435).
- No sucesso do `apply`, `onApplied()` chama `invalidateList` (linha
  ~130-133), que invalida `getGetApiOperationOperationIdRomaneioQueryKey(operationId)`
  **sem params** — o React Query faz match por prefixo por padrão
  (`exact: false`), então isso invalida também a variante com
  `Search/Offset/Limit` usada pela listagem de fato (`getGetApiOperationOperationIdRomaneioQueryOptions`
  em `getGetApiOperationOperationIdRomaneioQueryKey`, `romaneio.ts` linha 336-341).
  **A invalidação do cache está correta — não é a causa raiz.**
- **Achado real:** antes do fix, `handleApply` disparava
  `toast.success(...applySuccess...)` incondicionalmente sempre que a
  requisição HTTP retornava 2xx — mesmo quando `result.created`,
  `result.updated` e `result.deleted` são todos `0`. Nesse caso o toast
  aparecia verde, com a mensagem "Import aplicado: 0 criados, 0
  atualizados, 0 excluídos." — visualmente indistinguível de um sucesso
  real pra quem não lê o número, e explica exatamente o sintoma relatado
  ("mostra tela de sucesso, mas o fardo não aparece"): a listagem invalidada
  de fato **não tem nada novo pra mostrar**, porque nada foi persistido.

## 4. O que está confirmado em código (Core, só leitura)

- `RomaneioImportClassifier.Classify` usa `globalByCertificado` — um índice
  **global** (todas as operações), não só da operação atual — pra decidir
  se um `itemIdentifier` (`Fardos Certificação`) da planilha é `new`
  (não existe em lugar nenhum), `foreign` (existe em **outra** operação —
  bloqueado, não editável por este wizard) ou `unchanged`/`conflict`
  (existe **nesta** operação, sem/com divergência nos 10 campos de RN2).
- `RomaneioImportApplier.ApplyAsync` só conta em `created`/`updated`/`deleted`
  o que estiver em `createNew`/`conflicts`/`deleteMissing` do payload — linhas
  classificadas como `foreign`, `invalid` ou `duplicated` (dedup dentro do
  próprio arquivo, por `itemIdentifier` repetido) **nunca entram no apply**,
  não têm checkbox no wizard (`ImportForeignSection`/`ImportInvalidSection`/
  `ImportDuplicatedSection`, todas somente leitura) — followed corretamente
  pelo front, isso é comportamento pretendido, não bug.

## 5. Replicação do parse do arquivo real (Python, fora do Core)

Réplica de `RomaneioImportParser.ParseRow` sobre as 2433 linhas de dado do
arquivo `Romaneio - MEDLOG - 23.07.xlsx`:

| Métrica                                     | Valor |
| -------------------------------------------- | ----- |
| Linhas de dado totais                        | 2433  |
| Linhas válidas (todos os campos obrigatórios OK, sem erro de peso) | 2349  |
| Linhas inválidas                             | 84    |
| Motivo das 84 inválidas                      | linha inteiramente em branco (certificado, código, instrução, N.F. e lote todos vazios — provavelmente linhas de rodapé/formatação da planilha) |
| `itemIdentifier` (`Fardos Certificação`) duplicado dentro do arquivo, entre as linhas válidas | 0 (nenhum) |
| Erro de peso bruto ≠ líquido + tara           | 0 |
| Tipo de célula de `Fardos Certificação`/`Cod. Fardo` no arquivo | texto (`shared string`), não número — descarta a hipótese inicial de perda de precisão de `double` do Excel pra identificador de 19-20 dígitos armazenado como número (`XlsxSpreadsheetReader.CellString`, `GetNumber().ToString("R")`) |

Conclusão desta etapa: **o arquivo em si é limpo** — 2349 linhas válidas,
sem duplicidade de identificador, sem erro de peso. As 84 rejeitadas são
linhas em branco genuínas, corretamente sinalizadas pelo wizard na seção
"Linhas inválidas" (não silenciosas).

## 6. Hipótese mais provável pra causa raiz (não confirmada — precisa de reprodução ao vivo)

A operação de teste usada pra reproduzir ("Cliente Teste Fix") já tinha,
antes do teste, **~2350 fardos cadastrados** (visível no screenshot
anexado: "1 de 470" páginas × 5 itens/página = 470 × 5 = 2350) — um número
praticamente idêntico às 2349 linhas válidas do arquivo `MEDLOG - 23.07`.
Isso é fortemente sugestivo de que o arquivo testado é o **mesmo lote** (ou
um lote quase idêntico) que já havia sido importado antes para essa mesma
operação — nesse caso, a classificação correta do Core pra cada linha seria
`unchanged` (sem diff nos 10 campos de RN2), não `new`: **não há nada de
fato para criar**, e o `apply` reportando `0/0/0` seria o comportamento
correto, não uma falha de persistência.

Essa hipótese **não pôde ser confirmada** porque este agente não tem
ferramenta de automação de browser nem credencial de superadmin do Core
dev pra rodar o fluxo `analyze` de verdade contra o arquivo e ler
`summary.unchanged`/`summary.new`/`summary.conflicts` reais.

## 7. Fix aplicado (front, confirmado em código, sem depender da hipótese do §6)

Independente de qual seja a causa exata do `0/0/0` num caso específico
(reimport idêntico, tudo `foreign`, tudo `duplicated` no arquivo, etc.), o
front tinha um bug real e autocontido: **tratava qualquer 2xx do `apply`
como sucesso pleno**, sem checar se `created + updated + deleted` era zero.
Corrigido em `Romaneio.tsx` (`ImportRomaneioModal.handleApply`):

- Se `created === 0 && updated === 0 && deleted === 0`: `toast.warn(...)`
  com a nova chave `administrative-operations.romaneio.import.toast.applyNoop`
  ("Nada foi importado: nenhum fardo selecionado gerou criação,
  atualização ou exclusão.") em vez do toast de sucesso — comunica ao
  usuário, no momento em que acontece, que a operação não teve efeito.
- Caso contrário, mantém o `toast.success` existente (`applySuccess`),
  inalterado.
- `onApplied()`/`onClose()` continuam rodando nos dois casos (o modal
  fecha e a lista é invalidada de qualquer forma — não há razão pra manter
  o wizard aberto num no-op real, já que a seleção do usuário foi
  respeitada e processada, só não gerou mudança).

Chave nova adicionada nos 4 locales (`pt-BR`, `en`, `es`, `zh`) em
`src/i18n/dictionaries/<locale>/administrative-operations.json`.

## 8. Fora de escopo / não alterado

- Nenhuma mudança em `warren/Core` — território alheio. Se a causa raiz
  confirmada (via reprodução ao vivo, com o usuário testando um arquivo que
  ele sabe conter fardos **realmente novos** pra aquela operação) for outra
  (ex. um bug real na classificação do Core), a correção é uma spec nova,
  com o achado preciso, delegada ao lado Core.
- Nenhuma mudança na lógica de invalidação de cache (`invalidateList`) —
  investigada e confirmada correta, não precisa de ajuste.
- Nenhuma mudança nas seções somente-leitura do wizard (`foreign`/`invalid`/
  `duplicated`) — comportamento correto e já comunicado ao usuário na tela
  de revisão.

## 9. Critérios de aceitação

| # | Critério                                                                                          | Status |
| - | -------------------------------------------------------------------------------------------------- | ------ |
| 1 | `apply` com `created+updated+deleted > 0` continua mostrando toast verde de sucesso com as contagens | PASS (código inalterado nesse ramo) |
| 2 | `apply` com `created+updated+deleted === 0` mostra toast de aviso, não de sucesso                   | PASS (código novo, `bun run check`/`lint` verdes) |
| 3 | Chave `applyNoop` presente nos 4 locales com o mesmo shape                                          | PASS |
| 4 | Nenhuma mudança em `warren/Core`                                                                    | PASS |

## 10. Riscos / limitações conhecidas

- Este fix trata o **sintoma visível** (toast enganoso) de forma correta e
  geral, mas não resolve (nem poderia, sem tocar o Core) um cenário em que
  o Core genuinamente falhasse em persistir uma linha que deveria ter sido
  criada — isso exigiria reprodução ao vivo com um arquivo confirmadamente
  contendo fardos novos pra uma operação vazia/conhecida, fora do alcance
  desta sessão (sem browser tool, sem credencial).
- Recomendação pro usuário: repetir o teste against uma operação nova ou
  vazia, com um arquivo cujos `itemIdentifier` sejam garantidamente inéditos
  no banco — com o fix, se o resultado ainda for `0/0/0` mesmo assim, o
  toast de aviso vai deixar isso óbvio na hora, e nesse caso sim há um bug
  real a investigar no Core (`RomaneioImportClassifier`/`RomaneioImportApplier`).
