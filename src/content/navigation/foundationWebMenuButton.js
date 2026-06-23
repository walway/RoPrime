import {
	buildRoPrimeSettingsFullUrl,
	isExtensionContextAlive,
	isExtensionContextInvalidatedError,
	isOnRoPrimeSettingsPage,
	shouldRunRoPrimeOnCurrentPage,
} from "../core/core.js";

const ENTRY_ATTR = "data-roprime-foundation-menu-entry";
const ROPRIME_LABEL = "RoPrime Settings";

const ROPRIME_RADIX_ID = "radix-roprime-settings-dropdown-9";
const ACCOUNT_INFO_MENU_TITLE = "Account info";
const PARENTAL_CONTROLS_MENU_TITLE = "Parental controls";
const PARENTAL_CONTROLS_MENU_POSITION = 7;
const ROPRIME_MENU_POSITION_WITH_PARENTAL = 10;
const ROPRIME_MENU_POSITION_WITHOUT_PARENTAL = 9;

const BUTTON_HTML = `<button type="button" class="relative clip group/interactable focus-visible:outline-focus disabled:outline-none foundation-web-menu-item flex items-center content-default text-truncate-split focus-visible:hover:outline-none cursor-pointer stroke-none bg-none text-align-x-left width-full text-body-medium padding-x-medium padding-y-small gap-x-medium radius-medium" aria-labelledby="${ROPRIME_RADIX_ID}" aria-selected="false" data-state="unchecked" tabindex="-1" data-radix-collection-item="" ${ENTRY_ATTR}="1" style="outline-offset: 0px;"><div role="presentation" class="absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none"></div><div class="grow-1 text-truncate-split flex flex-col gap-y-xsmall"><span class="foundation-web-menu-item-title text-no-wrap text-truncate-split content-emphasis" id="${ROPRIME_RADIX_ID}">${ROPRIME_LABEL}</span></div></button>`;

let domObserver = null;
let clickInstalled = false;

function navigateToRoPrimeSettings(e) {
	e.preventDefault();
	e.stopPropagation();
	if (isOnRoPrimeSettingsPage()) {
		window.location.reload();
		return;
	}
	window.location.assign(buildRoPrimeSettingsFullUrl());
}

function onRoPrimeMenuClick(ev) {
	if (!shouldRunRoPrimeOnCurrentPage() || !isExtensionContextAlive()) return;
	if (!(ev.target instanceof Element)) return;
	const button = ev.target.closest(`button[${ENTRY_ATTR}="1"]`);
	if (!(button instanceof HTMLButtonElement)) return;
	navigateToRoPrimeSettings(ev);
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
	if (group.getAttribute("role") !== "group" || !group.classList.contains("padding-small")) {
		return false;
	}
	if (!(group.closest(".foundation-web-menu") instanceof HTMLElement)) return false;

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
			!child.hasAttribute(ENTRY_ATTR),
	);
}

function getMenuItemButtonAtPosition(group, oneBasedPosition) {
	return getNativeMenuItemButtons(group)[oneBasedPosition - 1] ?? null;
}

function getRoPrimeMenuPosition(group) {
	const seventhButton = getMenuItemButtonAtPosition(group, PARENTAL_CONTROLS_MENU_POSITION);
	if (!(seventhButton instanceof HTMLButtonElement)) {
		return ROPRIME_MENU_POSITION_WITHOUT_PARENTAL;
	}

	if (getFoundationMenuItemTitle(seventhButton) === PARENTAL_CONTROLS_MENU_TITLE) {
		return ROPRIME_MENU_POSITION_WITH_PARENTAL;
	}

	return ROPRIME_MENU_POSITION_WITHOUT_PARENTAL;
}

function getInsertBeforeTarget(group, menuPosition) {
	return getNativeMenuItemButtons(group)[menuPosition - 1] ?? null;
}

function ensureButtonAtMenuPosition(group, button) {
	if (
		!(group instanceof HTMLElement) ||
		!(button instanceof HTMLButtonElement) ||
		!group.contains(button)
	) {
		return;
	}

	const insertBefore = getInsertBeforeTarget(group, getRoPrimeMenuPosition(group));
	if (insertBefore) {
		if (button.nextElementSibling !== insertBefore) {
			group.insertBefore(button, insertBefore);
		}
		return;
	}

	if (group.lastElementChild !== button) {
		group.appendChild(button);
	}
}

function injectIntoGroup(group) {
	if (!(group instanceof HTMLElement)) return;

	const existing = group.querySelector(`button[${ENTRY_ATTR}="1"]`);
	if (existing instanceof HTMLButtonElement) {
		ensureButtonAtMenuPosition(group, existing);
		return;
	}

	const insertBefore = getInsertBeforeTarget(group, getRoPrimeMenuPosition(group));
	if (insertBefore) {
		insertBefore.insertAdjacentHTML("beforebegin", BUTTON_HTML);
		return;
	}

	group.insertAdjacentHTML("beforeend", BUTTON_HTML);
}

function removeInjectedButtons() {
	for (const button of document.querySelectorAll(`button[${ENTRY_ATTR}="1"]`)) {
		button.remove();
	}
}

function injectFoundationWebMenuEntries() {
	if (!shouldRunRoPrimeOnCurrentPage() || !isExtensionContextAlive()) {
		removeInjectedButtons();
		return;
	}

	for (const button of document.querySelectorAll(`button[${ENTRY_ATTR}="1"]`)) {
		const group = button.closest('[role="group"].padding-small');
		if (!isAccountInfoFoundationMenuGroup(group)) {
			button.remove();
		}
	}

	for (const group of findAccountInfoMenuGroups()) {
		injectIntoGroup(group);
	}
}

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
			document.addEventListener("click", onRoPrimeMenuClick, true);
			clickInstalled = true;
		}

		ensureDomObserver();
		injectFoundationWebMenuEntries();
	} catch (e) {
		if (isExtensionContextInvalidatedError(e)) return;
		throw e;
	}
}

export function stopRobloxFoundationWebMenuButton() {
	if (clickInstalled) {
		document.removeEventListener("click", onRoPrimeMenuClick, true);
		clickInstalled = false;
	}
	teardownDomObserver();
	removeInjectedButtons();
}
