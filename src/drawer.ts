// The drawer, Lit with a shadow root: docked inline as a complementary landmark, an aside, in a
// wide layout, and a modal dialog covering the viewport, sliding in from the inline-start edge, in
// a narrow one. Both wrappers hold the same header, the label as the one heading that names them,
// over a body holding the slot. The mode is the viewport's, by a media query on `dock`; a switch
// swaps only the shadow root's wrapper and its slot, so the slotted content, the host's own
// children, is never moved, disconnected, or re-created.
// Adapted from spike-html-apps-components (10dde51): src/drawer.ts, on @standards-lab/web-foundation.
// Adapted from spike-html-hosting-components (9fa5850): src/drawer.ts, its Close a glyph button showing web-icons' x-16.
// See docs/internals.md

import { html, LitElement, type PropertyDeclarations, type PropertyValues } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import elements from "@standards-lab/web-foundation/baseline/elements.css" with { type: "css" };
import reset from "@standards-lab/web-foundation/baseline/reset.css" with { type: "css" };
import dialogSheet from "@standards-lab/web-foundation/dialog.css" with { type: "css" };
import glyphButton from "@standards-lab/web-foundation/glyph-button.css" with { type: "css" };
import motion from "@standards-lab/web-foundation/motion.css" with { type: "css" };
import utilities from "@standards-lab/web-foundation/utilities.css" with { type: "css" };
import { define, emit } from "@standards-lab/web-foundation/dom.js";
import x from "@standards-lab/web-icons/octicon/x-16";
import styles from "./drawer.css" with { type: "css" };

/** The tag the element defines. */
export const tagName = "sl-drawer";

/** The Close button's text, before the label, unless the `close` slot replaces it. */
const CLOSE = "Close";

/** `open`'s detail: empty. */
export type OpenDetail = Record<string, never>;

/** `close`'s detail: empty. */
export type CloseDetail = Record<string, never>;

/**
 * A drawer for a narrow layout. Its children sit in the default slot, in one of two shadow
 * wrappers, by the mode.
 *
 * At `dock`, a CSS length (48rem by default), and wider, the drawer is docked: its children in an
 * `aside`, a complementary landmark, laid out as an ordinary block in the host's place, always
 * shown, never taking focus; `open` stays false there, setting it true is undone, and `show()`,
 * `close()`, and `toggle()` do nothing. Its header holds `label` as a visible `h2` that names the
 * aside, with no Close button, and stays in view while the children scroll below it when the host
 * is held shorter than they are; the children need no heading of their own.
 * Below `dock` the drawer is closed until `show()`, `toggle()`, or `open` opens it, a
 * native dialog shown by `showModal()`: it covers the viewport edge to edge, sliding in from the
 * inline-start edge, the right in a right-to-left context, and the page behind it inert. Its
 * header holds `label` as a visible `h2` that names the dialog, and a Close button that shows
 * web-icons' Octicons x-16 alone: its name is the `close` slot's text, "Close" by default, for a
 * translation, then the label, "Close Documents", both visually hidden. It is a glyph button, laid
 * out by the foundation's glyph-button.css, and shows its name on hover and keyboard focus in a
 * hint popover, by `interestfor`, where the browser supports it, announced once as the name. As
 * the dialog opens, focus moves to its heading, by the heading's `tabindex="-1"` and `autofocus`,
 * not to the Close button, so the Close shows its hint only when tabbed to or hovered; the
 * heading, no control, shows no focus outline and is out of the Tab order, so Tab from it reaches
 * the Close button. The header
 * stays in view while the children scroll below it. The Close button, Escape, `close()`,
 * `toggle()`, or `open` set false closes it, and the dialog returns focus to the element that held
 * it when it opened. Under reduced motion it opens and closes at once. `open` in the markup, or
 * set before the element is connected, opens the drawer as the page loads below `dock`, sending
 * `open`, and is undone while docked, sending nothing.
 *
 * `open` and `close` go out each time the modal drawer opens or closes, however it was asked,
 * never on a switch between the modes. A switch, as the viewport crosses `dock`, closes an open
 * drawer silently: one that was open becomes docked, and docked content becomes a closed drawer.
 * Removing the element closes it silently too, setting `open` false, so one put back is closed
 * unless `open` is set again before. `dock` is read in a media query, `(width < <dock>)`, where
 * rem and em are the initial font size's, so a viewport of exactly `dock` docks; a length the
 * query can't read never matches, so the drawer stays docked.
 * Each mode renders only its own header, so the shadow tree holds one heading at a time. The mode
 * is the custom state `docked` or `drawer`, which a page may style.
 */
export class Drawer extends LitElement {
  static styles = [reset, elements, utilities, glyphButton, dialogSheet, motion, styles];

  static properties = {
    open: { type: Boolean, reflect: true },
    dock: { type: String },
    label: { type: String },
  } satisfies PropertyDeclarations;

  /** Whether the modal drawer is open; reflected to `open`, and always false while docked. */
  declare open: boolean;
  /** The width at which the drawer docks, and wider: a CSS length, read in a media query. */
  declare dock: string;
  /** The visible heading of the docked aside and of the drawer, which names each. */
  declare label: string;

  readonly #internals = this.attachInternals();
  #query: MediaQueryList | null = null;
  #narrow: boolean | null = null;
  #modal = false;

  constructor() {
    super();
    this.open = false;
    this.dock = "48rem";
    this.label = "";
  }

  get #dialog(): HTMLDialogElement | null {
    return this.renderRoot.querySelector("dialog");
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#watch();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#query?.removeEventListener("change", this.#change);
    this.#query = null;
    this.#narrow = null;
    this.#modal = false;
    this.open = false;
    this.#dialog?.close();
  }

  /** Opens the modal drawer; below `dock` only. */
  show(): void {
    if (this.#query) this.#change();
    if (!this.#narrow || this.open) return;
    this.open = true;
    this.performUpdate();
  }

  /** Closes the modal drawer. */
  close(): void {
    if (!this.open) return;
    this.open = false;
    this.#sync();
  }

  /** Opens the modal drawer when it is closed and closes it when it is open. */
  toggle(): void {
    if (this.open) this.close();
    else this.show();
  }

  #watch(): void {
    this.#query?.removeEventListener("change", this.#change);
    this.#query = matchMedia(`(width < ${this.dock})`);
    this.#query.addEventListener("change", this.#change);
    this.#change();
  }

  #change = (): void => {
    const narrow = this.#query?.matches ?? false;
    if (narrow === this.#narrow) return;
    const switched = this.#narrow !== null;
    this.#narrow = narrow;
    const { states } = this.#internals;
    states.delete(narrow ? "docked" : "drawer");
    states.add(narrow ? "drawer" : "docked");
    if (switched) {
      this.#modal = false;
      this.open = false;
    }
    this.requestUpdate();
  };

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("dock") && this.#query) this.#watch();
    if (!this.#narrow) this.open = false;
  }

  protected override updated(): void {
    this.#sync();
  }

  #sync(): void {
    const dialog = this.#dialog;
    if (!dialog) return;
    if (this.open && !this.#modal) {
      dialog.showModal();
      this.#modal = true;
      emit<OpenDetail>(this, "open", {});
    } else if (!this.open && this.#modal) {
      this.#modal = false;
      dialog.close();
      emit<CloseDetail>(this, "close", {});
    }
  }

  #closed(e: Event): void {
    const dialog = this.#dialog;
    if (!this.#modal || !dialog || e.currentTarget !== dialog || dialog.open) return;
    this.#modal = false;
    this.open = false;
    emit<CloseDetail>(this, "close", {});
  }

  #slotted = (): void => {
    this.requestUpdate();
  };

  #closeText(): string {
    const assigned = [...this.children].filter((child) => child.slot === "close");
    if (assigned.length === 0) return CLOSE;
    return assigned
      .map((child) => child.textContent ?? "")
      .join("")
      .replace(/\s+/g, " ")
      .trim();
  }

  render() {
    if (!this.#narrow) {
      return html`<aside aria-labelledby="title">
        <header class="dialog-header"><h2 id="title">${this.label}</h2></header>
        <div class="body"><slot></slot></div>
      </aside>`;
    }
    return html`<dialog aria-labelledby="title" @close=${this.#closed}>
      <header class="dialog-header">
        <h2 id="title" tabindex="-1" autofocus>${this.label}</h2>
        <button
          type="button"
          class="glyph-button"
          interestfor="close-hint"
          aria-description=""
          @click=${this.close}
        >
          ${unsafeHTML(x)}
          <span class="visually-hidden"
            ><slot name="close" @slotchange=${this.#slotted}>${CLOSE}</slot> ${this.label}</span
          >
        </button>
        <div id="close-hint" class="glyph-hint" popover="hint" aria-hidden="true">
          ${this.#closeText()} ${this.label}
        </div>
      </header>
      <div class="body"><slot></slot></div>
    </dialog>`;
  }
}

define(tagName, Drawer);

declare global {
  interface HTMLElementTagNameMap {
    "sl-drawer": Drawer;
  }
}
