// Runs under Bun (Pi-Bolt's runtime): `BUN_BE_BUN=1 pi-bolt scripts/smoke.js`.
// Verifies the native engine loads on a build without the JIT, that a lean tool definition still
// drives a real search, and that override mode replaces the built-in names.
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import * as typebox from "@sinclair/typebox";
import { wrapPi } from "../src/wrap.js";

const require = createRequire(import.meta.url);
const upstreamPkg = require("opensec-pi-fff/package.json");

const workdir = mkdtempSync(join(tmpdir(), "fff-lean-smoke-"));
writeFileSync(join(workdir, "alpha.ts"), "export const findme = 1;\n");
writeFileSync(join(workdir, "beta.ts"), "export const other = 2;\n");

globalThis[Symbol.for(`${upstreamPkg.name}@${upstreamPkg.version}:host-modules`)] = (id) => {
  if (id === "@sinclair/typebox") return typebox;
  if (id === "@earendil-works/pi-tui") return new Proxy({}, { get: () => () => ({}) });
  throw new Error(`unexpected host module '${id}'`);
};

const core = require(require.resolve("opensec-pi-fff/dist-bun/core.cjs"));

const tools = new Map();
const handlers = new Map();
const commands = new Map();
const notifications = [];
let active = [];

const pi = wrapPi({
  registerTool: (tool) => tools.set(tool.name, tool),
  registerFlag: () => {},
  registerCommand: (name, command) => commands.set(name, command),
  on: (event, handler) => handlers.set(event, handler),
  appendEntry: () => {},
  getFlag: () => undefined,
  getActiveTools: () => active,
  setActiveTools: (names) => {
    active = names;
  },
  registerAutocompleteProvider: () => {},
});

core.default(pi);

const ctx = {
  cwd: workdir,
  ui: { notify: (message, level) => notifications.push(`${level}: ${message}`) },
  sessionManager: { getEntries: () => [] },
};

await handlers.get("session_start")({}, ctx);

const grep = tools.get("grep") ?? tools.get("ffgrep");
const find = tools.get("find") ?? tools.get("fffind");
if (!grep || !find) {
  throw new Error(`expected a grep and a find tool, got ${[...tools.keys()].join(", ")}`);
}
const scheme = grep.name === "grep" ? "override" : "fff";
if (scheme === "override" && !active.includes("grep")) {
  throw new Error(`override mode did not activate 'grep': ${active.join(", ")}`);
}
if (scheme === "fff" && !active.includes("ffgrep")) {
  throw new Error(`tools-and-ui mode did not activate 'ffgrep': ${active.join(", ")}`);
}

const result = await grep.execute("call-1", { pattern: "findme" }, undefined, undefined, ctx);
const text = result.content.map((part) => part.text).join("\n");

await commands.get("fff-health").handler("", ctx);
console.log(`${notifications.join("\n")}\n`);
console.log(`registered: ${[...tools.keys()].join(", ")}`);
console.log(`active: ${active.join(", ")}`);
console.log(`\n${grep.name}('findme') ->\n${text}`);

if (!text.includes("alpha.ts")) throw new Error("grep did not find alpha.ts");
if (text.includes("beta.ts")) throw new Error("grep matched beta.ts, which does not contain the pattern");
console.log(`\nsmoke OK (${scheme} names, ${grep.name})`);
