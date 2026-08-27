import { RP_SETTINGS_INNER_ID, settingsState } from "../core/core.js";
import { debounce } from "../core/debounce.js";

const RENAME_DEBOUNCE_MS = 500;
let renameObserver = null;
const applyAllRenames = debounce(() => {
  applyCommunityRename(document.body);
  applyMarketplaceRename(document.body);
  applyChartsRename(document.body);
  applyExperiencesRename(document.body);
}, RENAME_DEBOUNCE_MS);

function renameCommunityText(text) {
  return text
    .replace(/\bCommunities\b/g, "Groups")
    .replace(/\bcommunities\b/g, "groups")
    .replace(/\bCommunity\b/g, "Group")
    .replace(/\bcommunity\b/g, "group");
}

function renameGroupsBackText(text) {
  return text
    .replace(/\bGroups\b/g, "Communities")
    .replace(/\bgroups\b/g, "communities")
    .replace(/\bGroup\b/g, "Community")
    .replace(/\bgroup\b/g, "community");
}

function renameMarketplaceText(text) {
  return text
    .replace(/\bMarketplace\b/g, "Catalog")
    .replace(/\bmarketplace\b/g, "catalog");
}

function renameCatalogBackText(text) {
  return text
    .replace(/\bCatalog\b/g, "Marketplace")
    .replace(/\bcatalog\b/g, "marketplace");
}

function renameChartsText(text) {
  return text
    .replace(/\bCharts\b/g, "Discover")
    .replace(/\bcharts\b/g, "discover");
}

function renameDiscoverBackText(text) {
  return text
    .replace(/\bDiscover\b/g, "Charts")
    .replace(/\bdiscover\b/g, "charts");
}

function renameExperiencesText(text) {
  return text
    .replace(/\bExperiences\b/g, "Games")
    .replace(/\bexperiences\b/g, "games")
    .replace(/\bExperience\b/g, "Game")
    .replace(/\bexperience\b/g, "game");
}

function renameGamesBackText(text) {
  return text
    .replace(/\bGames\b/g, "Experiences")
    .replace(/\bgames\b/g, "experiences")
    .replace(/\bGame\b/g, "Experience")
    .replace(/\bgame\b/g, "experience");
}

function shouldSkipNode(node) {
  if (!(node.parentElement instanceof HTMLElement)) return true;
  const tag = node.parentElement.tagName;
  if (
    tag === "SCRIPT" ||
    tag === "STYLE" ||
    tag === "NOSCRIPT" ||
    tag === "TEXTAREA"
  )
    return true;
  if (
    node.parentElement.closest(
      `#${RP_SETTINGS_INNER_ID}, #roprime-settings-host, #react-user-account-base`,
    )
  )
    return true;
  return false;
}

function applyTextTransform(rootNode, transform, shouldApply = true) {
  if (!shouldApply) return;
  if (!(rootNode instanceof Node)) return;
  const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT);
  let currentNode = walker.nextNode();
  while (currentNode) {
    if (
      !shouldSkipNode(currentNode) &&
      typeof currentNode.nodeValue === "string"
    ) {
      const original = currentNode.nodeValue;
      const renamed = transform(original);
      if (renamed !== original) currentNode.nodeValue = renamed;
    }
    currentNode = walker.nextNode();
  }
}

export function applyMarketplaceRename(rootNode) {
  applyTextTransform(
    rootNode,
    renameMarketplaceText,
    settingsState.renameDropdownEnabled &&
      settingsState.renameMarketplaceToCatalog,
  );
}

export function applyCatalogBackRename(rootNode) {
  applyTextTransform(rootNode, renameCatalogBackText, true);
}

export function applyCommunityRename(rootNode) {
  applyTextTransform(
    rootNode,
    renameCommunityText,
    settingsState.renameDropdownEnabled &&
      settingsState.renameCommunitiesToGroups,
  );
}

export function applyGroupsBackRename(rootNode) {
  applyTextTransform(rootNode, renameGroupsBackText, true);
}

export function applyChartsRename(rootNode) {
  applyTextTransform(
    rootNode,
    renameChartsText,
    settingsState.renameDropdownEnabled &&
      settingsState.renameChartsToDiscover,
  );
}

export function applyDiscoverBackRename(rootNode) {
  applyTextTransform(rootNode, renameDiscoverBackText, true);
}

export function applyExperiencesRename(rootNode) {
  applyTextTransform(
    rootNode,
    renameExperiencesText,
    settingsState.renameDropdownEnabled &&
      settingsState.renameExperiencesToGames,
  );
}

export function applyGamesBackRename(rootNode) {
  applyTextTransform(rootNode, renameGamesBackText, true);
}

function anyRenameChildEnabled() {
  return (
    settingsState.renameCommunitiesToGroups ||
    settingsState.renameMarketplaceToCatalog ||
    settingsState.renameChartsToDiscover ||
    settingsState.renameExperiencesToGames
  );
}

function startRenameObserver() {
  if (renameObserver) return;
  renameObserver = new MutationObserver(() => {
    applyAllRenames();
  });
  const start = () => {
    if (!document.body) return;
    renameObserver.observe(document.body, { childList: true, subtree: true });
    applyCommunityRename(document.body);
    applyMarketplaceRename(document.body);
    applyChartsRename(document.body);
    applyExperiencesRename(document.body);
  };
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
}

function stopRenameObserver() {
  applyAllRenames.cancel();
  renameObserver?.disconnect();
  renameObserver = null;
}

export function updateRenameLoop() {
  if (settingsState.renameDropdownEnabled && anyRenameChildEnabled()) {
    startRenameObserver();
    return;
  }
  stopRenameObserver();
}

export function stopRenameLoop() {
  stopRenameObserver();
}

import { registerFeature } from "./registry.js";
registerFeature(updateRenameLoop);
