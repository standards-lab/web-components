<!-- Adapted from spike-html-apps-components (10dde51): STANDARDS.md, for
@standards-lab/web-components and its hand-cut releases. -->

# web-components standards

The judgement calls the standards-reviewer applies to web-components, beyond what `mise run check`
enforces: each one line, with a pointer to the architecture page that applies where one does. What
the check enforces is never restated here. The `standard` task points them at the Web Elemental
standard once it is founded (`standards-lab/context/web-client.md`, "Toward Web Elemental").

The architecture pages that apply, in the architecture repository:

- `architecture/principles/minimal-footprint.md`: lit and marked the only runtime dependencies,
  and each devDependency deliberate; a consumer installs the tag with no build step.
- `architecture/principles/rolling-currency.md`: every tool, package, and action pin explicit and
  at its latest, and the foundation's peer range admitting its latest release.
- `architecture/principles/independent-releases.md`: the package releases on its own tags.
- `architecture/principles/downward-dependencies.md`: the components sit on the foundation and
  import nothing above them.
- `architecture/principles/validation-first.md`: a component checks what it is given, a content
  type, a JSON text, a URL in Markdown, before it renders it.

## Design

- spike-html-design v0.7.0 is the visual baseline: native elements keep its styling, and every
  profile renders as it does there, its color profiles as web-foundation v0.3.0's themes give them.
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
  built on `@standards-lab/web-foundation`, its one peer.
- lit and marked are each pinned exactly, and only the Markdown module imports marked
  (`test/unit/marked.test.ts` enforces it).
- `dist/` lives only in a release tag's tree, the pack, never on a branch.
- Releases are plain `vX.Y.Z` annotated tags on a pack commit whose one parent is main's merge
  commit, cut by hand on a green check from `package.json`'s version, each with its `CHANGELOG.md`
  section, and never changed or re-cut; the release workflow, dispatched by hand with the pushed
  tag and never on a push, only verifies and publishes it (`standards-lab/context/web-client.md`,
  "Packaging and release").

## Layers

- A component takes its data as its own properties, emits events, and imports no SDK or domain
  code; wiring lives in the app (`architecture/principles/downward-dependencies.md`).
- No component binds a key; only the app binds keys.
- A layer resolves the layer below only through its release tag, as a consumer does: never a
  link, path alias, source condition, or project reference
  (`architecture/principles/independent-releases.md`).

## Code

- Code meets the bar of spike-html-conventions' `layers/` code at a88828a: a header of about 2–6
  lines, a one-line doc comment per export, and comments only for a non-obvious why, beside the
  code it explains rather than in the header.
- A copied file names its source repository and commit in a provenance line, which reads
  `From|Adapted from <repo> (<commit>): <path>`. It names the immediate source alone; that source
  keeps the earlier lines. A JSON file, which takes no comment, has its line in
  `context/README.md`.
- Sources use `.ts` relative specifiers, which tsc rewrites.
- The browser tier tests `dist/`, and no server transforms what it serves.
- Tests are TypeScript run under Node's type stripping, erasable syntax only, type-checked by
  `tsconfig.test.json`; browser-served fixtures stay `.js`.
- A mise task runs one script or one command, and `check` is a depends list.
