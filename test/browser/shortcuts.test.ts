import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

import { launch, SETTLED, until } from "@standards-lab/web-tooling/browser.js";
import type { Browser, Page } from "@standards-lab/web-tooling/browser.js";
import { serve } from "@standards-lab/web-tooling/server.js";
import type { Server } from "@standards-lab/web-tooling/server.js";

import { served } from "./support/served.ts";

interface Row {
  keys: string;
  action: string;
  off: boolean;
}

interface Key {
  key: string;
  code: string;
  windowsVirtualKeyCode: number;
  modifiers: number;
  text?: string;
}

const FIXTURE = "/test/fixtures/shortcuts.html";
const SHADOW = `document.querySelector("sl-shortcuts").shadowRoot`;
const HELP = `document.querySelector("#help")`;

const ROWS: Row[] = [
  { keys: "?", action: "Help", off: false },
  { keys: "Control+K", action: "Search", off: false },
  { keys: "G then E", action: "End", off: false },
  { keys: "J", action: "Next section", off: false },
  { keys: "Alt+N", action: "New note", off: false },
];

const OFF_ROWS = ROWS.map((row) => ({ ...row, off: !/^(Control|Alt)\+/.test(row.keys) }));

const QUESTION: Key = {
  key: "?",
  code: "Slash",
  windowsVirtualKeyCode: 191,
  modifiers: 8,
  text: "?",
};
const J: Key = { key: "j", code: "KeyJ", windowsVirtualKeyCode: 74, modifiers: 0, text: "j" };
const ALT_N: Key = { key: "n", code: "KeyN", windowsVirtualKeyCode: 78, modifiers: 1 };

async function press(page: Page, { text, ...key }: Key): Promise<void> {
  await page.cdp("Input.dispatchKeyEvent", {
    type: "keyDown",
    ...key,
    ...(text === undefined ? {} : { text, unmodifiedText: text }),
  });
  await page.cdp("Input.dispatchKeyEvent", { type: "keyUp", ...key });
}

const rows = (page: Page): Promise<Row[]> =>
  page.evaluate(`[...${SHADOW}.querySelectorAll("tbody tr")].map((tr) => {
    const small = tr.cells[0].querySelector("small");
    const marked = small !== null && small.textContent.trim() === "off" && small.checkVisibility();
    return {
      keys: tr.cells[0].textContent.replace(/\\s+/g, " ").trim().replace(/ off$/, ""),
      action: tr.cells[1].textContent.trim(),
      off: marked && tr.cells[0].textContent.trim().endsWith(" off") && tr.classList.contains("off"),
    };
  })`);

const rendered = (page: Page): Promise<void> =>
  page.evaluate(`document.querySelector("sl-shortcuts").updateComplete.then(() => {})`);

async function open(page: Page, byKey = true): Promise<void> {
  if (byKey) await press(page, QUESTION);
  else
    await page.evaluate(
      `document.querySelector('[commandfor="help"][command="show-modal"]').click()`,
    );
  await until(page, `${HELP}.open`);
  await rendered(page);
}

async function close(page: Page): Promise<void> {
  await page.evaluate(`${HELP}.close()`);
  await until(page, `!${HELP}.open`);
}

describe("shortcuts", { timeout: 60_000 }, () => {
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

  test("the rows are exactly bindings(dialog), each key in a kbd, under Keys and Action", async () => {
    await open(page);
    assert.deepEqual(await rows(page), ROWS);
    const listed: { given: string[]; kbds: number[]; header: string[] } = await page.evaluate(`({
      given: window.keys.bindings(${HELP}).map((binding) => binding.keys),
      kbds: [...${SHADOW}.querySelectorAll("tbody tr")].map((tr) =>
        tr.cells[0].querySelectorAll("kbd").length),
      header: [...${SHADOW}.querySelectorAll("thead th")].map((th) => th.textContent.trim()),
    })`);
    assert.deepEqual(listed.given, ["?", "Control+k", "g e", "j", "Alt+n"], "bindings(dialog)");
    assert.deepEqual(listed.kbds, [1, 2, 2, 1, 2], "each key in its own kbd");
    assert.deepEqual(listed.header, ["Keys", "Action"]);
    assert.deepEqual(await page.evaluate(`window.errors`), []);
  });

  test("the list reads the bindings again at each open of its dialog", async () => {
    await page.evaluate(`document.querySelector("#search").hidden = true`);
    await open(page);
    assert.deepEqual(
      await rows(page),
      ROWS.filter((row) => row.action !== "Search"),
    );
    await close(page);
    await page.evaluate(`document.querySelector("#search").hidden = false`);
    await open(page);
    assert.deepEqual(await rows(page), ROWS);
    await close(page);
  });

  test("with character keys off, their rows are marked off and the combinations' aren't", async () => {
    await page.evaluate(`window.keys.changeSettings({ enabled: false })`);
    await open(page, false);
    assert.deepEqual(await rows(page), OFF_ROWS);
    await close(page);
  });

  test("an open list follows a settings change the document's change event reports", async () => {
    await open(page);
    await page.evaluate(`(() => {
      window.keys.changeSettings({ enabled: false });
      document.body.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);
    await rendered(page);
    assert.deepEqual(await rows(page), OFF_ROWS);
    await page.evaluate(`(() => {
      window.keys.changeSettings({ enabled: null });
      document.body.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);
    await rendered(page);
    assert.deepEqual(await rows(page), ROWS);
    await close(page);
  });

  test("an open list follows a change of the setting in another tab", async () => {
    await open(page);
    await page.evaluate(`(() => {
      const key = "web-foundation.keys";
      localStorage.setItem(key, JSON.stringify({ enabled: false }));
      dispatchEvent(new StorageEvent("storage", { key }));
    })()`);
    await rendered(page);
    assert.deepEqual(await rows(page), OFF_ROWS);
    await close(page);
  });

  test("the screen-reader note follows the table, and the element holds no setting", async () => {
    await open(page);
    const { note, ...shown }: { last: string; note: string; after: boolean; fields: number } =
      await page.evaluate(`(() => {
        const note = ${SHADOW}.querySelector("p");
        const table = ${SHADOW}.querySelector("table");
        return {
          last: ${SHADOW}.lastElementChild.localName,
          note: note.textContent.trim(),
          after: Boolean(table.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING),
          fields: ${SHADOW}.querySelectorAll("input, select, textarea, fieldset").length,
        };
      })()`);
    assert.deepEqual(shown, { last: "p", after: true, fields: 0 });
    assert.match(note, /^Screen readers: .*NVDA.*VoiceOver\.$/);
    await close(page);
  });

  test("in a shrink-to-fit parent the element is as wide as its table, or sixteen --space-base steps, the note wrapping within it", async () => {
    await open(page);
    const sized: { host: number; table: number; floor: number; note: number; lines: number } =
      await page.evaluate(`(async () => {
        const host = document.querySelector("sl-shortcuts");
        const parent = document.createElement("div");
        parent.style.inlineSize = "max-content";
        host.replaceWith(parent);
        parent.append(host);
        await host.updateComplete;
        const note = ${SHADOW}.querySelector(".note");
        const lineHeight = parseFloat(getComputedStyle(note).lineHeight);
        const probe = parent.appendChild(document.createElement("div"));
        probe.style.inlineSize = "calc(var(--space-base) * 16)";
        const floor = probe.getBoundingClientRect().width;
        probe.remove();
        return {
          floor,
          host: host.getBoundingClientRect().width,
          table: ${SHADOW}.querySelector("table").getBoundingClientRect().width,
          note: note.getBoundingClientRect().width,
          lines: Math.round(note.getBoundingClientRect().height / lineHeight),
        };
      })()`);
    const wide = Math.max(sized.table, sized.floor);
    assert.ok(
      Math.abs(sized.host - wide) < 1,
      `host ${sized.host}, table ${sized.table}, floor ${sized.floor}`,
    );
    assert.ok(sized.note <= wide + 0.5, `note ${sized.note}, host ${sized.host}`);
    assert.ok(sized.lines > 1, `the note in ${sized.lines} line`);
    await close(page);
  });

  test("nothing in the list takes focus, and the dialog opened by ? focuses its title", async () => {
    await open(page);
    const shown: { focusable: number; tabbable: number; focused: string | null } =
      await page.evaluate(`({
        focusable: ${SHADOW}.querySelectorAll(
          "button, a[href], input, select, textarea, summary, [tabindex], [contenteditable]",
        ).length,
        tabbable: [...${SHADOW}.querySelectorAll("*")].filter((el) => el.tabIndex >= 0).length,
        focused: document.activeElement === document.querySelector("#help-title")
          ? "title"
          : document.activeElement?.localName ?? null,
      })`);
    assert.deepEqual(shown, { focusable: 0, tabbable: 0, focused: "title" });
    await close(page);
  });

  test("pressing a listed key with the pointer in the table runs nothing, which outside the dialog runs", async () => {
    await open(page);
    const { x, y }: { x: number; y: number } = await page.evaluate(`(() => {
      const cell = ${SHADOW}.querySelector("tbody tr:last-child td:last-child");
      const { left, top, width, height } = cell.getBoundingClientRect();
      return { x: left + width / 2, y: top + height / 2 };
    })()`);
    for (const type of ["mousePressed", "mouseReleased"]) {
      await page.cdp("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
    }
    await press(page, J);
    await press(page, ALT_N);
    const inside: { ran: number; open: boolean; focusedInList: boolean } = await page.evaluate(`({
      ran: window.ran,
      open: ${HELP}.open,
      focusedInList: ${SHADOW}.activeElement !== null,
    })`);
    assert.deepEqual(inside, { ran: 0, open: true, focusedInList: false });
    await close(page);
    await press(page, ALT_N);
    assert.equal(
      await page.evaluate(`window.ran`),
      1,
      "the page's binding runs outside the dialog",
    );
  });

  test("no [data-keys-list] is in the page or the element's shadow root", async () => {
    await open(page);
    const lists: number = await page.evaluate(
      `document.querySelectorAll("[data-keys-list]").length + ${SHADOW}.querySelectorAll("[data-keys-list]").length`,
    );
    assert.equal(lists, 0);
    await close(page);
  });
});
