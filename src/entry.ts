// Entry, Lit with a shadow root: one directory or file of a document hierarchy, as a button.
// Adapted from spike-html-apps-components (10dde51): src/entry.ts, on @standards-lab/web-foundation.
// See docs/internals.md

import { html, LitElement, nothing, type PropertyDeclarations } from "lit";

import elements from "@standards-lab/web-foundation/baseline/elements.css" with { type: "css" };
import reset from "@standards-lab/web-foundation/baseline/reset.css" with { type: "css" };
import { define, emit } from "@standards-lab/web-foundation/dom.js";
import { formatBytes, formatDate, formatDateTime } from "@standards-lab/web-foundation/format.js";
import styles from "./entry.css" with { type: "css" };

/** The tag the element defines. */
export const tagName = "sl-entry";

/** The fields of a directory the entry renders; a go-web-service Directory fits it. */
export interface DirectoryItem {
  id: string;
  name: string;
  status: string;
  updated_at: string;
}

/**
 * The fields of a file the entry renders; a go-web-service File fits it. `size` is null until
 * the file's write completes.
 */
export interface FileItem extends DirectoryItem {
  size: number | null;
  content_type: string;
}

/** What the entry shows: a directory, or a file, told apart by its `content_type`. */
export type EntryItem = DirectoryItem | FileItem;

/**
 * The hue the entry's status takes, by the components' status vocabulary: `active`, in progress,
 * the accent hook's, as sl-stage-timeline's active stage; `complete`, green, as its complete
 * stage; `incomplete`, orange, as sl-chat-thread's incomplete item; and `failed`, red, as a failed
 * stage, item, or upload. The status's text says the state; the tone marks it to the eye.
 */
export type StatusTone = "active" | "complete" | "incomplete" | "failed";

/** `open`'s detail: the entry's id and kind. */
export interface OpenDetail {
  id: string;
  kind: "directory" | "file";
}

function kindOf(item: EntryItem): OpenDetail["kind"] {
  return "content_type" in item ? "file" : "directory";
}

function renderType(contentType: string) {
  const parts = contentType.split(/(?<=[/.+-])/);
  return parts.map((part, i) => (i === 0 ? part : html`<wbr aria-hidden="true" />${part}`));
}

function renderTime(updatedAt: string) {
  const date = new Date(updatedAt);
  const whole = formatDateTime(date);
  const day = formatDate(date);
  const clock = formatDateTime(date, undefined, { dateStyle: undefined });
  const split =
    whole.length > day.length + clock.length && whole.startsWith(day) && whole.endsWith(clock);
  const between = whole.slice(day.length, -clock.length);
  return html`<time datetime=${updatedAt}
    >${
      split
        ? html`<span class="date">${day}</span>${between}<span class="clock">${clock}</span>`
        : whole
    }</time
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
  static styles = [reset, elements, styles];

  static properties = {
    item: { attribute: false },
    selected: { type: Boolean, reflect: true },
    statusTone: { type: String, reflect: true, attribute: "status-tone" },
  } satisfies PropertyDeclarations;

  /** The directory or file shown; nothing renders while it is null. */
  declare item: EntryItem | null;
  /** Frames the entry as the selected one; reflected to the `selected` attribute. */
  declare selected: boolean;
  /** The status's hue, or null for the muted default; reflected to the `status-tone` attribute. */
  declare statusTone: StatusTone | null;

  constructor() {
    super();
    this.item = null;
    this.selected = false;
    this.statusTone = null;
  }

  #open(): void {
    if (this.item !== null) {
      emit<OpenDetail>(this, "open", { id: this.item.id, kind: kindOf(this.item) });
    }
  }

  render() {
    const item = this.item;
    if (item === null) return nothing;
    const file = "content_type" in item ? item : null;
    return html`
      <button type="button" class="entry" @click=${this.#open}>
        <span class="head">
          <span class="name">${item.name}</span>
          <span class="status">${item.status}</span>
        </span>
        <span class="kind">${kindOf(item)}</span>
        <span class="meta">
          ${
            file && file.size !== null
              ? html`<span class="size">${formatBytes(file.size)}</span>`
              : nothing
          }
          ${file ? html`<span class="type">${renderType(file.content_type)}</span>` : nothing}
          ${renderTime(item.updated_at)}
        </span>
      </button>
    `;
  }
}

define(tagName, Entry);

declare global {
  interface HTMLElementTagNameMap {
    "sl-entry": Entry;
  }
}
