// A glyph button as a component's shadow root shows it: its glyph, the very svg an icons module
// exports, hidden from the accessibility tree; the class's row against a plain native button in
// the same root; the interest hint its interestfor names, resolved in the button's own tree, a
// hint popover holding the button's name; the descriptions the accessibility tree exposes for it;
// and the mouse moved onto the button, or off it, as a user points at it to show the hint.
// Adapted from spike-html-hosting-components (9fa5850): test/browser/support/glyph-button.ts and test/browser/support/glyphs.ts, as one module, its name and tokens read without the target size.
// See docs/testing.md

import { until } from "@standards-lab/web-tooling/browser.js";
import type { Page } from "@standards-lab/web-tooling/browser.js";

/** A glyph button as the page renders it. */
export interface GlyphButton {
  /** Whether it is a native button of the class glyph-button. */
  classed: boolean;
  /** How many svg elements it holds, and whether the first is `markup`, node for node. */
  glyphs: number;
  matches: boolean;
  /** Its svg's aria-hidden, and whether the svg renders with a box. */
  hidden: string | null;
  drawn: boolean;
  /** Its border and surface, and a plain native button's in the same root. */
  surface: string;
  native: string;
  /** The interest target's id, whether interestForElement resolves to it in the button's own
   * tree, its popover state, its text, and whether it is hidden from the accessibility tree. */
  interestfor: string | null;
  resolves: boolean;
  popover: string | null;
  hint: string;
  hintHidden: string | null;
}

/**
 * The glyph button the page expression `button` names, read in the page against `markup`, the
 * default export of the icon's module, parsed in the page as the components parse it.
 */
export const glyphButton = (page: Page, button: string, markup: string): Promise<GlyphButton> =>
  page.evaluate(`(() => {
    const button = ${button};
    const root = button.getRootNode();
    const plain = document.createElement("button");
    plain.type = "button";
    button.parentNode.append(plain);
    const surface = (it) => {
      const s = getComputedStyle(it);
      return [s.borderTopStyle, s.borderTopWidth, s.borderTopColor, s.borderRadius,
        s.backgroundColor, s.color].join(" ");
    };
    const native = surface(plain);
    plain.remove();
    const svgs = button.querySelectorAll("svg");
    const svg = svgs[0];
    const template = document.createElement("template");
    template.innerHTML = ${JSON.stringify(markup)};
    const box = svg?.getBoundingClientRect();
    const id = button.getAttribute("interestfor");
    const target = id === null ? null : root.getElementById(id);
    return {
      classed: button.localName === "button" && button.classList.contains("glyph-button"),
      glyphs: svgs.length,
      matches: svg ? template.content.firstElementChild.isEqualNode(svg) : false,
      hidden: svg?.getAttribute("aria-hidden") ?? null,
      drawn: (svg?.checkVisibility() ?? false) && box.width > 0 && box.height > 0,
      surface: surface(button),
      native,
      interestfor: id,
      resolves: target !== null && button.interestForElement === target,
      popover: target?.getAttribute("popover") ?? null,
      hint: (target?.textContent ?? "").replace(/\\s+/g, " ").trim(),
      hintHidden: target?.getAttribute("aria-hidden") ?? null,
    };
  })()`);

interface Described {
  ignored: boolean;
  role?: { value: string };
  name?: { value: string };
  description?: { value: string };
}

/** The descriptions the page's accessibility tree exposes for the buttons named `name`. */
export async function descriptions(page: Page, name: string): Promise<string[]> {
  const { nodes }: { nodes: Described[] } = await page.cdp("Accessibility.getFullAXTree", {});
  return nodes
    .filter((node) => !node.ignored && node.role?.value === "button" && node.name?.value === name)
    .map((node) => node.description?.value ?? "");
}

/**
 * Whether the button's hint shows, as a popover open, and where, against the button's box: the
 * page expression `button` names the button, its interest target the hint.
 */
export const hintShown = (
  page: Page,
  button: string,
): Promise<{ open: boolean; below: boolean; above: boolean; overlaps: boolean }> =>
  page.evaluate(`(() => {
    const button = ${button};
    const hint = button.interestForElement;
    const b = button.getBoundingClientRect();
    const h = hint.getBoundingClientRect();
    return {
      open: hint.matches(":popover-open"),
      below: h.top >= b.bottom,
      above: h.bottom <= b.top,
      overlaps: h.left < b.right && h.right > b.left,
    };
  })()`);

/** Waits until the button's hint is open, or closed. */
export const untilHint = (page: Page, button: string, open: boolean): Promise<void> =>
  until(page, `(${button}).interestForElement?.matches(":popover-open") === ${open}`);

/** Moves the mouse onto the center of the button the page expression `button` names. */
export async function hover(page: Page, button: string): Promise<void> {
  const { x, y }: { x: number; y: number } = await page.evaluate(`(() => {
    const { left, top, width, height } = (${button}).getBoundingClientRect();
    return { x: left + width / 2, y: top + height / 2 };
  })()`);
  await page.cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
}

/** Moves the mouse to the viewport's top-left corner, off any button. */
export const pointAway = (page: Page): Promise<unknown> =>
  page.cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
