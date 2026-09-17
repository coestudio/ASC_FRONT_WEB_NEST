# SPEC-61 — Portar hierarquia visual da aba Detalhes pro mock de `operational/operations/$id`

- **ID:** SPEC-61
- **Nome:** operational-mock-details-hierarchy
- **Status:** IMPLEMENTED
- **Autor:** portal-dev-agent (rascunho, 2026-09-16 — pente fino de UI/UX
  aprovado pelo usuário na sessão, 5 SPECs pequenas isoladas)
- **Área:** `src/routes/_dashboard/_internal/operational/operations/$id/index.tsx`
- **Depende de:** nenhuma.

---

## 1. Objetivo

Portar o mesmo tratamento visual que a aba "Detalhes" real
(`src/components/operations/tabs/Details.tsx`, SPEC-33) já tem — seções em
`.soft-card` com título com ícone, campo com rótulo discreto acima e valor
em destaque abaixo — para a seção "Detalhes" do mock de
`operational/operations/$id` (SPEC-08, ainda mock, D1 mantida: id da URL
não precisa bater com o real do Core).

## 2. Contexto (achados)

- `operational/operations/$id/index.tsx:187-218` (seção `section ===
  "details"`) usa `<div className="row g-3">` com `<div className="col-6
  col-md-4">` cru (sem `Row`/`Col` do react-bootstrap) e sem nenhum
  wrapper `.soft-card` — cada campo já segue o padrão "rótulo pequeno em
  cima, valor em destaque embaixo" (`<div className="small
  text-body-secondary">`/`<div className="fw-semibold">`), mas solto, sem
  agrupamento visual.
- `Details.tsx:39-46` (`DetailField`) e `:50-57` (`SectionTitle`) já
  implementam exatamente esse padrão dentro de `<section className="soft-card p-4">`
  (ver `Details.tsx:101-126` como exemplo de seção completa) — mesma
  estrutura a replicar aqui, sem importar o componente privado de
  `Details.tsx` (arquivo de rota não deve depender de componente interno
  de `components/operations/tabs`; a replicação usa `Row`/`Col` do
  react-bootstrap e classes Bootstrap puras, já ambos usados no mesmo
  arquivo hoje via outros imports).
- `operational/operations/$id/index.tsx` já importa `Badge`, `Button`,
  `Nav`, `Table` de `react-bootstrap` — `Row`/`Col` são adições triviais ao
  mesmo import.
- A aba já tem um rótulo de seção disponível via i18n
  (`operational.detail.sections.details.label`, usado hoje no `Nav.Link`
  do próprio tab) — reusável como texto do `SectionTitle` local.

## 3. Escopo

1. Trocar `<div className="row g-3">...</div>` da seção `details` por
   `<section className="soft-card p-4">` contendo:
   - um título de seção com ícone (`<h2 className="h6 text-body-secondary
     text-uppercase mb-3 d-flex align-items-center gap-2">`, mesmo padrão
     de `SectionTitle` de `Details.tsx`), ícone `bi-info-circle` (mesmo já
     usado na definição de `SECTIONS` para esta aba) + texto
     `t("operational.detail.sections.details.label")`;
   - os 5 campos existentes (`client`, `product`, `status`, `type`, `mode`)
     em `<Row className="g-3">` com `<Col md={4}>` (react-bootstrap),
     mantendo o mesmo `<div className="small text-body-secondary">`/
     `<div className="fw-semibold">` já usado em cada campo hoje.
2. Nenhuma mudança no dado mock (`MOCK_OPERATIONS`, `MockOperation`) — D1 da
   SPEC-08 continua valendo, ids não precisam bater com os reais.
3. Nenhuma mudança nas outras 3 seções da aba (`containers`, `operational`,
   `split`) — escopo restrito à seção "Detalhes".

## 4. Fora do escopo

- Consolidar este mock com o detalhe real da SPEC-07/SPEC-33 — decisão já
  tomada (D1/§13 da SPEC-08) de manter separado, não revisitada aqui.
- Qualquer mudança nas seções `containers`/`operational`/`split` da mesma
  página.
- Extrair `DetailField`/`SectionTitle` de `Details.tsx` para um módulo
  compartilhado — replicação local inline (mesmo padrão de duplicação já
  aceito no projeto, ex. `formatDate` duplicado entre `Details.tsx` e
  `operations-list.tsx`).

## 5. Requisitos funcionais

- **RF1** — Seção "Detalhes" do mock envolvida por `<section
  className="soft-card p-4">`.
- **RF2** — Título de seção com ícone (`bi-info-circle`) + label i18n
  reaproveitado, mesmo padrão visual do `SectionTitle` de `Details.tsx`.
- **RF3** — Os 5 campos existentes migram de `<div className="row
  g-3">`/`<div className="col-6 col-md-4">` para `<Row className="g-3">`/
  `<Col md={4}>` do react-bootstrap, preservando rótulo acima/valor em
  destaque abaixo já existente.
- **RF4** — Nenhum campo novo, nenhuma mudança de dado mock.

## 6. Não funcionais

- Sem mudança de comportamento de navegação entre seções (`Nav`/`section`
  state) — só a seção "Detalhes" muda de marcação/wrapper.
- Sem CSS novo — reusa `.soft-card` global já definida (SPEC-56).

## 7. Camada de dados

Não se aplica — página 100% mock (`MOCK_OPERATIONS`), sem hook/query.

## 8. UI

- `operational/operations/$id/index.tsx`: import de `Row`/`Col` de
  `react-bootstrap` (junto de `Badge`, `Button`, `Nav`, `Table` já
  importados); seção `details` reescrita conforme §3.

## 9. i18n

Nenhuma chave nova — reusa `operational.detail.sections.details.label`
(já existe, usado no `Nav.Link`) e as chaves de campo já existentes
(`operational.detail.fields.*`).

## 10. Arquivos esperados

- `src/routes/_dashboard/_internal/operational/operations/$id/index.tsx`

## 11. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Seção "Detalhes" envolvida por `.soft-card p-4` |
| CA2 | Título de seção com ícone visível acima dos campos |
| CA3 | Campos preservam rótulo acima/valor em destaque abaixo, agora em `Row`/`Col` do react-bootstrap |
| CA4 | Nenhuma mudança no dado mock ou nas demais 3 seções da aba |
| CA5 | `bun run check` + `bun run lint` sem regressão |

## 12. Riscos

Nenhum risco relevante identificado — mudança estrutural isolada numa
única seção de uma página mock.

## Implementation Notes

- **Arquivos alterados:**
  `src/routes/_dashboard/_internal/operational/operations/$id/index.tsx`.
- **RF1/RF2:** seção `details` envolvida por `<section className="soft-card p-4">`
  com título `<h2 className="h6 text-body-secondary text-uppercase mb-3 d-flex align-items-center gap-2">`
  (ícone `bi-info-circle` + `t("operational.detail.sections.details.label")`),
  mesmo padrão visual de `SectionTitle`/seções de `Details.tsx`.
- **RF3:** os 5 campos (`client`/`product`/`status`/`type`/`mode`) migraram
  de `<div className="row g-3">`/`<div className="col-6 col-md-4">` para
  `<Row className="g-3">`/`<Col md={4}>` (react-bootstrap, import
  adicionado junto de `Badge`/`Button`/`Nav`/`Table` já existentes),
  preservando o mesmo par rótulo/valor (`small text-body-secondary` /
  `fw-semibold`).
- **RF4:** nenhuma mudança em `MOCK_OPERATIONS`/`MockOperation` nem nas
  seções `containers`/`operational`/`split`.
- **Comandos executados:**
  - `bun run check` (tsc --noEmit) — **VERIFIED**, sem erros.
  - `bun run lint` — **VERIFIED**, 66 problems (3 errors, 63 warnings),
    idêntico ao baseline — nenhuma regressão.
- **Critérios de aceitação:**

  | # | Critério | Status |
  | --- | --- | --- |
  | CA1 | Seção "Detalhes" envolvida por `.soft-card p-4` | PASS |
  | CA2 | Título de seção com ícone visível | PASS |
  | CA3 | Campos em `Row`/`Col` preservando rótulo/valor | PASS |
  | CA4 | Nenhuma mudança de dado mock/demais seções | PASS |
  | CA5 | `bun run check` + `bun run lint` sem regressão | PASS |
- **Limitações conhecidas:** validação visual manual não foi feita nesta
  sessão (dev server não iniciado) — recomenda-se checagem visual antes
  do merge.
