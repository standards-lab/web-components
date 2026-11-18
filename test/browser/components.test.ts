// The components from this repository's dist/: conventions' 27 probe cases, the restyle case, the
// adopted sheets, and the entry's formatting, on test/fixtures/components.html, on the lean entry
// and in every profile on the full entry; the marks the accent and interaction hooks color, on
// test/fixtures/components.html; each component in every profile, on
// test/fixtures/profiles.html; and the entry's and the pagination's geometry on their specimen
// pages under demo/, in every profile, the entry's in parents that size it to its content too.
// Adapted from spike-html-apps-components (10dde51): test/browser/components.test.ts, on
// @standards-lab/web-tooling and web-foundation v0.2.0's themes, its cases the controls'.

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { launch } from "@standards-lab/web-tooling/browser.js";
import type { Browser, Page } from "@standards-lab/web-tooling/browser.js";
import { serve } from "@standards-lab/web-tooling/server.js";
import type { Server } from "@standards-lab/web-tooling/server.js";

import { served } from "./support/served.ts";

/** A profile combination: the facets it sets, the rest at their defaults, and its scheme. */
interface Profile {
  color?: string;
  space?: string;
  type?: string;
  scheme: string;
}

/** A run of the components page's cases: its name, its page's query, and the root's dataset. */
interface Run {
  name: string;
  query: string;
  dataset: Record<string, string>;
}

/** A specimen measure's result in one profile, which it names by its facets as JSON. */
type Measured<T> = T & { profile: string };

/** A fits measure: each component in the fit section. */
interface Fits<T> {
  fits: T[];
}

/** A line's text and the number of lines it renders on. */
type Lines = [string, number];

describe("components", { timeout: 60_000 }, () => {
  let server: Server;
  let browser: Browser;
  before(async () => {
    server = await serve(served);
    browser = await launch();
  });
  after(async () => {
    await browser?.close();
    await server?.stop();
  });

  // The profiles the foundation's full entry carries: each color at the other facets' defaults,
  // then compact and sans each at the rest's, and each of those light and dark.
  const schemes = ["light", "dark"];
  const colors = ["github", "zenwritten", "everforest", "catppuccin"];

  // The components the package defines, each its element's tag.
  const tags = ["sl-drawer", "sl-pagination", "sl-entry", "sl-status-badge"];
  const profiles: Profile[] = [
    ...colors.map((color) => ({ color })),
    { space: "compact" },
    { type: "sans" },
  ].flatMap((profile) => schemes.map((scheme) => ({ ...profile, scheme })));

  // Each case on the components page runs once on the lean entry, page.css, with no profile set,
  // and once in each profile combination on the full entry, page-full.css with register-full.js.
  const defaults = { color: "github", space: "regular", type: "mono" };
  const runs: Run[] = [
    { name: "on the lean page.css", query: "", dataset: {} },
    ...profiles.map((profile) => {
      const { color, space, type, scheme } = { ...defaults, ...profile };
      const query = new URLSearchParams({ entry: "full", palette: color, space, type, scheme });
      const dataset = { palette: color, space, type, scheme };
      return { name: `in ${color} ${space} ${type} ${scheme}`, query: String(query), dataset };
    }),
  ];

  /**
   * Opens the components page in a run's entry and profile, with the query's module when one is
   * given, resolving to the page once its run settles, its entry's sheet linked and its profile
   * set on the root.
   */
  async function open(run: Run, module?: string): Promise<Page> {
    const query = new URLSearchParams(run.query);
    if (module !== undefined) query.set("module", module);
    const page = await browser.open(`${server.origin}/test/fixtures/components.html?${query}`);
    try {
      const { sheets, dataset }: { sheets: (string | null)[]; dataset: Record<string, string> } =
        await page.evaluate(
          `window.verdict.then(() => ({
        sheets: [...document.styleSheets].map((sheet) => sheet.href?.split("/").at(-1)),
        dataset: { ...document.documentElement.dataset },
      }))`,
        );
      const entry = run.query === "" ? "page.css" : "page-full.css";
      assert.deepEqual({ sheets, dataset }, { sheets: [entry], dataset: run.dataset }, run.name);
    } catch (error) {
      await page.close();
      throw error;
    }
    return page;
  }

  /** Runs one case module on the components page, resolving to its verdict and report. */
  async function verdictOf(run: Run, module: string): Promise<{ verdict: string; report: string }> {
    const page = await open(run, module);
    try {
      return await page.evaluate(`window.verdict.then(() => ({
        verdict: document.getElementById("verdict").textContent,
        report: document.getElementById("report").textContent,
      }))`);
    } finally {
      await page.close();
    }
  }

  for (const run of runs) {
    test(`all 27 of conventions' probe cases hold, ${run.name}`, async () => {
      const { verdict, report } = await verdictOf(run, "probe");
      assert.equal(verdict, "ok: all 27 cases hold", report);
    });

    test(`one edit to the elements sheet repaints the buttons in both shadow roots, ${run.name}`, async () => {
      const { verdict } = await verdictOf(run, "restyle");
      assert.match(verdict, /^ok: /, verdict);
    });

    test(`each component adopts the foundation's reset and elements sheets, then its own, ${run.name}`, async () => {
      const page = await open(run);
      try {
        const { adopted, label }: { adopted: Record<string, string[]>; label: string } =
          await page.evaluate(`(async () => {
        // A CSS module script is one sheet per URL: the foundation's by the page's import map, the
        // URL its bare specifier in dist/ resolves to, and each component's own beside its module.
        const sheet = async (specifier) =>
          (await import(specifier, { with: { type: "css" } })).default;
        const foundation = "@standards-lab/web-foundation";
        const reset = await sheet(foundation + "/baseline/reset.css");
        const elements = await sheet(foundation + "/baseline/elements.css");
        const components = [
          ["sl-drawer", "drawer", "drawer.css"],
          ["sl-pagination", "pagination", "pagination.css"],
          ["sl-entry", "entry", "entry.css"],
          ["sl-status-badge", "status-badge", "status-badge.css"],
        ];
        const adopted = {};
        for (const [tag, module, own] of components) {
          await import("/dist/" + module + ".js");
          const ownSheet = await sheet("/dist/" + own);
          const element = document.body.appendChild(document.createElement(tag));
          await element.updateComplete;
          adopted[tag] = element.shadowRoot.adoptedStyleSheets.map((s) =>
            s === reset ? "reset" : s === elements ? "elements" : s === ownSheet ? "own" : "other");
        }
        const badge = document.querySelector("sl-status-badge");
        badge.label = "Draft";
        await badge.updateComplete;
        return { adopted, label: badge.shadowRoot.querySelector("button").textContent };
      })()`);
        for (const tag of tags) {
          assert.deepEqual(adopted[tag], ["reset", "elements", "own"], tag);
        }
        assert.equal(label, "Draft");
      } finally {
        await page.close();
      }
    });

    test(`the entry shows a file's size and modified time in the page's locale and time zone, ${run.name}`, async () => {
      // The browser runs in en-US at UTC, as the tooling's launch() starts it.
      const page = await open(run);
      try {
        const shown: { size: string; time: string } = await page.evaluate(`(async () => {
        await import("/dist/entry.js");
        const entry = document.createElement("sl-entry");
        entry.item = {
          id: "f-1536",
          name: "sketch.txt",
          status: "available",
          size: 1536,
          content_type: "text/plain",
          updated_at: "2026-10-12T16:41:07Z",
        };
        document.querySelector("main").append(entry);
        await entry.updateComplete;
        const root = entry.shadowRoot;
        return {
          size: root.querySelector(".size").textContent,
          time: root.querySelector("time").textContent,
        };
      })()`);
        assert.deepEqual(shown, { size: "1.5 kB", time: "Oct 12, 2026, 4:41 PM" });
      } finally {
        await page.close();
      }
    });
  }

  test("the entry's meta line shows no kind word, its button's name keeps it and the content type whole, and open sends the id and kind", async () => {
    // A file's entry and a directory's on the lean page: the file's meta line is its size,
    // content type, and time, the directory's its time alone, neither with "file" or "directory"
    // in it; each button's accessible name, as the browser computes it, still says which it is,
    // from the kind kept visually hidden, and says a file's content type whole, with no space
    // where the type shows a break opportunity, a short type and the long openxml one alike; and
    // activating each sends open with its id and kind.
    const openxml = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const page = await open(runs[0]);
    try {
      /** One entry as it shows: its meta line's parts and text, and the open details it sent. */
      interface Shown {
        parts: string[];
        meta: string;
        opened: unknown[];
      }
      const shown: { file: Shown; directory: Shown; long: Shown } =
        await page.evaluate(`(async () => {
        await import("/dist/entry.js");
        const make = async (item) => {
          const entry = document.createElement("sl-entry");
          entry.item = item;
          document.querySelector("main").append(entry);
          await entry.updateComplete;
          const opened = [];
          entry.addEventListener("open", (event) => opened.push(event.detail));
          const root = entry.shadowRoot;
          root.querySelector("button").click();
          const meta = root.querySelector(".meta");
          return {
            parts: [...meta.children].map((part) => part.className || part.localName),
            meta: meta.textContent.replace(/\\s+/g, " ").trim(),
            opened,
          };
        };
        const updated_at = "2026-10-12T16:41:07Z";
        return {
          file: await make({ id: "f-1", name: "sketch.txt", status: "available", size: 1536,
            content_type: "text/plain", updated_at }),
          directory: await make({ id: "d-1", name: "designs", status: "active", updated_at }),
          long: await make({ id: "f-2", name: "brief.docx", status: "available", size: 1536,
            content_type: "${openxml}", updated_at }),
        };
      })()`);
      for (const [kind, { meta }] of Object.entries(shown)) {
        assert.doesNotMatch(meta, /\b(file|directory)\b/, `the ${kind}'s meta line: "${meta}"`);
      }
      assert.deepEqual(shown.file.parts, ["size", "type", "time"], "the file's meta parts");
      assert.equal(shown.file.meta, "1.5 kB text/plain Oct 12, 2026, 4:41 PM");
      assert.equal(shown.long.meta, `1.5 kB ${openxml} Oct 12, 2026, 4:41 PM`);
      assert.deepEqual(shown.directory.parts, ["time"], "the directory's meta parts");
      assert.equal(shown.directory.meta, "Oct 12, 2026, 4:41 PM");
      assert.deepEqual(shown.file.opened, [{ id: "f-1", kind: "file" }]);
      assert.deepEqual(shown.directory.opened, [{ id: "d-1", kind: "directory" }]);
      const { nodes }: { nodes: { role?: { value: string }; name?: { value: string } }[] } =
        await page.cdp("Accessibility.getFullAXTree", {});
      // Each name whole: the kind after the status, and the content type with no space where
      // its meta line offers a break.
      const names = nodes
        .filter((node) => node.role?.value === "button")
        .map((node) => node.name?.value ?? "")
        .filter((name) => /^(sketch\.txt|designs|brief\.docx) /.test(name));
      assert.deepEqual(names, [
        "sketch.txt available file 1.5 kB text/plain Oct 12, 2026, 4:41 PM",
        "designs active directory Oct 12, 2026, 4:41 PM",
        `brief.docx available file 1.5 kB ${openxml} Oct 12, 2026, 4:41 PM`,
      ]);
    } finally {
      await page.close();
    }
  });

  test("the entry's status takes its status tone's hue, the components' status hues, its text kept; no tone, or one it doesn't know, stays muted", async () => {
    // On the lean page, an entry per tone, then one with none and one with a tone outside the
    // vocabulary: each status's color as it resolves, against each hue resolved in the entry's
    // root, at the accent hook's fallback and then with --accent-color set on the page; each
    // entry's status-tone attribute, reflected from the property, and its status's text. One entry
    // given its tone by the attribute reads it back as the property.
    const page = await open(runs[0]);
    try {
      const read = (hook: boolean) =>
        page.evaluate(`(async () => {
        await import("/dist/entry.js");
        const main = document.querySelector("main");
        if (!main.querySelector("sl-entry")) {
          for (const tone of ["active", "complete", "incomplete", "failed", null, "danger"]) {
            const entry = document.createElement("sl-entry");
            entry.item = { id: "d-" + tone, name: "designs", status: tone === "failed" ? "failed 3/5" : String(tone),
              updated_at: "2026-10-12T16:41:07Z" };
            entry.statusTone = tone;
            main.append(entry);
          }
          const byAttribute = document.createElement("sl-entry");
          byAttribute.setAttribute("status-tone", "failed");
          byAttribute.item = { id: "d-attr", name: "designs", status: "failed", updated_at: "2026-10-12T16:41:07Z" };
          main.append(byAttribute);
        }
        ${hook ? `main.style.setProperty("--accent-color", "rgb(1, 2, 3)");` : ""}
        const entries = [...main.querySelectorAll("sl-entry")];
        await Promise.all(entries.map((entry) => entry.updateComplete));
        const root = entries[0].shadowRoot;
        const resolve = (value) => {
          const probe = root.appendChild(document.createElement("span"));
          probe.style.color = value;
          const resolved = getComputedStyle(probe).color;
          probe.remove();
          return resolved;
        };
        const hues = {
          accent: resolve("var(--accent-color, var(--magenta))"),
          green: resolve("var(--green)"),
          orange: resolve("var(--orange)"),
          red: resolve("var(--red)"),
          muted: resolve("var(--fg-2)"),
        };
        const named = (color) => Object.keys(hues).find((hue) => hues[hue] === color) ?? color;
        return {
          distinct: new Set(Object.values(hues)).size === Object.keys(hues).length,
          entries: entries.map((entry) => {
            const status = entry.shadowRoot.querySelector(".status");
            return [entry.statusTone, entry.getAttribute("status-tone"), status.textContent,
              named(getComputedStyle(status).color)];
          }),
        };
      })()`);
      for (const hook of [false, true]) {
        const where = hook ? "--accent-color set" : "at the accent hook's fallback";
        const shown: { distinct: boolean; entries: unknown[][] } = await read(hook);
        assert.ok(shown.distinct, `${where}: the hues differ`);
        assert.deepEqual(
          shown.entries,
          [
            ["active", "active", "active", "accent"],
            ["complete", "complete", "complete", "green"],
            ["incomplete", "incomplete", "incomplete", "orange"],
            ["failed", "failed", "failed 3/5", "red"],
            [null, null, "null", "muted"],
            ["danger", "danger", "danger", "muted"],
            ["failed", "failed", "failed", "red"],
          ],
          where,
        );
      }
    } finally {
      await page.close();
    }
  });

  /** A component as the profiles case renders it in one profile: the profile's every facet, the
   * component's tag and box, and its look, the color, font, and padding it shows. */
  interface Rendered {
    color: string;
    space: string;
    type: string;
    scheme: string;
    profile: string;
    tag: string;
    width: number;
    height: number;
    look: { color: string; font: string; padding: number };
  }

  test(`each component renders under each of the ${profiles.length} profile combinations`, async () => {
    const page = await browser.open(`${server.origin}/test/fixtures/profiles.html`);
    try {
      const {
        registered,
        rendered,
        errors,
      }: { registered: Record<string, string[]>; rendered: Rendered[]; errors: unknown[] } =
        await page.evaluate(`(async () => {
        const registry = await import("@standards-lab/web-foundation/registry.js");
        const { directories, files } = await import("/demo/documents.js");
        await Promise.all(["drawer", "pagination", "entry", "status-badge"].map(
          (module) => import("/dist/" + module + ".js")));
        // Each component as a host composes it: a drawer, docked at the page's width, holding one
        // button, the pagination holding one entry per item, a lone entry, and a labelled badge.
        const components = {
          "sl-drawer": () => {
            const drawer = Object.assign(document.createElement("sl-drawer"), { label: "Documents" });
            drawer.append(Object.assign(document.createElement("button"), { textContent: "notes.md" }));
            return drawer;
          },
          "sl-pagination": () => {
            const pagination = document.createElement("sl-pagination");
            Object.assign(pagination, { page: 2, size: 3, total: 8, pageSizes: [3, 6, 12] });
            for (const item of directories.items) {
              pagination.append(Object.assign(document.createElement("sl-entry"), { item }));
            }
            return pagination;
          },
          "sl-entry": () =>
            Object.assign(document.createElement("sl-entry"), { item: files.items[0] }),
          "sl-status-badge": () =>
            Object.assign(document.createElement("sl-status-badge"), { label: "Draft" }),
        };
        const defaults = ${JSON.stringify(defaults)};
        const attributes = { color: "data-palette", space: "data-space", type: "data-type", scheme: "data-scheme" };
        const root = document.documentElement;
        const rendered = [];
        for (const profile of ${JSON.stringify(profiles)}) {
          const choice = { ...defaults, ...profile };
          for (const [facet, name] of Object.entries(choice)) root.setAttribute(attributes[facet], name);
          for (const [tag, make] of Object.entries(components)) {
            const element = document.querySelector("main").appendChild(make());
            await element.updateComplete;
            const { width, height } = element.getBoundingClientRect();
            // The look the profile gives the component's first button, inside its shadow root; the
            // drawer, docked, which holds no button of its own there, its aside's color, its body's
            // padding, and its slotted button's font, the interface font, since it sets no font
            // itself.
            const drawer = tag === "sl-drawer";
            const style = getComputedStyle(element.shadowRoot.querySelector(drawer ? "aside" : "button"));
            const font = drawer ? getComputedStyle(element.querySelector("button")) : style;
            const look = {
              color: style.color + " on " + style.backgroundColor,
              font: font.fontFamily,
              padding: drawer
                ? parseFloat(getComputedStyle(element.shadowRoot.querySelector("aside > .body")).paddingInlineStart)
                : parseFloat(style.paddingInlineStart),
            };
            rendered.push({ ...choice, profile: JSON.stringify(choice), tag, width, height, look });
            element.remove();
          }
        }
        const registered = Object.fromEntries(registry.FACETS.map((f) => [f, registry.profiles(f)]));
        return { registered, rendered, errors: window.errors };
      })()`);
      // register-full.js registered every built-in profile, so each attribute names one the page
      // carries.
      assert.deepEqual(registered, {
        color: colors,
        space: ["regular", "compact"],
        type: ["mono", "sans"],
      });
      assert.equal(rendered.length, profiles.length * tags.length);
      for (const { profile, tag, width, height } of rendered) {
        assert.ok(width > 0 && height > 0, `${tag} under ${profile}: a ${width} × ${height} box`);
      }
      assert.deepEqual(errors, []);
      // Each facet reaches every shadow root: the four colors light and dark are eight looks, sans
      // sets another font than mono, and compact pads tighter than regular.
      const looks = (tag: string, where: (shown: Rendered) => boolean) =>
        rendered.filter((shown) => shown.tag === tag && where(shown)).map((shown) => shown.look);
      for (const tag of tags) {
        const colored = looks(tag, ({ space, type }) => space === "regular" && type === "mono");
        assert.equal(
          new Set(colored.map((look) => look.color)).size,
          colors.length * schemes.length,
          `${tag}: ${colored.map((look) => look.color)}`,
        );
        for (const scheme of schemes) {
          const [mono] = looks(
            tag,
            (shown) =>
              shown.scheme === scheme &&
              shown.color === defaults.color &&
              shown.type === "mono" &&
              shown.space === "regular",
          );
          const [sans] = looks(tag, (shown) => shown.scheme === scheme && shown.type === "sans");
          const [compact] = looks(
            tag,
            (shown) => shown.scheme === scheme && shown.space === "compact",
          );
          assert.notEqual(sans.font, mono.font, `${tag}, ${scheme}: sans sets the font`);
          assert.ok(
            compact.padding < mono.padding,
            `${tag}, ${scheme}: compact pads ${compact.padding}, regular ${mono.padding}`,
          );
        }
      }
    } finally {
      await page.close();
    }
  });

  /**
   * Runs the measure, the source of an in-page function of the profile, on the specimen page under
   * demo/ in each profile combination, resolving to its results in profile order. The page's
   * components render once; each profile applies by attribute on the root, as on the profiles
   * case's page, and the measure runs once the profile's fonts are ready and a frame has passed.
   * The profiles are the full entry's unless others are given.
   */
  async function measureSpecimen<T>(
    specimen: string,
    measure: string,
    over: Profile[] = profiles,
  ): Promise<Measured<T>[]> {
    const page = await browser.open(`${server.origin}/demo/${specimen}.html`);
    try {
      return await page.evaluate(`(async () => {
        const tags = ${JSON.stringify(tags)}.filter((tag) => document.querySelector(tag));
        await Promise.all(tags.map((tag) => customElements.whenDefined(tag)));
        await Promise.all([...document.querySelectorAll(tags.join(","))].map((el) => el.updateComplete));
        const defaults = ${JSON.stringify(defaults)};
        const attributes = { color: "data-palette", space: "data-space", type: "data-type", scheme: "data-scheme" };
        const root = document.documentElement;
        const measure = ${measure};
        const results = [];
        for (const profile of ${JSON.stringify(over)}) {
          const choice = { ...defaults, ...profile };
          for (const [facet, name] of Object.entries(choice)) root.setAttribute(attributes[facet], name);
          await document.fonts.ready;
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          results.push({ profile: JSON.stringify(choice), ...(await measure(choice)) });
        }
        return results;
      })()`);
    } finally {
      await page.close();
    }
  }

  // In-page helpers the measures below share, as source: the number of lines an element's text
  // renders on, and each entry with an item in a section of the specimen page.
  const LINES = `(element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const rects = [...range.getClientRects()].filter((rect) => rect.width > 0);
    return new Set(rects.map((rect) => Math.round(rect.top))).size;
  }`;
  const ENTRIES = `(section) => [...document.querySelectorAll(section + " sl-entry")]
    .filter((entry) => entry.item !== null)`;

  test("the entry's name is its primary text, its status and meta quieter, the meta line under the name, in every profile", async () => {
    // The name is set larger than the status and the meta, and every entry, a directory's or a
    // file's, at full width and at 20rem, puts its name and its meta line, which a file's size or
    // content type or a directory's time opens, at one inline start, the meta under the name: no
    // column of its own beside it.
    const results = await measureSpecimen<{
      shown: {
        name: string;
        sizes: { name: number; status: number; meta: number };
        first: string;
        starts: number[];
        under: boolean;
      }[];
    }>(
      "entry",
      `() => ({ shown: (${ENTRIES})("main").map((entry) => {
        const root = entry.shadowRoot;
        const size = (selector) => parseFloat(getComputedStyle(root.querySelector(selector)).fontSize);
        const first = root.querySelector(".meta").firstElementChild;
        const rect = (element) => element.getBoundingClientRect();
        return {
          name: entry.item.name,
          sizes: { name: size(".name"), status: size(".status"), meta: size(".meta") },
          first: first.className || first.localName,
          starts: [rect(root.querySelector(".name")).left, rect(first).left],
          under: rect(first).top >= rect(root.querySelector(".name")).bottom - 0.5,
        };
      }) })`,
    );
    for (const { profile, shown } of results) {
      assert.ok(shown.length >= 2, `${profile}: entries at full width and at 20rem`);
      const firsts = new Set(shown.map(({ first }) => first));
      assert.ok(firsts.has("time"), `${profile}: a directory's meta, opened by its time`);
      for (const { name, sizes, first, starts, under } of shown) {
        const where = `${profile}, ${name}`;
        assert.ok(
          sizes.name > sizes.status && sizes.name > sizes.meta,
          `${where}: the name ${sizes.name}px, the status ${sizes.status}px, the meta ${sizes.meta}px`,
        );
        assert.ok(
          ["size", "type", "time"].includes(first),
          `${where}: the meta opens with ${first}`,
        );
        assert.ok(
          Math.abs(starts[0] - starts[1]) <= 0.5,
          `${where}: the name and the meta start at ${starts}`,
        );
        assert.ok(under, `${where}: the meta under the name`);
      }
    }
  });

  test("at 20rem, the entry's wrapped lines, its status's and its meta's, step by its row gap, in every profile", async () => {
    // The lines of an entry's stack, top to bottom: the name's; the status's, when it wraps below
    // the name; then each line of the meta's parts. Each steps from the one above by the entry's
    // row gap, the name-to-meta step, within a pixel.
    const measure = `() => ({ wrapped: (${ENTRIES})(".narrow").flatMap((entry) => {
      const root = entry.shadowRoot;
      const rowGap = parseFloat(getComputedStyle(root.querySelector(".entry")).rowGap);
      const name = root.querySelector(".name").getBoundingClientRect();
      const status = root.querySelector(".status").getBoundingClientRect();
      const meta = root.querySelector(".meta");
      const metaTop = meta.getBoundingClientRect().top;
      // The meta's lines: its parts, top to bottom, each on the line above's unless it starts
      // below that line's bottom. Its parts sit on one baseline, the date and clock inside the
      // time, so a line's parts needn't share a top; a line spans its parts' boxes.
      const lines = [];
      for (const part of [...meta.children].map((child) => child.getBoundingClientRect())
        .sort((a, b) => a.top - b.top)) {
        const last = lines.at(-1);
        if (last && part.top < last.bottom - 0.5) {
          last.top = Math.min(last.top, part.top);
          last.bottom = Math.max(last.bottom, part.bottom);
        } else lines.push({ top: part.top, bottom: part.bottom });
      }
      if (lines.length < 2) return [];
      // The lines above the meta: the status is one of them when it wraps between the name and
      // the meta, and on the name's line it ends that line with the name.
      const onName = status.top < name.bottom - 0.5;
      const head = !onName && status.bottom <= metaTop + 0.5
        ? [name, status]
        : [{ top: name.top, bottom: onName ? Math.max(name.bottom, status.bottom) : name.bottom }];
      return [{
        name: entry.item.name,
        rowGap,
        steps: [
          ...head.slice(1).map((next, i) => next.top - head[i].bottom),
          metaTop - head.at(-1).bottom,
          ...lines.slice(1).map((line, i) => line.top - lines[i].bottom),
        ],
      }];
    }) })`;
    for (const specimen of ["entry", "pagination"]) {
      for (const { profile, wrapped } of await measureSpecimen<{
        wrapped: { name: string; rowGap: number; steps: number[] }[];
      }>(specimen, measure)) {
        assert.ok(wrapped.length > 0, `${specimen} under ${profile}: a meta row wraps at 20rem`);
        for (const { name, rowGap, steps } of wrapped) {
          for (const step of steps) {
            assert.ok(
              Math.abs(step - rowGap) <= 1,
              `${specimen} under ${profile}, ${name}: lines ${steps.join(", ")} apart, the row gap ${rowGap}`,
            );
          }
        }
      }
    }
  });

  test('at 20rem, "brand-guide.pdf" renders on one line, in every profile', async () => {
    const measure = `() => ({ lines: (${ENTRIES})(".narrow")
      .filter((entry) => entry.item.name === "brand-guide.pdf")
      .map((entry) => (${LINES})(entry.shadowRoot.querySelector(".name"))) })`;
    for (const specimen of ["entry", "pagination"]) {
      for (const { profile, lines } of await measureSpecimen<{ lines: number[] }>(
        specimen,
        measure,
      )) {
        assert.ok(lines.length > 0, `${specimen} under ${profile}: brand-guide.pdf at 20rem`);
        for (const count of lines) {
          assert.equal(count, 1, `${specimen} under ${profile}: brand-guide.pdf on ${count} lines`);
        }
      }
    }
  });

  test("at 20rem, each meta value, the size and the time's date and clock, renders on one line, in every profile", async () => {
    // A break may fall between the meta's parts, or between the time's date and its clock, never
    // inside "1.5 kB" or "4:41 PM". The content type, which has no space to break at, wraps
    // anywhere to keep inside the entry, so it isn't one of these.
    const measure = `() => ({ shown: (${ENTRIES})(".narrow").map((entry) => {
      const root = entry.shadowRoot;
      const time = root.querySelector("time");
      const values = [".size", "time > .date", "time > .clock"]
        .flatMap((selector) => [...root.querySelectorAll(selector)]);
      return {
        name: entry.item.name,
        parts: [...time.children].map((part) => part.className),
        lines: values.map((value) => [value.textContent, (${LINES})(value)]),
      };
    }) })`;
    for (const specimen of ["entry", "pagination"]) {
      for (const { profile, shown } of await measureSpecimen<{
        shown: { name: string; parts: string[]; lines: Lines[] }[];
      }>(specimen, measure)) {
        assert.ok(shown.length > 0, `${specimen} under ${profile}: an entry at 20rem`);
        for (const { name, parts, lines } of shown) {
          const where = `${specimen} under ${profile}, ${name}`;
          assert.deepEqual(parts, ["date", "clock"], `${where}: the time's parts`);
          for (const [text, count] of lines) {
            assert.equal(count, 1, `${where}: "${text}" on ${count} lines`);
          }
        }
      }
    }
  });

  test("from 20rem down to 16rem, every part of the entry keeps inside its button, its size and clock whole and its date broken only at its spaces, in mono and sans, regular and compact", async () => {
    // The narrow section restyled to each width in turn, down to 16rem, the entry's supported
    // minimum width, then put back to its own 20rem. At each,
    // every part of every entry, the name, the status, and each meta part, keeps inside
    // its button; the size and the time's clock each render on one line; and each word of the
    // date, its text between spaces, renders on one line, so the date breaks only at its spaces.
    const over = ["mono", "sans"].flatMap((type) =>
      ["regular", "compact"].flatMap((space) => schemes.map((scheme) => ({ type, space, scheme }))),
    );
    const measure = `() => {
      const section = document.querySelector(".narrow");
      const widths = ["20rem", "18rem", "16rem"].map((width) => {
        section.style.maxInlineSize = width;
        return { width, shown: (${ENTRIES})(".narrow").map((entry) => {
          const root = entry.shadowRoot;
          const button = root.querySelector(".entry");
          const box = button.getBoundingClientRect();
          const parts = [".name", ".status", ".meta > *", "time > .date", "time > .clock"]
            .flatMap((selector) => [...root.querySelectorAll(selector)]);
          const date = root.querySelector("time > .date");
          // Lit's markers stand beside the date's text: its one text node holds the date.
          const text = [...date.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
          const words = [...text.data.matchAll(/\\S+/g)].map((match) => {
            const range = document.createRange();
            range.setStart(text, match.index);
            range.setEnd(text, match.index + match[0].length);
            const rects = [...range.getClientRects()].filter((rect) => rect.width > 0);
            return [match[0], new Set(rects.map((rect) => Math.round(rect.top))).size];
          });
          return {
            name: entry.item.name,
            overflow: button.scrollWidth - button.clientWidth,
            outside: parts
              .filter((part) => {
                const rect = part.getBoundingClientRect();
                return rect.left < box.left - 0.5 || rect.right > box.right + 0.5;
              })
              .map((part) => [part.className || part.localName, part.textContent,
                Math.round(part.getBoundingClientRect().right - box.right)]),
            whole: [".size", "time > .clock"]
              .flatMap((selector) => [...root.querySelectorAll(selector)])
              .map((value) => [value.textContent, (${LINES})(value)]),
            words,
          };
        }) };
      });
      section.style.maxInlineSize = "";
      return { widths };
    }`;
    for (const { profile, widths } of await measureSpecimen<{
      widths: {
        width: string;
        shown: {
          name: string;
          overflow: number;
          outside: [string, string, number][];
          whole: Lines[];
          words: Lines[];
        }[];
      }[];
    }>("entry", measure, over)) {
      for (const { width, shown } of widths) {
        assert.ok(shown.length > 0, `${profile} at ${width}: an entry`);
        for (const { name, overflow, outside, whole, words } of shown) {
          const where = `${profile} at ${width}, ${name}`;
          assert.ok(overflow <= 0, `${where}: the button's content overflows it by ${overflow}`);
          assert.deepEqual(outside, [], `${where}: parts past the button, by px`);
          assert.ok(words.length > 0, `${where}: the date's words`);
          for (const [text, count] of [...whole, ...words]) {
            assert.equal(count, 1, `${where}: "${text}" on ${count} lines`);
          }
        }
      }
    }
  });

  test("at 20rem, the pagination's label and page count keep to one line, and its steps to one control's height, in every profile", async () => {
    const results = await measureSpecimen<{
      shown: { label: number; count: number | null; steps: number[]; control: number }[];
    }>(
      "pagination",
      `() => ({ shown: [...document.querySelectorAll(".narrow sl-pagination")].map((pagination) => {
        const root = pagination.shadowRoot;
        const lines = ${LINES};
        const count = root.querySelector(".page-indicator > span");
        const height = (selector) => root.querySelector(selector).getBoundingClientRect().height;
        return {
          label: lines(root.querySelector(".page-size-label")),
          count: count === null ? null : lines(count),
          steps: [...root.querySelectorAll(".page-step")].map((step) => step.getBoundingClientRect().height),
          control: Math.max(height("select"), height(".page-input")),
        };
      }) })`,
    );
    for (const { profile, shown } of results) {
      assert.ok(shown.length > 0, `${profile}: a pagination at 20rem`);
      for (const { label, count, steps, control } of shown) {
        assert.equal(label, 1, `${profile}: "Page Size" on ${label} lines`);
        if (count !== null) assert.equal(count, 1, `${profile}: the page count on ${count} lines`);
        // A pixel's allowance: in sans, the elements sheet's button is a pixel taller than its select.
        for (const step of steps) {
          assert.ok(step <= control + 1, `${profile}: a step ${step} tall, a control ${control}`);
        }
      }
    }
  });

  test("the page number's field fits a two- and a three-digit page inside its padding, at one width for every page to 999, and grows past it, in mono and sans, regular and compact", async () => {
    // Every pagination on the page, pages 13 and 100 of 100 among them, in each section, and one
    // added on page 1000 of 1000. The value's width, measured in the field's own font, fits the
    // field's content box, its border box less its inline padding and border, and the field
    // scrolls none of it; every field on the page, its page one, two, or three digits or none, is
    // one width, so the field never jumps as the page changes; and page 1000's field is wider.
    const over = ["mono", "sans"].flatMap((type) =>
      ["regular", "compact"].flatMap((space) => schemes.map((scheme) => ({ type, space, scheme }))),
    );
    const measure = `async () => {
      const context = document.createElement("canvas").getContext("2d");
      const field = (pagination) => {
        const input = pagination.shadowRoot.querySelector(".page-input");
        const style = getComputedStyle(input);
        const width = input.getBoundingClientRect().width;
        const edges = ["paddingInlineStart", "paddingInlineEnd", "borderInlineStartWidth", "borderInlineEndWidth"];
        context.font = style.font;
        return {
          value: input.value,
          width,
          text: context.measureText(input.value).width,
          content: edges.reduce((content, edge) => content - parseFloat(style[edge]), width),
          scrolled: input.scrollWidth - input.clientWidth,
        };
      };
      const shown = [...document.querySelectorAll("sl-pagination")].map(field);
      const list = document.querySelector("#states .states");
      const beyond = list.appendChild(Object.assign(document.createElement("sl-pagination"), { page: 1000, size: 3, total: 3000 }));
      await beyond.updateComplete;
      try {
        return { shown, beyond: field(beyond) };
      } finally {
        beyond.remove();
      }
    }`;
    type Field = { value: string; width: number; text: number; content: number; scrolled: number };
    for (const { profile, shown, beyond } of await measureSpecimen<{
      shown: Field[];
      beyond: Field;
    }>("pagination", measure, over)) {
      const values = new Set(shown.map(({ value }) => value));
      assert.ok(values.has("13") && values.has("100"), `${profile}: pages 13 and 100 shown`);
      const widths = shown.map(({ width }) => width);
      assert.ok(
        Math.max(...widths) - Math.min(...widths) <= 0.5,
        `${profile}: the fields ${widths.join(", ")} wide`,
      );
      assert.equal(beyond.value, "1000", `${profile}: the added pagination on page 1000`);
      assert.ok(
        beyond.width > Math.max(...widths) + 1,
        `${profile}: page 1000's field ${beyond.width} wide, the others' ${Math.max(...widths)}`,
      );
      for (const { value, text, content, scrolled } of [...shown, beyond]) {
        const where = `${profile}, page "${value}"`;
        assert.ok(text <= content, `${where}: the value ${text} wide, the content box ${content}`);
        assert.ok(scrolled <= 0, `${where}: the field scrolls its value by ${scrolled}`);
      }
    }
  });

  test("at 20rem, every state keeps within the column, a long name wrapping inside its entry, in every profile", async () => {
    // A component wider than the column widens its frame, the grid's item, past the list, so the
    // list's scroll width shows it; a name too long for its entry spills past the entry's button.
    // The status stays shown inside the entry, beside the name or on a line below it.
    const measure = `() => {
      const list = document.querySelector(".narrow .states");
      return {
        overflow: list.scrollWidth - list.clientWidth,
        spills: (${ENTRIES})(".narrow").map((entry) => {
          const root = entry.shadowRoot;
          const box = root.querySelector(".entry").getBoundingClientRect();
          const name = root.querySelector(".name").getBoundingClientRect();
          const status = root.querySelector(".status").getBoundingClientRect();
          return {
            name: entry.item.name,
            by: name.right - box.right,
            status: {
              shown: status.width > 0 && status.height > 0,
              inside: status.left >= box.left - 0.5 && status.right <= box.right + 0.5,
              clear: status.top >= name.bottom - 0.5 || status.left >= name.right - 0.5,
            },
          };
        }),
      };
    }`;
    for (const specimen of ["entry", "pagination"]) {
      for (const { profile, overflow, spills } of await measureSpecimen<{
        overflow: number;
        spills: {
          name: string;
          by: number;
          status: { shown: boolean; inside: boolean; clear: boolean };
        }[];
      }>(specimen, measure)) {
        assert.ok(
          overflow <= 0,
          `${specimen} under ${profile}: the states overflow the column by ${overflow}`,
        );
        assert.ok(spills.length > 0, `${specimen} under ${profile}: an entry at 20rem`);
        for (const { name, by, status } of spills) {
          assert.ok(
            by <= 0.5,
            `${specimen} under ${profile}: ${name} spills past its entry by ${by}`,
          );
          assert.deepEqual(
            status,
            { shown: true, inside: true, clear: true },
            `${specimen} under ${profile}: ${name}'s status`,
          );
        }
      }
    }
  });

  test("in a parent that sizes it to its content, the entry takes its content's width, in every profile", async () => {
    // The fit section's entries: brand-guide.pdf in an inline-block, as a content-sized flex
    // item, and in a grid's auto track. Each entry is at least as wide as its first line laid out
    // whole, the name on one line and the status, with the head's column gap between, and every
    // part keeps inside its button.
    const results = await measureSpecimen<
      Fits<{
        parent: string;
        name: string;
        width: number;
        natural: number;
        lines: number;
        status: boolean;
        overflow: number;
        outside: string[];
      }>
    >(
      "entry",
      `() => ({ fits: (${ENTRIES})("#fit").map((entry) => {
        const root = entry.shadowRoot;
        const button = root.querySelector(".entry");
        const box = button.getBoundingClientRect();
        const gap = parseFloat(getComputedStyle(root.querySelector(".head")).columnGap);
        const part = (selector) => root.querySelector(selector).getBoundingClientRect();
        const [name, status, meta] = [".name", ".status", ".meta"].map(part);
        // The name's text laid out on one line, however its box wraps it.
        const range = document.createRange();
        range.selectNodeContents(root.querySelector(".name"));
        const text = [...range.getClientRects()].reduce((sum, rect) => sum + rect.width, 0);
        const inside = (rect) =>
          rect.left >= box.left - 0.5 && rect.right <= box.right + 0.5 &&
          rect.top >= box.top - 0.5 && rect.bottom <= box.bottom + 0.5;
        return {
          parent: entry.parentElement.className,
          name: entry.item.name,
          width: box.width,
          natural: text + gap + status.width,
          lines: (${LINES})(root.querySelector(".name")),
          status: status.width > 0 && status.height > 0,
          overflow: button.scrollWidth - button.clientWidth,
          outside: [["name", name], ["status", status], ["meta", meta]]
            .filter(([, rect]) => !inside(rect)).map(([which]) => which),
        };
      }) })`,
    );
    for (const { profile, fits } of results) {
      assert.deepEqual(
        fits.map(({ parent, name }) => [parent, name]),
        ["fit-inline-block", "fit-flex", "fit-grid"].map((parent) => [parent, "brand-guide.pdf"]),
        `${profile}: the fit section's entries`,
      );
      for (const { parent, width, natural, lines, status, overflow, outside } of fits) {
        const where = `${parent} under ${profile}`;
        assert.ok(
          width >= natural - 0.5,
          `${where}: the entry ${width} wide, its content ${natural}`,
        );
        assert.equal(lines, 1, `${where}: brand-guide.pdf on ${lines} lines`);
        assert.ok(status, `${where}: the status shown`);
        assert.ok(overflow <= 0, `${where}: the entry's content overflows it by ${overflow}`);
        assert.deepEqual(outside, [], `${where}: parts outside the entry`);
      }
    }
  });

  test("selected, reflected, frames the entry in the accent color, moving nothing", async () => {
    // A file's entry on the specimen page, unselected, then selected by property, then by
    // attribute removed: the attribute follows the property and the property the attribute; the
    // frame is the border and an inset shadow in the accent color only while selected; and
    // the button and every part keep their boxes across the change.
    const page = await browser.open(`${server.origin}/demo/entry.html`);
    try {
      // The entry's frame as it shows, and the boxes of its button and parts.
      interface Look {
        attribute: boolean;
        property: boolean;
        border: boolean;
        shadow: boolean;
      }
      interface Shown {
        look: Look;
        boxes: number[][];
      }
      const { before, selected, after }: { before: Shown; selected: Shown; after: Look } =
        await page.evaluate(`(async () => {
        await customElements.whenDefined("sl-entry");
        const entry = (${ENTRIES})("#states").find((entry) => !entry.selected && "size" in entry.item);
        await entry.updateComplete;
        await document.fonts.ready;
        const root = entry.shadowRoot;
        const button = root.querySelector(".entry");
        // The accent color as the button resolves it, read from a probe's color.
        const probe = root.appendChild(document.createElement("span"));
        probe.style.color = "var(--accent-color, var(--magenta))";
        const accent = getComputedStyle(probe).color;
        probe.remove();
        const look = () => {
          const style = getComputedStyle(button);
          return {
            attribute: entry.hasAttribute("selected"),
            property: entry.selected,
            border: style.borderTopColor === accent,
            shadow: style.boxShadow.includes("inset") && style.boxShadow.includes(accent),
          };
        };
        const boxes = () => [button, ...root.querySelectorAll(".head > *, .meta > *")].map((part) => {
          const rect = part.getBoundingClientRect();
          return [rect.left, rect.top, rect.width, rect.height];
        });
        const before = { look: look(), boxes: boxes() };
        entry.selected = true;
        await entry.updateComplete;
        const selected = { look: look(), boxes: boxes() };
        entry.removeAttribute("selected");
        await entry.updateComplete;
        return { before, selected, after: look() };
      })()`);
      const off = { attribute: false, property: false, border: false, shadow: false };
      assert.deepEqual(before.look, off, "unselected");
      assert.deepEqual(
        selected.look,
        { attribute: true, property: true, border: true, shadow: true },
        "selected",
      );
      assert.ok(before.boxes.length > 4, "the button and its parts");
      assert.deepEqual(selected.boxes, before.boxes, "the boxes, selected and not");
      assert.deepEqual(after, off, "the attribute removed");
    } finally {
      await page.close();
    }
  });

  test("a selected entry focused by Tab shows its focus ring alone, and its frame once focus leaves", async () => {
    // The focus section's entry is selected; Tab from the section's mark focuses its button. While
    // its focus is visible the ring, the elements sheet's outline, is the one mark: the border is
    // not the accent color and there is no inset shadow, the border's width the same. Focus
    // moved to another entry's button, the frame returns.
    const page = await browser.open(`${server.origin}/demo/entry.html`);
    try {
      await page.cdp("Emulation.setFocusEmulationEnabled", { enabled: true });
      await page.evaluate(`customElements.whenDefined("sl-entry").then(() =>
        document.querySelector("#focus sl-entry").updateComplete).then(() =>
        document.querySelector("#focus [data-focus-start]").focus())`);
      const tab = { key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 };
      await page.cdp("Input.dispatchKeyEvent", { type: "keyDown", ...tab });
      await page.cdp("Input.dispatchKeyEvent", { type: "keyUp", ...tab });
      // The focus section's entry as it shows: its ring, its frame, and its border's width.
      const look = `(() => {
        const entry = document.querySelector("#focus sl-entry");
        const button = entry.shadowRoot.querySelector(".entry");
        // The accent color as the button resolves it, read from a probe's color.
        const probe = entry.shadowRoot.appendChild(document.createElement("span"));
        probe.style.color = "var(--accent-color, var(--magenta))";
        const accent = getComputedStyle(probe).color;
        probe.remove();
        const style = getComputedStyle(button);
        return {
          selected: entry.selected,
          focused: entry.shadowRoot.activeElement === button && button.matches(":focus-visible"),
          ring: style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0,
          border: style.borderTopColor === accent,
          shadow: style.boxShadow.includes("inset"),
          width: style.borderTopWidth,
        };
      })()`;
      /** The focus section's entry as it shows. */
      interface Focus {
        selected: boolean;
        focused: boolean;
        ring: boolean;
        border: boolean;
        shadow: boolean;
        width: string;
      }
      const focused: Focus = await page.evaluate(look);
      assert.deepEqual(
        { ...focused, width: undefined },
        {
          selected: true,
          focused: true,
          ring: true,
          border: false,
          shadow: false,
          width: undefined,
        },
        "focused by Tab",
      );
      await page.evaluate(
        `(${ENTRIES})("#states").find((entry) => entry.item).shadowRoot.querySelector(".entry").focus()`,
      );
      const left: Focus = await page.evaluate(look);
      assert.deepEqual(
        left,
        {
          selected: true,
          focused: false,
          ring: false,
          border: true,
          shadow: true,
          width: focused.width,
        },
        "focus on another entry",
      );
    } finally {
      await page.close();
    }
  });

  test("the accent hook marks the selected frame; the interaction hook the focus ring", async () => {
    // On the components page, in one subtree: a selected entry, and a selected entry focused by
    // Tab. Each mark is read as it resolves, at the hooks' fallbacks, then with --accent-color set
    // on the subtree, then with --interaction-color set there instead: the selected frame follows
    // the accent hook alone, the focus ring the interaction hook alone. The focused entry's frame
    // gives way to its ring, so the ring is read on it and the frame on the other.
    const page = await browser.open(`${server.origin}/test/fixtures/components.html`);
    try {
      await page.cdp("Emulation.setFocusEmulationEnabled", { enabled: true });
      await page.evaluate(`window.verdict.then(async () => {
        await import("/dist/entry.js");
        const file = (id) => ({
          id, name: id + ".pdf", status: "ready", updated_at: "2026-10-31T09:00:00Z",
          size: 1000, content_type: "application/pdf",
        });
        const subtree = document.createElement("div");
        subtree.id = "subtree";
        subtree.append(
          Object.assign(document.createElement("sl-entry"), { item: file("framed"), selected: true }),
          Object.assign(document.createElement("button"), { id: "focus-start", textContent: "start" }),
          Object.assign(document.createElement("sl-entry"), { item: file("focused"), selected: true }),
        );
        document.querySelector("main").replaceChildren(subtree);
        await Promise.all([...subtree.querySelectorAll("sl-entry")].map((entry) => entry.updateComplete));
        subtree.querySelector("#focus-start").focus();
      })`);
      const tab = { key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 };
      await page.cdp("Input.dispatchKeyEvent", { type: "keyDown", ...tab });
      await page.cdp("Input.dispatchKeyEvent", { type: "keyUp", ...tab });
      // Each mark's colors as it resolves, and the two hooks as the subtree resolves them, read
      // from a probe's color.
      const read = (hook: string) =>
        page.evaluate(`(() => {
        const subtree = document.querySelector("#subtree");
        subtree.removeAttribute("style");
        ${hook ? `subtree.style.setProperty(${JSON.stringify(hook)}, "rgb(1, 2, 3)");` : ""}
        const resolve = (property, value) => {
          const probe = subtree.appendChild(document.createElement("span"));
          probe.style[property] = value;
          const resolved = getComputedStyle(probe)[property];
          probe.remove();
          return resolved;
        };
        const accent = resolve("color", "var(--accent-color, var(--magenta))");
        const interaction = resolve("color", "var(--interaction-color, var(--blue))");
        const [framed, focused] = [...subtree.querySelectorAll("sl-entry")]
          .map((entry) => entry.shadowRoot.querySelector(".entry"));
        const is = (color) => color === accent ? "accent" : color === interaction ? "interaction" : color;
        return {
          distinct: accent !== interaction,
          focused: focused.matches(":focus-visible"),
          marks: {
            "the selected frame's border": is(getComputedStyle(framed).borderTopColor),
            "the selected frame's shadow": getComputedStyle(framed).boxShadow.includes(accent)
              ? "accent" : getComputedStyle(framed).boxShadow,
            "the focus ring": is(getComputedStyle(focused).outlineColor),
          },
        };
      })()`);
      const expected = {
        "the selected frame's border": "accent",
        "the selected frame's shadow": "accent",
        "the focus ring": "interaction",
      };
      for (const hook of ["", "--accent-color", "--interaction-color"]) {
        const shown: { distinct: boolean; focused: boolean; marks: object } = await read(hook);
        const { marks, ...state } = shown;
        const where = hook ? `${hook} set on the subtree` : "at the fallbacks";
        assert.deepEqual(
          state,
          { distinct: true, focused: true },
          `${where}: the hooks differ and the entry is focused`,
        );
        assert.deepEqual(marks, expected, where);
      }
    } finally {
      await page.close();
    }
  });
});
