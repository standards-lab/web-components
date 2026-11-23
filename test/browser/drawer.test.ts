// Adapted from spike-html-apps-components (10dde51): test/browser/drawer.test.ts, on @standards-lab/web-tooling.
// Adapted from spike-html-hosting-components (9fa5850): test/browser/drawer.test.ts, its Close glyph button and hint cases.

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

import { launch, until } from "@standards-lab/web-tooling/browser.js";
import type { Browser, Page } from "@standards-lab/web-tooling/browser.js";
import { serve } from "@standards-lab/web-tooling/server.js";
import type { Server } from "@standards-lab/web-tooling/server.js";

import x from "@standards-lab/web-icons/octicon/x-16";

import {
  descriptions,
  glyphButton,
  hintShown,
  hover,
  pointAway,
  untilHint,
} from "./support/glyph-button.ts";
import { served } from "./support/served.ts";

interface Heard {
  type: string;
  detail: unknown;
  bubbles: boolean;
  composed: boolean;
}

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
}

interface Shown {
  mode: "docked" | "drawer" | null;
  open: boolean;
  attribute: boolean;
  wrapper: string | null;
  dialogOpen: boolean;
  modal: boolean;
  box: Box;
  visible: boolean;
  focused: string | null;
  sent: string[];
  heard: Heard[];
}

interface AXNode {
  ignored: boolean;
  role?: { value: string };
  name?: { value: string };
}

const DOCK = 768;
const WIDE = 1280;
const NARROW = 480;
const HEIGHT = 800;
const CLOSE = `document.querySelector("sl-drawer").shadowRoot.querySelector("header button")`;

describe("drawer", { timeout: 60_000 }, () => {
  let server: Server;
  let browser: Browser;
  let page: Page;
  before(async () => {
    server = await serve(served);
    browser = await launch();
    page = await browser.open(`${server.origin}/test/fixtures/components.html`);
    await page.cdp("Emulation.setFocusEmulationEnabled", { enabled: true });
    await page.evaluate(`window.verdict.then(async () => {
      await import("/dist/drawer.js");
      window.lifecycle = { connected: 0, disconnected: 0 };
      customElements.define("x-probe", class extends HTMLElement {
        connectedCallback() { window.lifecycle.connected++; }
        disconnectedCallback() { window.lifecycle.disconnected++; }
      });
      window.heard = [];
      for (const type of ["open", "close"]) {
        document.addEventListener(type, (event) => {
          if (event.target.localName === "sl-drawer") window.heard.push({
            type, detail: event.detail, bubbles: event.bubbles, composed: event.composed,
          });
        });
      }
      window.mount = async (fields, extra, attributes = "", detached = false) => {
        const main = document.querySelector("main");
        main.innerHTML = "";
        window.lifecycle.connected = window.lifecycle.disconnected = 0;
        window.sent = [];
        window.heard.length = 0;
        const parts = document.createElement("div");
        parts.innerHTML = '<button id="opener" type="button">Documents</button>' +
          '<sl-drawer ' + attributes + '><input id="filter" aria-label="Filter">' +
          '<button id="count" type="button">0</button>' +
          '<x-probe id="probe">probe</x-probe>' + extra + '</sl-drawer>' +
          '<button id="outside" type="button">Outside</button>';
        customElements.upgrade(parts);
        const drawer = parts.querySelector("sl-drawer");
        const original = drawer.dispatchEvent.bind(drawer);
        drawer.dispatchEvent = (event) => (window.sent.push(event.type), original(event));
        if (detached) Object.assign(drawer, fields);
        main.append(...parts.childNodes);
        if (!detached) Object.assign(drawer, fields);
        document.querySelector("#opener").addEventListener("click", () =>
          document.querySelector("sl-drawer").show());
        document.querySelector("#count").addEventListener("click", (event) =>
          (event.target.textContent = String(Number(event.target.textContent) + 1)));
        await drawer.updateComplete;
      };
      window.read = async () => {
        const drawer = document.querySelector("sl-drawer");
        await drawer.updateComplete;
        const wrapper = drawer.shadowRoot.querySelector("aside, dialog");
        const dialog = drawer.shadowRoot.querySelector("dialog");
        const { left, right, top, bottom, width } = wrapper.getBoundingClientRect();
        const active = document.activeElement;
        const focused = active === document.body || active === null ? null
          : active === drawer ? "drawer " + (drawer.shadowRoot.activeElement?.localName ?? "")
          : active.id || active.localName;
        return {
          mode: drawer.matches(":state(docked)") ? "docked" : drawer.matches(":state(drawer)") ? "drawer" : null,
          open: drawer.open,
          attribute: drawer.hasAttribute("open"),
          wrapper: wrapper?.localName ?? null,
          dialogOpen: dialog?.open ?? false,
          modal: dialog?.matches(":modal") ?? false,
          box: { left, right, top, bottom, width },
          visible: wrapper.checkVisibility(),
          focused,
          sent: window.sent,
          heard: window.heard,
        };
      };
      window.pageLive = () => {
        const before = document.activeElement;
        const outside = document.querySelector("#outside");
        outside.focus();
        const live = document.activeElement === outside;
        before?.focus?.();
        return live;
      };
      window.center = (selector, shadow) => {
        const root = shadow ? document.querySelector("sl-drawer").shadowRoot : document;
        const { left, top, width, height } = root.querySelector(selector).getBoundingClientRect();
        return { x: left + width / 2, y: top + height / 2 };
      };
    })`);
  });
  after(async () => {
    await page?.close();
    await browser?.close();
    await server?.stop();
  });

  const read = (): Promise<Shown> => page.evaluate("window.read()");
  const pageLive = (): Promise<boolean> => page.evaluate("window.pageLive()");
  const call = (method: string) => page.evaluate(`document.querySelector("sl-drawer").${method}()`);
  const settled = (mode: "docked" | "drawer") =>
    until(page, `document.querySelector("sl-drawer")?.matches(":state(${mode})")`);
  const resize = async (width: number, height = HEIGHT) => {
    await page.cdp("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await until(page, `innerWidth === ${width} && innerHeight === ${height}`);
  };
  const mount = async (
    width: number,
    fields: Record<string, unknown> = {},
    extra = "",
    height = HEIGHT,
    { attributes = "", detached = false, mode = width >= DOCK ? "docked" : "drawer" } = {},
  ) => {
    await resize(width, height);
    const args = [{ label: "Documents", ...fields }, extra, attributes, detached];
    await page.evaluate(`window.mount(...${JSON.stringify(args)})`);
    await settled(mode as "docked" | "drawer");
  };
  const press = async (key: string, keyCode: number, text?: string) => {
    for (const type of ["keyDown", "keyUp"]) {
      await page.cdp("Input.dispatchKeyEvent", {
        type,
        key,
        code: key,
        windowsVirtualKeyCode: keyCode,
        ...(text === undefined || type === "keyUp" ? {} : { text, unmodifiedText: text }),
      });
    }
  };
  const clickAt = async ({ x, y }: { x: number; y: number }) => {
    for (const type of ["mousePressed", "mouseReleased"]) {
      await page.cdp("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
    }
  };
  const center = (selector: string, shadow = false): Promise<{ x: number; y: number }> =>
    page.evaluate(`window.center(${JSON.stringify(selector)}, ${shadow})`);
  const slid = () =>
    page.evaluate(
      `Promise.all(document.querySelector("sl-drawer").shadowRoot.getAnimations().map((a) => a.finished)).then(() => {})`,
    );
  const openByKeyboard = async () => {
    await page.evaluate(`document.querySelector("#opener").focus()`);
    await press("Enter", 13, "\r");
    await until(page, `document.querySelector("sl-drawer").open`);
    await slid();
  };
  const closedHeard = (count: number) =>
    until(page, `window.heard.filter((e) => e.type === "close").length >= ${count}`);
  const exposed = async (role: string): Promise<string[]> => {
    const { nodes }: { nodes: AXNode[] } = await page.cdp("Accessibility.getFullAXTree", {});
    return nodes
      .filter((node) => !node.ignored && node.role?.value === role)
      .map((node) => node.name?.value ?? "");
  };
  const closeText = (): Promise<{ box: number[]; text: string }> =>
    page.evaluate(`(() => {
      const hidden = ${CLOSE}.querySelector("slot[name=close]").closest("span");
      const box = hidden.getBoundingClientRect();
      return {
        box: [box.width, box.height],
        text: hidden.textContent.replace(/\\s+/g, " ").trim(),
      };
    })()`);
  const headings = (): Promise<{
    texts: string[];
    inWrapper: boolean;
    visible: boolean;
    labelledby: string | null;
    label: string | null;
  }> =>
    page.evaluate(`(() => {
      const root = document.querySelector("sl-drawer").shadowRoot;
      const wrapper = root.querySelector("aside, dialog");
      const found = [...root.querySelectorAll("h1, h2, h3, h4, h5, h6, [role=heading]")];
      return {
        texts: found.map((h) => h.textContent),
        inWrapper: found.every((h) => wrapper.contains(h)),
        visible: found.every((h) => h.checkVisibility()),
        labelledby: wrapper.getAttribute("aria-labelledby"),
        label: wrapper.getAttribute("aria-label"),
      };
    })()`);

  beforeEach(async () => {
    await page.cdp("Emulation.setEmulatedMedia", { features: [] });
    await page.evaluate(`document.documentElement.removeAttribute("dir")`);
  });

  test("at dock and wider it is docked: an aside exposed as a complementary landmark, not a dialog, its content interactive, the page live, focus left in place", async () => {
    await mount(WIDE);
    const shown = await read();
    assert.deepEqual(
      [shown.mode, shown.wrapper, shown.dialogOpen, shown.open, shown.visible],
      ["docked", "aside", false, false, true],
    );
    assert.deepEqual(await exposed("complementary"), ["Documents"]);
    assert.deepEqual(await exposed("dialog"), [], "no dialog in the tree");
    assert.ok(shown.box.width > 0, "the docked aside takes space");
    assert.equal(shown.focused, null, "docking moves no focus into the content");
    assert.equal(await pageLive(), true, "the page takes focus");
    await clickAt(await center("#count"));
    assert.equal(await page.evaluate(`document.querySelector("#count").textContent`), "1");
    await clickAt(await center("#opener"));
    const after = await read();
    assert.deepEqual([after.wrapper, after.modal, after.open], ["aside", false, false]);
    assert.deepEqual(after.sent, [], "show() does nothing while docked");
  });

  test("docked, the aside is named by its own visible heading, the one heading exposed, with no Close button", async () => {
    await mount(WIDE);
    const {
      nodes,
    }: { nodes: (AXNode & { name?: { sources?: { attribute?: string; value?: unknown }[] } })[] } =
      await page.cdp("Accessibility.getFullAXTree", {});
    const landmark = nodes.filter((node) => !node.ignored && node.role?.value === "complementary");
    assert.deepEqual(
      landmark.map((node) => node.name?.value),
      ["Documents"],
    );
    const sources = landmark[0]?.name?.sources ?? [];
    assert.ok(
      sources.some(
        (source) => source.attribute === "aria-labelledby" && source.value !== undefined,
      ),
      `named by aria-labelledby: ${JSON.stringify(sources)}`,
    );
    assert.deepEqual(await headings(), {
      texts: ["Documents"],
      inWrapper: true,
      visible: true,
      labelledby: "title",
      label: null,
    });
    assert.deepEqual(await exposed("heading"), ["Documents"]);
    const buttons = await exposed("button");
    assert.ok(!buttons.some((name) => name.startsWith("Close")), `no Close button: ${buttons}`);
    assert.equal(
      await page.evaluate(`document.querySelector("sl-drawer").shadowRoot.querySelector("button")`),
      null,
      "no button in the shadow tree",
    );
  });

  for (const [mode, width] of [
    ["docked", WIDE],
    ["drawer", NARROW],
  ] as const) {
    test(`${mode}, the heading is at --text-l, an h4's size, smaller than the page's h1 and h2`, async () => {
      await mount(width);
      if (mode === "drawer") await openByKeyboard();
      const sizes: { heading: number; step: number; h1: number; h2: number; weight: string } =
        await page.evaluate(`(() => {
          const probe = document.createElement("div");
          probe.innerHTML = '<h1>Page</h1><h2>Section</h2><span style="font-size: var(--text-l)">l</span>';
          document.body.prepend(probe);
          const px = (element) => parseFloat(getComputedStyle(element).fontSize);
          const heading = document.querySelector("sl-drawer").shadowRoot.querySelector("h2");
          const sizes = {
            heading: px(heading),
            step: px(probe.querySelector("span")),
            h1: px(probe.querySelector("h1")),
            h2: px(probe.querySelector("h2")),
            weight: getComputedStyle(heading).fontWeight,
          };
          probe.remove();
          return sizes;
        })()`);
      assert.equal(
        sizes.heading,
        sizes.step,
        `the heading is at --text-l: ${JSON.stringify(sizes)}`,
      );
      assert.ok(sizes.heading < sizes.h2, `smaller than a page's h2: ${JSON.stringify(sizes)}`);
      assert.ok(sizes.heading < sizes.h1, `smaller than the page's h1: ${JSON.stringify(sizes)}`);
      assert.equal(sizes.weight, "600", "the baseline heading's weight");
    });
  }

  test("docked, the header stays in view while the content scrolls below it in a host held short", async () => {
    await mount(WIDE, {}, '<div id="tall" style="block-size: 3000px">tall</div>');
    await page.evaluate(`document.querySelector("sl-drawer").style.blockSize = "300px"`);
    const scrolled: {
      header: number;
      aside: number;
      asideScroll: number;
      body: number;
      bottom: number;
      asideBottom: number;
    } = await page.evaluate(`(() => {
        const root = document.querySelector("sl-drawer").shadowRoot;
        const aside = root.querySelector("aside");
        const body = root.querySelector(".body");
        body.scrollTop = body.scrollHeight;
        return {
          header: root.querySelector("header").getBoundingClientRect().top,
          aside: aside.getBoundingClientRect().top,
          asideScroll: aside.scrollTop,
          body: body.scrollTop,
          bottom: document.querySelector("#tall").getBoundingClientRect().bottom,
          asideBottom: aside.getBoundingClientRect().bottom,
        };
      })()`);
    assert.ok(scrolled.body > 0, "the content scrolled");
    assert.equal(scrolled.asideScroll, 0, "the aside itself doesn't scroll");
    assert.ok(
      scrolled.header >= scrolled.aside && scrolled.header - scrolled.aside <= 2,
      `the header stays at the aside's top: ${scrolled.header}, ${scrolled.aside}`,
    );
    assert.ok(
      scrolled.bottom <= scrolled.asideBottom,
      `the content's end came into view: ${scrolled.bottom}`,
    );
  });

  for (const [mode, width, height] of [
    ["docked", WIDE, HEIGHT],
    ["drawer", NARROW, 300],
  ] as const) {
    test(`${mode}, a control focused in the scrolling body draws its whole outline, at either edge`, async () => {
      await page.evaluate(
        `Promise.all([import("/dist/upload-dropzone.js"), import("/dist/document-list.js")])`,
      );
      const parts =
        "<sl-upload-dropzone></sl-upload-dropzone><sl-document-list></sl-document-list>";
      await mount(width, {}, parts, height);
      await page.evaluate(`(async () => {
        const drawer = document.querySelector("sl-drawer");
        if (${mode === "docked"}) drawer.style.blockSize = "300px";
        const dropzone = drawer.querySelector("sl-upload-dropzone");
        const list = drawer.querySelector("sl-document-list");
        dropzone.uploads = [
          { id: "u-1", name: "quarterly-report.pdf", size: 4600000, sent: 1200000, state: "uploading" },
          { id: "d-1", name: "brand-guide.pdf", size: 2400000, sent: 2400000, state: "done" },
        ];
        Object.assign(list, {
          page: 1, size: 3, total: 3, more: false, pageSizes: [3],
          items: ["terms.md", "retainer.md", "notes.txt"].map((name, i) => ({
            id: "doc-" + i, name, content_type: "text/plain", size: 3120,
            created_at: "2026-10-27T11:12:44Z", run_id: "run-" + i, status: "complete",
          })),
        });
        await Promise.all([dropzone.updateComplete, list.updateComplete]);
      })()`);
      if (mode === "drawer") await openByKeyboard();
      const measure = (): Promise<{
        name: string;
        visible: boolean;
        outline: number[];
        clip: number[];
      } | null> =>
        page.evaluate(`(() => {
          const drawer = document.querySelector("sl-drawer");
          let active = document.activeElement;
          if (!drawer.contains(active) || active.closest("#count")) return null;
          while (active.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
          const style = getComputedStyle(active);
          const reach = style.outlineStyle === "none" ? 0
            : parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
          const box = active.getBoundingClientRect();
          const root = drawer.shadowRoot;
          const body = root.querySelector(".body").getBoundingClientRect();
          const wrapper = root.querySelector("aside, dialog");
          const frame = wrapper.getBoundingClientRect();
          const left = frame.left + wrapper.clientLeft;
          const top = frame.top + wrapper.clientTop;
          return {
            name: active.getRootNode().host.localName + " " + active.localName + " " + active.className,
            visible: reach > 0 && active.matches(":focus-visible"),
            outline: [box.left - reach, box.top - reach, box.right + reach, box.bottom + reach],
            clip: [
              Math.max(body.left, left), Math.max(body.top, top),
              Math.min(body.right, left + wrapper.clientWidth),
              Math.min(body.bottom, top + wrapper.clientHeight),
            ],
          };
        })()`);
      const tab = async (shift: boolean) => {
        for (const type of ["keyDown", "keyUp"]) {
          await page.cdp("Input.dispatchKeyEvent", {
            type,
            key: "Tab",
            code: "Tab",
            windowsVirtualKeyCode: 9,
            modifiers: shift ? 8 : 0,
          });
        }
      };
      await page.evaluate(`document.querySelector("#count").focus()`);
      const seen = [];
      for (const shift of [false, true]) {
        for (let step = 0; step < 12; step++) {
          await tab(shift);
          const one = await measure();
          if (one === null) break;
          seen.push(one);
        }
        if (!shift) await tab(true);
      }
      const names = new Set(seen.map(({ name }) => name.split(" ").slice(0, 2).join(" ")));
      for (const control of ["sl-upload-dropzone button", "sl-entry button"]) {
        assert.ok(names.has(control), `the keyboard reached ${control}: ${[...names].join(", ")}`);
      }
      assert.ok(
        seen.some(({ name }) => name.endsWith("cancel")),
        "the keyboard reached the Cancel button",
      );
      const scrolled: number = await page.evaluate(
        `document.querySelector("sl-drawer").shadowRoot.querySelector(".body").scrollHeight`,
      );
      assert.ok(scrolled > 300, `the body scrolls: ${scrolled}`);
      for (const { name, visible, outline, clip } of seen) {
        const [left, top, right, bottom] = outline;
        assert.ok(visible, `${name}'s focus outline drawn`);
        assert.ok(
          left >= clip[0] && top >= clip[1] && right <= clip[2] && bottom <= clip[3],
          `${name}'s outline ${JSON.stringify(outline)} inside the clip ${JSON.stringify(clip)}`,
        );
      }
    });
  }

  for (const [dock, px] of [
    ["48rem", 768],
    ["600px", 600],
  ] as const) {
    test(`with dock ${dock}, at exactly ${px}px it is docked, and at ${px - 1}px a drawer`, async () => {
      await mount(px, { dock }, "", HEIGHT, { mode: "docked" });
      assert.equal((await read()).wrapper, "aside");
      await mount(px - 1, { dock }, "", HEIGHT, { mode: "drawer" });
      assert.equal((await read()).wrapper, "dialog");
    });
  }

  test("a dock the media query can't read leaves it docked at any width", async () => {
    for (const width of [WIDE, NARROW]) {
      await mount(width, { dock: "wide" }, "", HEIGHT, { mode: "docked" });
      const shown = await read();
      assert.deepEqual([shown.mode, shown.wrapper], ["docked", "aside"], `at ${width}px`);
    }
  });

  for (const width of [WIDE, NARROW]) {
    test(`with modal, at ${width}px, it is a closed drawer that opens as a modal dialog, the page behind inert; open goes out once`, async () => {
      await mount(width, {}, "", HEIGHT, { attributes: "modal", mode: "drawer" });
      let shown = await read();
      assert.deepEqual(
        [shown.mode, shown.wrapper, shown.dialogOpen, shown.open, shown.sent],
        ["drawer", "dialog", false, false, []],
      );
      await openByKeyboard();
      shown = await read();
      assert.deepEqual(
        [shown.mode, shown.dialogOpen, shown.modal, shown.open, shown.attribute, shown.visible],
        ["drawer", true, true, true, true, true],
      );
      assert.equal(shown.box.width, width, "the dialog covers the viewport");
      assert.deepEqual(await exposed("dialog"), ["Documents"]);
      assert.deepEqual(await exposed("complementary"), []);
      assert.equal(shown.focused, "drawer h2");
      assert.equal(await pageLive(), false, "the page behind takes no focus");
      assert.deepEqual(shown.heard, [{ type: "open", detail: {}, bubbles: true, composed: true }]);
    });
  }

  test("with modal, dock is ignored: a dock below the viewport, one the query can't read, and a resize across dock leave it a drawer, open", async () => {
    for (const dock of ["20rem", "wide"]) {
      await mount(WIDE, { dock }, "", HEIGHT, { attributes: "modal", mode: "drawer" });
      const shown = await read();
      assert.deepEqual([shown.mode, shown.wrapper], ["drawer", "dialog"], `with dock ${dock}`);
    }
    await call("show");
    await resize(NARROW);
    await resize(WIDE);
    await page.evaluate(`document.querySelector("sl-drawer").dock = "48rem"`);
    const shown = await read();
    assert.deepEqual(
      [shown.mode, shown.wrapper, shown.modal, shown.open, shown.sent],
      ["drawer", "dialog", true, true, ["open"]],
    );
  });

  test("modal reflects from the property, and removing it docks the drawer again at dock and wider", async () => {
    await mount(WIDE);
    await page.evaluate(`document.querySelector("sl-drawer").modal = true`);
    await settled("drawer");
    let shown = await read();
    assert.equal(
      await page.evaluate(`document.querySelector("sl-drawer").hasAttribute("modal")`),
      true,
    );
    assert.deepEqual([shown.wrapper, shown.dialogOpen, shown.sent], ["dialog", false, []]);
    await page.evaluate(`document.querySelector("sl-drawer").modal = false`);
    await settled("docked");
    shown = await read();
    assert.equal(
      await page.evaluate(`document.querySelector("sl-drawer").hasAttribute("modal")`),
      false,
    );
    assert.deepEqual([shown.wrapper, shown.sent], ["aside", []]);
  });

  test("modal set or removed while open closes it silently, either way, whether or not the mode changes", async () => {
    const quiet = async (modal: boolean, mode: "docked" | "drawer", wrapper: string) => {
      await page.evaluate(`document.querySelector("sl-drawer").modal = ${modal}`);
      await settled(mode);
      await page.evaluate("new Promise((resolve) => setTimeout(resolve, 50))");
      const shown = await read();
      assert.deepEqual(
        [shown.wrapper, shown.dialogOpen, shown.modal, shown.open, shown.attribute],
        [wrapper, false, false, false, false],
        `modal set ${modal}, ${mode}`,
      );
      return shown.sent;
    };
    await mount(NARROW);
    await call("show");
    assert.deepEqual(await quiet(true, "drawer", "dialog"), ["open"]);
    await call("show");
    assert.deepEqual(await quiet(false, "drawer", "dialog"), ["open", "open"]);
    await mount(WIDE, {}, "", HEIGHT, { attributes: "modal", mode: "drawer" });
    await call("show");
    assert.deepEqual(await quiet(false, "docked", "aside"), ["open"]);
    await call("show");
    assert.deepEqual(await quiet(true, "drawer", "dialog"), ["open"]);
    await call("show");
    assert.deepEqual((await read()).modal, true, "it opens again");
  });

  test("docked, show(), toggle(), and open leave it docked and send nothing", async () => {
    await mount(WIDE);
    await call("show");
    await call("toggle");
    await page.evaluate(`document.querySelector("sl-drawer").open = true`);
    const shown = await read();
    assert.deepEqual(
      [shown.mode, shown.wrapper, shown.modal, shown.open, shown.attribute, shown.sent],
      ["docked", "aside", false, false, false, []],
    );
  });

  for (const width of [DOCK - 1, NARROW]) {
    test(`at ${width}px, below dock, it is closed by default`, async () => {
      await mount(width);
      const shown = await read();
      assert.deepEqual(
        [shown.mode, shown.wrapper, shown.dialogOpen, shown.open, shown.visible, shown.sent],
        ["drawer", "dialog", false, false, false, []],
      );
    });
  }

  test("Enter on the opener shows a modal dialog named by its visible heading: the page behind inert, focus inside, Tab trapped; open goes out once", async () => {
    await mount(NARROW);
    await openByKeyboard();
    const shown = await read();
    assert.deepEqual(
      [shown.mode, shown.dialogOpen, shown.modal, shown.open, shown.attribute, shown.visible],
      ["drawer", true, true, true, true, true],
    );
    assert.deepEqual(await exposed("dialog"), ["Documents"]);
    assert.deepEqual(await exposed("heading"), ["Documents"]);
    assert.deepEqual(await headings(), {
      texts: ["Documents"],
      inWrapper: true,
      visible: true,
      labelledby: "title",
      label: null,
    });
    assert.equal(shown.focused, "drawer h2", "focus moves to the dialog's heading");
    assert.equal(await pageLive(), false, "the page behind takes no focus");
    assert.deepEqual(shown.heard, [{ type: "open", detail: {}, bubbles: true, composed: true }]);
    for (let i = 0; i < 5; i++) {
      await press("Tab", 9);
      const { focused } = await read();
      assert.ok(
        focused === null || ["drawer button", "filter", "count"].includes(focused),
        `Tab reached ${focused}`,
      );
    }
  });

  for (const [how, open] of [
    ["show()", "document.querySelector('sl-drawer').show()"],
    ["toggle()", "document.querySelector('sl-drawer').toggle()"],
    ["open set true", "document.querySelector('sl-drawer').open = true"],
    ["the opener's click", null],
  ] as const) {
    test(`opened by ${how}, its heading takes focus, not Close, with no outline; Tab reaches Close, Escape returns focus to the opener`, async () => {
      await mount(NARROW);
      if (open === null) {
        await clickAt(await center("#opener"));
      } else {
        await page.evaluate(`document.querySelector("#opener").focus()`);
        await page.evaluate(open);
      }
      await until(page, `document.querySelector("sl-drawer").open`);
      await slid();
      const heading: { focused: string | null; heading: boolean; close: boolean; outline: string } =
        await page.evaluate(`(async () => {
          const drawer = document.querySelector("sl-drawer");
          await drawer.updateComplete;
          const root = drawer.shadowRoot;
          const h2 = root.querySelector("dialog h2");
          return {
            focused: (await window.read()).focused,
            heading: root.activeElement === h2,
            close: root.activeElement === root.querySelector("header button"),
            outline: getComputedStyle(h2).outlineStyle,
          };
        })()`);
      assert.deepEqual(heading, {
        focused: "drawer h2",
        heading: true,
        close: false,
        outline: "none",
      });
      await press("Tab", 9);
      assert.equal((await read()).focused, "drawer button", "Tab from the heading reaches Close");
      await press("Escape", 27);
      await closedHeard(1);
      const shown = await read();
      assert.deepEqual([shown.open, shown.dialogOpen, shown.focused], [false, false, "opener"]);
    });
  }

  for (const [width, height] of [
    [480, 800],
    [375, 667],
  ] as const) {
    test(`open at ${width}×${height}, the dialog's box is the viewport's, edge to edge`, async () => {
      await mount(width, {}, "", height);
      await openByKeyboard();
      const { box } = await read();
      assert.deepEqual(box, { left: 0, right: width, top: 0, bottom: height, width });
    });
  }

  test("the header stays in view while the content scrolls below it", async () => {
    await mount(NARROW, {}, '<div id="tall" style="block-size: 3000px">tall</div>');
    await openByKeyboard();
    const scrolled: { header: number; body: number; dialog: number; bottom: number } =
      await page.evaluate(`(() => {
        const root = document.querySelector("sl-drawer").shadowRoot;
        const body = root.querySelector(".body");
        body.scrollTop = body.scrollHeight;
        return {
          header: root.querySelector("header").getBoundingClientRect().top,
          body: body.scrollTop,
          dialog: root.querySelector("dialog").scrollTop,
          bottom: document.querySelector("#tall").getBoundingClientRect().bottom,
        };
      })()`);
    assert.ok(scrolled.body > 0, "the content scrolled");
    assert.equal(scrolled.dialog, 0, "the dialog itself doesn't scroll");
    assert.equal(scrolled.header, 0, "the header stays at the top");
    assert.ok(scrolled.bottom <= HEIGHT, `the content's end came into view: ${scrolled.bottom}`);
  });

  test("the Close button, named Close Documents, closes it, focus returns to the opener, and close goes out once", async () => {
    await mount(NARROW);
    await openByKeyboard();
    assert.ok((await exposed("button")).includes("Close Documents"), "the button's name");
    const shown = await glyphButton(page, CLOSE, x);
    assert.deepEqual(
      [shown.glyphs, shown.matches, shown.hidden, shown.drawn],
      [1, true, "true", true],
      "it shows web-icons' x-16 alone, hidden from the accessibility tree",
    );
    assert.deepEqual(await closeText(), { box: [1, 1], text: "Close Documents" });
    await clickAt(await center("header button", true));
    await closedHeard(1);
    const closed = await read();
    assert.deepEqual(
      [closed.dialogOpen, closed.modal, closed.open, closed.attribute, closed.focused],
      [false, false, false, false, "opener"],
    );
    assert.equal(await pageLive(), true);
    assert.deepEqual(closed.sent, ["open", "close"]);
  });

  test("a replacement for the Close button's text, through its close slot, leads its name, visually hidden beside the glyph", async () => {
    await mount(NARROW, {}, '<span slot="close" id="fermer">Fermer</span>');
    await openByKeyboard();
    const names = await exposed("button");
    assert.ok(names.includes("Fermer Documents"), `the button's name: ${names}`);
    assert.ok(!names.some((name) => name.startsWith("Close")), "the default text is replaced");
    const slotted: boolean = await page.evaluate(
      `document.querySelector("#fermer").assignedSlot === ${CLOSE}.querySelector("slot[name=close]")`,
    );
    assert.ok(slotted, "the replacement fills the Close button's close slot");
    assert.deepEqual((await closeText()).box, [1, 1], "visually hidden");
    assert.equal((await glyphButton(page, CLOSE, x)).matches, true, "the glyph stays");
  });

  for (const [what, extra, name] of [
    ["its default text", "", "Close Documents"],
    [
      "a replacement through its close slot",
      '<span slot="close">Fermer</span>',
      "Fermer Documents",
    ],
  ]) {
    test(`the Close button is a glyph button whose hint, by interestfor, is its name, with ${what}, announced once`, async () => {
      await mount(NARROW, {}, extra);
      await openByKeyboard();
      const shown = await glyphButton(page, CLOSE, x);
      assert.ok(shown.classed, "a native button of the class glyph-button");
      assert.equal(shown.surface, shown.native, "the native button's border and surface");
      assert.deepEqual(
        [shown.interestfor !== null, shown.resolves, shown.popover, shown.hintHidden],
        [true, true, "hint", "true"],
        "interestfor names a hint popover in its tree, hidden from the accessibility tree",
      );
      assert.equal(shown.hint, name, "the hint's text is the button's name");
      assert.ok((await exposed("button")).includes(name), "the button's name");
      assert.deepEqual(await descriptions(page, name), [""], "no description");
    });
  }

  test("the Close button's hint follows a changed label and a close slot filled after it opens", async () => {
    await mount(NARROW);
    await openByKeyboard();
    await page.evaluate(`(async () => {
      const drawer = document.querySelector("sl-drawer");
      drawer.label = "Pages";
      const text = document.createElement("span");
      text.slot = "close";
      text.textContent = "Fermer";
      drawer.append(text);
      await new Promise((resolve) => setTimeout(resolve));
      await drawer.updateComplete;
    })()`);
    assert.equal((await glyphButton(page, CLOSE, x)).hint, "Fermer Pages");
    assert.ok((await exposed("button")).includes("Fermer Pages"), "the button's name");
  });

  test("keyboard focus on the Close button, tabbed to from the heading, shows its hint beside it, and focus moved on hides it", async () => {
    await mount(NARROW);
    await openByKeyboard();
    await untilHint(page, CLOSE, false);
    await press("Tab", 9);
    await until(page, `document.querySelector("sl-drawer").shadowRoot.activeElement === ${CLOSE}`);
    await untilHint(page, CLOSE, true);
    const shown = await hintShown(page, CLOSE);
    assert.ok(shown.open && (shown.below || shown.above) && shown.overlaps, JSON.stringify(shown));
    await page.evaluate(`document.querySelector("#filter").focus()`);
    await untilHint(page, CLOSE, false);
    assert.equal((await read()).focused, "filter");
  });

  test("hovering the Close button, focus elsewhere, shows its hint beside it, and pointing away hides it", async () => {
    await mount(NARROW);
    await openByKeyboard();
    await page.evaluate(`document.querySelector("#filter").focus()`);
    await pointAway(page);
    await untilHint(page, CLOSE, false);
    await hover(page, CLOSE);
    await untilHint(page, CLOSE, true);
    const shown = await hintShown(page, CLOSE);
    assert.ok(shown.open && (shown.below || shown.above) && shown.overlaps, JSON.stringify(shown));
    assert.equal((await read()).focused, "filter", "the hint shows with focus elsewhere");
    await pointAway(page);
    await untilHint(page, CLOSE, false);
  });

  test("Escape closes it, focus returns to the opener, and close goes out once", async () => {
    await mount(NARROW);
    await openByKeyboard();
    await press("Escape", 27);
    await closedHeard(1);
    const shown = await read();
    assert.deepEqual(
      [shown.dialogOpen, shown.modal, shown.open, shown.attribute, shown.focused],
      [false, false, false, false, "opener"],
    );
    assert.equal(await pageLive(), true);
    assert.deepEqual(shown.sent, ["open", "close"]);
    assert.deepEqual(
      shown.heard.map(({ type, bubbles, composed }) => [type, bubbles, composed]),
      [
        ["open", true, true],
        ["close", true, true],
      ],
    );
  });

  for (const [how, close] of [
    ["close()", "document.querySelector('sl-drawer').close()"],
    ["toggle()", "document.querySelector('sl-drawer').toggle()"],
    ["open set false", "document.querySelector('sl-drawer').open = false"],
  ]) {
    test(`${how} closes it, focus returns to the opener, and close goes out once`, async () => {
      await mount(NARROW);
      await openByKeyboard();
      await page.evaluate(close);
      await closedHeard(1);
      const shown = await read();
      assert.deepEqual([shown.open, shown.dialogOpen, shown.focused], [false, false, "opener"]);
      assert.deepEqual(shown.sent, ["open", "close"]);
    });
  }

  test("show() just after a resize to narrow opens it, before the media query's change event", async () => {
    await page.evaluate(`(() => {
      const add = MediaQueryList.prototype.addEventListener;
      const wrapped = [];
      window.holdChanges = true;
      MediaQueryList.prototype.addEventListener = function (type, listener, options) {
        const held = (event) => window.holdChanges || listener.call(this, event);
        wrapped.push([this, type, listener, held, options]);
        return add.call(this, type, held, options);
      };
      window.releaseChanges = () => {
        MediaQueryList.prototype.addEventListener = add;
        window.holdChanges = false;
        for (const [query, type, listener, held, options] of wrapped) {
          query.removeEventListener(type, held, options);
          query.addEventListener(type, listener, options);
        }
      };
    })()`);
    try {
      await mount(WIDE);
      await resize(NARROW);
      const shown: { matches: boolean; docked: boolean; modal: boolean } =
        await page.evaluate(`(() => {
        const drawer = document.querySelector("sl-drawer");
        const matches = matchMedia("(width < 48rem)").matches;
        const docked = drawer.matches(":state(docked)");
        drawer.show();
        return { matches, docked, modal: drawer.shadowRoot.querySelector("dialog")?.matches(":modal") ?? false };
      })()`);
      assert.deepEqual(shown, { matches: true, docked: true, modal: true });
    } finally {
      await page.evaluate("window.releaseChanges()");
    }
  });

  test("toggle() and open set true open it modally, open sent once each time", async () => {
    await mount(NARROW);
    await call("toggle");
    assert.deepEqual([(await read()).modal, (await read()).sent], [true, ["open"]]);
    await call("show");
    assert.deepEqual((await read()).sent, ["open"], "show() on an open drawer sends nothing");
    await call("close");
    await call("close");
    assert.deepEqual((await read()).sent, ["open", "close"], "close() on a closed one, nothing");
    await page.evaluate(`document.querySelector("sl-drawer").open = true`);
    const shown = await read();
    assert.deepEqual([shown.modal, shown.sent], [true, ["open", "close", "open"]]);
  });

  test("open set before the first render opens it below dock", async () => {
    await mount(NARROW, { open: true });
    const shown = await read();
    assert.deepEqual([shown.modal, shown.sent], [true, ["open"]]);
  });

  test("open in its markup below dock opens it modally as the page loads, focus on its heading; open goes out once", async () => {
    await mount(NARROW, {}, "", HEIGHT, { attributes: "open" });
    const shown = await read();
    assert.deepEqual(
      [shown.mode, shown.modal, shown.open, shown.attribute, shown.focused, shown.sent],
      ["drawer", true, true, true, "drawer h2", ["open"]],
    );
    assert.deepEqual(shown.heard, [{ type: "open", detail: {}, bubbles: true, composed: true }]);
  });

  test("open in its markup at dock and wider is undone: docked, open false, nothing sent", async () => {
    await mount(WIDE, {}, "", HEIGHT, { attributes: "open" });
    const shown = await read();
    assert.deepEqual(
      [shown.mode, shown.wrapper, shown.modal, shown.open, shown.attribute, shown.sent],
      ["docked", "aside", false, false, false, []],
    );
  });

  for (const [width, mode, modal, sent] of [
    [NARROW, "drawer", true, ["open"]],
    [WIDE, "docked", false, []],
  ] as const) {
    test(`open set before it is connected, at ${width}px, is as open in its markup`, async () => {
      await mount(width, { open: true }, "", HEIGHT, { detached: true });
      const shown = await read();
      assert.deepEqual(
        [shown.mode, shown.modal, shown.open, shown.attribute, shown.sent],
        [mode, modal, modal, modal, sent],
      );
      if (modal) assert.equal(shown.focused, "drawer h2");
    });
  }

  test("removed while open it closes silently, and put back it is a closed drawer that opens modally", async () => {
    await mount(NARROW);
    await openByKeyboard();
    const removed: { open: boolean; attribute: boolean; dialogOpen: boolean } =
      await page.evaluate(`(async () => {
        const drawer = (window.removed = document.querySelector("sl-drawer"));
        drawer.remove();
        await drawer.updateComplete;
        return {
          open: drawer.open,
          attribute: drawer.hasAttribute("open"),
          dialogOpen: drawer.shadowRoot.querySelector("dialog")?.open ?? false,
        };
      })()`);
    assert.deepEqual(removed, { open: false, attribute: false, dialogOpen: false });
    await page.evaluate(`document.querySelector("main").append(window.removed)`);
    await settled("drawer");
    let shown = await read();
    assert.deepEqual([shown.dialogOpen, shown.open, shown.visible], [false, false, false]);
    await call("show");
    shown = await read();
    assert.deepEqual([shown.modal, shown.sent], [true, ["open", "open"]], "no close on removal");
  });

  test("a switch across dock, either way, keeps the very same slotted elements, never disconnected, and their state; it sends nothing and never slides", async () => {
    await mount(NARROW);
    await openByKeyboard();
    await page.evaluate(`document.querySelector("#filter").focus()`);
    await page.cdp("Input.insertText", { text: "quarterly" });
    await page.evaluate(`(() => {
      window.kept = {
        filter: document.querySelector("#filter"),
        count: document.querySelector("#count"),
        probe: document.querySelector("#probe"),
      };
      window.kept.count.click();
    })()`);
    const same = () =>
      page.evaluate(`(() => {
        const drawer = document.querySelector("sl-drawer");
        const { filter, count, probe } = window.kept;
        const kept = [filter, count, probe];
        return {
          identity: document.querySelector("#filter") === filter &&
            document.querySelector("#count") === count && document.querySelector("#probe") === probe,
          parent: kept.every((element) => element.parentNode === drawer),
          slotted: kept.every((element) => element.assignedSlot === drawer.shadowRoot.querySelector("slot:not([name])")),
          lifecycle: { ...window.lifecycle },
          value: filter.value,
          count: count.textContent,
          animations: drawer.shadowRoot.getAnimations().length,
        };
      })()`);
    const kept = {
      identity: true,
      parent: true,
      slotted: true,
      lifecycle: { connected: 1, disconnected: 0 },
      value: "quarterly",
      count: "1",
      animations: 0,
    };
    await resize(WIDE);
    await settled("docked");
    let shown = await read();
    assert.deepEqual(
      [shown.mode, shown.wrapper, shown.modal, shown.open, shown.visible],
      ["docked", "aside", false, false, true],
    );
    assert.deepEqual(await same(), kept, "open at narrow, resized wide");
    assert.deepEqual(await exposed("heading"), ["Documents"], "docked, one heading");
    assert.deepEqual(await exposed("complementary"), ["Documents"]);
    assert.ok(!(await exposed("button")).includes("Close Documents"), "docked, no Close button");
    assert.deepEqual((await headings()).texts, ["Documents"]);
    await resize(NARROW);
    await settled("drawer");
    shown = await read();
    assert.deepEqual([shown.wrapper, shown.dialogOpen, shown.open], ["dialog", false, false]);
    assert.deepEqual(await same(), kept, "docked, resized narrow");
    await resize(WIDE);
    await settled("docked");
    await resize(NARROW);
    await settled("drawer");
    assert.deepEqual(await same(), kept, "closed at narrow, resized wide and back");
    await page.evaluate(`document.querySelector("sl-drawer").dock = "20rem"`);
    await settled("docked");
    assert.deepEqual(await same(), kept, "dock lowered past the viewport");
    await page.evaluate(`document.querySelector("sl-drawer").dock = "48rem"`);
    await settled("drawer");
    assert.deepEqual(await same(), kept, "dock raised past the viewport");
    await call("show");
    shown = await read();
    assert.deepEqual([shown.modal, shown.focused], [true, "drawer h2"]);
    await slid();
    assert.deepEqual(await exposed("heading"), ["Documents"], "a drawer again, one heading");
    assert.deepEqual(await exposed("dialog"), ["Documents"]);
    assert.ok((await exposed("button")).includes("Close Documents"));
    assert.deepEqual(await exposed("complementary"), [], "no landmark left behind");
    await page.evaluate("new Promise((resolve) => setTimeout(resolve, 50))");
    assert.deepEqual((await read()).sent, ["open", "open"], "only the opens went out");
  });

  test("the drawer slides in by a transition, and under reduced motion opens with none", async () => {
    const running = () =>
      page.evaluate(`(() => {
        const drawer = document.querySelector("sl-drawer");
        drawer.show();
        const dialog = drawer.shadowRoot.querySelector("dialog");
        return {
          duration: getComputedStyle(dialog).transitionDuration,
          transitions: drawer.shadowRoot.getAnimations().map((a) => a.transitionProperty).sort(),
          translate: getComputedStyle(dialog).translate,
        };
      })()`);
    await mount(NARROW);
    const motion = await running();
    assert.ok(motion.transitions.includes("translate"), `transitions ${motion.transitions}`);
    const durations = (duration: string) => new Set(duration.split(", "));
    assert.equal(durations(motion.duration).size, 1, `durations ${motion.duration}`);
    assert.notEqual(
      motion.duration.split(", ")[0],
      "0s",
      "the motion sheet's --duration-m resolves",
    );
    await mount(NARROW, {}, "", HEIGHT, { attributes: 'style="--duration-m: 345ms"' });
    assert.deepEqual(
      durations((await running()).duration),
      new Set(["0.345s"]),
      "the slide takes --duration-m",
    );
    await page.cdp("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    await mount(NARROW);
    const reduced = await running();
    assert.deepEqual(reduced, { duration: "0s", transitions: [], translate: "0px" });
    await call("close");
    assert.deepEqual(
      await page.evaluate(
        `document.querySelector("sl-drawer").shadowRoot.querySelector("dialog").checkVisibility()`,
      ),
      false,
      "closed at once",
    );
  });

  for (const [dir, edge] of [
    ["ltr", "left"],
    ["rtl", "right"],
  ] as const) {
    test(`in a ${dir} page the drawer slides in from past the ${edge} edge and ends flush with it`, async () => {
      await page.evaluate(`document.documentElement.dir = "${dir}"`);
      await mount(NARROW);
      const at = (time: "start" | "end") =>
        page.evaluate(`(() => {
          const dialog = document.querySelector("sl-drawer").shadowRoot.querySelector("dialog");
          for (const animation of dialog.getAnimations()) {
            animation.pause();
            animation.currentTime = ${time === "start" ? "0" : "animation.effect.getTiming().duration"};
          }
          const { left, right } = dialog.getBoundingClientRect();
          return { left, right };
        })()`);
      await call("show");
      const start = await at("start");
      const end = await at("end");
      if (edge === "left") {
        assert.ok(start.right <= 1, `starts past the left edge: ${start.right}`);
        assert.ok(Math.abs(end.left) <= 1, `ends flush with the left edge: ${end.left}`);
      } else {
        assert.ok(start.left >= NARROW - 1, `starts past the right edge: ${start.left}`);
        assert.ok(
          Math.abs(end.right - NARROW) <= 1,
          `ends flush with the right edge: ${end.right}`,
        );
      }
    });
  }
});
