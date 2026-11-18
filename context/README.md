# web-components context

web-components is the set of Lit elements with a shadow root that applications compose, built on
web-foundation as a peer. A component takes properties and attributes, sends events, and may hold
its own UI state; it holds no services, fetches no data, holds no application state, and never
imports the SDK. An application's internal element becomes a component once a second application
needs it.

It is a package under the `@standards-lab` scope, released by a plain `vX.Y.Z` tag. Its goals
live in the coordinator's roadmap (`standards-lab/context/roadmap.toml`, v1.client.stack), and its
strategy is `standards-lab/context/web-client.md`.

## Provenance

The package is seeded by copy from spike-html-apps-components at 10dde51, the parent of its v0.10.3
pack commit, and moved onto web-foundation v0.2.0's four themes. The spike is archived and never a
dependency. Each copied file that takes comments names its source in a provenance line; the
workflows and CHANGELOG.md name theirs, web-foundation's at ceaab61. The files with no line have
their provenance here:

- `package.json` is adapted from spike-html-apps-components (10dde51): package.json. It is renamed
  `@standards-lab/web-components` at 0.1.0, takes `@standards-lab/web-foundation` as its peer at
  `^0.2.0`, and replaces the spike's foundation and tooling devDependencies with web-foundation's
  v0.2.0 tag and web-tooling's v0.1.0 tag; it pins marked at 18.2.1 and typescript-eslint at
  8.73.0.
- `.prettierrc.json` is from spike-html-apps-components (10dde51): .prettierrc.json.
- `LICENSE` is from spike-html-apps-components (10dde51): LICENSE, unchanged.
- `pnpm-lock.yaml` is generated, not copied.
- `test/unit/marked.test.ts`, `test/browser/themes.test.ts`, and
  `test/browser/support/profiles.ts` are written here, with no source.
- `CLAUDE.md`, `.claude/`, and this directory are marathon's working files, written here.

## Capability map

- **Conversation**: the chat thread and the composer.
- **Ingest**: the upload dropzone and the stage timeline, its stages given by the app.
- **Inspection**: the event log, search results, artifact viewer, and document list.
- **Controls**: the status badge, entry, pagination, and `sl-drawer`.
