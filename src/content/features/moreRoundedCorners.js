import { settingsState, shouldRunRoPrimeOnCurrentPage } from "../core/core.js";
import { registerFeature } from "./registry.js";

export const RP_MORE_ROUNDED_CORNERS_STYLE_ID =
  "roprime-more-rounded-corners-style";

const MORE_ROUNDED_CORNERS_CSS = `
.carousel-item,
#game-details-carousel-container,
.video-preview-wrapper video:not(.featured-game-icon-container .video-preview-wrapper video),
.carousel-item iframe,
.thumbnail-shimmer-overlay,
.game-details-carousel-container .shimmer {
  border-radius: 12px;
}

#horizontal-tabs {
  white-space: nowrap;
  scroll-behavior: smooth;
  border-radius: 8px;
  overflow: hidden;
}

#vertical-menu,
.menu-vertical {
  scroll-behavior: smooth;
  border-radius: 8px;
  overflow: hidden;
}
`.trim();

export function syncMoreRoundedCorners() {
  if (!shouldRunRoPrimeOnCurrentPage()) return;

  const existing = document.getElementById(RP_MORE_ROUNDED_CORNERS_STYLE_ID);
  if (!settingsState.moreRoundedCornersEnabled) {
    existing?.remove();
    return;
  }

  let style = existing;
  if (!(style instanceof HTMLStyleElement)) {
    style = document.createElement("style");
    style.id = RP_MORE_ROUNDED_CORNERS_STYLE_ID;
    (document.head || document.documentElement).appendChild(style);
  }
  if (style.textContent !== MORE_ROUNDED_CORNERS_CSS) {
    style.textContent = MORE_ROUNDED_CORNERS_CSS;
  }
}

registerFeature(syncMoreRoundedCorners);
