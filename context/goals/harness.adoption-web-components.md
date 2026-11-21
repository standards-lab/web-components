# goal · harness.adoption-web-components

- **State:** building
- **Task:** adopt
- **Branch:** adopt

## Tasks

1. [ ] adopt

## Task brief · adopt

**Problem**

web-components predates marathon 0.22.0: its check runs neither lint, lint-context fails (README
2,969 of 1,500 words, an unmarked capability map), about 1,650 comment lines fall outside the five
kinds, its pointers name the retired roadmap file, and ESLint suppressions need no reason.

**Behaviors**
1. The tools pin marathon 0.22.0 under a `See` header; `mise run install` puts both lints on PATH.
2. The check runs both lints beside its linters and fails when either fails; a lint missing from
   PATH fails, naming `mise run install`; the check's and lint task's descriptions name both
   lints; currency's says it reads the network.
3. lint-context passes: the README is within 1,500 words and keeps its overview; the per-element
   reference and the release procedure move unchanged to docs/ pages linked by absolute `main`
   URLs; the capability map's four entries are `(built)`, each linking its documentation.
4. CLAUDE.md and the context README point at `standards-lab/roadmap/index.toml`.
5. Every comment in TypeScript, JavaScript, CSS, demo HTML, tests, scripts, and every
   configuration file is one of the five kinds. Module headers document the public contract;
   comments on public custom properties, classes, and layers stay; JSDoc on exports stays; JSDoc on
   non-exported symbols, in-body comments, and test comments go. Provenance is one line per
   source. Configuration headers are a short description plus `See` lines. Removed reasoning moves
   to names, exported docs, or docs/. lint-references passes.
6. Every ESLint directive needs a description (eslint-comments `require-description`);
   `ban-ts-comment` is allow-with-description explicitly. The new devDependency changes no
   consumer requirement, so no CHANGELOG line.
7. STANDARDS' comment rule names comments.md for every file kind in behavior 5.
8. web-foundation stays at v0.3.0 by a recorded hold; currency reports only that hold.
9. The check's tests pass unchanged, and CI passes.

**Test seams**
- `mise run check`, the lints included; `mise run currency`.

**Slices**
1. Context: README detail to docs/, the capability map, the roadmap pointers.
2. Suppressions and the rule: ESLint rules, the devDependency, STANDARDS.
3. Comments in src, TypeScript and CSS.
4. Comments in tests and demo pages.
5. Comments in scripts and configuration other than mise.toml.
6. Pin and check: the pin, the lint task and its script, mise.toml's comments, descriptions.

**Out of scope**

web-foundation v0.4.0 and its hook renames (components-settings); v1.client.stack's tasks;
releases; new screenshots; coordinator edits (pending).

**Door**

Two-way: no tag.

## Progress

slices 0/6 committed · standards — · spec — · editor —

## Decisions

- adopt: held @standards-lab/web-foundation at v0.3.0: v0.4.0 renames `--accent-color` and
  `--interaction-color` and changes adopted element rules; v1.client.stack's components-settings
  takes it with its design review. (C1)

## Pending edits

- coordinator · roadmap/v1.client.stack.toml, `components-settings` summary: it takes web-foundation
  v0.4.0's hook renames in web-components (`--accent-color` → `--color-accent`,
  `--interaction-color` → `--color-primary`) and ends this adoption's v0.3.0 hold.
