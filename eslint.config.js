// The lint the check runs: the recommended rules, a reason on every suppression, the layer's
// imports in src/, and every .css import a CSS module script. test/unit/layers.test.ts runs it over
// test/unit/layers-tree.ts.
// See docs/development.md
// Adapted from spike-html-apps-components (10dde51): eslint.config.js, on web-foundation.

import comments from "@eslint-community/eslint-plugin-eslint-comments";
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import boundaries from "eslint-plugin-boundaries";
import importX from "eslint-plugin-import-x";
import globals from "globals";
import tseslint from "typescript-eslint";

const code = ["**/*.js", "**/*.ts"];

const cssType = `:matches(ImportAttribute[key.name='type'], ImportAttribute[key.value='type'])[value.value='css']`;
const cssSource = "[source.value=/\\.css$/]";
const cssDynamic = [
  `ImportExpression${cssSource}`,
  "ImportExpression > TemplateLiteral.source > TemplateElement[tail=true][value.cooked=/\\.css$/]",
];
const cssImports = [
  ...["ImportDeclaration", "ExportNamedDeclaration", "ExportAllDeclaration"].map((type) => ({
    selector: `${type}${cssSource}:not(:has(${cssType}))`,
    message: "A .css import is a CSS module script: add with { type: 'css' }.",
  })),
  ...cssDynamic.map((selector) => ({
    selector,
    message:
      "A .css file is imported statically, as a CSS module script with { type: 'css' }, never by " +
      "import().",
  })),
];

const foundation = "@standards-lab/web-foundation";
/** The layer table cut to the components: their sources, which may import themselves and three
 * packages by name, lit, marked, and the foundation, which the manifest declares, the foundation as
 * a peer; the foundation is reached only through its install, as a consumer reaches it. */
export const layers = [
  { name: "components", path: "src", may: ["components", "lit", "marked", foundation] },
];

const elements = layers.map(({ name, path }) => ({
  type: name,
  pattern: [path, `${path}/**/.*`],
  partialMatch: false,
}));

const policies = layers.map(({ name, may }) => ({
  from: { element: { type: name } },
  allow: {
    to: may.map((target) =>
      target === name
        ? { element: { type: target } }
        : { module: { origin: "external", source: target } },
    ),
  },
}));

const declarations = {
  disallow: { to: { internalPath: "**/*.d.ts" }, dependency: { kind: "value" } },
  message:
    "A .d.ts file is a declaration with no runtime: import it with `import type` (or export " +
    "from it with `export type`), never as a value, a side effect, or an import().",
};

export default defineConfig([
  { ignores: ["dist/"] },
  { files: code, extends: [js.configs.recommended, tseslint.configs.recommended] },
  {
    files: code,
    plugins: { "@eslint-community/eslint-comments": comments },
    rules: {
      "@eslint-community/eslint-comments/require-description": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-check": false,
          "ts-expect-error": "allow-with-description",
          "ts-ignore": "allow-with-description",
          "ts-nocheck": "allow-with-description",
        },
      ],
    },
  },
  { files: code, languageOptions: { globals: globals.browser } },
  { files: code, rules: { "no-restricted-syntax": ["error", ...cssImports] } },
  { files: ["test/**/*.ts", "scripts/**"], languageOptions: { globals: globals.node } },
  {
    files: ["src/**"],
    plugins: { boundaries, "import-x": importX },
    settings: {
      "import/resolver": { typescript: true },
      "import-x/resolver": { typescript: true },
      "boundaries/elements": elements,
    },
    rules: {
      "import-x/no-unresolved": "error",
      "import-x/no-extraneous-dependencies": [
        "error",
        { devDependencies: false, includeInternal: true, includeTypes: true },
      ],
      "import-x/no-relative-packages": "error",
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          checkAllOrigins: true,
          checkUnknownLocals: true,
          checkInternals: true,
          policies: [...policies, declarations],
        },
      ],
    },
  },
]);
