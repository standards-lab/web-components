import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";

import { launch, SETTLED } from "@standards-lab/web-tooling/browser.js";
import type { Browser, Page } from "@standards-lab/web-tooling/browser.js";
import { serve } from "@standards-lab/web-tooling/server.js";
import type { Server } from "@standards-lab/web-tooling/server.js";

import { DEFAULTS, colors, spaces, types } from "./support/profiles.ts";
import { served } from "./support/served.ts";

interface Choice {
  color: string;
  space: string;
  type: string;
  scheme: string;
}

const TOKENS = [
  "--bg",
  "--bg-1",
  "--bg-2",
  "--border",
  "--border-2",
  "--fg",
  "--fg-2",
  "--fg-3",
  "--red",
  "--orange",
  "--yellow",
  "--green",
  "--cyan",
  "--blue",
  "--purple",
  "--magenta",
];

const schemes = ["light", "dark"];

const choices: Choice[] = [
  ...colors.map((color) => ({ color })),
  ...spaces.map((space) => ({ space })),
  ...types.map((type) => ({ type })),
].flatMap((profile) => schemes.map((scheme) => ({ ...DEFAULTS, ...profile, scheme })));

const pages = readdirSync(join(import.meta.dirname, "../../demo"))
  .filter((file) => file.endsWith(".html") && file !== "components.html")
  .map((file) => file.slice(0, -".html".length))
  .sort();

const RENDERED = `(async () => {
  const hosts = () => {
    const found = [];
    const walk = (root) => {
      for (const element of root.querySelectorAll("*")) {
        if (element.localName.startsWith("sl-")) found.push(element);
        if (element.shadowRoot) walk(element.shadowRoot);
      }
    };
    walk(document);
    return found;
  };
  let count = -1;
  while (count !== hosts().length) {
    count = hosts().length;
    await Promise.all([...new Set(hosts().map((host) => host.localName))]
      .map((tag) => customElements.whenDefined(tag)));
    await Promise.all(hosts().map((host) => host.updateComplete));
  }
  await ${SETTLED};
})()`;

const READ = `async (choice) => {
  const attributes = { color: "data-palette", space: "data-space", type: "data-type", scheme: "data-scheme" };
  for (const [facet, name] of Object.entries(choice)) {
    document.documentElement.setAttribute(attributes[facet], name);
  }
  await ${SETTLED};
  const resolve = (value) => {
    const probe = document.body.appendChild(document.createElement("span"));
    probe.style.color = value;
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    return resolved;
  };
  const tokens = Object.fromEntries(${JSON.stringify(TOKENS)}.map((token) => [token, resolve("var(" + token + ")")]));
  const interaction = resolve("var(--color-primary, var(--blue))");
  const texts = [];
  const walk = (root, path) => {
    for (const element of root.querySelectorAll("*")) {
      if (element.shadowRoot) walk(element.shadowRoot, path + " " + element.localName);
      if (root === document) continue;
      const shows = [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.data.trim())
        || (element.matches("textarea, input:not([type=radio], [type=checkbox])") && (element.value || element.placeholder));
      if (!shows || element.getClientRects().length === 0) continue;
      const style = getComputedStyle(element);
      if (style.visibility !== "visible") continue;
      texts.push({ where: path.trim() + " > " + element.localName + (element.className ? "." + [...element.classList].join(".") : ""), color: style.color });
    }
  };
  walk(document, "");
  return { tokens, interaction, texts };
}`;

interface Read {
  tokens: Record<string, string>;
  interaction: string;
  texts: { where: string; color: string }[];
}

const TRANSPARENT = /^rgba\(.*, 0\)$/;

describe("themes", { timeout: 120_000 }, () => {
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
    await page.evaluate(RENDERED);
    return page;
  }

  test("the registry lists the four built-in colors, the default first, and a space and a type besides the defaults", () => {
    for (const color of ["zen", "github", "catppuccin", "everforest"]) {
      assert.ok(colors.includes(color), `${color} in ${colors}`);
    }
    assert.equal(colors[0], DEFAULTS.color);
    assert.ok(spaces.length > 0 && types.length > 0, `${spaces} ${types}`);
  });

  for (const name of pages) {
    test(`every text the ${name} page's components render takes the profile's color tokens, its foreground among them, in each of the ${choices.length} profile combinations`, async () => {
      const page = await open(name);
      try {
        const foregrounds = new Set<string>();
        for (const choice of choices) {
          const where = `${name} in ${Object.values(choice).join(" ")}`;
          const { tokens, texts }: Read = await page.evaluate(
            `(${READ})(${JSON.stringify(choice)})`,
          );
          foregrounds.add(tokens["--fg"]);
          const allowed = new Set(Object.values(tokens));
          assert.ok(texts.length > 0, `${where}: no text read`);
          const strays = texts.filter(
            ({ color }) => !allowed.has(color) && !TRANSPARENT.test(color),
          );
          assert.deepEqual(strays, [], `${where}: text in no token's color`);
          assert.ok(
            texts.some(({ color }) => color === tokens["--fg"]),
            `${where}: no text in the foreground, ${tokens["--fg"]}`,
          );
        }
        assert.equal(
          foregrounds.size,
          colors.length * schemes.length,
          `each color, light and dark, sets its own foreground: ${[...foregrounds].join(", ")}`,
        );
      } finally {
        await page.close();
      }
    });
  }

  interface Ring {
    where: string;
    visible: boolean;
    style: string;
    width: number;
    color: string;
  }

  const RING = `(() => {
    let active = document.activeElement;
    const path = [active.localName];
    while (active.shadowRoot?.activeElement) {
      active = active.shadowRoot.activeElement;
      path.push(active.localName);
    }
    const style = getComputedStyle(active);
    return {
      where: path.join(" > "),
      visible: active.matches(":focus-visible"),
      style: style.outlineStyle,
      width: parseFloat(style.outlineWidth),
      color: style.outlineColor,
    };
  })()`;

  async function tab(page: Page): Promise<void> {
    const key = { key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 };
    await page.cdp("Input.dispatchKeyEvent", { type: "keyDown", ...key });
    await page.cdp("Input.dispatchKeyEvent", { type: "keyUp", ...key });
  }

  async function focus(page: Page, name: string): Promise<void> {
    await page.cdp("Emulation.setFocusEmulationEnabled", { enabled: true });
    const presses: number = await page.evaluate(
      name === "drawer"
        ? `(async () => {
          const drawer = document.querySelector("sl-drawer");
          drawer.dock = "999rem";
          await drawer.updateComplete;
          drawer.show();
          await drawer.updateComplete;
          const dialog = drawer.shadowRoot.querySelector("dialog");
          await Promise.all(dialog.getAnimations({ subtree: true }).map((a) => a.finished));
          return 1;
        })()`
        : `(() => {
          const mark = document.querySelector("[data-focus-start]");
          mark.focus();
          return Number(mark.dataset.focusStart);
        })()`,
    );
    for (let press = 0; press < presses; press++) await tab(page);
  }

  const unfocusable = { "stage-timeline": "sl-stage-timeline", shortcuts: "sl-shortcuts" };

  for (const name of pages.filter((page) => !Object.hasOwn(unfocusable, page))) {
    test(`the ${name} page's focus ring, brought by the keyboard, is the interaction color each color profile resolves, light and dark`, async () => {
      const page = await open(name);
      try {
        await focus(page, name);
        const rings = new Set<string>();
        for (const choice of choices.filter((choice) => choice.space === DEFAULTS.space)) {
          const where = `${name} in ${Object.values(choice).join(" ")}`;
          const { interaction }: Read = await page.evaluate(`(${READ})(${JSON.stringify(choice)})`);
          const ring: Ring = await page.evaluate(RING);
          assert.ok(ring.where.includes(" > "), `${where}: focus in a shadow tree, ${ring.where}`);
          assert.deepEqual(
            { visible: ring.visible, style: ring.style, drawn: ring.width > 0, color: ring.color },
            { visible: true, style: "solid", drawn: true, color: interaction },
            `${where}: the ring on ${ring.where}`,
          );
          rings.add(ring.color);
        }
        assert.equal(rings.size, colors.length * schemes.length, [...rings].join(", "));
      } finally {
        await page.close();
      }
    });
  }

  for (const [name, tag] of Object.entries(unfocusable)) {
    test(`the ${name} page's ${tag}, which the focus ring cases skip, renders nothing the keyboard can focus`, async () => {
      const page = await open(name);
      try {
        const found: { hosts: number; focusable: string[] } = await page.evaluate(`(() => {
          const hosts = [...document.querySelectorAll("${tag}")];
          return {
            hosts: hosts.length,
            focusable: hosts
              .flatMap((host) => [...host.shadowRoot.querySelectorAll("*")])
              .filter((element) => element.tabIndex >= 0)
              .map((element) => element.localName),
          };
        })()`);
        assert.ok(found.hosts > 0, `${name}: no ${tag} rendered`);
        assert.deepEqual(found.focusable, []);
      } finally {
        await page.close();
      }
    });
  }
});
