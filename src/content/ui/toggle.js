const TOGGLE_WRAPPER_CLASS = "roprime-toggle-wrap";

function findToggleButton(toggle) {
  const button = toggle?.querySelector("button.btn-toggle");
  return button instanceof HTMLButtonElement ? button : null;
}

function syncToggleVisual(toggle, checked) {
  const button = findToggleButton(toggle);
  if (!button) return;

  button.classList.toggle("on", checked);
  button.setAttribute("aria-checked", checked ? "true" : "false");
}

export function createToggle(options = {}) {
  const {
    id,
    checked = false,
    disabled = false,
    ariaLabel,
  } = options;

  const wrap = document.createElement("div");
  wrap.className = TOGGLE_WRAPPER_CLASS;
  wrap.dataset.roprimeToggle = "1";

  const button = document.createElement("button");
  button.type = "button";
  button.role = "switch";
  button.className = checked ? "btn-toggle on" : "btn-toggle";
  if (id) button.id = id;
  if (disabled) button.disabled = true;
  if (ariaLabel) button.setAttribute("aria-label", ariaLabel);

  const flip = document.createElement("span");
  flip.className = "toggle-flip";
  const on = document.createElement("span");
  on.className = "toggle-on";
  const off = document.createElement("span");
  off.className = "toggle-off";
  button.append(flip, on, off);
  wrap.appendChild(button);
  syncToggleVisual(wrap, checked);

  return wrap;
}

export function setToggleChecked(toggle, checked) {
  syncToggleVisual(toggle, !!checked);
}

export function getToggleChecked(toggle) {
  const button = findToggleButton(toggle);
  return button?.getAttribute("aria-checked") === "true";
}
