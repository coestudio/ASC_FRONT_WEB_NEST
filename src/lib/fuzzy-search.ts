/**
 * Busca tolerante pra todas as listagens: ignora maiúscula/minúscula e
 * acento, casa por trecho ("leo" → "Leonardo") e aceita pequenos erros de
 * digitação ("leonrado" → "Leonardo"). O Core só sabe fazer `Search` literal,
 * então as listagens de tamanho pequeno/médio buscam a lista completa e
 * filtram aqui (ver `fuzzy-list-query.ts`).
 */

/** Minúsculas, sem acento, só letras/números separados por espaço único. */
export function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Distância de edição (Damerau-Levenshtein "OSA": troca de letras vizinhas custa 1). */
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => [
    i,
    ...new Array<number>(n).fill(0),
  ]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

/** Erros tolerados por tamanho do termo digitado (termo de 1-2 letras não erra). */
function allowedErrors(length: number): number {
  if (length <= 2) return 0;
  if (length <= 6) return 1;
  return 2;
}

/**
 * Custo de casar o termo `token` com a palavra `word` (menor é melhor,
 * `null` = não casa): 0 = trecho exato; >0 = quantidade de erros tolerados.
 * Compara a palavra inteira e também o começo dela (usuário ainda digitando).
 */
function tokenCost(token: string, word: string): number | null {
  if (word.includes(token)) return word.startsWith(token) ? 0 : 0.25;
  const k = allowedErrors(token.length);
  if (k === 0) return null;
  let best = Infinity;
  best = Math.min(best, editDistance(token, word));
  for (let len = token.length - 1; len <= token.length + 1; len++) {
    if (len > 0 && len < word.length)
      best = Math.min(best, editDistance(token, word.slice(0, len)));
  }
  return best <= k ? best : null;
}

/**
 * Pontuação de um item contra a busca (menor é melhor; `null` = não casa).
 * Todo termo digitado precisa casar com alguma palavra de algum dos textos.
 */
export function fuzzyScore(query: string, texts: Array<string | null | undefined>): number | null {
  const tokens = normalizeText(query).split(" ").filter(Boolean);
  if (tokens.length === 0) return 0;

  const normalized = texts.map((t) => normalizeText(t)).filter(Boolean);
  const words = normalized.flatMap((t) => t.split(" "));
  const compactQuery = tokens.join("");
  const compactTexts = normalized.map((t) => t.replace(/ /g, ""));

  // Documento/telefone digitado com ou sem pontuação, atravessando separadores.
  if (compactQuery.length >= 3 && compactTexts.some((t) => t.includes(compactQuery))) return 0;

  let total = 0;
  for (const token of tokens) {
    let best: number | null = null;
    for (const word of words) {
      const cost = tokenCost(token, word);
      if (cost !== null && (best === null || cost < best)) best = cost;
      if (best === 0) break;
    }
    if (best === null) return null;
    total += best;
  }
  return total;
}

/**
 * Filtra `items` pela busca tolerante. Com busca vazia devolve tudo na ordem
 * original; com busca, mantém só quem casa e ordena por relevância (empate
 * preserva a ordem original — a ordenação escolhida pelo usuário).
 */
export function fuzzyFilter<T>(
  items: T[],
  query: string,
  getTexts: (item: T) => Array<string | null | undefined>,
  { rank = true }: { rank?: boolean } = {},
): T[] {
  if (!normalizeText(query)) return items;
  const scored: Array<{ item: T; score: number; index: number }> = [];
  items.forEach((item, index) => {
    const score = fuzzyScore(query, getTexts(item));
    if (score !== null) scored.push({ item, score, index });
  });
  if (rank) scored.sort((a, b) => a.score - b.score || a.index - b.index);
  return scored.map((s) => s.item);
}
