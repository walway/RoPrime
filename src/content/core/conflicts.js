import { fetchExtensionsRegistry } from "../panel/registry.js";
import { isExtensionContextAlive } from "./core.js";

const extensionApi = globalThis.browser || globalThis.chrome;

async function sendToBackground(message) {
  return await new Promise((resolve) => {
    try {
      if (!isExtensionContextAlive() || !extensionApi.runtime?.sendMessage) {
        return resolve(null);
      }
      extensionApi.runtime.sendMessage(message, (resp) => {
        resolve(resp ?? null);
      });
    } catch {
      resolve(null);
    }
  });
}

export async function getInstalledRoPrimeExtensions() {
  const registry = await fetchExtensionsRegistry();
  const roprimeEntries = registry.filter(
    (entry) =>
      String(entry.key || "")
        .trim()
        .toLowerCase() === "roprime",
  );
  if (!roprimeEntries.length) {
    return [];
  }

  const resp = await sendToBackground({
    type: "ROPRIME_GET_ROPRIME_INSTALLATIONS",
    registry: roprimeEntries,
    pageLang: document.documentElement.getAttribute("lang") || "",
  });
  if (!resp?.ok || !Array.isArray(resp.items)) return [];
  return resp.items;
}

export async function uninstallCurrentRoPrimeExtension({
  showConfirmDialog = false,
} = {}) {
  const resp = await sendToBackground({
    type: "ROPRIME_UNINSTALL_SELF",
    showConfirmDialog,
  });
  return Boolean(resp?.ok);
}

export async function resolveDuplicateRoPrimeBeforeDownload() {
  const installations = await getInstalledRoPrimeExtensions();
  if (installations.length < 2) return false;
  return uninstallCurrentRoPrimeExtension({ showConfirmDialog: false });
}
