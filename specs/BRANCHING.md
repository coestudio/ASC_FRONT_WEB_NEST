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
      │   ├── spec-03-admin-access             ONDA 2 — as 6 em paralelo,
      │   ├── spec-04-administrativo-cadastros   cada uma a partir de
      │   ├── spec-05-administrativo-clientes     wave-2-parallel-areas,
      │   ├── spec-06-administrativo-log-ocorrencias PR de volta pra ela
      │   ├── spec-07-operacoes                  (não pra SPECS-LEGADO
      │   └── spec-09-client-area                 direto)
      │        PR → wave-2-parallel-areas
      │
      │   (quando as 6 estiverem mergeadas em wave-2-parallel-areas:)
      │        PR wave-2-parallel-areas → SPECS-LEGADO
      │
      └── spec-08-operacional                  ONDA 3 — a partir de
               PR → SPECS-LEGADO                 wave-2-parallel-areas,
                                                  só depois que
                                                  spec-07 (não as
                                                  outras 5) já estiver
                                                  mergeada nela — é o
                                                  único que precisa do
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
| `spec-07-operacoes` | `wave-2-parallel-areas` | ao aprovar SPEC-07 |
| `spec-09-client-area` | `wave-2-parallel-areas` | ao aprovar SPEC-09 |
| `spec-08-operacional` | `wave-2-parallel-areas` | só depois que `spec-07-operacoes` já foi mergeada em `wave-2-parallel-areas` (precisa do `operations-list.tsx` real, não só aprovado) |

As 6 branches da Onda 2 nascem todas do mesmo ponto de `wave-2-parallel-
areas` (logo após ela existir) e **não dependem umas das outras** — podem
ser implementadas ao mesmo tempo, em paralelo, por sessões/pessoas
diferentes. `spec-08` é a exceção: sai depois, de um `wave-2-parallel-areas`
já com `spec-07` dentro (as outras 5 podem ou não estar lá ainda, tanto
faz pra ela).

## Ordem de merge dentro da Onda 2

Sem ordem entre si, **exceto SPEC-04 → SPEC-05** (ver abaixo) — as demais 5
podem mergear em `wave-2-parallel-areas` em qualquer ordem. Único cuidado
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
(SPEC-04/05/06/07 removem cada uma só os itens que lhe pertencem, deixando
isso explícito em "Arquivos esperados" de cada spec.md). É um ponto real de
conflito potencial entre as branches da onda — quem mergear por último
sente isso com mais força no `git merge`/rebase acima.

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

Só depois que **todas** as 8 SPECs (02–09) estiverem mergeadas nela —
`spec-08-operacional` e `wave-2-parallel-areas` (com as 6 dela dentro) são
as duas últimas peças. Esse PR final é o marco de "paridade funcional com
`warren/Portal` alcançada" — é aí que este arquivo e as SPEC-02–09 recebem
`status: IMPLEMENTED`. Nesse mesmo PR, `main` também recebe SPEC-00/01
(hoje só em `SPECS-LEGADO`).

## Fora deste plano

- **Laboratório** não tem SPEC nesta leva (placeholder "em construção" nos
  dois lados) — fica de fora de `SPECS-LEGADO` também.
