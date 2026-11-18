# web-components

The Lit components of the web client stack: elements with a shadow root that applications
compose, built on [`@standards-lab/web-foundation`](https://github.com/standards-lab/web-foundation),
which they take as a peer at `^0.2.0`. It is ES modules with their type declarations and
stylesheets, and depends on lit 3.3.3 and marked 18.2.1.

## Use

The package is `@standards-lab/web-components`. Each module defines its element when it is
imported, and the element's shadow root adopts the foundation's reset and elements sheets, then its
own layout-only sheet. The modules import `lit` and the foundation by package name and their sheets
as CSS module scripts, so a page reaches them through an import map or a bundler, and links the
foundation's `page.css`.

- `./status-badge.js`: `sl-status-badge`, a label; a click dispatches `badge-select`.
- `./entry.js`: `sl-entry`, one directory or file of a document hierarchy, as a button; it
  dispatches `open`, `selected` frames it in the accent color, and `status-tone` shows its status in
  the components' status hues.
- `./pagination.js`: `sl-pagination`, a page of entries between its summary and its controls; it
  dispatches `page-change` and `page-size-change`.
- `./drawer.js`: `sl-drawer`, docked as a complementary landmark at `dock` and wider, and a modal
  drawer below it; it dispatches `open` and `close`, and its mode is the `docked` or `drawer` custom
  state.

## Development

`mise run install` installs the pinned tools and `node_modules`; `mise run check` builds `dist/`
and runs the lint, the type checks, and the unit and browser tiers; `mise run demo` serves the demo
pages; `mise run currency` reports every pin behind its latest.

## License

[Apache License 2.0](LICENSE).
