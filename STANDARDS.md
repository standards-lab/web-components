# web-components standards

The judgement calls the standards-reviewer applies to web-components, beyond what `mise run check`
enforces: each one line, with a pointer to the architecture page that applies where one does. What
the check enforces is never restated here. web-components is a Web Elemental member
(`architecture/standards/web-elemental/README.md`).

The architecture pages that apply, in the architecture repository:

- `architecture/principles/minimal-footprint.md`: lit and marked the only runtime dependencies,
  and each devDependency deliberate; a consumer installs the tag with no build step.
- `architecture/principles/rolling-currency.md`: every tool, package, and action pin explicit and
  at its latest.
- `architecture/principles/independent-releases.md`: the package releases on its own tags.
- `architecture/principles/downward-dependencies.md`: the components sit on the foundation and
  import nothing above them.
- `architecture/principles/validation-first.md`: a component checks what it is given, a content
  type, a JSON text, a URL in Markdown, before it renders it.
- `architecture/principles/comments.md`: the five kinds of comment.

## Design

- spike-html-design v0.7.0 is the visual baseline: native elements keep its styling, and every
  profile renders as it does there, its color profiles as the pinned web-foundation release's
  themes give them.
- A component is finished in every state it can show (empty, loading, streaming, error, long
  content, narrow width) and in every profile, light and dark, regular and compact.
- Focus is always visible, and nothing shifts layout as data arrives. Motion is brief, or a quiet
  loop that signals ongoing work and ends with it; all of it honours reduced motion.
- A component sizes to its content in any parent, a shrink-to-fit one too: no container query or
  containment on the host, and none that sets the component's width. An inner element may query
  the width the component already has.
- A value, such as a size or a clock, never breaks inside itself; a narrow line breaks between
  values.
- Density, alignment, and spacing come from the foundation's tokens, never a literal.
- A visual change's session brief carries its screenshots per state and profile; the architect's
  acceptance is the design review, and a passing check alone doesn't ship one.

## Package

- The package is `@standards-lab/web-components`, the components layer of the web client stack,
  built on `@standards-lab/web-foundation` and `@standards-lab/web-icons`, its two peers.
- lit and marked are each pinned exactly, and only the Markdown module imports marked
  (`test/unit/marked.test.ts` enforces it).
- Its releases, `dist/`, how it resolves the layers below, and its pins follow
  `architecture/standards/web-elemental/principles/packages-and-releases.md`.

## Layers

- A component takes its data as its own properties, emits events, and imports no SDK or domain
  code; wiring lives in the app (`architecture/principles/downward-dependencies.md`).
- No component binds a key; only the app binds keys.

## Code

- A module header documents the public contract, what the module provides and promises, with no
  reasoning; each export carries a one-line doc comment. A sheet's CSS custom properties, classes,
  and layers are its exports, and each carries its comment.
- Sources use `.ts` relative specifiers, which tsc rewrites.
- The browser tier tests `dist/`, and no server transforms what it serves.
- Tests are TypeScript run under Node's type stripping, erasable syntax only, type-checked by
  `tsconfig.test.json`; browser-served fixtures stay `.js`.
- A mise task runs one script or one command, and `check` is a depends list.
