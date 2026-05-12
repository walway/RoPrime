import { isExtensionContextAlive, shouldRunRoPrimeOnCurrentPage } from "./core.js";

/** Injected before `style.css` loads so game UI (e.g. carousels) picks up rules at first paint. */
export const RP_EARLY_PAGE_COSMETICS_STYLE_ID = "roprime-early-page-cosmetics";

const EARLY_PAGE_COSMETICS_CSS = `
.game-details-carousel-container .carousel-item {
  border-radius: 12px;
}
`.trim();

/**
 * Idempotent: appends a small `<style>` with global cosmetics when RoPrime is allowed on this page.
 * Imported first from `content.entry.js` so it runs at `document_start` before `DOMContentLoaded` bootstrap.
 */
export function syncEarlyPageCosmetics() {
    try {
        if (!isExtensionContextAlive() || !shouldRunRoPrimeOnCurrentPage()) {
            document.getElementById(RP_EARLY_PAGE_COSMETICS_STYLE_ID)?.remove();
            return;
        }
        if (document.getElementById(RP_EARLY_PAGE_COSMETICS_STYLE_ID)) return;
        if (typeof document === "undefined" || !document.documentElement) return;
        const el = document.createElement("style");
        el.id = RP_EARLY_PAGE_COSMETICS_STYLE_ID;
        el.textContent = EARLY_PAGE_COSMETICS_CSS;
        document.documentElement.appendChild(el);
    } catch {
        /* ignore */
    }
}

/** Same idea as the gear dropdown: prefetch on pointer so rules exist before the next paint after interaction. */
let pointerPrefetchInstalled = false;
function installPointerPrefetch() {
    if (pointerPrefetchInstalled) return;
    pointerPrefetchInstalled = true;
    document.addEventListener(
        "pointerdown",
        () => {
            syncEarlyPageCosmetics();
        },
        true,
    );
}

syncEarlyPageCosmetics();
installPointerPrefetch();
