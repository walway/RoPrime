import { settingsState, shouldRunRoPrimeOnCurrentPage } from "../core/core.js";
import { debounce } from "../core/debounce.js";
import { isUserProfilePage } from "./profileEffectsDisplay.js";

export const RP_PROFILE_REDESIGN_STYLE_ID = "roprime-profile-redesign-style";

const BUBBLE_SELECTOR = ".rovalra-status-bubble";
const BUBBLE_LENGTH_VAR = "--rovalra-bubble-length";

const PROFILE_REDESIGN_CSS = `
.currently-wearing-avatar-with-background {
  display: none !important;
}

.currently-wearing-avatar-with-background + .profile-header-overlay {
  margin-top: calc(70px + (var(${BUBBLE_LENGTH_VAR}, 0) * 10px)) !important;
}

.profile-tabs {
  display: none !important;
}

.profile-tab-content {
  display: block !important;
}

.tab-pane {
  display: block !important;
}
`;

let observer = null;
const scheduleBubbleSync = debounce(syncBubbleLength, 100);

function countBubbleLines(element) {
  const view = element.ownerDocument?.defaultView;
  if (!view) return 0;

  const computed = view.getComputedStyle(element, null);
  const lineHeightValue = computed.getPropertyValue("line-height");
  let lineHeight = parseFloat(lineHeightValue);
  if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
    const fontSize = parseFloat(computed.getPropertyValue("font-size"));
    lineHeight = Number.isFinite(fontSize) ? fontSize * 1.2 : 16;
  }

  const height = element.getBoundingClientRect().height;
  if (height <= 0) return 0;

  return Math.max(1, Math.round(height / lineHeight));
}

function syncBubbleLength() {
  if (!settingsState.profileRedesignEnabled) {
    document.documentElement.style.removeProperty(BUBBLE_LENGTH_VAR);
    return;
  }

  const bubble = document.querySelector(BUBBLE_SELECTOR);
  if (!bubble) {
    document.documentElement.style.setProperty(BUBBLE_LENGTH_VAR, "0");
    return;
  }

  document.documentElement.style.setProperty(
    BUBBLE_LENGTH_VAR,
    String(countBubbleLines(bubble)),
  );
}

function removeProfileRedesignStyle() {
  document.getElementById(RP_PROFILE_REDESIGN_STYLE_ID)?.remove();
  document.documentElement.style.removeProperty(BUBBLE_LENGTH_VAR);
}

function injectProfileRedesignStyle() {
  let style = document.getElementById(RP_PROFILE_REDESIGN_STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = RP_PROFILE_REDESIGN_STYLE_ID;
    document.documentElement.appendChild(style);
  }
  style.textContent = PROFILE_REDESIGN_CSS;
}

export function syncProfileRedesign() {
  if (
    !shouldRunRoPrimeOnCurrentPage() ||
    !isUserProfilePage() ||
    !settingsState.profileRedesignEnabled
  ) {
    disconnectObserver();
    return;
  }

  if (observer) {
    injectProfileRedesignStyle();
    syncBubbleLength();
    return;
  }

  connectObserver();
}

function disconnectObserver() {
  scheduleBubbleSync.cancel();
  observer?.disconnect();
  observer = null;
  removeProfileRedesignStyle();
}

function connectObserver() {
  if (observer) return;

  observer = new MutationObserver(() => {
    scheduleBubbleSync();
  });

  if (!document.body) return;

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  injectProfileRedesignStyle();
  syncBubbleLength();
}

function syncObserverForRoute() {
  syncProfileRedesign();
}

export function installProfileRedesignObserver() {
  if (installProfileRedesignObserver.installed) return;
  installProfileRedesignObserver.installed = true;

  const onRoute = () => {
    syncObserverForRoute();
  };

  window.addEventListener("roprime-location-change", onRoute);
  window.addEventListener("popstate", onRoute);

  if (document.body) syncObserverForRoute();
  else {
    document.addEventListener("DOMContentLoaded", syncObserverForRoute, {
      once: true,
    });
  }
}
