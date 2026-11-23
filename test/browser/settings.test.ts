// Adapted from spike-html-hosting-components (9fa5850): test/browser/settings.test.ts, on @standards-lab/web-tooling, its stores read back through the foundation's modules, the host's change events and the arrow keys, open, document change, and focus cases added, and the theme-menu request case dropped.

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

import { launch, SETTLED, until } from "@standards-lab/web-tooling/browser.js";
import type { Browser, Page } from "@standards-lab/web-tooling/browser.js";
import { serve } from "@standards-lab/web-tooling/server.js";
import type { Server } from "@standards-lab/web-tooling/server.js";

import { served } from "./support/served.ts";

interface Row {
  key: string;
  legend: string;
  options: string[];
  checked: string | null;
}

interface Change {
  target: string;
  bubbles: boolean;
  composed: boolean;
}

const FIXTURE = "/test/fixtures/settings.html";
const SHADOW = `document.querySelector("sl-settings").shadowRoot`;
const SETTINGS = `document.querySelector("#settings")`;
const HELP = `document.querySelector("#help")`;
const PREFERENCES = "web-foundation.preferences";
const KEYS_STORAGE = "web-foundation.keys";
const SWITCH_LABEL = "Character-key shortcuts (combinations with Control, Alt, or Meta stay on)";

const KEYS = {
  h: { key: "h", code: "KeyH", windowsVirtualKeyCode: 72, text: "h" },
  j: { key: "j", code: "KeyJ", windowsVirtualKeyCode: 74, text: "j" },
  k: { key: "k", code: "KeyK", windowsVirtualKeyCode: 75, text: "k" },
  l: { key: "l", code: "KeyL", windowsVirtualKeyCode: 76, text: "l" },
  p: { key: "p", code: "KeyP", windowsVirtualKeyCode: 80, text: "p" },
  s: { key: "s", code: "KeyS", windowsVirtualKeyCode: 83, text: "s" },
  "?": { key: "?", code: "Slash", windowsVirtualKeyCode: 191, modifiers: 8, text: "?" },
  ArrowUp: { key: "ArrowUp", code: "ArrowUp", windowsVirtualKeyCode: 38 },
  ArrowDown: { key: "ArrowDown", code: "ArrowDown", windowsVirtualKeyCode: 40 },
  ArrowLeft: { key: "ArrowLeft", code: "ArrowLeft", windowsVirtualKeyCode: 37 },
  ArrowRight: { key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 },
  Escape: { key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 },
  "Control+k": { key: "k", code: "KeyK", windowsVirtualKeyCode: 75, modifiers: 2 },
};

async function press(page: Page, name: keyof typeof KEYS): Promise<void> {
  const { text, ...key } = { text: undefined, ...KEYS[name] };
  await page.cdp("Input.dispatchKeyEvent", {
    type: text === undefined ? "rawKeyDown" : "keyDown",
    ...key,
    ...(text === undefined ? {} : { text, unmodifiedText: text }),
  });
  await page.cdp("Input.dispatchKeyEvent", { type: "keyUp", ...key });
}

const rows = (page: Page): Promise<Row[]> =>
  page.evaluate(`[...${SHADOW}.querySelectorAll(".theme-menu-row")].map((row) => ({
    key: row.dataset.section,
    legend: row.querySelector("legend").textContent.trim(),
    options: [...row.querySelectorAll("input")].map((radio) => radio.value),
    checked: row.querySelector(":checked")?.value ?? null,
  }))`);

const checked = async (page: Page): Promise<Record<string, string | null>> =>
  Object.fromEntries((await rows(page)).map((row) => [row.key, row.checked]));

const root = (page: Page): Promise<Record<string, string | null>> =>
  page.evaluate(`(() => {
    const el = document.documentElement;
    return {
      color: el.getAttribute("data-palette"),
      scheme: el.getAttribute("data-scheme"),
      space: el.getAttribute("data-space"),
      type: el.getAttribute("data-type"),
    };
  })()`);

const stored = (page: Page): Promise<Record<string, string> | null> =>
  page.evaluate(`window.preferences.read()`);

const keySettings = (page: Page): Promise<{ enabled: boolean; wait: number }> =>
  page.evaluate(`window.keys.settings()`);

const storedKeys = (page: Page): Promise<Record<string, unknown> | null> =>
  page.evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(KEYS_STORAGE)}) ?? "null")`);

const rendered = (page: Page): Promise<unknown> =>
  page.evaluate(`document.querySelector("sl-settings").updateComplete`);

const focusedRow = (page: Page): Promise<{ key: string; value: string } | null> =>
  page.evaluate(`(() => {
    const el = ${SHADOW}.activeElement;
    const row = el?.closest(".theme-menu-row");
    return row ? { key: row.dataset.section, value: el.value } : null;
  })()`);

const listen = (page: Page): Promise<void> =>
  page.evaluate(`document.addEventListener("change", (event) =>
    (window.changes ??= []).push({
      target: event.target.localName,
      bubbles: event.bubbles,
      composed: event.composed,
    }))`);

const changes = (page: Page): Promise<Change[]> => page.evaluate(`window.changes ?? []`);

interface Placed {
  host: number;
  rows: { left: number; right: number; top: number; bottom: number };
  preview: { left: number; right: number; top: number; bottom: number };
  outside: string[];
  overflowing: string[];
}

const place = (page: Page, inlineSize: string): Promise<Placed> =>
  page.evaluate(`(async () => {
    const host = document.querySelector("sl-settings");
    const box = document.createElement("div");
    box.style.inlineSize = ${JSON.stringify(inlineSize)};
    document.body.append(box);
    box.append(host);
    await host.updateComplete;
    const bounds = host.getBoundingClientRect();
    const rect = (el) => {
      const { left, right, top, bottom } = el.getBoundingClientRect();
      return { left, right, top, bottom };
    };
    const name = (el) => el.localName + (el.className ? "." + el.className : "");
    const drawn = [...${SHADOW}.querySelectorAll("*")].filter((el) => el.checkVisibility() &&
      el.getBoundingClientRect().width > 1);
    return {
      host: bounds.width,
      rows: rect(${SHADOW}.querySelector(".theme-menu-rows")),
      preview: rect(${SHADOW}.querySelector(".theme-menu-preview")),
      outside: drawn.filter((el) => {
        const { left, right } = el.getBoundingClientRect();
        return left < bounds.left - 0.5 || right > bounds.right + 0.5;
      }).map(name),
      overflowing: [host, ...drawn].filter((el) => el.scrollWidth > el.clientWidth + 1 &&
        getComputedStyle(el).display !== "inline").map(name),
    };
  })()`);

const intersect = ({ rows, preview }: Placed): boolean =>
  rows.left < preview.right &&
  preview.left < rows.right &&
  rows.top < preview.bottom &&
  preview.top < rows.bottom;

const HOST: Change = { target: "sl-settings", bubbles: true, composed: true };

async function openSettings(page: Page): Promise<void> {
  await page.evaluate(
    `document.querySelector('[commandfor="settings"][command="show-modal"]').click()`,
  );
  await until(page, `${SETTINGS}.open`);
  await until(
    page,
    `${SHADOW}.activeElement?.closest(".theme-menu-row")?.dataset.section === "color"`,
  );
}

async function arrow(page: Page, key: string, delta: number): Promise<void> {
  await page.evaluate(
    `${SHADOW}.querySelector('[data-section="${key}"] [data-step="${delta}"]').click()`,
  );
  await rendered(page);
}

describe("sl-settings", { timeout: 60_000 }, () => {
  let server: Server;
  let browser: Browser;
  let page: Page;
  before(async () => {
    server = await serve(served);
    browser = await launch();
    page = await browser.open("about:blank");
    await page.cdp("Emulation.setFocusEmulationEnabled", { enabled: true });
  });
  after(async () => {
    await page?.close();
    await browser?.close();
    await server?.stop();
  });

  beforeEach(async () => {
    await page.goto(`${server.origin}${FIXTURE}`);
    await page.evaluate(`localStorage.clear()`);
    await page.goto(`${server.origin}${FIXTURE}`);
    await page.evaluate(`window.ready.then(() => ${SETTLED})`);
  });

  test("the rows list the registry's names and SCHEMES, checked at what applies", async () => {
    const registry: { profiles: Record<string, string[]>; defaults: Record<string, string> } =
      await page.evaluate(`(async () => {
        const registry = await import("@standards-lab/web-foundation/registry.js");
        return {
          profiles: Object.fromEntries(registry.FACETS.map((facet) => [facet, registry.profiles(facet)])),
          defaults: registry.DEFAULTS,
        };
      })()`);
    const { profiles, defaults } = registry;
    assert.deepEqual(await rows(page), [
      { key: "color", legend: "Color", options: profiles.color, checked: defaults.color },
      { key: "scheme", legend: "Scheme", options: ["system", "light", "dark"], checked: "system" },
      { key: "space", legend: "Space", options: profiles.space, checked: defaults.space },
      { key: "type", legend: "Type", options: profiles.type, checked: defaults.type },
    ]);
    assert.ok(profiles.color.length > 2, "the full entry registers several palettes");
    assert.deepEqual(await page.evaluate(`window.errors`), []);
  });

  test("each row's arrows step it, wrapping, applied and stored at once, each step a change at the host", async () => {
    const before = await checked(page);
    await listen(page);
    const all = await rows(page);
    for (const row of all) {
      const at = row.options.indexOf(row.checked!);
      await arrow(page, row.key, 1);
      const next = row.options[(at + 1) % row.options.length];
      assert.equal((await checked(page))[row.key], next, `${row.key}: ▶ checks the next`);
      assert.equal((await root(page))[row.key], next, `${row.key}: applied to the root`);
      assert.equal((await stored(page))?.[row.key], next, `${row.key}: stored at once`);
      await arrow(page, row.key, -1);
      await arrow(page, row.key, -1);
      const previous = row.options[(at - 1 + row.options.length) % row.options.length];
      assert.equal((await checked(page))[row.key], previous, `${row.key}: ◀ wraps to the last`);
      assert.equal((await stored(page))?.[row.key], previous, `${row.key}: stored at once`);
      await arrow(page, row.key, 1);
    }
    assert.deepEqual(await stored(page), before);
    assert.deepEqual(
      await root(page),
      { ...before, scheme: null },
      "system leaves data-scheme off",
    );
    assert.deepEqual(await changes(page), Array(all.length * 4).fill(HOST));
  });

  test("the arrows are hidden from assistive technology, take no focus, and are no buttons", async () => {
    const arrows: { glyph: string; hidden: string | null; tag: string; tabIndex: number }[] =
      await page.evaluate(`[...${SHADOW}.querySelectorAll("[data-step]")].map((el) => ({
        glyph: el.textContent, hidden: el.getAttribute("aria-hidden"), tag: el.localName,
        tabIndex: el.tabIndex,
      }))`);
    assert.equal(arrows.length, 8, "two arrows a row");
    for (const [i, el] of arrows.entries()) {
      assert.deepEqual(el, { glyph: i % 2 ? "▶" : "◀", hidden: "true", tag: "span", tabIndex: -1 });
    }
    const buttons: number = await page.evaluate(
      `${SHADOW}.querySelectorAll(".theme-menu-rows button").length`,
    );
    assert.equal(buttons, 0, "no button among the rows");
  });

  test("the dialog's opening focuses the first row's checked radio", async () => {
    await openSettings(page);
    const colors = (await rows(page))[0];
    assert.deepEqual(await focusedRow(page), { key: "color", value: colors.checked });
  });

  test("H and L step a row and J and K move between rows, stopping at the ends, none reaching the page", async () => {
    await openSettings(page);
    await listen(page);
    const colors = (await rows(page))[0].options;
    await press(page, "l");
    await rendered(page);
    assert.deepEqual(await focusedRow(page), { key: "color", value: colors[1] });
    assert.equal((await stored(page))?.color, colors[1], "stored at once");
    assert.equal((await root(page)).color, colors[1], "applied at once");
    await press(page, "k");
    assert.equal((await focusedRow(page))?.key, "color", "K stops at the first row");
    await press(page, "j");
    assert.deepEqual(await focusedRow(page), { key: "scheme", value: "system" });
    await press(page, "l");
    await rendered(page);
    assert.deepEqual(await focusedRow(page), { key: "scheme", value: "light" });
    assert.equal((await root(page)).scheme, "light");
    await press(page, "j");
    await press(page, "j");
    await press(page, "j");
    assert.equal((await focusedRow(page))?.key, "type", "J stops at the last row");
    await press(page, "k");
    await press(page, "k");
    await press(page, "k");
    await press(page, "h");
    await rendered(page);
    assert.deepEqual(await focusedRow(page), { key: "color", value: colors[0] });
    assert.equal((await stored(page))?.color, colors[0]);
    assert.deepEqual(await changes(page), [HOST, HOST, HOST]);
    await page.evaluate(`document.querySelector("#settings-close").focus()`);
    await press(page, "j");
    await page.evaluate(SETTLED);
    assert.equal(await page.evaluate(`window.ran`), 0, "no press ran the page's J or K");
    assert.equal(await page.evaluate(`${SETTINGS}.open`), true);
    assert.deepEqual(await page.evaluate(`window.errors`), []);
  });

  test("the down and up arrows move between rows and the left and right arrows step one, each applied and stored", async () => {
    await openSettings(page);
    await listen(page);
    const colors = (await rows(page))[0].options;
    await press(page, "ArrowUp");
    assert.equal((await focusedRow(page))?.key, "color", "up stops at the first row");
    await press(page, "ArrowDown");
    assert.deepEqual(await focusedRow(page), { key: "scheme", value: "system" });
    await press(page, "ArrowRight");
    await rendered(page);
    assert.deepEqual(await focusedRow(page), { key: "scheme", value: "light" });
    assert.equal((await root(page)).scheme, "light", "applied at once");
    assert.equal((await stored(page))?.scheme, "light", "stored at once");
    await press(page, "ArrowUp");
    await press(page, "ArrowLeft");
    await rendered(page);
    const last = colors[colors.length - 1];
    assert.deepEqual(await focusedRow(page), { key: "color", value: last });
    assert.equal((await root(page)).color, last);
    assert.equal((await stored(page))?.color, last);
    assert.deepEqual(await changes(page), [HOST, HOST]);
    assert.equal(await page.evaluate(`window.ran`), 0);
  });

  test("Escape closes the dialog natively and keeps every change: no Save, no Cancel", async () => {
    await openSettings(page);
    const colors = (await rows(page))[0].options;
    await press(page, "l");
    await rendered(page);
    await press(page, "Escape");
    await until(page, `!${SETTINGS}.open`);
    assert.equal((await root(page)).color, colors[1], "the root keeps the change");
    assert.equal((await stored(page))?.color, colors[1], "the store keeps the change");
    const controls: string[] = await page.evaluate(
      `[...${SHADOW}.querySelectorAll("button")].filter((button) =>
        !button.closest(".theme-menu-preview")).map((button) => button.textContent)`,
    );
    assert.deepEqual(controls, [], "no Save and no Cancel");
  });

  test("the preview card renders, drawn by the foundation's sheets, and takes no focus", async () => {
    await openSettings(page);
    const preview: Record<string, unknown> = await page.evaluate(`(() => {
      const card = ${SHADOW}.querySelector(".theme-menu-preview");
      const deploy = card.querySelector("button.button-blue");
      const style = (el, name) => getComputedStyle(el).getPropertyValue(name).trim();
      const probe = document.createElement("span");
      probe.style.color = "var(--blue)";
      card.append(probe);
      const blue = getComputedStyle(probe).color;
      probe.remove();
      const focusable = [...card.querySelectorAll("a, button, input")];
      for (const el of focusable) el.focus();
      return {
        inert: card.inert,
        focused: focusable.some((el) => ${SHADOW}.activeElement === el),
        heading: card.querySelector("h3").textContent,
        link: card.querySelector("a").textContent,
        code: card.querySelector("code").textContent,
        kbd: [...card.querySelectorAll("kbd")].map((kbd) => kbd.textContent),
        buttons: [...card.querySelectorAll("button")].map((button) => button.textContent),
        field: card.querySelector(".field input").value,
        label: card.querySelector(".field input").labels[0].textContent,
        rows: card.querySelectorAll("table.table-striped tbody tr").length,
        display: style(card, "display"),
        border: style(card, "border-top-style"),
        rowsDisplay: style(${SHADOW}.querySelector(".theme-menu-row"), "display"),
        fieldDisplay: style(card.querySelector(".field"), "display"),
        deployBlue: style(deploy, "border-top-color") === blue,
        striped: style(card.querySelector("tbody tr:nth-child(2)"), "background-color")
          !== style(card.querySelector("tbody tr:nth-child(1)"), "background-color"),
        valueFont: style(${SHADOW}.querySelector(".theme-menu-row > label:has(:checked)"),
          "font-family") === style(card.querySelector("code"), "font-family"),
      };
    })()`);
    assert.deepEqual(preview, {
      inert: true,
      focused: false,
      heading: "Nightly build",
      link: "release notes",
      code: "mise run check",
      kbd: ["Ctrl", "K"],
      buttons: ["Retry", "Deploy"],
      field: "main",
      label: "Branch",
      rows: 3,
      display: "grid",
      border: "solid",
      rowsDisplay: "flex",
      fieldDisplay: "grid",
      deployBlue: true,
      striped: true,
      valueFont: true,
    });
  });

  test("nothing in the element animates or transitions", async () => {
    await openSettings(page);
    const moving: string[] = await page.evaluate(`[...${SHADOW}.querySelectorAll("*")]
      .filter((el) => {
        const style = getComputedStyle(el);
        return style.animationName !== "none" ||
          style.transitionDuration.split(",").some((d) => parseFloat(d) > 0);
      })
      .map((el) => el.localName)`);
    assert.deepEqual(moving, []);
  });

  test("the element reads both settings again as its dialog opens", async () => {
    const choice = { color: "github", scheme: "dark", space: "compact", type: "sans" };
    await page.evaluate(`(() => {
      window.preferences.apply(${JSON.stringify(choice)});
      window.keys.changeSettings({ enabled: false, wait: 3000 });
    })()`);
    await rendered(page);
    assert.notDeepEqual(await checked(page), choice, "no event yet");
    await openSettings(page);
    assert.deepEqual(await checked(page), choice, "the rows follow the root");
    const keys: { enabled: boolean; wait: string } = await page.evaluate(`({
      enabled: ${SHADOW}.querySelector("input[type=checkbox]").checked,
      wait: ${SHADOW}.querySelector("select").value,
    })`);
    assert.deepEqual(keys, { enabled: false, wait: "3000" }, "the keyboard settings follow");
  });

  test("a change in the document reads both settings again", async () => {
    const choice = { color: "github", scheme: "light", space: "compact", type: "sans" };
    await page.evaluate(`(() => {
      window.preferences.apply(${JSON.stringify(choice)});
      window.keys.changeSettings({ enabled: false, wait: 1000 });
      document.body.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);
    await rendered(page);
    assert.deepEqual(await checked(page), choice);
    const keys: { enabled: boolean; wait: string } = await page.evaluate(`({
      enabled: ${SHADOW}.querySelector("input[type=checkbox]").checked,
      wait: ${SHADOW}.querySelector("select").value,
    })`);
    assert.deepEqual(keys, { enabled: false, wait: "1000" });
  });

  test("another tab's change updates the root, the rows, and the keyboard settings", async () => {
    const choice = { color: "github", scheme: "dark", space: "compact", type: "sans" };
    await page.evaluate(`(() => {
      localStorage.setItem(${JSON.stringify(PREFERENCES)}, ${JSON.stringify(JSON.stringify(choice))});
      dispatchEvent(new StorageEvent("storage", { key: ${JSON.stringify(PREFERENCES)} }));
      localStorage.setItem(${JSON.stringify(KEYS_STORAGE)}, JSON.stringify({ enabled: false, wait: 3000 }));
      dispatchEvent(new StorageEvent("storage", { key: ${JSON.stringify(KEYS_STORAGE)} }));
    })()`);
    await rendered(page);
    assert.deepEqual(await root(page), choice, "the root follows");
    assert.deepEqual(await checked(page), choice, "the rows follow");
    const keys: { enabled: boolean; wait: string } = await page.evaluate(`({
      enabled: ${SHADOW}.querySelector("input[type=checkbox]").checked,
      wait: ${SHADOW}.querySelector("select").value,
    })`);
    assert.deepEqual(keys, { enabled: false, wait: "3000" }, "the keyboard settings follow");
  });

  test("the switch and the wait are stored at once through the keys module, each a change at the host", async () => {
    const labels: { switch: string; wait: string; options: string[] } = await page.evaluate(`({
      switch: ${SHADOW}.querySelector("input[type=checkbox]").labels[0].textContent
        .replace(/\\s+/g, " ").trim(),
      wait: [...${SHADOW}.querySelector("select").labels[0].childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent).join("").trim(),
      options: [...${SHADOW}.querySelectorAll("select option")].map((o) => o.textContent.trim()),
    })`);
    assert.deepEqual(labels, {
      switch: SWITCH_LABEL,
      wait: "Wait between presses",
      options: ["1 s", "1.5 s", "3 s", "5 s"],
    });
    assert.equal(await page.evaluate(`${SHADOW}.querySelector("select").value`), "1500");

    await openSettings(page);
    await listen(page);
    await page.evaluate(`${SHADOW}.querySelector("input[type=checkbox]").click()`);
    assert.deepEqual(await keySettings(page), { enabled: false, wait: 1500 }, "the switch stored");
    await page.evaluate(`(() => {
      const select = ${SHADOW}.querySelector("select");
      select.value = "3000";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);
    assert.deepEqual(await keySettings(page), { enabled: false, wait: 3000 }, "the wait stored");
    assert.deepEqual(await changes(page), [HOST, HOST]);
    await page.evaluate(`${SETTINGS}.close()`);
    await until(page, `!${SETTINGS}.open`);

    await page.evaluate(`document.activeElement?.blur()`);
    await press(page, "p");
    await press(page, "?");
    await press(page, "s");
    await press(page, "j");
    await press(page, "k");
    await page.evaluate(SETTLED);
    const off: Record<string, unknown> = await page.evaluate(`({
      pages: window.pages, ran: window.ran, help: ${HELP}.open, settings: ${SETTINGS}.open,
    })`);
    assert.deepEqual(off, { pages: 0, ran: 0, help: false, settings: false });
    await page.evaluate(`document.querySelector("#search").addEventListener("click",
      () => (window.searched = true))`);
    await press(page, "Control+k");
    assert.equal(await page.evaluate(`window.searched`), true, "Control+K still fires");

    await openSettings(page);
    await page.evaluate(`${SHADOW}.querySelector("input[type=checkbox]").click()`);
    await page.evaluate(`(() => {
      const select = ${SHADOW}.querySelector("select");
      select.value = "1500";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);
    assert.equal(await storedKeys(page), null, "the defaults store nothing");
    await page.evaluate(`${SETTINGS}.close()`);
    await until(page, `!${SETTINGS}.open`);
    await page.evaluate(`document.activeElement?.blur()`);
    await press(page, "s");
    await until(page, `${SETTINGS}.open`);
  });

  test("the switch updates, in the same tab, aria-keyshortcuts and an open shortcuts list", async () => {
    const declared = (): Promise<Record<string, string | null>> =>
      page.evaluate(`(() => {
        const of = (el) => el.getAttribute("aria-keyshortcuts");
        return {
          pages: of(document.querySelector("#pages")),
          help: of(document.querySelector('[commandfor="help"][command="show-modal"]')),
          settings: of(document.querySelector('[commandfor="settings"][command="show-modal"]')),
          search: of(document.querySelector("#search")),
        };
      })()`);
    const listed = (): Promise<{ keys: string; off: boolean }[]> =>
      page.evaluate(`[...document.querySelector("sl-shortcuts").shadowRoot
        .querySelectorAll("tbody tr")].map((tr) => ({
          keys: tr.cells[0].querySelector("kbd").textContent,
          off: tr.classList.contains("off"),
        }))`);
    assert.deepEqual(await declared(), {
      pages: "P",
      help: "Shift+/",
      settings: "S",
      search: "Control+K",
    });

    await page.evaluate(
      `document.querySelector('[commandfor="help"][command="show-modal"]').click()`,
    );
    await until(page, `${HELP}.open`);
    assert.ok(
      (await listed()).every((row) => !row.off),
      "every row on",
    );
    await listen(page);
    await page.evaluate(`${SHADOW}.querySelector("input[type=checkbox]").click()`);
    await page.evaluate(`document.querySelector("sl-shortcuts").updateComplete`);
    assert.deepEqual(await changes(page), [HOST], "the document sees the host's change alone");
    assert.deepEqual(await declared(), {
      pages: null,
      help: null,
      settings: null,
      search: "Control+K",
    });
    assert.deepEqual(await listed(), [
      { keys: "P", off: true },
      { keys: "?", off: true },
      { keys: "S", off: true },
      { keys: "Control", off: false },
      { keys: "J", off: true },
      { keys: "K", off: true },
    ]);

    await page.evaluate(`${SHADOW}.querySelector("input[type=checkbox]").click()`);
    await page.evaluate(`document.querySelector("sl-shortcuts").updateComplete`);
    assert.equal((await declared()).settings, "S");
    assert.ok(
      (await listed()).every((row) => !row.off),
      "every row on again",
    );
  });
  describe("in a wide viewport", () => {
    before(async () => {
      await page.cdp("Emulation.setDeviceMetricsOverride", {
        width: 1280,
        height: 800,
        deviceScaleFactor: 1,
        mobile: false,
      });
    });
    after(async () => {
      await page.cdp("Emulation.clearDeviceMetricsOverride");
    });

    test("at 20rem the preview goes below the rows, nothing overlapping or overflowing the host", async () => {
      const placed = await place(page, "20rem");
      assert.ok(placed.preview.top >= placed.rows.bottom, JSON.stringify(placed));
      assert.ok(!intersect(placed), JSON.stringify(placed));
      assert.deepEqual(placed.outside, []);
      assert.deepEqual(placed.overflowing, []);
    });

    test("at 60rem the preview stands beside the rows, nothing overlapping or overflowing the host", async () => {
      const placed = await place(page, "60rem");
      assert.ok(placed.preview.left >= placed.rows.right, JSON.stringify(placed));
      assert.ok(placed.preview.top < placed.rows.bottom, JSON.stringify(placed));
      assert.ok(!intersect(placed), JSON.stringify(placed));
      assert.deepEqual(placed.outside, []);
      assert.deepEqual(placed.overflowing, []);
    });

    test("in a shrink-to-fit parent the element is as wide as its content, nothing overlapping or overflowing it", async () => {
      const placed = await place(page, "max-content");
      const rows = placed.rows.right - placed.rows.left;
      assert.ok(placed.host >= rows && placed.host <= 1280, JSON.stringify(placed));
      assert.ok(!intersect(placed), JSON.stringify(placed));
      assert.deepEqual(placed.outside, []);
      assert.deepEqual(placed.overflowing, []);
    });
  });
});
