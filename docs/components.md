# Components

The modules of `@standards-lab/web-components`, by capability. The
[README](https://github.com/standards-lab/web-components/blob/main/README.md#use) shows how a page
loads them. [layout.md](layout.md) says why each sheet is laid out as it is,
[internals.md](internals.md) why each module is built as it is, and [testing.md](testing.md) why
the tests measure as they do.

## Controls

- `./status-badge.js`: `sl-status-badge`, a label; a click dispatches `badge-select`.
- `./entry.js`: `sl-entry`, one directory or file of a document hierarchy, as a button, its name the
  primary text and its status a quiet label, over a meta line of a file's size and content type and
  the time, its kind named to assistive technology alone; it dispatches `open`, and `selected`,
  reflected, frames it in the accent color, moving nothing. `status-tone` (`statusTone`), reflected,
  shows the status in the components' status hues: `active` the accent hook's, `complete` green,
  `incomplete` orange, `failed` red; with none it stays muted. It formats a file's size and its
  updated time with the foundation's `formatBytes` and `formatDateTime`. It sizes to its content in
  any parent, a shrink-to-fit one too, and stays inside its box down to 16rem, its supported minimum
  width.
- `./pagination.js`: `sl-pagination`, a page of entries between its summary and its controls, a
  `status` slot running on after the summary's text; it dispatches `page-change` and
  `page-size-change`.
- `./drawer.js`: `sl-drawer`, its children in the default slot, in one of two shadow wrappers by
  the viewport. At `dock`, a CSS length, 48rem by default, and wider, read in the media query
  `(width < <dock>)` so that exactly `dock` docks, they sit in an `aside` docked inline as an
  ordinary block, a complementary landmark, always shown and taking no focus, under a header that
  holds `label` as the `h2` naming it, with no Close button, the content scrolling below it in a
  host held short; the content needs no heading of its own. Below it they sit in a modal dialog,
  closed until `show()`, `toggle()`, or `open` opens it, `open` in the markup as the page loads
  too, covering the viewport and sliding in from the inline-start edge; docked, `open` in the
  markup is reverted to false. Its header holds `label` as an `h2` that names the dialog, staying
  in view while the content scrolls, and a Close button, a glyph button showing web-icons' x-16,
  named "Close" and the label, a name it shows as a hint on hover and keyboard focus; the `close`
  slot replaces "Close" for a translation. As it opens, focus lands on its heading,
  `tabindex="-1"` and `autofocus`, not on the Close button; the heading shows no focus outline and
  is out of the Tab order, so Tab from it reaches the Close button. The Close button, Escape,
  `close()`, or `toggle()` closes it, and focus returns to what opened it. It dispatches `open`
  and `close` as the modal drawer opens and closes, never as the viewport crosses `dock`, which
  swaps only the wrapper, so the slotted content is never moved, disconnected, or re-created: an
  open drawer docks, and docked content becomes a closed drawer. It slides only when the reader
  allows motion. `modal`, a reflected boolean, makes it the modal dialog at every width, ignoring
  `dock`; setting or removing it is a switch too, so it closes an open drawer silently. Its mode is
  the custom state `docked` or `drawer`, which a page may style.
- `./shortcuts.js`: `sl-shortcuts`, the page's keyboard shortcuts for a help dialog, as a plain-text
  table of Keys and Action: exactly what the foundation's `bindings(dialog)` gives for the dialog
  that holds it, `bindings(null)` outside one, in its order, each key in a `kbd` as the keys
  grammar labels it, and each action the binding's registered label or its element's name. A row
  the reader's setting turns off, character keys alone while character keys are off, carries the
  word "off" after its keys and the class `off`. The screen-reader note, `NOTE`, follows the
  table. It reads the bindings again as it connects, as its dialog opens, and at each `change` in
  the document and each `storage` event. Nothing in it takes focus; it binds no key, runs no
  binding, holds no setting, and renders no `[data-keys-list]`.
- `./settings.js`: `sl-settings`, the reader's settings for a Settings dialog: the theme's color,
  scheme, space, and type rows, the registry's profile names and `SCHEMES`, each a ◀ value ▶ radio
  group checked at what applies to the root, with an inert preview card beside them where the
  element's own width fits both and below them where it doesn't, and the keys module's
  character-key switch, `SWITCH_LABEL`, and wait between presses, `WAIT_LABEL`, one of `WAITS`. A
  click on a row's arrow steps it, wrapping; on a row, H and L step it, J and K or the down and up
  arrows move between rows, stopping at the ends, and the left and right arrows cycle its radios
  natively; these keys stay inside its rows, and it binds no page key. Every change is applied to
  the root and stored at once, through the foundation's preferences module, or the keys module's
  `changeSettings`, with no Save and no Cancel, and fires a bubbling, composed `change` at the
  host. It reads both settings again as it connects, as its dialog opens, and at each `change` in
  the document and each `storage` event; as its dialog opens it focuses the first row's checked
  radio, unless an element in the dialog has `autofocus`. Its shadow root adopts the foundation's
  meta and structure sheets too, for the preview card's blue button and field.

## Rendering

- `./markdown.js`: `markdown(source)`, a Markdown string as a Lit template of plain elements, by
  marked's lexer: raw HTML shows as text, an image as its alt text, and a link is an anchor only
  to an http, https, or mailto URL or a relative one. It is the one module that imports marked,
  which an import map then maps too.

## Inspection

- `./artifact-viewer.js`: `sl-artifact-viewer`, one artifact's content by its content type, text
  from a string and the types the browser renders natively from a Blob, under a header of its name
  and content type that `no-header` (`noHeader`) leaves out, for a page whose own header shows
  them. Every state, its content or its loading, error, invalid JSON, unsupported, or empty note,
  is in a region named `<name> content`, header or not. Valid JSON is formatted from its own
  tokens by the foundation's `format.js`, never parsed and printed again, so it shows its own
  keys, their order, and its numbers; JSON that doesn't parse shows as text under a note.
  `viewOf(contentType)` gives a type's `view` and the `content` it takes, `text` or `blob`, so a consumer knows what to
  fetch. A text view is always safe, never a URL and never a document, so the viewer shows text
  whenever the content is text: "can't be shown" is left for bytes that aren't. The
  `content-type` decides the view, never a Blob's own type, and the Blob's bytes are shown as
  that type. The viewer owns the object URL of the Blob it holds: it makes it while
  connected and revokes it as the content or its type changes and as it disconnects. It sends no
  event. It imports `./markdown.js`, so its page maps marked too.

  | Content type, its parameters and case aside     | View                                              | Content |
  | :---------------------------------------------- | :------------------------------------------------ | :------ |
  | text/markdown                                   | rendered Markdown, scrolling                      | string  |
  | application/json, or a subtype ending in +json  | JSON formatted from its tokens, scrolling         | string  |
  | any other text/ type, text/html included        | preformatted text, as it is, never run as a page  | string  |
  | a textual application type, `TEXT_TYPES`        | its source as preformatted text                   | string  |
  | a subtype ending in +xml or +yaml, SVG included | its source as preformatted text                   | string  |
  | application/pdf                                 | an iframe, the browser's own PDF viewer           | Blob    |
  | image/*, but image/svg+xml                      | an img, at its natural size or narrower, its alt  | Blob    |
  | audio/*                                         | an audio with controls, the viewer's width        | Blob    |
  | video/*                                         | a video with controls, the viewer's width         | Blob    |
  | anything else, `unknown`                        | text if its bytes are; else a note and a download | Blob    |

  `TEXT_TYPES` is application/xml, application/javascript, application/ecmascript,
  application/yaml, application/x-yaml, application/toml, application/csv, application/x-ndjson,
  application/sql, application/x-sh, and application/x-shellscript. A native type's type and
  subtype must each be an HTTP token, so `image/png,text/html` is anything else; a text/ type is
  text however it is written, `text/plain,x` included, since text never gets a URL. An unknown
  type's Blob is text when its first MiB, `SNIFF_BYTES`, decodes as UTF-8 and holds no C0 control
  character but tab, line feed, form feed, and carriage return; past the MiB it shows as decoded.
  Binary bytes show the note, with a link that downloads them typed `application/octet-stream`.
  The viewer reads the Blob itself, showing the loading note until it has, and its
  `updateComplete` waits for the read. A string given for an unknown type shows as text unless it
  holds such a control character. A native type with no Blob yet, a string included, shows the
  loading note; a text type given a Blob shows as empty, as `""` does.
- `./event-log.js`: `sl-event-log`, events as a log in the order given, each its type, its time by
  the foundation's `formatDateTime` when it has one, its source, subject, and id, each labelled on
  a line of its own, and its data pretty-printed in a native details, collapsed; events appended
  leave those shown in place, and a constrained log scrolls inside, following the newest only from
  its end. It exports its event type, a CloudEvents subset, and sends no event.
- `./search-results.js`: `sl-search-results`, a search's matches under a status line, each a
  native button of its document's name, the field it matched in, and its snippet, marked
  case-insensitively as text for the query the matches were set with; its count names that query
  too, and says how many of a paged search's `total` it shows, while any are shown, and with none,
  "No matches" names the query the empty matches were set with; it dispatches `open` with a
  match's id, and has loading and error states. It exports its match type and binds no key.
- `./document-list.js`: `sl-document-list`, a page of documents composed of the components above,
  an `sl-entry` per document inside one `sl-pagination`, whose properties it takes under the same
  names and hands through; it frames the selected document's entry, hands a document's
  `status_tone` to its entry as its status tone, and has empty, loading, and error states, said
  on the pagination's summary line when it shows one. The entry's `open` and the pagination's
  `page-change` and `page-size-change` reach its listener as their parts sent them; it dispatches
  none of its own. It exports its document type and binds no key.

## Conversation

- `./chat-thread.js`: `sl-chat-thread`, a conversation's items in order, a structural subset of
  Open Responses: a user's text as plain text, the assistant's as rendered Markdown, a refusal
  labelled, and a streaming reply re-rendered in place; with `verbose`, reasoning, function calls,
  and their outputs too, each collapsed in a native details, a reasoning item's summary on its
  line and its content inside, and a call's arguments and its output that are valid JSON
  formatted from their own tokens by the foundation's `format.js`. A thread its consumer holds
  to a height scrolls inside, opening at its end and following the newest item only from its end
  or on a user's message; unheld, it is as tall as its content and follows nothing, so a consumer
  that wants it followed holds it. It exports its item types and sends no event. It imports
  `./markdown.js`, so its page maps marked too.
- `./composer.js`: `sl-composer`, a multi-line text field that grows to eight lines, and its
  send control, which a stop control replaces while `busy`; it dispatches `send` with the text,
  then clears the field, and `stop`. Its `send()` does what activating send does, so an app that
  sends on a key calls it; the composer binds no key.

## Ingest

- `./upload-dropzone.js`: `sl-upload-dropzone`, a zone that takes files by drop or through its
  picker button, and the app's uploads below it, each with its progress and a cancel control or
  its finished state; it dispatches `files-select` with an array of the files, and
  `upload-cancel` with an upload's id. It exports its upload type and binds no key.
- `./stage-timeline.js`: `sl-stage-timeline`, a run's stages as a connected, ordered list of
  steps in their positions' order, each its name, its state's label and marker, and its time by
  the foundation's `formatDateTime`, a complete stage's `completedAt` or a failed one's `failedAt`;
  a failed stage's `reason` shows under its label, part of its step for assistive technology, and
  wraps to the timeline's width without widening it. The active stage is the current step, and a
  stage that advances changes in place, moving nothing. It exports its stage type, holds nothing
  focusable, and sends no event.

## Sheets

- `./*.css`: each component's sheet, which its module imports itself.

## Demo

`demo/components.html` puts the status badge, the entry, and the pagination on one page, with its
import map, and the [Settings and Help pattern](../README.md#settings-and-help) in its header, which
the settings and shortcuts pages carry too. `demo/glyphs.js` fills the pages' web-icons markers.
Each component has a specimen page, `demo/<name>.html`, for `status-badge`, `entry`, `pagination`,
`artifact-viewer`, `chat-thread`, `composer`, `upload-dropzone`, `stage-timeline`, `event-log`,
`search-results`, `document-list`, `drawer`, `settings`, and `shortcuts`. A specimen page shows
every state of its component, labelled, then again in a section 20rem wide, and, for a component
that holds a control, one instance reached by the keyboard to show its focus ring: the screenshot
script focuses the focus section's `[data-focus-start]` mark, which takes focus only by script, then
presses Tab as many times as the mark's value says, so `:focus-visible` matches. A page whose
component draws its own frame drops the dashed one, so a capture shows the component's frame alone.
The drawer's mode is the viewport's, so its page is an app's frame instead, its states the page's at
two widths: docked at 1280px, and closed, open, and open right to left at 480px. Its Outline drawer
is `modal`, and its captures open it at 1280px, then reach its Close by Tab. The settings and
shortcuts captures add each page's dialog, opened by its key. The specimen pages link the
foundation's `page-full.css` and import its `register-full.js`, so a profile applies by its
attribute on the root.
