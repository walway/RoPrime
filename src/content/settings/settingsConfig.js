/**
 * Use { type: "separator" } inside a card's items to add a separator.
 * Use { type: "navDivider" } to add a divider in the vertical menu.
 */

export const SETTINGS_CONFIG = {
  info: {
    title: "settings.nav.info",
    icon: "info",
    items: [
      {
        type: "panel",
        id: "infoBlock",
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
      },
      {
        type: "panel",
        id: "settingsSync",
      },
      {
        type: "card",
        id: "notifications",
        title: "settings.notifications.title",
        items: [
          {
            type: "toggle",
            key: "updateNotificationsEnabled",
            title: "settings.notifications.update.title",
            description: "settings.notifications.update.description",
            byDefault: true,
            hideWhenStoreInstall: true,
          },
        ],
      },
    ],
  },
  navDividerAfterSettings: {
    type: "navDivider",
  },
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
        skipI18n: true,
        literalTitle: "Communities → Groups",
      },
      {
        type: "toggle",
        key: "renameMarketplaceToCatalog",
        title: "settings.appearance.rename.marketplace",
        byDefault: true,
        parent: "renameDropdownEnabled",
        skipI18n: true,
        literalTitle: "Marketplace → Catalog",
      },
      {
        type: "toggle",
        key: "renameChartsToDiscover",
        title: "settings.appearance.rename.charts",
        byDefault: true,
        parent: "renameDropdownEnabled",
        skipI18n: true,
        literalTitle: "Charts → Discover",
      },
      {
        type: "toggle",
        key: "renameExperiencesToGames",
        title: "settings.appearance.rename.experiences",
        byDefault: true,
        parent: "renameDropdownEnabled",
        skipI18n: true,
        literalTitle: "Experiences → Games",
      },
      {
        type: "card",
        id: "sidebar",
        title: "settings.appearance.sidebar.title",
        items: [
          {
            type: "sidebarSize",
            title: "settings.appearance.sidebar.sizeTitle",
            description: "settings.appearance.sidebar.sizeDescription",
          },
          { type: "separator" },
          {
            type: "sidebarContent",
            title: "settings.appearance.sidebar.contentTitle",
            button: "settings.appearance.sidebar.configureContent",
          },
          { type: "separator" },
          {
            type: "toggle",
            key: "sidebarCollapseMenuEnabled",
            title: "settings.appearance.sidebar.collapseMenuTitle",
            description: "settings.appearance.sidebar.collapseMenuDescription",
            byDefault: false,
            exclusiveWith:
              "alwaysShowCloseButtonEnabled, expandSidebarOnHoverEnabled",
          },
          {
            type: "toggle",
            key: "alwaysShowCloseButtonEnabled",
            title: "settings.appearance.sidebar.alwaysShowCloseTitle",
            description:
              "settings.appearance.sidebar.alwaysShowCloseDescription",
            byDefault: false,
            exclusiveWith:
              "sidebarCollapseMenuEnabled, expandSidebarOnHoverEnabled",
          },
          {
            type: "toggle",
            key: "expandSidebarOnHoverEnabled",
            title: "settings.appearance.sidebar.expandSidebarOnHover",
            description:
              "settings.appearance.sidebar.expandSidebarOnHoverDescription",
            byDefault: false,
            exclusiveWith:
              "alwaysShowCloseButtonEnabled, sidebarCollapseMenuEnabled",
          },
          { type: "separator" },
          {
            type: "toggle",
            key: "oldNavigationBarEnabled",
            title: "settings.appearance.oldNavigation.title",
            description: "settings.appearance.oldNavigation.description",
            byDefault: false,
          },
          {
            type: "toggle",
            key: "robloxEventsEnabled",
            title: "settings.appearance.sidebar.eventsTitle",
            description: "settings.appearance.sidebar.eventsDescription",
            byDefault: true,
          },
        ],
      },
      {
        type: "toggle",
        key: "moreRoundedCornersEnabled",
        title: "settings.appearance.moreRoundedCorners.title",
        description: "settings.appearance.moreRoundedCorners.description",
        byDefault: true,
      },
      {
        type: "toggle",
        key: "friendStylingReimagnedEnabled",
        title: "settings.appearance.friendStyling.title",
        description: "settings.appearance.friendStyling.description",
        byDefault: false,
        hide: true,
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
  developer: {
    title: "settings.nav.developer",
    icon: "code",
    hide: true,
    items: [
      {
        type: "panel",
        id: "developerBlock",
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
      },
      {
        type: "panel",
        id: "sidebarContentList",
      },
    ],
  },
};

function walkConfigItems(items, visit) {
  for (const item of items || []) {
    visit(item);
    if (item.type === "card" && Array.isArray(item.items)) {
      walkConfigItems(item.items, visit);
    }
  }
}

/** Export byDefault values (including toggles nested under cards). */
export function collectToggleDefaults() {
  const defaults = {};
  for (const page of Object.values(SETTINGS_CONFIG)) {
    if (page?.type === "navDivider") continue;
    walkConfigItems(page.items, (item) => {
      if (item.type === "toggle" && typeof item.key === "string") {
        defaults[item.key] = !!item.byDefault;
      }
    });
  }
  return defaults;
}
