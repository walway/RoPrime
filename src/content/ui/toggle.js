import { attachMuiRipple } from "./muiRipple.js";

const CLASSES = {
  MAIN_SPAN:
    "MuiSwitch-root web-blox-css-tss-1y9krbg-Switch-root MuiSwitch-sizeMedium web-blox-css-mui-ecvcn9",
  SECOND_SPAN:
    "MuiButtonBase-root MuiSwitch-switchBase web-blox-css-tss-18lnq76-Switch-switchBase MuiSwitch-colorPrimary web-blox-css-tss-vnaipe-Switch-colorPrimary PrivateSwitchBase-root web-blox-css-mui-hxl62j",
  INPUT: "PrivateSwitchBase-input MuiSwitch-input web-blox-css-mui-1m9pwf3",
  DIV: "MuiSwitch-thumb web-blox-css-tss-1qiy9nf-Switch-thumb",
  THIRD_SPAN_CLASS: "MuiTouchRipple-root web-blox-css-mui-w0pj6f",
  FOUR_SPAN_CLASS:
    "MuiSwitch-track web-blox-css-tss-14rgg7t-Switch-track web-blox-css-tss-9-Switch-track-ref web-blox-css-mui-1v9vyxv",
};

function findSwitchBase(toggle) {
  return toggle?.querySelector(".MuiSwitch-switchBase") ?? null;
}

function findToggleInput(toggle) {
  const input = toggle?.querySelector("input[type='checkbox']");
  return input instanceof HTMLInputElement ? input : null;
}

function syncToggleVisual(toggle, checked) {
  findSwitchBase(toggle)?.classList.toggle("Mui-checked", !!checked);
}

export function createToggle(options = {}) {
  const { id, checked = false, disabled = false, onChange, ariaLabel } = options;

  const root = document.createElement("span");
  root.className = CLASSES.MAIN_SPAN;
  root.dataset.roprimeToggle = "1";

  const switchBase = document.createElement("span");
  switchBase.className = CLASSES.SECOND_SPAN;
  if (checked) switchBase.classList.add("Mui-checked");

  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = CLASSES.INPUT;
  if (id) input.id = id;
  input.checked = checked;
  input.disabled = disabled;
  if (ariaLabel) input.setAttribute("aria-label", ariaLabel);

  const thumb = document.createElement("div");
  thumb.className = CLASSES.DIV;

  const ripple = document.createElement("span");
  ripple.className = CLASSES.THIRD_SPAN_CLASS;

  const track = document.createElement("span");
  track.className = CLASSES.FOUR_SPAN_CLASS;

  switchBase.append(input, thumb, ripple);
  root.append(switchBase, track);

  input.addEventListener("change", () => {
    syncToggleVisual(root, input.checked);
    onChange?.(input.checked, input, root);
  });

  attachMuiRipple(switchBase);

  return root;
}

export function setToggleChecked(toggle, checked) {
  const input = findToggleInput(toggle);
  if (!input) return;
  input.checked = !!checked;
  syncToggleVisual(toggle, input.checked);
}

export function getToggleChecked(toggle) {
  const input = findToggleInput(toggle);
  return input ? input.checked : false;
}
