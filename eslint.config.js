// Lint rules for this repo. A rule file: agents read it, people change it (ADR 0002, ADR 0003).
// An exception goes here, with a reason; never in a disable comment.
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const prettierConfig = require("eslint-config-prettier/flat");

// Layers (ADR 0004): each folder in src/ and the folders it may import from. Imports flow one way.
// Keep in step with the ADR's table.
const LAYERS = {
  app: ["components", "hooks", "store", "theme", "constants", "utils", "types"],
  components: ["hooks", "theme", "constants", "utils", "types"],
  hooks: ["store", "api", "theme", "constants", "utils", "types"],
  store: ["api", "constants", "utils", "types"],
  api: ["constants", "utils", "types"],
  theme: ["constants", "types"],
  utils: ["types"],
  constants: [],
  types: [],
};

// One zone per folder: it may import from src/ only itself and its listed folders.
const layerZones = Object.entries(LAYERS).map(([folder, allowed]) => ({
  target: `./src/${folder}`,
  from: "./src",
  except: [folder, ...allowed].map((name) => `./${name}`),
  message: `src/${folder}/ may import from ${allowed.join(", ") || "nothing in src/"} (ADR 0004).`,
}));

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
  // Test files may import any layer, so a test can set up the store for a hook or a screen.
  // Zone paths are relative to the folder ESLint runs in: the repo root, for npm run lint and the hooks.
  {
    files: ["src/**"],
    ignores: ["**/*.test.*", "**/*.spec.*", "**/__tests__/**"],
    rules: {
      "import/no-restricted-paths": ["error", { zones: layerZones }],
    },
  },
]);
