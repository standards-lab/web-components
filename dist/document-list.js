// The document list, Lit with a shadow root: a page of documents, composed of the components that
// already show each part, each document an sl-entry in the default slot of an sl-pagination,
// between its summary and its controls. The list adds only the selected document's mark and its
// loading, error, and empty states. Its document is a structural shape of its own, which a document
// API's document fits once its run's status is beside it; it knows no SDK and no domain, and binds
// no key.
// Adapted from spike-html-apps-components (10dde51): src/document-list.ts, on @standards-lab/web-foundation.
// See docs/internals.md
import { html, LitElement, nothing } from "lit";
import { repeat } from "lit/directives/repeat.js";
import elements from "@standards-lab/web-foundation/baseline/elements.css" with { type: "css" };
import reset from "@standards-lab/web-foundation/baseline/reset.css" with { type: "css" };
import utilities from "@standards-lab/web-foundation/utilities.css" with { type: "css" };
import { define } from "@standards-lab/web-foundation/dom.js";
import "./entry.js";
import { Pagination, summaryRange } from "./pagination.js";
import styles from "./document-list.css" with { type: "css" };
/** The tag the element defines. */
export const tagName = "sl-document-list";
const entryItems = new WeakMap();
function entryItem(item) {
    let file = entryItems.get(item);
    if (file === undefined) {
        const { id, name, content_type, size, created_at, status } = item;
        file = { id, name, content_type, size, status, updated_at: created_at };
        entryItems.set(item, file);
    }
    return file;
}
/**
 * Shows a page of documents: an sl-pagination, its summary, its page size, and its steps, around
 * an sl-entry for each document, the selected one marked. The paging properties are the
 * pagination's own, under the same names, handed to it as given; the list never changes its own
 * page. Activating an entry sends the entry's `open`, `{ id, kind }`; paging sends the
 * pagination's `page-change`, `{ page }`, and `page-size-change`, `{ size }`. The host sets
 * `selected` and the next page's fields.
 *
 * A status line, the list's one live region, polite, says the list is loading, that it failed with
 * `message` saying why, or that there are no documents; a ready page of documents leaves it blank.
 * While the pagination shows its summary, the status follows the summary's text on its line, in
 * the pagination's `status` slot, "Showing 1–3 of 8 · Loading documents…", so it takes no line of
 * its own and its text, coming and going, moves neither the entries nor the controls. With no
 * summary to join, and in the error state, it is a line of its own above the entries, a line tall
 * even when blank, for the same reason. While loading, documents already given stay listed, marked
 * busy, so a page change doesn't empty and refill the list; an error lists none.
 */
export class DocumentList extends LitElement {
    static styles = [reset, elements, utilities, styles];
    static properties = {
        items: { attribute: false },
        selected: { type: String },
        state: { type: String, reflect: true },
        message: { type: String },
        ...Pagination.properties,
    };
    constructor() {
        super();
        this.items = [];
        this.selected = null;
        this.state = "ready";
        this.message = "";
        this.page = 1;
        this.size = 12;
        this.total = null;
        this.more = false;
        this.pageSizes = [12, 24, 48, 96];
        this.disabled = false;
    }
    #status(documents, joins) {
        const label = joins ? "label text-nowrap" : "label";
        switch (this.state) {
            case "loading":
                return html `<span class=${label}>Loading documents…</span>`;
            case "error":
                return html `<strong class=${label}>Couldn't load the documents.</strong>
          ${this.message ? html `<span class="detail">${this.message}</span>` : nothing}`;
        }
        return documents.length ? nothing : html `<span class="${label} empty">No documents.</span>`;
    }
    #entry(item) {
        const selected = item.id === this.selected;
        return html `<li aria-current=${selected ? "true" : nothing}>
      <sl-entry
        .item=${entryItem(item)}
        .selected=${selected}
        .statusTone=${item.status_tone ?? null}
      ></sl-entry>
    </li>`;
    }
    render() {
        const documents = this.state === "error" ? [] : (this.items ?? []);
        const joins = this.state !== "error" && summaryRange(this.page, this.size, this.total) !== null;
        return html `<sl-pagination
      .page=${this.page}
      .size=${this.size}
      .total=${this.total}
      .more=${this.more}
      .pageSizes=${this.pageSizes}
      .disabled=${this.disabled}
    >
      <p class="status ${this.state}${joins ? "" : " status-line"}" role="status" slot=${joins ? "status" : nothing}>${this.#status(documents, joins)}</p>
      ${documents.length
            ? html `<ul class="documents list-bare" aria-label="Documents" aria-busy=${this.state === "loading" ? "true" : nothing}>
            ${repeat(documents, (item) => item.id, (item) => this.#entry(item))}
          </ul>`
            : nothing}
    </sl-pagination>`;
    }
}
define(tagName, DocumentList);
