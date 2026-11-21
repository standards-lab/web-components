// The layer's import cases as one file tree in the repository's shape: a file per forbidden import
// and form, each with the rules that catch it, and the imports the layer may make in the same
// layout.
// Adapted from spike-html-apps-components (10dde51): test/unit/layers-tree.ts, its sibling and above layers the stack's web-app-sdk and web-app-sdk-template.
// See docs/testing.md

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

import type { ESLint } from "eslint";

const root = join(import.meta.dirname, "../..");

/** The package's manifest as it stands, which the tree carries. */
export const manifest: { name: string; devDependencies: Record<string, string> } = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
);
const components = manifest.name;

const foundation = components.replace(/components$/, "foundation");
const foundationManifest = readFileSync(
  join(root, "node_modules", foundation, "package.json"),
  "utf8",
);

const sdk = components.replace(/components$/, "app-sdk");
const app = components.replace(/components$/, "app-sdk-template");

/** The layer table's rule. */
export const table = "boundaries/dependencies";
/** The rule against a package the manifest doesn't declare. */
export const extraneous = "import-x/no-extraneous-dependencies";
/** The rule against a declared package reached by a relative path. */
export const relativePackages = "import-x/no-relative-packages";
/** The rule that admits a .css import only as a static CSS module script. */
export const cssModule = "no-restricted-syntax";
/** The rules the lint flags the tree with, no-unresolved among them, which no case may draw. */
export const watched = [table, extraneous, relativePackages, cssModule, "import-x/no-unresolved"];

function forms(base: string, specifier: string): Record<string, string> {
  return {
    [`${base}.ts`]: `import "${specifier}";`,
    [`${base}-type.ts`]: `import type { X } from "${specifier}";`,
    [`${base}-export.ts`]: `export * from "${specifier}";`,
    [`${base}-dynamic.ts`]: `await import("${specifier}");`,
  };
}

/** A forbidden import's file: its source and the rules that flag it. */
export interface Case {
  source: string;
  rules: string[];
}

function by(rules: string[], files: Record<string, string>): Record<string, Case> {
  return Object.fromEntries(
    Object.entries(files).map(([path, source]) => [path, { source, rules: [...rules].sort() }]),
  );
}

const installedFoundation = `../node_modules/${foundation}`;

const undeclaredPackages = by([table, extraneous], {
  "src/sdk.ts": `import { Client } from "${sdk}/client.js";`,
  ...forms("src/forms/sdk", `${sdk}/client.js`),
  "src/lit-html.ts": `import { html } from "lit-html";`,
  ...forms("src/forms/lit-html", "lit-html/directives/repeat.js"),
  "src/app.ts": `import { define } from "${app}/main.js";`,
  ...forms("src/forms/typescript", "typescript"),
});

const ownName = by([table], forms("src/forms/self-name", `${components}/status-badge.js`));

const relativeIntoNodeModules = by([table, relativePackages], {
  "src/foundation-path.ts": `import { define } from "${installedFoundation}/dist/dom.js";`,
  ...forms("src/forms/foundation-path", `../${installedFoundation}/dist/dom.js`),
  "src/foundation-sheet-path.ts": `import sheet from "${installedFoundation}/dist/baseline/reset.css" with { type: "css" };`,
  "src/lit-path.ts": `import "../node_modules/lit/index.js";`,
});

const declarationValueImports = by([table], {
  "src/item-value.ts": `import { kindOf } from "./item.js";`,
  "src/item-side-effect.ts": `import "./item.js";`,
  "src/item-inline-type.ts": `import { type Item } from "./item.js";`,
  "src/item-export.ts": `export { kindOf } from "./item.js";`,
  "src/item-export-all.ts": `export * from "./item.js";`,
  "src/item-dynamic.ts": `await import("./item.js");`,
  "src/nested/item-value.ts": `import { kindOf } from "../item.js";`,
});

const nonModuleCss = by([cssModule], {
  "src/css-side-effect.ts": `import "./x.css";`,
  "src/css-default.ts": `import sheet from "./x.css";`,
  "src/css-json.ts": `import sheet from "./x.css" with { type: "json" };`,
  "src/css-export.ts": `export { default } from "./x.css";`,
  "src/css-export-all.ts": `export * from "./x.css";`,
  "src/css-dynamic.ts": `await import("./x.css");`,
  "src/css-dynamic-json.ts": `await import("./x.css", { with: { type: "json" } });`,
  "src/css-dynamic-module.ts": `await import("./x.css", { with: { type: "css" } });`,
  "src/css-dynamic-quoted.ts": `await import("./x.css", { "with": { "type": "css" } });`,
  "src/css-dynamic-template.ts": "await import(`./x.css`, { with: { type: 'css' } });",
  "src/css-dynamic-computed.ts": "const name = 'x'; await import(`./${name}.css`);",
  "src/css-foundation.ts": `import sheet from "${foundation}/baseline/reset.css";`,
  "src/css-foundation-dynamic.ts": `await import("${foundation}/baseline/reset.css");`,
});

/** Each forbidden import's file, named for what it imports, with the rules that flag it. */
export const violations = {
  ...undeclaredPackages,
  ...ownName,
  ...relativeIntoNodeModules,
  ...declarationValueImports,
  ...nonModuleCss,
};

/** `cases`, each path to its source alone. */
export const sources = (cases: Record<string, Case>): Record<string, string> =>
  Object.fromEntries(Object.entries(cases).map(([path, { source }]) => [path, source]));

/** Every import the layer may make, in each form, each file named for what it imports. */
export const allowed: Record<string, string> = {
  "src/badge.ts": `export { x } from "./events.ts";`,
  "src/nested/own.ts": `import type { X } from "../badge.ts";\nawait import("../badge.ts");`,
  "src/nested/index.ts": `import "..";\nexport * from "./";`,
  "src/dotted.ts": `import "./..x/y.ts";\nimport "./.well-known/a.ts";`,
  "src/item-type.ts": `import type { kindOf } from "./item.js";`,
  "src/item-export-type.ts": `export type { Item } from "./item.js";`,
  "src/css-module.ts": `import sheet from "./x.css" with { type: "css" };`,
  "src/css-quoted.ts": `import sheet from "./x.css" with { "type": "css" };`,
  "src/css-export-module.ts": `export { default } from "./x.css" with { type: "css" };`,
  "src/lit.ts": [
    `import { html, LitElement, type PropertyDeclarations } from "lit";`,
    `import type { X } from "lit";`,
    `export * from "lit";`,
    `await import("lit");`,
    `import "lit/directives/repeat.js";`,
  ].join("\n"),
  "src/foundation.ts": [
    `import { define, emit } from "${foundation}/dom.js";`,
    `import type { X } from "${foundation}/dom.js";`,
    `export * from "${foundation}/dom.js";`,
    `await import("${foundation}/dom.js");`,
    `import type { BytesOptions } from "${foundation}/format.js";`,
  ].join("\n"),
  "src/foundation-sheets.ts": [
    `import reset from "${foundation}/baseline/reset.css" with { type: "css" };`,
    `import elements from "${foundation}/baseline/elements.css" with { "type": "css" };`,
  ].join("\n"),
};

const targets = {
  "src/events.ts": "export const x = 1;",
  "src/index.ts": "export {};",
  "src/..x/y.ts": "export {};",
  "src/.well-known/a.ts": "export {};",
  "src/item.d.ts": [
    "export interface Item { name: string }",
    "export declare function kindOf(item: Item): string;",
  ].join("\n"),
  "src/x.css": ".x {}",
  "dist/status-badge.js": "export {};",
  "dist/status-badge.d.ts": "export interface X {}",
};

const externals = ["lit", "lit-html", sdk, app, "typescript"];
const stub = (name: string): Record<string, string> => ({
  "package.json": JSON.stringify({
    name,
    type: "module",
    exports: {
      ".": { types: "./index.d.ts", default: "./index.js" },
      "./*": { types: "./index.d.ts", default: "./index.js" },
    },
  }),
  "index.js": "export const html = () => {};\nexport class LitElement {}",
  "index.d.ts": [
    "export declare const html: () => void;",
    "export declare class LitElement {}",
    "export type PropertyDeclarations = object;",
    "export declare class Client {}",
    "export declare const define: () => void;",
    "export interface X {}",
  ].join("\n"),
});

const foundationFiles = {
  "package.json": foundationManifest,
  "dist/dom.js": "export const define = () => {};\nexport const emit = () => {};",
  "dist/dom.d.ts": [
    "export declare const define: () => void;",
    "export declare const emit: () => void;",
    "export interface X {}",
  ].join("\n"),
  "dist/format.d.ts": "export type BytesOptions = Intl.NumberFormatOptions;",
  "dist/css.d.ts": `declare module "*.css" {}`,
  "dist/baseline/reset.css": ".reset {}",
  "dist/baseline/elements.css": ".elements {}",
};

/** Writes `files` and everything they import under `dir`, returning the code files under src/. */
export function writeTree(dir: string, files: Record<string, string>): string[] {
  const written: Record<string, string> = {
    ...files,
    ...targets,
    "package.json": JSON.stringify(manifest),
  };
  for (const name of externals) {
    for (const [path, source] of Object.entries(stub(name))) {
      written[join("node_modules", name, path)] = source;
    }
  }
  for (const [path, source] of Object.entries(foundationFiles)) {
    written[join("node_modules", foundation, path)] = source;
  }
  for (const [path, source] of Object.entries(written)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), `${source}\n`);
  }
  const self = join(dir, "node_modules", components);
  mkdirSync(dirname(self), { recursive: true });
  symlinkSync(relative(dirname(self), dir), self);
  return Object.keys(written).filter((path) => path.startsWith("src/") && /\.(js|ts)$/.test(path));
}

/** ESLint's JSON report on `dir`'s src/ under the repository's config; throws when ESLint fails. */
export function lint(dir: string): ESLint.LintResult[] {
  const eslint = join(root, "node_modules", ".bin", "eslint");
  const run = spawnSync(eslint, ["-c", join(root, "eslint.config.js"), "-f", "json", "src"], {
    cwd: dir,
    encoding: "utf8",
  });
  if (run.error) throw new Error(`eslint didn't run: ${run.error}`);
  if (run.status !== 0 && run.status !== 1) {
    throw new Error(`eslint exited ${run.status}: ${run.stderr}`);
  }
  return JSON.parse(run.stdout);
}
