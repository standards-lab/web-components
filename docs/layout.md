# Layout

Why each component's sheet is laid out as it is, where the rule alone doesn't say.
[components.md](components.md) documents what each component shows, and the browser tests name the
layout each one promises.

## Every sheet

- Each component adopts its sheet into its shadow root after the foundation's `baseline/reset.css`
  and `baseline/elements.css`, which give the native controls, the pre, the rendered Markdown, the
  details and summary, and the focus outline their look. The sheet is unlayered, so it sits above
  both, and it gives a native control no look of its own beyond its layout.
- A sheet reads only the foundation's baseline tokens, which a shadow root inherits from the page's
  entry. A component in progress takes `--accent-color`, the foundation's hook for what is current
  or in progress, falling back to `--magenta`; an interaction takes `--interaction-color`, falling
  back to `--blue`.
- A component that draws one frame around content that scrolls (the artifact viewer, the event log,
  the chat thread) makes it a flex child of a flex-column host with `min-block-size: 0`, so a
  consumer that constrains the host's block size, by a size on the host or a sized flex or grid
  parent, holds it there and the content scrolls inside the one frame; unconstrained, it is as tall
  as its content.
- A frame or region that sizes to its content in a shrink-to-fit parent is a grid of one
  `minmax(0, 1fr)` column: under a min-content constraint the track is zero, and under a
  max-content one it is the content's widest line, so the component takes its content's width up
  to the parent's and a long line scrolls rather than widen it.
- Padding sits on the scrolled content, not on the scroller, so it scrolls with the content and
  shows past the content's end at the scroll's end, as at its start.
- No scroller reserves a scrollbar gutter: overflow is `auto`, so the browser's own scrollbar, in
  the scheme's colors, shows only on an axis that overflows. The size is settled as the content
  renders, so a scrollbar never appears later over content already shown, and a gutter kept on a
  region that fits would only narrow it.
- A component that draws no frame (the search results, the document list, the stage timeline) is
  a stack of native buttons or steps that the elements sheet already borders; a frame around them
  would nest one frame in another. It is as tall as its content with no cap, and a consumer that
  wants it held scrolls its own box.
- A row whose label sits at the line's end (the artifact viewer's header, the entry's head, a
  search match's head) is a wrapping flex row: the name is `flex: 1 1 16ch` up to `max-content`, and
  the label's auto inline-start margin takes the space the name leaves, so the label leaves the
  name's line only when the two don't fit side by side, and a short name never wraps it in a parent
  sized to the content.
- A slot that must not change width as its text changes (the composer's action, the stage
  timeline's label and time) stacks every text it may show in one grid cell, the ones not shown
  `visibility: hidden`, so it is as wide as the widest.
- A visually hidden name (the composer's label, the entry's kind, the drawer's Close label) is a
  one-pixel absolute box clipped to nothing, so it takes no row and no gap.
- `field-sizing` is Baseline newly available, as the foundation's `.field-grow` notes. Without it the
  composer's field keeps one row and the native resize, and the pagination's page field keeps the
  browser's own width for a number input, wider and never clipped.

## Artifact viewer

- The header isn't rendered with `no-header`, its margin with it, so the frame starts at the host's
  top in every state.
- Every view and every state sits in the one frame, and the pre that is the region gives up its own
  border to it. Over the invalid JSON's region, a rule parts the note from the text.
- A code block or table in the Markdown keeps its whole lines, as the JSON and text views do, and
  overflows the document's padding; each carries an empty box the padding's width past its inline
  end, which the region's scroll reaches, so the padding shows after its border at the scroll's
  end.
- A native view's element sits in the frame unscrolled. The PDF's iframe scrolls its own document,
  as tall as a page shows readably, up to most of the viewport (`min(40rem, 80svh)`), and a
  constrained viewer shrinks it to the frame's share. The image is never upscaled and keeps its
  aspect; audio and video take the frame's width.

## Upload dropzone

- Dragging files over the zone turns its dashes solid at the same width, on a tint of the
  interaction color, so nothing moves.
- Each upload's rows sit apart by the focus outline's reach, the elements sheet's `--line-m` outline
  at its fixed 2px offset, and the 3xs step beyond it, so a focused cancel control's whole outline
  clears the bar and the bytes. The gap is every state's, so an upload that finishes keeps its
  height.
- A strut in the name's cell, in the controls' font and as tall as the cancel control, holds the
  first line's height whether the control is there or not.
- The name keeps one line, cut with an ellipsis; its title and the controls' names hold it whole.
- The bytes sent hold the width of the widest count, "999 bytes", in tabular digits, so the bar
  keeps its length as they climb.

## Event log

- The list's inline padding is the small step, so an id of a run's UUID and its stage's position, as
  the emulator writes one, has most of its line in a log 20rem wide beside the frame's scrollbar.
- The metadata is an inline-size container, so it takes the width the type and the time give the log
  rather than set it. Narrower than a pair of a UUID and its label, each pair's label sits over its
  value, and the larger step between pairs keeps each label grouped with its own value.
- The step between pairs is each pair's margin, not the metadata's gap, because the metadata is the
  container the query reads, and a container query styles only what is inside its container.
- A subject or an id longer than its line is cut with an ellipsis inside its own value, which
  neither scrolls nor takes focus; its whole text stays in the DOM for selection, copying, and a
  screen reader.

## Chat thread

- A user's message sits at the inline end, short of the full width, on the first elevated surface;
  the assistant's spans the list. Neither has a border: the thread's frame is the one.
- A reasoning item with nothing to expand is a paragraph whose gutter is an inline list item with the
  summaries' own disclosure marker, undrawn, so its kind lines up with theirs. The gutter is hidden
  from the accessibility tree, so no marker is read for a disclosure that isn't one.
- A line's parts are inline blocks: the accessible name Chromium computes for a summary drops the
  spaces between inline parts that Lit renders around its markers, but keeps a space at an inline
  block's edge, so the name reads the parts a word apart.
- A function's name and a call's id, a `call_` id of 37 characters as a rule, move to the next line
  whole and break anywhere only when longer than the line, so a narrow thread shows them whole
  inside its frame. Inline code in a reply keeps whole the same way rather than break at a hyphen.
- A refusal's rule is in the warning hue, so it reads apart from the answer and from a quotation's
  neutral rule.
- A streaming status's dot pulses unless motion is reduced.

## Drawer

- `--drawer-from` is the edge the drawer hides past, by the writing direction.
- The label takes the step the foundation gives an `h4`, `--text-l`: the heading of a contained
  surface, one above the body text and the entries' names it heads and two below a page's section
  `h2`, so it never competes with the page's `h1` or `h2`.
- The drawer's heading takes focus as the dialog opens but is no control, so it draws no focus
  outline, not even the elements sheet's `:focus-visible` one.
- The body scrolls in its padding box with a scroll padding of its padding, so a control that focus
  scrolls into view stops short of the clip edge and its focus outline stays whole.
- The slide is a translate, which moves nothing else, and the dialog stays rendered in the top layer
  until the slide out ends. A mode switch creates or removes a closed dialog, so it never slides.

## Stage timeline

- Each step is a grid of the marker's column and the text's, its rows the name, the detail line, a
  failed stage's reason, and a gap; the connector spans the last three in the marker's column, so it
  runs past a failed step's reason. The last step has no connector and no gap.
- A pending stage's name recedes by color alone, so it keeps its width.
- The active marker's ring is painted, never laid out, so it moves nothing; under reduced motion the
  tinted marker alone reads as in progress.
- A failed stage's reason contains its inline size, so it wraps to the column the names and detail
  lines set and never widens the timeline. Its muted color leaves the failure's hue to the label.

## Entry

- The layout is intrinsic, with no container query, so the entry sizes to its content in any parent,
  a shrink-to-fit one too. Its supported minimum width is 16rem; below it the status and the whole
  clock may run past a narrower column.
- Selected, the border takes the accent color and an inset shadow a line wide doubles its weight, so
  the mark is a heavier frame, not a hue alone, and moves nothing. While focus is visible, the focus
  ring is the one mark: the frame gives way to the normal border and returns when focus leaves.
- The name's `16ch` basis is a little more than "brand-guide.pdf".
- The content type breaks at the `wbr` the module puts after each slash, dot, hyphen, and plus, with
  `overflow-wrap: break-word` rather than `anywhere`, so its min-content width is its longest part
  and a shrinking meta wraps it at its punctuation rather than letter by letter.
- The size and the clock never break; the date breaks at its own spaces, so a narrow entry wraps the
  time after its date and keeps it inside its box.

## Document list

- The status line and the list are the list's own, slotted into the pagination, so this sheet
  styles them; the entries and the pagination style themselves.
- In the pagination's status slot, the status runs on after the summary's text, inheriting its type
  and color. Its label opens with a middle dot the content's empty alternative keeps from being
  read, and keeps whole, so a narrow line wraps the label, dot and all.
- As a line of its own, the status is a line tall even when blank, so its text, coming or going,
  moves nothing below it.

## Composer

- The field and the control are siblings in a row, each its own native frame, never one inside
  another; the control sits at the row's block end, beside the field's last line.
- The field's bound is eight lines inside its padding and border; past it the field scrolls.
- The elements sheet styles a disabled button but not a disabled field, so the composer gives its
  disabled field the first elevated surface, a divider's border, and text a tier quieter, still
  apart from the placeholder's `--fg-3`.

## Pagination

- The page size label and the page count never break; a narrow pagination wraps its groups instead.
- The page field is `content-box`, so the elements sheet's padding and border add to its `3ch`
  minimum rather than come out of it: up to page 999 it keeps one width, and past it the field grows
  with the page rather than clip it.
