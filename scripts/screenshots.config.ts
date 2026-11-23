// The capture description web-tooling's web-screenshots bin reads for mise run screenshots: each
// specimen page under demo/, whole in tiles; the drawer's page in its viewport at a wide and a
// narrow width in four states, and its modal drawer open at the wide width, then with its Close
// reached by Tab; the settings' page whole, then with the Settings dialog opened by S, wide and
// narrow, focus in its rows; the shortcuts' page whole, then with the Help dialog opened by ?, its
// Close reached by Tab; the palette, space, and type facets at the foundation's defaults;
// --all's profiles; each page's registered profiles; and the repository served as the browser tier
// serves it.
// Adapted from spike-html-apps-components (10dde51): scripts/screenshots.config.ts, on web-tooling.

import type {
  DescribedPage,
  DescribedState,
  Description,
  Step,
} from "@standards-lab/web-tooling/screenshots.js";

import { DEFAULTS, colors, spaces, types } from "../test/browser/support/profiles.ts";
import { served } from "../test/browser/support/served.ts";

const docked = { width: 1280, height: 800 };
const undocked = { width: 480, height: 800 };

const openedByEnter =
  (dir: "ltr" | "rtl"): Step =>
  async (page) => {
    await page.evaluate(`document.documentElement.dir = "${dir}"`);
    await page.cdp("Emulation.setFocusEmulationEnabled", { enabled: true });
    await page.evaluate(`document.querySelector("#open-documents").focus()`);
    const enter = { key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 };
    await page.cdp("Input.dispatchKeyEvent", { type: "keyDown", ...enter, text: "\r" });
    await page.cdp("Input.dispatchKeyEvent", { type: "keyUp", ...enter });
    await page.evaluate(`(async () => {
      const dialog = document.querySelector("sl-drawer").shadowRoot.querySelector("dialog");
      await Promise.all(dialog.getAnimations({ subtree: true }).map((a) => a.finished));
    })()`);
  };

const tab: Step = async (page) => {
  const key = { key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 };
  await page.cdp("Input.dispatchKeyEvent", { type: "keyDown", ...key });
  await page.cdp("Input.dispatchKeyEvent", { type: "keyUp", ...key });
};

const modalOpened =
  (then?: Step): Step =>
  async (page) => {
    await page.cdp("Emulation.setFocusEmulationEnabled", { enabled: true });
    await page.evaluate(`(async () => {
      const drawer = document.querySelector("#outline");
      document.querySelector("#open-outline").click();
      await drawer.updateComplete;
      const dialog = drawer.shadowRoot.querySelector("dialog");
      await Promise.all(dialog.getAnimations({ subtree: true }).map((a) => a.finished));
    })()`);
    await then?.(page);
  };

const pressed =
  (key: "s" | "?", dialog: string, then?: Step): Step =>
  async (page) => {
    await page.cdp("Emulation.setFocusEmulationEnabled", { enabled: true });
    const press =
      key === "s"
        ? { key: "s", code: "KeyS", windowsVirtualKeyCode: 83 }
        : { key: "?", code: "Slash", windowsVirtualKeyCode: 191, modifiers: 8 };
    await page.cdp("Input.dispatchKeyEvent", {
      type: "keyDown",
      ...press,
      text: key,
      unmodifiedText: key,
    });
    await page.cdp("Input.dispatchKeyEvent", { type: "keyUp", ...press });
    await page.evaluate(`(async () => {
      const dialog = document.querySelector("${dialog}");
      while (!dialog.open) await new Promise((resolve) => requestAnimationFrame(resolve));
      const hosts = dialog.querySelectorAll("sl-settings, sl-shortcuts");
      await Promise.all([...hosts].map((host) => host.updateComplete));
      const settled = () => {
        const active = document.activeElement;
        return dialog.contains(active) && (!active.shadowRoot || active.shadowRoot.activeElement);
      };
      while (!settled()) await new Promise((resolve) => requestAnimationFrame(resolve));
    })()`);
    await then?.(page);
  };

const drawerStates: DescribedState[] = [
  {
    name: "drawer-docked",
    caption: "the drawer, docked at 48rem and wider",
    viewport: docked,
    full: false,
  },
  {
    name: "drawer-closed",
    caption: "the drawer, closed below 48rem",
    viewport: undocked,
    full: false,
  },
  {
    name: "drawer-open",
    caption: "the drawer, open below 48rem",
    viewport: undocked,
    full: false,
    open: openedByEnter("ltr"),
  },
  {
    name: "drawer-open-rtl",
    caption: "the drawer, open below 48rem, right to left",
    viewport: undocked,
    full: false,
    open: openedByEnter("rtl"),
  },
  {
    name: "drawer-modal",
    caption: "the modal drawer, open at 1280px",
    viewport: docked,
    full: false,
    open: modalOpened(),
  },
  {
    name: "drawer-modal-close",
    caption: "the modal drawer, open at 1280px, its Close reached by Tab",
    viewport: docked,
    full: false,
    open: modalOpened(tab),
  },
];

const narrow = { width: 390, height: 844 };

const settingsStates: DescribedState[] = [
  { name: "settings", caption: "the settings", full: true },
  {
    name: "settings-dialog",
    caption: "the Settings dialog, opened by S",
    viewport: docked,
    full: false,
    open: pressed("s", "#settings"),
  },
  {
    name: "settings-dialog-narrow",
    caption: "the Settings dialog at 390px, opened by S",
    viewport: narrow,
    full: false,
    open: pressed("s", "#settings"),
  },
];

const shortcutsStates: DescribedState[] = [
  { name: "shortcuts", caption: "the shortcuts", full: true },
  {
    name: "shortcuts-dialog",
    caption: "the Help dialog, opened by ?, then Tab to its Close",
    viewport: docked,
    full: false,
    open: pressed("?", "#help", tab),
  },
];

const pages: DescribedPage[] = (
  [
    ["status-badge", "the status badge"],
    ["entry", "the entry"],
    ["pagination", "the pagination"],
    ["artifact-viewer", "the artifact viewer"],
    ["chat-thread", "the chat thread"],
    ["composer", "the composer"],
    ["upload-dropzone", "the upload dropzone"],
    ["stage-timeline", "the stage timeline"],
    ["event-log", "the event log"],
    ["search-results", "the search results"],
    ["document-list", "the document list"],
  ] satisfies [name: string, caption: string][]
)
  .map(([name, caption]): DescribedPage => ({ name, caption, path: `demo/${name}.html` }))
  .concat(
    {
      name: "drawer",
      caption: "the drawer",
      path: "demo/drawer.html",
      states: drawerStates,
    },
    {
      name: "settings",
      caption: "the settings",
      path: "demo/settings.html",
      states: settingsStates,
    },
    {
      name: "shortcuts",
      caption: "the shortcuts",
      path: "demo/shortcuts.html",
      states: shortcutsStates,
    },
  );

const REGISTRY = `(() => {
  const store = globalThis[Symbol.for("web-foundation.registry")] ?? {};
  return { palette: store.color ?? [], space: store.space ?? [], type: store.type ?? [] };
})()`;

const description: Description = {
  pages,
  facets: [
    { flag: "palette", attribute: "data-palette", default: DEFAULTS.color },
    { flag: "space", attribute: "data-space", default: DEFAULTS.space },
    { flag: "type", attribute: "data-type", default: DEFAULTS.type },
  ],
  all: [
    ...colors.map((palette) => ({ palette })),
    ...spaces.map((space) => ({ space })),
    ...types.map((type) => ({ type })),
  ],
  profiles: (page) => page.evaluate(REGISTRY),
  server: served,
};

export default description;
