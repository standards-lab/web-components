import { LitElement, type TemplateResult } from "lit";
import { type Listed } from "@standards-lab/web-foundation/keys.js";
/** The tag the element defines. */
export declare const tagName = "sl-shortcuts";
/** The screen-reader note after the table: how to pass the next key through a screen reader. */
export declare const NOTE: string;
/** The word after the keys of a row the reader's setting turns off. */
export declare const OFF = "off";
/**
 * Lists the page's keyboard shortcuts, for a help dialog: exactly the bindings the foundation's
 * keys module's `bindings(dialog)` gives for the dialog that holds the element, or
 * `bindings(null)` outside one, in its order. Each row's keys are the binding's sequences, each key
 * in a `kbd` as the keys grammar labels it, "+" within a press, " then " between presses, " or "
 * between sequences; its action is the binding's registered label or its element's name, as plain
 * text. A row the reader's setting turns off carries the word "off" after its keys, shown and
 * read, and the class `off`. Nothing in it takes focus. The screen-reader note follows the table.
 * It reads the bindings again as it connects, as its dialog opens, and at each `change` in the
 * document, as a settings form sends, and each `storage` event, as another tab's change sends.
 */
export declare class Shortcuts extends LitElement {
    #private;
    static styles: CSSStyleSheet[];
    static properties: {
        _rows: {
            state: true;
        };
    };
    _rows: Listed[];
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    render(): TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "sl-shortcuts": Shortcuts;
    }
}
