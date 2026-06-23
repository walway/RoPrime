import {
	RP_SETTINGS_FLAT_INNER_ID,
	RP_SETTINGS_INNER_ID,
	setAccountSettingsShellClass,
	syncAccountSettingsLayoutInset,
} from "../core/core.js";
import {
	updateAccountHeader,
	updateDocumentTitle,
} from "../panel/pageChrome.js";
import { resolveSettingsMountHost } from "./settingsPageHost.js";

function buildFlatMarkup() {
	return `<div class="roprime-settings-flat" id="${RP_SETTINGS_FLAT_INNER_ID}"></div>`;
}

function removeRailSettingsMarkup() {
	document.getElementById(RP_SETTINGS_INNER_ID)?.remove();
}

export function removeFlatSettingsMarkup() {
	document.getElementById(RP_SETTINGS_FLAT_INNER_ID)?.remove();
}

export function mountFlatSettingsPage(mountHost) {
	removeRailSettingsMarkup();

	let root = document.getElementById(RP_SETTINGS_FLAT_INNER_ID);
	if (!(root instanceof HTMLElement)) {
		mountHost.insertAdjacentHTML("beforeend", buildFlatMarkup());
		root = document.getElementById(RP_SETTINGS_FLAT_INNER_ID);
	} else if (root.parentElement !== mountHost) {
		mountHost.appendChild(root);
	}
}

export function syncFlatSettingsRoute({
	setNativeAccountChromeHidden,
}) {
	const mountHost = resolveSettingsMountHost();
	if (!(mountHost instanceof HTMLElement)) return;

	setAccountSettingsShellClass(true);
	syncAccountSettingsLayoutInset();
	setNativeAccountChromeHidden(true);
	updateDocumentTitle(true);
	updateAccountHeader(true);
	mountFlatSettingsPage(mountHost);
}
