# Plano de branches — paridade com o legado (SPEC-02 a SPEC-09)

Como as SPECs de `specs/` viram branch/PR no `warren/NewPortal`. Convenção:
**1 branch por SPEC**, agrupadas em **branch de onda**, convergindo em
**`SPECS-LEGADO`** — a branch de integração que representa "paridade
funcional com `warren/Portal` alcançada". Só quando `SPECS-LEGADO` estiver
completa ela vira PR pra `main`.

> **`SPECS-LEGADO` já existe** (criada a partir de `main` antes deste
> documento, local e em `origin`). **SPEC-00 e SPEC-01 já estão mergeadas
> nela** — `main` está 4 commits atrás (`main` não tem SPEC-00/01 ainda,
> só `SPECS-LEGADO` tem). O merge-base das duas é `f74162c` ("Motagem das
> SPECS"). Todo o plano abaixo usa `SPECS-LEGADO` como já existe, não como
> algo a criar do zero.

Nomenclatura já em uso no repo (ver `git log`): `spec-00-i18n-namespaced-
dictionaries`, `spec-01-brand-theming` (essa mergeada via branch
`worktree-spec-01-brand-theming` — o prefixo `worktree-` foi acidental, da
ferramenta de isolamento; branches novas não repetem esse prefixo).

## Estrutura

```
main                                          (4 commits atrás de SPECS-LEGADO)
 └── SPECS-LEGADO                              (já existe — já tem SPEC-00 e SPEC-01)
      │
      ├── spec-02-app-shell-navigation         (a partir de SPECS-LEGADO)
      │        PR → SPECS-LEGADO                ONDA 1 — sequencial, sozinha
      │
      ├── wave-2-parallel-areas                (a partir de SPECS-LEGADO,
      │   │                                     só depois que spec-02
      │   │                                     já está mergeada nela)
      │   ├── spec-03-admin-access             ONDA 2 — 4 áreas "simples"
      │   ├── spec-04-administrativo-cadastros   em paralelo (03/04/05/06/09),
      │   ├── spec-05-administrativo-clientes     cada uma a partir de
      │   ├── spec-06-administrativo-log-ocorrencias wave-2-parallel-areas,
      │   ├── spec-09-client-area                 PR de volta pra ela
      │   │        PR → wave-2-parallel-areas      (não pra SPECS-LEGADO
      │   │                                        direto)
      │   │
      │   └── SPEC-07 (Operações) — dividida em 10 sub-branches,
      │       com ordem interna própria (ver "Sub-árvore de SPEC-07"):
      │       ├── spec-07-00-operations-upload-fields   (paralela)
      │       ├── spec-07-01-operations-list            (paralela)
      │       ├── spec-07-02-operation-shell             (paralela)
      │       ├── spec-07-03-operation-details    (após 07-01 + 07-02)
      │       ├── spec-07-04-operation-romaneio          (após 07-02)
      │       ├── spec-07-05-operation-containers (após 07-00+07-01+07-02)
      │       ├── spec-07-06-operation-documents  (após 07-00+07-01+07-02)
      │       ├── spec-07-07-operation-reports            (após 07-02)
      │       ├── spec-07-08-operation-responsible         (após 07-02)
      │       └── spec-07-09-operation-log                 (após 07-02)
      │            PR → wave-2-parallel-areas (cada uma)
      │
      │   (quando as 4 áreas simples + as 10 sub-branches de SPEC-07
      │    estiverem mergeadas em wave-2-parallel-areas:)
      │        PR wave-2-parallel-areas → SPECS-LEGADO
      │
      └── spec-08-operacional                  ONDA 3 — a partir de
               PR → SPECS-LEGADO                 wave-2-parallel-areas,
                                                  só depois que
                                                  spec-07-01-operations-list
                                                  (não as demais
                                                  sub-branches de SPEC-07)
                                                  já estiver mergeada
                                                  nela — é a única que
                                                  precisa do
                                                  operations-list.tsx

(quando spec-08 e wave-2-parallel-areas estiverem os dois em SPECS-LEGADO:)
     PR SPECS-LEGADO → main
```

## Regra de base de cada branch

| Branch | Cria a partir de | Quando criar |
| --- | --- | --- |
| `SPECS-LEGADO` | `main` | **já existe** — nada a fazer aqui |
| `spec-02-app-shell-navigation` | `SPECS-LEGADO` | ao aprovar SPEC-02 (`APROVAR SPEC-02`) |
| `wave-2-parallel-areas` | `SPECS-LEGADO` | depois que `spec-02-app-shell-navigation` já foi mergeada em `SPECS-LEGADO` — **nunca antes**, essa onda inteira depende de SPEC-02 |
| `spec-03-admin-access` | `wave-2-parallel-areas` | ao aprovar SPEC-03 |
| `spec-04-administrativo-cadastros` | `wave-2-parallel-areas` | ao aprovar SPEC-04 |
| `spec-05-administrativo-clientes` | `wave-2-parallel-areas` | ao aprovar SPEC-05 **e** depois que `spec-04-administrativo-cadastros` já estiver mergeada em `wave-2-parallel-areas` (dependência real, não só de aprovação — ver "Exceção de ordem" abaixo) |
| `spec-06-administrativo-log-ocorrencias` | `wave-2-parallel-areas` | ao aprovar SPEC-06 |
| `spec-09-client-area` | `wave-2-parallel-areas` | ao aprovar SPEC-09 |
| `spec-07-00-operations-upload-fields` | `wave-2-parallel-areas` | ao aprovar SPEC-07-00 |
| `spec-07-01-operations-list` | `wave-2-parallel-areas` | ao aprovar SPEC-07-01 |
| `spec-07-02-operation-shell` | `wave-2-parallel-areas` | ao aprovar SPEC-07-02 |
| `spec-07-03-operation-details` | `wave-2-parallel-areas` | ao aprovar SPEC-07-03 **e** depois que `spec-07-01` e `spec-07-02` já estiverem mergeadas em `wave-2-parallel-areas` |
| `spec-07-04-operation-romaneio` | `wave-2-parallel-areas` | ao aprovar SPEC-07-04 **e** depois que `spec-07-02` já estiver mergeada |
| `spec-07-05-operation-containers` | `wave-2-parallel-areas` | ao aprovar SPEC-07-05 **e** depois que `spec-07-00`, `spec-07-01` e `spec-07-02` já estiverem mergeadas |
| `spec-07-06-operation-documents` | `wave-2-parallel-areas` | ao aprovar SPEC-07-06 **e** depois que `spec-07-00`, `spec-07-01` e `spec-07-02` já estiverem mergeadas |
| `spec-07-07-operation-reports` | `wave-2-parallel-areas` | ao aprovar SPEC-07-07 **e** depois que `spec-07-02` já estiver mergeada |
| `spec-07-08-operation-responsible` | `wave-2-parallel-areas` | ao aprovar SPEC-07-08 **e** depois que `spec-07-02` já estiver mergeada |
| `spec-07-09-operation-log` | `wave-2-parallel-areas` | ao aprovar SPEC-07-09 **e** depois que `spec-07-02` já estiver mergeada |
| `spec-08-operacional` | `wave-2-parallel-areas` | só depois que `spec-07-01-operations-list` já foi mergeada em `wave-2-parallel-areas` (precisa do `operations-list.tsx` real, não só aprovado) — não depende das demais sub-branches de SPEC-07 |

As branches de SPEC-03/04/05/06/09 nascem todas do mesmo ponto de
`wave-2-parallel-areas` (logo após ela existir) — 03/04/06/09 **não
dependem umas das outras**; 05 depende de 04 (ver "Exceção de ordem SPEC-04
→ SPEC-05" abaixo). SPEC-07 tem uma sub-árvore própria com ordem interna
(ver "Sub-árvore de SPEC-07" abaixo) — `spec-07-00`/`01`/`02` podem nascer
em paralelo com as demais; as sub-branches `07-03` a `07-09` dependem de
`07-01`/`07-02` já estarem mergeadas. `spec-08` é a exceção de nível
superior: sai depois, de um `wave-2-parallel-areas` já com
`spec-07-01-operations-list` dentro (as demais podem ou não estar lá
ainda, tanto faz pra ela).

## Ordem de merge dentro da Onda 2

As 5 branches "simples" (03/04/05/06/09) — sem ordem entre si, **exceto
SPEC-04 → SPEC-05** (ver abaixo). A sub-árvore de SPEC-07 tem ordem própria
(ver "Sub-árvore de SPEC-07" mais abaixo), independente destas. Único cuidado
prático: como todas nascem do mesmo commit-base, quem mergear por último
deve **atualizar a própria branch com `wave-2-parallel-areas` antes do PR**
(`git merge`/`git rebase` `wave-2-parallel-areas` dentro da branch da spec)
pra pegar o que as outras já colocaram lá — o risco de conflito real é
baixo (rotas e namespaces de i18n disjuntos por SPEC), mas o merge em si
precisa acontecer pra `wave-2-parallel-areas` sempre ter o estado mais
recente.

**Correção:** `nav/*.ts` **não** é um arquivo isolado por SPEC como este
documento afirmava — `src/layouts/AppShell/nav/administrativo.ts` é um
fragmento legado único, ainda referenciado, com itens de várias áreas
(SPEC-04/05/06/07-01 removem cada uma só os itens que lhe pertencem,
deixando isso explícito em "Arquivos esperados" de cada spec.md — a
remoção do item `administrativoOperations` é escopo de SPEC-07-01, não das
demais sub-branches de SPEC-07). É um ponto real de conflito potencial
entre as branches da onda — quem mergear por último sente isso com mais
força no `git merge`/rebase acima.

## Sub-árvore de SPEC-07

SPEC-07 (Operações) foi dividida em 10 sub-SPECs — decisão do usuário
durante a revisão, pela complexidade da feature (lista + shell de 7 abas,
4 delas reais). Cada sub-SPEC tem `spec.md` próprio em
`specs/07-NN-<slug>/`; `specs/07-operacoes/spec.md` é só o índice geral
(contexto e mapa de dependências, sem requisitos/critérios próprios).

Ordem de merge dentro de `wave-2-parallel-areas`, especificamente entre as
sub-branches de SPEC-07:

1. **Paralelas, sem ordem entre si:** `spec-07-00-operations-upload-fields`,
   `spec-07-01-operations-list`, `spec-07-02-operation-shell`.
2. **Dependem de 07-02 (shell) estar mergeada:**
   `spec-07-04-operation-romaneio`, `spec-07-07-operation-reports`,
   `spec-07-08-operation-responsible`, `spec-07-09-operation-log`.
3. **Dependem de 07-01 + 07-02 estarem mergeadas:**
   `spec-07-03-operation-details` (usa `Select` de 07-01 pro campo de
   status).
4. **Dependem de 07-00 + 07-01 + 07-02 estarem mergeadas:**
   `spec-07-05-operation-containers` (usa `Select` de 07-01 e
   `InputPhotoMulti` de 07-00), `spec-07-06-operation-documents` (usa
   `Select` de 07-01 e `InputFileSingle` de 07-00).

Todas as sub-branches de SPEC-07 nascem de `wave-2-parallel-areas` (mesmo
ponto que as demais SPECs da onda), respeitando a ordem acima — não nascem
umas das outras. `spec-08-operacional` só precisa de
`spec-07-01-operations-list` mergeada (ver tabela acima), não da árvore
inteira.

**Exceção de ordem — SPEC-04 antes de SPEC-05:** a SPEC-04 introduz a
extensão de `LayoutField`/`RenderFields` com tipo "grupo" (pra renderizar
`Group/Adress.tsx` dentro do form genérico — necessária pro campo `address`
de Harbor). A SPEC-05 tem o mesmo problema pro campo `address` de Cliente e
**reusa** essa extensão em vez de duplicá-la (ver `specs/04-.../spec.md` e
`specs/05-.../spec.md`, seções "Depende de"/"Bloqueia"). Na prática:
`spec-05-administrativo-clientes` não pode mergear em
`wave-2-parallel-areas` antes de `spec-04-administrativo-cadastros`.

## Nome do PR / título

`feat(<slug-curto>): implementa SPEC-NN — <nome>` — mesmo padrão já usado
nos commits de SPEC-00/01 (`feat(i18n): particiona dicionários...`,
`feat(theming): implementa SPEC-01...`). PR de spec vai pra branch de onda
(ou pra `SPECS-LEGADO` no caso de SPEC-02 e SPEC-08), não pra `main`.

## Quando `SPECS-LEGADO` vira PR pra `main`

Só depois que **todas** as SPECs de 02 a 09 estiverem mergeadas nela —
contando a sub-árvore de SPEC-07 (10 sub-branches) como parte dela, são 16
branches na Onda 2 (03, 04, 05, 06, 07-00 a 07-09, 09) mais `spec-08-
operacional`. `spec-08-operacional` e `wave-2-parallel-areas` (com as 16
dela dentro) são as duas últimas peças. Esse PR final é o marco de
"paridade funcional com `warren/Portal` alcançada" — é aí que este arquivo
e as SPEC-02–09 (e as sub-SPECs 07-00 a 07-09) recebem
`status: IMPLEMENTED`. Nesse mesmo PR, `main` também recebe SPEC-00/01
(hoje só em `SPECS-LEGADO`).

## Fora deste plano

- **Laboratório** não tem SPEC nesta leva (placeholder "em construção" nos
  dois lados) — fica de fora de `SPECS-LEGADO` também.
