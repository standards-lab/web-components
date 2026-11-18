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

## Capability map

- **Conversation**: the chat thread, with citations, and the composer.
- **Ingest**: the upload dropzone and the stage timeline driven by the event protocol.
- **Inspection**: the event log, search results, artifact viewer, and document list.
- **Controls**: the status badge, entry, pagination, and `sl-drawer`.
