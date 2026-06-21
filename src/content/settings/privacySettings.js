import {
	normalizeSearchBannedWords,
	saveSettings,
	settingsState,
} from "../core/core.js";
import { syncSearchBan } from "../features/searchBan.js";
import { DELETE_ICON_SVG } from "../sidebar/sidebarIcons.js";

function escapeHtml(value) {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function buildSearchBanWordRowHtml(word) {
	return `<div class="roprime-sidebar-content-row" data-roprime-search-ban-row="${escapeHtml(word)}"><span class="roprime-sidebar-content-row-label">${escapeHtml(word)}</span><button type="button" class="roprime-sidebar-content-delete" data-roprime-search-ban-remove="${escapeHtml(word)}" data-i18n-aria-label="Search ban remove word">${DELETE_ICON_SVG}</button></div>`;
}

export function buildSearchBanListHtml() {
	const words = normalizeSearchBannedWords(settingsState.searchBannedWords);
	if (!words.length) {
		return `<p class="roprime-sidebar-content-empty" data-i18n="Search ban empty hint"></p>`;
	}
	return words.map((word) => buildSearchBanWordRowHtml(word)).join("");
}

export function refreshSearchBanList(inner) {
	const list = inner.querySelector("[data-roprime-search-ban-list]");
	if (!(list instanceof HTMLElement)) return;
	list.innerHTML = buildSearchBanListHtml();
	bindSearchBanList(inner);
}

function addSearchBannedWord(rawWord) {
	const word = String(rawWord || "").trim();
	if (!word) return false;

	const words = normalizeSearchBannedWords(settingsState.searchBannedWords);
	const normalized = word.toLowerCase();
	if (words.some((entry) => entry.toLowerCase() === normalized)) return false;

	settingsState.searchBannedWords = [...words, word];
	saveSettings();
	syncSearchBan();
	return true;
}

function removeSearchBannedWord(rawWord) {
	const word = String(rawWord || "").trim();
	if (!word) return;

	settingsState.searchBannedWords = normalizeSearchBannedWords(
		settingsState.searchBannedWords,
	).filter((entry) => entry.toLowerCase() !== word.toLowerCase());
	saveSettings();
	syncSearchBan();
}

function bindSearchBanList(inner) {
	const list = inner.querySelector("[data-roprime-search-ban-list]");
	if (!(list instanceof HTMLElement)) return;

	list.querySelectorAll("[data-roprime-search-ban-remove]").forEach((btn) => {
		if (!(btn instanceof HTMLButtonElement)) return;
		if (btn.getAttribute("data-roprime-search-ban-remove-bound") === "1") return;
		btn.setAttribute("data-roprime-search-ban-remove-bound", "1");
		btn.addEventListener("click", () => {
			removeSearchBannedWord(btn.getAttribute("data-roprime-search-ban-remove") || "");
			refreshSearchBanList(inner);
		});
	});
}

function commitSearchBanInput(inner) {
	const input = inner.querySelector("[data-roprime-search-ban-input]");
	if (!(input instanceof HTMLInputElement)) return;

	const added = addSearchBannedWord(input.value);
	if (added) {
		input.value = "";
		refreshSearchBanList(inner);
	}
}

export function buildPrivacySettingsHtml() {
	return `
                <div class="roprime-toggle-row">
                    <div class="roprime-toggle-copy">
                        <div class="roprime-toggle-title" data-i18n="Search ban enable title"></div>
                        <div class="roprime-toggle-desc" data-i18n="Search ban enable description"></div>
                    </div>
                    <label class="roprime-switch" for="roprime-toggle-search-ban">
                        <input id="roprime-toggle-search-ban" type="checkbox" />
                        <span class="roprime-switch-slider" aria-hidden="true"></span>
                    </label>
                </div>
                <div class="roprime-setting-field roprime-search-ban-field">
                    <div class="roprime-setting-field-copy">
                        <div class="roprime-setting-title" data-i18n="Search ban title"></div>
                        <div class="roprime-setting-desc" data-i18n="Search ban description"></div>
                    </div>
                    <div class="roprime-search-ban-controls">
                        <input
                            type="text"
                            class="roprime-search-ban-input"
                            data-roprime-search-ban-input
                            data-i18n-placeholder="Search ban input placeholder"
                            autocomplete="off"
                            spellcheck="false"
                        />
                        <button
                            type="button"
                            class="roprime-settings-primary-btn roprime-search-ban-add-btn"
                            data-roprime-search-ban-add
                            data-i18n="Search ban add word"
                        ></button>
                    </div>
                </div>
                <div class="roprime-sidebar-content-panel">
                    <div class="roprime-sidebar-content-list" data-roprime-search-ban-list></div>
                </div>`;
}

export function bindPrivacyControls(inner) {
	if (!(inner instanceof HTMLElement)) return;
	if (inner.getAttribute("data-roprime-privacy-bound") === "1") return;
	inner.setAttribute("data-roprime-privacy-bound", "1");

	const toggle = inner.querySelector("#roprime-toggle-search-ban");
	if (toggle instanceof HTMLInputElement) {
		toggle.addEventListener("change", () => {
			settingsState.searchBanEnabled = toggle.checked;
			saveSettings();
			syncSearchBan();
		});
	}

	const addBtn = inner.querySelector("[data-roprime-search-ban-add]");
	if (addBtn instanceof HTMLButtonElement) {
		addBtn.addEventListener("click", () => commitSearchBanInput(inner));
	}

	const input = inner.querySelector("[data-roprime-search-ban-input]");
	if (input instanceof HTMLInputElement) {
		input.addEventListener("keydown", (event) => {
			if (event.key !== "Enter") return;
			event.preventDefault();
			commitSearchBanInput(inner);
		});
	}

	bindSearchBanList(inner);
}

export function refreshPrivacySettingsUi(inner) {
	if (!(inner instanceof HTMLElement)) return;

	const toggle = inner.querySelector("#roprime-toggle-search-ban");
	if (toggle instanceof HTMLInputElement) {
		toggle.checked = !!settingsState.searchBanEnabled;
	}

	refreshSearchBanList(inner);
}
