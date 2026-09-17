# SPEC-71 — Remover seção mock "Relatórios" do modal de detalhes do cliente

- **ID:** SPEC-71
- **Nome:** remove-client-mock-reports-section
- **Status:** IMPLEMENTED
- **Autor:** portal-dev-agent (rascunho, 2026-09-16 — usuário apontou via
  screenshot: "remover essa seção do modal de detalhes do cliente... não
  faz sentido")
- **Área:** `src/routes/_dashboard/_internal/administrative/clients/index.tsx`
- **Depende de:** nenhuma.

---

## 1. Objetivo

Remover a seção mock "Relatórios" (tabela fake de relatórios/histórico)
que aparece no modal de visualização (`mode="view"`) do cadastro de
Cliente — decisão explícita do usuário de que a seção não faz sentido
ali.

## 2. Contexto (achado)

`administrative/clients/index.tsx:105-168` define `MockClientReport`/
`buildMockReports`/`ClientReportsSection` — uma tabela com 2 linhas de
dado 100% hardcoded (`"Resumo de operações do trimestre"`, `"Extrato de
romaneios"`), anexada só ao modo `view` do `CrudRecordModal` via
`extraContent` (linha ~439). Já vinha comentada como mock desde a
implementação original (`specs/05-administrativo-clientes`, hoje fora do
diretório `specs/` — spec antiga arquivada/renumerada, sem rastro direto
no `specs/` atual), classificada como "Relatórios operacionais" faltante
no mapa de paridade Portal×Core, geração real fora de escopo daquela
spec. Nenhuma spec atual documentava a remoção — ainda não tinha sido
feito.

## 3. Escopo

1. Remover `ClientReportsSection` (componente), `buildMockReports`
   (função) e `MockClientReport` (tipo) de
   `administrative/clients/index.tsx`.
2. Remover a prop `extraContent` do `CrudRecordModal` (não há mais
   conteúdo extra pro modo `view`).
3. Remover imports que ficam sem uso após a remoção: `Table` (de
   `react-bootstrap`, só usado nessa seção — `Card` continua em uso no
   resto do arquivo) e `MockDataBanner`.
4. Chaves i18n `administrative-clients.detail.reports*` (title/colName/
   colType/colGeneratedAt/colStatus) ficam órfãs nos 4 dicionários — não
   removidas nesta SPEC (limpeza de i18n não solicitada, chave inofensiva
   sem consumidor, mesmo precedente da SPEC-65/documents.preview).

## 4. Fora do escopo

- Qualquer implementação real de relatórios de cliente (endpoint no Core
  não existe — fora do território deste agente).
- Remover chaves i18n órfãs.
- Qualquer outra seção do modal de cliente (dados cadastrais via `fields`
  seguem intocados).

## 5. Requisitos funcionais

- **RF1** — Modal de visualização de Cliente não mostra mais a seção
  "Relatórios" nem o `MockDataBanner` associado a ela.
- **RF2** — Modo `create`/`edit` do mesmo modal permanece inalterado (já
  não usava `extraContent`).
- **RF3** — Nenhum import não utilizado sobra no arquivo.

## 6. Não funcionais

Nenhuma regressão em `bun run check`/`bun run lint`.

## 7. Camada de dados

Não se aplica — remoção de dado mock local, nenhum hook/query tocado.

## 8. UI

- `administrative/clients/index.tsx`: remoção de componente/função/tipo/
  prop/imports conforme §3.

## 9. i18n

Nenhuma chave nova; chaves órfãs mantidas (ver §3.4).

## 10. Arquivos esperados

- `src/routes/_dashboard/_internal/administrative/clients/index.tsx`

## 11. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Modal `view` de Cliente não mostra mais a seção "Relatórios" |
| CA2 | Nenhum import/função/tipo órfão sobra no arquivo |
| CA3 | `bun run check` + `bun run lint` sem regressão |

## 12. Riscos

Nenhum — remoção de bloco 100% mock, sem consumidor de dado real.

## Implementation Notes

- **Arquivo alterado:**
  `src/routes/_dashboard/_internal/administrative/clients/index.tsx`.
- **RF1/RF2:** removidos `MockClientReport`, `buildMockReports`,
  `ClientReportsSection`, e a prop `extraContent` inteira do
  `CrudRecordModal` (não só o valor — a prop não é mais passada).
- **RF3:** removidos os imports `Table` (de `react-bootstrap`) e
  `MockDataBanner` (de `@/components/ui/mock-data-banner`), ambos sem
  outro consumidor no arquivo.
- **Comandos executados:**
  - `bun run check` (tsc --noEmit) — **VERIFIED**, sem erros.
  - `bun run lint` — **VERIFIED**, baseline mantido.
- **Critérios de aceitação:**

  | # | Critério | Status |
  | --- | --- | --- |
  | CA1 | Seção "Relatórios" removida do modal `view` | PASS |
  | CA2 | Sem import/função/tipo órfão | PASS |
  | CA3 | `bun run check` + `bun run lint` sem regressão | PASS |
