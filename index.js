// Upstream declares its entry only in package.json's `pi.extensions`; it has no `main` or `exports`,
// so Node resolution needs the explicit path.
import upstream from "opensec-pi-fff/dist-bun/index.js";
import { wrapPi } from "./src/wrap.js";

export default function opensecPiFffLean(pi) {
  return upstream(wrapPi(pi));
}
