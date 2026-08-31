let filterIdCounter = 0;

function createElement(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function normalizeOptions(options) {
  if (!Array.isArray(options)) return [];
  return options
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;
      if (entry.type === "divider") {
        return { type: "divider", id: `divider-${index}` };
      }
      const id = String(entry.id ?? entry.value ?? `option-${index}`);
      const label = String(entry.label ?? id);
      const type = entry.type === "text" ? "text" : "radio";
      return {
        type,
        id,
        label,
        selected: Boolean(entry.selected),
        value: type === "text" ? String(entry.value ?? "") : "",
        placeholder: String(entry.placeholder ?? entry.label ?? ""),
      };
    })
    .filter(Boolean);
}

function buildTextFieldMarkup({ id, label, value, focused }) {
  const inputId = `roprime-filter-input-${id}`;
  const labelClasses = [
    "MuiFormLabel-root",
    "MuiInputLabel-root",
    "MuiInputLabel-formControl",
    "MuiInputLabel-animated",
    focused ? "MuiInputLabel-shrink" : "",
    "MuiInputLabel-sizeSmall",
    "MuiInputLabel-outlined",
    "MuiFormLabel-colorPrimary",
    focused ? "Mui-focused" : "",
    "MuiInputLabel-root",
    "MuiInputLabel-formControl",
    "MuiInputLabel-animated",
    focused ? "MuiInputLabel-shrink" : "",
    "MuiInputLabel-sizeSmall",
    "MuiInputLabel-outlined",
    focused ? "css-ki1uh7" : "css-17fyzyr",
  ]
    .filter(Boolean)
    .join(" ");

  const inputWrapClasses = [
    "MuiInputBase-root",
    "MuiOutlinedInput-root",
    "MuiInputBase-colorPrimary",
    "MuiInputBase-fullWidth",
    focused ? "Mui-focused" : "",
    "MuiInputBase-formControl",
    "MuiInputBase-sizeSmall",
    "css-1cw05t7",
  ]
    .filter(Boolean)
    .join(" ");

  const legendClass = focused ? "css-14lo706" : "css-yjsfm1";

  return `
    <div style="display: flex; flex-direction: row; gap: 8px;">
      <div class="MuiFormControl-root MuiFormControl-fullWidth MuiTextField-root css-feqhe6">
        <label class="${labelClasses}" data-shrink="${focused ? "true" : "false"}" for="${inputId}" id="${inputId}-label">${label}</label>
        <div class="${inputWrapClasses}">
          <input aria-invalid="false" type="text" class="MuiInputBase-input MuiOutlinedInput-input MuiInputBase-inputSizeSmall css-vojnal" value="${value}" id="${inputId}">
          <fieldset aria-hidden="true" class="MuiOutlinedInput-notchedOutline css-igs3ac">
            <legend class="${legendClass}">
              <span>${label}</span>
            </legend>
          </fieldset>
        </div>
      </div>
    </div>
  `.trim();
}

function syncTextFieldFocusState(optionButton, focused) {
  const input = optionButton.querySelector("input");
  const label = optionButton.querySelector("label");
  const inputWrap = optionButton.querySelector(".MuiInputBase-root");
  const legend = optionButton.querySelector("legend");
  if (!(input instanceof HTMLInputElement)) return;

  if (label instanceof HTMLElement) {
    label.classList.toggle(
      "MuiInputLabel-shrink",
      focused || input.value.length > 0,
    );
    label.classList.toggle("Mui-focused", focused);
    label.classList.toggle("css-ki1uh7", focused || input.value.length > 0);
    label.classList.toggle("css-17fyzyr", !(focused || input.value.length > 0));
    label.dataset.shrink = focused || input.value.length > 0 ? "true" : "false";
  }
  inputWrap?.classList.toggle("Mui-focused", focused);
  legend?.classList.toggle("css-14lo706", focused || input.value.length > 0);
  legend?.classList.toggle("css-yjsfm1", !(focused || input.value.length > 0));
}

function getCommittedState(options) {
  return options.map((option) => {
    if (option.type === "divider") return { ...option };
    if (option.type === "text") {
      return { ...option, value: String(option.value ?? "") };
    }
    return { ...option, selected: Boolean(option.selected) };
  });
}

function statesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (left.type !== right.type || left.id !== right.id) return false;
    if (left.type === "divider") continue;
    if (left.type === "text") {
      if (String(left.value ?? "") !== String(right.value ?? "")) return false;
      continue;
    }
    if (Boolean(left.selected) !== Boolean(right.selected)) return false;
  }
  return true;
}

export function createFilter({
  label = "Filter",
  options = [],
  onApply,
  onChange,
} = {}) {
  const state = {
    open: false,
    options: normalizeOptions(options),
    committed: getCommittedState(normalizeOptions(options)),
  };

  const root = createElement("div");
  root.dataset.roprimeFilter = "1";

  const trigger = createElement(
    "button",
    "filter-select btn-secondary-md btn-min-width",
  );
  trigger.type = "button";

  const displayText = createElement("span", "filter-display-text");
  displayText.textContent = label;
  const expandIcon = createElement("span", "icon-expand-arrow");
  trigger.append(displayText, expandIcon);

  root.appendChild(trigger);

  let modal = null;
  let applyButton = null;
  let optionButtons = [];

  const getRadioOptions = () =>
    state.options.filter((option) => option.type === "radio");

  const getSelectedRadioId = () => {
    const selected = getRadioOptions().find((option) => option.selected);
    return selected?.id || "";
  };

  const updateApplyButton = () => {
    if (!(applyButton instanceof HTMLButtonElement)) return;
    const dirty = !statesEqual(state.options, state.committed);
    applyButton.disabled = !dirty;
  };

  const renderOptionVisual = (optionButton, option) => {
    const isSelected = option.type === "text" ? true : Boolean(option.selected);
    optionButton.classList.toggle("selected-option", isSelected);
    optionButton.setAttribute(
      "aria-label",
      option.type === "radio"
        ? isSelected
          ? "Hide selected"
          : "Show not selected"
        : " selected",
    );

    const icon = optionButton.querySelector(
      ".icon-radio-check-circle-filled, .icon-radio-check-circle",
    );
    if (icon instanceof HTMLElement) {
      icon.className = isSelected
        ? "icon-radio-check-circle-filled"
        : "icon-radio-check-circle";
    }
  };

  const bindOptionButton = (optionButton, option) => {
    if (option.type === "radio") {
      optionButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        for (const entry of state.options) {
          if (entry.type === "radio") entry.selected = entry.id === option.id;
        }
        for (const button of optionButtons) {
          const entry = button._rpFilterOption;
          if (entry) renderOptionVisual(button, entry);
        }
        updateApplyButton();
        onChange?.(getFilterValues());
      });
      return;
    }

    const input = optionButton.querySelector("input");
    if (!(input instanceof HTMLInputElement)) return;

    input.addEventListener("focus", () => {
      syncTextFieldFocusState(optionButton, true);
    });
    input.addEventListener("blur", () => {
      syncTextFieldFocusState(optionButton, false);
    });
    input.addEventListener("input", () => {
      option.value = input.value;
      syncTextFieldFocusState(optionButton, document.activeElement === input);
      updateApplyButton();
      onChange?.(getFilterValues());
    });
    input.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  };

  const buildModal = () => {
    modal = createElement("div", "filters-modal-container");

    const header = createElement("div", "header-container");
    const title = createElement("h3");
    title.textContent = label;
    const closeWrap = createElement("div");
    const closeButton = createElement("button", "header-close-button");
    closeButton.type = "button";
    const closeIcon = createElement("span", "icon-close");
    closeButton.appendChild(closeIcon);
    closeWrap.appendChild(closeButton);
    header.append(title, closeWrap);

    const optionsContainer = createElement("div", "filter-options-container");
    optionButtons = [];

    for (const option of state.options) {
      if (option.type === "divider") {
        optionsContainer.appendChild(
          createElement("div", "filter-option-divider"),
        );
        continue;
      }

      const optionButton = createElement("button", "filter-option");
      optionButton.type = "button";
      optionButton._rpFilterOption = option;

      const content = createElement("div");
      if (option.type === "text") {
        content.innerHTML = buildTextFieldMarkup({
          id: `${filterIdCounter++}-${option.id}`,
          label: option.placeholder || option.label,
          value: option.value,
          focused: false,
        });
      } else {
        const name = createElement("span", "filter-option-name");
        name.textContent = option.label;
        content.appendChild(name);
      }

      const icon = createElement(
        "span",
        option.selected
          ? "icon-radio-check-circle-filled"
          : "icon-radio-check-circle",
      );
      optionButton.append(content, icon);
      renderOptionVisual(optionButton, option);
      bindOptionButton(optionButton, option);
      optionButtons.push(optionButton);
      optionsContainer.appendChild(optionButton);
    }

    const actions = createElement("div", "action-buttons-container");
    applyButton = createElement(
      "button",
      "apply-button btn-primary-md btn-full-width",
    );
    applyButton.type = "button";
    applyButton.disabled = true;
    applyButton.textContent = "Apply";
    actions.appendChild(applyButton);

    modal.append(header, optionsContainer, actions);

    closeButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      close();
    });

    applyButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (applyButton.disabled) return;
      state.committed = getCommittedState(state.options);
      updateApplyButton();
      onApply?.(getFilterValues());
      close();
    });
  };

  const getFilterValues = () => {
    const values = {};
    for (const option of state.options) {
      if (option.type === "divider") continue;
      if (option.type === "text") {
        values[option.id] = String(option.value ?? "");
      } else {
        values[option.id] = Boolean(option.selected);
      }
    }
    return {
      values,
      selectedId: getSelectedRadioId(),
      options: getCommittedState(state.options),
    };
  };

  const setTriggerOpen = (open) => {
    state.open = open;
    trigger.classList.toggle("btn-primary-md", open);
    trigger.classList.toggle("btn-secondary-md", !open);
    expandIcon.classList.toggle("icon-expand-arrow-selected", open);
    expandIcon.classList.toggle("icon-expand-arrow", !open);
  };

  const open = () => {
    if (state.open) return;
    buildModal();
    root.appendChild(modal);
    setTriggerOpen(true);
    updateApplyButton();
  };

  const close = () => {
    if (!state.open) return;
    state.options = getCommittedState(state.committed);
    modal?.remove();
    modal = null;
    applyButton = null;
    optionButtons = [];
    setTriggerOpen(false);
  };

  const toggle = () => {
    if (state.open) close();
    else open();
  };

  const onDocumentPointerDown = (event) => {
    if (!state.open) return;
    if (!(event.target instanceof Node)) return;
    if (root.contains(event.target)) return;
    close();
  };

  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggle();
  });
  document.addEventListener("pointerdown", onDocumentPointerDown, true);

  const api = {
    root,
    trigger,
    open,
    close,
    toggle,
    isOpen: () => state.open,
    getValues: getFilterValues,
    setLabel(nextLabel) {
      const text = String(nextLabel || "");
      displayText.textContent = text;
      if (modal) {
        const heading = modal.querySelector(".header-container h3");
        if (heading) heading.textContent = text;
      }
    },
    setOptions(nextOptions) {
      state.options = normalizeOptions(nextOptions);
      state.committed = getCommittedState(state.options);
      if (state.open) {
        modal?.remove();
        modal = null;
        applyButton = null;
        optionButtons = [];
        buildModal();
        root.appendChild(modal);
        updateApplyButton();
      }
    },
    destroy() {
      close();
      document.removeEventListener("pointerdown", onDocumentPointerDown, true);
      root.remove();
    },
  };

  root.roprimeFilter = api;
  return api;
}
