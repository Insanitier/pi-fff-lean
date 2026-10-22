import test from "node:test";
import assert from "node:assert/strict";
import { upstreamFactory } from "../src/upstream.js";
import { wrapPi } from "../src/wrap.js";
import { leanTool } from "../src/lean.js";

function fakePi() {
  const calls = { tools: [], flags: [], commands: [], events: [] };
  const pi = {
    marker: "real-pi",
    registerTool(tool) {
      calls.tools.push({ tool, self: this });
    },
    registerFlag(name) {
      calls.flags.push(name);
    },
    registerCommand(name) {
      calls.commands.push(name);
    },
    on(event) {
      calls.events.push(event);
    },
    getActiveTools() {
      return this.active ?? [];
    },
  };
  return { pi, calls };
}

test("every upstream tool reaches pi, through the proxy, trimmed", () => {
  const { pi, calls } = fakePi();
  const direct = [];
  upstreamFactory()({ ...pi, registerTool: (tool) => direct.push(tool) });

  upstreamFactory()(wrapPi(pi));

  assert.deepEqual(
    calls.tools.map((call) => call.tool.name),
    direct.map((tool) => tool.name),
  );
  for (const [index, call] of calls.tools.entries()) {
    const reference = direct[index];
    assert.equal(call.tool.description, leanTool(reference).description);
    assert.deepEqual(call.tool.promptGuidelines, leanTool(reference).promptGuidelines);
    assert.deepEqual(
      JSON.parse(JSON.stringify(call.tool.parameters)),
      JSON.parse(JSON.stringify(leanTool(reference).parameters)),
    );
    assert.equal(typeof call.tool.execute, "function");
    assert.equal(typeof call.tool.renderCall, "function");
    assert.ok(call.tool.description.length < reference.description.length);
  }
});

test("non-tool calls pass through with this bound to the real pi", () => {
  const { pi, calls } = fakePi();
  upstreamFactory()(wrapPi(pi));
  assert.ok(calls.flags.includes("fff-mode"));
  assert.ok(calls.commands.includes("fff-health"));
  assert.deepEqual(calls.events, ["session_start", "before_agent_start", "session_shutdown"]);
});

test("plain properties read through the proxy", () => {
  const { pi } = fakePi();
  assert.equal(wrapPi(pi).marker, "real-pi");
  assert.equal(wrapPi(pi).missing, undefined);
});

test("methods keep working when detached from the proxy", () => {
  const { pi } = fakePi();
  const { getActiveTools } = wrapPi(pi);
  pi.active = ["read"];
  assert.deepEqual(getActiveTools(), ["read"]);
});

test("registerTool returns what the real pi returns", () => {
  const { pi } = fakePi();
  pi.registerTool = () => "registered";
  assert.equal(wrapPi(pi).registerTool({ name: "other" }), "registered");
});
