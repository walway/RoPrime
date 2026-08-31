import { settingsT } from "../core/core.js";
import { applyPlainOrRichText } from "./richText.js";

export const FOUNDATION_WEB_BUTTON_CLASS =
  "foundation-web-button relative clip group/interactable focus-visible:outline-focus disabled:outline-none cursor-pointer flex items-center justify-center stroke-none padding-y-none select-none radius-medium text-label-medium height-1000 padding-x-medium bg-action-standard content-action-standard shrink-0";

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

export function getControlButtonLabel(btn) {
  if (!(btn instanceof HTMLElement)) return null;
  const label = btn.querySelector(".price-tag.robux-price-tag");
  return label instanceof HTMLElement ? label : null;
}

export function createControlButton(textKey, attrs = {}) {
  const { literalText, ...buttonAttrs } = attrs;
  const btn = el("button", FOUNDATION_WEB_BUTTON_CLASS);
  btn.type = "button";
  btn.style.textDecoration = "none";

  const stateLayer = el(
    "div",
    "absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none",
  );
  stateLayer.setAttribute("aria-hidden", "true");
  stateLayer.setAttribute("data-testid", "foundation-web-state-layer");

  const labelOuter = el("span", "flex items-center min-width-0 gap-small");
  const labelWrap = el(
    "span",
    "padding-y-xsmall text-truncate-end text-no-wrap",
  );
  const labelInner = el(
    "div",
    "d-flex-inline gap-1 justify-content-start align-items-center",
  );
  const label = el("span", "price-tag robux-price-tag");
  if (literalText) {
    applyPlainOrRichText(label, literalText);
  } else if (textKey) {
    label.classList.add("roprime-i18n");
    label._rpI18n = textKey;
    applyPlainOrRichText(label, settingsT(textKey));
  }
  labelInner.appendChild(label);
  labelWrap.appendChild(labelInner);
  labelOuter.appendChild(labelWrap);
  btn.append(stateLayer, labelOuter);

  for (const [key, value] of Object.entries(buttonAttrs)) {
    btn.setAttribute(key, value);
  }
  return btn;
}
