<!-- Adapted from web-foundation (ceaab61): CHANGELOG.md, for @standards-lab/web-components, with
none of spike-html-apps-components' versions. -->

# Changelog

All notable changes to `@standards-lab/web-components` are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the package adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-11-22

### Removed

- **Breaking:** `./json.js`, with no re-export: import `formatJson` and `tryFormatJson` from the
  foundation's `format.js`.

### Changed

- **Breaking:** the foundation peer is `@standards-lab/web-foundation` at `^0.4.0`, up from
  `^0.3.0`, and `@standards-lab/web-icons` at `^0.1.0` is a second peer, whose glyphs the
  components import by package name; a consumer declares both beside the components.
- **Breaking:** the components read the foundation's `--color-accent` and `--color-primary`, which
  replace `--accent-color` and `--interaction-color`; a page that set the old names sets the new.
- **Breaking:** each shadow root adopts the foundation's utilities, glyph-button, dialog, and motion
  sheets where it uses them, and `sl-settings` its meta and structure sheets, in place of the
  components' own rules for the same, so the foundation's classes style the components' internals.
  The chat thread's streaming dot and the stage timeline's running ring are spans carrying the
  foundation's motion classes, no longer pseudo-elements.
- **Breaking:** `sl-drawer`'s Close is a glyph button showing web-icons' x-16; the `close` slot's
  text, "Close" by default, is its name and its hint on hover and keyboard focus, no longer its
  visible text.
- marathon 0.23.0 and mise-action v5.3.0, in the repository's tooling.

### Added

- `./settings.js`: `sl-settings`, the reader's theme and keyboard settings, applied and stored at
  once.
- `./shortcuts.js`: `sl-shortcuts`, the keyboard shortcuts of the dialog that holds it, as a
  plain-text table.
- `sl-drawer`'s `modal` attribute, which keeps the drawer modal at every width.
- The Settings and Help pattern, S and ? opening dialogs that hold `sl-settings` and
  `sl-shortcuts`, in the README and the demo, with specimen pages for both.

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

[0.2.0]: https://github.com/standards-lab/web-components/releases/tag/v0.2.0
[0.1.0]: https://github.com/standards-lab/web-components/releases/tag/v0.1.0
