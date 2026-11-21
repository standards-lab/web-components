# Development

Why the repository's configuration and scripts are as they are, where they don't say. The
[README](../README.md#development) lists the tasks, and [release.md](release.md) gives the
workflows.

## Tools

`scripts/preflight.sh` fails a task whose tool is missing, naming `mise run install`. The foundation
is a peer, which the repository's devDependency installs at its tag, so preflight looks for it in
`node_modules` beside lit and marked.

Chrome for Testing publishes no checksums, so each chrome-headless-shell bump takes the sha256 and
size from the download by hand. mise caches a download by its checksum, so a version bumped without
its own sha256 installs the old build; preflight compares the installed browser's version with the
pin and fails, naming the sha256, when they differ.

## TypeScript

- `tsconfig.json` builds `src/` into `dist/`, and `mise run types` checks the same sources with
  `--noEmit`. The foundation is read as a consumer reads it, through the install of the peer at the
  top level, here its devDependency: its shipped `.d.ts`, and the ambient `"*.css"` declaration its
  `./css` types subpath holds.
- `tsconfig.test.json` checks the Node-side tests and their helpers, which `node --test` runs under
  Node's type stripping, and the screenshots description, which the tooling's bin loads under the
  same stripping: the base's strictness and erasable syntax, on Node's module resolution and its
  types rather than the browser's. It never emits.
- `test/browser/tsconfig.json` checks the modules the browser tier's pages load, which stay `.js`,
  against the declarations `dist/` ships rather than the sources, which would declare the same
  custom elements twice. The foundation's sheets type as its `./css` types subpath declares them,
  as the sources' do. Beside them, `support/types.js`, which no page runs, holds values typed by
  those declarations, so one that narrows what a consumer may write fails there.

## pnpm

`pnpm-workspace.yaml` lists no packages: the repository is one package. The foundation, a peer, and
the tooling, each a `github:` devDependency installed at its release tag, need no setting there:
pnpm guards only a git dependency below the top level (`blockExoticSubdeps`).

- `allowBuilds` refuses unrs-resolver's postinstall. unrs-resolver, under eslint-plugin-import-x and
  eslint-import-resolver-typescript, fetches its native binding when the optional dependency
  holding it is missing; pnpm installs that dependency.
- `minimumReleaseAge: 0` turns off pnpm's default wait of a day before it installs a release. The
  currency task moves each pin to its latest release, and that release's notes are read before the
  bump lands, a review that stands in for the age gate. With the wait on, a frozen install of a
  lockfile that pins a release under a day old fails.

## Currency

`scripts/currency.sh` reads mise's outdated report at the error log level: mise warns on every run
that a GitHub release has no assets. A `github:` devDependency, the foundation or the tooling, is
pinned to its repository's release tag, which the registry doesn't hold, so it is compared with that
repository's latest release. A peer, the foundation, is declared by a caret range, which must admit
that latest release so a consumer can declare it beside the components, by the release test's own
rule, `caretAdmits`. typescript is held to the newest version typescript-eslint's peer range
accepts. Each action a workflow uses is compared with its repository's latest release; none is
while there is no workflow.

## Lint

`eslint.config.js` lints every `.js` and `.ts` file outside `dist/`, the build, which is gitignored.
The suite and the scripts run on Node; `test/`'s `.js`, the modules a test page loads, run in the
browser.

Every suppression carries its reason: eslint-comments' `require-description` fails an ESLint
directive without one, and `ban-ts-comment` allows a TypeScript directive only with a description.

A `.css` import is a CSS module script: a declaration's `type: 'css'` attribute is matched by its
key's name or its quoted key, and an `import()` whose specifier ends in `.css`, a string or a
template whose last part does, is matched at that part and refused.

The layer's import rules:

- The layer is an element by its directory, matched from the root (`partialMatch: false`), with a
  second pattern for a file in a directory whose name starts with a dot, which micromatch's `**`
  never enters, so `./.well-known/` and `./..x/` stay in the layer.
- The rule's default is disallow, and it checks every origin (a package is external) and local
  files no element holds: an import passes only when a policy names its target, the layer or a
  package the table names, which the rule matches by its name, any subpath of it.
- A declaration file in the layer (the components hold none yet) has no runtime, so an import that
  resolves to one passes only as a type import, `import type` or `export type`, which tsc erases:
  the last policy refuses any other kind, and as the last whose selector matches it overrides the
  allow before it. The dependency's kind is the declaration's, so `import { type X }` is a value
  import here, as it is to `verbatimModuleSyntax`, which keeps it as `import {}` and so loads the
  file. `checkInternals` has the rule judge an import within the layer too, which the layer's
  policy allows. `internalPath` is a local file's path: a package imported by name, which the
  resolver takes to the `.d.ts` its build ships beside each `.js`, is the allows' to judge, not
  this policy's.
- The rule judges the file an import resolves to, never the specifier's text, and `no-unresolved`
  fails a specifier that names no file, so no import passes by naming none.
- `no-extraneous-dependencies` judges an import against `package.json`: a package name it doesn't
  declare in dependencies or peerDependencies, where the foundation is (a devDependency alone ships
  nothing, and `includeInternal` holds the package's own name, which resolves inside it, to the
  same), in every import form (`includeTypes`). `no-relative-packages` refuses a relative path that
  reaches another package's files.

## Format

Prettier formats the code, the JSON, and the stylesheets only: its default run would also rewrite
the Markdown, the YAML, and `pnpm-lock.yaml`. `.prettierignore` ignores every file, then lets every
directory and the code, JSON, and CSS files back in. Prettier also skips what `.gitignore` lists.

## Screenshots

`scripts/screenshots.config.ts` captures the drawer's page in its viewport at a width at its dock,
48rem, and wider, and one below it, since the drawer's mode is the viewport's. Its open states open
the drawer as a user does, Enter on the toolbar's Documents button with the page's direction set
first, and wait for the slide to end. Each page's profiles are read from the foundation's registry
at its well-known global key, so a profile an extension page registers counts too.
