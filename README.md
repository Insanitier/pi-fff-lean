# opensec-pi-fff-lean

Lean tool definitions for [`opensec-pi-fff`](https://www.npmjs.com/package/opensec-pi-fff), the OpenSec Bun
build of [`@ff-labs/pi-fff`](https://github.com/dmtrKovalenko/fff/tree/main/packages/pi-fff). It keeps every
feature and every parameter exactly as upstream; only the text the model reads on every request is shorter.

`opensec-pi-fff` is by OpenSec, and FFF is by Dmitriy Kovalenko. This package wraps upstream, copies none of
its code, and keeps its MIT license.

## Measured

Tool definitions as serialized into a request (name + description + promptGuidelines + parameters), against
the pinned upstream `0.11.1`. Tokens are a character proxy, `ceil(chars / 4)`, not a provider tokenizer.

| Tool | Upstream | Lean | Saved |
| --- | ---: | ---: | ---: |
| `ffgrep` | 2182 (~546 tok) | 1046 (~262 tok) | 52% |
| `fffind` | 2282 (~571 tok) | 948 (~237 tok) | 58% |
| **Total** | **4464 (~1116 tok)** | **1994 (~499 tok)** | **55%** |

`fff-multi-grep` is off unless `PI_FFF_MULTIGREP=1`, so it is not counted; it is trimmed too.

`npm run measure` reproduces the table from the installed upstream.

### Net cost against Pi's built-ins

In `override` mode these two definitions replace Pi's ripgrep-backed `grep` and `find` rather than adding to
them. Measured the same way against Pi 1.3.0, the built-in pair is 1680 chars (~420 tok), so the net cost of
using FFF is **~79 tokens per request** — against ~700 before trimming.

## What changed

- **Descriptions** state each thing once and drop the marketing. `fffind`'s `pattern` field alone carried a
  463-character argument for preferring it over `ls`/`find`/`bash`; it is now 40 characters.
- **`path` and `exclude`** were described identically in both tools (1128 characters total) and are now
  short one-liners in each.
- **`promptGuidelines`** went from 11 lines to 7, keeping only the rules that change how the tool is called:
  that ranked, capped output is not proof of absence, that `fffind` matches the whole path, and that an exact
  filename needs a glob in `path`. Restatements of the schema are gone.
- **Parameter descriptions** are dropped where the field name and type already say it (`pattern`, `context`,
  `limit`, `caseSensitive`). Field names, types, optionality, `required`, and defaults are untouched.

`promptSnippet`, `label`, `execute`, `renderCall` and `renderResult` are passed through by identity.

## Install

```bash
cd /path/to/opensec-pi-fff-lean
npm install          # .npmrc pins legacy-peer-deps so upstream's peer deps are not pulled in
pi-bolt install /path/to/opensec-pi-fff-lean
```

Use an absolute path: a local source is resolved against Pi's working directory, not the settings file.
Then `/reload` or restart.

Install this **or** `opensec-pi-fff`, not both — they register the same tools.

### Recommended: override mode

In `~/.pi/agent/pi-fff.json`:

```json
{ "mode": "override" }
```

In `override` mode the tools register as `grep` and `find` and replace Pi's built-ins, so the model sees the
names it already knows and you pay for one set of definitions rather than two. This is also why the built-in
`grep`/`find` should stay out of `defaultTools`.

## Updating

There are two layers, and only one of them is automatic.

### This package: `pi update`

```bash
pi-bolt update git:github.com/Insanitier/pi-fff-lean   # or: pi-bolt update --extensions
```

For a git package Pi fetches the ref the clone tracks (`origin/main`), and when it has moved it does
`git reset --hard`, `git clean -fdx`, then `npm install --omit=dev --legacy-peer-deps`. So a push to `main`
is all it takes. When nothing has moved it only reinstalls dependencies that are missing.

Because of the `git clean -fdx`, `node_modules` must never be committed, and `package-lock.json` must be:
it is what makes the reinstall resolve the same platform binaries every time.

### Upstream: by hand, on purpose

The dependency is pinned to an exact version, so a new `opensec-pi-fff` release does not arrive on its own.
To take one:

```bash
cd <this repo>
npm install opensec-pi-fff@<new version>
npm test          # a renamed or removed schema field fails here
npm run measure   # update the table above if the numbers moved
git commit -am "opensec-pi-fff <new version>" && git push
pi-bolt update git:github.com/Insanitier/pi-fff-lean
```

This is deliberate. The trimming depends on upstream's schema *field names*, and an automatic upgrade has
two failure modes: a removed field makes `applyFieldDescriptions` throw at startup (loud, good), but an
*added* field is silently left untrimmed and the token count creeps back (quiet, bad). The test suite turns
the second one into something you have to look at.

## Tests

```bash
npm test        # definitions, in Node, against the installed upstream
npm run smoke   # the native engine, under Pi-Bolt's runtime
```

`npm test` loads the real upstream extension and checks that every tool reaches `pi` through the proxy
trimmed, that `execute` and the renderers survive, that the upstream schema is not mutated and its typebox
symbols survive, that property names, types and `required` are unchanged, and that a field the upstream
schema no longer has fails loudly instead of silently going untrimmed.

`npm run smoke` runs the native engine on a temp directory and greps it. Pi-Bolt warns at startup that this
extension imports `bun:ffi`; the OpenSec build falls back to `ffi-rs` on a JIT-less build, and
`npm run smoke:no-jit` forces that fallback to prove it. `/fff-health` reports which one ran.

See [MAINTENANCE.md](MAINTENANCE.md) before upgrading the dependency.
