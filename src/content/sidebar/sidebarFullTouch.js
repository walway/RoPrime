import { registerFeature } from "../features/registry.js";
import {
  getActiveSidebarSize,
  settingsState,
  shouldApplySidebarModifications,
  syncAccountSettingsLayoutInset,
} from "../core/core.js";
import { buildSidebarFullLayoutCss } from "./sidebarLayout.js";

const RP_SIDEBAR_FULL_TOUCH_STYLE_ID = "roprime-sidebar-full-touch-style";
const RP_EXPAND_ON_HOVER_EXPANDED_CLASS =
  "roprime-sidebar-expand-on-hover-expanded";

function isFullTouchActive() {
  if (!shouldApplySidebarModifications()) return false;
  if (
    document.documentElement.classList.contains(
      RP_EXPAND_ON_HOVER_EXPANDED_CLASS,
    )
  ) {
    return false;
  }
  return (
    getActiveSidebarSize() === "full" &&
    !settingsState.sidebarIconsOnlyEnabled &&
    !settingsState.sidebarCollapseMenuEnabled
  );
}

export function syncSidebarFullTouchPadding() {
  const active = isFullTouchActive();
  const existingStyle = document.getElementById(RP_SIDEBAR_FULL_TOUCH_STYLE_ID);

  if (!active) {
    existingStyle?.remove();
    syncAccountSettingsLayoutInset();
    return;
  }

  let style = existingStyle;
  if (!(style instanceof HTMLStyleElement)) {
    style = document.createElement("style");
    style.id = RP_SIDEBAR_FULL_TOUCH_STYLE_ID;
    document.documentElement.appendChild(style);
  }
  style.textContent = buildSidebarFullLayoutCss();
  syncAccountSettingsLayoutInset();
}

registerFeature(syncSidebarFullTouchPadding);
