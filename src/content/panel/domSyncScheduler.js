import { debounce } from "../core/debounce.js";
import { syncRoEliteView } from "./panel.js";

const DOM_SYNC_DEBOUNCE_MS = 800;
const FALLBACK_SYNC_MS = 15000;

let observer = null;
let fallbackIntervalId = null;

const scheduleSync = debounce(() => {
  syncRoEliteView();
}, DOM_SYNC_DEBOUNCE_MS);

export function installDomSyncScheduler() {
  if (observer) return;

  observer = new MutationObserver(() => {
    scheduleSync();
  });

  const startObserver = () => {
    if (!document.body) return;
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.body) startObserver();
  else {
    document.addEventListener("DOMContentLoaded", startObserver, {
      once: true,
    });
  }

  if (fallbackIntervalId === null) {
    fallbackIntervalId = window.setInterval(() => {
      syncRoEliteView();
    }, FALLBACK_SYNC_MS);
  }
}

export function stopDomSyncScheduler() {
  scheduleSync.cancel();
  observer?.disconnect();
  observer = null;
  if (fallbackIntervalId !== null) {
    window.clearInterval(fallbackIntervalId);
    fallbackIntervalId = null;
  }
}
