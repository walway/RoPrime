import {
	buildRoPrimeSettingsFullUrl,
	isExtensionContextAlive,
	isExtensionContextInvalidatedError,
	RP_PARAM_KEY,
	shouldRunRoPrimeOnCurrentPage,
} from "../core/core.js";

const ENTRY_ATTR = "data-roprime-foundation-menu-entry";
const ROPRIME_LABEL = "RoPrime Settings";

const ROPRIME_RADIX_ID = "radix-418";

const BUTTON_HTML = `<button type="button" class="relative clip group/interactable focus-visible:outline-focus disabled:outline-none foundation-web-menu-item flex items-center content-default text-truncate-split focus-visible:hover:outline-none cursor-pointer stroke-none bg-none text-align-x-left width-full text-body-medium padding-x-medium padding-y-small gap-x-medium radius-medium" aria-labelledby="${ROPRIME_RADIX_ID}" aria-selected="false" data-state="unchecked" tabindex="-1" data-radix-collection-item="" ${ENTRY_ATTR}="1" style="outline-offset: 0px;"><div role="presentation" class="absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none"></div><div class="grow-1 text-truncate-split flex flex-col gap-y-xsmall"><span class="foundation-web-menu-item-title text-no-wrap text-truncate-split content-emphasis" id="${ROPRIME_RADIX_ID}">${ROPRIME_LABEL}</span></div></button>`;

let domObserver = null;
let clickInstalled = false;

function navigateToRoPrimeSettings(e) {
	e.preventDefault();
	e.stopPropagation();
	if (window.location.search.includes(`${RP_PARAM_KEY}=`)) {
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

function isSettingsFoundationMenuGroup(group) {
	if (!(group instanceof HTMLElement)) return false;
	return Boolean(group.querySelector("button.foundation-web-menu-item"));
}

function findSettingsMenuGroups() {
	const groups = [];
	for (const group of document.querySelectorAll(
		'.foundation-web-menu [role="group"].padding-small',
	)) {
		if (isSettingsFoundationMenuGroup(group)) groups.push(group);
	}
	return groups;
}

function ensureButtonIsLastInGroup(group, button) {
	if (
		!(group instanceof HTMLElement) ||
		!(button instanceof HTMLButtonElement) ||
		!group.contains(button)
	) {
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
		ensureButtonIsLastInGroup(group, existing);
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

	for (const group of findSettingsMenuGroups()) {
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
