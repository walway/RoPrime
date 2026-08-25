/**
 *
 * To add a feature:
 * 1. Add a toggle below (key, title, description?, byDefault).
 * 2. Create a feature module that calls registerFeature(yourSyncFn).
 * 3. Import that module from src/content/index.js.
 *
 */

export const SETTINGS_CONFIG = {
  appearance: {
    title: "settings.nav.appearance",
    icon: "palette",
    items: [
      {
        type: "toggle",
        key: "renameDropdownEnabled",
        title: "settings.appearance.rename.title",
        byDefault: true,
      },
      {
        type: "toggle",
        key: "renameCommunitiesToGroups",
        title: "settings.appearance.rename.communities",
        byDefault: true,
        parent: "renameDropdownEnabled",
      },
      {
        type: "toggle",
        key: "renameMarketplaceToCatalog",
        title: "settings.appearance.rename.marketplace",
        byDefault: true,
        parent: "renameDropdownEnabled",
      },
      { 
        type: "panel", 
        id: "sidebar",
        hide: true,
      },
      {
        type: "toggle",
        key: "friendStylingReimagnedEnabled",
        title: "settings.appearance.friendStyling.title",
        description: "settings.appearance.friendStyling.description",
        byDefault: false,
      },
      {
        type: "toggle",
        key: "hideAgeBadgeEnabled",
        title: "settings.appearance.hideAgeBadge.title",
        description: "settings.appearance.hideAgeBadge.description",
        byDefault: true,
      },
      {
        type: "toggle",
        key: "profileRedesignEnabled",
        title: "settings.appearance.profileRedesign.title",
        description: "settings.appearance.profileRedesign.description",
        byDefault: false,
      },
    ],
  },
  home: {
    title: "settings.nav.home",
    icon: "home",
    items: [
      {
        type: "toggle",
        key: "hideExperiencesAdsEnabled",
        title: "settings.home.hideExperiencesAds.title",
        byDefault: false,
      },
    ],
  },
  "sidebar-content": {
    title: "settings.sidebar.content.listTitle",
    nav: false,
    items: [
      { 
        type: "panel", 
        id: "sidebarContentBack",
        hide: true,
      },
      { 
        type: "panel", 
        id: "sidebarContentList",
        hide: true,
      },
    ],
  },
  settings: {
    title: "settings.nav.settings",
    icon: "settings",
    items: [
      { 
        type: "panel", 
        id: "language",
        hide: true,
      },
      { 
        type: "panel", 
        id: "settingsSync",
        hide: true,
      },
    ],
  },
  privacy: {
    title: "settings.nav.privacy",
    icon: "shield",
    items: [
      {
        type: "toggle",
        key: "searchBanEnabled",
        title: "settings.privacy.searchBan.enableTitle",
        description: "settings.privacy.searchBan.enableDescription",
        byDefault: false,
      },
      { type: "panel", id: "searchBan" },
    ],
  },
  other: {
    title: "settings.nav.other",
    icon: "extension",
    items: [
      { type: "panel", id: "customCss" },
      {
        type: "toggle",
        key: "cosmeticsEnabled",
        title: "settings.other.cosmetics.enableTitle",
        description: "settings.other.cosmetics.enableDescription",
        byDefault: false,
        hide: true,
      },
      { 
        type: "panel", 
        id: "cosmeticsShop", 
        hide: true,
      },
    ],
  },
  info: {
    title: "settings.nav.info",
    icon: "info",
    items: [{ 
      type: "panel", 
      id: "infoBlock",
      hide: true,
    }],
  },
  developer: {
    title: "settings.nav.developer",
    icon: "code",
    hide: true,
    items: [{ 
      type: "panel", 
      id: "developerBlock",
      hide: true,
    }],
  },
};

/* Export byDefault values */
export function collectToggleDefaults() {
  const defaults = {};
  for (const page of Object.values(SETTINGS_CONFIG)) {
    for (const item of page.items || []) {
      if (item.type === "toggle" && typeof item.key === "string") {
        defaults[item.key] = !!item.byDefault;
      }
    }
  }
  return defaults;
}
