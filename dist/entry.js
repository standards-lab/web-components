// Entry, Lit with a shadow root: one directory or file of a document hierarchy, as a button.
// Adapted from spike-html-apps-components (10dde51): src/entry.ts, on @standards-lab/web-foundation.
// See docs/internals.md
import { html, LitElement, nothing } from "lit";
import elements from "@standards-lab/web-foundation/baseline/elements.css" with { type: "css" };
import reset from "@standards-lab/web-foundation/baseline/reset.css" with { type: "css" };
import utilities from "@standards-lab/web-foundation/utilities.css" with { type: "css" };
import { define, emit } from "@standards-lab/web-foundation/dom.js";
import { formatBytes, formatDate, formatDateTime } from "@standards-lab/web-foundation/format.js";
import styles from "./entry.css" with { type: "css" };
/** The tag the element defines. */
export const tagName = "sl-entry";
function kindOf(item) {
    return "content_type" in item ? "file" : "directory";
}
function renderType(contentType) {
    const parts = contentType.split(/(?<=[/.+-])/);
    return parts.map((part, i) => (i === 0 ? part : html `<wbr aria-hidden="true" />${part}`));
}
function renderTime(updatedAt) {
    const date = new Date(updatedAt);
    const whole = formatDateTime(date);
    const day = formatDate(date);
    const clock = formatDateTime(date, undefined, { dateStyle: undefined });
    const split = whole.length > day.length + clock.length && whole.startsWith(day) && whole.endsWith(clock);
    const between = whole.slice(day.length, -clock.length);
    return html `<time datetime=${updatedAt}
    >${split
        ? html `<span class="date">${day}</span>${between}<span class="clock text-nowrap">${clock}</span>`
        : whole}</time
  >`;
}
/**
 * Shows one entry: its name, the primary text, and its status, a quiet label at the line's end;
 * then a quiet meta line of a file's size, absent while it is pending, and content type, and when
 * it was last updated, so a directory's meta is its time alone. Its kind, "file" or "directory",
 * shows nowhere, since the meta already tells the two apart to the eye: it sits visually hidden
 * between the head and the meta, so the button's accessible name, which a screen reader reads
 * once and in order, still says which it is, after the status. Activating it sends `open` with its
 * id and kind. `selected` frames the entry's button in the accent color, a mark to the eye
 * only: the consumer that selects it says so to assistive technology, as sl-document-list does
 * with aria-current on its item. `statusTone`, reflected to the `status-tone` attribute, shows the
 * status in a status hue; with none, or a value outside StatusTone, it stays muted. The tone is the
 * consumer's reading of the status, not the item's data, so the item keeps its API's shape.
 */
export class Entry extends LitElement {
    static styles = [reset, elements, utilities, styles];
    static properties = {
        item: { attribute: false },
        selected: { type: Boolean, reflect: true },
        statusTone: { type: String, reflect: true, attribute: "status-tone" },
    };
    constructor() {
        super();
        this.item = null;
        this.selected = false;
        this.statusTone = null;
    }
    #open() {
        if (this.item !== null) {
            emit(this, "open", { id: this.item.id, kind: kindOf(this.item) });
        }
    }
    render() {
        const item = this.item;
        if (item === null)
            return nothing;
        const file = "content_type" in item ? item : null;
        return html `
      <button type="button" class="entry" @click=${this.#open}>
        <span class="head head-row">
          <span class="name head-name">${item.name}</span>
          <span class="status head-end text-quiet-xs text-nowrap">${item.status}</span>
        </span>
        <span class="kind visually-hidden">${kindOf(item)}</span>
        <span class="meta text-quiet-s">
          ${file && file.size !== null
            ? html `<span class="size text-nowrap">${formatBytes(file.size)}</span>`
            : nothing}
          ${file ? html `<span class="type">${renderType(file.content_type)}</span>` : nothing}
          ${renderTime(item.updated_at)}
        </span>
      </button>
    `;
    }
}
define(tagName, Entry);
