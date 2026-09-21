import { settingsState, shouldRunRoPrimeOnCurrentPage } from '../core/core.js'
import { registerFeature } from './registry.js'

export const RP_MORE_ROUNDED_CORNERS_STYLE_ID = 'roprime-more-rounded-corners-style'

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

.menu-vertical {
  scroll-behavior: smooth;
  border-radius: 8px;
  overflow: hidden;
}

li[href="#!/accessories/head"],
li[href="#!/avatar-animations/run"],
li[href="#!/body-parts/torso"],
li[href="#!/bottoms/pants"],
li[href="#!/bundles/body-parts"],
li[href="#!/classic-clothing/classic-pants"],
li[href="#!/heads/heads"],
li[href="#!/makeup/eyebrows"],
li[href="#!/places/created-by-me"],
li[href="#!/private-servers/my-private-servers"],
li[href="#!/shoes/left-shoe"],
li[href="#!/tops/t-shirts"] {
  border-radius: 8px 8px 0 0;
}

li[href="#!/accessories/gear"],
li[href="#!/avatar-animations/climb"],
li[href="#!/body-parts/right-legs"],
li[href="#!/bottoms/skirts"],
li[href="#!/bundles/shoes"],
li[href="#!/classic-clothing/classic-t-shirts"],
li[href="#!/heads/dynamic-heads-asset"],
li[href="#!/makeup/eyes"],
li[href="#!/private-servers/other-private-servers"],
li[href="#!/shoes/right-shoe"],
li[href="#!/tops/jackets"] {
  border-radius: 0 0 8px 8px;
}
`.trim()

export function syncMoreRoundedCorners() {
    if (!shouldRunRoPrimeOnCurrentPage()) return

    const existing = document.getElementById(RP_MORE_ROUNDED_CORNERS_STYLE_ID)
    if (!settingsState.moreRoundedCornersEnabled) {
        existing?.remove()
        return
    }

    let style = existing
    if (!(style instanceof HTMLStyleElement)) {
        style = document.createElement('style')
        style.id = RP_MORE_ROUNDED_CORNERS_STYLE_ID
        ;(document.head || document.documentElement).appendChild(style)
    }
    if (style.textContent !== MORE_ROUNDED_CORNERS_CSS) {
        style.textContent = MORE_ROUNDED_CORNERS_CSS
    }
}

registerFeature(syncMoreRoundedCorners)
