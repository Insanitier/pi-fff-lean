import test from "node:test";
import assert from "node:assert/strict";
import { upstreamTools } from "../src/upstream.js";
import { applyFieldDescriptions, leanTool, leanSpecFor } from "../src/lean.js";

const UPSTREAM = upstreamTools();
const byName = (name) => UPSTREAM.find((tool) => tool.name === name);

const size = (tool) =>
  JSON.stringify({
    description: tool.description,
    promptGuidelines: tool.promptGuidelines ?? [],
    parameters: tool.parameters,
  }).length;

function symbolKeys(value) {
  return Reflect.ownKeys(value).filter((key) => typeof key === "symbol");
}

test("upstream 0.11.1 registers the two always-on tools", () => {
  assert.deepEqual(
    UPSTREAM.map((tool) => tool.name),
    ["ffgrep", "fffind"],
  );
});

test("every upstream tool is trimmed and kept", () => {
  for (const upstream of UPSTREAM) {
    const lean = leanTool(upstream);
    assert.equal(lean.name, upstream.name);
    assert.ok(
      size(lean) < size(upstream),
      `${upstream.name}: lean ${size(lean)} is not smaller than upstream ${size(upstream)}`,
    );
  }
});

test("the two tools together stay inside the lean budget", () => {
  const total = UPSTREAM.reduce((sum, tool) => sum + size(leanTool(tool)), 0);
  assert.ok(total <= 2100, `lean tools serialize to ${total} chars, budget is 2100`);
});

test("execute, renderers, label and promptSnippet are passed through untouched", () => {
  for (const upstream of UPSTREAM) {
    const lean = leanTool(upstream);
    assert.equal(lean.execute, upstream.execute);
    assert.equal(lean.renderCall, upstream.renderCall);
    assert.equal(lean.renderResult, upstream.renderResult);
    assert.equal(lean.label, upstream.label);
    assert.equal(lean.promptSnippet, upstream.promptSnippet);
  }
});

test("the upstream schema object is not mutated", () => {
  for (const upstream of UPSTREAM) {
    const before = JSON.stringify(upstream.parameters);
    leanTool(upstream);
    assert.equal(JSON.stringify(upstream.parameters), before);
  }
});

test("typebox symbol keys survive the schema clone", () => {
  for (const upstream of UPSTREAM) {
    const lean = leanTool(upstream);
    assert.deepEqual(symbolKeys(lean.parameters), symbolKeys(upstream.parameters));
    for (const field of Object.keys(upstream.parameters.properties)) {
      assert.deepEqual(
        symbolKeys(lean.parameters.properties[field]),
        symbolKeys(upstream.parameters.properties[field]),
        `${upstream.name}.${field}`,
      );
    }
  }
});

test("required, property names and field types are unchanged", () => {
  for (const upstream of UPSTREAM) {
    const lean = leanTool(upstream);
    assert.deepEqual(Object.keys(lean.parameters.properties), Object.keys(upstream.parameters.properties));
    assert.deepEqual(lean.parameters.required, upstream.parameters.required);
    for (const field of Object.keys(upstream.parameters.properties)) {
      assert.equal(
        lean.parameters.properties[field].type,
        upstream.parameters.properties[field].type,
        `${upstream.name}.${field}`,
      );
    }
  }
});

test("every declared field description is applied and drops where asked", () => {
  for (const upstream of UPSTREAM) {
    const spec = leanSpecFor(upstream.name);
    const lean = leanTool(upstream);
    for (const [field, text] of Object.entries(spec.fieldDescriptions)) {
      const applied = lean.parameters.properties[field].description;
      assert.equal(applied, text === null ? undefined : text, `${upstream.name}.${field}`);
    }
  }
});

test("a field the upstream schema lacks fails loudly", () => {
  const upstream = byName("ffgrep");
  assert.throws(
    () => applyFieldDescriptions(upstream.parameters, { nonexistent: "x" }, "ffgrep"),
    /no property 'nonexistent'/,
  );
});

test("override-mode names are trimmed and their guidelines use those names", () => {
  for (const [upstreamName, overrideName] of [
    ["ffgrep", "grep"],
    ["fffind", "find"],
  ]) {
    const upstream = byName(upstreamName);
    const lean = leanTool({ ...upstream, name: overrideName, label: overrideName });
    assert.ok(size(lean) < size(upstream));
    assert.ok(lean.promptGuidelines.every((line) => line.startsWith(`${overrideName}:`)));
    assert.ok(!lean.promptGuidelines.some((line) => line.includes(upstreamName)));
  }
});

test("fffind points at its sibling under whichever naming scheme is in play", () => {
  const find = byName("fffind");
  assert.ok(leanTool(find).promptGuidelines.some((line) => line.includes("use ffgrep for content")));
  assert.ok(
    leanTool({ ...find, name: "find" }).promptGuidelines.some((line) =>
      line.includes("use grep for content"),
    ),
  );
});

test("a tool this package does not know passes through by identity", () => {
  const foreign = { name: "web_search", description: "x", parameters: { type: "object" } };
  assert.equal(leanTool(foreign), foreign);
});

test("no guideline shouts", () => {
  for (const upstream of UPSTREAM) {
    for (const line of leanTool(upstream).promptGuidelines) {
      assert.ok(!/\b(MUST|NEVER|ALWAYS)\b/.test(line), line);
    }
  }
});
