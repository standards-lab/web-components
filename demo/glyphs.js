// The demo pages' glyphs: each empty marker, `<svg data-icon="octicon/<name>">`, replaced as the
// module loads by the web-icons module's svg, as web-icons' iconFill() fills a Vite page's markers
// at build. The page's import map names each icon's module: question-16, gear-16, and x-16.

import gear from "@standards-lab/web-icons/octicon/gear-16";
import question from "@standards-lab/web-icons/octicon/question-16";
import x from "@standards-lab/web-icons/octicon/x-16";

const icons = { "octicon/gear-16": gear, "octicon/question-16": question, "octicon/x-16": x };

for (const marker of document.querySelectorAll("svg[data-icon]")) {
  const template = document.createElement("template");
  template.innerHTML = icons[marker.dataset.icon];
  marker.replaceWith(template.content);
}
