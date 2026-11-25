---
status: accepted (2026-11-25)
---

# Imports use `@/` paths and follow one direction between folders

## Import style

- Code outside the current folder is imported as `@/<folder>/...`, such as `@/theme` or `@/utils/strings`. Bare names like `theme` aren't used: `constants` is a Node built-in, and `utils`, `types`, `store`, `api` and `hooks` are all names of npm packages.
- `../` imports are banned. Code in the same folder or a subfolder uses `./`.
- Imports come in three groups, with a blank line between groups:
  1. packages
  2. `@/` imports
  3. `./` imports

  Within a group, imports are not sorted alphabetically.

## Layers

Each folder in `src/` may import only from the folders listed for it. Imports flow one way.

| Folder                 | May import from                                                        |
| ---------------------- | ---------------------------------------------------------------------- |
| `app/` (routes)        | `components`, `hooks`, `store`, `theme`, `constants`, `utils`, `types` |
| `components/`          | `hooks`, `theme`, `constants`, `utils`, `types`                        |
| `hooks/`               | `store`, `api`, `theme`, `constants`, `utils`, `types`                 |
| `store/`               | `api`, `constants`, `utils`, `types`                                   |
| `api/`                 | `constants`, `utils`, `types`                                          |
| `theme/`               | `constants`, `types`                                                   |
| `utils/`               | `types`                                                                |
| `constants/`, `types/` | nothing in `src/`                                                      |

Components get data through props or hooks, never from `store` or `api` directly. That keeps them easy to test and reuse.

ESLint enforces both parts: `import/order`, `no-restricted-imports` for `../`, and `import/no-restricted-paths` for the layers. Test files are exempt from the layer rules.
