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
      │   │
      │   ├── spec-share-01-shared-form-fields  PRÉ-REQUISITO de spec-04,
      │   │        PR → wave-2-parallel-areas    spec-05 e spec-07-01 (ver
      │   │                                      "Ordem de merge" abaixo) —
      │   │                                      biblioteca de Fields
      │   │                                      compartilhados, sem rota
      │   │                                      própria, nasce cedo
      │   │
      │   ├── spec-03-admin-access             ONDA 2 — áreas "simples"
      │   ├── spec-04-administrativo-cadastros   (03/04/05/09), cada uma a
      │   ├── spec-05-administrativo-clientes     partir de
      │   ├── spec-09-client-area                 wave-2-parallel-areas,
      │   │        PR → wave-2-parallel-areas      PR de volta pra ela (não
      │   │                                        pra SPECS-LEGADO direto)
      │   │                                        — 04 e 05 não têm mais
      │   │                                        ordem entre si (só
      │   │                                        dependem de spec-share-01,
      │   │                                        ver "Ordem de merge")
      │   │
      │   └── SPEC-07 (Operações) — dividida em 9 sub-branches,
      │       com ordem interna própria (ver "Sub-árvore de SPEC-07"):
      │       ├── spec-07-01-operations-list     (depende de spec-share-01)
      │       ├── spec-07-02-operation-shell             (paralela)
      │       ├── spec-07-03-operation-details    (após 07-01 + 07-02)
      │       ├── spec-07-04-operation-romaneio  (após 07-02, e spec-share-01
      │       │                                   — InputFileSingle p/ import)
      │       ├── spec-07-05-operation-containers (após 07-01+07-02, e
      │       │                                    spec-share-01)
      │       ├── spec-07-06-operation-documents  (após 07-01+07-02, e
      │       │                                    spec-share-01)
      │       ├── spec-07-07-operation-reports            (após 07-02)
      │       ├── spec-07-08-operation-responsible         (após 07-02)
      │       └── spec-07-09-operation-log                 (após 07-02)
      │            PR → wave-2-parallel-areas (cada uma)
      │
      │   (quando spec-share-01 + 4 áreas simples + as 9 sub-branches de
      │    SPEC-07 estiverem mergeadas em wave-2-parallel-areas:)
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

> `spec-07-00-operations-upload-fields` (Fields de upload) foi **absorvida**
> por `spec-share-01-shared-form-fields` — deixou de fazer sentido como
> sub-branch presa à árvore de SPEC-07 quando `Select`/`SelectAsync`
> (nascendo em SPEC-07-01) e `AddressGroup` (nascendo em SPEC-04) tiveram o
> mesmo problema de ficar "preso" na primeira SPEC de feature que precisou
> do campo. Ver `specs/share-01-shared-form-fields/spec.md` §1.

> **SPEC-06 (`administrativo-log-ocorrencias`) foi cancelada** — mockup
> sem API real (`log`/`audit`/`occurrence`) por trás deixou de fazer
> sentido pro escopo desta leva. As telas `/administrative/log` e
> `/administrative/occurrences` ficam fora de `SPECS-LEGADO`; os itens de
> nav legado correspondentes (`administrativoLog`, `administrativoOccurrences`)
> não têm mais spec que os remova/migre — ficam órfãos no fragmento antigo,
> sem decisão de quando isso será revisitado.

## Regra de base de cada branch

| Branch                             | Cria a partir de        | Quando criar                                                                                                                                                                                                                                  |
| ---------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SPECS-LEGADO`                     | `main`                  | **já existe** — nada a fazer aqui                                                                                                                                                                                                             |
| `spec-02-app-shell-navigation`     | `SPECS-LEGADO`          | ao aprovar SPEC-02 (`APROVAR SPEC-02`)                                                                                                                                                                                                        |
| `wave-2-parallel-areas`            | `SPECS-LEGADO`          | depois que `spec-02-app-shell-navigation` já foi mergeada em `SPECS-LEGADO` — **nunca antes**, essa onda inteira depende de SPEC-02                                                                                                           |
| `spec-share-01-shared-form-fields` | `wave-2-parallel-areas` | ao aprovar SPEC-SHARE-01 — sem outra dependência além de SPEC-00 (já satisfeita); é a primeira a nascer dentro da onda                                                                                                                        |
| `spec-03-admin-access`             | `wave-2-parallel-areas` | ao aprovar SPEC-03                                                                                                                                                                                                                            |
| `spec-04-administrativo-cadastros` | `wave-2-parallel-areas` | ao aprovar SPEC-04 **e** depois que `spec-share-01-shared-form-fields` já estiver mergeada em `wave-2-parallel-areas` (precisa de `AddressGroup`/`SelectAsync` reais — ver "Exceção de ordem" abaixo)                                         |
| `spec-05-administrativo-clientes`  | `wave-2-parallel-areas` | ao aprovar SPEC-05 **e** depois que `spec-share-01-shared-form-fields` já estiver mergeada em `wave-2-parallel-areas` (precisa de `AddressGroup`; **não** depende mais de `spec-04-administrativo-cadastros` — ver "Exceção de ordem" abaixo) |
| `spec-09-client-area`              | `wave-2-parallel-areas` | ao aprovar SPEC-09                                                                                                                                                                                                                            |
| `spec-07-01-operations-list`       | `wave-2-parallel-areas` | ao aprovar SPEC-07-01 **e** depois que `spec-share-01-shared-form-fields` já estiver mergeada (precisa de `Select`/`SelectAsync` reais pros filtros)                                                                                          |
| `spec-07-02-operation-shell`       | `wave-2-parallel-areas` | ao aprovar SPEC-07-02                                                                                                                                                                                                                         |
| `spec-07-03-operation-details`     | `wave-2-parallel-areas` | ao aprovar SPEC-07-03 **e** depois que `spec-07-01` e `spec-07-02` já estiverem mergeadas em `wave-2-parallel-areas` (`spec-share-01` já estará lá por transitividade, já que `spec-07-01` depende dela)                                      |
| `spec-07-04-operation-romaneio`    | `wave-2-parallel-areas` | ao aprovar SPEC-07-04 **e** depois que `spec-07-02` e `spec-share-01-shared-form-fields` já estiverem mergeadas (`InputFileSingle` pro upload da planilha de import)                                                                          |
| `spec-07-05-operation-containers`  | `wave-2-parallel-areas` | ao aprovar SPEC-07-05 **e** depois que `spec-07-01` e `spec-07-02` já estiverem mergeadas                                                                                                                                                     |
| `spec-07-06-operation-documents`   | `wave-2-parallel-areas` | ao aprovar SPEC-07-06 **e** depois que `spec-07-01` e `spec-07-02` já estiverem mergeadas                                                                                                                                                     |
| `spec-07-07-operation-reports`     | `wave-2-parallel-areas` | ao aprovar SPEC-07-07 **e** depois que `spec-07-02` já estiver mergeada                                                                                                                                                                       |
| `spec-07-08-operation-responsible` | `wave-2-parallel-areas` | ao aprovar SPEC-07-08 **e** depois que `spec-07-02` já estiver mergeada                                                                                                                                                                       |
| `spec-07-09-operation-log`         | `wave-2-parallel-areas` | ao aprovar SPEC-07-09 **e** depois que `spec-07-02` já estiver mergeada                                                                                                                                                                       |
| `spec-08-operacional`              | `wave-2-parallel-areas` | só depois que `spec-07-01-operations-list` já foi mergeada em `wave-2-parallel-areas` (precisa do `operations-list.tsx` real, não só aprovado) — não depende das demais sub-branches de SPEC-07                                               |

`spec-share-01-shared-form-fields` nasce primeiro dentro da onda — só
depende de SPEC-00, já satisfeita quando `wave-2-parallel-areas` existe.
As branches de SPEC-03/04/05/09 nascem do mesmo ponto de
`wave-2-parallel-areas` — 03/09 **não dependem de nenhuma outra**; 04 e
05 dependem só de `spec-share-01` (não mais uma da outra — ver "Exceção de
ordem" abaixo). SPEC-07 tem uma sub-árvore própria com ordem interna (ver
"Sub-árvore de SPEC-07" abaixo) — `spec-07-02` pode nascer em paralelo com
as demais; `spec-07-01` depende de `spec-share-01`; as sub-branches `07-03`
a `07-09` dependem de `07-01`/`07-02` já estarem mergeadas. `spec-08` é a
exceção de nível superior: sai depois, de um `wave-2-parallel-areas` já com
`spec-07-01-operations-list` dentro (as demais sub-branches de SPEC-07
podem ou não estar lá ainda, tanto faz pra ela).

## Campo de form compartilhado por 2+ SPECs nasce em SPEC-SHARE-NN, não na primeira que precisou dele

Na revisão de SPEC-04 e SPEC-07-01 percebemos o mesmo padrão se repetindo:
uma SPEC de feature (SPEC-04 pro campo `address` de Harbor, SPEC-07-01 pro
filtro de tipo/status/cliente da lista de Operações) criava um campo novo
de `layouts/Form/Fields` só porque foi a primeira a precisar dele — e essa
criação virava, por acidente, um bloqueio de ordem entre SPECs que não têm
nenhuma relação real entre si (SPEC-04 bloqueando SPEC-05; SPEC-07-01
bloqueando SPEC-04 mesmo sem SPEC-04 tocar em Operações).

**Regra adotada:** um campo usado por **duas ou mais** SPECs nasce numa
SPEC própria de biblioteca compartilhada (`SPEC-SHARE-NN`, fora de
qualquer árvore de feature), não na primeira SPEC de feature que precisou
dele. Campo usado por uma só SPEC continua nascendo dentro dela. Primeira
aplicação: `SPEC-SHARE-01` (`specs/share-01-shared-form-fields/spec.md`),
que absorveu:

- `AddressGroup` (nascia em SPEC-04) — reusado por SPEC-04 e SPEC-05.
- `Select`/`SelectAsync` (nasciam em SPEC-07-01, D3) — reusados por
  SPEC-07-01, SPEC-07-03, SPEC-07-05, SPEC-07-06 e SPEC-04 (`harborId` de
  Terminal).
- Os 4 Fields de upload que já eram uma SPEC própria isolada
  (`SPEC-07-00-operations-upload-fields`) — reusados por SPEC-07-05/06.
  Não tinham o problema de "nasceram numa feature por acidente" (já eram
  library-only), mas fundir com o restante evita ter duas SPECs de Fields
  compartilhados coexistindo — ver `specs/share-01-.../spec.md` §1.

Efeito prático na ordem de merge: `spec-share-01-shared-form-fields` vira
**pré-requisito de `spec-04`, `spec-05` e `spec-07-01`**, mas em troca
**`spec-04` e `spec-05` deixam de ter ordem entre si** (a antiga exceção
"SPEC-04 antes de SPEC-05" não existe mais — as duas só dependem de
`spec-share-01`, em paralelo).

## Ordem de merge dentro da Onda 2

`spec-share-01-shared-form-fields` nasce e mergeia **primeiro**, antes de
`spec-04`, `spec-05` e `spec-07-01` (ver seção acima) — não tem
dependência própria além de SPEC-00 (já satisfeita nesse ponto). As demais
3 branches "simples" (03/09, e 04/05 já cobertas acima) não têm ordem
entre si. A sub-árvore de SPEC-07 tem ordem própria (ver "Sub-árvore de
SPEC-07" mais abaixo), independente destas. Único cuidado prático: como
`spec-03`/`09` (e `spec-04`/`05` depois de `spec-share-01` mergear)
nascem todas do mesmo commit-base, quem mergear por último deve
**atualizar a própria branch com `wave-2-parallel-areas` antes do PR**
(`git merge`/`git rebase` `wave-2-parallel-areas` dentro da branch da spec)
pra pegar o que as outras já colocaram lá — o risco de conflito real é
baixo (rotas e namespaces de i18n disjuntos por SPEC), mas o merge em si
precisa acontecer pra `wave-2-parallel-areas` sempre ter o estado mais
recente.

**Correção:** `nav/*.ts` **não** é um arquivo isolado por SPEC como este
documento afirmava — `src/layouts/AppShell/nav/administrativo.ts` é um
fragmento legado único, ainda referenciado, com itens de várias áreas
(SPEC-04/05/07-01 removem cada uma só os itens que lhe pertencem, deixando
isso explícito em "Arquivos esperados" de cada spec.md — a remoção do item
`administrativoOperations` é escopo de SPEC-07-01, não das demais
sub-branches de SPEC-07). Os itens `administrativoLog`/`administrativoOccurrences`
não têm mais spec que os remova (SPEC-06 cancelada) — ficam órfãos no
fragmento legado indefinidamente. É um ponto real de conflito potencial
entre as branches da onda — quem mergear por último sente isso com mais
força no `git merge`/rebase acima.

## Sub-árvore de SPEC-07

SPEC-07 (Operações) foi dividida em 9 sub-SPECs — decisão do usuário
durante a revisão, pela complexidade da feature (lista + shell de 7 abas,
4 delas reais). Cada sub-SPEC tem `spec.md` próprio em
`specs/07-NN-<slug>/`; `specs/07-operacoes/spec.md` é só o índice geral
(contexto e mapa de dependências, sem requisitos/critérios próprios). A
sub-SPEC que criava os Fields de upload (`07-00`) foi absorvida por
`SPEC-SHARE-01`, fora desta árvore — ver seção acima.

Ordem de merge dentro de `wave-2-parallel-areas`, especificamente entre as
sub-branches de SPEC-07:

1. **Paralelas, sem ordem entre si:** `spec-07-01-operations-list`
   (depende de `spec-share-01` já estar mergeada, ver seção acima),
   `spec-07-02-operation-shell`.
2. **Dependem de 07-02 (shell) estar mergeada:**
   `spec-07-07-operation-reports`, `spec-07-08-operation-responsible`,
   `spec-07-09-operation-log`.
   2b. **Dependem de 07-02 (shell) e `spec-share-01` estarem mergeadas:**
   `spec-07-04-operation-romaneio` (usa `InputFileSingle` de
   `spec-share-01` pro upload da planilha de import — não depende de
   07-01, só de 07-02 e `spec-share-01`).
3. **Dependem de 07-01 + 07-02 estarem mergeadas:**
   `spec-07-03-operation-details` (usa `Select` de `spec-share-01`, mas
   precisa do namespace i18n `administrative-operations.json` criado por
   07-01).
4. **Dependem de 07-01 + 07-02 estarem mergeadas (mesmo motivo de namespace
   que o item 3, mais os Fields de upload):**
   `spec-07-05-operation-containers` (usa `Select`/`InputPhotoMulti` de
   `spec-share-01`), `spec-07-06-operation-documents` (usa
   `Select`/`InputFileSingle` de `spec-share-01`).

Todas as sub-branches de SPEC-07 nascem de `wave-2-parallel-areas` (mesmo
ponto que as demais SPECs da onda), respeitando a ordem acima — não nascem
umas das outras. `spec-08-operacional` só precisa de
`spec-07-01-operations-list` mergeada (ver tabela acima), não da árvore
inteira.

## Nome do PR / título

`feat(<slug-curto>): implementa SPEC-NN — <nome>` — mesmo padrão já usado
nos commits de SPEC-00/01 (`feat(i18n): particiona dicionários...`,
`feat(theming): implementa SPEC-01...`). PR de spec vai pra branch de onda
(ou pra `SPECS-LEGADO` no caso de SPEC-02 e SPEC-08), não pra `main`.

## Quando `SPECS-LEGADO` vira PR pra `main`

Só depois que **todas** as SPECs de 02 a 09 (mais SPEC-SHARE-01; **SPEC-06
cancelada, não entra**) estiverem mergeadas nela. Contando a sub-árvore de
SPEC-07 (9 sub-branches), são **14 branches dentro de
`wave-2-parallel-areas`** (share-01, 03, 04, 05, 07-01 a 07-09, 09) mais
`spec-08-operacional` **fora** dela (PR direto pra `SPECS-LEGADO`, ver
"Estrutura" — nunca mergeia de volta em `wave-2-parallel-areas`) — 15
peças no total entre Onda 2 e Onda 3. `spec-08-operacional` e
`wave-2-parallel-areas` (com as 14 dela dentro) são as duas últimas peças.
Esse PR final é o marco de "paridade funcional com `warren/Portal`
alcançada" (com a ressalva de que Log/Ocorrências, SPEC-06, ficam de fora
por decisão deliberada, não por atraso) — é aí que este arquivo,
SPEC-SHARE-01 e as SPEC-02–09 (e as sub-SPECs 07-01 a 07-09) recebem
`status: IMPLEMENTED`. Nesse mesmo PR, `main` também recebe SPEC-00/01
(hoje só em `SPECS-LEGADO`).

## Fora deste plano

- **Laboratório** não tem SPEC nesta leva (placeholder "em construção" nos
  dois lados) — fica de fora de `SPECS-LEGADO` também.
- **Log/Ocorrências** (`administrativo-log-ocorrencias`) tinha SPEC própria
  (SPEC-06), **cancelada** — mockup sem API real (`log`/`audit`/
  `occurrence`) deixou de fazer sentido pro escopo desta leva. Fica fora de
  `SPECS-LEGADO`; os itens de nav legado correspondentes ficam órfãos (ver
  nota em "Estrutura" e em SPEC-04 §10).
