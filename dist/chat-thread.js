// The chat thread, Lit with a shadow root: a conversation's items, in order, as an ordered list
// inside one frame that scrolls when its consumer constrains its block size. The items are a
// structural subset of Open Responses (spec 2026-04-24): messages, reasoning, function calls, and
// their outputs, by the spec's JSON field names, so a response's output or a conversation's
// history fits as it is.
// Adapted from spike-html-apps-components (10dde51): src/chat-thread.ts, on @standards-lab/web-foundation.
// See docs/internals.md
import { html, LitElement, nothing, } from "lit";
import { repeat } from "lit/directives/repeat.js";
import elements from "@standards-lab/web-foundation/baseline/elements.css" with { type: "css" };
import reset from "@standards-lab/web-foundation/baseline/reset.css" with { type: "css" };
import motion from "@standards-lab/web-foundation/motion.css" with { type: "css" };
import utilities from "@standards-lab/web-foundation/utilities.css" with { type: "css" };
import { define } from "@standards-lab/web-foundation/dom.js";
import { tryFormatJson } from "@standards-lab/web-foundation/format.js";
import { markdown } from "./markdown.js";
import styles from "./chat-thread.css" with { type: "css" };
/** The tag the element defines. */
export const tagName = "sl-chat-thread";
function pretty(text) {
    const json = tryFormatJson(text);
    return json.ok ? json.text : text;
}
const STATUS_LABELS = {
    in_progress: "Streaming",
    incomplete: "Incomplete",
    failed: "Failed",
};
function atEnd(frame, height = frame.scrollHeight) {
    const zoom = Math.min(frame.currentCSSZoom ?? 1, 1);
    return height - frame.clientHeight - frame.scrollTop <= 2 / zoom;
}
function end(frame) {
    frame.scrollTop = frame.scrollHeight;
}
/**
 * Shows a conversation's items in order: a user's text as plain text, the assistant's as rendered
 * Markdown, and a refusal as a labelled refusal. A message still in progress reads as streaming,
 * and as its text grows it re-renders in place, the items above it untouched; an incomplete or a
 * failed message is labelled so. With `verbose` set, reasoning, function calls, and their outputs
 * show too, each collapsed in a native details; otherwise they are hidden. A reasoning item's line
 * carries its summary after its kind and status, and its details holds its content alone; with a
 * summary and no content, the line stands alone, with nothing to expand. Item and part types the
 * thread doesn't know are skipped. Display-only: it sends no event and binds no key.
 *
 * The items are an ordered list of articles, not a log: order is the thread's meaning, and a list
 * tells assistive technology how many items there are and where each sits. A log's live region
 * would announce every word of a streaming reply; a consumer that wants an announcement adds a
 * status of its own.
 *
 * When its consumer constrains its block size, the frame scrolls, and it follows the newest item,
 * as the event log does: an update, an item added or a streaming reply's text grown, scrolls the
 * frame to its end while the reader is at its end, within a pixel or two, so a reader who scrolled
 * up keeps their place as the reply streams on, and one who scrolls back to the end is followed
 * again. A conversation reads from its newest item, so the first items shown open at the end, and a
 * user's message added to the end, the one the reader just sent, alone or with the reply's first
 * text, brings the frame to its end wherever the reader was. The last item grown with no update,
 * a details the reader opens in it or an image that loads, is followed the same way: while the
 * reader is at the frame's end, its end stays in view, and a reader who scrolled up keeps their
 * place. Only the last item's growth follows: an item above it grown, a details the reader opens
 * there, behaves natively, the summary clicked staying where it was and its content opening below
 * it, and leaves the reader short of the end. The scroll is instant, never smooth, under any
 * motion preference.
 * The thread follows only in its own frame: unconstrained, it is as tall as its content and its
 * consumer's scroll moves it, which the thread never scrolls, so a consumer that wants it followed
 * holds it to a height.
 */
export class ChatThread extends LitElement {
    static styles = [reset, elements, utilities, motion, styles];
    static properties = {
        items: { attribute: false },
        verbose: { type: Boolean, reflect: true },
    };
    #follow = false;
    #height = 0;
    #content = null;
    #last = null;
    #size = 0;
    #resized = new ResizeObserver(() => {
        const frame = this.renderRoot.querySelector(".frame");
        if (!frame)
            return;
        const grew = this.#measured() !== this.#size;
        if (grew && atEnd(frame, this.#height))
            end(frame);
        this.#seen(frame);
    });
    constructor() {
        super();
        this.items = [];
        this.verbose = false;
    }
    connectedCallback() {
        super.connectedCallback();
        const frame = this.renderRoot.querySelector(".frame");
        if (!frame)
            return;
        this.#content = null;
        this.#observe(frame);
        this.#seen(frame);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        this.#resized.disconnect();
    }
    willUpdate(changed) {
        const frame = this.renderRoot.querySelector(".frame");
        const before = changed.has("items")
            ? (changed.get("items") ?? [])
            : (this.items ?? []);
        const sent = (this.items ?? [])
            .slice(before.length)
            .some((item) => item?.type === "message" && item.role === "user");
        this.#follow =
            (changed.has("items") || changed.has("verbose")) &&
                (frame === null || before.length === 0 || sent || atEnd(frame));
    }
    updated() {
        const follow = this.#follow;
        this.#follow = false;
        if (!this.isConnected)
            return;
        const frame = this.renderRoot.querySelector(".frame");
        if (!frame)
            return;
        if (follow)
            end(frame);
        this.#observe(frame);
        this.#seen(frame);
    }
    #seen(frame) {
        this.#height = frame.scrollHeight;
        this.#size = this.#measured();
    }
    #measured() {
        return this.#last?.getBoundingClientRect().height ?? 0;
    }
    #observe(frame) {
        const content = frame.firstElementChild;
        this.#last = content?.matches("ol") ? content.lastElementChild : content;
        if (content === this.#content)
            return;
        if (this.#content)
            this.#resized.unobserve(this.#content);
        this.#content = content;
        if (content)
            this.#resized.observe(content);
    }
    #status(status) {
        const label = status ? STATUS_LABELS[status] : undefined;
        if (!label)
            return nothing;
        const dot = status === "in_progress"
            ? html `<span class="dot motion-pulse" aria-hidden="true"></span>`
            : nothing;
        return html `<span class="status text-nowrap ${status}">${dot}${label}</span>`;
    }
    #message(item) {
        const role = item.role === "user" ? "User" : "Assistant";
        const parts = (item.content ?? []).map((part) => {
            switch (part?.type) {
                case "input_text":
                    return html `<p class="text">${part.text}</p>`;
                case "output_text":
                    return html `<div class="markdown">${markdown(part.text ?? "")}</div>`;
                case "refusal":
                    return html `<p class="refusal">
            <strong class="label">Refusal</strong> <span>${part.refusal}</span>
          </p>`;
                default:
                    return nothing;
            }
        });
        return html `<article
      class="message ${item.role}"
      aria-busy=${item.status === "in_progress" ? "true" : nothing}
    >
      <header class="meta text-quiet-s"><span class="role">${role}</span>${this.#status(item.status)}</header>
      <div class="content">${parts}</div>
    </article>`;
    }
    #line(item, kind, names, described) {
        const status = this.#status(item.status);
        const parts = [html `<span class="kind text-nowrap">${kind}</span>`, ...names];
        if (status !== nothing)
            parts.push(status);
        parts.push(...described);
        return parts.map((part, index) => (index ? html ` ${part}` : part));
    }
    #details(item, kind, names, body, described = []) {
        return html `<details class="verbose ${item.type}">
      <summary class="text-quiet-s">${this.#line(item, kind, names, described)}</summary>
      <div class="content">${body}</div>
    </details>`;
    }
    #reasoning(item) {
        const parts = (parts, type) => (parts ?? []).filter((part) => part?.type === type);
        const summary = parts(item.summary, "summary_text")
            .map((part) => part.text ?? "")
            .join(" ")
            .trim();
        const content = parts(item.content, "reasoning_text");
        const thought = content.some((part) => part.text?.trim());
        const described = summary ? [html `<span class="summary-text">${summary}</span>`] : [];
        if (summary && !thought) {
            const gutter = html `<span class="gutter" aria-hidden="true"></span>`;
            const line = this.#line(item, "Reasoning", [], described);
            return html `<p class="verbose reasoning line text-quiet-s">${gutter}${line}</p>`;
        }
        return this.#details(item, "Reasoning", [], thought
            ? content.map((part) => html `<p class="text reasoning_text">${part.text}</p>`)
            : html `<p class="empty text-quiet-s">No reasoning text.</p>`, described);
    }
    #call(item) {
        const args = item.arguments ?? "";
        return this.#details(item, "Function call", [
            html `<code class="name text-break">${item.name}</code>`,
            html `<span class="id text-break">${item.call_id}</span>`,
        ], args.trim()
            ? html `<pre>${pretty(args)}</pre>`
            : html `<p class="empty text-quiet-s">No arguments.</p>`);
    }
    #output(item, name) {
        const output = typeof item.output === "string"
            ? item.output
            : (item.output ?? [])
                .filter((part) => part?.type === "input_text")
                .map((part) => part.text)
                .join("\n");
        return this.#details(item, "Function output", [
            ...(name ? [html `<code class="name text-break">${name}</code>`] : []),
            html `<span class="id text-break">${item.call_id}</span>`,
        ], output.trim()
            ? html `<pre>${pretty(output)}</pre>`
            : html `<p class="empty text-quiet-s">No output.</p>`);
    }
    render() {
        const names = new Map();
        const shown = [];
        (this.items ?? []).forEach((item, index) => {
            const key = item?.id ? `id:${item.id}` : `at:${index}`;
            switch (item?.type) {
                case "message":
                    if (item.role === "user" || item.role === "assistant") {
                        shown.push({ key, kind: item.role, view: this.#message(item) });
                    }
                    return;
                case "reasoning":
                    if (this.verbose)
                        shown.push({ key, kind: "verbose", view: this.#reasoning(item) });
                    return;
                case "function_call":
                    names.set(item.call_id, item.name);
                    if (this.verbose)
                        shown.push({ key, kind: "verbose", view: this.#call(item) });
                    return;
                case "function_call_output":
                    if (this.verbose) {
                        shown.push({ key, kind: "verbose", view: this.#output(item, names.get(item.call_id)) });
                    }
                    return;
            }
        });
        return html `<div class="frame scroll-frame" tabindex="0" role="region" aria-label="Conversation">
      ${shown.length
            ? html `<ol class="thread list-bare">
            ${repeat(shown, ({ key }) => key, ({ kind, view }) => html `<li class="item ${kind}">${view}</li>`)}
          </ol>`
            : html `<p class="empty-thread">No messages yet.</p>`}
    </div>`;
    }
}
define(tagName, ChatThread);
