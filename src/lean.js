const PATH_DESCRIPTION =
  "Directory prefix (src/), filename (main.rs), or glob (src/**); anchored at repo root.";
const EXCLUDE_DESCRIPTION = "Paths to exclude, same syntax as path. e.g. test/,*.min.js";

const ROLES = {
  ffgrep: { role: "grep", scheme: "fff" },
  fffind: { role: "find", scheme: "fff" },
  "fff-multi-grep": { role: "multiGrep", scheme: "fff" },
  grep: { role: "grep", scheme: "override" },
  find: { role: "find", scheme: "override" },
  multi_grep: { role: "multiGrep", scheme: "override" },
};

const NAMES = {
  fff: { grep: "ffgrep", find: "fffind", multiGrep: "fff-multi-grep" },
  override: { grep: "grep", find: "find", multiGrep: "multi_grep" },
};

const LEAN = {
  grep: (n) => ({
    description:
      "Grep file contents, frecency-ranked. Smart-case; regex vs literal auto-detected.",
    promptGuidelines: [
      `${n.grep}: output is ranked and capped, so it is not proof that something is absent; follow the cursor or use rg to list every occurrence.`,
      `${n.grep}: prefer bare identifiers \u2014 literal patterns are the fastest path.`,
      `${n.grep}: read the top match instead of grepping again for the same symbol.`,
    ],
    fieldDescriptions: {
      pattern: null,
      path: PATH_DESCRIPTION,
      exclude: EXCLUDE_DESCRIPTION,
      caseSensitive: null,
      regex: "Force regex; default is auto-detect.",
      context: null,
      limit: null,
      cursor: "Cursor from previous result",
    },
  }),
  find: (n) => ({
    description:
      "Fuzzy path search; matches the whole repo-relative path. Frecency-ranked. Multi-word narrows (AND).",
    promptGuidelines: [
      `${n.find}: matches the whole path, not just the filename.`,
      `${n.find}: bare patterns are fuzzy \u2014 for an exact filename use path: '**/name.h'.`,
      `${n.find}: to list a directory, pass path: 'dir/**' with no pattern.`,
      `${n.find}: paths, not content \u2014 use ${n.grep} for content.`,
    ],
    fieldDescriptions: {
      pattern: "Multi-word narrows (AND, order-free).",
      path: PATH_DESCRIPTION,
      exclude: EXCLUDE_DESCRIPTION,
      limit: null,
      cursor: "Cursor from previous result",
    },
  }),
  multiGrep: (n) => ({
    description: "Search contents for any of several literal patterns (OR).",
    promptGuidelines: [
      `${n.multiGrep}: patterns are literal; include snake/camel/Pascal variants.`,
      `${n.multiGrep}: use constraints for file filters.`,
    ],
    fieldDescriptions: {
      patterns: null,
      constraints: "File filter, e.g. '*.{ts,tsx} !test/'",
      context: null,
      limit: null,
      cursor: "Cursor from previous result",
    },
  }),
};

function cloneSchema(node) {
  if (Array.isArray(node)) return node.map(cloneSchema);
  if (node === null || typeof node !== "object") return node;
  const clone = {};
  for (const key of Reflect.ownKeys(node)) clone[key] = cloneSchema(node[key]);
  return clone;
}

export function applyFieldDescriptions(schema, overrides, toolName) {
  const clone = cloneSchema(schema);
  for (const [field, text] of Object.entries(overrides)) {
    const target = clone.properties?.[field];
    if (!target) {
      throw new Error(
        `${toolName}: upstream schema has no property '${field}'; opensec-pi-fff-lean is out of date with the pinned upstream`,
      );
    }
    if (text === null) delete target.description;
    else target.description = text;
  }
  return clone;
}

export function leanSpecFor(toolName) {
  const entry = ROLES[toolName];
  if (!entry) return undefined;
  return LEAN[entry.role](NAMES[entry.scheme]);
}

export function leanTool(tool) {
  const spec = leanSpecFor(tool.name);
  if (!spec) return tool;
  return {
    ...tool,
    description: spec.description,
    promptGuidelines: spec.promptGuidelines,
    parameters: applyFieldDescriptions(tool.parameters, spec.fieldDescriptions, tool.name),
  };
}
