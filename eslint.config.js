// Lint rules for this repo. A rule file: agents read it, people change it (ADR 0002, ADR 0003).
// An exception goes here, with a reason; never in a disable comment.
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const prettierConfig = require("eslint-config-prettier/flat");

module.exports = defineConfig([
  expoConfig,
  // Prettier formats (npm run format:check); this turns off ESLint's formatting rules so the two never disagree.
  prettierConfig,
  {
    ignores: ["dist/*", ".expo/*"],
  },
]);
