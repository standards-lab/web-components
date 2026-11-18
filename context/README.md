# web-components context

web-components is the set of Lit elements with a shadow root that applications compose, built on
web-foundation as a peer. A component takes properties and attributes, sends events, and may hold
its own UI state; it holds no services, fetches no data, holds no application state, and never
imports the SDK. An application's internal element becomes a component once a second application
needs it.

It is a package under the `@standards-lab` scope, starting at v0.1.0 and released by a plain
`vX.Y.Z` tag. Its goals live in the coordinator's roadmap (`standards-lab/context/roadmap.toml`,
v1.client.stack), and its strategy is `standards-lab/context/web-client.md`. It is seeded by copy
from spike-html-apps-components, with a provenance line on every copied file; the spike is archived and never a
dependency.

## Provenance

The package is seeded by copy from spike-html-apps-components at 10dde51, the parent of its v0.10.3
pack commit. The spike is archived and never a dependency. Each copied file that takes comments
names its source in a provenance line; the workflows name theirs, web-foundation's at ceaab61. The
JSON files take no comment, so their provenance is here:

- `package.json` is adapted from spike-html-apps-components (10dde51): package.json. It is renamed
  `@standards-lab/web-components` at 0.1.0, takes `@standards-lab/web-foundation` as its peer at
  `^0.2.0` and as its devDependency at v0.2.0, and `@standards-lab/web-tooling` at v0.1.0 as its
  tooling devDependency, in place of the spike's foundation and tooling, with marked at 18.2.1 and
  typescript-eslint at 8.73.0.
- `.prettierrc.json` is from spike-html-apps-components (10dde51): .prettierrc.json.
- `pnpm-lock.yaml` is generated, not copied.

## Capability map

- **Conversation**: the chat thread, with citations, and the composer.
- **Ingest**: the upload dropzone and the stage timeline driven by the event protocol.
- **Inspection**: the event log, search results, artifact viewer, and document list.
- **Controls**: the status badge, entry, pagination, and `sl-drawer`.
