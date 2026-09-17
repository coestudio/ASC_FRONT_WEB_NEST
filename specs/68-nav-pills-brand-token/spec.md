# SPEC-68 — `Nav variant="pills"` ativo não segue o token de marca

- **ID:** SPEC-68
- **Nome:** nav-pills-brand-token
- **Status:** IMPLEMENTED
- **Autor:** portal-dev-agent (rascunho, 2026-09-16 — achado do usuário:
  "o botão listagem na aba de nota fiscal está azul e não seguindo a
  identidade de cores do projeto")
- **Área:** `src/styles/globals/base.css`
- **Depende de:** nenhuma.

---

## 1. Objetivo

Corrigir o pill ativo de `Nav variant="pills"` (usado hoje só nas 3
sub-abas "Listagem"/"Comparação NF"/"Comparação Lotes" de
`Invoice.tsx`) para usar o token de marca (`--bs-primary`) em vez do azul
padrão do Bootstrap.

## 2. Contexto (achado)

Isto **não** é uma decisão de paleta nova — é o mesmo bug de raiz já
documentado e corrigido em `base.css:161` para `.btn-primary`/
`.btn-outline-primary` (SPEC-11 item 3): o projeto importa
`bootstrap.min.css` **pré-compilado** (`src/styles/globals/index.css:2`),
que fixa variáveis de componente em hex literal em vez de ler
`--bs-primary`:

```css
.nav-pills{--bs-nav-pills-link-active-bg:#0d6efd; ...}
```

(`#0d6efd` é o azul padrão do Bootstrap, hardcoded no CSS vendorizado,
confirmado em `node_modules/bootstrap/dist/css/bootstrap.min.css`.) Como
`--bs-primary` já é remapeado por marca/tema em `tokens.css`
(`data-brand`/`data-bs-theme`), mas `--bs-nav-pills-link-active-bg` não
lê `--bs-primary` nenhuma vez no CSS vendorizado, o pill ativo sempre
renderiza azul, em qualquer marca (`asa`/`asi`/`asc`).

Único consumidor hoje: `Invoice.tsx:81` (`<Nav variant="pills">`), mas a
correção é feita no nível do componente Bootstrap (mesmo escopo de
`base.css:161`), não scoped a um arquivo — qualquer uso futuro de
`Nav variant="pills"` herda a correção automaticamente.

## 3. Escopo

1. Em `src/styles/globals/base.css`, adicionar um bloco `.nav-pills` que
   sobrescreve `--bs-nav-pills-link-active-bg: var(--bs-primary)` e
   `--bs-nav-pills-link-active-color: var(--on-brand, #fff)` — mesmo
   padrão de override de `--bs-btn-*` já usado para `.btn-primary`.
2. Nenhuma mudança de token/paleta nova — reuso exato de `--bs-primary`/
   `--on-brand`, já existentes e já usados em outros componentes
   (`.btn-primary`).

## 4. Fora do escopo

- Qualquer outro componente Bootstrap com o mesmo tipo de bug (variável
  de componente hardcoded no CSS vendorizado) não identificado nesta
  sessão — se aparecer, é achado novo, SPEC própria.
- Migrar de `bootstrap.min.css` pré-compilado para build via Sass com
  variáveis de marca (resolveria a causa raiz de vez, mas é mudança de
  build/dependência — `[NEEDS_DECISION]`, não abordado aqui).

## 5. Requisitos funcionais

- **RF1** — `.nav-pills .nav-link.active` usa `--bs-primary` (cor da
  marca ativa) como fundo, não o azul padrão do Bootstrap.
- **RF2** — Cor do texto do pill ativo permanece legível
  (`--on-brand`, branco por padrão) em qualquer marca.

## 6. Não funcionais

- Sem impacto em nenhum outro componente `.nav` (`variant="tabs"`, usado
  no shell de Operação e no mock operacional, não usa `--bs-nav-pills-*`
  — escopo isolado).

## 7. Camada de dados

Não se aplica — CSS puro.

## 8. UI

- `src/styles/globals/base.css` — novo bloco `.nav-pills` (mesma seção
  onde já vivem os overrides de `.btn-primary`/`.btn-outline-primary`).

## 9. i18n

Nenhuma chave nova.

## 10. Arquivos esperados

- `src/styles/globals/base.css`

## 11. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Pill ativo de `Nav variant="pills"` usa `--bs-primary`, não azul padrão do Bootstrap |
| CA2 | Texto do pill ativo permanece legível (contraste ok) |
| CA3 | `bun run check` + `bun run lint` sem regressão |

## 12. Riscos

Nenhum risco relevante — mudança de CSS isolada, mesmo padrão já em
produção para `.btn-primary`.

## Implementation Notes

- **Arquivo alterado:** `src/styles/globals/base.css`.
- **RF1/RF2:** bloco `.nav-pills` adicionado logo após os overrides de
  `.btn-primary`/`.btn-outline-primary`, sobrescrevendo
  `--bs-nav-pills-link-active-bg: var(--bs-primary)` e
  `--bs-nav-pills-link-active-color: var(--on-brand, #fff)`.
- **Comandos executados:**
  - `bun run check` (tsc --noEmit) — **VERIFIED**, sem erros (mudança é
    CSS puro, sem impacto em TS).
  - `bun run lint` — **VERIFIED**, 66 problems (3 errors, 63 warnings),
    idêntico ao baseline.
- **Critérios de aceitação:**

  | # | Critério | Status |
  | --- | --- | --- |
  | CA1 | Pill ativo usa `--bs-primary` | PASS |
  | CA2 | Texto legível | PASS (`--on-brand` já usado com o mesmo contraste em `.btn-primary`) |
  | CA3 | `bun run check` + `bun run lint` sem regressão | PASS |
- **Limitações conhecidas:** validação visual manual não foi feita via
  screenshot nesta sessão — recomenda-se conferir a aba "Nota Fiscal" de
  uma Operação no dev server já rodando (`http://localhost:8082/`).
