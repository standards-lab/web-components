import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { launch } from "@standards-lab/web-tooling/browser.js";
import type { Browser, Page } from "@standards-lab/web-tooling/browser.js";
import { serve } from "@standards-lab/web-tooling/server.js";
import type { Server } from "@standards-lab/web-tooling/server.js";

import { DEFAULTS, colors, spaces, types } from "./support/profiles.ts";
import { served } from "./support/served.ts";

interface Profile {
  color?: string;
  space?: string;
  type?: string;
  scheme: string;
}

interface Run {
  name: string;
  query: string;
  dataset: Record<string, string>;
}

type Measured<T> = T & { profile: string };

interface States<T> {
  overflow: number;
  shown: T[];
}

interface Fits<T> {
  fits: T[];
}

type Lines = [string, number];

interface Fit {
  parent: string;
  width: number;
  column: number;
}

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

  const tags = [
    "sl-drawer",
    "sl-document-list",
    "sl-search-results",
    "sl-event-log",
    "sl-stage-timeline",
    "sl-upload-dropzone",
    "sl-composer",
    "sl-chat-thread",
    "sl-artifact-viewer",
    "sl-pagination",
    "sl-entry",
    "sl-status-badge",
    "sl-shortcuts",
    "sl-settings",
  ];

  const schemes = ["light", "dark"];
  const profiles: Profile[] = [
    ...colors.map((color) => ({ color })),
    ...spaces.map((space) => ({ space })),
    ...types.map((type) => ({ type })),
  ].flatMap((profile) => schemes.map((scheme) => ({ ...profile, scheme })));

  const defaults = DEFAULTS;
  const runs: Run[] = [
    { name: "on the lean page.css", query: "", dataset: {} },
    ...profiles.map((profile) => {
      const { color, space, type, scheme } = { ...defaults, ...profile };
      const query = new URLSearchParams({ entry: "full", palette: color, space, type, scheme });
      const dataset = { palette: color, space, type, scheme };
      return { name: `in ${color} ${space} ${type} ${scheme}`, query: String(query), dataset };
    }),
  ];

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

    test(`each component adopts the foundation's reset and elements sheets, then the opt-in sheets it uses, then its own, ${run.name}`, async () => {
      const page = await open(run);
      try {
        const { adopted, label }: { adopted: Record<string, string[]>; label: string } =
          await page.evaluate(`(async () => {
        const sheet = async (specifier) =>
          (await import(specifier, { with: { type: "css" } })).default;
        const foundation = "@standards-lab/web-foundation";
        const reset = await sheet(foundation + "/baseline/reset.css");
        const elements = await sheet(foundation + "/baseline/elements.css");
        const named = new Map([
          [reset, "reset"],
          [elements, "elements"],
          [await sheet(foundation + "/meta.css"), "meta"],
          [await sheet(foundation + "/structure.css"), "structure"],
          [await sheet(foundation + "/utilities.css"), "utilities"],
          [await sheet(foundation + "/glyph-button.css"), "glyph-button"],
          [await sheet(foundation + "/dialog.css"), "dialog"],
          [await sheet(foundation + "/motion.css"), "motion"],
        ]);
        const components = [
          ["sl-drawer", "drawer", "drawer.css"],
          ["sl-document-list", "document-list", "document-list.css"],
          ["sl-search-results", "search-results", "search-results.css"],
          ["sl-event-log", "event-log", "event-log.css"],
          ["sl-stage-timeline", "stage-timeline", "stage-timeline.css"],
          ["sl-upload-dropzone", "upload-dropzone", "upload-dropzone.css"],
          ["sl-composer", "composer", "composer.css"],
          ["sl-chat-thread", "chat-thread", "chat-thread.css"],
          ["sl-artifact-viewer", "artifact-viewer", "artifact-viewer.css"],
          ["sl-pagination", "pagination", "pagination.css"],
          ["sl-entry", "entry", "entry.css"],
          ["sl-status-badge", "status-badge", "status-badge.css"],
          ["sl-shortcuts", "shortcuts", "shortcuts.css"],
          ["sl-settings", "settings", "settings.css"],
        ];
        const adopted = {};
        for (const [tag, module, own] of components) {
          await import("/dist/" + module + ".js");
          const ownSheet = await sheet("/dist/" + own);
          const element = document.body.appendChild(document.createElement(tag));
          await element.updateComplete;
          adopted[tag] = element.shadowRoot.adoptedStyleSheets.map((s) =>
            s === ownSheet ? "own" : named.get(s) ?? "other");
        }
        const badge = document.querySelector("sl-status-badge");
        badge.label = "Draft";
        await badge.updateComplete;
        return { adopted, label: badge.shadowRoot.querySelector("button").textContent };
      })()`);
        const base = ["reset", "elements"];
        const expected: Record<string, string[]> = {
          "sl-drawer": [...base, "utilities", "glyph-button", "dialog", "motion", "own"],
          "sl-stage-timeline": [...base, "utilities", "motion", "own"],
          "sl-upload-dropzone": [...base, "utilities", "motion", "own"],
          "sl-chat-thread": [...base, "utilities", "motion", "own"],
          "sl-status-badge": [...base, "own"],
          "sl-settings": [...base, "meta", "structure", "utilities", "own"],
        };
        for (const tag of tags) {
          assert.deepEqual(adopted[tag], expected[tag] ?? [...base, "utilities", "own"], tag);
        }
        assert.equal(label, "Draft");
      } finally {
        await page.close();
      }
    });

    test(`the entry shows a file's size and modified time in the page's locale and time zone, ${run.name}`, async () => {
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
        assert.deepEqual(
          shown,
          { size: "1.5 kB", time: "Oct 12, 2026, 4:41 PM" },
          "in en-US at UTC, as the tooling's launch() starts the browser",
        );
      } finally {
        await page.close();
      }
    });
  }

  test("the entry's meta line shows no kind word, its button's name keeps it and the content type whole, and open sends the id and kind", async () => {
    const openxml = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const page = await open(runs[0]);
    try {
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
            parts: [...meta.children].map((part) => part.classList[0] ?? part.localName),
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
      const names = nodes
        .filter((node) => node.role?.value === "button")
        .map((node) => node.name?.value ?? "")
        .filter((name) => /^(sketch\.txt|designs|brief\.docx) /.test(name));
      assert.deepEqual(
        names,
        [
          "sketch.txt available file 1.5 kB text/plain Oct 12, 2026, 4:41 PM",
          "designs active directory Oct 12, 2026, 4:41 PM",
          `brief.docx available file 1.5 kB ${openxml} Oct 12, 2026, 4:41 PM`,
        ],
        "each name whole: the kind after the status, no space where the content type breaks",
      );
    } finally {
      await page.close();
    }
  });

  test("the entry's status takes its status tone's hue, the components' status hues, its text kept; no tone, or one it doesn't know, stays muted", async () => {
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
        ${hook ? `main.style.setProperty("--color-accent", "rgb(1, 2, 3)");` : ""}
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
          accent: resolve("var(--color-accent, var(--magenta))"),
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
        const where = hook ? "--color-accent set" : "at the accent hook's fallback";
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

  interface Rendered {
    color: string;
    space: string;
    type: string;
    scheme: string;
    profile: string;
    tag: string;
    width: number;
    height: number;
    look: { color: string; font: string; body: string; padding: number };
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
        await Promise.all(["drawer", "document-list", "search-results", "event-log", "stage-timeline", "upload-dropzone", "composer", "chat-thread", "artifact-viewer", "pagination", "entry", "status-badge", "shortcuts", "settings"].map(
          (module) => import("/dist/" + module + ".js")));
        const keys = await import("@standards-lab/web-foundation/keys.js");
        keys.register("Alt+n", "New note", () => {});
        const components = {
          "sl-drawer": () => {
            const drawer = Object.assign(document.createElement("sl-drawer"), { label: "Documents" });
            drawer.append(Object.assign(document.createElement("button"), { textContent: "notes.md" }));
            return drawer;
          },
          "sl-document-list": () =>
            Object.assign(document.createElement("sl-document-list"), {
              page: 1, size: 3, total: 1, pageSizes: [3, 6, 12], selected: "doc-1",
              items: [{ id: "doc-1", name: "notes.md", content_type: "text/markdown", size: 18432,
                created_at: "2026-10-29T15:42:07Z", run_id: "run-1", status: "complete" }],
            }),
          "sl-search-results": () =>
            Object.assign(document.createElement("sl-search-results"), {
              query: "report",
              items: [{ id: "doc-1", name: "quarterly-report.md", field: "content",
                snippet: "\u2026This report covers the three regions\u2026" }],
            }),
          "sl-event-log": () =>
            Object.assign(document.createElement("sl-event-log"), {
              events: [
                { id: "run-1.1", type: "emulator.run.stage", source: "/emulator/lab-a", subject: "run-1",
                  time: "2026-10-29T15:42:07Z", data: { stage: "upload", position: 1 } },
              ],
            }),
          "sl-stage-timeline": () =>
            Object.assign(document.createElement("sl-stage-timeline"), {
              stages: [
                { name: "upload", position: 1, state: "complete", completedAt: "2026-10-29T15:42:07Z" },
                { name: "metadata", position: 2, state: "active" },
                { name: "extraction", position: 3, state: "pending" },
              ],
            }),
          "sl-upload-dropzone": () =>
            Object.assign(document.createElement("sl-upload-dropzone"), {
              uploads: [{ id: "u-1", name: "notes.md", size: 18400, sent: 6300, state: "uploading" }],
            }),
          "sl-composer": () =>
            Object.assign(document.createElement("sl-composer"), { value: "Status?" }),
          "sl-chat-thread": () =>
            Object.assign(document.createElement("sl-chat-thread"), {
              items: [
                { type: "message", role: "user", content: [{ type: "input_text", text: "Status?" }] },
                { type: "message", id: "msg_1", role: "assistant", status: "completed",
                  content: [{ type: "output_text", text: "All **3** stages completed." }] },
              ],
            }),
          "sl-artifact-viewer": () =>
            Object.assign(document.createElement("sl-artifact-viewer"), {
              name: "notes.md",
              contentType: "text/markdown",
              content: "# Notes\\n\\nA paragraph, then a list:\\n\\n- one\\n- two",
            }),
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
          "sl-shortcuts": () => document.createElement("sl-shortcuts"),
          "sl-settings": () => document.createElement("sl-settings"),
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
            const entries = [...element.shadowRoot.querySelectorAll("sl-entry")];
            await Promise.all(entries.map((entry) => entry.updateComplete));
            const { width, height } = element.getBoundingClientRect();
            const drawer = tag === "sl-drawer";
            const viewer = tag === "sl-artifact-viewer";
            const thread = tag === "sl-chat-thread";
            const timeline = tag === "sl-stage-timeline";
            const log = tag === "sl-event-log";
            const shortcuts = tag === "sl-shortcuts";
            const settings = tag === "sl-settings";
            const style = getComputedStyle(entries.length
              ? entries[0].shadowRoot.querySelector("button")
              : element.shadowRoot.querySelector(
                drawer ? "aside" : viewer ? ".body > *" : thread ? ".user > .message" : timeline ? ".complete > .marker" : log ? ".events" : shortcuts ? "th" : settings ? ".theme-menu-preview" : "button"));
            const font = drawer
              ? getComputedStyle(element.querySelector("button"))
              : viewer
                ? getComputedStyle(element.shadowRoot.querySelector("h1"))
                : thread
                  ? getComputedStyle(element.shadowRoot.querySelector(".role"))
                  : timeline
                    ? getComputedStyle(element.shadowRoot.querySelector(".label"))
                    : log
                      ? getComputedStyle(element.shadowRoot.querySelector(".when"))
                      : shortcuts
                        ? getComputedStyle(element.shadowRoot.querySelector(".note"))
                        : settings
                          ? getComputedStyle(element.shadowRoot.querySelector(".theme-menu-preview button"))
                          : style;
            const look = {
              color: style.color + " on " + style.backgroundColor,
              font: font.fontFamily,
              body: getComputedStyle(document.body).fontFamily,
              padding: timeline
                ? parseFloat(getComputedStyle(element.shadowRoot.querySelector(".stage")).columnGap)
                : drawer
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
      assert.deepEqual(registered, {
        color: colors,
        space: [defaults.space, ...spaces],
        type: [defaults.type, ...types],
      });
      assert.equal(rendered.length, profiles.length * tags.length);
      for (const { profile, tag, width, height } of rendered) {
        assert.ok(width > 0 && height > 0, `${tag} under ${profile}: a ${width} × ${height} box`);
      }
      assert.deepEqual(errors, []);
      const looks = (tag: string, where: (shown: Rendered) => boolean) =>
        rendered.filter((shown) => shown.tag === tag && where(shown)).map((shown) => shown.look);
      for (const tag of tags) {
        const colored = looks(
          tag,
          ({ space, type }) => space === defaults.space && type === defaults.type,
        );
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
              shown.type === defaults.type &&
              shown.space === defaults.space,
          );
          const [sans] = looks(tag, (shown) => shown.scheme === scheme && shown.type === "sans");
          const [compact] = looks(
            tag,
            (shown) => shown.scheme === scheme && shown.space === "compact",
          );
          if (tag === "sl-shortcuts") {
            for (const look of [mono, sans]) {
              assert.equal(look.font, look.body, `${tag}, ${scheme}: its note in the body font`);
            }
          } else {
            assert.notEqual(sans.font, mono.font, `${tag}, ${scheme}: sans sets the font`);
          }
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
        await Promise.all([...document.querySelectorAll("sl-document-list")].flatMap((list) =>
          [...list.shadowRoot.querySelectorAll("sl-entry, sl-pagination")].map((el) => el.updateComplete)));
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

  const LINES = `(element) => {
    const texts = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const rects = [];
    for (let text = texts.nextNode(); text; text = texts.nextNode()) {
      const range = document.createRange();
      range.selectNodeContents(text);
      rects.push(...[...range.getClientRects()].filter((rect) => rect.width > 0));
    }
    return new Set(rects.map((rect) => Math.round(rect.top))).size;
  }`;
  const ENTRIES = `(section) => [...document.querySelectorAll(section + " sl-entry")]
    .filter((entry) => entry.item !== null)`;

  test("the entry's name is its primary text, its status and meta quieter, the meta line under the name, in every profile", async () => {
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
          first: first.classList[0] ?? first.localName,
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
    const measure = `() => ({ wrapped: (${ENTRIES})(".narrow").flatMap((entry) => {
      const root = entry.shadowRoot;
      const rowGap = parseFloat(getComputedStyle(root.querySelector(".entry")).rowGap);
      const name = root.querySelector(".name").getBoundingClientRect();
      const status = root.querySelector(".status").getBoundingClientRect();
      const meta = root.querySelector(".meta");
      const metaTop = meta.getBoundingClientRect().top;
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
    const measure = `() => ({ shown: (${ENTRIES})(".narrow").map((entry) => {
      const root = entry.shadowRoot;
      const time = root.querySelector("time");
      const values = [".size", "time > .date", "time > .clock"]
        .flatMap((selector) => [...root.querySelectorAll(selector)]);
      return {
        name: entry.item.name,
        parts: [...time.children].map((part) => part.classList[0]),
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
    const over = [defaults.type, ...types].flatMap((type) =>
      [defaults.space, ...spaces].flatMap((space) =>
        schemes.map((scheme) => ({ type, space, scheme })),
      ),
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
        for (const step of steps) {
          assert.ok(
            step <= control + 1,
            `${profile}: a step ${step} tall, a control ${control}, within the pixel sans makes a button taller than a select`,
          );
        }
      }
    }
  });

  test("the page number's field fits a two- and a three-digit page inside its padding, at one width for every page to 999, and grows past it, in mono and sans, regular and compact", async () => {
    const over = [defaults.type, ...types].flatMap((type) =>
      [defaults.space, ...spaces].flatMap((space) =>
        schemes.map((scheme) => ({ type, space, scheme })),
      ),
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
    const page = await browser.open(`${server.origin}/demo/entry.html`);
    try {
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
        const probe = root.appendChild(document.createElement("span"));
        probe.style.color = "var(--color-accent, var(--magenta))";
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
    const page = await browser.open(`${server.origin}/demo/entry.html`);
    try {
      await page.cdp("Emulation.setFocusEmulationEnabled", { enabled: true });
      await page.evaluate(`customElements.whenDefined("sl-entry").then(() =>
        document.querySelector("#focus sl-entry").updateComplete).then(() =>
        document.querySelector("#focus [data-focus-start]").focus())`);
      const tab = { key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 };
      await page.cdp("Input.dispatchKeyEvent", { type: "keyDown", ...tab });
      await page.cdp("Input.dispatchKeyEvent", { type: "keyUp", ...tab });
      const look = `(() => {
        const entry = document.querySelector("#focus sl-entry");
        const button = entry.shadowRoot.querySelector(".entry");
        const probe = entry.shadowRoot.appendChild(document.createElement("span"));
        probe.style.color = "var(--color-accent, var(--magenta))";
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

  test("the accent hook marks the active stage, the streaming dot, the selected frame, and progress; the interaction hook the drag-over and the focus ring", async () => {
    const page = await browser.open(`${server.origin}/test/fixtures/components.html`);
    try {
      await page.cdp("Emulation.setFocusEmulationEnabled", { enabled: true });
      await page.cdp("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
      });
      await page.evaluate(`window.verdict.then(async () => {
        await Promise.all(["stage-timeline", "chat-thread", "entry", "upload-dropzone"]
          .map((name) => import("/dist/" + name + ".js")));
        const file = (id) => ({
          id, name: id + ".pdf", status: "ready", updated_at: "2026-10-31T09:00:00Z",
          size: 1000, content_type: "application/pdf",
        });
        const subtree = document.createElement("div");
        subtree.id = "subtree";
        subtree.append(
          Object.assign(document.createElement("sl-stage-timeline"), { stages: [
            { name: "upload", position: 1, state: "complete", completedAt: null },
            { name: "extraction", position: 2, state: "active", completedAt: null },
          ] }),
          Object.assign(document.createElement("sl-chat-thread"), { items: [
            { type: "message", id: "m-1", role: "assistant", status: "in_progress",
              content: [{ type: "output_text", text: "Reading" }] },
          ] }),
          Object.assign(document.createElement("sl-entry"), { item: file("framed"), selected: true }),
          Object.assign(document.createElement("button"), { id: "focus-start", textContent: "start" }),
          Object.assign(document.createElement("sl-entry"), { item: file("focused"), selected: true }),
          Object.assign(document.createElement("sl-upload-dropzone"), { uploads: [
            { id: "u-1", name: "report.pdf", size: 1000, sent: 400, state: "uploading" },
          ] }),
        );
        document.querySelector("main").replaceChildren(subtree);
        await Promise.all([...subtree.children].map((element) => element.updateComplete));
        const dropzone = subtree.querySelector("sl-upload-dropzone");
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(new File(["x"], "dragged.pdf"));
        dropzone.shadowRoot.querySelector(".zone").dispatchEvent(new DragEvent("dragenter", {
          bubbles: true, cancelable: true, composed: true, dataTransfer,
        }));
        await dropzone.updateComplete;
        subtree.querySelector("#focus-start").focus();
      })`);
      const tab = { key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 };
      await page.cdp("Input.dispatchKeyEvent", { type: "keyDown", ...tab });
      await page.cdp("Input.dispatchKeyEvent", { type: "keyUp", ...tab });
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
        const accent = resolve("color", "var(--color-accent, var(--magenta))");
        const interaction = resolve("color", "var(--color-primary, var(--blue))");
        const tint = resolve(
          "backgroundColor",
          "color-mix(in srgb, var(--color-accent, var(--magenta)) 12%, transparent)",
        );
        const root = (selector) => subtree.querySelector(selector).shadowRoot;
        const [framed, focused] = [...subtree.querySelectorAll("sl-entry")]
          .map((entry) => entry.shadowRoot.querySelector(".entry"));
        const timeline = root("sl-stage-timeline");
        const marker = timeline.querySelector(".active .marker");
        const style = getComputedStyle(marker);
        const zone = root("sl-upload-dropzone").querySelector(".zone");
        getComputedStyle(zone).borderTopColor;
        for (const transition of zone.getAnimations()) transition.finish();
        const is = (color) => color === accent ? "accent" : color === interaction ? "interaction" : color;
        return {
          distinct: accent !== interaction,
          focused: focused.matches(":focus-visible"),
          over: zone.classList.contains("over"),
          marks: {
            "the active marker's border": is(style.borderTopColor),
            "the active marker's tint": style.backgroundColor === tint ? "accent" : style.backgroundColor,
            "the active marker's glyph": is(style.color),
            "the active marker's ring": is(getComputedStyle(marker.querySelector(".ring")).borderTopColor),
            "the active label": is(getComputedStyle(timeline.querySelector(".active .label")).color),
            "the streaming dot": is(getComputedStyle(
              root("sl-chat-thread").querySelector(".status.in_progress > .dot")).backgroundColor),
            "the selected frame's border": is(getComputedStyle(framed).borderTopColor),
            "the selected frame's shadow": getComputedStyle(framed).boxShadow.includes(accent)
              ? "accent" : getComputedStyle(framed).boxShadow,
            "the upload's progress": is(getComputedStyle(
              root("sl-upload-dropzone").querySelector("progress")).accentColor),
            "the drag-over zone's border": is(getComputedStyle(zone).borderTopColor),
            "the focus ring": is(getComputedStyle(focused).outlineColor),
          },
        };
      })()`);
      const expected = {
        "the active marker's border": "accent",
        "the active marker's tint": "accent",
        "the active marker's glyph": "accent",
        "the active marker's ring": "accent",
        "the active label": "accent",
        "the streaming dot": "accent",
        "the selected frame's border": "accent",
        "the selected frame's shadow": "accent",
        "the upload's progress": "accent",
        "the drag-over zone's border": "interaction",
        "the focus ring": "interaction",
      };
      for (const hook of ["", "--color-accent", "--color-primary"]) {
        const shown: { distinct: boolean; focused: boolean; over: boolean; marks: object } =
          await read(hook);
        const { marks, ...state } = shown;
        const where = hook ? `${hook} set on the subtree` : "at the fallbacks";
        assert.deepEqual(
          state,
          { distinct: true, focused: true, over: true },
          `${where}: the hooks differ, the entry is focused, and the zone is dragged over`,
        );
        assert.deepEqual(marks, expected, where);
      }
    } finally {
      await page.close();
    }
  });

  test("the motion sheet runs the streaming dot's pulse and the active marker's ring inside their shadow roots, and the drag-over's change in its --duration-s; under reduced motion none of them", async () => {
    const page = await browser.open(`${server.origin}/test/fixtures/components.html`);
    try {
      await page.evaluate(`window.verdict.then(async () => {
        await Promise.all(["stage-timeline", "chat-thread", "upload-dropzone"]
          .map((name) => import("/dist/" + name + ".js")));
        window.motion = async () => {
          const subtree = document.createElement("div");
          subtree.append(
            Object.assign(document.createElement("sl-stage-timeline"), { stages: [
              { name: "extraction", position: 1, state: "active", completedAt: null },
            ] }),
            Object.assign(document.createElement("sl-chat-thread"), { items: [
              { type: "message", id: "m-1", role: "assistant", status: "in_progress",
                content: [{ type: "output_text", text: "Reading" }] },
            ] }),
            Object.assign(document.createElement("sl-upload-dropzone"), { uploads: [] }),
          );
          document.querySelector("main").replaceChildren(subtree);
          await Promise.all([...subtree.children].map((element) => element.updateComplete));
          const [timeline, thread, dropzone] = [...subtree.children].map((element) => element.shadowRoot);
          const names = (element) => element.getAnimations().map((animation) => animation.animationName);
          const zone = dropzone.querySelector(".zone");
          const durations = () => getComputedStyle(zone).transitionDuration;
          const before = durations();
          dropzone.host.style.setProperty("--duration-s", "345ms");
          return {
            ring: names(timeline.querySelector(".active .marker > .ring")),
            dot: names(thread.querySelector(".status.in_progress > .dot")),
            zone: [before, durations()],
          };
        };
      })`);
      const shown = (): Promise<{ ring: string[]; dot: string[]; zone: string[] }> =>
        page.evaluate(`window.motion()`);
      await page.cdp("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
      });
      const moving = await shown();
      assert.deepEqual([moving.ring, moving.dot], [["ring"], ["pulse"]]);
      assert.notEqual(moving.zone[0], "0s", "the motion sheet's --duration-s resolves");
      assert.equal(moving.zone[1], "0.345s, 0.345s", "the drag-over's change takes --duration-s");
      await page.cdp("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
      });
      assert.deepEqual(await shown(), { ring: [], dot: [], zone: ["0s", "0s"] });
    } finally {
      await page.close();
    }
  });

  const VIEWERS = `(section) => [...document.querySelectorAll(section + " sl-artifact-viewer")]`;

  test("the artifact viewer's specimen renders every state, at full size or held, within 20rem, in every profile", async () => {
    const measure = `() => {
      const list = document.querySelector(".narrow .states");
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const shown = (${VIEWERS})("main").map((viewer) => {
        const root = viewer.shadowRoot;
        const box = viewer.getBoundingClientRect();
        const parts = [...root.querySelectorAll(".header, .name, .type, .frame, .note, .body, .media")];
        const region = root.querySelector(".body");
        return {
          name: viewer.name,
          narrow: viewer.closest(".narrow") !== null,
          header: root.querySelector(".header") !== null,
          noHeader: viewer.noHeader,
          shown: root.querySelector(".body, .note, .media") !== null,
          held: viewer.classList.contains("held"),
          height: box.height / rem,
          outside: parts
            .filter((part) => {
              const rect = part.getBoundingClientRect();
              return rect.left < box.left - 0.5 || rect.right > box.right + 0.5 ||
                rect.top < box.top - 0.5 || rect.bottom > box.bottom + 0.5;
            })
            .map((part) => part.className),
          sideways: region !== null && region.scrollWidth > region.clientWidth,
          scrolls: region !== null && region.scrollHeight > region.clientHeight,
        };
      });
      return { overflow: list.scrollWidth - list.clientWidth, shown };
    }`;
    for (const { profile, overflow, shown } of await measureSpecimen<
      States<{
        name: string;
        narrow: boolean;
        header: boolean;
        noHeader: boolean;
        shown: boolean;
        held: boolean;
        height: number;
        outside: string[];
        sideways: boolean;
        scrolls: boolean;
      }>
    >("artifact-viewer", measure)) {
      assert.ok(overflow <= 0, `${profile}: the states overflow the column by ${overflow}`);
      assert.equal(
        shown.length,
        60,
        `${profile}: twenty-eight states twice, the three fits, and the focus state`,
      );
      for (const {
        name,
        narrow,
        header,
        noHeader,
        shown: content,
        held,
        height,
        scrolls,
        outside,
      } of shown) {
        const where = `${profile}, ${name}${narrow ? " at 20rem" : ""}`;
        assert.equal(header, !noHeader, `${where}: a header unless no-header`);
        assert.ok(content, `${where}: a region, a note, or a native element`);
        assert.equal(held, name === "run.log", `${where}: only run.log is held`);
        if (held) {
          assert.ok(Math.abs(height - 16) < 0.01, `${where}: held to ${height}rem, not 16rem`);
          assert.ok(scrolls, `${where}: held, its region scrolls down`);
        } else {
          assert.ok(!scrolls, `${where}: at full size, its region scrolls down`);
        }
        assert.deepEqual(outside, [], `${where}: parts outside the viewer`);
      }
      assert.equal(
        shown.filter(({ name }) => name === "run.log").length,
        3,
        `${profile}: run.log twice in the states and once focused`,
      );
      const [json] = shown.filter(({ name, narrow }) => name === "run.json" && narrow);
      assert.ok(json.sideways, `${profile}: run.json's id line scrolls sideways at 20rem`);
      assert.equal(
        shown.filter(({ noHeader }) => noHeader).length,
        14,
        `${profile}: the seven no-header states twice`,
      );
    }
  });

  test("in a parent that sizes it to its content, the artifact viewer takes its content's width, in every profile", async () => {
    const results = await measureSpecimen<Fits<Fit & { sideways: number }>>(
      "artifact-viewer",
      `() => {
        const column = document.querySelector("#fit .fits").getBoundingClientRect().width;
        return { fits: (${VIEWERS})("#fit").map((viewer) => {
          const region = viewer.shadowRoot.querySelector(".body");
          const width = viewer.getBoundingClientRect().width;
          return {
            parent: viewer.parentElement.className,
            sideways: region.scrollWidth - region.clientWidth,
            width,
            column,
          };
        }) };
      }`,
    );
    for (const { profile, fits } of results) {
      assert.deepEqual(
        fits.map(({ parent }) => parent),
        ["fit-inline-block", "fit-flex", "fit-grid"],
        `${profile}: the fit section's viewers`,
      );
      for (const { parent, sideways, width, column } of fits) {
        const where = `${parent} under ${profile}`;
        assert.ok(sideways <= 0, `${where}: the region scrolls sideways by ${sideways}`);
        assert.ok(width < column / 2, `${where}: ${width} wide in a ${column} column`);
      }
    }
  });

  const THREADS = `(section) => [...document.querySelectorAll(section + " sl-chat-thread")]`;

  test("the chat thread's specimen renders every state, at full size or held, within 20rem, its ids whole, in every profile", async () => {
    const measure = `() => {
      const list = document.querySelector(".narrow .states");
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const lines = ${LINES};
      const fills = (part) => {
        const parent = part.parentElement;
        const style = getComputedStyle(parent);
        const inner = parent.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        return part.getBoundingClientRect().width >= inner - 0.5;
      };
      const shown = (${THREADS})("main").map((thread) => {
        const root = thread.shadowRoot;
        const box = thread.getBoundingClientRect();
        const frame = root.querySelector(".frame");
        const parts = [...root.querySelectorAll(
          ".frame, ol, li, article, details, summary, .meta, .content, pre, table, p")];
        return {
          narrow: thread.closest(".narrow") !== null,
          items: thread.items.length,
          frame: frame !== null,
          held: thread.classList.contains("held"),
          height: box.height / rem,
          outside: parts
            .filter((part) => {
              const rect = part.getBoundingClientRect();
              return rect.left < box.left - 0.5 || rect.right > box.right + 0.5;
            })
            .map((part) => part.localName + "." + part.className),
          broken: [...root.querySelectorAll(".id, .name, .kind, .role, .status, .markdown code:not(pre code)")]
            .filter((part) => lines(part) > 1 && !(part.matches(".id, .name") && fills(part)))
            .map((part) => part.textContent),
          wrapped: [...root.querySelectorAll(".id, .name")]
            .filter((part) => lines(part) > 1)
            .map((part) => part.textContent),
          scrolls: frame.scrollHeight > frame.clientHeight,
        };
      });
      return { overflow: list.scrollWidth - list.clientWidth, shown };
    }`;
    for (const { profile, overflow, shown } of await measureSpecimen<
      States<{
        narrow: boolean;
        items: number;
        frame: boolean;
        held: boolean;
        height: number;
        outside: string[];
        broken: string[];
        wrapped: string[];
        scrolls: boolean;
      }>
    >("chat-thread", measure)) {
      assert.ok(overflow <= 0, `${profile}: the states overflow the column by ${overflow}`);
      assert.equal(
        shown.length,
        62,
        `${profile}: 29 states twice, the three fits, and the focus state`,
      );
      const wrapped = (narrow: boolean) =>
        shown.filter((thread) => thread.narrow === narrow).flatMap((thread) => thread.wrapped);
      assert.deepEqual(wrapped(false), [], `${profile}: wrapped at full width`);
      assert.ok(
        wrapped(true).includes("lookup_document_metadata_and_extracted_chunks"),
        `${profile}: the long call's name wraps at 20rem`,
      );
      assert.equal(
        shown.filter(({ held }) => held).length,
        9,
        `${profile}: the long content and the two streamed, twice each in the states and at 20rem, and the long content once focused`,
      );
      for (const [
        index,
        { narrow, frame, held, height, scrolls, outside, broken },
      ] of shown.entries()) {
        const where = `${profile}, thread ${index}${narrow ? " at 20rem" : ""}`;
        assert.ok(frame, `${where}: a frame`);
        if (held) {
          assert.ok(Math.abs(height - 16) < 0.01, `${where}: held to ${height}rem, not 16rem`);
          assert.ok(scrolls, `${where}: held, its frame scrolls down`);
        } else {
          assert.ok(!scrolls, `${where}: at full size, its frame scrolls down`);
        }
        assert.deepEqual(outside, [], `${where}: parts outside the thread`);
        assert.deepEqual(broken, [], `${where}: broken across lines`);
      }
    }
  });

  test("in a parent that sizes it to its content, the chat thread takes its content's width, in every profile", async () => {
    const results = await measureSpecimen<Fits<Fit & { sideways: number }>>(
      "chat-thread",
      `() => {
        const column = document.querySelector("#fit .fits").getBoundingClientRect().width;
        return { fits: (${THREADS})("#fit").map((thread) => {
          const frame = thread.shadowRoot.querySelector(".frame");
          return {
            parent: thread.parentElement.className,
            sideways: frame.scrollWidth - frame.clientWidth,
            width: thread.getBoundingClientRect().width,
            column,
          };
        }) };
      }`,
    );
    for (const { profile, fits } of results) {
      assert.deepEqual(
        fits.map(({ parent }) => parent),
        ["fit-inline-block", "fit-flex", "fit-grid"],
        `${profile}: the fit section's threads`,
      );
      for (const { parent, sideways, width, column } of fits) {
        const where = `${parent} under ${profile}`;
        assert.ok(sideways <= 0, `${where}: the frame scrolls sideways by ${sideways}`);
        assert.ok(width > 0 && width < column / 2, `${where}: ${width} wide in a ${column} column`);
      }
    }
  });
  const COMPOSERS = `(section) => [...document.querySelectorAll(section + " sl-composer")]`;

  test("the composer's specimen renders every state within 20rem, its field grown to its text up to eight lines, in every profile", async () => {
    const measure = `() => {
      const list = document.querySelector(".narrow .states");
      const shown = (${COMPOSERS})("main").map((composer) => {
        const root = composer.shadowRoot;
        const box = composer.getBoundingClientRect();
        const field = root.querySelector("textarea");
        const action = root.querySelector(".action");
        const rect = field.getBoundingClientRect();
        const button = action.getBoundingClientRect();
        const style = getComputedStyle(field);
        const line = parseFloat(style.lineHeight);
        const chrome =
          parseFloat(style.paddingBlockStart) + parseFloat(style.paddingBlockEnd) +
          parseFloat(style.borderBlockStartWidth) + parseFloat(style.borderBlockEndWidth);
        return {
          narrow: composer.closest(".narrow") !== null,
          busy: composer.busy,
          action: action.classList.contains("stop") ? "stop" : "send",
          lines: Math.round((rect.height - chrome) / line),
          oneLine: Math.abs(rect.height - button.height) < 0.5,
          bottoms: Math.abs(rect.bottom - button.bottom),
          outside: [field, action]
            .filter((part) => {
              const r = part.getBoundingClientRect();
              return r.left < box.left - 0.5 || r.right > box.right + 0.5 ||
                r.top < box.top - 0.5 || r.bottom > box.bottom + 0.5;
            })
            .map((part) => part.localName),
          scrolls: field.scrollHeight > field.clientHeight,
          sideways: field.scrollWidth > field.clientWidth,
        };
      });
      return { overflow: list.scrollWidth - list.clientWidth, shown };
    }`;
    for (const { profile, overflow, shown } of await measureSpecimen<
      States<{
        narrow: boolean;
        busy: boolean;
        action: string;
        lines: number;
        oneLine: boolean;
        bottoms: number;
        outside: string[];
        scrolls: boolean;
        sideways: boolean;
      }>
    >("composer", measure)) {
      assert.ok(overflow <= 0, `${profile}: the states overflow the column by ${overflow}`);
      assert.equal(
        shown.length,
        20,
        `${profile}: eight states twice, the three fits, and the focus state`,
      );
      assert.equal(
        shown.filter(({ scrolls }) => scrolls).length,
        2,
        `${profile}: the fourteen lines' field scrolls, in the states and at 20rem`,
      );
      for (const [
        index,
        { narrow, busy, action, lines, oneLine, bottoms, outside, scrolls, sideways },
      ] of shown.entries()) {
        const where = `${profile}, composer ${index}${narrow ? " at 20rem" : ""}`;
        assert.equal(action, busy ? "stop" : "send", `${where}: busy ${busy} shows ${action}`);
        assert.ok(lines >= 1 && lines <= 8, `${where}: the field is ${lines} lines tall`);
        if (scrolls)
          assert.equal(lines, 8, `${where}: scrolls at ${lines} lines, short of the bound`);
        assert.equal(oneLine, lines === 1, `${where}: one line is the control's height`);
        assert.ok(bottoms < 0.5, `${where}: the control sits at the field's block end`);
        assert.ok(!sideways, `${where}: the field scrolls sideways`);
        assert.deepEqual(outside, [], `${where}: parts outside the composer`);
      }
    }
  });

  test("in a parent that sizes it to its content, the composer takes its draft's width, in every profile", async () => {
    const results = await measureSpecimen<Fits<Fit & { sideways: number; oneLine: boolean }>>(
      "composer",
      `() => {
        const column = document.querySelector("#fit .fits").getBoundingClientRect().width;
        return { fits: (${COMPOSERS})("#fit").map((composer) => {
          const root = composer.shadowRoot;
          const field = root.querySelector("textarea");
          return {
            parent: composer.parentElement.className,
            sideways: field.scrollWidth - field.clientWidth,
            oneLine: Math.abs(
              field.getBoundingClientRect().height -
                root.querySelector(".action").getBoundingClientRect().height,
            ) < 0.5,
            width: composer.getBoundingClientRect().width,
            column,
          };
        }) };
      }`,
    );
    for (const { profile, fits } of results) {
      assert.deepEqual(
        fits.map(({ parent }) => parent),
        ["fit-inline-block", "fit-flex", "fit-grid"],
        `${profile}: the fit section's composers`,
      );
      for (const { parent, sideways, oneLine, width, column } of fits) {
        const where = `${parent} under ${profile}`;
        assert.ok(sideways <= 0, `${where}: the field scrolls sideways by ${sideways}`);
        assert.ok(oneLine, `${where}: the draft wraps`);
        assert.ok(width > 0 && width < column / 2, `${where}: ${width} wide in a ${column} column`);
      }
    }
  });
  const DROPZONES = `(section) => [...document.querySelectorAll(section + " sl-upload-dropzone")]`;

  test("the upload dropzone's specimen renders every state within 20rem, its names cut short and its sizes and labels whole, in every profile", async () => {
    const measure = `() => {
      const list = document.querySelector(".narrow .states");
      const lines = ${LINES};
      const shown = (${DROPZONES})("main").map((dropzone) => {
        const root = dropzone.shadowRoot;
        const box = dropzone.getBoundingClientRect();
        const parts = [...root.querySelectorAll(
          ".zone, .prompt, button, .upload, .name, .end, .detail, progress, .bytes, .message")];
        const items = [...root.querySelectorAll(".upload")];
        return {
          narrow: dropzone.closest(".narrow") !== null,
          zone: root.querySelector(".zone") !== null,
          over: root.querySelector(".zone.over") !== null,
          outside: parts
            .filter((part) => {
              const rect = part.getBoundingClientRect();
              return rect.left < box.left - 0.5 || rect.right > box.right + 0.5;
            })
            .map((part) => part.localName + "." + part.className),
          broken: [
            ...[...root.querySelectorAll(".name, .state, button")].filter((part) => lines(part) > 1),
            ...[...root.querySelectorAll(".bytes")].filter((part) =>
              part.getBoundingClientRect().height > 1.5 * parseFloat(getComputedStyle(part).lineHeight)),
          ].map((part) => part.textContent.trim()),
          heights: [...new Set(items
            .filter((item) => !item.querySelector(".message"))
            .map((item) => item.clientHeight))],
        };
      });
      return { overflow: list.scrollWidth - list.clientWidth, shown };
    }`;
    for (const { profile, overflow, shown } of await measureSpecimen<
      States<{
        narrow: boolean;
        zone: boolean;
        over: boolean;
        outside: string[];
        broken: string[];
        heights: number[];
      }>
    >("upload-dropzone", measure)) {
      assert.ok(overflow <= 0, `${profile}: the states overflow the column by ${overflow}`);
      assert.equal(
        shown.length,
        26,
        `${profile}: eleven states twice, the three fits, and the focus state`,
      );
      assert.equal(
        shown.filter(({ over }) => over).length,
        2,
        `${profile}: the drag-over state, in the states and at 20rem`,
      );
      for (const [index, { narrow, zone, outside, broken, heights }] of shown.entries()) {
        const where = `${profile}, dropzone ${index}${narrow ? " at 20rem" : ""}`;
        assert.ok(zone, `${where}: a zone`);
        assert.deepEqual(outside, [], `${where}: parts outside the dropzone`);
        assert.deepEqual(broken, [], `${where}: broken across lines`);
        assert.ok(heights.length <= 1, `${where}: uploads of heights ${heights}`);
      }
      assert.ok(
        shown.some(({ heights }) => heights.length > 0),
        `${profile}: an upload without a message to measure`,
      );
    }
  });

  test("in a parent that sizes it to its content, the upload dropzone takes its content's width, in every profile", async () => {
    const results = await measureSpecimen<Fits<Fit & { oneLine: boolean; cut: boolean }>>(
      "upload-dropzone",
      `() => {
        const column = document.querySelector("#fit .fits").getBoundingClientRect().width;
        return { fits: (${DROPZONES})("#fit").map((dropzone) => {
          const root = dropzone.shadowRoot;
          const prompt = root.querySelector(".prompt").getBoundingClientRect();
          const pick = root.querySelector(".pick").getBoundingClientRect();
          const name = root.querySelector(".name");
          return {
            parent: dropzone.parentElement.className,
            oneLine: Math.abs((prompt.top + prompt.bottom) / 2 - (pick.top + pick.bottom) / 2) < 1,
            cut: name.scrollWidth > name.clientWidth,
            width: dropzone.getBoundingClientRect().width,
            column,
          };
        }) };
      }`,
    );
    for (const { profile, fits } of results) {
      assert.deepEqual(
        fits.map(({ parent }) => parent),
        ["fit-inline-block", "fit-flex", "fit-grid"],
        `${profile}: the fit section's dropzones`,
      );
      for (const { parent, oneLine, cut, width, column } of fits) {
        const where = `${parent} under ${profile}`;
        assert.ok(oneLine, `${where}: the prompt and the button wrap`);
        assert.ok(!cut, `${where}: the name is cut short`);
        assert.ok(width > 0 && width < column / 2, `${where}: ${width} wide in a ${column} column`);
      }
    }
  });

  const TIMELINES = `(section) => [...document.querySelectorAll(section + " sl-stage-timeline")]`;

  test("the stage timeline's specimen renders every state within 20rem, its names, labels, and times whole, in every profile", async () => {
    const measure = `() => {
      const list = document.querySelector(".narrow .states");
      const lines = ${LINES};
      const shown = (${TIMELINES})("main").map((timeline) => {
        const root = timeline.shadowRoot;
        const box = timeline.getBoundingClientRect();
        const steps = [...root.querySelectorAll(".stage")];
        return {
          narrow: timeline.closest(".narrow") !== null,
          steps: steps.length,
          outside: [...root.querySelectorAll(".stage, .marker, .name, .detail, .label, .when, .reason")]
            .filter((part) => {
              const rect = part.getBoundingClientRect();
              return rect.left < box.left - 0.5 || rect.right > box.right + 0.5;
            })
            .map((part) => part.localName + "." + part.className),
          broken: [...root.querySelectorAll(".name, .label > .shown, time")]
            .filter((part) => lines(part) > 1)
            .map((part) => part.textContent),
          heights: [...new Set(steps.slice(0, -1).map((step) => Math.round(
            step.getBoundingClientRect().height - (step.querySelector(".reason")?.getBoundingClientRect().height ?? 0))))],
          details: [...new Set(steps.map((step) => Math.round(step.querySelector(".detail").getBoundingClientRect().height)))],
        };
      });
      return { overflow: list.scrollWidth - list.clientWidth, shown };
    }`;
    for (const { profile, overflow, shown } of await measureSpecimen<
      States<{
        narrow: boolean;
        steps: number;
        outside: string[];
        broken: string[];
        heights: number[];
        details: number[];
      }>
    >("stage-timeline", measure)) {
      assert.ok(overflow <= 0, `${profile}: the states overflow the column by ${overflow}`);
      assert.equal(shown.length, 11, `${profile}: four states twice, and the three fits`);
      for (const [index, { narrow, steps, outside, broken, heights, details }] of shown.entries()) {
        const where = `${profile}, timeline ${index}${narrow ? " at 20rem" : ""}`;
        assert.equal(steps, 5, `${where}: the stages`);
        assert.deepEqual(outside, [], `${where}: parts outside the timeline`);
        assert.deepEqual(broken, [], `${where}: broken across lines`);
        assert.equal(heights.length, 1, `${where}: steps of heights ${heights}`);
        assert.equal(details.length, 1, `${where}: detail lines of heights ${details}`);
      }
    }
  });

  test("in a parent that sizes it to its content, the stage timeline takes its content's width, in every profile", async () => {
    const results = await measureSpecimen<Fits<Fit & { complete: number; oneLine: boolean }>>(
      "stage-timeline",
      `() => {
        const column = document.querySelector("#fit .fits").getBoundingClientRect().width;
        return { fits: (${TIMELINES})("#fit").map((timeline) => {
          const root = timeline.shadowRoot;
          return {
            parent: timeline.parentElement.className,
            complete: root.querySelectorAll(".complete").length,
            oneLine: [...root.querySelectorAll(".complete")].every((step) => {
              const label = step.querySelector(".label").getBoundingClientRect();
              const time = step.querySelector("time").getBoundingClientRect();
              return Math.abs(label.top - time.top) < 1;
            }),
            width: timeline.getBoundingClientRect().width,
            column,
          };
        }) };
      }`,
    );
    for (const { profile, fits } of results) {
      assert.deepEqual(
        fits.map(({ parent }) => parent),
        ["fit-inline-block", "fit-flex", "fit-grid"],
        `${profile}: the fit section's timelines`,
      );
      for (const { parent, complete, oneLine, width, column } of fits) {
        const where = `${parent} under ${profile}`;
        assert.ok(complete > 0, `${where}: a complete stage`);
        assert.ok(oneLine, `${where}: a label and its time wrap`);
        assert.ok(width > 0 && width < column / 2, `${where}: ${width} wide in a ${column} column`);
      }
    }
  });

  const LOGS = `(section) => [...document.querySelectorAll(section + " sl-event-log")]`;

  test("the event log's specimen renders every state, at full size or held, within 20rem, its types, times, labels, and values on one line, its identifiers' text whole, in every profile", async () => {
    const measure = `() => {
      const list = document.querySelector(".narrow .states");
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const lines = ${LINES};
      const shown = (${LOGS})("main").map((log) => {
        const root = log.shadowRoot;
        const box = log.getBoundingClientRect();
        const frame = root.querySelector(".frame");
        const parts = [...root.querySelectorAll(
          ".frame, ol, li, .head, .type, .when, .meta, .pair, dt, dd, details, summary, pre, .no-data, .empty")];
        return {
          narrow: log.closest(".narrow") !== null,
          events: log.events.length,
          frame: frame !== null,
          held: log.classList.contains("held"),
          height: box.height / rem,
          outside: parts
            .filter((part) => {
              const rect = part.getBoundingClientRect();
              return rect.left < box.left - 0.5 || rect.right > box.right + 0.5;
            })
            .map((part) => part.localName + "." + part.className),
          broken: [...root.querySelectorAll(".type, .when, dt, dd, summary, .no-data")]
            .filter((part) => lines(part) > 1)
            .map((part) => part.textContent),
          identifiers: [...root.querySelectorAll(".event")].map((event, index) => ({
            texts: [...event.querySelectorAll("dd.text-truncate")].map((dd) => dd.textContent),
            titles: [...event.querySelectorAll("dd.text-truncate")].map((dd) => dd.title),
            expected: [log.events[index].subject, log.events[index].id].filter(Boolean),
          })),
          scrolls: frame.scrollHeight > frame.clientHeight,
        };
      });
      return { overflow: list.scrollWidth - list.clientWidth, shown };
    }`;
    for (const { profile, overflow, shown } of await measureSpecimen<
      States<{
        narrow: boolean;
        events: number;
        frame: boolean;
        held: boolean;
        height: number;
        outside: string[];
        broken: string[];
        identifiers: { texts: string[]; titles: string[]; expected: string[] }[];
        scrolls: boolean;
      }>
    >("event-log", measure)) {
      assert.ok(overflow <= 0, `${profile}: the states overflow the column by ${overflow}`);
      assert.equal(
        shown.length,
        16,
        `${profile}: six states twice, the three fits, and the focus state`,
      );
      assert.equal(
        shown.filter(({ held }) => held).length,
        2,
        `${profile}: the many events once in the states and once at 20rem`,
      );
      for (const [
        index,
        { narrow, frame, held, height, scrolls, outside, broken, identifiers },
      ] of shown.entries()) {
        const where = `${profile}, log ${index}${narrow ? " at 20rem" : ""}`;
        assert.ok(frame, `${where}: a frame`);
        if (held) {
          assert.ok(Math.abs(height - 16) < 0.01, `${where}: held to ${height}rem, not 16rem`);
          assert.ok(scrolls, `${where}: held, its frame scrolls down`);
        } else {
          assert.ok(!scrolls, `${where}: at full size, its frame scrolls down`);
        }
        assert.deepEqual(outside, [], `${where}: parts outside the log`);
        assert.deepEqual(broken, [], `${where}: broken across lines`);
        for (const [event, { texts, titles, expected }] of identifiers.entries()) {
          assert.deepEqual(texts, expected, `${where}, event ${event}: its identifiers' text`);
          assert.deepEqual(titles, expected, `${where}, event ${event}: its identifiers' titles`);
        }
      }
    }
  });

  test("in a log narrower than its identifiers, each subject and id ends in an ellipsis on one line, its whole text kept, and the log never scrolls sideways, in every profile", async () => {
    const measure = `async () => {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const lines = ${LINES};
      let log = document.querySelector("#cut sl-event-log");
      if (!log) {
        const holder = document.createElement("div");
        holder.id = "cut";
        holder.style.inlineSize = "12rem";
        log = document.createElement("sl-event-log");
        log.events = document
          .querySelector("sl-event-log.held")
          .events.map(({ time, ...event }) => event);
        holder.append(log);
        document.querySelector("main").append(holder);
        await log.updateComplete;
      }
      const root = log.shadowRoot;
      const frame = root.querySelector(".frame");
      const box = log.getBoundingClientRect();
      return {
        width: box.width / rem,
        events: log.events.length,
        values: [...root.querySelectorAll(".event")].flatMap((event, index) =>
          [...event.querySelectorAll("dd.text-truncate")].map((dd, at) => {
            const rect = dd.getBoundingClientRect();
            return {
              expected: [log.events[index].subject, log.events[index].id].filter(Boolean)[at],
              text: dd.textContent,
              title: dd.title,
              lines: lines(dd),
              cut: dd.scrollWidth > dd.clientWidth,
              ellipsis: getComputedStyle(dd).textOverflow,
              inside: rect.left >= box.left - 0.5 && rect.right <= box.right + 0.5,
            };
          })),
        sideways: frame.scrollWidth - frame.clientWidth,
      };
    }`;
    for (const { profile, width, events, values, sideways } of await measureSpecimen<{
      width: number;
      events: number;
      values: {
        expected: string;
        text: string;
        title: string;
        lines: number;
        cut: boolean;
        ellipsis: string;
        inside: boolean;
      }[];
      sideways: number;
    }>("event-log", measure)) {
      assert.ok(Math.abs(width - 12) < 0.01, `${profile}: the log ${width}rem wide, not 12rem`);
      assert.equal(values.length, events * 2, `${profile}: each event's subject and id`);
      for (const { expected, text, title, lines, cut, ellipsis, inside } of values) {
        const where = `${profile}, ${expected}`;
        assert.equal(text, expected, `${where}: its text`);
        assert.equal(title, expected, `${where}: its title`);
        assert.equal(lines, 1, `${where}: on ${lines} lines`);
        assert.ok(cut, `${where}: whole in a 12rem log`);
        assert.equal(ellipsis, "ellipsis", `${where}: cut without an ellipsis`);
        assert.ok(inside, `${where}: outside the log`);
      }
      assert.ok(sideways <= 0, `${profile}: the frame scrolls sideways by ${sideways}`);
    }
  });

  test("in a parent that sizes it to its content, the event log takes its type's and time's width, in every profile", async () => {
    const results = await measureSpecimen<
      Fits<
        Fit & {
          events: number;
          metadata: number;
          oneLine: boolean;
          outside: number;
          sideways: number;
        }
      >
    >(
      "event-log",
      `() => {
        const column = document.querySelector("#fit .fits").getBoundingClientRect().width;
        return { fits: (${LOGS})("#fit").map((log) => {
          const root = log.shadowRoot;
          const frame = root.querySelector(".frame");
          const box = log.getBoundingClientRect();
          return {
            parent: log.parentElement.className,
            events: root.querySelectorAll(".event").length,
            metadata: root.querySelectorAll("dt, dd").length,
            oneLine: [...root.querySelectorAll(".event")].every((event) => {
              const type = event.querySelector(".type").getBoundingClientRect();
              const time = event.querySelector(".when").getBoundingClientRect();
              return Math.abs(type.bottom - time.bottom) < 2;
            }),
            outside: [...root.querySelectorAll("dt, dd")].filter((part) => {
              const rect = part.getBoundingClientRect();
              return rect.left < box.left - 0.5 || rect.right > box.right + 0.5;
            }).length,
            sideways: frame.scrollWidth - frame.clientWidth,
            width: box.width,
            column,
          };
        }) };
      }`,
    );
    for (const { profile, fits } of results) {
      assert.deepEqual(
        fits.map(({ parent }) => parent),
        ["fit-inline-block", "fit-flex", "fit-grid"],
        `${profile}: the fit section's logs`,
      );
      for (const { parent, events, metadata, oneLine, outside, sideways, width, column } of fits) {
        const where = `${parent} under ${profile}`;
        assert.equal(events, 2, `${where}: the run's first two events`);
        assert.ok(metadata > 0, `${where}: metadata`);
        assert.ok(oneLine, `${where}: a type and its time wrap`);
        assert.equal(outside, 0, `${where}: metadata outside the log`);
        assert.ok(sideways <= 0, `${where}: the frame scrolls sideways by ${sideways}`);
        assert.ok(width > 0 && width < column / 2, `${where}: ${width} wide in a ${column} column`);
      }
    }
  });

  const SEARCHES = `(section) => [...document.querySelectorAll(section + " sl-search-results")]`;

  test("the search results' specimen renders every state within 20rem, their field labels whole, in every profile", async () => {
    const measure = `() => {
      const list = document.querySelector(".narrow .states");
      const lines = ${LINES};
      const shown = (${SEARCHES})("main").map((results) => {
        const root = results.shadowRoot;
        const box = results.getBoundingClientRect();
        const parts = [...root.querySelectorAll(".status, ul, li, button, .head, .name, .field, .snippet, mark")];
        return {
          narrow: results.closest(".narrow") !== null,
          fit: results.closest("#fit") !== null,
          status: root.querySelector(".status[role=status]") !== null,
          outside: parts
            .filter((part) => {
              const rect = part.getBoundingClientRect();
              return rect.left < box.left - 0.5 || rect.right > box.right + 0.5;
            })
            .map((part) => part.localName + "." + part.className),
          broken: [...root.querySelectorAll(".field")]
            .filter((part) => lines(part) > 1)
            .map((part) => part.textContent),
          beside: [...root.querySelectorAll(".match")]
            .filter((button) => button.querySelector(".name").textContent.length < 24)
            .map((button) => {
              const name = button.querySelector(".name").getBoundingClientRect();
              const field = button.querySelector(".field").getBoundingClientRect();
              const head = button.querySelector(".head").getBoundingClientRect();
              return Math.abs(name.bottom - field.bottom) < 3 && Math.abs(field.right - head.right) < 1;
            }),
        };
      });
      return { overflow: list.scrollWidth - list.clientWidth, shown };
    }`;
    for (const { profile, overflow, shown } of await measureSpecimen<
      States<{
        narrow: boolean;
        fit: boolean;
        status: boolean;
        outside: string[];
        broken: string[];
        beside: boolean[];
      }>
    >("search-results", measure)) {
      assert.ok(overflow <= 0, `${profile}: the states overflow the column by ${overflow}`);
      assert.equal(
        shown.length,
        26,
        `${profile}: eleven states twice, the three fits, and the focus state`,
      );
      for (const [index, { narrow, fit, status, outside, broken, beside }] of shown.entries()) {
        const where = `${profile}, results ${index}${narrow ? " at 20rem" : ""}`;
        assert.ok(status, `${where}: a status line`);
        assert.deepEqual(outside, [], `${where}: parts outside the results`);
        assert.deepEqual(broken, [], `${where}: a field label broken across lines`);
        if (!narrow && !fit) {
          assert.ok(beside.every(Boolean), `${where}: a short name's field label off its line`);
        }
      }
      assert.ok(
        shown.some(({ narrow, fit, beside }) => !narrow && !fit && beside.length > 0),
        `${profile}: a short name at full width`,
      );
    }
  });

  test("in a parent that sizes them to their content, the search results take their content's width, in every profile", async () => {
    const results = await measureSpecimen<
      Fits<Fit & { matches: number; oneLine: boolean; outside: number }>
    >(
      "search-results",
      `() => {
        const column = document.querySelector("#fit .fits").getBoundingClientRect().width;
        const lines = ${LINES};
        return { fits: (${SEARCHES})("#fit").map((results) => {
          const root = results.shadowRoot;
          const box = results.getBoundingClientRect();
          return {
            parent: results.parentElement.className,
            matches: root.querySelectorAll(".match").length,
            oneLine: [...root.querySelectorAll(".match")].every((button) => {
              const name = button.querySelector(".name").getBoundingClientRect();
              const field = button.querySelector(".field").getBoundingClientRect();
              const snippet = button.querySelector(".snippet");
              return Math.abs(name.bottom - field.bottom) < 3 && (!snippet || lines(snippet) === 1);
            }),
            outside: [...root.querySelectorAll(".status, button, .name, .field, .snippet")].filter((part) => {
              const rect = part.getBoundingClientRect();
              return rect.left < box.left - 0.5 || rect.right > box.right + 0.5;
            }).length,
            width: box.width,
            column,
          };
        }) };
      }`,
    );
    for (const { profile, fits } of results) {
      assert.deepEqual(
        fits.map(({ parent }) => parent),
        ["fit-inline-block", "fit-flex", "fit-grid"],
        `${profile}: the fit section's results`,
      );
      for (const { parent, matches, oneLine, outside, width, column } of fits) {
        const where = `${parent} under ${profile}`;
        assert.equal(matches, 2, `${where}: the two short matches`);
        assert.ok(oneLine, `${where}: a name and its label, or a snippet, wrap`);
        assert.equal(outside, 0, `${where}: parts outside the results`);
        assert.ok(width > 0 && width < column / 2, `${where}: ${width} wide in a ${column} column`);
      }
    }
  });

  const LISTS = `(section) => [...document.querySelectorAll(section + " sl-document-list")]`;
  const LIST_PARTS = `(list) => {
    const root = list.shadowRoot;
    const pagination = root.querySelector("sl-pagination");
    const parts = [
      ["status", root.querySelector(".status")],
      ["pagination", pagination],
      ["controls", pagination.shadowRoot.querySelector(".pagination")],
      ...[...root.querySelectorAll("sl-entry")].flatMap((entry) =>
        ["button", ".name", ".status", ".meta", ".size", ".clock"].map((selector) => [
          entry.item.name + " " + selector,
          entry.shadowRoot.querySelector(selector),
        ]),
      ),
    ];
    return parts.filter(([, element]) => element !== null);
  }`;

  test("the document list's specimen renders every state within 20rem, its sizes and clocks whole, in every profile", async () => {
    const measure = `() => {
      const list = document.querySelector(".narrow .states");
      const lines = ${LINES};
      const parts = ${LIST_PARTS};
      const shown = (${LISTS})("main").map((element) => {
        const root = element.shadowRoot;
        const box = element.getBoundingClientRect();
        const outside = (rect, within) => rect.left < within.left - 0.5 || rect.right > within.right + 0.5;
        const entries = [...root.querySelectorAll("sl-entry")];
        return {
          narrow: element.closest(".narrow") !== null,
          status: root.querySelector(".status[role=status]") !== null,
          paginations: root.querySelectorAll("sl-pagination").length,
          outside: parts(element)
            .filter(([, part]) => outside(part.getBoundingClientRect(), box))
            .map(([name]) => name),
          spills: entries.flatMap((entry) => {
            const button = entry.shadowRoot.querySelector("button").getBoundingClientRect();
            return [".name", ".status", ".meta"]
              .filter((selector) => outside(entry.shadowRoot.querySelector(selector).getBoundingClientRect(), button))
              .map((selector) => entry.item.name + " " + selector);
          }),
          broken: entries.flatMap((entry) =>
            [".size", ".clock"]
              .map((selector) => entry.shadowRoot.querySelector(selector))
              .filter((part) => part !== null && lines(part) > 1)
              .map((part) => part.textContent),
          ),
          starts: [...new Set(entries.map((entry) => Math.round(entry.getBoundingClientRect().left)))],
          edge: Math.round(root.querySelector("sl-pagination").getBoundingClientRect().left),
        };
      });
      return { overflow: list.scrollWidth - list.clientWidth, shown };
    }`;
    for (const { profile, overflow, shown } of await measureSpecimen<
      States<{
        narrow: boolean;
        status: boolean;
        paginations: number;
        outside: string[];
        spills: string[];
        broken: string[];
        starts: number[];
        edge: number;
      }>
    >("document-list", measure)) {
      assert.ok(overflow <= 0, `${profile}: the states overflow the column by ${overflow}`);
      assert.equal(
        shown.length,
        22,
        `${profile}: nine states twice, the three fits, and the focus state`,
      );
      for (const [
        index,
        { narrow, status, paginations, outside, spills, broken, starts, edge },
      ] of shown.entries()) {
        const where = `${profile}, list ${index}${narrow ? " at 20rem" : ""}`;
        assert.ok(status, `${where}: a status line`);
        assert.equal(paginations, 1, `${where}: one pagination`);
        assert.deepEqual(outside, [], `${where}: parts outside the list`);
        assert.deepEqual(spills, [], `${where}: parts outside their entry`);
        assert.deepEqual(broken, [], `${where}: a size or a clock broken across lines`);
        assert.ok(
          starts.every((start) => start === edge),
          `${where}: entries start at ${starts}, the pagination at ${edge}`,
        );
      }
      assert.ok(
        shown.some(({ starts }) => starts.length > 0),
        `${profile}: a list with entries`,
      );
    }
  });

  test("in a parent that sizes it to its content, the document list takes its content's width, in every profile", async () => {
    const results = await measureSpecimen<
      Fits<
        Fit & { head: boolean; meta: boolean; controls: boolean; entries: number; outside: number }
      >
    >(
      "document-list",
      `() => {
        const column = document.querySelector("#fit .fits").getBoundingClientRect().width;
        const parts = ${LIST_PARTS};
        return { fits: (${LISTS})("#fit").map((element) => {
          const box = element.getBoundingClientRect();
          const entry = element.shadowRoot.querySelector("sl-entry").shadowRoot;
          const rect = (root, selector) => root.querySelector(selector).getBoundingClientRect();
          const controls = element.shadowRoot.querySelector("sl-pagination").shadowRoot;
          return {
            parent: element.parentElement.className,
            head: Math.abs(rect(entry, ".name").bottom - rect(entry, ".status").bottom) < 3,
            meta:
              rect(entry, ".meta").height <=
              Math.max(...[...entry.querySelector(".meta").children].map((part) => part.getBoundingClientRect().height)) + 0.5,
            controls: Math.abs(rect(controls, "select").top - rect(controls, ".page-step:last-child").top) < 8,
            entries: element.shadowRoot.querySelectorAll("sl-entry").length,
            outside: parts(element).filter(([, part]) => {
              const at = part.getBoundingClientRect();
              return at.left < box.left - 0.5 || at.right > box.right + 0.5;
            }).length,
            width: box.width,
            column,
          };
        }) };
      }`,
    );
    for (const { profile, fits } of results) {
      assert.deepEqual(
        fits.map(({ parent }) => parent),
        ["fit-inline-block", "fit-flex", "fit-grid"],
        `${profile}: the fit section's lists`,
      );
      for (const { parent, head, meta, controls, entries, outside, width, column } of fits) {
        const where = `${parent} under ${profile}`;
        assert.equal(entries, 1, `${where}: the one short document`);
        assert.ok(head, `${where}: the name and its status wrap`);
        assert.ok(meta, `${where}: the meta wraps`);
        assert.ok(controls, `${where}: the controls wrap`);
        assert.equal(outside, 0, `${where}: parts outside the list`);
        assert.ok(
          width > 0 && width < column * 0.6,
          `${where}: ${width} wide in a ${column} column`,
        );
      }
    }
  });
});
