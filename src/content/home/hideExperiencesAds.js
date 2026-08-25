import { settingsState, shouldRunRoPrimeOnCurrentPage } from "../core/core.js";
import { isRobloxHomePage } from "../alerts/welcome.js";

export const HIDE_EXPERIENCES_ADS_ID =
  "roprime-hide-experiences-ads-style";

const HIDE_EXPERIENCES_ADS_CSS = `
li.list-item:has(span.sponsored-ad-label) {
  display: none;
}

li.list-item:has(span.rovalra-wide-game-tile-sponsored-label) {
  display: none;
}
`;

export function syncHideExperiencesAds() {
  document.getElementById(HIDE_EXPERIENCES_ADS_ID)?.remove();
  if (!shouldRunRoPrimeOnCurrentPage()) return;
  if (!settingsState.hideExperiencesAdsEnabled) return;
  if (!isRobloxHomePage()) return;

  const style = document.createElement("style");
  style.id = HIDE_EXPERIENCES_ADS_ID;
  style.textContent = HIDE_EXPERIENCES_ADS_CSS;
  document.documentElement.appendChild(style);
}

import { registerFeature } from '../features/registry.js';
registerFeature(syncHideExperiencesAds);

