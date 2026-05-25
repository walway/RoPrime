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

function buildSmallNewNavStylesheet() {
	return [SMALL_NEW_NAV_BASE_CSS, SMALL_NEW_NAV_CUSTOM_CSS]
		.filter((chunk) => typeof chunk === "string" && chunk.trim())
		.join("\n");
}

function restoreOfficialStoreSidebarLabels() {
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
			node.nodeValue = parent.getAttribute("data-rp-orig-text") || node.nodeValue;
			parent.removeAttribute("data-rp-orig-text");
		}
		node = walker.nextNode();
	}
}

export function syncOfficialStoreSidebarRename() {
	const nav = document.querySelector(".left-nav");
	if (!nav || !settingsState.smallNewNavigationBarEnabled) {
		restoreOfficialStoreSidebarLabels();
		return;
	}

	nav.querySelectorAll("a, button, span, p, div").forEach((el) => {
		if (!(el instanceof HTMLElement)) return;

		const aria = el.getAttribute("aria-label");
		if (aria && /official store/i.test(aria)) {
			if (!el.hasAttribute("data-rp-orig-aria-label")) {
				el.setAttribute("data-rp-orig-aria-label", aria);
			}
			el.setAttribute("aria-label", aria.replace(/official store/gi, "Store"));
		}

		const title = el.getAttribute("title");
		if (title && /official store/i.test(title)) {
			if (!el.hasAttribute("data-rp-orig-title")) {
				el.setAttribute("data-rp-orig-title", title);
			}
			el.setAttribute("title", title.replace(/official store/gi, "Store"));
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
			/official store/i.test(node.nodeValue)
		) {
			if (!parent.hasAttribute("data-rp-orig-text")) {
				parent.setAttribute("data-rp-orig-text", node.nodeValue);
			}
			node.nodeValue = node.nodeValue.replace(/official store/gi, "Store");
		}
		node = walker.nextNode();
	}
}

export function updateSmallNewNavVisibility() {
	const existingStyle = document.getElementById(RP_SMALL_NEW_NAV_STYLE_ID);
	if (!settingsState.smallNewNavigationBarEnabled) {
		if (existingStyle instanceof HTMLStyleElement) existingStyle.remove();
		restoreOfficialStoreSidebarLabels();
		return;
	}

	const css = buildSmallNewNavStylesheet();
	if (existingStyle instanceof HTMLStyleElement) {
		if (existingStyle.textContent !== css) existingStyle.textContent = css;
		syncOfficialStoreSidebarRename();
		return;
	}

	syncOfficialStoreSidebarRename();

	const style = document.createElement("style");
	style.id = RP_SMALL_NEW_NAV_STYLE_ID;
	style.textContent = css;
	document.documentElement.appendChild(style);
}
