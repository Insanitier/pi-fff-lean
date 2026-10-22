import { leanTool } from "./lean.js";

export function wrapPi(pi) {
  return new Proxy(pi, {
    get(target, property) {
      if (property === "registerTool") {
        return (tool) => target.registerTool(leanTool(tool));
      }
      const value = target[property];
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}
