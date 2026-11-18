// mise run demo: serves the repository through web-tooling's static server and prints the demo
// pages' URLs, the components page and each component's specimen page, which load dist/, until
// Ctrl-C.
// Adapted from spike-html-apps-components (10dde51): scripts/demo.js, on
// @standards-lab/web-tooling, its pages the controls' and the inspection components'.

import { serve } from "@standards-lab/web-tooling/server.js";

import { served } from "../test/browser/support/served.ts";

const server = await serve(served);
for (const page of [
  "components",
  "status-badge",
  "entry",
  "pagination",
  "artifact-viewer",
  "event-log",
  "search-results",
  "document-list",
  "drawer",
]) {
  console.log(`${server.origin}/demo/${page}.html`);
}
process.once("SIGINT", async () => {
  await server.stop();
  process.exit(0);
});
