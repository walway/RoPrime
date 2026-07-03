import {
  getStorageApi,
  isExtensionContextAlive,
  mergeStoredSettings,
  RP_SETTINGS_KEY,
  resetSettingsToDefaults,
  saveSettings,
  serializeSettingsPayload,
  settingsState,
} from "../core/core.js";
import { updateRenameLoop } from "../features/rename.js";
import { syncRoEliteView } from "../panel/panel.js";
import { t as accountSettingsPaneT } from "./roprimeAccountSettingsPage.js";

const extensionApi = globalThis.browser || globalThis.chrome;

const SYNC_EXCLUDED_KEYS = [
  "ownedProfileEffects",
  "equippedProfileEffect",
  "equippedProfilePictureEffect",
  "equippedProfilePageEffect",
  "profileEffectsEquippedByUser",
  "customCss",
  "customCssCautionAccepted",
  "hideAgeBadgeEnabled",
];

function stripSyncExcludedKeys(payload) {
  for (const key of SYNC_EXCLUDED_KEYS) {
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

function parseImportPayload(text) {
  const raw = stripUtf8Bom(text).trim();
  if (!raw) throw new Error("Empty file.");

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("Invalid JSON.");
    parsed = JSON.parse(raw.slice(start, end + 1));
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("No importable settings object found.");
  }

  const candidates = [
    parsed,
    parsed.roprime,
    parsed.settings,
    parsed[RP_SETTINGS_KEY],
    parsed.data?.roprime,
  ].filter((item) => item && typeof item === "object" && !Array.isArray(item));

  const hasKnownKey = (obj) =>
    "language" in obj ||
    "renameDropdownEnabled" in obj ||
    "sidebarSize" in obj ||
    "oldNavigationBarEnabled" in obj ||
    "renameMarketplaceToCatalog" in obj;

  for (const candidate of candidates) {
    if (hasKnownKey(candidate)) return { ...candidate };
  }

  for (const candidate of candidates) {
    return { ...candidate };
  }

  throw new Error("No importable settings object found.");
}

async function storageSetCompat(storage, data) {
  try {
    const maybePromise = storage.set(data);
    if (maybePromise && typeof maybePromise.then === "function") {
      await maybePromise;
      return;
    }
  } catch {}

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
  return {
    about: {
      browser: detectBrowserName(),
      version: getExtensionVersion(),
    },
    ...stripSyncExcludedKeys({ ...serializeSettingsPayload() }),
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
  return `roprime-${version} ${date} ${h}_${m}_${s}.json`;
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
				<input type="file" accept=".json,application/json,text/plain" hidden data-roprime-settings-import-input />
			</div>
			<div class="roprime-settings-sync-preview-wrap" data-roprime-settings-preview-wrap>
				<textarea class="roprime-settings-sync-preview" data-roprime-settings-preview spellcheck="false"></textarea>
			</div>
			<div class="roprime-toggle-row roprime-settings-sync-reset-row">
				<div class="roprime-toggle-copy">
					<div class="roprime-toggle-title" data-i18n="Settings sync reset title"></div>
				</div>
				<button type="button" class="roprime-settings-primary-btn" data-roprime-settings-reset data-i18n="Settings sync reset button"></button>
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

async function copyTextToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
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
    return copied;
  }
}

export async function copySettingsExport(inner) {
  const preview = inner.querySelector("[data-roprime-settings-preview]");
  const text =
    preview instanceof HTMLTextAreaElement
      ? preview.value || formatSettingsExportJson()
      : formatSettingsExportJson();
  const copied = await copyTextToClipboard(text);
  setSyncStatus(
    inner,
    copied
      ? accountSettingsPaneT("Settings sync copied")
      : accountSettingsPaneT("Settings sync copy failed"),
    !copied,
  );
  window.setTimeout(() => setSyncStatus(inner, ""), 2200);
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
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function applySettingsAfterReset(inner) {
  refreshSettingsSyncPreview(inner);
  const preview = inner.querySelector("[data-roprime-settings-preview]");
  if (preview instanceof HTMLTextAreaElement) {
    return preview.value;
  }
  return formatSettingsExportJson();
}

export async function resetAllSettingsFromSync(inner) {
  resetSettingsToDefaults();
  updateRenameLoop();
  syncRoEliteView();
  const [
    { syncProfileSettingsRoute },
    { reloadSettingsUiStrings },
    { syncCustomCss },
  ] = await Promise.all([
    import("./profileSettings.js"),
    import("../core/core.js"),
    import("../features/customCss.js"),
  ]);
  await reloadSettingsUiStrings();
  syncCustomCss();
  syncProfileSettingsRoute();
  return applySettingsAfterReset(inner);
}

export async function importSettingsText(text) {
  const imported = parseImportPayload(text);
  stripSyncExcludedKeys(imported);

  const storage = getStorageApi();
  if (!storage) throw new Error("Storage API unavailable.");

  const preservedCustomCss = String(settingsState.customCss || "");
  const preservedCustomCssCaution = !!settingsState.customCssCautionAccepted;

  mergeStoredSettings(imported);
  settingsState.customCss = preservedCustomCss;
  settingsState.customCssCautionAccepted = preservedCustomCssCaution;

  const payload = serializeSettingsPayload();
  await storageSetCompat(storage, { [RP_SETTINGS_KEY]: payload });
  saveSettings();
}

export async function importSettingsFile(file) {
  const text = await file.text();
  await importSettingsText(text);
}

export function bindSettingsSyncControls(inner) {
  if (inner.getAttribute("data-roprime-settings-sync-bound") === "1") return;
  inner.setAttribute("data-roprime-settings-sync-bound", "1");

  refreshSettingsSyncPreview(inner);

  const preview = inner.querySelector("[data-roprime-settings-preview]");
  let previewSaveTimer = 0;
  let previewLastSaved =
    preview instanceof HTMLTextAreaElement ? preview.value : "";

  inner
    .querySelector("[data-roprime-settings-copy]")
    ?.addEventListener("click", () => {
      void copySettingsExport(inner);
    });

  inner
    .querySelector("[data-roprime-settings-export]")
    ?.addEventListener("click", () => {
      refreshSettingsSyncPreview(inner);
      exportSettingsFile();
      setSyncStatus(inner, accountSettingsPaneT("Settings sync exported"));
      window.setTimeout(() => setSyncStatus(inner, ""), 2200);
    });

  const importInput = inner.querySelector(
    "[data-roprime-settings-import-input]",
  );
  inner
    .querySelector("[data-roprime-settings-import]")
    ?.addEventListener("click", () => {
      if (importInput instanceof HTMLInputElement) {
        importInput.value = "";
        importInput.click();
      }
    });

  importInput?.addEventListener("change", () => {
    const file =
      importInput instanceof HTMLInputElement ? importInput.files?.[0] : null;
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
        setSyncStatus(inner, accountSettingsPaneT("Settings sync imported"));
        window.setTimeout(() => setSyncStatus(inner, ""), 2200);
      } catch (_error) {
        setSyncStatus(
          inner,
          accountSettingsPaneT("Settings sync import failed"),
          true,
        );
      }
    })();
  });

  inner
    .querySelector("[data-roprime-settings-reset]")
    ?.addEventListener("click", () => {
      void (async () => {
        try {
          previewLastSaved = await resetAllSettingsFromSync(inner);
          setSyncStatus(
            inner,
            accountSettingsPaneT("Settings sync reset done"),
          );
          window.setTimeout(() => setSyncStatus(inner, ""), 2200);
        } catch {
          setSyncStatus(
            inner,
            accountSettingsPaneT("Settings sync reset failed"),
            true,
          );
        }
      })();
    });

  if (preview instanceof HTMLTextAreaElement) {
    preview.addEventListener("input", () => {
      window.clearTimeout(previewSaveTimer);
      previewSaveTimer = window.setTimeout(() => {
        const normalized = preview.value;
        if (normalized === previewLastSaved) return;
        if (!normalized.trim()) {
          void (async () => {
            try {
              previewLastSaved = await resetAllSettingsFromSync(inner);
              setSyncStatus(
                inner,
                accountSettingsPaneT("Settings sync reset done"),
              );
              window.setTimeout(() => setSyncStatus(inner, ""), 2200);
            } catch {
              setSyncStatus(
                inner,
                accountSettingsPaneT("Settings sync reset failed"),
                true,
              );
            }
          })();
          return;
        }
        void (async () => {
          try {
            await importSettingsText(normalized);
            previewLastSaved = normalized;
            setSyncStatus(inner, accountSettingsPaneT("Settings sync saved"));
            window.setTimeout(() => setSyncStatus(inner, ""), 1600);
          } catch {
            setSyncStatus(
              inner,
              accountSettingsPaneT("Settings sync import failed"),
              true,
            );
          }
        })();
      }, 500);
    });
  }
}
