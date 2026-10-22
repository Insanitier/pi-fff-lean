# Maintenance

## Pinned upstream

`opensec-pi-fff@0.11.1` — exact version, no range, in `dependencies`. The wrapper is built against its
internals, so an unplanned upgrade can silently stop trimming.

## What this package depends on

| Upstream internals | Used for |
| --- | --- |
| `pi.registerTool(tool)` | The single interception point. Everything else on `pi` passes through. |
| Entry path `dist-bun/index.js` | Upstream declares its entry only in `pi.extensions` and has no `main` or `exports`, so `index.js` imports the explicit path. Importing the bare package name does not resolve. |
| Registered names `ffgrep` / `fffind` / `fff-multi-grep` | `tools-and-ui` and `tools-only` modes. |
| Registered names `grep` / `find` / `multi_grep` | `override` mode. Names are templated into the lean guidelines. |
| Schema property names | `grepSchema`, `findSchema`, `multiGrepSchema`. `applyFieldDescriptions` throws if a declared field is gone. |
| `defaultActive` | Upstream does not set it, so its tools activate on registration. Nothing here depends on it, but the "override replaces the built-ins" story does. |
| `dist-bun/core.cjs` `@bun @bun-cjs` wrapper | Tests only. `src/upstream.js` invokes the IIFE by hand because Node parses but never calls it. |
| `OPENSEC_FFF_BACKEND` | Tests only, to force the `ffi-rs` backend that a JIT-less Pi-Bolt uses. |
| Host module bridge `Symbol.for("opensec-pi-fff@<version>:host-modules")` | Tests only, to supply `@sinclair/typebox` and a `@earendil-works/pi-tui` stub. |

The wrapper deliberately does **not** touch `setActiveTools`. Upstream calls it once, at session start,
to deactivate the built-in `grep`/`find` in `override` mode; `/fff-mode` never calls it (it asks for a
`/reload` instead), so there is no mid-session tool-list churn to block.

## What was trimmed

Per tool, from upstream to lean:

- `description`: rewritten short. Upstream's `ffgrep` description repeats the frecency ranking and the
  in-file ordering; `fffind`'s repeats "matches against the whole repo-relative path" from its `pattern` field.
- `promptGuidelines`: 5 → 3 for `ffgrep`, 6 → 4 for `fffind`, 3 → 2 for `fff-multi-grep`.
- `path`, `exclude`: identical long text in both tools → short one-liners.
- `fffind.pattern`: 463 → 40 characters.
- `pattern`, `context`, `limit`, `caseSensitive`: descriptions deleted.
- `regex`: kept, because "default is auto-detect" is not derivable from the name and type.

Nothing structural changed: no field, type, `required` entry or default was added or removed, and no
`execute` behaviour was touched.

## Upgrading

1. Read this file, then check the new upstream version against `0.11.1`: added or removed tools, renamed
   tools, changed schema fields or defaults, and whether the internals in the table above still hold.
2. If only the version changed, bump the dependency and the version in `package.json`. `src/upstream.js`
   derives the host-module symbol key from the installed package, so nothing else needs editing.
3. Run `npm install` and `npm test`. The field-existence test fails loudly on a renamed or removed schema
   field; fix `src/lean.js` for the new shape and keep the trimming rules in the README.
4. Run `npm run measure`, and update the README table and the version in this file.
5. Verify in a real session: `/fff-health` should report the engine, and the model should see `grep` and
   `find` in `override` mode.

`npm test` runs in Node against the installed upstream, so a broken adaptation is caught without starting Pi.
