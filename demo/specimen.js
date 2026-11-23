// The specimen pages' renderer: every state, labelled, into each of the page's state lists, and
// the focus state into the focus section.

/**
 * A state: its label, and a function that builds the component in it, fresh for each list.
 * @typedef {{ label: string; build: () => HTMLElement }} State
 */

/**
 * A state's figure: its label as the caption, then the component in its frame.
 * @param {State} state
 */
export function figure({ label, build }) {
  const frame = document.createElement("div");
  frame.className = "state-frame";
  frame.append(build());
  const caption = document.createElement("figcaption");
  caption.textContent = label;
  const state = document.createElement("figure");
  state.className = "state";
  state.append(caption, frame);
  return state;
}

/**
 * Renders the states into every `.states` list, and the focus state after `#focus`'s `[data-focus-start]` mark.
 * @param {State[]} states
 * @param {State} [focus]
 */
export function specimens(states, focus) {
  for (const list of document.querySelectorAll("main > section:not(#focus) .states")) {
    list.append(...states.map(figure));
  }
  if (focus) document.querySelector("#focus .states")?.append(figure(focus));
}

/** An element of the tag, its properties assigned. */
export function make(tag, properties = {}, children = []) {
  const element = Object.assign(document.createElement(tag), properties);
  element.append(...children);
  return element;
}
