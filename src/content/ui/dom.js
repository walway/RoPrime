import DOMPurify from "dompurify";

const PURIFY_OPTIONS = {
  RETURN_DOM_FRAGMENT: true,
};

function getPurifyForNode(node) {
  const view = node?.ownerDocument?.defaultView;
  return view ? DOMPurify(view) : DOMPurify;
}

export function sanitizeMarkup(markup, parent) {
  const purify = parent ? getPurifyForNode(parent) : DOMPurify;
  return purify.sanitize(String(markup ?? ""), PURIFY_OPTIONS);
}

export function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

export function appendChildren(parent, children) {
  for (const child of children) {
    if (child == null) continue;
    if (child instanceof Node) parent.appendChild(child);
    else if (typeof child === "string") parent.appendChild(document.createTextNode(child));
  }
  return parent;
}

export function createSvgIcon(paths, { viewBox = "0 0 32 32", className = "" } = {}) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", viewBox);
  svg.setAttribute("aria-hidden", "true");
  if (className) svg.setAttribute("class", className);
  for (const d of paths) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "currentColor");
    svg.appendChild(path);
  }
  return svg;
}

export function appendParsedMarkup(parent, markup) {
  if (!(parent instanceof Node)) return parent;
  const fragment = sanitizeMarkup(markup, parent);
  if (fragment) parent.appendChild(fragment);
  return parent;
}
