// Markdown to a Lit template: marked's lexer reads the source into tokens, and each token becomes
// a plain native element bound by Lit, so every text value is escaped by Lit and the module needs
// no sanitizer and never renders HTML from a string. The foundation's elements sheet styles what it
// emits: on the page through page.css, and in a shadow root that adopts the sheet, as each
// component's does.
// From spike-html-apps-components (10dde51): src/markdown.ts.
// See docs/internals.md
import { getDefaults, Lexer } from "marked";
import { html, nothing } from "lit";
import { styleMap } from "lit/directives/style-map.js";
/**
 * The source as a template: headings, paragraphs, emphasis, strong, code spans, fenced and
 * indented code, ordered and unordered lists to any depth, task items, blockquotes, rules, links,
 * GFM tables and strikethrough, and line breaks. Raw HTML, block or inline, shows as its own text;
 * an image shows its alt text; a link is an anchor only to an http, https, or mailto URL or a
 * relative one. Partial source, an unclosed fence or a list still growing, renders what has
 * arrived, and rendering a longer source into the same container updates its DOM in place.
 */
export function markdown(source) {
    const tokens = Lexer.lex(source, { ...getDefaults(), gfm: true, breaks: false });
    return html `${blocks(tokens)}`;
}
function blocks(tokens) {
    return tokens.map(block);
}
function block(token) {
    switch (token.type) {
        case "heading":
            return heading(token);
        case "paragraph":
            return html `<p>${inline(token.tokens)}</p>`;
        case "code":
            return html `<pre><code>${token.text}</code></pre>`;
        case "blockquote":
            return html `<blockquote>${blocks(token.tokens)}</blockquote>`;
        case "list":
            return list(token);
        case "table":
            return table(token);
        case "hr":
            return html `<hr />`;
        case "html":
            return html `<p>${token.text.trimEnd()}</p>`;
        case "text": {
            const text = token;
            return text.tokens ? inline(text.tokens) : decode(text.text);
        }
        case "checkbox":
            return checkbox(token);
        case "space":
        case "def":
            return nothing;
        default:
            return generic(token);
    }
}
function heading({ depth, tokens }) {
    const content = inline(tokens);
    switch (depth) {
        case 1:
            return html `<h1>${content}</h1>`;
        case 2:
            return html `<h2>${content}</h2>`;
        case 3:
            return html `<h3>${content}</h3>`;
        case 4:
            return html `<h4>${content}</h4>`;
        case 5:
            return html `<h5>${content}</h5>`;
        default:
            return html `<h6>${content}</h6>`;
    }
}
function list({ ordered, start, items }) {
    const content = items.map((item) => html `<li>${blocks(item.tokens)}</li>`);
    if (!ordered)
        return html `<ul>${content}</ul>`;
    return html `<ol start=${start === "" || start === 1 ? nothing : start}>${content}</ol>`;
}
function checkbox({ checked }) {
    return html `<input type="checkbox" disabled ?checked=${checked} /> `;
}
function table({ header, rows }) {
    const align = ({ align }) => align === null ? nothing : styleMap({ "text-align": align });
    const th = (cell) => html `<th style=${align(cell)}>${inline(cell.tokens)}</th>`;
    const td = (cell) => html `<td style=${align(cell)}>${inline(cell.tokens)}</td>`;
    const body = rows.map((row) => html `<tr>${row.map(td)}</tr>`);
    return html `<table><thead><tr>${header.map(th)}</tr></thead>${rows.length === 0 ? nothing : html `<tbody>${body}</tbody>`}</table>`;
}
function inline(tokens) {
    return tokens.map(span);
}
function span(token) {
    switch (token.type) {
        case "text": {
            const text = token;
            if (text.tokens)
                return inline(text.tokens);
            return text.escaped ? text.text : decode(text.text);
        }
        case "escape":
            return token.text;
        case "strong":
            return html `<strong>${inline(token.tokens)}</strong>`;
        case "em":
            return html `<em>${inline(token.tokens)}</em>`;
        case "del":
            return html `<del>${inline(token.tokens)}</del>`;
        case "codespan":
            return html `<code>${token.text}</code>`;
        case "br":
            return html `<br />`;
        case "link":
            return link(token);
        case "image":
            return plain(token.tokens);
        case "html":
            return token.text;
        case "checkbox":
            return checkbox(token);
        default:
            return generic(token);
    }
}
function generic(token) {
    return "tokens" in token && token.tokens ? inline(token.tokens) : token.raw;
}
function link({ href, title, tokens, text, autolink }) {
    const url = autolink ? href : decode(href);
    const content = autolink ? text : inline(tokens);
    if (!safe(url))
        return content;
    return html `<a rel="noreferrer" href=${url} title=${title ? decode(title) : nothing}
    >${content}</a
  >`;
}
const schemes = new Set(["http:", "https:", "mailto:"]);
function safe(url) {
    try {
        return schemes.has(new URL(url, "https://base.invalid/").protocol);
    }
    catch {
        return false;
    }
}
function plain(tokens) {
    return tokens
        .map((token) => {
        switch (token.type) {
            case "text": {
                const text = token;
                if (text.tokens)
                    return plain(text.tokens);
                return text.escaped ? text.text : decode(text.text);
            }
            case "escape":
            case "codespan":
            case "html":
                return token.text;
            case "br":
                return "";
            default:
                return "tokens" in token && token.tokens ? plain(token.tokens) : "";
        }
    })
        .join("");
}
let decoder;
function decode(text) {
    if (!text.includes("&"))
        return text;
    decoder ??= document.implementation.createHTMLDocument("").createElement("textarea");
    decoder.innerHTML = text;
    return decoder.value;
}
