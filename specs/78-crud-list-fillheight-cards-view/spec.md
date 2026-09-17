# SPEC-78 — `fillHeight` também na visão de cards

- **ID:** SPEC-78
- **Nome:** crud-list-fillheight-cards-view
- **Status:** IMPLEMENTED (2026-09-17)
- **Autor:** claude (pedido do usuário, 2026-09-17)
- **Área:** `src/components/crud/crud-list-page.tsx`.

---

## 1. Objetivo

Pedido do usuário: o ajuste de altura dinâmica + scroll interno feito
pra Estufagem (SPEC-75, só na visão de tabela) precisa valer também pra
visão de cards (`ViewToggle`) — a ideia geral é que **o container
principal da página nunca tenha scroll vertical próprio**; quem rola é
sempre a área da listagem (tabela ou cards), com a paginação sempre no
rodapé, em tamanho natural.

Registrado também (sem ação de código): seleção múltipla (`CrudSelection`)
**não é regra geral** a generalizar — continua opt-in, só pros lugares
que já pedem hoje (ex. Estufagem). Isso não muda nada na implementação
(já era opt-in via prop), é só uma decisão de escopo pra quando a spec de
padronização geral for escrita.

## 2. Escopo

1. A visão de cards (`viewMode === "cards"`) ganha o mesmo tratamento que
   a tabela já tinha: quando `fillHeight` é `true`, a `div` que envolve
   a grade de cards (`row g-3`) recebe a altura calculada
   (`fillBodyHeight`) e `overflow-y: auto` — mesmo `fillCardRef`
   reaproveitado (só uma das duas visões existe no DOM por vez).
2. `useLayoutEffect` de recálculo ganha `viewMode` nas dependências —
   trocar entre tabela/cards recalcula a altura (o ref muda de alvo).

## 3. Fora do escopo

- Estilo visual dos cards em si (fundo/borda da área de scroll) — só
  altura+scroll, sem replicar o "fundo preenchendo a sobra" da tabela
  (SPEC-75 CA3) pra cards, que não têm um "card grande" contínuo pra
  colorir (cada item já é seu próprio `Card` do react-bootstrap).
- Generalizar `fillHeight`/seleção múltipla pra outras listagens — fica
  pra spec de padronização geral que o usuário já sinalizou que vai
  escrever, usando a Estufagem como referência.

## 4. Critérios de aceitação

- CA1: na visão de cards da Estufagem, a grade de cards preenche o
  espaço restante da viewport e rola por dentro; paginação continua
  fixa embaixo, em tamanho natural.
- CA2: trocar entre tabela ↔ cards recalcula a altura corretamente.
- CA3: nenhum outro consumidor de `CrudListPage` muda de comportamento
  (`fillHeight` continua opt-in).
- CA4: `tsc --noEmit` e lint sem erro novo.

## 5. Implementation Notes (2026-09-17)

- `tsc --noEmit`/`lint` sem erro novo (mesma baseline de 63 avisos
  pré-existentes). Não verificado visualmente em navegador nesta sessão.
