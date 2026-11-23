<!-- Adapted from spike-html-apps-components (10dde51): README.md, for @standards-lab/web-components. -->

# web-components

The Lit components of the standards-lab web client stack: twelve elements with a shadow root that
applications compose, their sheets, a Markdown renderer, and a JSON formatter. It is ES modules
with their type declarations and stylesheets, built on
[`@standards-lab/web-foundation`](https://github.com/standards-lab/web-foundation), which it takes
as a peer, and is released by git tag. A component takes properties and attributes, sends events,
and may hold its own UI state; it holds no services, fetches no data, and binds no key.

## Install

Each release is a tag, `v<version>`, of
[standards-lab/web-components](https://github.com/standards-lab/web-components), whose tree is the
package as `pnpm pack` builds it: `package.json`, this README, the LICENSE, and `dist/`, the build.
The build lives only in the tag's tree, so the tag installs with no build step, and its manifest
has no scripts. It depends on lit 3.3.3 and marked 18.2.1, and takes the foundation as a peer at
`^0.3.0`: a consumer declares the foundation beside the components, and the one copy serves both,
so a restyle of the foundation's sheets by package name reaches the components' shadow roots too.
Install both by their tags:

```
pnpm add github:standards-lab/web-components#v0.1.0 github:standards-lab/web-foundation#v0.3.0
bun add github:standards-lab/web-components#v0.1.0 github:standards-lab/web-foundation#v0.3.0
npm install --allow-git=root github:standards-lab/web-components#v0.1.0 github:standards-lab/web-foundation#v0.3.0
```

npm 12 refuses git dependencies unless `--allow-git` allows them; `root` allows the ones the
project itself declares, which both packages are. Without the foundation declared, the install
fails. Each GitHub release also carries the tarball.

### Safari

No Safari release loads CSS module scripts, which the components import, so a page that uses
them requires a build: Vite with vite-plugin-standard-css-modules works in every browser. The
package keeps the standard syntax, with no pack-time rewrite.

## Use

The package is `@standards-lab/web-components`. Each module defines its element when it is
imported, and the element's shadow root adopts the foundation's reset and elements sheets, then
the foundation's meta, structure, utilities, dialog, and motion sheets where it uses them, then its
own layout-only sheet. The modules import `lit` and the foundation by package name and their
sheets as CSS module scripts, so a page reaches them through an import map or a bundler, and links
the foundation's `page.css`:

```html
<link rel="stylesheet" href="node_modules/@standards-lab/web-foundation/dist/page.css" />
<script type="module">
  import "@standards-lab/web-components/status-badge.js";
</script>
<sl-status-badge label="ready"></sl-status-badge>
```

- `./status-badge.js`: `sl-status-badge`, a label that dispatches `badge-select`.
- `./entry.js`: `sl-entry`, one directory or file of a document hierarchy, as a button.
- `./pagination.js`: `sl-pagination`, a page of entries between its summary and its controls.
- `./drawer.js`: `sl-drawer`, its children docked inline on a wide viewport, in a modal drawer
  below, or in the modal drawer at every width with `modal`.
- `./shortcuts.js`: `sl-shortcuts`, the keyboard shortcuts of the dialog that holds it, as a table.
- `./settings.js`: `sl-settings`, the reader's theme and keyboard settings, applied and stored at
  once.
- `./markdown.js`: `markdown(source)`, a Markdown string as a Lit template of plain elements.
- `./artifact-viewer.js`: `sl-artifact-viewer`, one artifact's content by its content type.
- `./event-log.js`: `sl-event-log`, events as a log in the order given.
- `./search-results.js`: `sl-search-results`, a search's matches under a status line.
- `./document-list.js`: `sl-document-list`, a page of documents, an `sl-entry` per document.
- `./chat-thread.js`: `sl-chat-thread`, a conversation's items in order.
- `./composer.js`: `sl-composer`, a multi-line text field and its send control.
- `./upload-dropzone.js`: `sl-upload-dropzone`, a zone that takes files, and the app's uploads.
- `./stage-timeline.js`: `sl-stage-timeline`, a run's stages as an ordered list of steps.
- `./*.css`: each component's sheet, which its module imports itself.

[docs/components.md](https://github.com/standards-lab/web-components/blob/main/docs/components.md)
documents each module in full, and its demo and specimen pages.

## Development

Tasks run through [mise](https://mise.jdx.dev):

```
mise run install                          # the pinned tools, and node_modules with the foundation and the tooling at their tags; reads the network
mise run check                            # lint, lint-context, lint-references, types, build, and both test tiers; reads no network
mise run build                            # src/ into dist/
mise run demo                             # serve the components demo page and the specimen pages on dist/
mise run screenshots                      # capture each specimen page at the defaults, zen, regular, and mono, light and dark, in tiles, inline in kitty
mise run screenshots --palette github     # the same, in the palette named; the facet flags combine
mise run screenshots --space compact      # the same, in the space named
mise run screenshots --type sans          # the same, in the type named
mise run screenshots --all                # every palette the foundation registers at the defaults, then compact and sans at zen
mise run screenshots --page entry         # only the page named; repeatable, and with any of the above
mise run screenshots --scheme dark        # only the scheme named, light or dark; with any of the above
mise run screenshots --output browser     # a gallery of the captures, opened in the browser; directory keeps the files
mise run screenshots --dir <path>         # write the captures into the directory named, with any of the above
mise run screenshots --keep               # keep the terminal output's captures, with any of the above
mise run currency                         # report every tool, package, and action pin, the foundation's and the tooling's tags, and the foundation's peer range, behind its latest; a held pin with its reason
```

`mise run screenshots` captures each specimen page light and dark, in vertical tiles at most
1200px tall, and the drawer's in its viewport at each of its four states. It runs the
`web-screenshots` bin of [web-tooling](https://github.com/standards-lab/web-tooling), the
devDependency the browser tier's driver and server also come from, over the capture description
`scripts/screenshots.config.ts`; `mise run screenshots -- --help` lists the flags with the pages
and profiles, and web-tooling's
[screenshots page](https://github.com/standards-lab/web-tooling/blob/main/docs/screenshots.md)
documents them. The check never runs it.

The check lints with ESLint, Prettier, shellcheck, actionlint, and marathon's lint-context and
lint-references. CI runs `mise run install` and the check on each pull request to main and each
push to it.
[docs/development.md](https://github.com/standards-lab/web-components/blob/main/docs/development.md)
gives the reasoning behind the configuration and the scripts.

## Release

A release is an annotated `v<version>` tag on a pack commit, cut by hand and published by the
release workflow;
[docs/release.md](https://github.com/standards-lab/web-components/blob/main/docs/release.md) gives
the procedure.

## Provenance

The package is seeded by copy from spike-html-apps-components at 10dde51, the parent of its
v0.10.3 pack commit, and moved onto web-foundation v0.3.0 and web-tooling v0.1.0. Each copied file
that takes comments names each of its sources in a provenance line.

## License

[Apache License 2.0](LICENSE).
