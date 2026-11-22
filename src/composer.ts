// The composer, Lit with a shadow root: a multi-line text field and its send control, which a
// stop control replaces while the app is busy. It binds no key: Enter, Shift+Enter, and Escape
// belong to the app, so the field does only what a native textarea does, and an app that sends on
// a key calls send(), the one implementation of the send rules, which the send control calls too.
// Adapted from spike-html-apps-components (10dde51): src/composer.ts, on @standards-lab/web-foundation.
// See docs/internals.md

import { html, LitElement, nothing, type PropertyDeclarations } from "lit";
import { live } from "lit/directives/live.js";

import elements from "@standards-lab/web-foundation/baseline/elements.css" with { type: "css" };
import reset from "@standards-lab/web-foundation/baseline/reset.css" with { type: "css" };
import utilities from "@standards-lab/web-foundation/utilities.css" with { type: "css" };
import { define, emit } from "@standards-lab/web-foundation/dom.js";
import styles from "./composer.css" with { type: "css" };

/** The tag the element defines. */
export const tagName = "sl-composer";

/** `send`'s detail: the field's text, as typed. */
export interface SendDetail {
  text: string;
}

/** `stop`'s detail: empty. */
export type StopDetail = Record<string, never>;

/**
 * A multi-line text field and a send control. Activating send sends `send` with the field's text
 * and clears the field; send is disabled while the text is empty or whitespace. While `busy`, a
 * stop control takes send's place, in the same footprint, and sends `stop`; the field still takes
 * typing, so the next message can be drafted, but nothing is sent. While `disabled`, nothing can
 * be typed, sent, or stopped. The field grows with its text from one line to eight, then scrolls.
 *
 * `send()` does what activating send does, so an app that binds a key to sending calls it rather
 * than repeating the rules: it does nothing while the text is empty or whitespace, or the composer
 * is busy or disabled. `value` is the field's text, kept in step with typing, so the app reads a
 * draft or sets one; it sends no event as the text changes. The field is named by `label`, in a
 * label kept for assistive technology and visually hidden, since a composer's place in a chat
 * shows what it is for.
 *
 * Focus never rests on a disabled control: when the button turns disabled while it holds focus,
 * as stop activated with the field empty becomes send once the app clears busy, focus moves to the
 * field, where the reader writes next.
 */
export class Composer extends LitElement {
  static styles = [reset, elements, utilities, styles];

  static properties = {
    value: { type: String },
    placeholder: { type: String },
    label: { type: String },
    busy: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
  } satisfies PropertyDeclarations;

  /** The field's text; typing updates it, and setting it sets the field's. */
  declare value: string;
  /** The field's placeholder, shown while it is empty. */
  declare placeholder: string;
  /** The field's accessible name, in a visually hidden label. */
  declare label: string;
  /** Whether the app is answering: stop replaces send; reflected to `busy`. */
  declare busy: boolean;
  /** Disables the field and the control; reflected to `disabled`. */
  declare disabled: boolean;

  constructor() {
    super();
    this.value = "";
    this.placeholder = "";
    this.label = "Message";
    this.busy = false;
    this.disabled = false;
  }

  get #field(): HTMLTextAreaElement | null {
    return this.renderRoot.querySelector("textarea");
  }

  get #sendable(): boolean {
    return !this.disabled && !this.busy && (this.value ?? "").trim() !== "";
  }

  #input(e: Event): void {
    this.value = (e.target as HTMLTextAreaElement).value;
  }

  /** Does what activating send does: clears the field, sends `send` with the text, refocuses. */
  send(): void {
    if (!this.#sendable) return;
    const text = this.value;
    this.value = "";
    emit<SendDetail>(this, "send", { text });
    this.#field?.focus();
  }

  #stop(): void {
    if (this.busy && !this.disabled) emit<StopDetail>(this, "stop", {});
  }

  protected override updated() {
    const button = this.renderRoot.querySelector("button");
    if (button?.disabled && this.shadowRoot?.activeElement === button) this.#field?.focus();
  }

  render() {
    const busy = this.busy;
    return html`<label class="visually-hidden" for="field">${this.label}</label>
      <div class="composer">
        <textarea
          id="field"
          rows="1"
          .value=${live(this.value ?? "")}
          placeholder=${this.placeholder ?? ""}
          ?disabled=${this.disabled}
          @input=${this.#input}
        ></textarea>
        <button
          type="button"
          class="action alternatives ${busy ? "stop" : "send"}"
          ?disabled=${busy ? this.disabled : !this.#sendable}
          @click=${busy ? this.#stop : this.send}
        >
          <span aria-hidden=${busy ? "true" : nothing}>Send</span>
          <span aria-hidden=${busy ? nothing : "true"}>Stop</span>
        </button>
      </div>`;
  }
}

define(tagName, Composer);

declare global {
  interface HTMLElementTagNameMap {
    "sl-composer": Composer;
  }
}
