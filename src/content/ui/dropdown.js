let dropdownIdCounter = 0;

const ROPRIME_FOCUS_GUARD_ATTR = "data-roprime-focus-guard";
const ROPRIME_ARIA_HIDDEN_ATTR = "data-roprime-aria-hidden";
const ROPRIME_BODY_POINTER_ATTR = "data-roprime-dropdown-body-pointer";
const ROPRIME_DROPDOWN_STYLE_ID = "roprime-dropdown-styles";
const ROPRIME_STROKE_CLASS = "roprime-stroke-contrast-alpha";
const PAGE_INERT_SELECTORS = [
  "#image-retry-data",
  "#http-retry-data",
  "#navigation-container",
  "#footer-container",
  "#chat-container",
  "#user-agreements-checker-container",
  "#access-management-upsell-container",
  "#global-privacy-control-checker-container",
  "#cookie-banner-wrapper",
  "#PlaceLauncherStatusPanel",
  "#downloadInstallerIFrame",
  "#modal-confirmation",
];

const DROPDOWN_CSS = `
.light-theme, .system-theme, :root {
  --alpha-color-shadow-subtle: rgba(0,0,0,.08);
  --fui-future-alpha-color-shadow-subtle: rgba(0,0,0,.08);
  --fui-future-alpha-color-system-progress: var(--light-mode-system-contrast);
  --roprime-border-contrast: rgba(27, 37, 75, .5);
}

.dark-theme {
  --alpha-color-shadow-subtle: rgba(4,4,8,.25);
  --fui-future-alpha-color-shadow-subtle: rgba(4,4,8,.25);
  --fui-future-alpha-color-system-progress: var(--dark-mode-system-contrast);
  --roprime-border-contrast: rgba(208, 217, 251, .4);
}

@media (prefers-color-scheme: dark) {
  :is(:root, .system-theme) {
    --alpha-color-shadow-subtle: rgba(4,4,8,.25);
    --fui-future-alpha-color-shadow-subtle: rgba(4,4,8,.25);
    --fui-future-alpha-color-system-progress: var(--dark-mode-system-contrast);
    --roprime-border-contrast: rgba(208, 217, 251, .4);
  }
}

.bg-common-backdrop {
  background-color: var(--color-common-backdrop);
}

.foundation-web-portal-zindex {
  z-index: 1050;
}

.shadow-transient-low {
  box-shadow: var(--size-0) var(--size-50) var(--size-100) -.5px var(--alpha-color-shadow-subtle),
              var(--size-0) var(--size-250) var(--size-500) -.75px var(--alpha-color-shadow-subtle);
}

.shadow-transient-high {
  box-shadow: var(--size-0) var(--size-50) var(--size-100) -.5px var(--alpha-color-shadow-subtle),
              var(--size-0) var(--size-250) var(--size-500) -.75px var(--alpha-color-shadow-subtle),
              var(--size-0) var(--size-400) var(--size-800) -1px var(--alpha-color-shadow-subtle),
              var(--size-0) var(--size-1200) var(--size-1400) -1.5px var(--alpha-color-shadow-subtle);
}

.fui-future-shadow-affixed-low {
  box-shadow: 0 0 var(--size-100) 0 var(--fui-future-alpha-color-shadow-subtle),
              0 0 var(--size-500) 0 var(--fui-future-alpha-color-shadow-subtle);
}

.stroke-contrast-alpha,
.roprime-stroke-contrast-alpha {
  border-color: var(--roprime-border-contrast);
}

.foundation-web-input.stroke-contrast-alpha:not([data-state="open"]):not(:active):focus,
.foundation-web-input.stroke-contrast-alpha:not([data-state="open"]):not(:active):focus-within,
.foundation-web-input.stroke-emphasis:not([data-state="open"]):not(:active):focus,
.foundation-web-input.stroke-emphasis:not([data-state="open"]):not(:active):focus-within,
.foundation-web-input.roprime-stroke-contrast-alpha:not([data-state="open"]):not(:active):focus,
.foundation-web-input.roprime-stroke-contrast-alpha:not([data-state="open"]):not(:active):focus-within {
  border-color: var(--color-system-emphasis);
  box-shadow: inset 0 0 0 1px var(--color-system-emphasis);
}

.foundation-web-input.stroke-system-alert:focus,
.foundation-web-input.stroke-system-alert:focus-within {
  box-shadow: inset 0 0 0 1px var(--color-system-alert);
}

.foundation-web-input.roprime-stroke-contrast-alpha[data-state="open"] {
  border-color: var(--roprime-border-contrast) !important;
  box-shadow: none !important;
  outline: none !important;
}

.foundation-web-input.roprime-stroke-contrast-alpha[data-state="open"] [data-testid="foundation-web-state-layer"] {
  background-color: transparent !important;
}

.roprime-dropdown-popper {
  will-change: transform;
}

.roprime-dropdown-popper [data-radix-select-viewport] {
  overflow: hidden auto;
  overscroll-behavior: contain;
}
`.trim();

function ensureDropdownStyles() {
  if (document.getElementById(ROPRIME_DROPDOWN_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = ROPRIME_DROPDOWN_STYLE_ID;
  style.type = "text/css";
  style.textContent = DROPDOWN_CSS;
  const host = document.head || document.documentElement;
  host.appendChild(style);
}

function createElement(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function createFocusGuard() {
  const guard = document.createElement("span");
  guard.setAttribute("data-radix-focus-guard", "");
  guard.setAttribute(ROPRIME_FOCUS_GUARD_ATTR, "1");
  guard.setAttribute("tabindex", "0");
  guard.setAttribute("data-aria-hidden", "true");
  guard.setAttribute("aria-hidden", "true");
  guard.style.outline = "none";
  guard.style.opacity = "0";
  guard.style.position = "fixed";
  guard.style.pointerEvents = "none";
  return guard;
}

function blurActiveElementOutside(root, popper) {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return;
  if (root.contains(active) || popper.contains(active)) return;
  active.blur();
}

function applyPageInertState() {
  const body = document.body;
  if (body instanceof HTMLElement) {
    if (!body.hasAttribute(ROPRIME_BODY_POINTER_ATTR)) {
      body.setAttribute(
        ROPRIME_BODY_POINTER_ATTR,
        body.style.pointerEvents || "",
      );
    }
    body.style.pointerEvents = "none";
  }

  for (const selector of PAGE_INERT_SELECTORS) {
    const node = document.querySelector(selector);
    if (!(node instanceof HTMLElement)) continue;
    if (!node.hasAttribute(ROPRIME_ARIA_HIDDEN_ATTR)) {
      node.setAttribute(
        ROPRIME_ARIA_HIDDEN_ATTR,
        [
          node.hasAttribute("aria-hidden") ? "1" : "0",
          node.getAttribute("aria-hidden") ?? "",
          node.hasAttribute("data-aria-hidden") ? "1" : "0",
          node.getAttribute("data-aria-hidden") ?? "",
        ].join("\n"),
      );
    }
    node.setAttribute("aria-hidden", "true");
    node.setAttribute("data-aria-hidden", "true");
  }
}

function clearPageInertState() {
  const openDropdowns = document.querySelectorAll(
    '[data-roprime-dropdown-open="1"]',
  );
  if (openDropdowns.length > 0) return;

  const body = document.body;
  if (
    body instanceof HTMLElement &&
    body.hasAttribute(ROPRIME_BODY_POINTER_ATTR)
  ) {
    body.style.pointerEvents =
      body.getAttribute(ROPRIME_BODY_POINTER_ATTR) || "";
    body.removeAttribute(ROPRIME_BODY_POINTER_ATTR);
    if (!body.style.pointerEvents) body.style.removeProperty("pointer-events");
  }

  for (const node of document.querySelectorAll(
    `[${ROPRIME_ARIA_HIDDEN_ATTR}]`,
  )) {
    if (!(node instanceof HTMLElement)) continue;
    const raw = node.getAttribute(ROPRIME_ARIA_HIDDEN_ATTR) || "";
    const [hadAria, ariaValue, hadDataAria, dataAriaValue] = raw.split("\n");
    node.removeAttribute(ROPRIME_ARIA_HIDDEN_ATTR);
    if (hadAria === "1") {
      if (ariaValue === "") node.removeAttribute("aria-hidden");
      else node.setAttribute("aria-hidden", ariaValue);
    } else {
      node.removeAttribute("aria-hidden");
    }
    if (hadDataAria === "1") {
      if (dataAriaValue === "") node.removeAttribute("data-aria-hidden");
      else node.setAttribute("data-aria-hidden", dataAriaValue);
    } else {
      node.removeAttribute("data-aria-hidden");
    }
  }
}

function ensureFocusGuards(root, popper) {
  const mounts = [];
  if (document.body) mounts.push(document.body);
  for (const mount of mounts) {
    if (!mount.querySelector(`[${ROPRIME_FOCUS_GUARD_ATTR}="start"]`)) {
      const start = createFocusGuard();
      start.setAttribute(ROPRIME_FOCUS_GUARD_ATTR, "start");
      mount.insertBefore(start, mount.firstChild);
    }
    if (!mount.querySelector(`[${ROPRIME_FOCUS_GUARD_ATTR}="end"]`)) {
      const end = createFocusGuard();
      end.setAttribute(ROPRIME_FOCUS_GUARD_ATTR, "end");
      mount.appendChild(end);
    }
  }

  root.style.pointerEvents = "auto";
  popper.style.pointerEvents = "auto";
}

function removeFocusGuardsIfIdle() {
  const openDropdowns = document.querySelectorAll(
    '[data-roprime-dropdown-open="1"]',
  );
  if (openDropdowns.length > 0) return;
  for (const guard of document.querySelectorAll(
    `[${ROPRIME_FOCUS_GUARD_ATTR}]`,
  )) {
    guard.remove();
  }
}

function normalizeOptions(options) {
  if (!Array.isArray(options)) return [];
  return options
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const value = String(entry.value ?? "");
      const label = String(entry.label ?? value);
      return {
        value,
        label,
        hidden: Boolean(entry.hidden),
      };
    })
    .filter((entry) => entry && entry.value);
}

function findOptionLabel(options, value) {
  const match = options.find((entry) => entry.value === value);
  return match?.label || options[0]?.label || "";
}

function getViewportMetrics() {
  const vv = globalThis.visualViewport;
  if (vv) {
    return {
      width: vv.width,
      height: vv.height,
      offsetLeft: vv.offsetLeft || 0,
      offsetTop: vv.offsetTop || 0,
      scale: vv.scale || 1,
    };
  }
  return {
    width: globalThis.innerWidth,
    height: globalThis.innerHeight,
    offsetLeft: 0,
    offsetTop: 0,
    scale: 1,
  };
}

function getParentClampRect(trigger, root) {
  const parent =
    (root instanceof HTMLElement && root.parentElement) ||
    (trigger instanceof HTMLElement && trigger.offsetParent) ||
    null;
  if (parent instanceof HTMLElement) {
    return parent.getBoundingClientRect();
  }
  const viewport = getViewportMetrics();
  return {
    left: viewport.offsetLeft,
    right: viewport.offsetLeft + viewport.width,
    top: viewport.offsetTop,
    bottom: viewport.offsetTop + viewport.height,
    width: viewport.width,
    height: viewport.height,
  };
}

let scrollLockCount = 0;
let lockedScrollY = 0;

function lockPageScroll() {
  scrollLockCount += 1;
  if (scrollLockCount > 1) return;
  lockedScrollY = globalThis.scrollY || document.documentElement.scrollTop || 0;
  const html = document.documentElement;
  const body = document.body;
  if (!(body instanceof HTMLElement)) return;
  const scrollbarGap = Math.max(
    0,
    globalThis.innerWidth - html.clientWidth,
  );
  // Overflow-only lock — avoid position:fixed (that jumps the footer).
  html.style.overflow = "hidden";
  body.style.overflow = "hidden";
  if (scrollbarGap > 0) {
    body.style.paddingRight = `${scrollbarGap}px`;
  }
}

function unlockPageScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount > 0) return;
  const html = document.documentElement;
  const body = document.body;
  if (!(body instanceof HTMLElement)) return;
  html.style.removeProperty("overflow");
  body.style.removeProperty("overflow");
  body.style.removeProperty("padding-right");
  globalThis.scrollTo(0, lockedScrollY);
}

function positionPopper(popper, trigger, { popperZIndex = "1050", clampRoot = null } = {}) {
  if (!(popper instanceof HTMLElement) || !(trigger instanceof HTMLElement)) {
    return;
  }

  const viewport = getViewportMetrics();
  const rect = trigger.getBoundingClientRect();
  const parentRect = getParentClampRect(trigger, clampRoot);
  const width = Math.min(
    Math.max(rect.width, 180),
    Math.max(120, parentRect.width || rect.width),
  );

  const minLeft = parentRect.left;
  const maxLeft = Math.max(minLeft, parentRect.right - width);
  const left = Math.max(minLeft, Math.min(rect.left, maxLeft));

  const gap = 4;
  const edgePad = 8;
  const spaceBelow = Math.max(
    0,
    Math.min(viewport.offsetTop + viewport.height, parentRect.bottom) -
      rect.bottom -
      gap -
      edgePad,
  );
  const spaceAbove = Math.max(
    0,
    rect.top - Math.max(viewport.offsetTop, parentRect.top) - gap - edgePad,
  );

  const listbox = popper.querySelector('[role="listbox"]');
  const menuViewport = popper.querySelector("[data-radix-select-viewport]");

  popper.style.position = "fixed";
  popper.style.left = "0px";
  popper.style.top = "0px";
  popper.style.minWidth = "max-content";
  popper.style.width = `${width}px`;
  popper.style.zIndex = String(popperZIndex);
  popper.style.maxHeight = "";
  popper.style.setProperty("--radix-popper-anchor-width", `${width}px`);
  popper.style.setProperty("--radix-popper-anchor-height", `${rect.height}px`);
  popper.style.setProperty(
    "--radix-popper-available-width",
    `${Math.max(0, parentRect.width)}px`,
  );

  const openBelow = spaceBelow >= spaceAbove;
  const available = Math.max(80, openBelow ? spaceBelow : spaceAbove);
  popper.style.setProperty(
    "--radix-popper-available-height",
    `${available}px`,
  );
  popper.style.setProperty(
    "--radix-select-content-available-height",
    `${available}px`,
  );

  if (listbox instanceof HTMLElement) {
    listbox.style.maxHeight = `${available}px`;
    listbox.setAttribute("data-side", openBelow ? "bottom" : "top");
    listbox.setAttribute("data-align", "start");
  }
  if (menuViewport instanceof HTMLElement) {
    menuViewport.style.maxHeight = `${available}px`;
    menuViewport.style.overflow = "hidden auto";
  }

  const wasHidden = popper.hidden;
  popper.hidden = false;
  popper.style.visibility = "hidden";
  popper.style.pointerEvents = "none";
  const popperHeight = popper.offsetHeight || 0;
  popper.style.visibility = "";
  popper.style.pointerEvents = "";
  if (wasHidden) popper.hidden = true;

  const top = openBelow
    ? rect.bottom + gap
    : Math.max(
        Math.max(viewport.offsetTop, parentRect.top) + edgePad,
        rect.top - popperHeight - gap,
      );

  popper.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
}

function createMenuItemButton(label) {
  const radixId = `radix-roprime-dropdown-${dropdownIdCounter++}`;
  const button = createElement(
    "button",
    "relative clip group/interactable focus-visible:outline-focus disabled:outline-none foundation-web-menu-item flex items-center content-default text-truncate-split focus-visible:hover:outline-none cursor-pointer stroke-none bg-none text-align-x-left width-full text-body-medium padding-x-medium padding-y-small gap-x-medium radius-medium",
  );
  button.type = "button";
  button.setAttribute("aria-labelledby", radixId);
  button.setAttribute("aria-selected", "false");
  button.setAttribute("data-state", "unchecked");
  button.setAttribute("tabindex", "-1");
  button.setAttribute("data-radix-collection-item", "");
  button.style.outlineOffset = "0px";

  const stateLayer = createElement(
    "div",
    "absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none",
  );
  stateLayer.setAttribute("aria-hidden", "true");
  stateLayer.setAttribute("data-testid", "foundation-web-state-layer");

  const labelWrap = createElement(
    "div",
    "grow-1 text-truncate-split flex flex-col gap-y-xsmall",
  );
  const title = createElement(
    "span",
    "foundation-web-menu-item-title text-no-wrap text-truncate-split content-emphasis",
  );
  title.id = radixId;
  title.textContent = label;
  labelWrap.appendChild(title);
  button.append(stateLayer, labelWrap);
  return button;
}

function buildPopperMarkup() {
  const wrapper = createElement("div");
  wrapper.setAttribute("data-radix-popper-content-wrapper", "");
  wrapper.setAttribute("data-roprime-dropdown-popper", "1");
  wrapper.setAttribute("dir", "ltr");
  wrapper.className = "roprime-dropdown-popper";
  wrapper.hidden = true;

  const listbox = createElement(
    "div",
    "padding-y-small foundation-web-portal-zindex",
  );
  listbox.setAttribute("data-side", "bottom");
  listbox.setAttribute("data-align", "start");
  listbox.setAttribute("role", "listbox");
  listbox.setAttribute("data-state", "closed");
  listbox.setAttribute("dir", "ltr");
  listbox.setAttribute("tabindex", "-1");
  listbox.style.boxSizing = "border-box";
  listbox.style.display = "flex";
  listbox.style.flexDirection = "column";
  listbox.style.outline = "none";
  listbox.style.pointerEvents = "auto";

  const viewport = createElement(
    "div",
    "foundation-web-menu bg-surface-100 stroke-standard stroke-default shadow-transient-high radius-large",
  );
  viewport.setAttribute("data-radix-select-viewport", "");
  viewport.setAttribute("role", "presentation");
  viewport.style.position = "relative";
  viewport.style.flex = "1 1 0%";
  viewport.style.overflow = "hidden auto";
  viewport.style.width = "var(--radix-popper-anchor-width)";

  const group = createElement("div");
  group.setAttribute("role", "group");
  group.className = "padding-small";

  viewport.appendChild(group);
  listbox.appendChild(viewport);
  wrapper.appendChild(listbox);

  return { wrapper, listbox, group };
}

function createTriggerButton(initialLabel) {
  const button = createElement(
    "button",
    `relative clip group/interactable outline-none foundation-web-input flex items-center justify-between width-full cursor-pointer bg-none stroke-standard radius-medium height-1000 padding-x-medium text-body-medium ${ROPRIME_STROKE_CLASS} content-default`,
  );
  button.type = "button";
  button.setAttribute("role", "combobox");
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-autocomplete", "none");
  button.setAttribute("dir", "ltr");
  button.setAttribute("data-state", "closed");

  const stateLayer = createElement(
    "div",
    "absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none",
  );
  stateLayer.setAttribute("aria-hidden", "true");
  stateLayer.setAttribute("data-testid", "foundation-web-state-layer");

  const labelWrap = createElement(
    "div",
    "grow-1 text-truncate-split text-align-x-left",
  );
  const labelInner = createElement("span");
  labelInner.style.pointerEvents = "none";
  const label = createElement(
    "span",
    "foundation-web-menu-item-title text-no-wrap text-truncate-split content-emphasis",
  );
  label.textContent = initialLabel;
  labelInner.appendChild(label);
  labelWrap.appendChild(labelInner);

  const chevron = createElement(
    "span",
    "size-500 icon icon-regular-chevron-large-down content-default",
  );
  chevron.setAttribute("aria-hidden", "true");
  chevron.textContent = "▼";

  button.append(stateLayer, labelWrap, chevron);
  return { button, label };
}

function isRobloxManagedSelectPortal(wrapper) {
  if (!(wrapper instanceof HTMLElement)) return false;
  if (wrapper.getAttribute("data-roprime-dropdown-popper") === "1")
    return false;
  if (
    wrapper.querySelector(
      "#react-user-account-base, #user-account, #roprime-settings-host",
    )
  ) {
    return false;
  }
  const menu = wrapper.querySelector(".foundation-web-menu");
  const listbox = wrapper.querySelector('[role="listbox"]');
  return menu instanceof HTMLElement && listbox instanceof HTMLElement;
}

function dispatchEscapeKey(target) {
  const node =
    target instanceof Element || target instanceof Document ? target : document;
  node.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      code: "Escape",
      keyCode: 27,
      which: 27,
      bubbles: true,
      cancelable: true,
    }),
  );
}

function dispatchOutsidePointerDown() {
  const target = document.body || document.documentElement;
  if (!(target instanceof Element)) return;
  target.dispatchEvent(
    new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: "mouse",
      clientX: 0,
      clientY: 0,
    }),
  );
}

export function dismissFoundationWebDropdown(origin) {
  const openListboxes = [];

  if (origin instanceof Element) {
    const wrapper = origin.closest("[data-radix-popper-content-wrapper]");
    if (isRobloxManagedSelectPortal(wrapper)) {
      const listbox = wrapper.querySelector('[role="listbox"]');
      if (listbox instanceof HTMLElement) openListboxes.push(listbox);
    }
  }

  for (const wrapper of document.querySelectorAll(
    "[data-radix-popper-content-wrapper]",
  )) {
    if (!isRobloxManagedSelectPortal(wrapper)) continue;
    const listbox = wrapper.querySelector(
      '[role="listbox"][data-state="open"]',
    );
    if (listbox instanceof HTMLElement && !openListboxes.includes(listbox)) {
      openListboxes.push(listbox);
    }
  }

  if (!openListboxes.length && !(origin instanceof Element)) return;

  for (const listbox of openListboxes) {
    dispatchEscapeKey(listbox);
  }
  dispatchEscapeKey(document);
  dispatchOutsidePointerDown();
}

export function createDropdown({
  value = "",
  options = [],
  onChange,
  wrapperClass = "roprime-dropdown-textbox",
  includeFormGroup = true,
  popperParent = null,
  popperZIndex = "1050",
  ignoreOutsidePointerDown = null,
} = {}) {
  ensureDropdownStyles();

  const state = {
    value: String(value || ""),
    options: normalizeOptions(options),
    open: false,
    highlightIndex: -1,
  };

  const root = createElement(
    "div",
    includeFormGroup ? `roprime-dropdown ${wrapperClass}` : wrapperClass,
  );
  const triggerWrap = createElement(
    "div",
    includeFormGroup
      ? "flex flex-col gap-small form-group"
      : "flex flex-col gap-small",
  );
  const { button: trigger, label: triggerLabel } = createTriggerButton(
    findOptionLabel(state.options, state.value),
  );
  triggerWrap.appendChild(trigger);
  root.appendChild(triggerWrap);

  const { wrapper: popper, listbox, group } = buildPopperMarkup();
  const popperMount =
    popperParent instanceof HTMLElement ? popperParent : document.body;
  popperMount.appendChild(popper);

  const optionButtons = [];

  const getVisibleOptions = () =>
    state.options.filter((entry) => !entry.hidden);

  const getVisibleButtons = () =>
    optionButtons.filter((button, index) => !state.options[index]?.hidden);

  const setTriggerOpen = (open) => {
    state.open = open;
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    trigger.setAttribute("data-state", open ? "open" : "closed");
    listbox.setAttribute("data-state", open ? "open" : "closed");
    popper.hidden = !open;
    if (open) {
      root.setAttribute("data-roprime-dropdown-open", "1");
      trigger.classList.add(ROPRIME_STROKE_CLASS);
      // Open: themed stroke via CSS [data-state=open]; keep focus off blue.
      trigger.blur();
      blurActiveElementOutside(root, popper);
      ensureFocusGuards(root, popper);
      applyPageInertState();
      lockPageScroll();
      const position = () =>
        positionPopper(popper, trigger, { popperZIndex, clampRoot: root });
      position();
      requestAnimationFrame(position);
      const visible = getVisibleOptions();
      const selectedIndex = visible.findIndex(
        (entry) => entry.value === state.value,
      );
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0, false);
    } else {
      root.removeAttribute("data-roprime-dropdown-open");
      clearHighlight();
      clearPageInertState();
      removeFocusGuardsIfIdle();
      unlockPageScroll();
      trigger.classList.add(ROPRIME_STROKE_CLASS);
      // Re-focus after the closing pointer event finishes so blue :focus sticks.
      const refocus = () => trigger.focus({ preventScroll: true });
      refocus();
      requestAnimationFrame(refocus);
      globalThis.setTimeout(refocus, 0);
    }
  };

  const clearHighlight = () => {
    state.highlightIndex = -1;
    for (const button of optionButtons) {
      button.removeAttribute("data-highlighted");
      button.setAttribute("aria-selected", "false");
    }
  };

  const setHighlightedIndex = (index, focusOption = true) => {
    const visibleButtons = getVisibleButtons();
    if (!visibleButtons.length) {
      clearHighlight();
      return;
    }

    if (index < 0 || index >= visibleButtons.length) {
      return;
    }

    state.highlightIndex = index;

    const visibleOptions = getVisibleOptions();
    visibleButtons.forEach((button, buttonIndex) => {
      const option = visibleOptions[buttonIndex];
      const highlighted = buttonIndex === index;
      if (highlighted) {
        button.setAttribute("data-highlighted", "");
      } else {
        button.removeAttribute("data-highlighted");
      }
      button.setAttribute(
        "aria-selected",
        highlighted && option?.value === state.value ? "true" : "false",
      );
    });

    if (focusOption) {
      visibleButtons[index]?.focus({ preventScroll: true });
    }
  };

  const moveHighlightedIndex = (delta) => {
    const visibleButtons = getVisibleButtons();
    if (!visibleButtons.length) return;

    if (state.highlightIndex < 0) {
      if (delta > 0) setHighlightedIndex(0);
      return;
    }

    setHighlightedIndex(state.highlightIndex + delta);
  };

  group.addEventListener("mouseleave", (event) => {
    if (event.target !== group) return;
    if (group.contains(event.relatedTarget)) return;
    clearHighlight();
  });

  const renderOptions = () => {
    group.textContent = "";
    optionButtons.length = 0;

    for (const option of state.options) {
      const button = createMenuItemButton(option.label);
      button.dataset.roprimeDropdownValue = option.value;
      button.hidden = Boolean(option.hidden);
      optionButtons.push(button);
      group.appendChild(button);

      button.addEventListener("mouseenter", () => {
        const visibleButtons = getVisibleButtons();
        const index = visibleButtons.indexOf(button);
        if (index >= 0) setHighlightedIndex(index, false);
      });

      button.addEventListener("mouseleave", (event) => {
        const related = event.relatedTarget;
        if (related instanceof Element) {
          const nextButton = related.closest("button.foundation-web-menu-item");
          if (
            nextButton instanceof HTMLButtonElement &&
            !nextButton.hidden &&
            group.contains(nextButton)
          ) {
            return;
          }
        }
        clearHighlight();
      });

      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectValue(option.value);
      });
    }

    triggerLabel.textContent = findOptionLabel(state.options, state.value);
  };

  const selectValue = (nextValue) => {
    const value = String(nextValue || "");
    if (!value || value === state.value) {
      close();
      return;
    }
    state.value = value;
    triggerLabel.textContent = findOptionLabel(state.options, state.value);
    close();
    onChange?.(value);
  };

  const open = () => {
    if (state.open) return;
    setTriggerOpen(true);
  };

  const close = () => {
    if (!state.open) return;
    setTriggerOpen(false);
  };

  const toggle = () => {
    if (state.open) close();
    else open();
  };

  const onDocumentPointerDown = (event) => {
    if (!(event.target instanceof Node)) return;
    const inside =
      root.contains(event.target) || popper.contains(event.target);
    if (state.open) {
      if (inside) return;
      if (typeof ignoreOutsidePointerDown === "function") {
        if (ignoreOutsidePointerDown(event)) return;
      }
      close();
      return;
    }
    // Closed but still focused after close: clear focus on outside click.
    if (!inside && document.activeElement === trigger) {
      trigger.blur();
    }
  };

  let positionFrame = 0;
  const schedulePosition = () => {
    if (!state.open) return;
    if (positionFrame) return;
    positionFrame = requestAnimationFrame(() => {
      positionFrame = 0;
      if (!state.open) return;
      positionPopper(popper, trigger, { popperZIndex, clampRoot: root });
    });
  };

  const onViewportMove = () => {
    schedulePosition();
  };

  const onWindowResize = () => {
    if (!state.open) return;
    close();
  };

  const onWindowBlur = () => {
    if (!state.open) return;
    close();
  };

  const onVisibilityChange = () => {
    if (!state.open) return;
    if (document.visibilityState === "hidden") close();
  };

  const onFocusIn = (event) => {
    if (!state.open) return;
    if (!(event.target instanceof Node)) return;
    if (root.contains(event.target) || popper.contains(event.target)) return;
    close();
  };

  const onZoomBlock = (event) => {
    if (!state.open) return;
    if (event.type === "wheel" && event.ctrlKey) {
      event.preventDefault();
      return;
    }
    if (event.type === "gesturestart" || event.type === "gesturechange") {
      event.preventDefault();
    }
  };

  const onTriggerKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!state.open) open();
      else moveHighlightedIndex(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!state.open) open();
      else moveHighlightedIndex(-1);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!state.open) {
        open();
        return;
      }
      const visibleOptions = getVisibleOptions();
      const option = visibleOptions[state.highlightIndex];
      if (option) selectValue(option.value);
      return;
    }
    if (event.key === "Escape") {
      if (!state.open) return;
      event.preventDefault();
      close();
    }
  };

  const onPopperKeyDown = (event) => {
    if (!state.open) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveHighlightedIndex(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlightedIndex(-1);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const visibleOptions = getVisibleOptions();
      const option = visibleOptions[state.highlightIndex];
      if (option) selectValue(option.value);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };

  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggle();
  });
  trigger.addEventListener("keydown", onTriggerKeyDown);
  popper.addEventListener("keydown", onPopperKeyDown);
  document.addEventListener("pointerdown", onDocumentPointerDown, true);
  document.addEventListener("focusin", onFocusIn, true);
  globalThis.addEventListener("resize", onWindowResize);
  globalThis.addEventListener("scroll", onViewportMove, true);
  globalThis.addEventListener("blur", onWindowBlur);
  document.addEventListener("visibilitychange", onVisibilityChange);
  document.addEventListener("wheel", onZoomBlock, {
    capture: true,
    passive: false,
  });
  document.addEventListener("gesturestart", onZoomBlock, {
    capture: true,
    passive: false,
  });
  document.addEventListener("gesturechange", onZoomBlock, {
    capture: true,
    passive: false,
  });

  const visualViewport = globalThis.visualViewport;
  if (visualViewport) {
    visualViewport.addEventListener("resize", onViewportMove);
    visualViewport.addEventListener("scroll", onViewportMove);
  }

  renderOptions();

  const api = {
    root,
    trigger,
    popper,
    open,
    close,
    toggle,
    isOpen: () => state.open,
    getValue: () => state.value,
    setValue(nextValue) {
      state.value = String(nextValue || "");
      triggerLabel.textContent = findOptionLabel(state.options, state.value);
    },
    setOptions(nextOptions) {
      state.options = normalizeOptions(nextOptions);
      renderOptions();
      triggerLabel.textContent = findOptionLabel(state.options, state.value);
    },
    destroy() {
      close();
      document.removeEventListener("pointerdown", onDocumentPointerDown, true);
      document.removeEventListener("focusin", onFocusIn, true);
      globalThis.removeEventListener("resize", onWindowResize);
      globalThis.removeEventListener("scroll", onViewportMove, true);
      globalThis.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("wheel", onZoomBlock, true);
      document.removeEventListener("gesturestart", onZoomBlock, true);
      document.removeEventListener("gesturechange", onZoomBlock, true);
      if (visualViewport) {
        visualViewport.removeEventListener("resize", onViewportMove);
        visualViewport.removeEventListener("scroll", onViewportMove);
      }
      if (positionFrame) {
        cancelAnimationFrame(positionFrame);
        positionFrame = 0;
      }
      popper.remove();
      root.remove();
    },
  };

  root.roprimeDropdown = api;
  return api;
}
