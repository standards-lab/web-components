# Testing

Why the tests measure as they do, where a test's name and its assertions don't say.
[components.md](components.md) documents what each component promises, and the browser tests name
the behavior and layout each one holds to.

## The tiers

- The unit tier runs under Node on the lint and on a pack of the build: `layers.test.ts` lints the
  import cases `layers-tree.ts` writes as one tree, `marked.test.ts` holds marked to one importer,
  and `release.test.ts` checks a `pnpm pack` of the `dist/` that `mise run build` writes, as it
  stands and in scratch copies with one fault each.
- The browser tier runs on `dist/` in the pinned chrome-headless-shell, on the pages under
  `test/fixtures/` and the specimen pages under `demo/`. `test/browser/support/served.ts` is what
  the browser tier, `mise run demo`, and the screenshots description all serve, so the list is kept
  once. Of the served packages, lit's own dependencies (lit-html, lit-element, and
  `@lit/reactive-element`) sit beside it in pnpm's store and the server brings them with it; the
  foundation is the install the components' `dist/` imports by name, reached as a consumer reaches
  it.
- `test/browser/support/types.js` is run by no page: tsc checks it with the in-page modules against
  the same `dist/`, so a declaration that narrows what a consumer may write fails `types:browser`.

## Every browser case

- A headless page never has the window's focus. Each browser test that drives the keyboard turns on
  CDP focus emulation (`Emulation.setFocusEmulationEnabled`), so keys reach the focused element as
  a user's would and `:focus-visible` matches.
- Times and dates are checked in en-US at UTC, the locale and time zone web-tooling's `launch()`
  starts the browser in.
- A measure the page returns as JSON leaves out a missing box, `undefined`, so a part that isn't
  rendered is absent from the comparison rather than null.
- Under a CSS zoom of 0.9 or 1.1, a frame's end falls short of its scroll height by more than a
  pixel of rounding, so a one-pixel threshold would read the reader as scrolled up. The event log's
  and the chat thread's zoom cases check that the frame still follows; the thread's uses heights
  where such a threshold stopped the follow part way.
- Assistive-technology text is read from `Accessibility.getFullAXTree`: each node's descendants'
  static text in order, leaving out ignored text such as an `aria-hidden` marker.

## Profiles

- `test/browser/support/profiles.ts` reads the profiles from the installed foundation's registry
  rather than listing them, so a profile a later foundation adds is covered by every case and
  capture that reads them; the screenshots description's `--all` reads them too. Its full
  registration module, `register-full.js`, imports every built-in unit's module, each of which
  registers its name and loads no CSS, so Node imports it as a page does.
- Each case on `test/fixtures/components.html` runs once on the lean entry, `page.css` with no
  profile set, and once in each profile combination on the full entry, `page-full.css` with
  `register-full.js`.
- `themes.test.ts` reads the specimen pages from `demo/` as it reads the profiles, so a page a
  component adds is covered with no edit. One case pins that the registry lists at least the four
  built-in colors, so an empty read can't pass with nothing checked. `demo/components.html` is left
  out: it links only the lean entry, so it shows one profile.
- Text in a fully transparent color shows nothing, as a hidden mark does, so it takes no color token.
- The stage timeline holds no control, so the focus ring cases skip it; a case pins that it renders
  nothing focusable, so a control it gains must get a ring case.

## Components

- The probe renders the pagination holding one entry per fixture item and drives it through its
  contract alone. Its overflow case measures every part the eye sees, leaving out the entry's
  visually hidden kind, which overflows its one-pixel box by design; its contract cases read what
  renders, since a value the element never took in still reads back from its field.
- The restyle case edits the elements sheet once and finds both shadow roots' buttons repainted,
  since a CSS module script is one `CSSStyleSheet` per document. A `var()` with no token computes to
  transparent, so the opaque `rgb()` it reads first shows the tokens loaded.
- The adopted-sheets case compares each component's sheets by identity: a CSS module script is one
  sheet per URL, the foundation's as the page's import map resolves it and each component's own
  beside its module.
- The profiles case reads each component's look from a part the profiles change: a component's
  first button where it has one; the artifact viewer's scrolled content and its Markdown heading's
  font, since the region's body font is one the type profiles share; the chat thread's user message
  and its role label's font; the stage timeline's complete marker, its step's column gap, and its
  label's font; the event log's list and its time's font; and the docked drawer's aside, its body's
  padding, and its slotted button's font, since it sets none itself.
- A line count is the number of distinct tops among a Range's client rects over the element's
  text. The entry's meta lines are measured from its parts' boxes instead, since the parts share a
  baseline, not a top, and the date and clock sit in spans of their own. The dropzone's bytes sent
  are an inline block whose box's top counts apart from its text's, so they are measured by height.
- The dropzone eases its border's color, so the hook case finishes that transition before reading
  it.
- Whether an event log id fits its line depends on the monospace font's width, so the specimen case
  reads each identifier's text and title, not its look. The narrow log case is 12rem wide, narrower
  than a UUID in any monospace font, so every subject and id is cut whatever the font; it leaves the
  times out, which keep whole and would scroll a log that narrow for the times alone.

## JSON shown as written

- The JSON cases use integer-like keys, 9007199254740993, `1.0` and `1e3`, and a duplicate key: a
  parse and print would move the integer keys first, round the big number, rewrite `1.0` and `1e3`,
  and drop the first duplicate, so these values show the output comes from the text's own tokens.
- `test/browser/support/deep.ts` writes out the formatter's output for deep nesting rather than
  reading it from `formatJson`, so a test that compares a view with it checks the formatter too.
- The depth-65 case puts an opening brace in a key, an escaped quote before closing brackets, and an
  escaped backslash before a string's real end, then at depth 64 a string holding the brackets that
  would close it. A bracket count any of these fools ends the kept container early or late.
- The 20,000-deep case bounds the output at the text's length plus 4·64·64 characters: the 64
  formatted levels each add a line break and at most 128 spaces at their opening and closing
  brackets, and the levels below are kept as written. Indenting every level would take some 800
  million spaces.

## Artifact viewer

- The binary content is a PNG, since its signature holds U+001A, a control character text never
  holds.
- chrome-headless-shell has no PDF viewer plugin, so a PDF's pages never render under test; the PDF
  case checks the iframe, its `blob:` source, its title, and its box.
- The object-URL case opens each view's URL in a frame, as "Open image in new tab" or the download
  link would. Each URL is a Blob of a `text/html` page that would set `ran` on the frame's parent;
  a URL the test makes of the Blob itself first shows such a page would run.

## Chat thread

- The follow cases read the frame's place the moment the update completes, and the details cases two
  frames after the click; a smooth scroll still under way would read short of the end, so these
  reads show the scroll is instant. Reduced motion only makes a scroll less smooth, so the
  instant-scroll cases run with motion allowed.

## Drawer

- The media query's change event lags a resize by a frame, a race a test can't win reliably, so the
  "show() just after a resize" case holds back the drawer's listener while the viewport narrows: the
  drawer is still docked by the last event it heard, though the query matches.

## Markdown

- The compared HTML has Lit's marker comments stripped; a comment in the source renders as escaped
  text, so the strip removes none of it.
- The marked-loading case imports every other module of `dist/` and sees no request for marked, then
  imports the renderer and sees the request, which shows the case can see one at all.
- `marked.test.ts` holds the modules that render Markdown through `markdown.ts`, the artifact
  viewer's, to that one path, which the browser case can't. TypeScript's `preProcessFile` reads each
  module's specifiers as the compiler does, so no import form passes by its spelling.

## Document list

- A listener on the list's shadow root keeps each event its parts send before the event leaves the
  root, and a listener on the list records each event it hears and whether the root kept that same
  event, so a re-dispatch would show as a second, unkept event.

## Search results

- The total is assigned inside the page rather than passed through JSON, which writes NaN as null.
- Lowercasing "İ" gives two code points, so marks found on a lowercased copy would land two places
  off; the case finds them against the original text.
- A word joiner shows as "+" in the read-out, so a case sees where a snippet's ellipses join the
  text.

## Upload dropzone

- The native picker opens as a protocol event, `Page.fileChooserOpened`, not a dialog, and the case
  answers it with files on disk.
- Entering the zone fires a dragover too, so the document hears one or more before the drop.
- The focus outline's box is the control's grown by the outline's width and offset, as the
  foundation's `:focus-visible` draws it, and it must clear the bar and the bytes by a pixel.

## Layer imports

- `layers-tree.ts` writes every case into one tree, so each is judged beside the others, as the
  package's files are. A fatal message has no rule, so no watched rule matches it; the before hook
  asserts every file parses.
- A package the manifest doesn't declare draws both the layer table and
  `no-extraneous-dependencies`: lit-html, which lit depends on, is installed beside it; the SDK is
  the sibling layer's and the app sits above every layer; a devDependency ships nothing.
- The package's own name resolves to its build, not its `src/`, and the table alone catches it:
  `no-extraneous-dependencies` (eslint-plugin-import-x 4.18.0) passes a self-import in a package
  whose manifest has an `exports` field, as Node resolves one.
- A value import of a declaration file is caught in each value form, an inline `type` specifier
  among them, since `verbatimModuleSyntax` keeps that import.
- The allowed imports use names that hold dots, which a rule must tell from `.` and `..` segments.
- `lint` runs ESLint with `-c` on the repository's config, whose patterns then match from the
  tree, the working directory, and whose plugins load from the repository's `node_modules`.
