import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

// The layer table from ADR 0004: each folder in src/ and the folders it may import from.
// This is the spec; eslint.config.js must agree with it.
const MAY_IMPORT: Record<string, string[]> = {
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
const FOLDERS = Object.keys(MAY_IMPORT);

const REPO = resolve(__dirname, "..");
const CONFIGS = ["eslint.config.js", "tsconfig.json", "package.json"];

// One ESLint run over a throwaway project takes a few seconds.
jest.setTimeout(120_000);

// A throwaway project outside the repo, with the repo's configs and node_modules:
// every layer gets a real module, since the rule follows imports to their files.
let root: string;
let messages: Map<string, { ruleId: string | null; message: string }[]>;

function write(path: string, text: string) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
}

const sample = (from: string, to: string) => `src/${from}/uses-${to}.ts`;
const TEST_FILES = [
  "src/utils/uses-store.test.ts",
  "src/components/__tests__/uses-store.ts",
];

beforeAll(() => {
  // ESLint reports real paths, and on macOS the temp folder sits behind a symlink.
  root = realpathSync(mkdtempSync(join(tmpdir(), "eslint-layers-")));
  for (const config of CONFIGS)
    copyFileSync(join(REPO, config), join(root, config));
  symlinkSync(join(REPO, "node_modules"), join(root, "node_modules"), "dir");

  for (const folder of FOLDERS)
    write(`src/${folder}/index.ts`, `export const ${folder}Value = 1;\n`);
  for (const from of FOLDERS)
    for (const to of FOLDERS) {
      if (from === to) continue;
      write(
        sample(from, to),
        `import { ${to}Value } from "@/${to}";\n\nexport const value = ${to}Value;\n`,
      );
    }
  // The same folder, through ./ and a subfolder.
  write(
    "src/components/list/row.ts",
    'import { componentsValue } from "@/components";\n\nimport { value } from "./cell";\n\nexport const row = [componentsValue, value];\n',
  );
  write("src/components/list/cell.ts", "export const value = 1;\n");
  for (const file of TEST_FILES)
    write(
      file,
      'import { storeValue } from "@/store";\n\nexport const value = storeValue;\n',
    );

  const result = spawnSync(
    "npx",
    ["--no-install", "eslint", "--format", "json", "src"],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, npm_config_loglevel: "error" },
    },
  );
  const files = JSON.parse(result.stdout) as {
    filePath: string;
    messages: { ruleId: string | null; message: string }[];
  }[];
  messages = new Map(
    files.map((f) => [
      f.filePath.slice(root.length + 1),
      f.messages.filter((m) => m.ruleId === "import/no-restricted-paths"),
    ]),
  );
});
afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

const layerErrors = (path: string) => {
  const found = messages.get(path);
  if (!found) throw new Error(`ESLint didn't lint ${path}`);
  return found;
};

const pairs = FOLDERS.flatMap((from) =>
  FOLDERS.filter((to) => to !== from).map(
    (to) => [from, to, MAY_IMPORT[from]?.includes(to) ?? false] as const,
  ),
);

describe("the layers from ADR 0004", () => {
  it.each(pairs.filter(([, , allowed]) => allowed))(
    "lets src/%s import @/%s",
    (from, to) => {
      expect(layerErrors(sample(from, to))).toEqual([]);
    },
  );

  it.each(pairs.filter(([, , allowed]) => !allowed))(
    "stops src/%s importing @/%s",
    (from, to) => {
      const errors = layerErrors(sample(from, to));
      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toContain("ADR 0004");
      expect(errors[0]?.message).toContain(`src/${from}/`);
    },
  );

  it("names what the folder may import in the message", () => {
    expect(layerErrors(sample("utils", "store"))[0]?.message).toContain(
      "types",
    );
    expect(layerErrors(sample("types", "utils"))[0]?.message).toContain(
      "nothing",
    );
  });

  it("lets a folder import itself, through @/ and ./", () => {
    expect(layerErrors("src/components/list/row.ts")).toEqual([]);
  });

  it.each(TEST_FILES)("exempts the test file %s", (file) => {
    expect(layerErrors(file)).toEqual([]);
  });
});
