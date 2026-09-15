# SPEC-25 — Correção: sidebar deve manter só um grupo aberto por vez (accordion real)

- **ID:** SPEC-25
- **Nome:** sidebar-accordion-single-open
- **Status:** IMPLEMENTED
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/layouts/AppShell/index.tsx` (`AppShell`, `SidebarSection`)
- **Depende de:** nenhuma (área já `IMPLEMENTED` — SPEC-02 criou o shell,
  SPEC-12 ajustou visual do accordion sem mudar essa regra de exclusividade)
- **Bloqueia:** nada
- **Contexto do pedido:** "Arrumar o sidebar pra poder ficar tudo no mesmo
  lugar, pois ao expandir o dropdown ele cria barra de rolagem — a regra é
  abrir um, fechar o que está aberto" (comportamento tipo accordion).

---

## 1. Objetivo

Sidebar deve se comportar como um accordion de exclusão mútua: abrir um
grupo de navegação fecha automaticamente qualquer outro grupo que estivesse
aberto, evitando que a soma das alturas expandidas estoure o viewport e
force `overflow-y: auto` (barra de rolagem) em `.sidebarNav`.

## 2. Comportamento atual (bug)

`AppShell` guarda o estado de expansão como um mapa independente por seção:

```tsx
// src/layouts/AppShell/index.tsx, linha 132
const [expanded, setExpanded] = useState<Record<string, boolean>>({});
```

- `onToggle` (linha 173-175) faz
  `setExpanded((prev) => ({ ...prev, [section.area]: !prev[section.area] }))`
  — só alterna a própria chave, nunca mexe nas outras. Clicar em "B" com "A"
  já aberto deixa **A e B abertos ao mesmo tempo**.
- O efeito de auto-expansão pela rota ativa (linha 142-151) também só
  **adiciona** chaves a `next`, nunca remove as que não são a rota ativa:

  ```tsx
  useEffect(() => {
    setExpanded((prev) => {
      const next = { ...prev };
      for (const s of sections) {
        if (isChildActive(s.items, pathname)) next[s.area] = true;
      }
      return next;
    });
  }, [pathname]);
  ```

  Se o usuário já tinha aberto "A" manualmente e navega para uma rota da
  seção "B", o efeito soma `B: true` a `{ A: true }` — vira `{ A: true, B:
  true }`, os dois abertos.
- `.sidebarNav` (`index.module.css`, linha 60-63) é
  `flex: 1; overflow-y: auto` — altura fixa (recorte de `.sidebar`, que é
  `100dvh` menos header/footer). Com duas ou mais seções abertas ao mesmo
  tempo, a soma das alturas expandidas frequentemente excede essa altura
  disponível, e o container aplica scroll interno — o efeito relatado pelo
  usuário.

## 3. Comportamento esperado

- Estado de expansão vira **exclusivo**: no máximo um `section.area` aberto
  por vez.
- Clicar num grupo já fechado abre ele **e fecha** o que estivesse aberto
  (mesmo se for outro).
- Clicar no grupo já aberto fecha ele (sem abrir nenhum outro) — mesmo
  comportamento de "collapse" que já existe hoje, só que exclusivo.
- Auto-expansão pela rota ativa (ao navegar direto para uma URL de uma
  seção, ex. deep link) expande **só** essa seção, fechando qualquer outra
  que estivesse aberta antes.
- Efeito colateral esperado: como só uma seção fica aberta, a soma das
  alturas (header + itens da seção aberta + footer) deve caber no viewport
  na esmagadora maioria dos casos — a barra de rolagem em `.sidebarNav`
  deixa de aparecer no uso normal (não removida estruturalmente do CSS,
  já que uma lista de seções muito longa ainda pode, em tese, precisar
  dela — mas deixa de ser gatilhada pelo bug de múltiplos grupos abertos).

## 4. Plano de correção

Trocar o shape do estado de `Record<string, boolean>` (mapa independente)
para um valor único (`string | null` — a área atualmente aberta, ou nenhuma):

```tsx
const [expandedArea, setExpandedArea] = useState<string | null>(null);
```

- `onToggle` de cada seção passa a chamar
  `setExpandedArea((prev) => (prev === section.area ? null : section.area))`
  — fecha se já era a aberta, senão abre essa e implicitamente fecha
  qualquer outra (só existe uma variável).
- `SidebarSection` recebe `expanded={expandedArea === section.area}` no
  lugar de `expanded={!!expanded[section.area]}` — sem mudar a assinatura
  do componente (`expanded: boolean` continua igual).
- Efeito de auto-expansão pela rota ativa: troca `setExpanded((prev) => {
  ...soma... })` por, simplificado,
  `const activeSection = sections.find((s) => isChildActive(s.items, pathname)); setExpandedArea(activeSection?.area ?? null);`
  — define diretamente a seção ativa como a única aberta (ou `null` se
  nenhuma rota da sidebar bate com a atual, ex. `/dashboard`).
- Nenhuma mudança em `SidebarSection` (animação de altura via
  `ResizeObserver`/`maxHeight`, linhas 50-93) — ela já reage a
  `expanded: boolean`, comportamento de abrir/fechar/animar continua
  idêntico, só a política de "quantos podem estar abertos" muda no
  componente pai.
- Sem mudança de CSS necessária (`.sidebarNav`, `.sidebarAccordionInner`
  continuam como estão) — o bug era 100% de estado em JS, não de layout.

## 5. Fora do escopo

- Nenhuma mudança visual do accordion (cores, ícone de chevron, timing de
  animação) — só a regra de exclusividade.
- Comportamento em telas muito pequenas/mobile (`.sidebarOpen`,
  `menuOpen`) não muda — já reusa o mesmo `SidebarSection`.

## 6. Requisitos funcionais

- **RF1** — No máximo uma seção do sidebar expandida por vez.
- **RF2** — Clicar numa seção fechada abre ela e fecha qualquer outra
  aberta, num único clique (sem estado intermediário com duas abertas).
- **RF3** — Clicar na seção já aberta fecha ela, sem abrir nenhuma outra.
- **RF4** — Navegar (via `<Link>`, deep link, ou refresh) para uma rota
  pertencente a uma seção expande automaticamente só essa seção.

## 7. Requisitos não funcionais

- RNF1 — Sem regressão visual da animação de abrir/fechar (`ResizeObserver`
  + `maxHeight` continuam intocados).
- RNF2 — `bun run check` + `bun run lint` depois da mudança.

## 8. Contrato de rota

Sem mudança — `AppShell` é montado pelo layout `/_dashboard`
(`src/routes/_dashboard.tsx`), sem rota própria.

## 9. Camada de dados

Não aplicável — mudança é 100% de estado local de UI (`useState`), sem
tocar em query/mutation.

## 10. UI

Sem novo componente — edição pontual em `AppShell` (`src/layouts/AppShell/
index.tsx`). Não é input de formulário (regra 10 não se aplica).

## 11. i18n

Nenhuma chave nova.

## 12. Arquivos esperados

- `src/layouts/AppShell/index.tsx` (editado — estado `expanded` →
  `expandedArea`, `onToggle`, efeito de auto-expansão)

## 13. Critérios de aceitação

| # | Critério | Verificação |
| --- | --- | --- |
| CA1 | Abrir seção "B" com "A" já aberta fecha "A" automaticamente | manual, `/dashboard`, sidebar com 2+ seções visíveis (depende do papel do usuário logado) |
| CA2 | Clicar na seção já aberta fecha ela sem abrir outra | manual |
| CA3 | Navegar direto para uma URL de uma seção expande só ela | manual, digitar URL de uma rota interna e dar refresh |
| CA4 | Nenhuma combinação de cliques deixa 2+ seções abertas simultaneamente | manual, testar as 4 combinações de clique em 2 seções distintas |
| CA5 | `bun run check` e `bun run lint` passam | comando |

## 14. Riscos

- **R1** — Nenhum risco identificado; mudança isolada de estado local, sem
  efeito em dado remoto/permissão.

## 15. Decisões pendentes

Nenhuma — escopo e causa raiz totalmente confirmados em código, sem
ambiguidade de UX (o pedido do usuário já descreve o comportamento
esperado com precisão: "abrir um, fechar o que está aberto").

---

## Implementation Notes

`APROVAR SPEC-25` recebido, sem pendência. Implementado nesta rodada.

- **Arquivos alterados:** `src/layouts/AppShell/index.tsx` — estado
  `expanded: Record<string, boolean>` trocado por `expandedArea: string |
null`; `onToggle` de cada seção agora alterna `expandedArea` (fecha se já
  era a seção aberta, senão abre essa e implicitamente fecha qualquer
  outra); efeito de auto-expansão pela rota ativa agora define
  `expandedArea` diretamente pela seção correspondente (ou `null` se
  nenhuma seção bate com a rota atual), em vez de somar chaves a um mapa.
- **Comandos executados:** `bun run check` (`tsc --noEmit`) — VERIFIED, sem
  erros. `bun run lint` — VERIFIED, contagem de problemas idêntica ao
  baseline (66: 3 erros pré-existentes em `session.server.ts`, 63
  warnings), nenhum novo.
- **Critérios de aceitação:**

| # | Critério | Status |
| --- | --- | --- |
| CA1 | Abrir seção "B" com "A" já aberta fecha "A" automaticamente | PASS (código — só existe uma variável de estado, estruturalmente impossível ter 2 abertas) |
| CA2 | Clicar na seção já aberta fecha ela sem abrir outra | PASS (código) |
| CA3 | Navegar direto para uma URL de uma seção expande só ela | PASS (código) |
| CA4 | Nenhuma combinação de cliques deixa 2+ seções abertas simultaneamente | PASS (código) |
| CA5 | `bun run check` e `bun run lint` passam | VERIFIED |

- **Decisões tomadas durante a implementação:** nenhuma — spec já não tinha
  ambiguidade.
- **Limitações conhecidas:** verificação visual em runtime (abrir/fechar de
  fato no browser) não foi feita por este agente (sem ambiente de dev
  rodando nesta sessão) — a mudança é estrutural (uma única variável em vez
  de mapa) e de baixo risco, mas recomenda-se conferência visual rápida em
  `/dashboard` com um usuário que tenha 2+ áreas visíveis na sidebar.
