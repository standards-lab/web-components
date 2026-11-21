// The type guards: values that hold to the declarations dist/ ships, so a declaration that
// narrows what a consumer may write fails `types:browser`.
// From spike-html-apps-components (10dde51): test/browser/support/types.js.

/** @import { LogEvent } from "../../../dist/event-log.js" */

/** An event without a time, as CloudEvents allows: a required `time` fails here.
 * @type {LogEvent} */
export const untimed = { id: "1", type: "run.started", source: "/runs/1" };

/** An event whose time is null, as a JSON field written empty is: a non-null `time` fails here.
 * @type {LogEvent} */
export const nullTime = { id: "2", type: "run.started", source: "/runs/2", time: null };
