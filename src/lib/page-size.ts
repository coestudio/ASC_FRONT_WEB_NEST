/**
 * Tamanho de página padrão de toda listagem paginada do projeto —
 * controlado por `VITE_PAGE_SIZE` no `.env`. Antes cada tela tinha seu
 * `PAGE_SIZE` hardcoded, misturando 5/10/20 sem critério; agora é um valor
 * só, trocável sem mexer em código.
 */
export const DEFAULT_PAGE_SIZE = Number(import.meta.env.VITE_PAGE_SIZE) || 5;
