// Loads the pinned upstream extension in Node and captures the tool definitions it registers,
// so tests and the token measurement run against the installed package rather than a copy.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import * as typebox from "@sinclair/typebox";

const require = createRequire(import.meta.url);

const upstreamPkg = require("opensec-pi-fff/package.json");

const tuiStub = new Proxy(
  {},
  {
    get: () => () => ({}),
  },
);

function hostModules(id) {
  if (id === "@sinclair/typebox") return typebox;
  if (id === "@earendil-works/pi-tui") return tuiStub;
  throw new Error(`opensec-pi-fff-lean: unexpected host module '${id}'`);
}

export function upstreamFactory() {
  globalThis[Symbol.for(`${upstreamPkg.name}@${upstreamPkg.version}:host-modules`)] = hostModules;
  return loadCore(require.resolve("opensec-pi-fff/dist-bun/core.cjs")).default;
}

export function upstreamTools() {
  const tools = [];
  upstreamFactory()({
    registerTool: (tool) => tools.push(tool),
    registerFlag: () => {},
    registerCommand: () => {},
    on: () => {},
  });
  return tools;
}

// core.cjs is a `@bun @bun-cjs` bundle: an IIFE that Bun supplies arguments to. Node parses the
// file but never calls it, so the wrapper is invoked by hand here.
function loadCore(corePath) {
  const source = readFileSync(corePath, "utf-8").replace(/^\/\/ @bun @bun-cjs\n/, "");
  const invoke = new Function(
    "exports",
    "require",
    "module",
    "__filename",
    "__dirname",
    `return (${source})(exports, require, module, __filename, __dirname);`,
  );
  const module = { exports: {} };
  invoke(module.exports, require, module, corePath, dirname(corePath));
  return module.exports;
}

export function upstreamVersion() {
  return upstreamPkg.version;
}
