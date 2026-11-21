#!/usr/bin/env bash
# Prints `<where>: <item> <pin> -> <latest>` for each mise tool, package.json dependency, GitHub
# Actions pin, and github: devDependency's tag behind its latest, and each peer range that doesn't
# admit its package's latest release, and exits 1 if any; prints nothing when all are current.
# Reads the network.
# See docs/development.md
# Adapted from spike-html-apps-components (10dde51): scripts/currency.sh, action pins only with a workflow.
set -euo pipefail
cd "$(dirname "$0")/.."

trailing=""

report() {
  trailing+=$'\n'"$1"
}

report_mise_tools() {
  local outdated lines
  outdated=$(MISE_LOG_LEVEL=error mise outdated --bump --local --json) || return
  lines=$(node -p '
    Object.entries(JSON.parse(process.argv[1]))
      .map(([tool, { requested, bump }]) => "mise.toml: " + [tool, requested, "->", bump].join(" "))
      .join("\n")
  ' "$outdated") || return
  [[ -z $lines ]] || report "$lines"
}

report_peer_range_admitting() {
  local package=$1 latest=$2 range
  range=$(node -p 'require("./package.json").peerDependencies?.[process.argv[1]] ?? ""' \
    "$package") || return
  if [[ -n $range ]] && ! node --input-type=module -e '
    import { caretAdmits } from "./test/unit/release.ts";
    process.exit(caretAdmits(...process.argv.slice(1)) ? 0 : 1);
  ' "$range" "$latest"; then
    report "package.json: peer $package $range -> ^${latest#v}"
  fi
}

report_release_tag_and_peer() {
  local package=$1 pin=$2 spec latest
  spec=${pin#github:}
  latest=$(gh api "repos/${spec%%#*}/releases/latest" --jq .tag_name) || return
  if [[ ${spec#*#} != "$latest" ]]; then
    report "package.json: $package ${spec#*#} -> $latest"
  fi
  report_peer_range_admitting "$package" "$latest"
}

typescript_eslint_accepted_typescript() {
  local typescript_eslint range accepted
  typescript_eslint=$(node -p 'require("./package.json").devDependencies["typescript-eslint"]') ||
    return
  range=$(pnpm view "typescript-eslint@$typescript_eslint" peerDependencies.typescript) || return
  accepted=$(pnpm view "typescript@$range" version --json) || return
  node -p '[].concat(JSON.parse(process.argv[1])).join("\n")' "$accepted" | sort -V | tail -n 1
}

report_packages() {
  local pins package pin latest
  pins=$(node -p '
    const { dependencies, devDependencies } = require("./package.json");
    Object.entries({ ...dependencies, ...devDependencies })
      .map(([name, pin]) => name + " " + pin)
      .join("\n")
  ') || return
  while read -r package pin; do
    if [[ $pin == github:* ]]; then
      report_release_tag_and_peer "$package" "$pin" || return
      continue
    fi
    if [[ $package == typescript ]]; then
      latest=$(typescript_eslint_accepted_typescript) || return
    else
      latest=$(pnpm view "$package" version) || return
    fi
    if [[ $pin != "$latest" ]]; then
      report "package.json: $package $pin -> $latest"
    fi
  done <<<"$pins"
}

report_actions() {
  local uses action repo latest
  compgen -G '.github/workflows/*.yml' >/dev/null || return 0
  uses=$(grep -ho 'uses: *[^ ]*@[^ ]*' .github/workflows/*.yml | sed 's/uses: *//' | sort -u) ||
    return
  while read -r action; do
    [[ -n $action ]] || continue
    repo=$(cut -d/ -f1,2 <<<"${action%@*}") || return
    latest=$(gh api "repos/$repo/releases/latest" --jq .tag_name) || return
    if [[ ${action#*@} != "$latest" ]]; then
      report ".github/workflows: ${action%@*} ${action#*@} -> $latest"
    fi
  done <<<"$uses"
}

report_mise_tools
report_packages
report_actions

if [[ -n ${trailing//$'\n'/} ]]; then
  sed '/^$/d' <<<"$trailing"
  exit 1
fi
