import {
  buildRoPrimeSettingsFullUrl,
  getRobloxLocalePathPrefix,
  isExtensionContextAlive,
  isExtensionContextInvalidatedError,
  isMyAccountPath,
  isOnRoPrimeSettingsPage,
  RP_DEFAULT_PAGE,
  shouldRunRoPrimeOnCurrentPage,
} from "../core/core.js";
import { dismissFoundationWebDropdown } from "../ui/dropdown.js";
import { appendParsedMarkup } from "../ui/dom.js";
import { openRoPrimeSettingsOnAccountPage } from "../settings/settingsPage.js";

const ROPRIME_ENTRY_ATTR = "data-roprime-foundation-menu-entry";
const EXTENSIONS_ENTRY_ATTR = "data-roprime-foundation-extensions-entry";
const ROPRIME_LABEL = "RoPrime Settings";
const EXTENSIONS_LABEL = "Extensions";
const ROQOL_LABEL_PATTERN = /roqol/i;
const MENU_WIRED_ATTR = "data-roprime-foundation-menu-wired";
const MENU_CLOSE_WATCH_ATTR = "data-roprime-foundation-menu-close-watch";

const ROPRIME_RADIX_ID = "radix-roprime-settings-dropdown-9";
const EXTENSIONS_RADIX_ID = "radix-roprime-extensions-dropdown-9";
const ACCOUNT_INFO_MENU_TITLE = "Account info";

function buildFoundationMenuButtonHtml(label, radixId, entryAttr) {
  return `<button type="button" class="relative clip group/interactable focus-visible:outline-focus disabled:outline-none foundation-web-menu-item flex items-center content-default text-truncate-split focus-visible:hover:outline-none cursor-pointer stroke-none bg-none text-align-x-left width-full text-body-medium padding-x-medium padding-y-small gap-x-medium radius-medium" aria-labelledby="${radixId}" aria-selected="false" data-state="unchecked" tabindex="-1" data-radix-collection-item="" ${entryAttr}="1" style="outline-offset: 0px;"><div role="presentation" class="absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none"></div><div class="grow-1 text-truncate-split flex flex-col gap-y-xsmall"><span class="foundation-web-menu-item-title text-no-wrap text-truncate-split content-emphasis" id="${radixId}">${label}</span></div></button>`;
}

const ROPRIME_BUTTON_HTML = buildFoundationMenuButtonHtml(
  ROPRIME_LABEL,
  ROPRIME_RADIX_ID,
  ROPRIME_ENTRY_ATTR,
);
const EXTENSIONS_BUTTON_HTML = buildFoundationMenuButtonHtml(
  EXTENSIONS_LABEL,
  EXTENSIONS_RADIX_ID,
  EXTENSIONS_ENTRY_ATTR,
);

let domObserver = null;
let clickInstalled = false;

function isExtensionsRouteActive() {
  const hash = (window.location.hash || "").toLowerCase();
  return (
    hash === "#!/extensions" ||
    hash === "#!/plugins" ||
    sessionStorage.getItem("roprimeExtensionsPanelOpen") === "1"
  );
}

function getMenuButtons(group) {
  if (!(group instanceof HTMLElement)) return [];
  return [
    ...group.querySelectorAll("button.foundation-web-menu-item"),
  ].filter((button) => group.contains(button));
}

function setHighlightedMenuButton(group, button) {
  if (!(group instanceof HTMLElement) || !(button instanceof HTMLButtonElement)) {
    return;
  }
  for (const item of getMenuButtons(group)) {
    if (item === button) {
      item.setAttribute("data-highlighted", "");
    } else {
      item.removeAttribute("data-highlighted");
    }
    syncExtensionsEntryAriaSelected(group, item);
  }
}

function clearHighlightedMenuButtons(group) {
  if (!(group instanceof HTMLElement)) return;
  for (const item of getMenuButtons(group)) {
    item.removeAttribute("data-highlighted");
    syncExtensionsEntryAriaSelected(group, item);
  }
}

function syncExtensionsEntryAriaSelected(group, button) {
  if (!(group instanceof HTMLElement) || !(button instanceof HTMLButtonElement)) {
    return;
  }
  if (!button.hasAttribute(EXTENSIONS_ENTRY_ATTR)) return;
  const highlighted =
    button.hasAttribute("data-highlighted") || button.matches(":hover");
  button.setAttribute(
    "aria-selected",
    isExtensionsRouteActive() && highlighted ? "true" : "false",
  );
}

function syncAllExtensionsEntryAriaSelected() {
  for (const group of findAccountInfoMenuGroups()) {
    const extensionsButton = group.querySelector(
      `button[${EXTENSIONS_ENTRY_ATTR}="1"]`,
    );
    if (extensionsButton instanceof HTMLButtonElement) {
      syncExtensionsEntryAriaSelected(group, extensionsButton);
    }
  }
}

function moveMenuHighlight(group, direction) {
  const buttons = getMenuButtons(group);
  if (!buttons.length) return null;

  const currentIndex = buttons.findIndex((button) =>
    button.hasAttribute("data-highlighted"),
  );
  let nextIndex = currentIndex;

  if (direction > 0) {
    if (currentIndex < 0) {
      nextIndex = 0;
    } else if (currentIndex < buttons.length - 1) {
      nextIndex = currentIndex + 1;
    } else {
      return buttons[currentIndex];
    }
  } else if (direction < 0) {
    if (currentIndex < 0) {
      return null;
    }
    if (currentIndex > 0) {
      nextIndex = currentIndex - 1;
    } else {
      return buttons[0];
    }
  } else if (currentIndex < 0) {
    nextIndex = 0;
  }

  const nextButton = buttons[nextIndex];
  setHighlightedMenuButton(group, nextButton);
  nextButton.focus({ preventScroll: true });
  return nextButton;
}

function resetMenuHighlight(group, { blur = false } = {}) {
  clearHighlightedMenuButtons(group);
  if (!blur) return;
  const active = document.activeElement;
  if (active instanceof HTMLButtonElement && group.contains(active)) {
    active.blur();
  }
}

function isMenuButtonInGroup(group, node) {
  if (!(node instanceof Element) || !group.contains(node)) return false;
  const button = node.closest("button.foundation-web-menu-item");
  return button instanceof HTMLButtonElement && group.contains(button);
}

function wireFoundationMenuInteractions(group) {
  if (!(group instanceof HTMLElement)) return;
  if (group.getAttribute(MENU_WIRED_ATTR) === "1") return;
  group.setAttribute(MENU_WIRED_ATTR, "1");

  group.addEventListener(
    "mouseenter",
    (event) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest("button.foundation-web-menu-item");
      if (!(button instanceof HTMLButtonElement) || !group.contains(button)) {
        return;
      }
      setHighlightedMenuButton(group, button);
    },
    true,
  );

  group.addEventListener(
    "mouseleave",
    (event) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest("button.foundation-web-menu-item");
      if (!(button instanceof HTMLButtonElement) || !group.contains(button)) {
        return;
      }
      if (isMenuButtonInGroup(group, event.relatedTarget)) return;
      resetMenuHighlight(group);
    },
    true,
  );

  group.addEventListener("mouseleave", (event) => {
    if (event.target !== group) return;
    if (group.contains(event.relatedTarget)) return;
    resetMenuHighlight(group, { blur: true });
  });

  group.addEventListener("focusout", (event) => {
    if (group.contains(event.relatedTarget)) return;
    resetMenuHighlight(group);
  });

  const listbox = group.closest('[role="listbox"]');
  if (
    listbox instanceof HTMLElement &&
    listbox.getAttribute(MENU_CLOSE_WATCH_ATTR) !== "1"
  ) {
    listbox.setAttribute(MENU_CLOSE_WATCH_ATTR, "1");
    const observer = new MutationObserver(() => {
      if (listbox.getAttribute("data-state") === "closed") {
        resetMenuHighlight(group, { blur: true });
      }
    });
    observer.observe(listbox, {
      attributes: true,
      attributeFilter: ["data-state"],
    });
  }

  group.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    event.stopPropagation();
    moveMenuHighlight(group, event.key === "ArrowDown" ? 1 : -1);
  });
}

function navigateToExtensions(e) {
  e.preventDefault();
  e.stopPropagation();
  dismissFoundationWebDropdown(e.target instanceof Element ? e.target : null);
  if (isMyAccountPath()) {
    try {
      history.replaceState(
        history.state,
        "",
        `${window.location.pathname}${window.location.search}#!/extensions`,
      );
    } catch {
      /* ignore */
    }
    if (window.location.hash !== "#!/extensions") {
      window.location.hash = "#!/extensions";
    }
    window.dispatchEvent(new Event("roprime-open-extensions-panel"));
    syncAllExtensionsEntryAriaSelected();
    return;
  }
  const prefix = getRobloxLocalePathPrefix();
  window.location.assign(
    `${window.location.origin}${prefix}/my/account#!/extensions`,
  );
}

function navigateToRoPrimeSettings(e) {
  e.preventDefault();
  e.stopPropagation();
  dismissFoundationWebDropdown(e.target instanceof Element ? e.target : null);
  if (isMyAccountPath()) {
    if (isOnRoPrimeSettingsPage()) {
      window.location.reload();
      return;
    }
    openRoPrimeSettingsOnAccountPage(RP_DEFAULT_PAGE);
    return;
  }
  window.location.assign(buildRoPrimeSettingsFullUrl());
}

function onFoundationMenuClick(ev) {
  if (!shouldRunRoPrimeOnCurrentPage() || !isExtensionContextAlive()) return;
  if (!(ev.target instanceof Element)) return;

  const extensionsButton = ev.target.closest(
    `button[${EXTENSIONS_ENTRY_ATTR}="1"]`,
  );
  if (extensionsButton instanceof HTMLButtonElement) {
    navigateToExtensions(ev);
    return;
  }

  const settingsButton = ev.target.closest(`button[${ROPRIME_ENTRY_ATTR}="1"]`);
  if (settingsButton instanceof HTMLButtonElement) {
    navigateToRoPrimeSettings(ev);
  }
}

function getFoundationMenuItemTitle(button) {
  if (!(button instanceof HTMLButtonElement)) return "";
  const titleSpan = button.querySelector(
    "div.grow-1 span.foundation-web-menu-item-title",
  );
  return titleSpan?.textContent?.trim() ?? "";
}

function getFirstFoundationMenuItemButton(group) {
  if (!(group instanceof HTMLElement)) return null;
  for (const child of group.children) {
    if (
      child instanceof HTMLButtonElement &&
      child.classList.contains("foundation-web-menu-item")
    ) {
      return child;
    }
  }
  return null;
}

function isAccountInfoFoundationMenuGroup(group) {
  if (!(group instanceof HTMLElement)) return false;
  if (
    group.getAttribute("role") !== "group" ||
    !group.classList.contains("padding-small")
  ) {
    return false;
  }
  if (!(group.closest(".foundation-web-menu") instanceof HTMLElement))
    return false;

  const firstButton = getFirstFoundationMenuItemButton(group);
  if (!(firstButton instanceof HTMLButtonElement)) return false;

  return getFoundationMenuItemTitle(firstButton) === ACCOUNT_INFO_MENU_TITLE;
}

function findAccountInfoMenuGroups() {
  const groups = [];
  for (const group of document.querySelectorAll(
    '.foundation-web-menu [role="group"].padding-small',
  )) {
    if (isAccountInfoFoundationMenuGroup(group)) groups.push(group);
  }
  return groups;
}

function getNativeMenuItemButtons(group) {
  if (!(group instanceof HTMLElement)) return [];
  return [...group.children].filter(
    (child) =>
      child instanceof HTMLButtonElement &&
      child.classList.contains("foundation-web-menu-item") &&
      !child.hasAttribute(ROPRIME_ENTRY_ATTR) &&
      !child.hasAttribute(EXTENSIONS_ENTRY_ATTR),
  );
}

function ensureInjectedButton(group, entryAttr, buttonHtml) {
  if (!(group instanceof HTMLElement)) return null;

  let button = group.querySelector(`button[${entryAttr}="1"]`);
  if (!(button instanceof HTMLButtonElement)) {
    appendParsedMarkup(group, buttonHtml);
    button = group.querySelector(`button[${entryAttr}="1"]`);
  }
  return button instanceof HTMLButtonElement ? button : null;
}

function findRoQolMenuButton(group) {
  if (!(group instanceof HTMLElement)) return null;
  for (const button of getNativeMenuItemButtons(group)) {
    const title = getFoundationMenuItemTitle(button);
    if (ROQOL_LABEL_PATTERN.test(title)) return button;
  }
  return null;
}

function ensureButtonOrder(group) {
  if (!(group instanceof HTMLElement)) return;

  const settingsButton = ensureInjectedButton(
    group,
    ROPRIME_ENTRY_ATTR,
    ROPRIME_BUTTON_HTML,
  );
  const extensionsButton = ensureInjectedButton(
    group,
    EXTENSIONS_ENTRY_ATTR,
    EXTENSIONS_BUTTON_HTML,
  );
  if (
    !(settingsButton instanceof HTMLButtonElement) ||
    !(extensionsButton instanceof HTMLButtonElement)
  ) {
    return;
  }

  if (group.lastElementChild !== settingsButton) {
    group.appendChild(settingsButton);
  }

  const roqolButton = findRoQolMenuButton(group);
  const insertBefore =
    roqolButton instanceof HTMLButtonElement
      ? roqolButton
      : settingsButton;

  if (extensionsButton.nextElementSibling !== insertBefore) {
    group.insertBefore(extensionsButton, insertBefore);
  }

  wireFoundationMenuInteractions(group);
  syncExtensionsEntryAriaSelected(group, extensionsButton);
}

function removeInjectedButtons() {
  for (const button of document.querySelectorAll(
    `button[${ROPRIME_ENTRY_ATTR}="1"], button[${EXTENSIONS_ENTRY_ATTR}="1"]`,
  )) {
    button.remove();
  }
}

function injectFoundationWebMenuEntries() {
  if (!shouldRunRoPrimeOnCurrentPage() || !isExtensionContextAlive()) {
    removeInjectedButtons();
    return;
  }

  for (const button of document.querySelectorAll(
    `button[${ROPRIME_ENTRY_ATTR}="1"], button[${EXTENSIONS_ENTRY_ATTR}="1"]`,
  )) {
    const group = button.closest('[role="group"].padding-small');
    if (!isAccountInfoFoundationMenuGroup(group)) {
      button.remove();
    }
  }

  for (const group of findAccountInfoMenuGroups()) {
    ensureButtonOrder(group);
  }
}

function ensureRouteSyncListeners() {
  if (ensureRouteSyncListeners.bound) return;
  ensureRouteSyncListeners.bound = true;
  const sync = () => syncAllExtensionsEntryAriaSelected();
  window.addEventListener("hashchange", sync);
  window.addEventListener("popstate", sync);
  window.addEventListener("roprime-location-change", sync);
  window.addEventListener("roprime-open-extensions-panel", sync);
}
ensureRouteSyncListeners.bound = false;

function ensureDomObserver() {
  if (domObserver || !isExtensionContextAlive()) return;
  try {
    domObserver = new MutationObserver(() => {
      try {
        injectFoundationWebMenuEntries();
      } catch (e) {
        if (!isExtensionContextInvalidatedError(e)) throw e;
      }
    });
    domObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  } catch {
    domObserver = null;
  }
}

function teardownDomObserver() {
  if (domObserver) {
    try {
      domObserver.disconnect();
    } catch {
      /* ignore */
    }
    domObserver = null;
  }
}

export function syncRobloxFoundationWebMenuButton() {
  try {
    if (!isExtensionContextAlive()) return;

    if (!shouldRunRoPrimeOnCurrentPage()) {
      stopRobloxFoundationWebMenuButton();
      return;
    }

    if (!clickInstalled) {
      document.addEventListener("click", onFoundationMenuClick, true);
      clickInstalled = true;
    }

    ensureRouteSyncListeners();
    ensureDomObserver();
    injectFoundationWebMenuEntries();
    syncAllExtensionsEntryAriaSelected();
  } catch (e) {
    if (isExtensionContextInvalidatedError(e)) return;
    throw e;
  }
}

export function stopRobloxFoundationWebMenuButton() {
  if (clickInstalled) {
    document.removeEventListener("click", onFoundationMenuClick, true);
    clickInstalled = false;
  }
  teardownDomObserver();
  removeInjectedButtons();
}
