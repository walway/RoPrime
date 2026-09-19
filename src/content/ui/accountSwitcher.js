import {
  settingsState,
  shouldRunRoPrimeOnCurrentPage,
} from "../core/core.js";
import { registerFeature } from "../features/registry.js";

const ADD_ACCOUNT_BUTTON_CLASS =
  "roprime-account-switcher-button foundation-web-button relative clip group/interactable focus-visible:outline-focus disabled:outline-none cursor-pointer relative flex items-center justify-center stroke-none padding-y-none select-none radius-medium text-label-medium height-1000 padding-x-medium bg-action-emphasis content-action-emphasis width-full margin-top-small";

const SELECTION_HOVER_CLASS =
  "roprime-account-switcher-hover roprime-login-switcher-hover absolute inset- transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none width-full height-full";

const NAME_FRAME_CLASS =
  "roprime-account-switcher-text-frame flex items-center min-width-0 gap-small";

const ADD_TEXT_CLASS =
  "roprime-account-switcher-text padding-y-small text-truncate-end text-no-wrap";

const SPINNER_MARKUP =
  '<svg class="roprime-custom-spinner" viewBox="0 0 20 20" fill="none" style="width: 24px; height: 24px; display: none; pointer-events: none; animation: rotation 1s linear infinite normal;"><path fill-rule="evenodd" clip-rule="evenodd" fill="#FFFFFF" d="M10 2.75C8.56609 2.75 7.16438 3.1752 5.97212 3.97185C4.77986 4.76849 3.85061 5.90078 3.30188 7.22554C2.75314 8.55031 2.60957 10.008 2.88931 11.4144C3.16905 12.8208 3.85955 14.1126 4.87348 15.1265C5.88741 16.1405 7.17924 16.831 8.5856 17.1107C9.99196 17.3904 11.4497 17.2469 12.7745 16.6981C14.0992 16.1494 15.2315 15.2201 16.0282 14.0279C16.8248 12.8356 17.25 11.4339 17.25 10C17.25 9.58579 17.5858 9.25 18 9.25C18.4142 9.25 18.75 9.58579 18.75 10C18.75 11.7306 18.2368 13.4223 17.2754 14.8612C16.3139 16.3002 14.9473 17.4217 13.3485 18.0839C11.7496 18.7462 9.9903 18.9195 8.29296 18.5819C6.59563 18.2443 5.03653 17.4109 3.81282 16.1872C2.58911 14.9635 1.75575 13.4044 1.41813 11.707C1.08051 10.0097 1.25379 8.25037 1.91606 6.65152C2.57832 5.05267 3.69983 3.6861 5.13876 2.72464C6.57769 1.76318 8.26942 1.25 10 1.25C10.4142 1.25 10.75 1.58579 10.75 2C10.75 2.41421 10.4142 2.75 10 2.75Z"></path></svg>';

let observer = null;

function isLoginPath(pathname = globalThis.location.pathname) {
  const path = String(pathname || "").toLowerCase();
  return (
    path === "/login" ||
    path === "/login/" ||
    /^\/[a-z]{2,3}(?:-[a-z0-9]{2,8})?\/login\/?$/i.test(path)
  );
}

function findAddAccountListItem(list) {
  const items = list.querySelectorAll(":scope > li");
  if (!items.length) return null;
  const last = items[items.length - 1];
  if (!(last instanceof HTMLElement)) return null;
  if (last.classList.contains("account-selection-list-item")) return last;
  const nested = last.querySelector(".account-selection-list-item");
  return nested instanceof HTMLElement ? nested : null;
}

function ensureSpinner(listItem) {
  if (listItem.querySelector(":scope > .roprime-custom-spinner")) return;
  listItem.insertAdjacentHTML("beforeend", SPINNER_MARKUP);
}

function bindAddAccountInteraction(listItem) {
  if (listItem.dataset.roprimeAccountSwitcherBound === "1") return;
  listItem.dataset.roprimeAccountSwitcherBound = "1";

  const onActivate = (event) => {
    const nameFrame = listItem.querySelector(
      ".roprime-account-switcher-text-frame",
    );
    const spinner = listItem.querySelector(":scope > .roprime-custom-spinner");
    if (nameFrame instanceof HTMLElement) nameFrame.style.display = "none";
    if (spinner instanceof HTMLElement) spinner.style.display = "inline-block";

    if (event.type === "click" && !isLoginPath()) {
      globalThis.location.href = "https://www.roblox.com/";
    }
  };

  listItem.addEventListener("mousedown", onActivate, true);
  listItem.addEventListener("click", onActivate, true);
}

function restyleAddAccountRow(listItem) {
  if (listItem.className !== ADD_ACCOUNT_BUTTON_CLASS) {
    listItem.className = ADD_ACCOUNT_BUTTON_CLASS;
  }

  const selection = listItem.querySelector(".account-selection");
  if (!(selection instanceof HTMLElement)) return;

  if (selection.className !== SELECTION_HOVER_CLASS) {
    selection.className = SELECTION_HOVER_CLASS;
  }

  const spinner = selection.querySelector(".spinner");
  if (spinner instanceof HTMLElement) {
    spinner.className = "spinner spinner-sm spinner-block!";
  }

  const nameContainer =
    selection.querySelector(".account-selection-name-container") ||
    listItem.querySelector(".account-selection-name-container");
  if (!(nameContainer instanceof HTMLElement)) return;

  if (nameContainer.className !== NAME_FRAME_CLASS) {
    nameContainer.className = NAME_FRAME_CLASS;
  }

  const addAccount = nameContainer.querySelector(
    ".account-selection-add-account",
  );
  if (addAccount instanceof HTMLElement && addAccount.className !== ADD_TEXT_CLASS) {
    addAccount.className = ADD_TEXT_CLASS;
  }

  if (nameContainer.parentElement !== listItem) {
    listItem.appendChild(nameContainer);
  }

  ensureSpinner(listItem);
  bindAddAccountInteraction(listItem);
}

function applyAccountSwitcherRedesign() {
  if (
    !shouldRunRoPrimeOnCurrentPage() ||
    !settingsState.accountSwitcherRedesignEnabled
  ) {
    return;
  }

  const list = document.querySelector(".account-switcher-list");
  if (!(list instanceof HTMLElement)) return;
  const addRow = findAddAccountListItem(list);
  if (!addRow) return;
  restyleAddAccountRow(addRow);
}

function connectObserver() {
  if (observer || !(document.documentElement instanceof HTMLElement)) return;
  observer = new MutationObserver(() => {
    applyAccountSwitcherRedesign();
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

function disconnectObserver() {
  observer?.disconnect();
  observer = null;
}

export function syncAccountSwitcherRedesign() {
  if (
    !shouldRunRoPrimeOnCurrentPage() ||
    !settingsState.accountSwitcherRedesignEnabled
  ) {
    disconnectObserver();
    return;
  }
  connectObserver();
  applyAccountSwitcherRedesign();
}

registerFeature(syncAccountSwitcherRedesign);
