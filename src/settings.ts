// The settings, Lit with a shadow root: the reader's theme, its color, scheme, space, and type, in
// rows beside an inert preview card, and the keys module's character-key switch and wait between
// presses, for a Settings dialog that holds the element. Every change applies and is stored at
// once, with no Save and no Cancel, and fires a bubbling, composed change at the host. It binds no
// page key.

import { html, LitElement, nothing, type PropertyDeclarations } from "lit";
import { live } from "lit/directives/live.js";

import elements from "@standards-lab/web-foundation/baseline/elements.css" with { type: "css" };
import reset from "@standards-lab/web-foundation/baseline/reset.css" with { type: "css" };
import meta from "@standards-lab/web-foundation/meta.css" with { type: "css" };
import structure from "@standards-lab/web-foundation/structure.css" with { type: "css" };
import utilities from "@standards-lab/web-foundation/utilities.css" with { type: "css" };
import { define } from "@standards-lab/web-foundation/dom.js";
import {
  changeSettings,
  settings,
  WAITS,
  type Settings as KeySettings,
} from "@standards-lab/web-foundation/keys.js";
import {
  apply,
  ATTRIBUTES,
  save,
  SCHEMES,
  type Choice,
  type Key,
} from "@standards-lab/web-foundation/preferences.js";
import { DEFAULTS, FACETS, profiles } from "@standards-lab/web-foundation/registry.js";
import styles from "./settings.css" with { type: "css" };

/** The tag the element defines. */
export const tagName = "sl-settings";

/** The character-key switch's label. */
export const SWITCH_LABEL =
  "Character-key shortcuts (combinations with Control, Alt, or Meta stay on)";

/** The wait select's label. */
export const WAIT_LABEL = "Wait between presses";

const SECTIONS: readonly (readonly [Key, string])[] = [
  ["color", "Color"],
  ["scheme", "Scheme"],
  ["space", "Space"],
  ["type", "Type"],
];

const PREVIEW = html`<h3>Nightly build</h3>
  <p>
    Read the <a href="#release-notes">release notes</a>, run <code>mise run check</code>, or press
    <kbd>Ctrl</kbd> <kbd>K</kbd> to search.
  </p>
  <p class="theme-menu-buttons">
    <button type="button">Retry</button> <button type="button" class="button-blue">Deploy</button>
  </p>
  <div class="field">
    <label for="preview-branch">Branch</label
    ><input type="text" id="preview-branch" value="main" />
  </div>
  <table class="table-striped">
    <thead>
      <tr>
        <th scope="col">Run</th>
        <th scope="col">Status</th>
        <th scope="col">Time</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1204</td>
        <td>passed</td>
        <td>2m 14s</td>
      </tr>
      <tr>
        <td>1205</td>
        <td>failed</td>
        <td>48s</td>
      </tr>
      <tr>
        <td>1206</td>
        <td>queued</td>
        <td>—</td>
      </tr>
    </tbody>
  </table>`;

function options(key: Key): string[] {
  return key === "scheme" ? [...SCHEMES] : profiles(key);
}

function current(): Choice {
  const root = document.documentElement;
  const choice = { scheme: root.getAttribute(ATTRIBUTES.scheme) ?? SCHEMES[0] } as Choice;
  for (const facet of FACETS) {
    choice[facet] = root.getAttribute(ATTRIBUTES[facet]) ?? DEFAULTS[facet];
  }
  return choice;
}

function rowOf(node: EventTarget | null): HTMLFieldSetElement | null {
  return node instanceof Element ? node.closest<HTMLFieldSetElement>(".theme-menu-row") : null;
}

const shown = (ms: number): string => `${ms / 1000} s`;

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
export class Settings extends LitElement {
  static styles = [reset, elements, meta, structure, utilities, styles];

  static properties = {
    _choice: { state: true },
    _keys: { state: true },
  } satisfies PropertyDeclarations;

  declare _choice: Choice;
  declare _keys: KeySettings;

  #dialog: HTMLDialogElement | null = null;

  constructor() {
    super();
    this._choice = current();
    this._keys = settings();
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.#dialog = this.closest("dialog");
    this.#dialog?.addEventListener("toggle", this.#toggled);
    document.addEventListener("change", this.#refresh);
    addEventListener("storage", this.#refresh);
    this.#refresh();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#dialog?.removeEventListener("toggle", this.#toggled);
    this.#dialog = null;
    document.removeEventListener("change", this.#refresh);
    removeEventListener("storage", this.#refresh);
  }

  render() {
    const { enabled, wait } = this._keys;
    const odd = !WAITS.some((ms) => ms === wait);
    return html`
      <section aria-labelledby="theme-title">
        <h3 id="theme-title">Theme</h3>
        <div class="theme-menu-body">
          <div
            class="theme-menu-rows"
            @change=${this.#picked}
            @click=${this.#clicked}
            @keydown=${this.#onkey}
          >
            ${SECTIONS.map(([key, legend]) => this.#row(key, legend))}
          </div>
          <div class="theme-menu-preview" inert>${PREVIEW}</div>
        </div>
      </section>
      <section aria-labelledby="keyboard-title">
        <h3 id="keyboard-title">Keyboard</h3>
        <label>
          <input
            type="checkbox"
            name="enabled"
            .checked=${live(enabled)}
            @change=${this.#switched}
          />
          ${SWITCH_LABEL}
        </label>
        <p>
          <label>
            ${WAIT_LABEL}
            <select name="wait" @change=${this.#waited}>
              ${odd ? html`<option value="" .selected=${live(true)}>${shown(wait)}</option>` : nothing}
              ${WAITS.map(
                (ms) =>
                  html`<option value=${String(ms)} .selected=${live(ms === wait)}>
                    ${shown(ms)}
                  </option>`,
              )}
            </select>
          </label>
        </p>
      </section>
    `;
  }

  #row(key: Key, legend: string) {
    const value = this._choice[key];
    return html`
      <fieldset class="theme-menu-row" data-section=${key}>
        <legend>${legend}</legend>
        <span data-step="-1" aria-hidden="true">◀</span>
        ${options(key).map(
          (option) =>
            html`<label
              ><input
                type="radio"
                name=${key}
                .value=${option}
                .checked=${live(option === value)}
              />${option}</label
            >`,
        )}
        <span data-step="1" aria-hidden="true">▶</span>
      </fieldset>
    `;
  }

  #refresh = (): void => {
    this._choice = current();
    this._keys = settings();
  };

  #toggled = async (event: Event): Promise<void> => {
    if ((event as ToggleEvent).newState !== "open") return;
    this.#refresh();
    if (this.#dialog?.querySelector("[autofocus]")) return;
    await this.updateComplete;
    this.renderRoot.querySelector<HTMLInputElement>(".theme-menu-row :checked")?.focus();
  };

  #changed(): void {
    this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
  }

  async #choose(key: Key, value: string, focus: boolean): Promise<void> {
    const choice = { ...this._choice, [key]: value };
    this._choice = choice;
    apply(choice);
    save(choice);
    this.#changed();
    if (!focus) return;
    await this.updateComplete;
    this.renderRoot.querySelector<HTMLInputElement>(`[data-section="${key}"] :checked`)?.focus();
  }

  #step(row: HTMLFieldSetElement, delta: number): void {
    const key = row.dataset.section as Key;
    const names = options(key);
    if (names.length === 0) return;
    const at = names.indexOf(this._choice[key]);
    void this.#choose(key, names[(at + delta + names.length) % names.length], true);
  }

  #move(row: HTMLFieldSetElement, delta: number): void {
    const rows = [...this.renderRoot.querySelectorAll<HTMLFieldSetElement>(".theme-menu-row")];
    const to = Math.min(Math.max(rows.indexOf(row) + delta, 0), rows.length - 1);
    rows[to].querySelector<HTMLInputElement>(":checked")?.focus();
  }

  #picked = (event: Event): void => {
    const radio = event.target as HTMLInputElement;
    const row = rowOf(radio);
    if (row) void this.#choose(row.dataset.section as Key, radio.value, false);
  };

  #clicked = (event: Event): void => {
    const arrow = event.target instanceof Element ? event.target.closest("[data-step]") : null;
    const row = rowOf(arrow);
    if (arrow instanceof HTMLElement && row) this.#step(row, Number(arrow.dataset.step));
  };

  #onkey = (event: KeyboardEvent): void => {
    const row = rowOf(event.target);
    if (!row || event.ctrlKey || event.altKey || event.metaKey) return;
    switch (event.key) {
      case "ArrowUp":
      case "k":
        this.#move(row, -1);
        break;
      case "ArrowDown":
      case "j":
        this.#move(row, 1);
        break;
      case "ArrowLeft":
      case "ArrowRight":
        event.stopPropagation();
        return;
      case "h":
      case "l":
        this.#step(row, event.key === "h" ? -1 : 1);
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  };

  #switched = (event: Event): void => {
    this._keys = changeSettings({ enabled: (event.target as HTMLInputElement).checked });
    this.#changed();
  };

  #waited = (event: Event): void => {
    const { value } = event.target as HTMLSelectElement;
    this._keys = changeSettings({ wait: value === "" ? null : Number(value) });
    this.#changed();
  };
}

define(tagName, Settings);

declare global {
  interface HTMLElementTagNameMap {
    "sl-settings": Settings;
  }
}
