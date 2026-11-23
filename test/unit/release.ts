// A release's shape: a pack of the build checked against the sources, package.json's files and
// exports as Node resolves them, the Apache 2.0 LICENSE its manifest declares, and its dependencies.
// See docs/release.md

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

/** Every file below `dir`, relative to it with / separators, sorted. */
export function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((path) => statSync(join(dir, path)).isFile())
    .map((path) => path.split(sep).join("/"))
    .sort();
}

function star(pattern: string): { prefix: string; suffix: string } | undefined {
  const at = pattern.indexOf("*");
  return at < 0 ? undefined : { prefix: pattern.slice(0, at), suffix: pattern.slice(at + 1) };
}

const conditionSets = [[], ["--conditions=types"]];
const resolveArgs = `console.log(JSON.stringify(process.argv.slice(1).map((specifier) => {
  try { return import.meta.resolve(specifier); } catch { return null; }
})));`;

function resolveSubpaths(
  root: string,
  name: string,
  subpaths: string[],
): Record<string, Set<string>> {
  const specifiers = subpaths.map((subpath) => name + subpath.slice(1));
  const resolved = Object.fromEntries(subpaths.map((subpath) => [subpath, new Set<string>()]));
  for (const conditions of conditionSets) {
    const args = [...conditions, "--input-type=module", "-e", resolveArgs, ...specifiers];
    const urls: (string | null)[] = JSON.parse(
      execFileSync(process.execPath, args, { cwd: root, encoding: "utf8" }),
    );
    urls.forEach((url, i) => {
      if (url === null) return;
      resolved[subpaths[i]].add(relative(root, fileURLToPath(url)).split(sep).join("/"));
    });
  }
  return resolved;
}

/** The dist/ paths a source in src/ ships as. */
export function builtFrom(source: string): string[] {
  if (source.endsWith(".d.ts") || source.endsWith(".css")) return [`dist/${source}`];
  if (source.endsWith(".ts")) {
    const base = source.slice(0, -".ts".length);
    return [`dist/${base}.js`, `dist/${base}.d.ts`];
  }
  return [];
}

interface Manifest {
  name: string;
  license?: string;
  files?: string[];
  exports?: Record<string, string | Record<string, unknown> | null>;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function readManifest(root: string): Manifest {
  return JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
}

const always = ["LICENSE", "README.md", "package.json"];

const license = "Apache-2.0";
const licenseHeading = /^\s*Apache License\s+Version 2\.0, January 2004\s/;

/** What keeps root, a pack's package/, from carrying the license its package.json declares. */
export function licenseProblems(root: string): string[] {
  const problems: string[] = [];
  const manifest = readManifest(root);
  if (manifest.license !== license) {
    problems.push(`package.json declares license ${manifest.license}, not ${license}`);
  }
  const path = join(root, "LICENSE");
  if (!existsSync(path)) problems.push("LICENSE is missing");
  else if (!licenseHeading.test(readFileSync(path, "utf8"))) {
    problems.push("LICENSE isn't the Apache License 2.0");
  }
  return problems;
}

const peerRepositories: Record<string, string> = {
  "@standards-lab/web-foundation": "standards-lab/web-foundation",
  "@standards-lab/web-icons": "standards-lab/web-icons",
};

const exactVersion = /^\d+\.\d+\.\d+$/;
const dependencies = { lit: exactVersion, marked: exactVersion };
const caretRange = /^\^\d+\.\d+\.\d+$/;
const releaseTag = (repository: string) =>
  new RegExp(`^github:${repository}#(v\\d+\\.\\d+\\.\\d+)$`);

/** Whether the caret range, ^x.y.z, admits the version, x.y.z or its tag vx.y.z, as npm reads it. */
export function caretAdmits(range: string, version: string): boolean {
  const [major, minor, patch] = range.slice(1).split(".").map(Number);
  const [vMajor, vMinor, vPatch] = version.replace(/^v/, "").split(".").map(Number);
  const atLeast =
    vMajor > major ||
    (vMajor === major && (vMinor > minor || (vMinor === minor && vPatch >= patch)));
  if (!atLeast) return false;
  if (major > 0) return vMajor === major;
  if (minor > 0) return vMajor === 0 && vMinor === minor;
  return vMajor === 0 && vMinor === 0 && vPatch === patch;
}

/** What keeps root, a pack's package/, from declaring exactly the dependencies a release needs. */
export function dependencyProblems(root: string): string[] {
  const problems: string[] = [];
  const manifest = readManifest(root);
  const declared = manifest.dependencies ?? {};
  const peers = manifest.peerDependencies ?? {};
  const dev = manifest.devDependencies ?? {};
  for (const [name, pin] of Object.entries(dependencies)) {
    if (!(name in declared)) problems.push(`package.json doesn't declare ${name}`);
    else if (!pin.test(declared[name])) {
      problems.push(`package.json declares ${name} ${declared[name]}, not an exact pin`);
    }
  }
  for (const name of Object.keys(declared)) {
    if (name in peerRepositories) {
      problems.push(`package.json declares ${name} in dependencies, not as a peer`);
    } else if (!(name in dependencies)) {
      problems.push(`package.json declares ${name}, which no release needs`);
    }
  }
  for (const name of Object.keys(peers)) {
    if (!(name in peerRepositories))
      problems.push(`package.json declares peer ${name}, which no release needs`);
  }
  for (const [peer, repository] of Object.entries(peerRepositories)) {
    problems.push(...peerProblems(peer, repository, peers, dev));
  }
  return problems;
}

function peerProblems(
  peer: string,
  repository: string,
  peers: Record<string, string>,
  dev: Record<string, string>,
): string[] {
  const problems: string[] = [];
  const range = caretRange.test(peers[peer]) ? peers[peer] : undefined;
  if (!(peer in peers)) problems.push(`package.json doesn't declare peer ${peer}`);
  else if (!range) {
    problems.push(`package.json declares peer ${peer} ${peers[peer]}, not a caret range`);
  }
  const tag = dev[peer]?.match(releaseTag(repository));
  if (!(peer in dev)) problems.push(`package.json doesn't declare devDependency ${peer}`);
  else if (!tag) {
    problems.push(
      `package.json declares devDependency ${peer} ${dev[peer]}, not an exact release tag`,
    );
  }
  if (range && tag && !caretAdmits(range, tag[1])) {
    problems.push(
      `package.json's devDependency ${peer} ${dev[peer]} is outside its peer range ${peers[peer]}`,
    );
  }
  return problems;
}

/** What keeps root, a pack's package/, from being the release its package.json declares for `src`. */
export function releaseProblems(root: string, src: string): string[] {
  const manifest = readManifest(root);
  const packed = listFiles(root);
  const built = packed.filter((path) => path.startsWith("dist/"));
  return [
    ...licenseProblems(root),
    ...dependencyProblems(root),
    ...packedProblems(packed),
    ...buildProblems(src, built),
    ...filesProblems(manifest.files ?? [], built),
    ...exportsProblems(root, manifest, built),
  ];
}

function packedProblems(packed: string[]): string[] {
  const problems: string[] = [];
  if (!packed.includes("README.md")) problems.push("the pack has no README.md");
  for (const path of packed) {
    if (!path.startsWith("dist/") && !always.includes(path)) {
      problems.push(`${path} is packed but isn't the build, ${always.join(", ")}`);
    }
  }
  return problems;
}

function buildProblems(src: string, built: string[]): string[] {
  const problems: string[] = [];
  const builtSet = new Set(built);
  const expected = new Set<string>();
  for (const source of listFiles(src)) {
    const outputs = builtFrom(source);
    if (outputs.length === 0) problems.push(`src/${source} isn't a .ts, .d.ts, or .css source`);
    for (const output of outputs) {
      expected.add(output);
      if (!builtSet.has(output)) problems.push(`src/${source} has no built ${output}`);
    }
  }
  for (const path of built) {
    if (!expected.has(path)) problems.push(`${path} is built from no source`);
  }
  return problems;
}

function filesProblems(files: string[], built: string[]): string[] {
  const shipped = (path: string) =>
    files.some(
      (entry) =>
        path === entry.replace(/\/$/, "") || path.startsWith(`${entry.replace(/\/$/, "")}/`),
    );
  return built
    .filter((path) => !shipped(path))
    .map((path) => `${path} isn't under package.json's files`);
}

function exportsProblems(root: string, manifest: Manifest, built: string[]): string[] {
  const problems: string[] = [];
  const { exports = {} } = manifest;
  const builtSet = new Set(built);
  const subpaths = new Set<string>();
  const origins: { key: string; subpath: string; path: string }[] = [];
  for (const [key, entry] of Object.entries(exports)) {
    if (entry === null) continue;
    const targets: unknown[] = typeof entry === "string" ? [entry] : Object.values(entry);
    if (
      targets.length === 0 ||
      !targets.every((target): target is string => typeof target === "string")
    ) {
      problems.push(`exports["${key}"] isn't a target or a flat object of condition targets`);
      continue;
    }
    const keyParts = star(key);
    if (keyParts === undefined) subpaths.add(key);
    for (const target of targets) {
      const parts = star(target);
      for (const path of built) {
        const file = `./${path}`;
        let subpath: string | undefined;
        if (parts === undefined) {
          if (target === file && keyParts === undefined) subpath = key;
        } else if (
          keyParts !== undefined &&
          file.length >= parts.prefix.length + parts.suffix.length &&
          file.startsWith(parts.prefix) &&
          file.endsWith(parts.suffix)
        ) {
          subpath = key.replace(
            "*",
            file.slice(parts.prefix.length, file.length - parts.suffix.length),
          );
        }
        if (subpath === undefined) continue;
        subpaths.add(subpath);
        origins.push({ key, subpath, path });
      }
    }
  }
  const resolved = resolveSubpaths(root, manifest.name, [...subpaths]);
  const reached = origins.filter(({ subpath, path }) => resolved[subpath].has(path));
  for (const path of built) {
    if (!reached.some((origin) => origin.path === path)) {
      problems.push(`${path} is reachable through no export`);
    }
  }
  for (const key of Object.keys(exports)) {
    if (key.includes("*") && !reached.some((origin) => origin.key === key)) {
      problems.push(`exports["${key}"] reaches no built file`);
    }
  }
  for (const [subpath, paths] of Object.entries(resolved)) {
    for (const path of paths) {
      if (!builtSet.has(path)) {
        problems.push(`exports["${subpath}"] resolves to ./${path}, which isn't built`);
      }
    }
  }
  return problems;
}
