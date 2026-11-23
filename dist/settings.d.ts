import { LitElement } from "lit";
import { type Settings as KeySettings } from "@standards-lab/web-foundation/keys.js";
import { type Choice } from "@standards-lab/web-foundation/preferences.js";
/** The tag the element defines. */
export declare const tagName = "sl-settings";
/** The character-key switch's label. */
export declare const SWITCH_LABEL = "Character-key shortcuts (combinations with Control, Alt, or Meta stay on)";
/** The wait select's label. */
export declare const WAIT_LABEL = "Wait between presses";
/**
 * The reader's settings, for a Settings dialog that holds the element. The theme is a row each
 * for color, scheme, space, and type, each a radio group drawn as ◀ value ▶, its other radios
 * hidden visually and kept in the group, its arrows spans hidden from assistive technology that
 * take no focus; a click on an arrow steps the row. On a row, H and L step it, wrapping, J and K
 * or the down and up arrows move to the next and the previous row, stopping at the ends, and the
 * left and right arrows cycle its radios natively; none of these keys leaves the rows. Beside the
 * rows, an inert preview card shows the theme on a heading, a link, code, kbd, buttons, a field,
 * and a striped table. Each step applies the choice to the page's root and stores it through the
 * foundation's preferences module. The keyboard settings are the character-key switch and the
 * wait between presses, one of `WAITS`, each stored through the keys module's `changeSettings`; a
 * stored wait not among `WAITS` shows as an option that clears it. Every change fires a bubbling,
 * composed `change` at the host. It reads both settings again as it connects, as its dialog
 * opens, at each `change` in the document, and at each `storage` event; as the dialog opens it
 * focuses the first row's checked radio, unless an element in the dialog has `autofocus`.
 */
export declare class Settings extends LitElement {
    #private;
    static styles: CSSStyleSheet[];
    static properties: {
        _choice: {
            state: true;
        };
        _keys: {
            state: true;
        };
    };
    _choice: Choice;
    _keys: KeySettings;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    render(): import("lit").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "sl-settings": Settings;
    }
}
