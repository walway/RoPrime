import {
	getStorageApi,
	isExtensionContextAlive,
	mergeStoredSettings,
	RP_SETTINGS_KEY,
	serializeSettingsPayload,
} from "../core/core.js";
import { t as accountSettingsPaneT } from "./roprimeAccountSettingsPage.js";

const extensionApi = globalThis.browser || globalThis.chrome;

/** Not exported — ownership/equip comes from the profile-effects registry JSON. */
const PROFILE_EFFECTS_SYNC_STRIP_KEYS = [
	"ownedProfileEffects",
	"equippedProfileEffect",
	"equippedProfilePictureEffect",
	"equippedProfilePageEffect",
	"profileEffectsEquippedByUser",
];

/** Custom CSS is edited in-app only — never included in sync export/import. */
const SETTINGS_SYNC_STRIP_KEYS = [
	...PROFILE_EFFECTS_SYNC_STRIP_KEYS,
	"customCss",
];

/** @param {Record<string, unknown>} payload */
function stripSettingsSyncPayload(payload) {
	for (const key of SETTINGS_SYNC_STRIP_KEYS) {
		delete payload[key];
	}
	return payload;
}

function getExtensionVersion() {
	try {
		if (!isExtensionContextAlive()) return "0.0.0";
		return extensionApi?.runtime?.getManifest?.()?.version || "0.0.0";
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

function stripUtf8Bom(text) {
	const raw = String(text || "");
	return raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
}

function parseFirstJsonObjectFromText(text) {
	const raw = stripUtf8Bom(text).trim();
	if (!raw) throw new Error("invalid");

	// Fast path for valid JSON documents.
	try {
		return JSON.parse(raw);
	} catch {
		/* scan for first valid object below */
	}

	// Fallback: parse the first balanced {...} object, respecting strings/escapes.
	const firstBrace = raw.indexOf("{");
	if (firstBrace < 0) throw new Error("invalid");

	let depth = 0;
	let inString = false;
	let escaped = false;
	let start = -1;
	for (let i = firstBrace; i < raw.length; i++) {
		const ch = raw[i];
		if (inString) {
			if (escaped) {
				escaped = false;
				continue;
			}
			if (ch === "\\") {
				escaped = true;
				continue;
			}
			if (ch === '"') inString = false;
			continue;
		}
		if (ch === '"') {
			inString = true;
			continue;
		}
		if (ch === "{") {
			if (depth === 0) start = i;
			depth++;
			continue;
		}
		if (ch === "}") {
			if (depth === 0) continue;
			depth--;
			if (depth === 0 && start >= 0) {
				const candidate = raw.slice(start, i + 1);
				try {
					return JSON.parse(candidate);
				} catch {
					// keep scanning for the next complete object
					start = -1;
				}
			}
		}
	}

	throw new Error("invalid");
}

function parseJsObjectLiteral(candidate) {
	try {
		// Parse relaxed JS object-literal payloads (single quotes, trailing commas, etc.).
		// This is intentionally local-only parsing for user-provided sync files.
		return Function(`"use strict"; return (${candidate});`)();
	} catch {
		return null;
	}
}

function parseFirstObjectLikeFromText(text) {
	const raw = stripUtf8Bom(text).trim();
	if (!raw) throw new Error("invalid");

	try {
		return parseFirstJsonObjectFromText(raw);
	} catch {
		/* try JS object-literal parsing below */
	}

	const firstBrace = raw.indexOf("{");
	if (firstBrace < 0) throw new Error("invalid");

	let depth = 0;
	let inString = false;
	let escaped = false;
	let stringQuote = '"';
	let inLineComment = false;
	let inBlockComment = false;
	let start = -1;

	for (let i = firstBrace; i < raw.length; i++) {
		const ch = raw[i];
		const next = raw[i + 1] || "";

		if (inLineComment) {
			if (ch === "\n") inLineComment = false;
			continue;
		}
		if (inBlockComment) {
			if (ch === "*" && next === "/") {
				inBlockComment = false;
				i++;
			}
			continue;
		}

		if (inString) {
			if (escaped) {
				escaped = false;
				continue;
			}
			if (ch === "\\") {
				escaped = true;
				continue;
			}
			if (ch === stringQuote) inString = false;
			continue;
		}

		if (ch === "/" && next === "/") {
			inLineComment = true;
			i++;
			continue;
		}
		if (ch === "/" && next === "*") {
			inBlockComment = true;
			i++;
			continue;
		}
		if (ch === "'" || ch === '"' || ch === "`") {
			inString = true;
			stringQuote = ch;
			continue;
		}

		if (ch === "{") {
			if (depth === 0) start = i;
			depth++;
			continue;
		}
		if (ch === "}") {
			if (depth === 0) continue;
			depth--;
			if (depth === 0 && start >= 0) {
				const candidate = raw.slice(start, i + 1);
				try {
					return JSON.parse(candidate);
				} catch {
					const parsedJs = parseJsObjectLiteral(candidate);
					if (parsedJs && typeof parsedJs === "object") return parsedJs;
					start = -1;
				}
			}
		}
	}

	throw new Error("invalid");
}

function resolveImportSettingsPayload(parsed) {
	if (!parsed || typeof parsed !== "object") return null;

	// Common wrapper shapes
	const candidates = [];
	if (!Array.isArray(parsed)) {
		candidates.push(parsed);
		if (parsed.roprime && typeof parsed.roprime === "object") {
			candidates.push(parsed.roprime);
		}
		if (parsed.settings && typeof parsed.settings === "object") {
			candidates.push(parsed.settings);
		}
		if (
			parsed[RP_SETTINGS_KEY] &&
			typeof parsed[RP_SETTINGS_KEY] === "object"
		) {
			candidates.push(parsed[RP_SETTINGS_KEY]);
		}
		if (
			parsed.data &&
			typeof parsed.data === "object" &&
			parsed.data.roprime &&
			typeof parsed.data.roprime === "object"
		) {
			candidates.push(parsed.data.roprime);
		}
	}

	// Array payloads: accept first object-like entry.
	if (Array.isArray(parsed)) {
		for (const item of parsed) {
			if (item && typeof item === "object" && !Array.isArray(item)) {
				candidates.push(item);
				break;
			}
		}
	}

	const hasKnownKey = (obj) =>
		obj &&
		typeof obj === "object" &&
		("language" in obj ||
			"renameDropdownEnabled" in obj ||
			"sidebarSize" in obj ||
			"sidebarCollapseMenuEnabled" in obj ||
			"oldNavigationBarEnabled" in obj ||
			"smallNewNavigationBarEnabled" in obj ||
			"alwaysShowCloseButtonEnabled" in obj ||
			"friendStylingReimagnedEnabled" in obj ||
			"blockedExecutionPages" in obj);

	for (const candidate of candidates) {
		if (hasKnownKey(candidate)) return candidate;
	}

	// Fallback: first plain object candidate.
	for (const candidate of candidates) {
		if (
			candidate &&
			typeof candidate === "object" &&
			!Array.isArray(candidate)
		) {
			return candidate;
		}
	}

	return null;
}

function getReadableErrorMessage(error) {
	if (error instanceof Error && error.message) return error.message;
	return String(error || "Unknown error");
}

async function storageSetCompat(storage, data) {
	// Promise-first path (Firefox browser.* and modern Chromium).
	try {
		const maybePromise = storage.set(data);
		if (maybePromise && typeof maybePromise.then === "function") {
			await maybePromise;
			return;
		}
	} catch {
		// Fall through to callback path.
	}

	// Callback fallback (older Chrome-style APIs).
	await new Promise((resolve, reject) => {
		try {
			storage.set(data, () => {
				const runtimeError = extensionApi?.runtime?.lastError || null;
				if (runtimeError) {
					reject(new Error(runtimeError.message));
					return;
				}
				resolve();
			});
		} catch (e) {
			reject(e);
		}
	});
}

export function buildSettingsExportDocument() {
	const payload = stripSettingsSyncPayload({
		...serializeSettingsPayload(),
	});
	return {
		about: {
			browser: detectBrowserName(),
			version: getExtensionVersion(),
		},
		...payload,
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
				<textarea class="roprime-settings-sync-preview" data-roprime-settings-preview spellcheck="false"></textarea>
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
	if (!(preview instanceof HTMLTextAreaElement)) return;
	preview.value = formatSettingsExportJson();
}

export async function copySettingsExport(inner) {
	const preview = inner.querySelector("[data-roprime-settings-preview]");
	const text =
		preview instanceof HTMLTextAreaElement
			? preview.value || formatSettingsExportJson()
			: formatSettingsExportJson();
	refreshSettingsSyncPreview(inner);
	try {
		await navigator.clipboard.writeText(text);
		setSyncStatus(inner, accountSettingsPaneT("Settings sync copied"));
		window.setTimeout(() => setSyncStatus(inner, ""), 2200);
	} catch {
		const fallback = document.createElement("textarea");
		fallback.value = text;
		fallback.setAttribute("readonly", "");
		fallback.style.position = "fixed";
		fallback.style.left = "-9999px";
		document.body.appendChild(fallback);
		fallback.select();
		const copied = document.execCommand("copy");
		fallback.remove();
		setSyncStatus(
			inner,
			copied
				? accountSettingsPaneT("Settings sync copied")
				: accountSettingsPaneT("Settings sync copy failed"),
			!copied,
		);
		window.setTimeout(() => setSyncStatus(inner, ""), 2200);
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
	if (detectBrowserName() === "firefox") {
		window.setTimeout(() => URL.revokeObjectURL(url), 1500);
		return;
	}
	URL.revokeObjectURL(url);
}

/**
 * @param {File} file
 */
export async function importSettingsFile(file) {
	const text = await file.text();
	await importSettingsText(text);
}

export async function importSettingsText(text) {
	const parsed = parseFirstObjectLikeFromText(text);
	const settings = resolveImportSettingsPayload(parsed);
	if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
		throw new Error("No importable settings object found.");
	}

	stripSettingsSyncPayload(settings);

	const storage = getStorageApi();
	if (!storage) throw new Error("Storage API unavailable.");

	const preservedCustomCss = String(settingsState.customCss || "");
	mergeStoredSettings(settings);
	settingsState.customCss = preservedCustomCss;
	const payload = serializeSettingsPayload();
	await storageSetCompat(storage, { [RP_SETTINGS_KEY]: payload });
}

/**
 * Bind sync listeners to the settings sync panel.
 * @param {HTMLElement} inner
 */
export function initializeSyncPanelListeners(inner) {
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
	const importInput = inner.querySelector(
		"[data-roprime-settings-import-input]",
	);
	const preview = inner.querySelector("[data-roprime-settings-preview]");
	let previewSaveTimer = 0;
	let previewLastSaved = "";

	const savePreviewText = (text) => {
		const normalized = String(text || "");
		if (!normalized.trim() || normalized === previewLastSaved) return;
		void (async () => {
			try {
				await importSettingsText(normalized);
				previewLastSaved = normalized;
				setSyncStatus(inner, "Settings saved.");
				window.setTimeout(() => setSyncStatus(inner, ""), 1600);
			} catch (error) {
				setSyncStatus(
					inner,
					`Save failed: ${getReadableErrorMessage(error)}`,
					true,
				);
			}
		})();
	};

	if (preview instanceof HTMLTextAreaElement) {
		previewLastSaved = preview.value;
		preview.addEventListener("input", () => {
			window.clearTimeout(previewSaveTimer);
			previewSaveTimer = window.setTimeout(() => {
				savePreviewText(preview.value);
			}, 500);
		});
	}
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
					refreshSettingsSyncPreview(inner);
					const nextPreview = inner.querySelector(
						"[data-roprime-settings-preview]",
					);
					if (nextPreview instanceof HTMLTextAreaElement) {
						previewLastSaved = nextPreview.value;
					}
					setSyncStatus(inner, "Settings imported.");
					window.setTimeout(() => setSyncStatus(inner, ""), 2200);
				} catch (error) {
					setSyncStatus(
						inner,
						`Import failed: ${getReadableErrorMessage(error)}`,
						true,
					);
				}
			})();
		});
	}
}

// Backward-compatible alias used by existing settings page wiring.
export const bindSettingsSyncControls = initializeSyncPanelListeners;
