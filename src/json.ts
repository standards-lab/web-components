// JSON formatted from its own tokens: the text is walked once, token by token, and each token is
// emitted exactly as written, with two-space indentation between them. Nothing is parsed into a
// value and printed again, so the keys keep their order, duplicates included, numbers keep their
// literals, and strings keep their escapes; only the whitespace between tokens changes. A
// container deeper than MAX_DEPTH is kept as written, whole, so no indent grows past MAX_DEPTH's,
// and the output's length stays linear in the text's however deep it nests.
// From spike-html-apps-components (10dde51): src/json.ts.

const QUOTE = 0x22;
const COMMA = 0x2c;
const COLON = 0x3a;
const OPEN_BRACKET = 0x5b;
const BACKSLASH = 0x5c;
const CLOSE_BRACKET = 0x5d;
const OPEN_BRACE = 0x7b;
const CLOSE_BRACE = 0x7d;

function indent(depth: number): string {
  return "  ".repeat(depth);
}

function isSpace(code: number): boolean {
  return code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d;
}

function endsValue(code: number): boolean {
  return (
    isSpace(code) ||
    code === COMMA ||
    code === COLON ||
    code === CLOSE_BRACKET ||
    code === CLOSE_BRACE
  );
}

/**
 * The deepest container `formatJson` indents: the top-level object or array is depth 1, and a
 * container that would open at depth `MAX_DEPTH + 1` is kept as written, its brackets, its tokens,
 * and the whitespace between them, on the line where it opens.
 */
export const MAX_DEPTH = 64;

/**
 * Valid JSON text, re-indented: each member or element on its own line, two spaces an indent per
 * depth, `": "` after each key, and an empty object or array as `{}` or `[]`. Every
 * token, a string with its escapes, a number, `true`, `false`, or `null`, and each punctuation
 * mark, appears as the text wrote it and in its order; whitespace outside strings is the only
 * thing that changes. The text must be valid JSON, as `JSON.parse` accepts it: the walk reads
 * tokens without checking their grammar, so it never decides whether the text is valid, and its
 * output for text that isn't is unspecified. Containers to `MAX_DEPTH` deep are indented; one that
 * would open deeper is kept as written, from its opening bracket to its matching closing one, on the
 * line where it opens, and formatting resumes after it. Each token in the outer `MAX_DEPTH` levels
 * adds at most a line break and an indent of `2 * MAX_DEPTH` spaces, so the output's length is
 * linear in the text's, at any depth; only text whose output passes the longest string throws, a
 * RangeError.
 */
export function formatJson(text: string): string {
  const out: string[] = [];
  const length = text.length;
  let depth = 0;
  let at = 0;
  const skip = (from: number): number => {
    while (from < length && isSpace(text.charCodeAt(from))) from++;
    return from;
  };
  const stringEnd = (from: number): number => {
    let end = from + 1;
    while (end < length) {
      const inner = text.charCodeAt(end);
      if (inner === BACKSLASH) end += 2;
      else if (inner === QUOTE) break;
      else end++;
    }
    return end;
  };
  const containerEnd = (from: number): number => {
    let open = 0;
    let end = from;
    while (end < length) {
      const inner = text.charCodeAt(end);
      if (inner === QUOTE) end = stringEnd(end);
      else if (inner === OPEN_BRACE || inner === OPEN_BRACKET) open++;
      else if ((inner === CLOSE_BRACE || inner === CLOSE_BRACKET) && --open === 0) return end + 1;
      end++;
    }
    return length;
  };
  while ((at = skip(at)) < length) {
    const code = text.charCodeAt(at);
    switch (code) {
      case OPEN_BRACE:
      case OPEN_BRACKET: {
        if (depth === MAX_DEPTH) {
          const end = containerEnd(at);
          out.push(text.slice(at, end));
          at = end;
          break;
        }
        const next = skip(at + 1);
        const close = code === OPEN_BRACE ? CLOSE_BRACE : CLOSE_BRACKET;
        if (text.charCodeAt(next) === close) {
          out.push(code === OPEN_BRACE ? "{}" : "[]");
          at = next + 1;
        } else {
          depth++;
          out.push(text[at], "\n", indent(depth));
          at++;
        }
        break;
      }
      case CLOSE_BRACE:
      case CLOSE_BRACKET:
        depth--;
        out.push("\n", indent(depth), text[at]);
        at++;
        break;
      case COMMA:
        out.push(",\n", indent(depth));
        at++;
        break;
      case COLON:
        out.push(": ");
        at++;
        break;
      case QUOTE: {
        const end = stringEnd(at);
        out.push(text.slice(at, end + 1));
        at = end + 1;
        break;
      }
      default: {
        let end = at + 1;
        while (end < length && !endsValue(text.charCodeAt(end))) end++;
        out.push(text.slice(at, end));
        at = end;
      }
    }
  }
  return out.join("");
}
