import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

// The import rules from ADR 0004, run through the repo's real eslint.config.js.
const ROOT = resolve(__dirname, "..");

// Each run starts ESLint, which takes a few seconds.
jest.setTimeout(60_000);

type Message = { ruleId: string | null; message: string };

// Lints `code` as if it were the file at `path`, and returns the messages from the rules under test.
function lint(path: string, code: string): Message[] {
  const result = spawnSync(
    "npx",
    [
      "--no-install",
      "eslint",
      "--format",
      "json",
      "--stdin",
      "--stdin-filename",
      path,
    ],
    {
      cwd: ROOT,
      input: code,
      encoding: "utf8",
      env: { ...process.env, npm_config_loglevel: "error" },
    },
  );
  const [file] = JSON.parse(result.stdout) as { messages: Message[] }[];
  return (file?.messages ?? []).filter(
    (m) => m.ruleId === "import/order" || m.ruleId === "no-restricted-imports",
  );
}

const rules = (messages: Message[]) => messages.map((m) => m.ruleId);

describe("../ imports are banned", () => {
  it.each([
    'import { sum } from "../utils/sum";\n\nexport const x = sum;\n',
    'import { theme } from "../../theme";\n\nexport const x = theme;\n',
    'export { sum } from "../utils/sum";\n',
  ])("fails on %j", (code) => {
    const messages = lint("src/components/list/item.ts", code);
    expect(rules(messages)).toContain("no-restricted-imports");
    expect(messages[0]?.message).toContain("@/");
  });

  it("fails in a test file too", () => {
    const messages = lint(
      "__tests__/item.test.ts",
      'import { sum } from "../src/utils/sum";\n\nexport const x = sum;\n',
    );
    expect(rules(messages)).toContain("no-restricted-imports");
  });

  it("allows ./ and @/ imports", () => {
    const code = [
      'import { theme } from "@/theme";',
      "",
      'import { Row } from "./row";',
      "",
      "export const x = [theme, Row];",
      "",
    ].join("\n");
    expect(lint("src/components/list/item.ts", code)).toEqual([]);
  });
});

describe("three import groups: packages, @/, ./", () => {
  it("passes the groups in order, with a blank line between them", () => {
    const code = [
      'import { useState } from "react";',
      'import { Text } from "react-native";',
      "",
      'import { theme } from "@/theme";',
      'import type { Todo } from "@/types/todo";',
      "",
      'import { Row } from "./row";',
      'import { styles } from "./styles";',
      "",
      "export const x = [useState, Text, theme, Row, styles];",
      "export type T = Todo;",
      "",
    ].join("\n");
    expect(lint("src/components/list/item.tsx", code)).toEqual([]);
  });

  it("doesn't sort within a group", () => {
    const code = [
      'import { Text } from "react-native";',
      'import { useState } from "react";',
      "",
      'import { sum } from "@/utils/sum";',
      'import { theme } from "@/theme";',
      "",
      "export const x = [Text, useState, sum, theme];",
      "",
    ].join("\n");
    expect(lint("src/components/item.tsx", code)).toEqual([]);
  });

  it.each([
    [
      "an @/ import before a package",
      [
        'import { theme } from "@/theme";',
        "",
        'import { Text } from "react-native";',
      ],
    ],
    [
      "a ./ import before an @/ import",
      ['import { Row } from "./row";', "", 'import { theme } from "@/theme";'],
    ],
    [
      "no blank line between groups",
      [
        'import { Text } from "react-native";',
        'import { theme } from "@/theme";',
      ],
    ],
    [
      "a blank line inside a group",
      [
        'import { Text } from "react-native";',
        "",
        'import { useState } from "react";',
      ],
    ],
  ])("fails on %s", (_label, lines) => {
    const code = [...lines, "", "export const x = 1;", ""].join("\n");
    expect(rules(lint("src/components/item.tsx", code))).toContain(
      "import/order",
    );
  });
});
