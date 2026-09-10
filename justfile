dev:
    clear; npm run dev

build:
    clear; npm run build

lint:
    clear; npm run lint

# Regenera o client de API (hooks react-query + tipos + schemas zod) e os
# snapshots de rota estática direto do contrato OpenAPI do Core no ar — URL
# vem de API_URL no .env (ver orval.config.ts). Mesmo fluxo do warren/Portal.
map:
    clear;
    npx orval --config ./orval.config.ts;
    npx tsx ./scripts/staticSnapshots.ts;
    npx tsc --noEmit;
