// The output the foundation's formatJson owes text nested in arrays alone: the outer
// JSON_MAX_DEPTH levels indented, the levels below them kept as written.

/** `"[".repeat(depth) + "1" + "]".repeat(depth)` as formatJson formats it. */
export function deepFormatted(depth: number): string {
  const formatted = Math.min(depth, 64);
  const kept = depth - formatted;
  const indent = (level: number): string => "  ".repeat(level);
  const opening = Array.from({ length: formatted }, (_, level) => `${indent(level)}[`);
  const closing = Array.from(
    { length: formatted },
    (_, level) => `${indent(formatted - 1 - level)}]`,
  );
  const inner = `${indent(formatted)}${"[".repeat(kept)}1${"]".repeat(kept)}`;
  return [...opening, inner, ...closing].join("\n");
}
