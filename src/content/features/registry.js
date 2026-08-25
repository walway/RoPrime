/* This file syncs all of the features automatically */

const syncFns = new Set();

export function registerFeature(syncFn) {
  if (typeof syncFn === "function") syncFns.add(syncFn);
}

export function unregisterFeature(syncFn) {
  syncFns.delete(syncFn);
}

export function syncAllFeatures() {
  for (const fn of syncFns) {
    try {
      const result = fn();
      if (result && typeof result.then === "function") void result.catch(() => {});
    } catch {
      /* feature sync errors should not break others */
    }
  }
}
