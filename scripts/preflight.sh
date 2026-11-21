#!/usr/bin/env bash
# Fails naming mise run install when a tool a task needs is missing: the node_modules tooling, the
# dependencies the build reads, lit, marked, and the foundation at its tag, and with `browser`, the
# pinned chrome-headless-shell.
# See docs/development.md
# Adapted from spike-html-apps-components (10dde51): scripts/preflight.sh, on web-foundation.
set -euo pipefail

fail() {
  echo "preflight: $1 isn't installed; run mise run install" >&2
  exit 1
}

require_node_modules() {
  local bin
  for bin in eslint prettier; do
    [[ -x node_modules/.bin/$bin ]] || fail "$bin (devDependencies)"
  done
  [[ -f node_modules/lit/package.json ]] || fail "lit (dependencies)"
  [[ -f node_modules/marked/package.json ]] || fail "marked (dependencies)"
  [[ -f node_modules/@standards-lab/web-foundation/package.json ]] ||
    fail "@standards-lab/web-foundation (devDependencies)"
}

require_browser_at_pin() {
  local shell pin version
  shell=$(mise which chrome-headless-shell 2>/dev/null) || fail "chrome-headless-shell"
  pin=$(mise current http:chrome-headless-shell) || return
  version=$("$shell" --version) || return
  if [[ $version != *" $pin" ]]; then
    echo "preflight: $shell isn't chrome-headless-shell $pin; give the pin its own sha256" >&2
    exit 1
  fi
}

require_node_modules
[[ "${1:-}" == browser ]] || exit 0
require_browser_at_pin
