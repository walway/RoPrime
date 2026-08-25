/** Locale keys for sidebar */
export const SIDEBAR_ITEM_LABEL_KEYS = {
  "profile-with-avatar": "settings.sidebar.item.profileWithAvatar",
  home: "settings.sidebar.item.home",
  messages: "settings.sidebar.item.messages",
  friends: "settings.sidebar.item.friends",
  avatar: "settings.sidebar.item.avatar",
  inventory: "settings.sidebar.item.inventory",
  trades: "settings.sidebar.item.trades",
  communities: "settings.sidebar.item.communities",
  blog: "settings.sidebar.item.blog",
  "buy-gift-cards": "settings.sidebar.item.buyGiftCards",
  "official-store-button": "settings.sidebar.item.officialStoreButton",
  "profile-no-avatar": "settings.sidebar.item.profileNoAvatar",
  "roblox-plus": "settings.sidebar.item.robloxPlus",
  favorites: "settings.sidebar.item.favorites",
  "roblox-plus-ad": "settings.sidebar.item.robloxPlusAd",
  "game-events": "settings.sidebar.item.gameEvents",
};

export function sidebarItemLabelKey(itemId) {
  return (
    SIDEBAR_ITEM_LABEL_KEYS[itemId] ||
    `settings.sidebar.item.${String(itemId || "")}`
  );
}
