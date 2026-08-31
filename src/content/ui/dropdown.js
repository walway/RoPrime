let dropdownIdCounter = 0;

function createElement(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
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

function positionPopper(popper, trigger, { popperZIndex = "1050" } = {}) {
  if (!(popper instanceof HTMLElement) || !(trigger instanceof HTMLElement)) {
    return;
  }

  const rect = trigger.getBoundingClientRect();
  const width = Math.max(rect.width, 180);
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));

  popper.style.position = "fixed";
  popper.style.left = "0px";
  popper.style.top = "0px";
  popper.style.minWidth = "max-content";
  popper.style.width = `${width}px`;
  popper.style.zIndex = String(popperZIndex);
  popper.style.setProperty("--radix-popper-anchor-width", `${width}px`);
  popper.style.setProperty("--radix-popper-anchor-height", `${rect.height}px`);

  const wasHidden = popper.hidden;
  popper.hidden = false;
  popper.style.visibility = "hidden";
  popper.style.pointerEvents = "none";
  const popperHeight = popper.offsetHeight || 0;
  popper.style.visibility = "";
  popper.style.pointerEvents = "";
  if (wasHidden) popper.hidden = true;

  const spaceBelow = window.innerHeight - rect.bottom;
  const openBelow =
    spaceBelow >= popperHeight + 8 || rect.top < popperHeight + 8;
  const top = openBelow
    ? rect.bottom + 4
    : Math.max(8, rect.top - popperHeight - 4);

  popper.style.transform = `translate(${left}px, ${top}px)`;
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
    "relative clip group/interactable outline-none foundation-web-input flex items-center justify-between width-full cursor-pointer bg-none stroke-standard radius-medium height-1000 padding-x-medium text-body-medium stroke-contrast-alpha focus-within:stroke-system-emphasis content-default",
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
      const position = () => positionPopper(popper, trigger, { popperZIndex });
      position();
      requestAnimationFrame(position);
      const visible = getVisibleOptions();
      const selectedIndex = visible.findIndex(
        (entry) => entry.value === state.value,
      );
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0, false);
    } else {
      clearHighlight();
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
    if (!state.open) return;
    if (!(event.target instanceof Node)) return;
    if (root.contains(event.target) || popper.contains(event.target)) return;
    if (typeof ignoreOutsidePointerDown === "function") {
      if (ignoreOutsidePointerDown(event)) return;
    }
    close();
  };

  const onWindowChange = () => {
    if (!state.open) return;
    positionPopper(popper, trigger, { popperZIndex });
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
      trigger.focus();
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
  window.addEventListener("resize", onWindowChange);
  window.addEventListener("scroll", onWindowChange, true);

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
      window.removeEventListener("resize", onWindowChange);
      window.removeEventListener("scroll", onWindowChange, true);
      popper.remove();
      root.remove();
    },
  };

  root.roprimeDropdown = api;
  return api;
}
