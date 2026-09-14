// Versão do app exibida no footer do sidebar (SPEC-11, item 7).
// Reexporta só o campo `version` do package.json — o bundler (Vite/Rollup)
// faz tree-shaking do JSON importado por nome, então o resto do
// package.json (deps, scripts etc.) não vaza pro bundle do browser.
import { version } from "../../package.json";

export const APP_VERSION = version;
