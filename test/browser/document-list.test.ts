// Adapted from spike-html-apps-components (10dde51): test/browser/document-list.test.ts, on @standards-lab/web-tooling.

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { launch } from "@standards-lab/web-tooling/browser.js";
import type { Browser, Page } from "@standards-lab/web-tooling/browser.js";
import { serve } from "@standards-lab/web-tooling/server.js";
import type { Server } from "@standards-lab/web-tooling/server.js";

import { served } from "./support/served.ts";

interface Heard {
  type: string;
  detail: unknown;
  bubbles: boolean;
  composed: boolean;
  target: boolean;
  same: boolean;
}

interface Read {
  state: string | null;
  disabled: boolean;
  paginations: number;
  slotted: string[];
  status: [string | null, string, string];
  statusHeight: number;
  statusSlot: string | null;
  list: [string | null, string | null] | null;
  paging: {
    page: number | null;
    size: number | null;
    total: number | null;
    more: boolean;
    pageSizes: number[] | null;
    disabled: boolean;
  };
  summary: string | null;
  summaryHeight: number | null;
  above: number | null;
  line: number;
  entries: {
    item: unknown;
    current: string | null;
    mark: boolean;
    text: string;
    box: number[];
  }[];
  heard: Heard[];
  reached: string[];
}

describe("document list", { timeout: 60_000 }, () => {
  let server: Server;
  let browser: Browser;
  let page: Page;
  before(async () => {
    server = await serve(served);
    browser = await launch();
    page = await browser.open(`${server.origin}/test/fixtures/components.html`);
    await page.cdp("Emulation.setFocusEmulationEnabled", { enabled: true });
    await page.evaluate(`window.verdict.then(async () => {
      await import("/dist/document-list.js");
      const types = ["open", "page-change", "page-size-change"];
      window.heard = [];
      window.reached = [];
      for (const type of types) document.addEventListener(type, (event) => window.reached.push(event.type));
      window.mount = async (fields) => {
        const list = Object.assign(document.createElement("sl-document-list"), fields);
        window.heard.length = 0;
        window.reached.length = 0;
        const sent = [];
        document.querySelector("main").replaceChildren(list);
        await list.updateComplete;
        for (const type of types) {
          list.shadowRoot.addEventListener(type, (event) => sent.push(event));
          list.addEventListener(type, (event) => window.heard.push({
            type: event.type,
            detail: event.detail,
            bubbles: event.bubbles,
            composed: event.composed,
            target: event.target === list,
            same: sent.includes(event),
          }));
        }
        await window.settled(list);
        return list;
      };
      window.settled = async (list) => {
        await list.updateComplete;
        const pagination = list.shadowRoot.querySelector("sl-pagination");
        await pagination.updateComplete;
        await Promise.all([...list.shadowRoot.querySelectorAll("sl-entry")].map((entry) => entry.updateComplete));
      };
      window.read = async () => {
        const list = document.querySelector("sl-document-list");
        await window.settled(list);
        const root = list.shadowRoot;
        const paginations = root.querySelectorAll("sl-pagination");
        const pagination = paginations[0];
        const status = root.querySelector(".status");
        const ul = root.querySelector("ul");
        return {
          state: list.getAttribute("state"),
          disabled: list.hasAttribute("disabled"),
          paginations: paginations.length,
          slotted: [...pagination.children].map((child) => child.localName),
          status: [status.getAttribute("role"), status.textContent.replace(/\\s+/g, " ").trim(), status.className],
          statusHeight: status.getBoundingClientRect().height,
          statusSlot: status.assignedSlot?.name ?? null,
          list: ul && [ul.getAttribute("aria-label"), ul.getAttribute("aria-busy")],
          paging: {
            page: pagination.page,
            size: pagination.size,
            total: pagination.total,
            more: pagination.more,
            pageSizes: pagination.pageSizes,
            disabled: pagination.disabled,
          },
          summary: pagination.shadowRoot.querySelector(".summary")?.textContent ?? null,
          summaryHeight: pagination.shadowRoot.querySelector(".summary")?.getBoundingClientRect().height ?? null,
          above: ul && ul.getBoundingClientRect().top -
            (pagination.shadowRoot.querySelector(".summary")?.getBoundingClientRect().bottom ??
              pagination.getBoundingClientRect().top),
          line: parseFloat(getComputedStyle(status).lineHeight),
          entries: [...root.querySelectorAll("ul > li")].map((li) => {
            const entry = li.querySelector("sl-entry");
            const frame = getComputedStyle(entry.shadowRoot.querySelector("button")).boxShadow;
            const rect = entry.getBoundingClientRect();
            return {
              item: entry.item,
              current: li.getAttribute("aria-current"),
              mark: entry.selected && entry.hasAttribute("selected") && frame.includes("inset"),
              text: entry.shadowRoot.querySelector("button").textContent.replace(/\\s+/g, " ").trim(),
              box: [rect.left, rect.top, rect.width, rect.height],
            };
          }),
          heard: window.heard,
          reached: window.reached,
        };
      };
    })`);
  });
  after(async () => {
    await page?.close();
    await browser?.close();
    await server?.stop();
  });

  const mount = (fields: Record<string, unknown> = {}) =>
    page.evaluate(`window.mount(${JSON.stringify(fields)}).then(() => {})`);
  const read = (): Promise<Read> => page.evaluate("window.read()");
  const update = (fields: Record<string, unknown>) =>
    page.evaluate(`(async () => {
      const list = document.querySelector("sl-document-list");
      Object.assign(list, ${JSON.stringify(fields)});
      await window.settled(list);
    })()`);
  const press = async (key: string, keyCode: number, text?: string) => {
    const event = { key, code: key, windowsVirtualKeyCode: keyCode };
    await page.cdp("Input.dispatchKeyEvent", {
      type: "keyDown",
      ...event,
      ...(text ? { text, unmodifiedText: text } : {}),
    });
    await page.cdp("Input.dispatchKeyEvent", { type: "keyUp", ...event });
  };

  const documents = [
    {
      id: "doc-1",
      name: "terms.md",
      content_type: "text/markdown",
      size: 3120,
      created_at: "2026-10-27T11:12:44Z",
      run_id: "run-1",
      status: "complete",
    },
    {
      id: "doc-2",
      name: "retainer.docx",
      content_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: 41230,
      created_at: "2026-10-27T16:05:19Z",
      run_id: "run-2",
      status: "complete",
    },
    {
      id: "doc-3",
      name: "interview-notes.txt",
      content_type: "text/plain; charset=utf-8",
      size: 7204,
      created_at: "2026-10-29T15:42:03Z",
      run_id: "run-3",
      status: "running",
    },
  ];
  const paging = { page: 1, size: 3, total: 8, more: true, pageSizes: [3, 6, 12] };

  test("one pagination holds the status line and the list, and an entry per document, its item mapped from it", async () => {
    await mount({ ...paging, items: documents });
    const { paginations, slotted, statusSlot, list, entries, summary } = await read();
    assert.equal(paginations, 1);
    assert.deepEqual(slotted, ["p", "ul"]);
    assert.equal(statusSlot, "status", "the status line in the summary's slot");
    assert.deepEqual(list, ["Documents", null]);
    assert.equal(summary, "Showing 1–3 of 8");
    assert.deepEqual(
      entries.map(({ item }) => item),
      documents.map(({ id, name, content_type, size, created_at, status }) => ({
        id,
        name,
        content_type,
        size,
        status,
        updated_at: created_at,
      })),
    );
    assert.match(
      entries[2].text,
      /^interview-notes\.txt running file 7\.2 kB text\/plain; charset=utf-8 /,
    );
  });

  test("a document's status tone passes through to its entry, which shows its status in the tone's hue; none leaves it muted", async () => {
    const toned = [
      { ...documents[0], status: "failed 3/5", status_tone: "failed" },
      { ...documents[1], status_tone: "complete" },
      documents[2],
    ];
    const shown = () =>
      page.evaluate(`(async () => {
        const list = document.querySelector("sl-document-list");
        await window.settled(list);
        return [...list.shadowRoot.querySelectorAll("sl-entry")].map((entry) => {
          const root = entry.shadowRoot;
          const resolve = (value) => {
            const probe = root.appendChild(document.createElement("span"));
            probe.style.color = value;
            const resolved = getComputedStyle(probe).color;
            probe.remove();
            return resolved;
          };
          const hues = { green: resolve("var(--green)"), red: resolve("var(--red)"), muted: resolve("var(--fg-2)") };
          const status = root.querySelector(".status");
          const color = getComputedStyle(status).color;
          return [entry.statusTone, status.textContent,
            Object.keys(hues).find((hue) => hues[hue] === color) ?? color];
        });
      })()`);
    await mount({ ...paging, items: toned });
    assert.deepEqual(await shown(), [
      ["failed", "failed 3/5", "red"],
      ["complete", "complete", "green"],
      [null, "running", "muted"],
    ]);
    await update({
      items: [{ ...toned[0], status: "complete", status_tone: "complete" }, ...toned.slice(1)],
    });
    assert.deepEqual(
      (await shown())[0],
      ["complete", "complete", "green"],
      "the replaced document's entry",
    );
  });

  test("the pagination's properties pass through as given, and its defaults are the list's", async () => {
    await mount();
    assert.deepEqual((await read()).paging, {
      page: 1,
      size: 12,
      total: null,
      more: false,
      pageSizes: [12, 24, 48, 96],
      disabled: false,
    });
    await mount({ ...paging, items: documents });
    assert.deepEqual((await read()).paging, { ...paging, disabled: false });
    await update({ page: null, total: null, more: true, size: 6, pageSizes: [6], disabled: true });
    const { paging: passed, disabled } = await read();
    assert.deepEqual(passed, {
      page: null,
      size: 6,
      total: null,
      more: true,
      pageSizes: [6],
      disabled: true,
    });
    assert.equal(disabled, true, "disabled reflected, as the pagination's is");
  });

  test("the paging attributes convert as the pagination's do", async () => {
    const passed: unknown[] = await page.evaluate(`(async () => {
      const holder = document.querySelector("main");
      holder.innerHTML = '<sl-document-list page="2" size="6" total="14" more page-sizes="[6,12]" disabled></sl-document-list>';
      const list = holder.firstElementChild;
      await window.settled(list);
      const pagination = list.shadowRoot.querySelector("sl-pagination");
      return [pagination.page, pagination.size, pagination.total, pagination.more, pagination.pageSizes, pagination.disabled];
    })()`);
    assert.deepEqual(passed, [2, 6, 14, true, [6, 12], true]);
  });

  test("the selected document's item is aria-current and its entry framed; the others neither", async () => {
    await mount({ ...paging, items: documents, selected: "doc-2" });
    const { entries } = await read();
    assert.deepEqual(
      entries.map(({ current, mark }) => [current, mark]),
      [
        [null, false],
        ["true", true],
        [null, false],
      ],
    );
  });

  test("selecting another document moves the frame and no entry", async () => {
    await mount({ ...paging, items: documents });
    const before = await read();
    assert.ok(before.entries.every(({ current, mark }) => current === null && !mark));
    await update({ selected: "doc-3" });
    const after = await read();
    assert.deepEqual(
      after.entries.map(({ current }) => current),
      [null, null, "true"],
    );
    assert.deepEqual(
      after.entries.map(({ box }) => box),
      before.entries.map(({ box }) => box),
    );
    await update({ selected: null });
    assert.ok((await read()).entries.every(({ current, mark }) => current === null && !mark));
  });

  test("ready with no documents says so quietly, on a line of its own, and lists none", async () => {
    await mount({ total: 0 });
    const { state, status, statusSlot, summary, list, entries } = await read();
    assert.equal(state, "ready");
    assert.deepEqual(status, ["status", "No documents.", "status ready status-line"]);
    assert.deepEqual([summary, statusSlot], [null, ""]);
    assert.equal(list, null);
    assert.deepEqual(entries, []);
  });

  test("a ready page leaves the status blank on the summary's line, and no line of its own", async () => {
    await mount({ ...paging, items: documents });
    const { status, statusSlot, summaryHeight, above, line } = await read();
    assert.deepEqual(status, ["status", "", "status ready"]);
    assert.equal(statusSlot, "status");
    assert.ok(
      above !== null && above < line,
      `the first entry ${above} below the summary, a line ${line}`,
    );
    assert.ok(
      summaryHeight !== null && summaryHeight > 0 && summaryHeight < 2 * line,
      `the summary ${summaryHeight} tall`,
    );
  });

  test("loading says so, reflected; a first load lists nothing, and a page change keeps its page busy", async () => {
    await mount({ state: "loading" });
    let shown = await read();
    assert.equal(shown.state, "loading");
    assert.deepEqual(shown.status, ["status", "Loading documents…", "status loading status-line"]);
    assert.equal(shown.statusSlot, "", "a first load has no summary to join");
    assert.equal(shown.list, null);
    await mount({ ...paging, items: documents });
    const ready = await read();
    await update({ state: "loading" });
    shown = await read();
    assert.equal(shown.state, "loading");
    assert.deepEqual(shown.status, ["status", "Loading documents…", "status loading"]);
    assert.equal(shown.statusSlot, "status");
    assert.deepEqual(shown.list, ["Documents", "true"]);
    assert.equal(shown.summaryHeight, ready.summaryHeight);
    assert.deepEqual(
      shown.entries.map(({ box }) => box),
      ready.entries.map(({ box }) => box),
    );
    await update({ state: "ready" });
    assert.deepEqual((await read()).list, ["Documents", null]);
  });

  test("with no summary to join, a page continued by cursor, the status is a line of its own, held blank, so loading moves no entry", async () => {
    await mount({ ...paging, page: null, total: null, items: documents });
    const ready = await read();
    assert.deepEqual([ready.summary, ready.statusSlot, ready.status[1]], [null, "", ""]);
    assert.ok(
      ready.statusHeight >= ready.line - 0.5,
      `the blank status line ${ready.statusHeight} tall`,
    );
    await update({ state: "loading" });
    const loading = await read();
    assert.deepEqual([loading.statusSlot, loading.status[1]], ["", "Loading documents…"]);
    assert.equal(loading.statusHeight, ready.statusHeight);
    assert.deepEqual(
      loading.entries.map(({ box }) => box),
      ready.entries.map(({ box }) => box),
    );
  });

  test("an error shows its label and message, reflected, and lists no documents", async () => {
    await mount({
      ...paging,
      items: documents,
      state: "error",
      message: "503 Service Unavailable.",
    });
    const { state, status, statusSlot, list, entries, paginations } = await read();
    assert.equal(state, "error");
    assert.equal(statusSlot, "", "an error on a line of its own, though the summary shows");
    assert.deepEqual(status, [
      "status",
      "Couldn't load the documents. 503 Service Unavailable.",
      "status error status-line",
    ]);
    assert.equal(list, null);
    assert.deepEqual(entries, []);
    assert.equal(paginations, 1);
    await update({ message: "" });
    assert.equal((await read()).status[1], "Couldn't load the documents.");
  });

  test("an entry's open reaches the list's listener once, the entry's own event and detail, bubbling and composed", async () => {
    await mount({ ...paging, items: documents });
    await page.evaluate(`(() => {
      const entry = document.querySelector("sl-document-list").shadowRoot.querySelectorAll("sl-entry")[1];
      entry.shadowRoot.querySelector("button").click();
    })()`);
    const { heard, reached } = await read();
    assert.deepEqual(heard, [
      {
        type: "open",
        detail: { id: "doc-2", kind: "file" },
        bubbles: true,
        composed: true,
        target: true,
        same: true,
      },
    ]);
    assert.deepEqual(reached, ["open"]);
  });

  test("the keyboard reaches the first entry by Tab, and Enter opens it, once", async () => {
    await mount({ ...paging, items: documents });
    await page.evaluate(`(() => {
      const before = Object.assign(document.createElement("button"), { textContent: "before" });
      document.querySelector("main").prepend(before);
      before.focus();
    })()`);
    await press("Tab", 9);
    await press("Enter", 13, "\r");
    const { heard } = await read();
    assert.deepEqual(
      heard.map(({ type, detail, same }) => [type, detail, same]),
      [["open", { id: "doc-1", kind: "file" }, true]],
    );
  });

  test("the pagination's page-change and page-size-change reach the list's listener once each, its own events and details", async () => {
    await mount({ ...paging, page: 2, items: documents });
    await page.evaluate(`(() => {
      const root = document.querySelector("sl-document-list").shadowRoot.querySelector("sl-pagination").shadowRoot;
      root.querySelector('button[aria-label="Next page"]').click();
      root.querySelector('button[aria-label="Previous page"]').click();
      const select = root.querySelector("select");
      select.value = "6";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);
    const { heard, reached } = await read();
    assert.deepEqual(heard, [
      {
        type: "page-change",
        detail: { page: 3 },
        bubbles: true,
        composed: true,
        target: true,
        same: true,
      },
      {
        type: "page-change",
        detail: { page: 1 },
        bubbles: true,
        composed: true,
        target: true,
        same: true,
      },
      {
        type: "page-size-change",
        detail: { size: 6 },
        bubbles: true,
        composed: true,
        target: true,
        same: true,
      },
    ]);
    assert.deepEqual(reached, ["page-change", "page-change", "page-size-change"]);
  });

  test("the list sends no event as its properties change", async () => {
    await mount();
    await update({ state: "loading" });
    await update({ ...paging, items: documents, state: "ready" });
    await update({ selected: "doc-1" });
    await update({ page: 2, selected: "doc-3" });
    await update({ size: 6, pageSizes: [6, 12], total: 12, more: false });
    await update({ state: "error", message: "down" });
    await update({ items: [], state: "ready", disabled: true });
    const { heard, reached } = await read();
    assert.deepEqual(heard, []);
    assert.deepEqual(reached, []);
  });
});
