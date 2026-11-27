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
  // Import style (ADR 0004): `@/` for code outside the folder, `./` inside it, never `../`;
  // three groups (packages, `@/`, `./`) with a blank line between them, not sorted within a group.
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../*", ".."],
              message:
                "Import code outside this folder as @/<folder>/... (ADR 0004). ../ imports are banned.",
            },
          ],
        },
      ],
      "import/order": [
        "error",
        {
          groups: [["builtin", "external"], "internal", ["sibling", "index"]],
          pathGroups: [{ pattern: "@/**", group: "internal" }],
          pathGroupsExcludedImportTypes: ["builtin"],
          "newlines-between": "always",
          alphabetize: { order: "ignore" },
        },
      ],
    },
  },
]);
