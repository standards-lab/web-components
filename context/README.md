# web-components context

web-components is the set of Lit elements with a shadow root that applications compose, built on
web-foundation and web-icons as peers. A component takes properties and attributes, sends events, and may hold
its own UI state; it holds no services, fetches no data, holds no application state, and never
imports the SDK. An application's internal element becomes a component once a second application
needs it.

It is a package under the `@standards-lab` scope, released by a plain `vX.Y.Z` tag. Its goals
live in the coordinator's roadmap (`standards-lab/roadmap/index.toml`, v1.client.stack), and its
strategy is `standards-lab/context/web-client.md`.

## Provenance

The package is seeded by copy from spike-html-apps-components at 10dde51, the parent of its v0.10.3
pack commit, and moved onto the pinned web-foundation release's themes. The spike is archived and
never a dependency. Each copied file that takes comments names each of its sources in a provenance
line; the workflows and CHANGELOG.md name theirs, web-foundation's at ceaab61. The files with no
line have their provenance here:

- `package.json` is adapted from spike-html-apps-components (10dde51): package.json. It is renamed
  `@standards-lab/web-components` at 0.1.0, takes `@standards-lab/web-foundation` and
  `@standards-lab/web-icons` as its peers, and replaces the spike's foundation and tooling
  devDependencies with web-foundation's and web-tooling's release tags, adds web-icons' release
  tag, and pins marked and typescript-eslint exactly.
- `.prettierrc.json` is from spike-html-apps-components (10dde51): .prettierrc.json.
- `LICENSE` is from spike-html-apps-components (10dde51): LICENSE, unchanged.
- `pnpm-lock.yaml` is generated, not copied.
- `test/unit/marked.test.ts`, `test/browser/themes.test.ts`,
  `test/browser/shortcut-dialogs.test.ts`, `test/browser/support/profiles.ts`, and
  `demo/glyphs.js` are written here, with no source.
- `CLAUDE.md`, `.claude/`, and this directory are marathon's working files, written here.

## Capability map

- **Conversation** (built): [the chat thread and the composer](../docs/components.md#conversation).
- **Ingest** (built): [the upload dropzone and the stage timeline](../docs/components.md#ingest).
- **Inspection** (built): [the artifact viewer, event log, search results, and document
  list](../docs/components.md#inspection).
- **Controls** (built): [the status badge, entry, pagination, and
  drawer](../docs/components.md#controls).
- **Settings and Help** (built): [the reader's settings and the keyboard shortcuts
  list](../docs/components.md#controls), and [the page pattern that opens
  them](../README.md#settings-and-help).
