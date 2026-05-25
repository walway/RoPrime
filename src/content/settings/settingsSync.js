import {
	getStorageApi,
	isExtensionContextAlive,
	mergeStoredSettings,
	RP_SETTINGS_KEY,
	serializeSettingsPayload,
} from "../core/core.js";
import { t as accountSettingsPaneT } from "./roprimeAccountSettingsPage.js";

/** Not exported — ownership/equip comes from the profile-effects registry JSON. */
const PROFILE_EFFECTS_SYNC_STRIP_KEYS = [
	"ownedProfileEffects",
	"equippedProfileEffect",
	"equippedProfilePictureEffect",
	"equippedProfilePageEffect",
	"profileEffectsEquippedByUser",
];

/** @param {Record<string, unknown>} payload */
function stripProfileEffectsFromSyncPayload(payload) {
	for (const key of PROFILE_EFFECTS_SYNC_STRIP_KEYS) {
		delete payload[key];
	}
	return payload;
}

function getExtensionVersion() {
	try {
		if (!isExtensionContextAlive()) return "0.0.0";
		return chrome.runtime.getManifest()?.version || "0.0.0";
	} catch {
		return "0.0.0";
	}
}

function detectBrowserName() {
	const ua = navigator.userAgent || "";
	if (/firefox/i.test(ua)) return "firefox";
	if (/edg/i.test(ua)) return "edge";
	if (/chrome/i.test(ua)) return "chrome";
	return "unknown";
}

export function buildSettingsExportDocument() {
	const roprime = stripProfileEffectsFromSyncPayload({
		...serializeSettingsPayload(),
	});
	return {
		about: {
			browser: detectBrowserName(),
			version: getExtensionVersion(),
			exportedAt: new Date().toISOString(),
		},
		roprime,
	};
}

export function formatSettingsExportJson() {
	return `${JSON.stringify(buildSettingsExportDocument(), null, 2)}\n`;
}

function formatExportFilename() {
	const version = getExtensionVersion();
	const d = new Date();
	const date = d.toISOString().slice(0, 10);
	const h = String(d.getHours()).padStart(2, "0");
	const m = String(d.getMinutes()).padStart(2, "0");
	const s = String(d.getSeconds()).padStart(2, "0");
	return `roprime-${version}-${date}_${h}_${m}_${s}.json`;
}

/** @param {unknown} parsed */
function extractSettingsFromImport(parsed) {
	if (!parsed || typeof parsed !== "object") return null;
	if (parsed.roprime && typeof parsed.roprime === "object") return parsed.roprime;
	if (parsed[RP_SETTINGS_KEY] && typeof parsed[RP_SETTINGS_KEY] === "object") {
		return parsed[RP_SETTINGS_KEY];
	}
	const keys = Object.keys(parsed);
	const looksLikeSettings =
		"language" in parsed ||
		"renameDropdownEnabled" in parsed ||
		"sidebarSize" in parsed ||
		"customCss" in parsed;
	return looksLikeSettings ? parsed : null;
}

export function buildSettingsSyncHtml() {
	return `
		<div class="roprime-settings-sync-panel" data-roprime-settings-sync-panel>
			<div class="roprime-setting-field-copy">
				<div class="roprime-setting-title" data-i18n="Settings sync title"></div>
				<div class="roprime-setting-desc" data-i18n="Settings sync description"></div>
			</div>
			<div class="roprime-settings-sync-actions">
				<button type="button" class="roprime-settings-primary-btn" data-roprime-settings-copy data-i18n="Settings sync copy"></button>
				<button type="button" class="roprime-settings-primary-btn" data-roprime-settings-export data-i18n="Settings sync export"></button>
				<button type="button" class="roprime-settings-primary-btn" data-roprime-settings-import data-i18n="Settings sync import"></button>
				<input type="file" accept=".json,application/json" hidden data-roprime-settings-import-input />
			</div>
			<div class="roprime-settings-sync-preview-wrap" data-roprime-settings-preview-wrap>
				<pre class="roprime-settings-sync-preview" data-roprime-settings-preview spellcheck="false"></pre>
			</div>
			<p class="roprime-settings-sync-status" data-roprime-settings-sync-status hidden></p>
		</div>`;
}

function setSyncStatus(inner, message, isError = false) {
	const status = inner.querySelector("[data-roprime-settings-sync-status]");
	if (!(status instanceof HTMLElement)) return;
	if (!message) {
		status.hidden = true;
		status.textContent = "";
		return;
	}
	status.hidden = false;
	status.textContent = message;
	status.classList.toggle("is-error", isError);
}

export function refreshSettingsSyncPreview(inner) {
	const preview = inner.querySelector("[data-roprime-settings-preview]");
	if (!(preview instanceof HTMLElement)) return;
	preview.textContent = formatSettingsExportJson();
}

export async function copySettingsExport(inner) {
	const text = formatSettingsExportJson();
	refreshSettingsSyncPreview(inner);
	try {
		await navigator.clipboard.writeText(text);
		setSyncStatus(inner, accountSettingsPaneT("Settings sync copied"));
		window.setTimeout(() => setSyncStatus(inner, ""), 2200);
	} catch {
		setSyncStatus(inner, accountSettingsPaneT("Settings sync copy failed"), true);
	}
}

export function exportSettingsFile() {
	const blob = new Blob([formatSettingsExportJson()], {
		type: "application/json",
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = formatExportFilename();
	a.rel = "noopener";
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}

/**
 * @param {File} file
 */
export async function importSettingsFile(file) {
	const text = await file.text();
	const parsed = JSON.parse(text);
	const settings = extractSettingsFromImport(parsed);
	if (!settings) {
		throw new Error("invalid");
	}

	stripProfileEffectsFromSyncPayload(settings);

	const storage = getStorageApi();
	if (!storage) throw new Error("storage");

	mergeStoredSettings(settings);
	const payload = serializeSettingsPayload();

	await new Promise((resolve, reject) => {
		try {
			storage.set({ [RP_SETTINGS_KEY]: payload }, () => {
				if (chrome.runtime?.lastError) {
					reject(new Error(chrome.runtime.lastError.message));
					return;
				}
				resolve();
			});
		} catch (e) {
			reject(e);
		}
	});
}

export function bindSettingsSyncControls(inner) {
	if (inner.getAttribute("data-roprime-settings-sync-bound") === "1") return;
	inner.setAttribute("data-roprime-settings-sync-bound", "1");

	refreshSettingsSyncPreview(inner);

	const copyBtn = inner.querySelector("[data-roprime-settings-copy]");
	if (copyBtn instanceof HTMLButtonElement) {
		copyBtn.addEventListener("click", () => {
			void copySettingsExport(inner);
		});
	}

	const exportBtn = inner.querySelector("[data-roprime-settings-export]");
	if (exportBtn instanceof HTMLButtonElement) {
		exportBtn.addEventListener("click", () => {
			refreshSettingsSyncPreview(inner);
			exportSettingsFile();
			setSyncStatus(inner, accountSettingsPaneT("Settings sync exported"));
			window.setTimeout(() => setSyncStatus(inner, ""), 2200);
		});
	}

	const importBtn = inner.querySelector("[data-roprime-settings-import]");
	const importInput = inner.querySelector("[data-roprime-settings-import-input]");
	if (
		importBtn instanceof HTMLButtonElement &&
		importInput instanceof HTMLInputElement
	) {
		importBtn.addEventListener("click", () => {
			importInput.value = "";
			importInput.click();
		});
		importInput.addEventListener("change", () => {
			const file = importInput.files?.[0];
			if (!file) return;
			void (async () => {
				try {
					await importSettingsFile(file);
					window.location.reload();
				} catch {
					setSyncStatus(
						inner,
						accountSettingsPaneT("Settings sync import failed"),
						true,
					);
				}
			})();
		});
	}
}
