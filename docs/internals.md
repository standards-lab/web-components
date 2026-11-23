# Internals

Why each module is built as it is, where its code and its exported documentation don't say.
[components.md](components.md) documents what each module provides, and [layout.md](layout.md) why
each sheet is laid out as it is.

## Every element

- An element declares its reactive properties in Lit's static `properties` map, in place of
  decorators. Each field is `declare`d, so the class emits no field to shadow Lit's accessor, and
  gets its default in the constructor. Lit's converters give the attribute contract: a removed
  number attribute is null, and an `Array` attribute is parsed as JSON, null when it isn't valid.
- A list that can hold focus or grow in place (the chat thread, the event log, the search results,
  the document list, the stage timeline, the upload dropzone) renders through Lit's keyed `repeat`,
  keyed by the item's identity, so an item keeps its nodes as the list changes around it: a focused
  control stays with its item, an opened details stays open, and a streaming item re-renders in
  place.
- A frame that scrolls when its consumer constrains it takes `tabindex="0"`, `role="region"`, and a
  name, so the keyboard reaches it by Tab and its arrow and page keys scroll it.
- The chat thread and the event log judge a frame to be at its end within two pixels, divided by the
  CSS zoom below 1: the integer heights and the scroll position, snapped to the device pixel, leave
  up to two pixels between, more where a device pixel is more than a CSS one, and within one CSS
  pixel the follow would stop by itself at a zoom of 0.9 or 1.1. A browser without `currentCSSZoom`
  is taken as unzoomed.
- Valid JSON is shown by the foundation's `tryFormatJson()`, formatted from its own tokens:
  `JSON.parse` decides validity alone and its value is thrown away, since printing it would move
  integer-like keys first, rewrite numbers, and drop duplicate keys. Text whose formatting would
  pass the longest string, a `RangeError`, shows as it is.

## Artifact viewer

- A native view's type and subtype must each be an HTTP token: an object URL's bytes carry the
  type, and a browser that can't parse it as one type sniffs the bytes, or reads it as a list and
  takes its last type, so `image/png,text/html` opened from an `img` would load as a page.
- The object URL is made of a slice of the Blob typed by the content type, so the browser renders
  the bytes as the view does, whatever the Blob says: a PDF's frame never loads them as a page. An
  unknown type's binary Blob gets a URL only for its download link, typed
  `application/octet-stream`, so the link, opened rather than downloaded, never renders the bytes.
  A URL no longer wanted is revoked before another is made.
- An unknown type's Blob is read only to its first MiB to decide, so a large binary Blob is never
  read whole; a read that ends after the content changed is dropped.
- A state that shows a note alone names the frame around it as the artifact's region, as the
  scrolling region is named in the states that show content, so no region nests in another.
- `no-header` names the departure from the default, the header shown, because a boolean attribute
  is true by its presence, as the platform's `novalidate` and `nomodule` do.

## Chat thread

- An update follows the newest item when the frame was at its end before it, showed no items yet,
  or the update adds a user's message, the newest or the one before the reply's first text when the
  consumer adds both at once.
- The last item growing with no update, a details opened in it or an image that loads, is watched by
  a `ResizeObserver` on the frame's content rather than the details' `toggle` event: it sees every
  cause and leaves the details toggling natively. Its callback runs after layout, so the reader's
  place is measured against the scroll height last seen; a scroll listener could read the grown
  height. Every resize records the heights it leaves, so a growth above the end, which leaves the
  reader short of the new end, measures the next growth of the last item against the end as it now
  is. The scroll leaves the content's size alone, so it never loops the observer.
- Connected again, the frame is measured and observed anew, so the observer's first callback finds
  the content as the reader does and scrolls nothing on its own. Detached, the frame has no layout
  to follow or measure.
- A reasoning item's summary parts join into one run; a part with no text yet, as one just begun
  streaming, is no summary. The standalone line puts no whitespace before its kind, which would
  widen it past the summaries' marker.

## Composer

- `send()` clears the field before `send` goes out, so a listener that sets `value`, restoring the
  draft when its send fails, keeps what it set.
- Send and stop are one button, so focus stays across the swap; both labels sit in its one cell.
- A disabled control keeps focus and takes no keys, so when the button turns disabled while it holds
  focus, focus moves to the field; while the composer is disabled the field takes no focus either,
  and focus is left where it is.

## Document list

- Each document maps to its entry's item once, in a `WeakMap`, while the app holds it, so an entry
  is handed the same item across renders and updates only when its document changes.
- The paging properties are the pagination's own declarations, so each attribute converts as the
  pagination's does.
- The selected item holds `aria-current`: the entry's button is inside its own shadow root, out of
  the list's reach.
- The one status element moves between the pagination's slots, so the live region is never
  replaced.
- The composed parts' events, an entry's `open` and the pagination's `page-change` and
  `page-size-change`, are dispatched bubbling and composed by the foundation's `emit`, so each
  reaches the list's listener as it was sent; the list re-dispatches none, which would send each
  twice.

## Drawer

- The mode is null until the element connects, and again once it is removed, so a reconnected
  element reapplies its mode; the first mode on connecting is no switch, so `open` from the markup
  stands.
- A removed modal dialog leaves the top layer but keeps its `open` attribute, which a reconnect
  would show non-modally, so removing the element closes it.
- The element tracks whether it has opened the dialog modally, so a close it caused itself, one
  queued before a later open, or one from a dialog a switch has since replaced is never reported.
- The media query's `change` event lags a resize by a frame, while its `matches` is current, so
  `show()` reads the mode first and runs the update at once: the dialog is rendered and shown before
  `show()` returns.
- The heading takes focus as the dialog opens, by its `tabindex="-1"` and `autofocus`, because
  `autofocus` on the dialog itself does nothing in Chromium.

## Entry

- Each `wbr` in the content type is `aria-hidden`: Chrome's accessibility tree reads a `wbr` as a
  space, so the button's name would say "text/ plain".
- The time is split into its date and its clock, each in a span, only when the locale writes the
  date first and the clock last; otherwise it is the whole text, unsplit.

## Event log

- The time shows to the second, as the stage timeline's does, since a run's events arrive seconds
  apart.
- A string datum shows as it is, since text data reads as text; a bigint as its digits; and a value
  JSON can't write, a circular object or a function, as its `String()`.

## Markdown

- Each call lexes on a fresh copy of marked's defaults, so no `marked.use()` or `setOptions()`
  elsewhere on the page reaches this renderer.
- The lexer leaves named character references in text, link destinations, and titles for its own
  renderer's HTML to resolve, and text inside a raw block as written. They are resolved by the HTML
  parser in a `textarea`'s RCDATA, where no markup is parsed, of a document with no browsing
  context, which loads and runs nothing.
- A link's destination is checked by the URL parser, which reads it as an anchor's `href` would be
  read, trimming spaces and controls, dropping tabs and newlines, and folding case, so
  `JAVASCRIPT:` and `java\tscript:` are the scheme they spell. A link has no target, and
  `noreferrer`, which implies `noopener`, keeps the page's URL from a destination that text named.
- A table cell's alignment is its own style, since the elements sheet aligns cells to start, which
  an `align` attribute, a presentational hint, can't override. The table's templates hold no
  whitespace between the elements, which a table would carry as text.

## Pagination

- The page field goes back to the current page after any entry: it shows `page` until the host sets
  another.

## Search results

- Two code points match case-insensitively when they are the same, or the same in lower or upper
  case, each compared alone: the rune-by-rune simple case folding a search does, near enough to mark
  what such a search matched. Marks are found on the text as given, never on a lowered copy, so
  their offsets are the text's own even where a letter's other case is longer.
- A snippet's ellipses are joined to their text by a word joiner (U+2060), so a narrow line leaves
  no ellipsis alone.
- A `total` that is NaN, from an attribute that doesn't parse, counts as none.

## Stage timeline

- The time slot holds hidden a time as wide as any the format writes in the page's locale, a
  two-digit day and hour, so a stage that completes shows its time in space already there.
- The stages sort by position with a stable sort, so equal positions keep the given order, and each
  step is keyed by its name.

## Upload dropzone

- The drag counts the zone's boxes it is over: `dragenter` on a child comes before `dragleave` on
  the box it left, so the mark clears only when the count returns to zero.
- Every drag that carries files has its default cancelled, disabled or not, so a drop never opens
  the file in the page; disabled, the drop effect is `none`, so the pointer shows the zone refuses.
- The picker's input clears once its files go out, so choosing the same file again still sends them.
