


limp:
    clear
    rm -rf ./dist/ ./tmp/ .pnp*


clean:
    just limp;
    rm -rf ./node_modules/

start:
    clear;
    bun --bun run dev;

type-check:
    clear;
    bun run type-check;

dev:
    clear; bun run dev

build:
    clear; bun run build

lint:
    clear; bun run lint

# Regenera o client de API (hooks react-query + tipos + schemas zod) e os
# snapshots de rota estática direto do contrato OpenAPI do Core no ar — URL
# vem de API_URL no .env (ver orval.config.ts). Mesmo fluxo do warren/Portal.
map:
    clear;
    npx orval --config ./orval.config.ts;
    npx tsx ./scripts/staticSnapshots.ts;
    npx tsc --noEmit;

deploy:
    clear;
    git fetch;
    git pull;
    bun run build;
