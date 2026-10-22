import { upstreamTools, upstreamVersion } from "../src/upstream.js";
import { leanTool } from "../src/lean.js";

const TOKENS_PER_CHAR = 4;

// Only `description`, `promptGuidelines` and the schema's `description` fields differ between
// upstream and lean, so this payload's size delta is the whole delta the model sees.
function payload(tool) {
  return JSON.stringify({
    name: tool.name,
    description: tool.description,
    promptGuidelines: tool.promptGuidelines ?? [],
    parameters: tool.parameters,
  });
}

function tokens(chars) {
  return Math.ceil(chars / TOKENS_PER_CHAR);
}

const rows = upstreamTools().map((upstream) => {
  const lean = leanTool(upstream);
  return {
    name: upstream.name,
    before: payload(upstream).length,
    after: payload(lean).length,
  };
});

const sum = (key) => rows.reduce((total, row) => total + row[key], 0);
const totalBefore = sum("before");
const totalAfter = sum("after");

console.log(`opensec-pi-fff ${upstreamVersion()} tool definitions, serialized (name + description + promptGuidelines + parameters)\n`);
console.log(`${"tool".padEnd(18)}${"upstream".padStart(12)}${"lean".padStart(10)}${"saved".padStart(9)}`);
for (const row of rows) {
  const saved = `${Math.round((1 - row.after / row.before) * 100)}%`;
  console.log(
    `${row.name.padEnd(18)}${`${row.before} (~${tokens(row.before)})`.padStart(12)}${`${row.after} (~${tokens(row.after)})`.padStart(10)}${saved.padStart(9)}`,
  );
}
console.log(
  `\n${"total".padEnd(18)}${`${totalBefore} (~${tokens(totalBefore)})`.padStart(12)}${`${totalAfter} (~${tokens(totalAfter)})`.padStart(10)}${`${Math.round((1 - totalAfter / totalBefore) * 100)}%`.padStart(9)}`,
);
console.log(`\nsaved ${totalBefore - totalAfter} chars, ~${tokens(totalBefore - totalAfter)} tokens per request`);
