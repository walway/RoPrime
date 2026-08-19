const PILL_GRID_CLASS =
  "MuiGrid-root web-blox-css-tss-spvy06-Grid-root MuiGrid-item MuiGrid-grid-XSmall-12 web-blox-css-mui-wa23gu";
const PILL_GROUP_CLASS =
  "fw-segmented-control flex items-center width-[fit-content] relative padding-xsmall gap-xxsmall radius-medium bg-shift-200";
const PILL_INDICATOR_CLASS =
  "fw-segmented-control-indicator absolute bg-shift-300 transition-all height-800 radius-small";
const PILL_BUTTON_CLASS =
  "relative clip group/interactable focus-visible:outline-focus disabled:outline-none flex items-center justify-center transition-colors stroke-none relative bg-none fill min-width-[80px] max-width-[200px] height-800 padding-x-medium radius-small cursor-pointer";

function findPillGroup(node) {
  if (node instanceof HTMLElement && node.dataset.roprimePill === "1") {
    return node;
  }
  return node?.querySelector?.("[data-roprime-pill='1']") ?? null;
}

function createPillButton(option, selected) {
  const button = document.createElement("button");
  button.type = "button";
  button.role = "radio";
  button.className = PILL_BUTTON_CLASS;
  button.dataset.roprimePillValue = String(option.value);
  button.setAttribute("aria-checked", selected ? "true" : "false");

  const hover = document.createElement("div");
  hover.role = "presentation";
  hover.className =
    "absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none";

  const labelWrap = document.createElement("div");
  labelWrap.className = `flex items-center justify-center relative width-full ${selected ? "content-emphasis" : "content-default"} text-label-medium`;
  labelWrap.style.overflow = "hidden";
  labelWrap.style.textOverflow = "ellipsis";
  labelWrap.style.whiteSpace = "nowrap";

  const labelSpan = document.createElement("span");
  labelSpan.className = "padding-y-xsmall text-truncate-end text-no-wrap";
  labelSpan.textContent = option.label;

  labelWrap.appendChild(labelSpan);
  button.append(hover, labelWrap);
  return button;
}

function updateIndicator(group) {
  const indicator = group.querySelector(".fw-segmented-control-indicator");
  const selected = group.querySelector('[role="radio"][aria-checked="true"]');
  if (!(indicator instanceof HTMLElement) || !(selected instanceof HTMLButtonElement)) {
    return;
  }

  const groupRect = group.getBoundingClientRect();
  const btnRect = selected.getBoundingClientRect();
  indicator.style.width = `${btnRect.width}px`;
  indicator.style.left = `${btnRect.left - groupRect.left}px`;
  indicator.style.height = `${btnRect.height}px`;
  indicator.style.top = `${btnRect.top - groupRect.top}px`;
}

export function createPill(options = {}) {
  const {
    ariaLabel = "Options",
    options: pillOptions = [],
    value,
    onChange,
    marginTop,
  } = options;

  const wrapper = document.createElement("div");
  wrapper.className = PILL_GRID_CLASS;
  if (marginTop != null) wrapper.style.marginTop = String(marginTop);

  const group = document.createElement("div");
  group.role = "radiogroup";
  group.tabIndex = 0;
  group.className = PILL_GROUP_CLASS;
  group.setAttribute("aria-label", ariaLabel);
  group.dataset.roprimePill = "1";

  const indicator = document.createElement("div");
  indicator.className = PILL_INDICATOR_CLASS;
  indicator.setAttribute("aria-hidden", "true");

  const initialValue = value ?? pillOptions[0]?.value;
  const buttons = pillOptions.map((option) =>
    createPillButton(option, String(option.value) === String(initialValue)),
  );

  group.append(indicator, ...buttons);
  wrapper.appendChild(group);

  group.addEventListener("click", (event) => {
    const button = event.target.closest('[role="radio"]');
    if (!(button instanceof HTMLButtonElement) || !group.contains(button)) return;
    const nextValue = button.dataset.roprimePillValue;
    if (nextValue == null) return;
    setPillValue(group, nextValue);
    onChange?.(nextValue, group, wrapper);
  });

  requestAnimationFrame(() => updateIndicator(group));

  return wrapper;
}

export function setPillValue(node, value) {
  const group = findPillGroup(node);
  if (!(group instanceof HTMLElement)) return;

  group.querySelectorAll('[role="radio"]').forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    const selected = button.dataset.roprimePillValue === String(value);
    button.setAttribute("aria-checked", selected ? "true" : "false");
    const labelWrap = button.querySelector(".text-label-medium");
    if (labelWrap instanceof HTMLElement) {
      labelWrap.classList.toggle("content-emphasis", selected);
      labelWrap.classList.toggle("content-default", !selected);
    }
  });

  updateIndicator(group);
}

export function getPillValue(node) {
  const group = findPillGroup(node);
  if (!(group instanceof HTMLElement)) return null;
  const selected = group.querySelector('[role="radio"][aria-checked="true"]');
  return selected instanceof HTMLButtonElement
    ? selected.dataset.roprimePillValue ?? null
    : null;
}

export function setPillOptions(node, options, selectedValue) {
  const group = findPillGroup(node);
  if (!(group instanceof HTMLElement) || !Array.isArray(options)) return;

  const current = selectedValue ?? getPillValue(group) ?? options[0]?.value;
  const indicator = group.querySelector(".fw-segmented-control-indicator");

  group.querySelectorAll('[role="radio"]').forEach((button) => button.remove());

  const buttons = options.map((option) =>
    createPillButton(option, String(option.value) === String(current)),
  );
  if (indicator instanceof HTMLElement) {
    group.append(indicator, ...buttons);
  } else {
    group.append(...buttons);
  }

  updateIndicator(group);
}

export function updatePillIndicator(node) {
  const group = findPillGroup(node);
  if (group instanceof HTMLElement) updateIndicator(group);
}
