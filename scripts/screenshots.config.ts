// The capture description web-tooling's web-screenshots bin reads for mise run screenshots: each
// specimen page under demo/, whole in tiles, and the drawer's page in its viewport at a wide and a
// narrow width in four states; the palette, space, and type facets at the foundation's defaults;
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
  .concat({
    name: "drawer",
    caption: "the drawer",
    path: "demo/drawer.html",
    states: drawerStates,
  });

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
