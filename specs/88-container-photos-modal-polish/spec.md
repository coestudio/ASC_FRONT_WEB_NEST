status: IMPLEMENTED

# SPEC-88 — Polish visual do modal "Fotos — {identificador}" (aba Containers)

## Objetivo

Aplicar a régua de polish visual já usada nas outras abas de Operações nesta
sessão (SPEC-56 `.soft-card`, SPEC-58/64/87 hierarquia visual) ao modal de
fotos do checklist de container (`ContainerPhotos` / `ContainerPhotoSlotCell`
em `src/components/operations/tabs/Containers.tsx`). Hoje cada slot do
checklist renderiza com `border rounded p-2` cru do Bootstrap, empilhado numa
única coluna vertical — visualmente monótono, thumbnails pequenos (64px)
soltos, sem hierarquia clara entre ícone de status, nome do slot e o botão de
upload.

## Contexto

Usuário sinalizou explicitamente (print do modal) que a região
`ContainerPhotos`/`ContainerPhotoSlotCell` (linhas ~656-905 do arquivo) está
liberada pra mexer nesta SPEC. Mesmo arquivo, resto da aba (tabela de
containers, modal de lacre) fora de escopo.

## Escopo

1. `ContainerPhotoSlotCell` — trocar `border rounded p-2` por
   `soft-card p-3` (mesmo tratamento de sombra/borda suave usado em
   `Responsible.tsx` linha 286). Reorganizar hierarquia interna: ícone de
   status + nome do slot em destaque no topo, thumbnails um pouco maiores
   (72px) em grid de wrap, botão de upload (`InputPhotoSingle`) com posição
   clara abaixo, sempre visível.
2. Layout dos slots do checklist — trocar `d-flex flex-column gap-2` (pilha
   vertical única) por grid responsivo `Row`/`Col` (mesmo padrão de
   `Reports.tsx`: `<Row className="g-3"><Col xs={12} md={6}>`), 1 coluna em
   mobile e 2 colunas em telas `md+`. Mesma lista `PHOTO_CHECKLIST_SLOTS`,
   mesma ordem, zero mudança de lógica de upload/remoção/contagem.
3. Cabeçalho da seção (título + badge "Faltam X fotos"/"completo") — mantém
   `Badge bg="success"/"warning"` (já é o padrão certo, SPEC não troca cor),
   ganha leve ajuste de espaçamento/tipografia pra abrir mais respiro antes
   do grid.
4. Seção "Outras fotos" — mesmo tratamento `soft-card` no container da
   grade de thumbnails avulsos, consistente com o checklist acima.
5. **Fora do escopo**: qualquer mudança de cor/paleta/token de tema, qualquer
   mudança de lógica de negócio (upload por slot, remoção, contagem de
   faltantes, filtro de fotos sem `file` — linhas ~700-707), qualquer outra
   região do arquivo `Containers.tsx` (tabela, modal de lacre, `AddOtherPhotoControl`
   ganha só ajuste visual de container, mantendo o campo controlado como
   está).

## Requisitos não funcionais

- Sem novo import de cor hardcoded — só classes utilitárias Bootstrap e
  `.soft-card` já definida em `src/styles/globals/base.css` (SPEC-56).
- `Row`/`Col` importados de `react-bootstrap` (padrão já usado em
  `Details.tsx`/`Reports.tsx` no mesmo diretório).
- Sem novo componente novo em `layouts/Form/Fields` — `InputPhotoSingle` já
  existente, comportamento de auto-submit inalterado.

## Camada de dados

Não aplicável — SPEC é puramente visual, zero mudança em hook Orval, query,
mutation ou contrato do Core.

## UI

- `ContainerPhotoSlotCell`: `soft-card p-3`, ícone de status maior/mais
  destacado ao lado do nome do slot, thumbnails 72px, botão de upload
  sempre no rodapé do card.
- Grid `Row className="g-3"` / `Col xs={12} md={6}` para os 8 slots do
  checklist.
- Seção "Outras fotos": container `soft-card p-3` envolvendo a grade de
  thumbnails + `AddOtherPhotoControl`.

## i18n

Nenhuma chave nova — todas as chaves usadas já existem
(`administrative-operations.containers.photo*`).

## Dependências

Nenhuma nova. Reaproveita `Row`/`Col` de `react-bootstrap` (já dependência
do projeto).

## Arquivos esperados

- `src/components/operations/tabs/Containers.tsx` (edição)

## Critérios de aceitação

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | `ContainerPhotoSlotCell` usa `.soft-card` em vez de `border rounded` cru | PASS |
| 2 | Grid de slots responsivo (1 col mobile, 2 col `md+`) via `Row`/`Col` | PASS |
| 3 | Seção "Outras fotos" com mesmo tratamento visual (`soft-card`) | PASS |
| 4 | Nenhuma cor hardcoded introduzida — só tokens/classes Bootstrap existentes | PASS |
| 5 | Lógica de upload/remoção/contagem de faltantes intacta (zero diff funcional) | PASS |
| 6 | `bun run check` limpo | PASS |
| 7 | `bun run lint` sem novos erros (baseline 0 errors / 63 warnings) | PASS |

## Riscos

Nenhum — mudança isolada a uma região de um único arquivo, sem tocar em
lógica de dados.

## Decisões pendentes

Nenhuma.
