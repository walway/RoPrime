import {
  getStorageApi,
  isExtensionContextAlive,
  settingsState,
} from "./core.js";

const extensionApi = globalThis.browser || globalThis.chrome;

export const VERSION_MANIFEST_URL =
  "https://raw.githubusercontent.com/walway/roprime-data/main/v1/version.json";
export const VERSION_UPDATE_DISMISSED_KEY = "rpVersionUpdateDismissed";
export const VERSION_UPDATE_DISMISSED_VERSION_KEY =
  "rpVersionUpdateDismissedVersion";
export const VERSION_UPDATE_DISMISSED_AT_KEY = "rpVersionUpdateDismissedAt";

const VERSION_UPDATE_DISMISS_MS = 24 * 60 * 60 * 1000;

const DOWNLOAD_SOURCE_OPTIONS = [
  { value: "github", label: "GitHub", configKey: "GitHubLink" },
  { value: "chrome", label: "Chrome Web Store", configKey: "ChromeLink" },
  { value: "firefox", label: "Firefox Add-ons", configKey: "FirefoxLink" },
  { value: "edge", label: "Microsoft Edge Add-ons", configKey: "EdgeLink" },
  { value: "opera", label: "Opera Add-ons", configKey: "OperaLink" },
];

function parseVersionParts(version) {
  return String(version || "0.0.0")
    .trim()
    .replace(/^v/i, "")
    .split(/[.+_-]/)
    .map((part) => {
      const match = part.match(/^\d+/);
      return match ? Number(match[0]) : 0;
    });
}

export function compareVersions(left, right) {
  const a = parseVersionParts(left);
  const b = parseVersionParts(right);
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
}

export function getInstalledVersion() {
  try {
    if (!isExtensionContextAlive()) return "0.0.0";
    return extensionApi?.runtime?.getManifest?.()?.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

export function normalizeVersionManifest(raw) {
  if (!raw || typeof raw !== "object") return null;
  const version = String(raw.version || "").trim();
  const config = raw.config && typeof raw.config === "object" ? raw.config : {};
  return {
    version,
    config: {
      GitHubLink: String(config.GitHubLink || "").trim(),
      ChromeLink: String(config.ChromeLink || "").trim(),
      FirefoxLink: String(config.FirefoxLink || "").trim(),
      EdgeLink: String(config.EdgeLink || "").trim(),
      OperaLink: String(config.OperaLink || "").trim(),
      enabled:
        String(config.enabled ?? "true")
          .trim()
          .toLowerCase() !== "false",
    },
  };
}

export function detectBrowserDownloadSource() {
  const ua = navigator.userAgent || "";
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return "opera";
  if (/firefox/i.test(ua)) return "firefox";
  if (/edg/i.test(ua)) return "edge";
  if (/chrome/i.test(ua)) return "chrome";
  return "github";
}

export function getDownloadOptions(config = {}) {
  return DOWNLOAD_SOURCE_OPTIONS.map((entry) => ({
    value: entry.value,
    label: entry.label,
    url: String(config[entry.configKey] || "").trim(),
  })).filter((entry) => entry.url);
}

export function getDefaultDownloadSource(config = {}) {
  const options = getDownloadOptions(config);
  if (!options.length) return "";

  const preferred = detectBrowserDownloadSource();
  const preferredOption = options.find((entry) => entry.value === preferred);
  if (preferredOption) return preferredOption.value;

  const githubOption = options.find((entry) => entry.value === "github");
  return githubOption?.value || options[0].value;
}

export function getDownloadUrl(config = {}, source = "") {
  const options = getDownloadOptions(config);
  const match = options.find((entry) => entry.value === source);
  if (match?.url) return match.url;
  return options[0]?.url || "";
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`version_manifest_fetch_failed:${response.status}`);
  }
  return response.json();
}

export async function fetchVersionManifest() {
  if (!isExtensionContextAlive()) return null;
  try {
    return normalizeVersionManifest(await fetchJson(VERSION_MANIFEST_URL));
  } catch {
    return null;
  }
}

export function isInstalledAsPackage() {
  return new Promise((resolve) => {
    if (!extensionApi?.management?.getSelf) {
      resolve(false);
      return;
    }
    try {
      extensionApi.management.getSelf((self) => {
        const installType = String(self?.installType || "")
          .trim()
          .toLowerCase();
        resolve(installType !== "development");
      });
    } catch {
      resolve(false);
    }
  });
}

function readDismissedVersion() {
  return new Promise((resolve) => {
    const storage = getStorageApi();
    if (!storage) {
      resolve("");
      return;
    }
    try {
      storage.get(
        [
          VERSION_UPDATE_DISMISSED_KEY,
          VERSION_UPDATE_DISMISSED_VERSION_KEY,
          VERSION_UPDATE_DISMISSED_AT_KEY,
        ],
        (result) => {
          if (result?.[VERSION_UPDATE_DISMISSED_KEY] !== true) {
            resolve("");
            return;
          }
          const version = String(
            result?.[VERSION_UPDATE_DISMISSED_VERSION_KEY] || "",
          );
          const dismissedAt = Number(result?.[VERSION_UPDATE_DISMISSED_AT_KEY]);
          if (
            !version ||
            !Number.isFinite(dismissedAt) ||
            Date.now() - dismissedAt >= VERSION_UPDATE_DISMISS_MS
          ) {
            resolve("");
            return;
          }
          resolve(version);
        },
      );
    } catch {
      resolve("");
    }
  });
}

export function persistVersionUpdateDismissed(version) {
  const storage = getStorageApi();
  if (!storage) return;
  try {
    storage.set({
      [VERSION_UPDATE_DISMISSED_KEY]: true,
      [VERSION_UPDATE_DISMISSED_VERSION_KEY]: String(version || ""),
      [VERSION_UPDATE_DISMISSED_AT_KEY]: Date.now(),
    });
  } catch {
    /* ignore */
  }
}

export async function shouldShowVersionUpdate({
  force = false,
  manifest = null,
} = {}) {
  const currentVersion = getInstalledVersion();
  const resolvedManifest = manifest || (await fetchVersionManifest());

  if (force) {
    return {
      show: Boolean(resolvedManifest?.version),
      manifest: resolvedManifest,
      currentVersion,
    };
  }

  if (!resolvedManifest?.version || !resolvedManifest.config?.enabled) {
    return { show: false, manifest: resolvedManifest, currentVersion };
  }

  if (settingsState.updateNotificationsEnabled === false) {
    return { show: false, manifest: resolvedManifest, currentVersion };
  }

  if (compareVersions(resolvedManifest.version, currentVersion) <= 0) {
    return { show: false, manifest: resolvedManifest, currentVersion };
  }

  const dismissedVersion = await readDismissedVersion();
  if (dismissedVersion && dismissedVersion === resolvedManifest.version) {
    return { show: false, manifest: resolvedManifest, currentVersion };
  }

  return { show: true, manifest: resolvedManifest, currentVersion };
}
