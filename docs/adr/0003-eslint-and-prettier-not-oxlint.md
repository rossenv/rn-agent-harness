---
status: accepted (2026-11-25)
---

# ESLint and Prettier, not oxlint

The lab this harness comes from uses oxlint. We use ESLint with `eslint-config-expo` (what `npx expo lint` sets up), and Prettier for formatting.

Our import-grouping rule needs `import/order` with groups and a blank line between them, and React needs the react-hooks rules. oxlint has no `import/order`, and its support for ESLint plugins was still alpha when we checked (2026-11-25). Prettier runs as a separate step, not as an ESLint rule, which keeps lint fast and its errors readable.

The lab's bans carry over into `eslint.config.js`: no `any`, no `@ts-ignore` or `@ts-expect-error`, and no `.skip` or `.only` on tests. A rule exception goes in `eslint.config.js` with a reason, never in a disable comment.

## Consequences

- The lint-on-edit hook is a little slower than the lab's.
- If oxlint gains `import/order` and stable plugin support, this is worth revisiting.
