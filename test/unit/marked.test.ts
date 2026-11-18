// marked's one importer: of the modules under src/, only markdown.ts imports marked, by any import
// form, a static import, a re-export, or an import(), of the package or a subpath of it, so a page
// that renders no Markdown loads none of it. The browser tier's markdown.test.ts shows the same at
// run time, for the modules that render no Markdown; this case also holds the modules that render
// it through markdown.ts, the artifact viewer's, to that one path. TypeScript's preProcessFile
// reads each module's specifiers, as the compiler does, so no import passes by its spelling.

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import ts from "typescript";

const src = join(import.meta.dirname, "../../src");

/** The modules under src/ that import marked or a subpath of it. */
function importers(): string[] {
  return readdirSync(src, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".ts"))
    .filter((file) =>
      ts
        .preProcessFile(readFileSync(join(src, file), "utf8"), true, true)
        .importedFiles.some(
          ({ fileName }) => fileName === "marked" || fileName.startsWith("marked/"),
        ),
    )
    .sort();
}

describe("marked", () => {
  test("only src/markdown.ts imports marked", () => {
    assert.deepEqual(importers(), ["markdown.ts"]);
  });
});
