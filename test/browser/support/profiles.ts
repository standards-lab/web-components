// The profiles the installed foundation registers, read from its registry rather than written out,
// so a profile a later foundation adds is covered by every case and capture that reads them: its
// full registration module, register-full.js, imports every built-in unit's module, each of which
// registers its name and loads no CSS, so Node imports it as a page does. The browser tier's
// profile combinations and the screenshots description's --all both read these.

import "@standards-lab/web-foundation/register-full.js";
import { DEFAULTS, profiles } from "@standards-lab/web-foundation/registry.js";

export { DEFAULTS };

/** Every built-in color profile, in registration order, the default first. */
export const colors: readonly string[] = profiles("color");

/** Every built-in space profile but the default, regular. */
export const spaces: readonly string[] = profiles("space").filter((n) => n !== DEFAULTS.space);

/** Every built-in type profile but the default, mono. */
export const types: readonly string[] = profiles("type").filter((n) => n !== DEFAULTS.type);
