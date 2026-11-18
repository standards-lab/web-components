<!-- Adapted from web-foundation (ceaab61): CHANGELOG.md, for @standards-lab/web-components, with
none of spike-html-apps-components' versions. -->

# Changelog

All notable changes to `@standards-lab/web-components` are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the package adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-11-18

### Added

- The components package, seeded by copy from spike-html-apps-components v0.10.3 (10dde51) and
  moved onto `@standards-lab/web-foundation` v0.3.0, its one peer at `^0.3.0`, and its four color
  themes: Zen (the default), GitHub, Catppuccin, and Everforest. It depends on lit 3.3.3 and
  marked 18.2.1, each pinned exactly; its sources are CSS and TypeScript, which tsc builds into
  `dist/`, each module's `.js` with its `.d.ts`, the sheets beside them. Each element's shadow root
  adopts the foundation's reset and elements sheets, then its own layout-only sheet.
- The controls: `sl-status-badge`, a label that dispatches `badge-select`; `sl-entry`, one
  directory or file of a document hierarchy, with its status tones and its selected frame;
  `sl-pagination`, a page of entries between its summary and its controls; and `sl-drawer`, docked
  as a complementary landmark at `dock` and wider and a modal drawer below it.
- The inspection components: `sl-event-log`, a CloudEvents subset as a log; `sl-search-results`,
  a search's matches with the query marked; `sl-artifact-viewer`, one artifact by its content type;
  and `sl-document-list`, a page of documents as entries inside one pagination.
- The conversation components: `sl-chat-thread`, a structural subset of Open Responses items, the
  assistant's rendered as Markdown; and `sl-composer`, a growing text field with its send and stop
  controls.
- The ingest components: `sl-upload-dropzone`, files by drop or picker and the app's uploads with
  their progress; and `sl-stage-timeline`, a run's stages, which the app gives, as ordered steps.
- `markdown.js`: `markdown(source)`, Markdown as a Lit template of plain elements by marked's
  lexer, the one module that imports marked; and `json.js`: `formatJson(text)`, JSON re-indented
  from its own tokens.
- A specimen page per component under `demo/`, each state labelled, and `mise run screenshots`
  capturing them light and dark in every theme the foundation registers.
- The browser tier on `@standards-lab/web-tooling` v0.1.0 in a pinned chrome-headless-shell, every
  component checked under every registered theme, light and dark.
- Releases by tag: each `v<version>` tag marks a pack commit whose tree is the pack, the build
  included, and whose one parent is main's merge commit; its GitHub release carries the tarball.

[0.1.0]: https://github.com/standards-lab/web-components/releases/tag/v0.1.0
