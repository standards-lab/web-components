// The upload dropzone, Lit with a shadow root: a zone that takes files by drop or through a native
// file picker, and the list of the uploads the app reports, each with its progress or its finished
// state. It knows no SDK and no domain: files go out as File objects, a cancel goes out by the
// upload's id, and the app does the uploading. It binds no key.
// Adapted from spike-html-apps-components (10dde51): src/upload-dropzone.ts, on @standards-lab/web-foundation.
// See docs/internals.md
import { html, LitElement, nothing } from "lit";
import { repeat } from "lit/directives/repeat.js";
import elements from "@standards-lab/web-foundation/baseline/elements.css" with { type: "css" };
import reset from "@standards-lab/web-foundation/baseline/reset.css" with { type: "css" };
import motion from "@standards-lab/web-foundation/motion.css" with { type: "css" };
import utilities from "@standards-lab/web-foundation/utilities.css" with { type: "css" };
import { define, emit } from "@standards-lab/web-foundation/dom.js";
import { formatBytes } from "@standards-lab/web-foundation/format.js";
import styles from "./upload-dropzone.css" with { type: "css" };
/** The tag the element defines. */
export const tagName = "sl-upload-dropzone";
const finished = {
    done: "Done",
    failed: "Failed",
    cancelled: "Cancelled",
};
function carriesFiles(event) {
    return event.dataTransfer?.types.includes("Files") ?? false;
}
/**
 * A zone that takes files, several at a time, dropped on it or chosen through the native file
 * picker its button opens, and sends `files-select` with them either way. Dragging files over the
 * zone marks it. While `disabled`, the zone takes no files by either path and reads as disabled.
 * `accept` is the picker's, a hint to it; a drop is not filtered by it, and the app validates
 * what it receives.
 *
 * Below the zone, `uploads` lists the app's uploads: each its name and its size, an uploading
 * one its bytes sent of its size, a native progress bar, and a cancel control that sends
 * `upload-cancel` with its id; a finished one its label, done, failed with its message, or
 * cancelled.
 */
export class UploadDropzone extends LitElement {
    static styles = [reset, elements, utilities, motion, styles];
    static properties = {
        uploads: { attribute: false },
        accept: { type: String },
        disabled: { type: Boolean, reflect: true },
        over: { state: true },
    };
    #depth = 0;
    constructor() {
        super();
        this.uploads = [];
        this.accept = "";
        this.disabled = false;
        this.over = false;
    }
    get #input() {
        return this.renderRoot.querySelector("input");
    }
    #pick() {
        if (!this.disabled)
            this.#input?.click();
    }
    #change(e) {
        const input = e.target;
        const files = [...(input.files ?? [])];
        input.value = "";
        if (!this.disabled && files.length)
            emit(this, "files-select", { files });
    }
    #enter(e) {
        if (!carriesFiles(e))
            return;
        e.preventDefault();
        this.#depth++;
        this.over = true;
    }
    #dragover(e) {
        if (!carriesFiles(e))
            return;
        e.preventDefault();
        if (e.dataTransfer)
            e.dataTransfer.dropEffect = this.disabled ? "none" : "copy";
    }
    #leave(e) {
        if (!carriesFiles(e))
            return;
        this.#depth = Math.max(0, this.#depth - 1);
        if (this.#depth === 0)
            this.over = false;
    }
    #drop(e) {
        if (!carriesFiles(e))
            return;
        e.preventDefault();
        this.#depth = 0;
        this.over = false;
        const files = [...(e.dataTransfer?.files ?? [])];
        if (!this.disabled && files.length)
            emit(this, "files-select", { files });
    }
    #cancel(upload) {
        if (upload.state === "uploading") {
            emit(this, "upload-cancel", { id: upload.id });
        }
    }
    #upload(upload) {
        const size = formatBytes(upload.size);
        const uploading = upload.state === "uploading";
        const end = upload.state === "uploading"
            ? html `<button
          type="button"
          class="cancel"
          aria-label="Cancel ${upload.name}"
          @click=${() => this.#cancel(upload)}
        >
          Cancel
        </button>`
            : html `<span class="state text-nowrap">${finished[upload.state]}</span>`;
        const sent = Math.min(Math.max(upload.sent, 0), upload.size);
        const detail = uploading
            ? html `<progress value=${sent} max=${upload.size} aria-label="Uploading ${upload.name}"></progress
          ><span class="bytes text-numeric"><span class="sent">${formatBytes(sent)}</span> of ${size}</span>`
            : upload.state === "failed" && upload.message
                ? html `<span class="bytes text-numeric">${size}</span><span class="message">${upload.message}</span>`
                : html `<span class="bytes text-numeric">${size}</span>`;
        return html `<li class="upload ${upload.state}" data-id=${upload.id}>
      <span class="name text-truncate" title=${upload.name}>${upload.name}</span>
      <span class="end">${end}</span>
      <span class="detail text-quiet-s">${detail}</span>
    </li>`;
    }
    render() {
        const over = this.over && !this.disabled;
        const uploads = this.uploads ?? [];
        return html `<div
        class="zone ${over ? "over" : ""}"
        @dragenter=${this.#enter}
        @dragover=${this.#dragover}
        @dragleave=${this.#leave}
        @drop=${this.#drop}
      >
        <span class="prompt">Drop files here, or</span>
        <button type="button" class="pick" ?disabled=${this.disabled} @click=${this.#pick}>
          Choose files
        </button>
        <input
          type="file"
          multiple
          hidden
          accept=${this.accept || nothing}
          ?disabled=${this.disabled}
          @change=${this.#change}
        />
      </div>
      ${uploads.length
            ? html `<ul class="uploads list-bare" aria-label="Uploads">
            ${repeat(uploads, (upload) => upload.id, (upload) => this.#upload(upload))}
          </ul>`
            : nothing}`;
    }
}
define(tagName, UploadDropzone);
