<!-- Adapted from web-foundation (ceaab61): README.md, its Release section. -->

# Release

A release is an annotated `v<version>` tag on a pack commit: a commit, on no branch, whose tree is
the pack, the build included, and whose one parent is main's merge commit. The version is the one
`package.json` gives and `CHANGELOG.md` has a section for. A person cuts the tag by hand once the
check is green on the merge commit, from a clean checkout with the pins installed:

```
git fetch origin && git switch --detach origin/main
mise run check
tag=v$(node -p 'require("./package.json").version')
scratch=$(mktemp -d)
pnpm pack --pack-destination "$scratch"
tar -xzf "$scratch"/*.tgz -C "$scratch"
# The pack's package/ as a tree, through an index of its own, so the checkout's index and
# .gitignore (which ignores dist/) play no part; --force keeps any other ignore rule from
# dropping a file.
GIT_INDEX_FILE="$scratch/index" git --work-tree="$scratch/package" add --all --force .
tree=$(GIT_INDEX_FILE="$scratch/index" git write-tree)
commit=$(git commit-tree "$tree" -p HEAD -m "web-components $tag")
git tag -a "$tag" -m "web-components $tag" "$commit"
git push origin "refs/tags/$tag"
gh workflow run release.yml -f tag="$tag"
```

The release workflow is dispatched by hand with the tag, not run by the push: GitHub reads a tag
push's workflows from the tagged tree, and the pack commit's tree holds only the pack, so the
workflow runs from main's copy. It checks that the tag's commit has one parent, a merge commit on
main, whose `package.json` version the tag names; runs the check on that parent; packs it and holds
the tag's tree to the pack, file for file; and creates the GitHub release from the version's
`CHANGELOG.md` section, with the tarball attached.

## Workflows

- **CI** runs the check on each pull request to main and each push to it. `mise run install` first
  installs every pin `mise.toml` names, the chrome-headless-shell the browser tier runs in
  included, and `node_modules`, the foundation and the tooling at their release tags.
- **Release** checks out every branch and tag, so the pack commit's parent and main are both at
  hand. The parent must be main's merge commit, so it has two parents of its own. The tagged tree
  must be the tarball's `package/`, file for file. The release action releases the tag its `ref`
  names, not the dispatching ref, main: it runs `gh release create` on that tag with no target, so
  the release is for the tag the workflow fetched and checked.

## Dependencies

`test/unit/release.ts` holds every release to its dependencies. lit and marked are its two
dependencies, each at one version, never a range. The foundation is a peer, by a caret range on its
versions, never a git spec: a consumer declares the foundation beside the components, from whichever
source, and one copy serves both, so a restyle of its sheets by package name reaches the components'
shadow roots. The repository's own install of it is a devDependency at one release tag on GitHub,
never a range, a branch, a commit, or a `#semver:` spec, which bun fails, and a tag the peer range
admits: the same leftmost nonzero part and no lower, so `^0.1.0` admits 0.1.x only. Which version,
range, and tag is `package.json`'s, and `mise run currency` reports each behind its latest. The
packed manifest carries no scripts, since npm prepares a git dependency that has a build script,
which the tag's tree must never need.
