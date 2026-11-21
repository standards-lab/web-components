// The profiles the installed foundation registers, read from its registry.
// See docs/testing.md

import "@standards-lab/web-foundation/register-full.js";
import { DEFAULTS, profiles } from "@standards-lab/web-foundation/registry.js";

/** Each facet's default profile, as the registry gives it. */
export { DEFAULTS };

/** Every built-in color profile, in registration order, the default first. */
export const colors: readonly string[] = profiles("color");

/** Every built-in space profile but the default, regular. */
export const spaces: readonly string[] = profiles("space").filter((n) => n !== DEFAULTS.space);

/** Every built-in type profile but the default, mono. */
export const types: readonly string[] = profiles("type").filter((n) => n !== DEFAULTS.type);
