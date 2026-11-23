// The shortcuts list, Lit with a shadow root: the page's keyboard shortcuts, as the foundation's
// keys module lists them for the dialog that holds the element, in a plain-text table of each
// binding's keys and its action, with the screen-reader note after it. It runs no binding, binds
// no key, holds no setting, and renders no [data-keys-list].
// Adapted from spike-html-hosting-components (9fa5850): src/shortcuts.ts, on @standards-lab/web-foundation, its note in the utilities' quiet type.
import { html, LitElement, nothing } from "lit";
import elements from "@standards-lab/web-foundation/baseline/elements.css" with { type: "css" };
import reset from "@standards-lab/web-foundation/baseline/reset.css" with { type: "css" };
import utilities from "@standards-lab/web-foundation/utilities.css" with { type: "css" };
import { define } from "@standards-lab/web-foundation/dom.js";
import { bindings } from "@standards-lab/web-foundation/keys.js";
import { labels } from "@standards-lab/web-foundation/keys-grammar.js";
import styles from "./shortcuts.css" with { type: "css" };
/** The tag the element defines. */
export const tagName = "sl-shortcuts";
/** The screen-reader note after the table: how to pass the next key through a screen reader. */
export const NOTE = "Screen readers: a screen reader may take a key before the page does. To pass the next key " +
    "through, press NVDA+F2 in NVDA, JAWS+3 in JAWS, Narrator+3 in Narrator, or VO+Tab in VoiceOver.";
/** The word after the keys of a row the reader's setting turns off. */
export const OFF = "off";
function textOf(el) {
    const copy = el.cloneNode(true);
    for (const kbd of copy.querySelectorAll("kbd")) {
        const joiner = kbd.nextSibling;
        const after = joiner?.nextSibling;
        if (joiner?.nodeType === Node.TEXT_NODE &&
            after instanceof Element &&
            after.localName === "kbd") {
            joiner.remove();
        }
        kbd.remove();
    }
    return (copy.textContent ?? "").replace(/\s+/g, " ").trim();
}
function labelOf({ element, label, keys }) {
    if (!element)
        return label ?? "";
    const aria = element.getAttribute("aria-label")?.trim();
    if (aria)
        return aria;
    const text = textOf(element);
    if (text)
        return text;
    const field = element.labels?.[0];
    return (field && textOf(field)) || keys;
}
function keysOf(sequences) {
    const parts = [];
    sequences.forEach((sequence, a) => {
        if (a > 0)
            parts.push(" or ");
        labels(sequence).forEach((press, p) => {
            if (p > 0)
                parts.push(" then ");
            press.forEach((name, k) => {
                if (k > 0)
                    parts.push("+");
                parts.push(html `<kbd>${name}</kbd>`);
            });
        });
    });
    return parts;
}
/**
 * Lists the page's keyboard shortcuts, for a help dialog: exactly the bindings the foundation's
 * keys module's `bindings(dialog)` gives for the dialog that holds the element, or
 * `bindings(null)` outside one, in its order. Each row's keys are the binding's sequences, each key
 * in a `kbd` as the keys grammar labels it, "+" within a press, " then " between presses, " or "
 * between sequences; its action is the binding's registered label or its element's name, as plain
 * text. A row the reader's setting turns off carries the word "off" after its keys, shown and
 * read, and the class `off`. Nothing in it takes focus. The screen-reader note follows the table.
 * It reads the bindings again as it connects, as its dialog opens, and at each `change` in the
 * document, as a settings form sends, and each `storage` event, as another tab's change sends.
 */
export class Shortcuts extends LitElement {
    static styles = [reset, elements, utilities, styles];
    static properties = {
        _rows: { state: true },
    };
    #dialog = null;
    constructor() {
        super();
        this._rows = [];
    }
    connectedCallback() {
        super.connectedCallback();
        this.#dialog = this.closest("dialog");
        this.#dialog?.addEventListener("beforetoggle", this.#toggled);
        document.addEventListener("change", this.#refresh);
        addEventListener("storage", this.#refresh);
        this.#refresh();
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        this.#dialog?.removeEventListener("beforetoggle", this.#toggled);
        this.#dialog = null;
        document.removeEventListener("change", this.#refresh);
        removeEventListener("storage", this.#refresh);
    }
    render() {
        return html `
      <table>
        <thead>
          <tr>
            <th scope="col">Keys</th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          ${this._rows.map((binding) => html `
              <tr class=${binding.off ? OFF : nothing}>
                <td>
                  ${keysOf(binding.sequences)}${binding.off ? html ` <small>${OFF}</small>` : nothing}
                </td>
                <td>${labelOf(binding)}</td>
              </tr>
            `)}
        </tbody>
      </table>
      <p class="note text-quiet-s">${NOTE}</p>
    `;
    }
    #toggled = (event) => {
        if (event.newState === "open")
            this.#refresh();
    };
    #refresh = () => {
        this._rows = bindings(this.#dialog);
    };
}
define(tagName, Shortcuts);
