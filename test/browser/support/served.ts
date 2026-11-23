// What the components serve to a browser: the repository root, whose demo/ and test/fixtures/
// pages load the built dist/, and the packages the pages' import maps name under /deps/.
// Adapted from spike-html-apps-components (10dde51): test/browser/support/served.ts, on @standards-lab/web-tooling and @standards-lab/web-foundation.
// See docs/testing.md

import { join } from "node:path";

import type { ServeOptions } from "@standards-lab/web-tooling/server.js";

/** The repository root, the served tree. */
export const root = join(import.meta.dirname, "../../..");

/** The packages served under /deps/: lit, marked, the foundation, and the icons. */
export const deps = ["lit", "marked", "@standards-lab/web-foundation", "@standards-lab/web-icons"];

/** The serve options for the repository: the root and its deps. */
export const served: ServeOptions = { root, deps };
