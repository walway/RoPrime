const PROFILE_EFFECT_CDN_BASE = "https://walway.github.io/cdn/index.html";

export function getProfileEffectCdnName(effect) {
  if (!effect) return "";
  if (effect.cdnEffect) return String(effect.cdnEffect);
  const id = String(effect.id || "");
  return id.replace(/\d+$/, "") || id;
}

export function getProfileEffectCdnEmbedSrc(
  effect,
  query = null,
  target = "profile",
) {
  const name = getProfileEffectCdnName(effect);
  const url = new URL(PROFILE_EFFECT_CDN_BASE);
  if (name) url.searchParams.set("effect", name);
  const resolvedTarget =
    target === "settings"
      ? "settings"
      : target === "picture"
        ? "picture"
        : "profile";
  url.searchParams.set("target", resolvedTarget);
  url.searchParams.set("source", "iframe");
  if (query && typeof query === "object") {
    for (const [key, value] of Object.entries(query)) {
      if (value == null || value === "") continue;
      url.searchParams.set(String(key), String(value));
    }
  }
  return url.toString();
}

export const PROFILE_EFFECT_IFRAME_TRANSPARENT_ATTRS =
  'allowtransparency="true" style="background:transparent;background-color:transparent"';

export function configureProfileEffectIframe(iframe) {
  iframe.setAttribute("allowtransparency", "true");
  iframe.setAttribute("frameborder", "0");
  iframe.setAttribute("scrolling", "no");
  iframe.style.background = "transparent";
  iframe.style.backgroundColor = "transparent";
}

export function applyProfileEffectIframeTransparentAttrs(iframe) {
  configureProfileEffectIframe(iframe);
}

export const PROFILE_PICTURE_EFFECTS = [
  {
    id: "dizzy",
    kind: "picture",
    titleKey: "settings.profileEffects.dizzy",
  },
];

export const PROFILE_EFFECTS = [
  {
    id: "clockwork",
    kind: "profile",
    titleKey: "settings.profileEffects.clockwork",
  },
  {
    id: "heartbroken",
    kind: "profile",
    titleKey: "settings.profileEffects.heartbroken",
  },
  {
    id: "highvoltage",
    kind: "profile",
    titleKey: "settings.profileEffects.highvoltage",
  },
  {
    id: "laughing",
    kind: "profile",
    titleKey: "settings.profileEffects.laughing",
  },
  {
    id: "monkeys",
    kind: "profile",
    titleKey: "settings.profileEffects.monkeys",
  },
  {
    id: "neutral",
    kind: "profile",
    titleKey: "settings.profileEffects.neutral",
  },
  {
    id: "supersnow",
    kind: "profile",
    titleKey: "settings.profileEffects.supersnow",
  },
  {
    id: "trophy",
    kind: "profile",
    titleKey: "settings.profileEffects.trophy",
  },
  {
    id: "ufo",
    kind: "profile",
    titleKey: "settings.profileEffects.ufo",
  },
];

export function getProfileEffectsCatalog() {
  return [...PROFILE_PICTURE_EFFECTS, ...PROFILE_EFFECTS];
}

export function getAllProfileEffectIds() {
  return getProfileEffectsCatalog().map((effect) => effect.id);
}

export function getProfileEffectById(effectId) {
  return (
    getProfileEffectsCatalog().find((effect) => effect.id === effectId) || null
  );
}

export function getProfileEffectsByKind(kind) {
  return getProfileEffectsCatalog().filter((effect) => effect.kind === kind);
}

export function getProfileEffectShopEmbedSrc(effect) {
  return getProfileEffectCdnEmbedSrc(effect, null, "settings");
}

export function getProfileEffectProfileEmbedSrc(effect) {
  if (effect?.kind === "profile") {
    return getProfileEffectCdnEmbedSrc(effect, {
      loop: "0",
      cooldown: "5000",
      replayDelay: "5000",
    });
  }
  if (effect?.kind === "picture") {
    return getProfileEffectCdnEmbedSrc(effect, null, "picture");
  }
  return getProfileEffectCdnEmbedSrc(effect, null, "profile");
}
