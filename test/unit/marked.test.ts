import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import ts from "typescript";

const src = join(import.meta.dirname, "../../src");

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
