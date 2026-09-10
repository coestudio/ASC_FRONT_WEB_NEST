/**
 * Verificação NÃO-bloqueante do contrato de API — roda nos hooks `pre*` de
 * `dev` / `build` / `start` (ver package.json). Mesma ideia do
 * `warren/Portal/Scripts/checkApiContract.ts`, adaptado pra Next.
 *
 * Compara o hash do contrato OpenAPI no ar com o marcador `src/api/snapshot.json`
 * (gravado no último `just map`):
 *  - igual        → ✓ verde, segue;
 *  - diferente    → ⚠ amarelo, avisa que `src/api/generated` pode estar velho;
 *  - sem marcador → ⚠ amarelo, pede `just map`;
 *  - API fora do ar / sem API_URL → nota discreta, segue.
 *
 * Sempre sai com código 0 — só informa, nunca trava o comando.
 */
import { getOpenApiUrl, fetchSpec, hashSpec, readSnapshot } from "./apiContract";

const G = "\x1b[32m";
const Y = "\x1b[33m";
const D = "\x1b[2m";
const B = "\x1b[1m";
const R = "\x1b[0m";

const tag = `${D}[api]${R}`;

function done(): never {
  process.exit(0);
}

async function main() {
  const stored = readSnapshot();

  let url: string;
  try {
    url = getOpenApiUrl();
  } catch (err) {
    console.log(`${tag} ${Y}⚠ ${(err as Error).message}${R}`);
    done();
  }

  if (!stored) {
    console.log(
      `${tag} ${Y}⚠ sem snapshot local do contrato — rode ${B}just map${R}${Y} para gerar os schemas.${R}`,
    );
    done();
  }

  try {
    const live = hashSpec(await fetchSpec(url));

    if (live === stored.hash) {
      console.log(
        `${tag} ${G}✓ contrato em dia${R} ${D}(v${stored.version}, ${stored.pulledAt})${R}`,
      );
    } else {
      console.log(
        `${tag} ${Y}${B}⚠ o contrato de API MUDOU${R}${Y} desde o último ${B}just map${R}${Y} — ` +
          `src/api/generated pode estar desatualizado.${R}`,
      );
      console.log(`${tag}   ${D}local: ${stored.hash.slice(0, 23)}…  (${stored.pulledAt})${R}`);
      console.log(`${tag}   ${D}live : ${live.slice(0, 23)}…  (${url})${R}`);
      console.log(`${tag}   ${D}→ rode ${R}${B}just map${R}${D} para regenerar.${R}`);
    }
  } catch (err) {
    console.log(
      `${tag} ${D}· não foi possível verificar (${(err as Error).message}) — seguindo.${R}`,
    );
  }

  done();
}

main();
