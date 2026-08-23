export const SETTINGS_CONFIG = {
  design: {
    labelKey: "Nav tab design",
    titleKey: "Nav tab design",
    items: [
      {
        type: "toggle",
        id: "roprime-toggle-rename-master",
        key: "renameDropdownEnabled",
        titleKey: "Rename wording section title",
        onChange: ["updateRenameLoop", "syncRoEliteView"],
      },
      {
        type: "toggle",
        id: "roprime-toggle-rename-communities",
        key: "renameCommunitiesToGroups",
        titleKey: "Rename communities label",
        onChange: ["updateRenameLoop", "syncRoEliteView"],
        renameChild: true,
      },
      {
        type: "toggle",
        id: "roprime-toggle-rename-marketplace",
        key: "renameMarketplaceToCatalog",
        titleKey: "Rename marketplace label",
        onChange: ["updateRenameLoop", "syncRoEliteView"],
        renameChild: true,
      },
      { type: "custom", builder: "sidebarPanel" },
      {
        type: "toggle",
        id: "roprime-toggle-friend-styling-reimagned",
        key: "friendStylingReimagnedEnabled",
        titleKey: "Friend styling title",
        descKey: "Friend styling description",
        onChange: ["syncRoEliteView"],
      },
      {
        type: "toggle",
        id: "roprime-toggle-hide-age-badge",
        key: "hideAgeBadgeEnabled",
        titleKey: "Hide age badge title",
        descKey: "Hide age badge description",
        onChange: ["syncRoEliteView"],
      },
      {
        type: "toggle",
        id: "roprime-toggle-profile-redesign",
        key: "profileRedesignEnabled",
        titleKey: "Profile redesign title",
        descKey: "Profile redesign description",
        onChange: ["syncProfileRedesign"],
      },
    ],
  },
  home: {
    labelKey: "Nav tab home",
    titleKey: "Nav tab home",
    items: [
      {
        type: "toggle",
        id: "roprime-toggle-hide-experiences-ads",
        key: "hideExperiencesAdsEnabled",
        titleKey: "Hide experiences ads title",
        onChange: ["syncHideExperiencesAds"],
      },
    ],
  },
  "sidebar-content": {
    titleKey: "Sidebar content list title",
    items: [
      { type: "custom", builder: "sidebarContentBack" },
      { type: "custom", builder: "sidebarContentList" },
    ],
  },
  settings: {
    labelKey: "Nav tab settings",
    titleKey: "Nav tab settings",
    items: [
      { type: "custom", builder: "language" },
      { type: "custom", builder: "settingsSync" },
    ],
  },
  privacy: {
    labelKey: "Nav tab privacy",
    titleKey: "Nav tab privacy",
    items: [
      {
        type: "toggle",
        id: "roprime-toggle-search-ban",
        key: "searchBanEnabled",
        titleKey: "Search ban enable title",
        descKey: "Search ban enable description",
        onChange: ["syncSearchBan"],
      },
      { type: "custom", builder: "searchBan" },
    ],
  },
  other: {
    labelKey: "Nav tab other",
    titleKey: "Nav tab other",
    items: [
      { type: "custom", builder: "customCss" },
      {
        type: "toggle",
        id: "roprime-toggle-cosmetics-enabled",
        key: "cosmeticsEnabled",
        titleKey: "Enable cosmetics title",
        descKey: "Enable cosmetics description",
        onChange: ["syncCosmeticsUi"],
        hidden: true,
      },
      { type: "custom", builder: "cosmeticsShop", hidden: true },
    ],
  },
  info: {
    labelKey: "Nav tab info",
    titleKey: "Nav tab info",
    items: [{ type: "custom", builder: "infoBlock" }],
  },
  developer: {
    labelKey: "Nav tab developer",
    titleKey: "Nav tab developer",
    hidden: true,
    items: [{ type: "custom", builder: "developerBlock" }],
  },
};
