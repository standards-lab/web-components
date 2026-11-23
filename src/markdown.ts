// Markdown to a Lit template: marked's lexer reads the source into tokens, and each token becomes
// a plain native element bound by Lit, so every text value is escaped by Lit and the module needs
// no sanitizer and never renders HTML from a string. The foundation's elements sheet styles what it
// emits: on the page through page.css, and in a shadow root that adopts the sheet, as each
// component's does.
// See docs/internals.md

import { getDefaults, Lexer, type Token, type Tokens } from "marked";
import { html, nothing, type TemplateResult } from "lit";
import { styleMap } from "lit/directives/style-map.js";

type Rendered = TemplateResult | string | typeof nothing | Rendered[];

/**
 * The source as a template: headings, paragraphs, emphasis, strong, code spans, fenced and
 * indented code, ordered and unordered lists to any depth, task items, blockquotes, rules, links,
 * GFM tables and strikethrough, and line breaks. Raw HTML, block or inline, shows as its own text;
 * an image shows its alt text; a link is an anchor only to an http, https, or mailto URL or a
 * relative one. Partial source, an unclosed fence or a list still growing, renders what has
 * arrived, and rendering a longer source into the same container updates its DOM in place.
 */
export function markdown(source: string): TemplateResult {
  const tokens = Lexer.lex(source, { ...getDefaults(), gfm: true, breaks: false });
  return html`${blocks(tokens)}`;
}

function blocks(tokens: Token[]): Rendered[] {
  return tokens.map(block);
}

function block(token: Token): Rendered {
  switch (token.type) {
    case "heading":
      return heading(token as Tokens.Heading);
    case "paragraph":
      return html`<p>${inline((token as Tokens.Paragraph).tokens)}</p>`;
    case "code":
      return html`<pre><code>${(token as Tokens.Code).text}</code></pre>`;
    case "blockquote":
      return html`<blockquote>${blocks((token as Tokens.Blockquote).tokens)}</blockquote>`;
    case "list":
      return list(token as Tokens.List);
    case "table":
      return table(token as Tokens.Table);
    case "hr":
      return html`<hr />`;
    case "html":
      return html`<p>${(token as Tokens.HTML).text.trimEnd()}</p>`;
    case "text": {
      const text = token as Tokens.Text;
      return text.tokens ? inline(text.tokens) : decode(text.text);
    }
    case "checkbox":
      return checkbox(token as Tokens.Checkbox);
    case "space":
    case "def":
      return nothing;
    default:
      return generic(token);
  }
}

function heading({ depth, tokens }: Tokens.Heading): TemplateResult {
  const content = inline(tokens);
  switch (depth) {
    case 1:
      return html`<h1>${content}</h1>`;
    case 2:
      return html`<h2>${content}</h2>`;
    case 3:
      return html`<h3>${content}</h3>`;
    case 4:
      return html`<h4>${content}</h4>`;
    case 5:
      return html`<h5>${content}</h5>`;
    default:
      return html`<h6>${content}</h6>`;
  }
}

function list({ ordered, start, items }: Tokens.List): TemplateResult {
  const content = items.map((item) => html`<li>${blocks(item.tokens)}</li>`);
  if (!ordered) return html`<ul>${content}</ul>`;
  return html`<ol start=${start === "" || start === 1 ? nothing : start}>${content}</ol>`;
}

function checkbox({ checked }: Tokens.Checkbox): TemplateResult {
  return html`<input type="checkbox" disabled ?checked=${checked} /> `;
}

function table({ header, rows }: Tokens.Table): TemplateResult {
  const align = ({ align }: Tokens.TableCell) =>
    align === null ? nothing : styleMap({ "text-align": align });
  const th = (cell: Tokens.TableCell) => html`<th style=${align(cell)}>${inline(cell.tokens)}</th>`;
  const td = (cell: Tokens.TableCell) => html`<td style=${align(cell)}>${inline(cell.tokens)}</td>`;
  const body = rows.map((row) => html`<tr>${row.map(td)}</tr>`);
  return html`<table><thead><tr>${header.map(th)}</tr></thead>${
    rows.length === 0 ? nothing : html`<tbody>${body}</tbody>`
  }</table>`;
}

function inline(tokens: Token[]): Rendered[] {
  return tokens.map(span);
}

function span(token: Token): Rendered {
  switch (token.type) {
    case "text": {
      const text = token as Tokens.Text;
      if (text.tokens) return inline(text.tokens);
      return text.escaped ? text.text : decode(text.text);
    }
    case "escape":
      return (token as Tokens.Escape).text;
    case "strong":
      return html`<strong>${inline((token as Tokens.Strong).tokens)}</strong>`;
    case "em":
      return html`<em>${inline((token as Tokens.Em).tokens)}</em>`;
    case "del":
      return html`<del>${inline((token as Tokens.Del).tokens)}</del>`;
    case "codespan":
      return html`<code>${(token as Tokens.Codespan).text}</code>`;
    case "br":
      return html`<br />`;
    case "link":
      return link(token as Tokens.Link);
    case "image":
      return plain((token as Tokens.Image).tokens);
    case "html":
      return (token as Tokens.Tag).text;
    case "checkbox":
      return checkbox(token as Tokens.Checkbox);
    default:
      return generic(token);
  }
}

function generic(token: Token): Rendered {
  return "tokens" in token && token.tokens ? inline(token.tokens) : token.raw;
}

function link({ href, title, tokens, text, autolink }: Tokens.Link): Rendered {
  const url = autolink ? href : decode(href);
  const content = autolink ? text : inline(tokens);
  if (!safe(url)) return content;
  return html`<a rel="noreferrer" href=${url} title=${title ? decode(title) : nothing}
    >${content}</a
  >`;
}

const schemes = new Set(["http:", "https:", "mailto:"]);

function safe(url: string): boolean {
  try {
    return schemes.has(new URL(url, "https://base.invalid/").protocol);
  } catch {
    return false;
  }
}

function plain(tokens: Token[]): string {
  return tokens
    .map((token): string => {
      switch (token.type) {
        case "text": {
          const text = token as Tokens.Text;
          if (text.tokens) return plain(text.tokens);
          return text.escaped ? text.text : decode(text.text);
        }
        case "escape":
        case "codespan":
        case "html":
          return (token as Tokens.Escape).text;
        case "br":
          return "";
        default:
          return "tokens" in token && token.tokens ? plain(token.tokens) : "";
      }
    })
    .join("");
}

let decoder: HTMLTextAreaElement | undefined;

function decode(text: string): string {
  if (!text.includes("&")) return text;
  decoder ??= document.implementation.createHTMLDocument("").createElement("textarea");
  decoder.innerHTML = text;
  return decoder.value;
}
