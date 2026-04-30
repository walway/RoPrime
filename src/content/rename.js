import {
    RP_PANE_ID,
    RP_STANDALONE_ID,
    renameIntervalId,
    setRenameIntervalId,
    settingsState,
} from "./core.js";

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

function renameMarketplaceText(text) {
    return text.replace(/\bMarketplace\b/g, "Catalog").replace(/\bmarketplace\b/g, "catalog");
}

function renameAvatarShopBackText(text) {
    return text.replace(/\bCatalog\b/g, "Marketplace").replace(/\bcatalog\b/g, "marketplace");
}

function shouldSkipNode(node) {
    if (!(node.parentElement instanceof HTMLElement)) return true;
    const tag = node.parentElement.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "TEXTAREA") return true;
    if (node.parentElement.closest(`#${RP_PANE_ID}`)) return true;
    if (node.parentElement.closest(`#${RP_STANDALONE_ID}`)) return true;
    return false;
}

function applyTextTransform(rootNode, transform, shouldApply = true) {
    if (!shouldApply) return;
    if (!(rootNode instanceof Node)) return;
    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT);
    let currentNode = walker.nextNode();
    while (currentNode) {
        if (!shouldSkipNode(currentNode) && typeof currentNode.nodeValue === "string") {
            const original = currentNode.nodeValue;
            const renamed = transform(original);
            if (renamed !== original) currentNode.nodeValue = renamed;
        }
        currentNode = walker.nextNode();
    }
}

export function applyMarketplaceRename(rootNode) {
    applyTextTransform(rootNode, renameMarketplaceText, settingsState.renameMarketplaceToAvatarShop);
}

export function applyAvatarShopBackRename(rootNode) {
    applyTextTransform(rootNode, renameAvatarShopBackText, true);
}

export function applyCommunityRename(rootNode) {
    applyTextTransform(rootNode, renameCommunityText, settingsState.renameCommunitiesToGroups);
}

export function applyGroupsBackRename(rootNode) {
    applyTextTransform(rootNode, renameGroupsBackText, true);
}

export function applyExperiencesRename(rootNode) {
    applyTextTransform(rootNode, renameExperiencesText, settingsState.renameExperiencesToGames);
}

export function applyGamesBackRename(rootNode) {
    applyTextTransform(rootNode, renameGamesBackText, true);
}

export function updateRenameLoop() {
    if (
        settingsState.renameDropdownEnabled &&
        (settingsState.renameCommunitiesToGroups ||
            settingsState.renameExperiencesToGames ||
            settingsState.renameMarketplaceToAvatarShop)
    ) {
        if (renameIntervalId === null) {
            setRenameIntervalId(
                window.setInterval(() => {
                    applyCommunityRename(document.body);
                    applyExperiencesRename(document.body);
                    applyMarketplaceRename(document.body);
                }, 1500),
            );
        }
        return;
    }

    if (renameIntervalId !== null) {
        window.clearInterval(renameIntervalId);
        setRenameIntervalId(null);
    }
}

export function stopRenameLoop() {
    if (renameIntervalId !== null) {
        window.clearInterval(renameIntervalId);
        setRenameIntervalId(null);
    }
}
