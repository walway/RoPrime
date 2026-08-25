/* Roblox provides .hidden class, so it's better to use it instead of display: none */

export const HIDDEN_CLASS = "hidden";

export function setHidden(node, hide) {
  if (!(node instanceof Element)) return;
  node.classList.toggle(HIDDEN_CLASS, !!hide);
}

export function isHidden(node) {
  return node instanceof Element && node.classList.contains(HIDDEN_CLASS);
}
