import { RP_SMALL_NEW_NAV_STYLE_ID, settingsState } from "../core/core.js";

/**
 * Add your small-sidebar overrides here (injected with the built-in width rules).
 * Leave empty to ship no custom rules.
 */
export const SMALL_NEW_NAV_CUSTOM_CSS = "";

const SMALL_NEW_NAV_BASE_CSS = [
	".width-\\[288px\\]:not(.roprime-settings-rail), .width-\\[289px\\]:not(.roprime-settings-rail),",
	'[class~="width-[288px]"]:not(.roprime-settings-rail), [class~="width-[289px]"]:not(.roprime-settings-rail)',
	"{ width: 200px !important; min-width: 0 !important; max-width: 200px !important; }",
].join("\n");

/** Short labels for the 200px sidebar rail. */
const SMALL_NAV_LABEL_REPLACEMENTS = [
	{ pattern: /official store/gi, replacement: "Store" },
	{ pattern: /buy gift cards/gi, replacement: "Gift Cards" },
];

function buildSmallNewNavStylesheet() {
	return [SMALL_NEW_NAV_BASE_CSS, SMALL_NEW_NAV_CUSTOM_CSS]
		.filter((chunk) => typeof chunk === "string" && chunk.trim())
		.join("\n");
}

function textNeedsSmallNavRename(text) {
	return SMALL_NAV_LABEL_REPLACEMENTS.some(({ pattern }) => pattern.test(text));
}

function applySmallNavLabelRenames(text) {
	let next = text;
	for (const { pattern, replacement } of SMALL_NAV_LABEL_REPLACEMENTS) {
		next = next.replace(pattern, replacement);
	}
	return next;
}

function restoreSmallNavSidebarLabels() {
	const nav = document.querySelector(".left-nav");
	if (!nav) return;

	nav.querySelectorAll("[data-rp-orig-aria-label]").forEach((el) => {
		const orig = el.getAttribute("data-rp-orig-aria-label");
		if (orig != null) el.setAttribute("aria-label", orig);
		el.removeAttribute("data-rp-orig-aria-label");
	});
	nav.querySelectorAll("[data-rp-orig-title]").forEach((el) => {
		const orig = el.getAttribute("data-rp-orig-title");
		if (orig != null) el.setAttribute("title", orig);
		el.removeAttribute("data-rp-orig-title");
	});

	const walker = document.createTreeWalker(nav, NodeFilter.SHOW_TEXT);
	let node = walker.nextNode();
	while (node) {
		const parent = node.parentElement;
		if (
			parent?.hasAttribute("data-rp-orig-text") &&
			typeof node.nodeValue === "string"
		) {
			node.nodeValue =
				parent.getAttribute("data-rp-orig-text") || node.nodeValue;
			parent.removeAttribute("data-rp-orig-text");
		}
		node = walker.nextNode();
	}
}

export function syncSmallNavSidebarRenames() {
	const nav = document.querySelector(".left-nav");
	if (!nav || !settingsState.smallNewNavigationBarEnabled) {
		restoreSmallNavSidebarLabels();
		return;
	}

	nav.querySelectorAll("a, button, span, p, div").forEach((el) => {
		if (!(el instanceof HTMLElement)) return;

		const aria = el.getAttribute("aria-label");
		if (aria && textNeedsSmallNavRename(aria)) {
			if (!el.hasAttribute("data-rp-orig-aria-label")) {
				el.setAttribute("data-rp-orig-aria-label", aria);
			}
			el.setAttribute(
				"aria-label",
				applySmallNavLabelRenames(
					el.getAttribute("data-rp-orig-aria-label") || aria,
				),
			);
		}

		const title = el.getAttribute("title");
		if (title && textNeedsSmallNavRename(title)) {
			if (!el.hasAttribute("data-rp-orig-title")) {
				el.setAttribute("data-rp-orig-title", title);
			}
			el.setAttribute(
				"title",
				applySmallNavLabelRenames(
					el.getAttribute("data-rp-orig-title") || title,
				),
			);
		}
	});

	const walker = document.createTreeWalker(nav, NodeFilter.SHOW_TEXT);
	let node = walker.nextNode();
	while (node) {
		const parent = node.parentElement;
		if (
			parent instanceof HTMLElement &&
			!["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName) &&
			typeof node.nodeValue === "string" &&
			textNeedsSmallNavRename(node.nodeValue)
		) {
			if (!parent.hasAttribute("data-rp-orig-text")) {
				parent.setAttribute("data-rp-orig-text", node.nodeValue);
			}
			const orig = parent.getAttribute("data-rp-orig-text") || node.nodeValue;
			node.nodeValue = applySmallNavLabelRenames(orig);
		}
		node = walker.nextNode();
	}
}

/** @deprecated Use syncSmallNavSidebarRenames */
export const syncOfficialStoreSidebarRename = syncSmallNavSidebarRenames;

export function updateSmallNewNavVisibility() {
	const existingStyle = document.getElementById(RP_SMALL_NEW_NAV_STYLE_ID);
	if (!settingsState.smallNewNavigationBarEnabled) {
		if (existingStyle instanceof HTMLStyleElement) existingStyle.remove();
		restoreSmallNavSidebarLabels();
		return;
	}

	const css = buildSmallNewNavStylesheet();
	if (existingStyle instanceof HTMLStyleElement) {
		if (existingStyle.textContent !== css) existingStyle.textContent = css;
		syncSmallNavSidebarRenames();
		return;
	}

	syncSmallNavSidebarRenames();

	const style = document.createElement("style");
	style.id = RP_SMALL_NEW_NAV_STYLE_ID;
	style.textContent = css;
	document.documentElement.appendChild(style);
}
