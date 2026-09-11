# SPEC-SHARE-02 — Correção: ciclo de vida de URL de preview nos campos de foto

- **ID:** SPEC-SHARE-02
- **Nome:** photo-preview-lifecycle
- **Status:** DRAFT
- **Autor:** portal-dev-agent (rascunho)
- **Área:** `src/hooks/**` (novo), `src/layouts/Form/Fields/InputPhotoSingle.tsx`,
  `src/layouts/Form/Fields/InputPhotoMulti.tsx` (SPEC-SHARE-01,
  `IMPLEMENTED`), `src/layouts/Form/Fields/InputAvatar.tsx` (SPEC-02,
  `IMPLEMENTED`)
- **Depende de:** SPEC-SHARE-01 (`InputPhotoSingle`/`InputPhotoMulti` já
  existem — esta SPEC corrige, não recria), SPEC-02 (`InputAvatar` já
  existe, mesma situação)
- **Bloqueia:** nada — nenhum dos 3 componentes tem consumidor em SPEC
  ainda `DRAFT`/aprovada além de `InputAvatar` (já em produção via
  `profile-modal`, SPEC-02). Não há ordem de branch a respeitar; pode
  mergear a qualquer momento, mesmo padrão de SPEC-10/11/12 (correção fora
  da árvore de onda, não listada em `specs/BRANCHING.md`).

---

## 1. Objetivo

Corrigir um vazamento de `Blob URL` encontrado na revisão de implementação
de SPEC-SHARE-01: `InputPhotoSingle`, `InputPhotoMulti` e (pré-existente)
`InputAvatar` chamam `URL.createObjectURL(file)` **direto dentro do
`render` do `Controller`**, sem nunca chamar `URL.revokeObjectURL`. Cada
re-render do form (qualquer campo mudando, não só a foto) cria uma URL de
blob nova; as antigas nunca são liberadas até o navegador descartar a aba —
em `InputPhotoMulti` o efeito multiplica por N fotos a cada re-render.

Não é feature nova — é bug de lifecycle. Fica em `SPEC-SHARE-NN` (e não
`SPEC-10`-style solto) porque a correção introduz um hook reutilizável que
os 3 componentes de foto passam a compartilhar, seguindo o mesmo raciocínio
de "campo/utilitário usado por 2+ consumidores nasce numa SPEC própria" que
já vale para os Fields de SPEC-SHARE-01.

**Real vs UI-only:** não se aplica — correção de biblioteca de componentes,
sem tela própria.

## 2. Contexto

`URL.createObjectURL` aloca memória no processo do navegador até
`URL.revokeObjectURL` ser chamado explicitamente — não é coletado pelo GC
normal do JS. Os 3 componentes afetados:

- `InputAvatar.tsx:37` — `const localUrl = file ? URL.createObjectURL(file) : null;`
  dentro do `render` do `Controller`, sem `useEffect`/cleanup.
- `InputPhotoSingle.tsx:37` — mesmo padrão, copiado de `InputAvatar` ao
  implementar SPEC-SHARE-01.
- `InputPhotoMulti.tsx:64` — mesmo padrão, mas dentro de um `.map()` sobre
  `files: File[]`, então N URLs novas por re-render, não 1.

Nenhum dos 3 já causou incidente relatado (avatar é 1 arquivo, troca rara,
sessão de form curta) — é um débito técnico, não um bug bloqueante. Mas
`InputPhotoMulti` tem uso alvo real em SPEC-07-05 (fotos de container,
potencialmente várias por operação, form pode ficar aberto por mais tempo
durante uma conferência) — vale corrigir antes de ter um consumidor real,
não depois.

## 3. Escopo

1. **`src/hooks/useObjectUrl.ts`** — hook `useObjectUrl(file: File | null |
undefined): string | null`. Memoiza a URL pela identidade do `File`
   (`useEffect` com `file` na dependência — `File` é imutável, a mesma
   instância nunca muda de conteúdo, então comparar por referência é
   suficiente); cria a URL só quando `file` muda, chama
   `URL.revokeObjectURL` no cleanup (troca ou desmonte).
2. **Mesmo arquivo, `useObjectUrls(files: File[]): string[]`** — variante
   para lista. Mantém um `Map<File, string>` em `ref` entre renders:
   arquivos que já têm URL não recriam; arquivos removidos da lista têm a
   URL revogada; desmonte revoga tudo que sobrou no `Map`.
3. **Refatorar os 3 consumidores** (`InputAvatar`, `InputPhotoSingle`,
   `InputPhotoMulti`) pra usar os hooks acima no lugar da chamada direta a
   `URL.createObjectURL` dentro do `render`.

## 4. Fora do escopo

- Qualquer mudança de **contrato público** (props, comportamento visível,
  crop) dos 3 componentes — é refactor interno de lifecycle, não feature.
  `InputAvatar` continua fazendo crop circular 96×96; `InputPhotoSingle`/
  `InputPhotoMulti` continuam sem crop (regra já fixada em SPEC-SHARE-01,
  CA7).
- Compressão/redimensionamento de imagem antes do upload — fora de escopo
  aqui e em SPEC-SHARE-01.
- Qualquer outro uso de `URL.createObjectURL` no projeto fora desses 3
  componentes (nenhum outro encontrado na revisão — `grep -rn
createObjectURL src/` só retorna os 3 arquivos acima).

## 5. Requisitos funcionais

- **RF1** — Nenhuma URL de blob é criada duas vezes para o mesmo `File`
  entre re-renders — só quando a instância de `File` muda (seleção nova,
  remoção) o hook cria/revoga.
- **RF2** — Toda URL criada é revogada quando deixa de ser necessária
  (arquivo trocado, removido da lista, ou componente desmontado) — sem
  exceção de "última URL sobrevive além do componente".
- **RF3** — `InputAvatar`, `InputPhotoSingle`, `InputPhotoMulti` mantêm
  exatamente o mesmo comportamento visível e a mesma assinatura de props
  depois do refactor (regressão zero de UI).
- **RF4** — `useObjectUrls` preserva a URL de um arquivo que continua na
  lista entre renders (não gera URL nova só porque a lista foi re-criada
  como array novo com o mesmo conteúdo) — comparação por identidade de
  `File`, não por índice/posição.

## 6. Requisitos não funcionais

- RNF1 — `bun run check` + `lint` passam.
- RNF2 — Hook fica em `src/hooks/` (não em `layouts/Form/`) por ser
  utilitário de propósito geral (qualquer preview de `File`/`Blob`), não
  específico de formulário — mesmo critério de localização já usado por
  `useUser`/`useCan`.
- RNF3 — Sem dependência nova de pacote — só `useEffect`/`useRef` do React,
  já disponível.

## 7. Desenho

```
src/hooks/
  useObjectUrl.ts       (useObjectUrl + useObjectUrls, sem UI)

src/layouts/Form/Fields/
  InputAvatar.tsx        (editar: troca `URL.createObjectURL` inline por `useObjectUrl(file)`)
  InputPhotoSingle.tsx    (idem)
  InputPhotoMulti.tsx     (editar: troca o `.map()` com `URL.createObjectURL` por `useObjectUrls(files)`)
```

`useObjectUrl`/`useObjectUrls` não sabem nada de `react-hook-form`,
`Controller` ou Bootstrap — hook puro sobre `File`/`Blob`, testável
isolado. Os 3 Fields continuam donos de toda a parte de UI/`Controller`;
só trocam a linha que gera a URL.

## 8. Arquivos esperados

| Arquivo                                        | Ação                         |
| ---------------------------------------------- | ---------------------------- |
| `src/hooks/useObjectUrl.ts`                    | criar                        |
| `src/layouts/Form/Fields/InputAvatar.tsx`      | editar — usa `useObjectUrl`  |
| `src/layouts/Form/Fields/InputPhotoSingle.tsx` | editar — usa `useObjectUrl`  |
| `src/layouts/Form/Fields/InputPhotoMulti.tsx`  | editar — usa `useObjectUrls` |

## 9. Critérios de aceitação

| #   | Critério                                                                                                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CA1 | `grep -rn "createObjectURL" src/` só aparece dentro de `src/hooks/useObjectUrl.ts` — nenhum dos 3 Fields chama direto                                                                                     |
| CA2 | `grep -rn "revokeObjectURL" src/hooks/useObjectUrl.ts` confirma cleanup nos dois hooks (`useObjectUrl` e `useObjectUrls`)                                                                                 |
| CA3 | Trocar a foto em `InputPhotoSingle`/`InputAvatar` várias vezes seguidas (manual, dev) não deixa `<img src="blob:...">` órfã — sempre uma URL ativa por vez                                                |
| CA4 | Adicionar/remover fotos em `InputPhotoMulti` não recria a URL das fotos que permaneceram na lista (verificável comparando a string da URL antes/depois de um re-render provocado por outro campo do form) |
| CA5 | Nenhuma prop pública de `InputAvatar`/`InputPhotoSingle`/`InputPhotoMulti` muda de nome/tipo                                                                                                              |
| CA6 | `bun run check` + `lint` passam                                                                                                                                                                           |

## 10. Riscos

- **R1** — Tocar em `InputAvatar`, já em produção (SPEC-02,
  `IMPLEMENTED`, usado no `profile-modal`). Mitigação: RF3/CA5 travam que
  é refactor interno puro — sem mudança de props/comportamento; testar
  manualmente o fluxo de trocar avatar no Profile antes de considerar
  pronta.
- **R2** — `useObjectUrls` com `Map` em `ref` é mais complexo que o
  `useObjectUrl` single-file — risco de bug sutil de cleanup (URL
  "esquecida" no Map). Mitigação: CA4 cobre o caso de regressão mais
  provável (recriar URL por engano); revisão de código antes de aprovar
  deve olhar esse hook com atenção extra.

## 11. Decisões pendentes

Nenhuma — escopo, localização do hook (RNF2) e critério de comparação por
identidade de `File` (RF1/RF4) já decididos nesta revisão.

---

**Próximo passo:** `APROVAR SPEC-SHARE-02`.
