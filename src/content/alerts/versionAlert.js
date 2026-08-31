import { shouldRunRoPrimeOnCurrentPage } from "../core/core.js";
import {
  fetchVersionManifest,
  shouldShowVersionUpdate,
} from "../core/version.js";
import { showVersionUpdateOverlay } from "../ui/overlay.js";

let versionCheckPromise = null;

export async function showVersionUpdateAlert({ force = false } = {}) {
  const manifest = await fetchVersionManifest();
  const result = await shouldShowVersionUpdate({ force, manifest });
  if (!result.show || !result.manifest) return false;

  await showVersionUpdateOverlay({
    currentVersion: result.currentVersion,
    latestVersion: result.manifest.version,
    config: result.manifest.config,
  });
  return true;
}

export function syncVersionUpdateAlert() {
  if (!shouldRunRoPrimeOnCurrentPage()) return;
  if (versionCheckPromise) return;

  versionCheckPromise = showVersionUpdateAlert()
    .catch(() => false)
    .finally(() => {
      versionCheckPromise = null;
    });
}
