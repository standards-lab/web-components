import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { launch, until } from "@standards-lab/web-tooling/browser.js";
import type { Browser, Page } from "@standards-lab/web-tooling/browser.js";
import { serve } from "@standards-lab/web-tooling/server.js";
import type { Server } from "@standards-lab/web-tooling/server.js";
import gear from "@standards-lab/web-icons/octicon/gear-16";
import question from "@standards-lab/web-icons/octicon/question-16";
import x from "@standards-lab/web-icons/octicon/x-16";

import { glyphButton } from "./support/glyph-button.ts";
import { served } from "./support/served.ts";

const PAGES = ["components", "settings", "shortcuts"];

const KEYS = {
  s: { key: "s", code: "KeyS", windowsVirtualKeyCode: 83, text: "s" },
  "?": { key: "?", code: "Slash", windowsVirtualKeyCode: 191, modifiers: 8, text: "?" },
  Enter: { key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" },
  Escape: { key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 },
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

const DIALOGS = [
  {
    id: "settings",
    key: "s",
    name: "Settings",
    glyph: gear,
    width: "dialog-wide",
    holds: "sl-settings",
  },
  {
    id: "help",
    key: "?",
    name: "Help",
    glyph: question,
    width: "dialog-fit",
    holds: "sl-shortcuts",
  },
] as const;

type Dialog = (typeof DIALOGS)[number];

const opener = (dialog: Dialog): string =>
  `document.querySelector('[commandfor="${dialog.id}"][command="show-modal"]')`;
const closer = (dialog: Dialog): string =>
  `document.querySelector('#${dialog.id} > .dialog-header [commandfor="${dialog.id}"][command="close"]')`;

/** The dialog's state, and where focus is: the focused element's id, or its tag. */
const shown = (
  page: Page,
  dialog: Dialog,
): Promise<{ open: boolean; modal: boolean; focus: string }> =>
  page.evaluate(`(() => {
    const dialog = document.querySelector("#${dialog.id}");
    const active = document.activeElement;
    return {
      open: dialog.open,
      modal: dialog.matches(":modal"),
      focus: active === ${opener(dialog)} ? "opener" : active.id || active.localName,
    };
  })()`);

describe("the Settings and Help pattern on the demo pages", { timeout: 60_000 }, () => {
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

  async function open(name: string): Promise<Page> {
    const page = await browser.open(`${server.origin}/demo/${name}.html`);
    await page.cdp("Emulation.setFocusEmulationEnabled", { enabled: true });
    await page.evaluate(`Promise.all(["sl-settings", "sl-shortcuts"].map((tag) =>
      customElements.whenDefined(tag)))`);
    return page;
  }

  for (const name of PAGES) {
    test(`the ${name} page's header holds the Help and Settings glyph buttons, each its web-icons glyph and its key, bound by data-keys`, async () => {
      const page = await open(name);
      try {
        for (const dialog of DIALOGS) {
          const button = await glyphButton(page, opener(dialog), dialog.glyph);
          assert.deepEqual(
            {
              classed: button.classed,
              glyphs: button.glyphs,
              matches: button.matches,
              hint: button.hint,
            },
            { classed: true, glyphs: 1, matches: true, hint: dialog.name },
            dialog.name,
          );
          const read: {
            label: string | null;
            keys: string | null;
            kbd: string;
            inActions: boolean;
          } = await page.evaluate(`(() => {
              const button = ${opener(dialog)};
              return {
                label: button.getAttribute("aria-label"),
                keys: button.dataset.keys ?? null,
                kbd: button.querySelector("kbd")?.textContent ?? "",
                inActions: button.closest("body > header .header-actions") !== null,
              };
            })()`);
          assert.deepEqual(
            read,
            {
              label: dialog.name,
              keys: dialog.key,
              kbd: dialog.key.toUpperCase(),
              inActions: true,
            },
            dialog.name,
          );
        }
      } finally {
        await page.close();
      }
    });

    test(`the ${name} page's dialogs: Settings wide holding sl-settings, Help fit holding sl-shortcuts, each headed by a Close glyph showing Esc`, async () => {
      const page = await open(name);
      try {
        for (const dialog of DIALOGS) {
          const read: { classes: string[]; holds: boolean; header: boolean; kbd: string } =
            await page.evaluate(`(() => {
              const dialog = document.querySelector("#${dialog.id}");
              const header = dialog.firstElementChild;
              return {
                classes: [...dialog.classList],
                holds: dialog.querySelector("${dialog.holds}") !== null,
                header: header.matches("header.dialog-header") && header.contains(${closer(dialog)}),
                kbd: ${closer(dialog)}.querySelector("kbd").textContent,
              };
            })()`);
          assert.deepEqual(
            read,
            { classes: [dialog.width], holds: true, header: true, kbd: "Esc" },
            dialog.name,
          );
          const close = await glyphButton(page, closer(dialog), x);
          assert.deepEqual(
            { classed: close.classed, matches: close.matches, hint: close.hint },
            { classed: true, matches: true, hint: "Close" },
            `${dialog.name}'s Close`,
          );
        }
      } finally {
        await page.close();
      }
    });

    test(`on the ${name} page, S opens Settings and ? opens Help as modals, Escape closes each, and focus returns to the opener`, async () => {
      const page = await open(name);
      try {
        for (const dialog of DIALOGS) {
          await page.evaluate(`${opener(dialog)}.focus()`);
          await press(page, dialog.key);
          await until(page, `document.querySelector("#${dialog.id}").open`);
          const opened = await shown(page, dialog);
          assert.equal(opened.open && opened.modal, true, `${dialog.key} opens ${dialog.name}`);
          assert.notEqual(opened.focus, "opener", `focus moves into ${dialog.name}`);
          await press(page, "Escape");
          await until(page, `!document.querySelector("#${dialog.id}").open`);
          assert.deepEqual(
            await shown(page, dialog),
            { open: false, modal: false, focus: "opener" },
            `Escape closes ${dialog.name}`,
          );
        }
      } finally {
        await page.close();
      }
    });

    test(`on the ${name} page, each opener's Enter opens its dialog, its Close closes it, and focus returns to the opener`, async () => {
      const page = await open(name);
      try {
        for (const dialog of DIALOGS) {
          await page.evaluate(`${opener(dialog)}.focus()`);
          await press(page, "Enter");
          await until(page, `document.querySelector("#${dialog.id}").open`);
          await page.evaluate(`${closer(dialog)}.click()`);
          await until(page, `!document.querySelector("#${dialog.id}").open`);
          assert.equal((await shown(page, dialog)).focus, "opener", dialog.name);
        }
      } finally {
        await page.close();
      }
    });
  }
});
