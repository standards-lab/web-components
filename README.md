<!-- Adapted from spike-html-apps-components (10dde51): README.md, for @standards-lab/web-components. -->

# web-components

The Lit components of the standards-lab web client stack: fourteen elements with a shadow root
that applications compose, their sheets, and a Markdown renderer. It is ES modules with their type
declarations and stylesheets, built on
[`@standards-lab/web-foundation`](https://github.com/standards-lab/web-foundation) with the glyphs
of [`@standards-lab/web-icons`](https://github.com/standards-lab/web-icons), which it takes as
peers, and is released by git tag. A component takes properties and attributes, sends events,
and may hold its own UI state; it holds no services, fetches no data, and binds no key.

## Install

Each release is a tag, `v<version>`, of
[standards-lab/web-components](https://github.com/standards-lab/web-components), whose tree is the
package as `pnpm pack` builds it: `package.json`, this README, the LICENSE, and `dist/`, the build.
The build lives only in the tag's tree, so the tag installs with no build step, and its manifest
has no scripts. It depends on lit 3.3.3 and marked 18.2.1, and takes the foundation as a peer at
`^0.4.0` and the icons at `^0.1.0`: a consumer declares each beside the components, so the page
and the components share one copy of each, and a restyle of the foundation's sheets by package
name reaches the components' shadow roots too. Install all three by their tags:

```
pnpm add github:standards-lab/web-components#v0.2.0 github:standards-lab/web-foundation#v0.4.0 github:standards-lab/web-icons#v0.1.0
bun add github:standards-lab/web-components#v0.2.0 github:standards-lab/web-foundation#v0.4.0 github:standards-lab/web-icons#v0.1.0
npm install --allow-git=root github:standards-lab/web-components#v0.2.0 github:standards-lab/web-foundation#v0.4.0 github:standards-lab/web-icons#v0.1.0
```

npm 12 refuses git dependencies unless `--allow-git` allows them; `root` allows the ones the
project itself declares, which all three packages are. Leaving either peer undeclared fails the
install. Each GitHub release also carries the tarball.

### Safari

No Safari release loads CSS module scripts, which the components import, so a page that uses
them requires a build: Vite with vite-plugin-standard-css-modules works in every browser. The
package keeps the standard syntax, with no pack-time rewrite.

## Use

The package is `@standards-lab/web-components`. Each module defines its element when it is
imported, and the element's shadow root adopts the foundation's reset and elements sheets, then
the foundation's meta, structure, utilities, glyph-button, dialog, and motion sheets where it uses
them, then its own layout-only sheet. The modules import `lit`, the foundation, and the icons by
package name and their sheets as CSS module scripts, so a page reaches them through an import map or a bundler, and links
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

### Settings and Help

The components bind no key, so the page binds S and ? itself, as `demo/components.html` does. Two
glyph buttons in the header's `.header-actions` open the dialogs with `command="show-modal"`, and
the foundation's `keys.js` binds each to its key through `data-keys`. Help is a `.dialog-fit`
dialog holding `sl-shortcuts`, and Settings is a `.dialog-wide` dialog holding `sl-settings`; each
has a `.dialog-header` whose Close shows the Esc hint. Close and Escape close either dialog with no
script, and focus returns to the element that held it. The page links the foundation's
`glyph-button.css`, `dialog.css`, and `layout.css` after its entry, and web-icons' `iconFill()`
fills the glyphs' markers:

```html
<header>
  <strong>App</strong>
  <div class="header-actions">
    <button
      type="button"
      class="glyph-button"
      commandfor="help"
      command="show-modal"
      aria-label="Help"
      aria-description=""
      data-keys="?"
      interestfor="help-hint"
    >
      <svg data-icon="octicon/question-16"></svg>
      <span aria-hidden="true"><kbd>?</kbd></span>
    </button>
    <div id="help-hint" class="glyph-hint" popover="hint" aria-hidden="true">Help</div>
    <button
      type="button"
      class="glyph-button"
      commandfor="settings"
      command="show-modal"
      aria-label="Settings"
      aria-description=""
      data-keys="s"
      interestfor="settings-hint"
    >
      <svg data-icon="octicon/gear-16"></svg>
      <span aria-hidden="true"><kbd>S</kbd></span>
    </button>
    <div id="settings-hint" class="glyph-hint" popover="hint" aria-hidden="true">Settings</div>
  </div>
</header>
<dialog id="help" class="dialog-fit" aria-labelledby="help-title">
  <header class="dialog-header">
    <h2 id="help-title" tabindex="-1" autofocus>Keyboard shortcuts</h2>
    <button
      type="button"
      class="glyph-button"
      commandfor="help"
      command="close"
      aria-label="Close"
      aria-description=""
      interestfor="help-close-hint"
    >
      <svg data-icon="octicon/x-16"></svg>
      <span aria-hidden="true"><kbd>Esc</kbd></span>
    </button>
    <div id="help-close-hint" class="glyph-hint" popover="hint" aria-hidden="true">Close</div>
  </header>
  <sl-shortcuts></sl-shortcuts>
</dialog>
<dialog id="settings" class="dialog-wide" aria-labelledby="settings-title">
  <header class="dialog-header">
    <h2 id="settings-title">Settings</h2>
    <button
      type="button"
      class="glyph-button"
      commandfor="settings"
      command="close"
      aria-label="Close"
      aria-description=""
      interestfor="settings-close-hint"
    >
      <svg data-icon="octicon/x-16"></svg>
      <span aria-hidden="true"><kbd>Esc</kbd></span>
    </button>
    <div id="settings-close-hint" class="glyph-hint" popover="hint" aria-hidden="true">Close</div>
  </header>
  <sl-settings></sl-settings>
</dialog>
<script type="module">
  import "@standards-lab/web-foundation/keys.js";
  import "@standards-lab/web-components/settings.js";
  import "@standards-lab/web-components/shortcuts.js";
</script>
```

The Help heading takes focus as its dialog opens; the Settings heading doesn't, so `sl-settings`
focuses its first row. `demo/settings.html` and `demo/shortcuts.html` carry the pattern too.

## Development

Tasks run through [mise](https://mise.jdx.dev):

```
mise run install                          # the pinned tools, and node_modules with the foundation, the icons, and the tooling at their tags; reads the network
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
mise run currency                         # report every tool, package, and action pin, the foundation's, the icons', and the tooling's tags, and both peer ranges, behind its latest; a held pin with its reason
```

`mise run screenshots` captures each specimen page light and dark, in vertical tiles at most
1200px tall; it captures the drawer's page in its viewport at each of its six states, and the
settings and shortcuts pages again with their dialogs open. It runs the
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
