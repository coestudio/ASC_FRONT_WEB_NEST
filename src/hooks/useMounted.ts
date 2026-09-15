import { useEffect, useState } from "react";

/**
 * Gate de montagem (SPEC-10 §14 / SPEC-18): `true` só depois que o
 * componente já hidratou no client (nunca `true` durante o SSR). Usado por
 * telas que chamam `useSsrSafeQuery` fora do `CrudListPage` — sem esse gate
 * o hook de busca existiria na árvore durante o SSR e a integração de
 * streaming do TanStack Query pode tentar buscá-lo mesmo com
 * `enabled: false`. Cada consumidor decide o próprio fallback (spinner puro,
 * com header, dentro/fora de `PageLayout`) — este hook só devolve o
 * booleano, não decide o que renderizar.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
