// The event log, Lit with a shadow root: events in the order given, each its type, its time, and
// its source, subject, and id, with its data pretty-printed on demand, inside one frame that
// scrolls when its consumer constrains its block size. The event is a structural subset of
// CloudEvents 1.0, by its attribute names, so an event as a stream carries it fits as it is. It
// knows no SDK and no domain. It is display-only: it sends no event and binds no key.
// Adapted from spike-html-apps-components (10dde51): src/event-log.ts, on @standards-lab/web-foundation.
// See docs/internals.md
import { html, LitElement, nothing } from "lit";
import { repeat } from "lit/directives/repeat.js";
import elements from "@standards-lab/web-foundation/baseline/elements.css" with { type: "css" };
import reset from "@standards-lab/web-foundation/baseline/reset.css" with { type: "css" };
import utilities from "@standards-lab/web-foundation/utilities.css" with { type: "css" };
import { define } from "@standards-lab/web-foundation/dom.js";
import { formatDateTime } from "@standards-lab/web-foundation/format.js";
import styles from "./event-log.css" with { type: "css" };
/** The tag the element defines. */
export const tagName = "sl-event-log";
const timeFormat = { dateStyle: "medium", timeStyle: "medium" };
function occurred(event) {
    if (event.time === undefined || event.time === null)
        return null;
    const date = new Date(event.time);
    return Number.isNaN(date.getTime()) ? null : date;
}
function pretty(data) {
    if (typeof data === "string")
        return data;
    try {
        const json = JSON.stringify(data, (_key, value) => (typeof value === "bigint" ? value.toString() : value), 2);
        if (json !== undefined)
            return json;
    }
    catch {
        return String(data);
    }
    return String(data);
}
function atEnd(frame) {
    const zoom = Math.min(frame.currentCSSZoom ?? 1, 1);
    return frame.scrollHeight - frame.clientHeight - frame.scrollTop <= 2 / zoom;
}
/**
 * Shows events as a log, in the order given, oldest first: each its type and its time, formatted
 * by the foundation's formatDateTime, absolute and to the second, or its type alone when it has no
 * time or one that doesn't parse, the line holding no room for one; under them its source, subject,
 * and id, each labelled and each on a line of its own, a subject or an id longer than its line cut
 * with an ellipsis, its whole text kept and shown in its title; and its data pretty-printed in a
 * native details, collapsed until opened. An event without data says so in the details' place.
 * Each event is keyed by its source and id, the pair CloudEvents makes unique, so events appended
 * to the list leave those shown in their own nodes and places, and a details the reader opened
 * stays open.
 *
 * The frame is a log, a live region: polite, so an arrival never interrupts, and additions only,
 * so a new event is read once and a re-render or a removal is not. Events are discrete and arrive
 * at a pipeline's pace, seconds apart, unlike a chat reply streamed word by word, which a live
 * region would read at every word. When its consumer constrains its block size, the frame scrolls,
 * and it follows the newest event as one arrives only while the reader is at its end: a reader who
 * scrolled up keeps their place, and the first events shown open at the top.
 */
export class EventLog extends LitElement {
    static styles = [reset, elements, utilities, styles];
    static properties = {
        events: { attribute: false },
    };
    #follow = false;
    constructor() {
        super();
        this.events = [];
    }
    willUpdate(changed) {
        const frame = this.renderRoot.querySelector(".frame");
        const shown = changed.get("events")?.length ?? 0;
        this.#follow = changed.has("events") && shown > 0 && frame !== null && atEnd(frame);
    }
    updated() {
        if (!this.#follow)
            return;
        this.#follow = false;
        const frame = this.renderRoot.querySelector(".frame");
        if (frame)
            frame.scrollTop = frame.scrollHeight;
    }
    #pair(label, value, cut = false) {
        return html `<div class="pair">
      <dt class="text-nowrap">${label}</dt>
      <dd class=${cut ? "text-truncate" : "text-break"} title=${cut ? value : nothing}>${value}</dd>
    </div>`;
    }
    #event(event) {
        const date = occurred(event);
        const subject = event.subject ?? undefined;
        return html `<li class="event">
      <div class="head">
        <span class="type text-nowrap">${event.type}</span>
        ${date
            ? html `<time class="when text-quiet-s text-numeric" datetime=${date.toISOString()}
                >${formatDateTime(date, undefined, timeFormat)}</time
              >`
            : nothing}
      </div>
      <dl class="meta text-quiet-xs">
        ${this.#pair("source", event.source)}
        ${subject === undefined || subject === "" ? nothing : this.#pair("subject", subject, true)}
        ${this.#pair("id", event.id, true)}
      </dl>
      ${event.data === undefined
            ? html `<p class="no-data">No data</p>`
            : html `<details class="data">
              <summary class="text-quiet-s">Data</summary>
              <pre>${pretty(event.data)}</pre>
            </details>`}
    </li>`;
    }
    render() {
        const events = this.events ?? [];
        return html `<div class="frame scroll-frame" role="log" aria-live="polite" aria-relevant="additions" aria-label="Events">
      ${events.length
            ? html `<ol class="events list-bare">
            ${repeat(events, (event) => `${event.source}\u0000${event.id}`, (event) => this.#event(event))}
          </ol>`
            : html `<p class="empty">No events yet.</p>`}
    </div>`;
    }
}
define(tagName, EventLog);
