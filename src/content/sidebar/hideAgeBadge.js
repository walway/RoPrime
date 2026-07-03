import { settingsState } from "../core/core.js";

export const RP_HIDE_AGE_BADGE_STYLE_ID = "roprime-hide-age-badge-style";

export function syncHideAgeBadge() {
  document.getElementById(RP_HIDE_AGE_BADGE_STYLE_ID)?.remove();
  if (!settingsState.hideAgeBadgeEnabled) return;

  const style = document.createElement("style");
  style.id = RP_HIDE_AGE_BADGE_STYLE_ID;
  style.textContent = "#age-badge-container{display:none!important;}";
  document.documentElement.appendChild(style);
}
