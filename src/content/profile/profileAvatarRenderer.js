import { getExtensionResourceUrl } from "../core/core.js";
import { parseUserProfileIdFromLocation } from "../core/core.js";

const RP_PROFILE_TAB_CONTENT_ATTR = "data-roprime-profile-tab-content";
const RP_AVATAR_PREVIEW_ATTR = "data-roprime-avatar-preview";

let modulePromise = null;

function loadAvatarPreviewModule() {
  if (!modulePromise) {
    modulePromise = (async () => {
      const url = getExtensionResourceUrl("avatar-preview.js");
      if (!url) throw new Error("Missing avatar-preview.js URL");
      return import(url);
    })();
  }
  return modulePromise;
}

export function findProfilePlatformInner() {
  const platform = document.querySelector(".profile-platform-container");
  if (!(platform instanceof HTMLElement)) return null;
  const outer = platform.querySelector(":scope > div");
  if (!(outer instanceof HTMLElement)) return null;
  const inner = outer.querySelector(":scope > div");
  return inner instanceof HTMLElement ? inner : null;
}

export function findRoPrimeProfileTabContent() {
  return document.querySelector(`[${RP_PROFILE_TAB_CONTENT_ATTR}]`);
}

export function ensureRoPrimeProfileTabContent() {
  const host = findProfilePlatformInner();
  if (!host) return null;

  let tabContent = findRoPrimeProfileTabContent();
  if (!(tabContent instanceof HTMLElement)) {
    tabContent = document.createElement("div");
    tabContent.className = "profile-tab-content padding-top-xxlarge";
    tabContent.setAttribute(RP_PROFILE_TAB_CONTENT_ATTR, "1");
    host.appendChild(tabContent);
  }

  let preview = tabContent.querySelector(`[${RP_AVATAR_PREVIEW_ATTR}]`);
  if (!(preview instanceof HTMLElement)) {
    preview = document.createElement("div");
    preview.className = "roprime-profile-avatar-preview profile-avatar-background-empty-state";
    preview.setAttribute(RP_AVATAR_PREVIEW_ATTR, "1");
    tabContent.prepend(preview);
  }
  preview.style.setProperty(
    "--empty-state-image-light",
    'url("https://assetdelivery.roblox.com/v1/asset/?id=97634835410357")',
  );
  preview.style.setProperty(
    "--empty-state-image-dark",
    'url("https://assetdelivery.roblox.com/v1/asset/?id=76787651008882")',
  );

  return tabContent;
}

export function removeRoPrimeProfileTabContent() {
  document.querySelector(`[${RP_PROFILE_TAB_CONTENT_ATTR}]`)?.remove();
  void (async () => {
    try {
      const mod = await loadAvatarPreviewModule();
      await mod.unmountAvatarPreview();
    } catch {
    }
  })();
  modulePromise = null;
}

export async function syncProfileAvatarRenderer() {
  const tabContent = ensureRoPrimeProfileTabContent();
  if (!tabContent) return;

  const preview = tabContent.querySelector(`[${RP_AVATAR_PREVIEW_ATTR}]`);
  if (!(preview instanceof HTMLElement)) return;
  if (preview.dataset.roprimeAvatarMounted === "1") return;
  if (preview.dataset.roprimeAvatarMounting === "1") return;

  const userId = parseUserProfileIdFromLocation();
  if (!userId) return;

  preview.dataset.roprimeAvatarMounting = "1";
  try {
    const mod = await loadAvatarPreviewModule();
    const ok = await mod.mountAvatarPreview(preview, userId);
    if (ok) {
      preview.dataset.roprimeAvatarMounted = "1";
    } else {
      delete preview.dataset.roprimeAvatarMounting;
    }
  } catch (error) {
    console.warn("Profile avatar preview failed", error);
    delete preview.dataset.roprimeAvatarMounting;
  } finally {
    if (preview.dataset.roprimeAvatarMounted === "1") {
      delete preview.dataset.roprimeAvatarMounting;
    }
  }
}
