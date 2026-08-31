import { getExtensionResourceUrl } from "../core/core.js";

export const EXTENSIONS_REGISTRY_CDN_URL =
  "https://raw.githubusercontent.com/walway/roprime-data/main/v1/extensions.json";
const LOCAL_REGISTRY_PATH = "src/strings/data/extensions.json";

let registryCache = null;
let registryFetchPromise = null;

function isMaliciousFlag(value) {
  if (typeof value === "boolean") return value;
  return (
    String(value || "")
      .trim()
      .toLowerCase() === "true"
  );
}

function normalizeExtensionEntry(raw) {
  if (!raw || typeof raw !== "object") return null;
  const key = String(raw.key || "").trim();
  if (!key) return null;

  return {
    key,
    id: String(raw.id || "").trim(),
    class: String(raw.class || "").trim(),
    settingsPath: String(raw.settingsPath || "").trim(),
    malicious: isMaliciousFlag(raw.malicious),
    noToggle: Boolean(raw.noToggle),
  };
}

function parseRegistryJson(raw) {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.extensions)
      ? raw.extensions
      : Array.isArray(raw?.plugins)
        ? raw.plugins
        : null;
  if (!list) return [];
  return list.map(normalizeExtensionEntry).filter(Boolean);
}

async function fetchRegistryFromUrl(url) {
  if (!url) return null;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const extensions = parseRegistryJson(await response.json());
    return extensions.length ? extensions : null;
  } catch {
    return null;
  }
}

async function fetchLocalRegistryFallback() {
  const localUrl = getExtensionResourceUrl(LOCAL_REGISTRY_PATH);
  if (!localUrl) return [];

  const registry = await fetchRegistryFromUrl(localUrl);
  return registry || [];
}

export async function fetchExtensionsRegistry() {
  if (registryCache) return registryCache;
  if (registryFetchPromise) return registryFetchPromise;

  registryFetchPromise = (async () => {
    const cdnRegistry = await fetchRegistryFromUrl(EXTENSIONS_REGISTRY_CDN_URL);
    if (cdnRegistry) {
      registryCache = cdnRegistry;
      return cdnRegistry;
    }

    registryCache = await fetchLocalRegistryFallback();
    return registryCache;
  })();

  try {
    return await registryFetchPromise;
  } finally {
    registryFetchPromise = null;
  }
}

export function invalidateExtensionsRegistryCache() {
  registryCache = null;
}
