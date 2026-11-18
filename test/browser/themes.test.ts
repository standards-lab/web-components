// Every component under every color profile the foundation registers, light and dark, and across
// its space and type profiles, on each specimen page under demo/: every text a shadow tree renders
// takes one of the profile's color tokens, its foreground among them, and the focus ring the
// keyboard brings to each component's control is the profile's interaction color. The profiles
// and the pages are read, not listed, so a profile the foundation adds or a page a component adds
// is covered with no edit.

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

/** A profile combination, every facet named, and its scheme. */
interface Choice {
  color: string;
  space: string;
  type: string;
  scheme: string;
}

/** The foundation's sixteen color tokens: surfaces, borders, the foreground's tiers, the hues. */
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

// Each registered color at the other facets' defaults, then each other space and type at the
// rest's, each light and dark: the browser tier's profile combinations.
const choices: Choice[] = [
  ...colors.map((color) => ({ color })),
  ...spaces.map((space) => ({ space })),
  ...types.map((type) => ({ type })),
].flatMap((profile) => schemes.map((scheme) => ({ ...DEFAULTS, ...profile, scheme })));

/** Each specimen page under demo/, by its component's name: every page there but the index,
 * components.html, which links the lean entry alone and so shows one profile. */
const pages = readdirSync(join(import.meta.dirname, "../../demo"))
  .filter((file) => file.endsWith(".html") && file !== "components.html")
  .map((file) => file.slice(0, -".html".length))
  .sort();

/**
 * In-page: resolves once every component on the page, in light DOM or in another's shadow tree,
 * has rendered, its fonts are ready, and two frames have painted.
 */
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

/**
 * In-page, a function of a choice: applies it by attribute on the root, then reads the tokens and
 * the hooks as a probe in light DOM resolves them, outside every component, and every text the
 * components' shadow trees render, as its color and where it is.
 */
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
  const interaction = resolve("var(--interaction-color, var(--blue))");
  const texts = [];
  const walk = (root, path) => {
    for (const element of root.querySelectorAll("*")) {
      if (element.shadowRoot) walk(element.shadowRoot, path + " " + element.localName);
      if (root === document) continue;
      const shows = [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.data.trim())
        || (element.matches("input, textarea") && (element.value || element.placeholder));
      if (!shows || element.getClientRects().length === 0) continue;
      const style = getComputedStyle(element);
      if (style.visibility !== "visible") continue;
      texts.push({ where: path.trim() + " > " + element.localName + (element.className ? "." + [...element.classList].join(".") : ""), color: style.color });
    }
  };
  walk(document, "");
  return { tokens, interaction, texts };
}`;

/** What READ resolves to in one choice. */
interface Read {
  tokens: Record<string, string>;
  interaction: string;
  texts: { where: string; color: string }[];
}

/** A color with no alpha left: a text drawn in it shows nothing, as a hidden mark's does. */
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

  /** Opens a specimen page, resolving once its components have rendered. */
  async function open(name: string): Promise<Page> {
    const page = await browser.open(`${server.origin}/demo/${name}.html`);
    await page.evaluate(RENDERED);
    return page;
  }

  test("the registry lists the four built-in colors, the default first, and a space and a type besides the defaults", () => {
    // The cases below run over whatever the registry lists; this pins that it lists at least the
    // foundation's four, so a registry read gone empty can't pass them vacuously.
    for (const color of ["github", "zenwritten", "everforest", "catppuccin"]) {
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
        // Each color, light and dark, sets its own foreground, so each choice above read the
        // profile it named and not the default's.
        assert.equal(foregrounds.size, colors.length * schemes.length, [...foregrounds].join(", "));
      } finally {
        await page.close();
      }
    });
  }

  /** The focus ring, as the deepest active element shows it. */
  interface Ring {
    where: string;
    visible: boolean;
    style: string;
    width: number;
    color: string;
  }

  /** In-page: the deepest active element's focus ring. */
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

  /** Presses Tab, as a keyboard does, so the browser moves focus and marks it focus-visible. */
  async function tab(page: Page): Promise<void> {
    const key = { key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 };
    await page.cdp("Input.dispatchKeyEvent", { type: "keyDown", ...key });
    await page.cdp("Input.dispatchKeyEvent", { type: "keyUp", ...key });
  }

  /**
   * Brings the keyboard to the page's focus state: on a specimen page, Tab from its focus-start
   * mark as many times as the mark says; on the drawer's, the drawer undocked and opened, Tab from
   * its heading to its Close button.
   */
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

  for (const name of pages.filter((page) => page !== "stage-timeline")) {
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

  test("the stage timeline renders nothing the keyboard can focus", async () => {
    // The one component the focus ring cases skip: its page has no focus state because the
    // timeline holds no control, which this pins, so a control it gains must earn a ring case.
    const page = await open("stage-timeline");
    try {
      const focusable: string[] =
        await page.evaluate(`[...document.querySelectorAll("sl-stage-timeline")]
        .flatMap((timeline) => [...timeline.shadowRoot.querySelectorAll("*")])
        .filter((element) => element.tabIndex >= 0)
        .map((element) => element.localName)`);
      assert.deepEqual(focusable, []);
    } finally {
      await page.close();
    }
  });
});
