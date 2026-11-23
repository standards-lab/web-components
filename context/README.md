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

The package's lineage is in the workspace's [references catalog](https://github.com/standards-lab/org/blob/main/references.md).

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
