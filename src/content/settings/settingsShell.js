import { RP_SETTINGS_FLAT_INNER_ID } from "../core/core.js";

function buildNavButton({ page, labelKey, hidden = false }) {
	const hiddenAttr = hidden ? " hidden" : "";
	return `<button class="roprime-settings-nav-btn" data-roprime-page="${page}" type="button" data-i18n="${labelKey}"${hiddenAttr}></button>`;
}

export function buildSettingsShell({
	navItems,
	sectionsHtml,
	showProfileEffectsAlert = false,
	searchPlaceholderKey = "Search settings placeholder",
}) {
	const navButtons = navItems
		.map((item) =>
			buildNavButton({
				page: item.page,
				labelKey: item.labelKey,
				hidden: item.hidden,
			}),
		)
		.join("");

	const profileEffectsAlert = showProfileEffectsAlert
		? `
		<a class="roprime-settings-nav-alert" data-roprime-profile-effects-alert data-roprime-page="other" href="#">
			<span class="roprime-settings-nav-alert-icon" aria-hidden="true">
				<svg viewBox="0 0 24 24" width="22" height="22" focusable="false">
					<path fill="currentColor" d="M14 2H4c-1.11 0-2 .9-2 2v10h2V4h10zm4 4H8c-1.11 0-2 .9-2 2v10h2V8h10zm2 4h-8c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h8c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2"/>
				</svg>
			</span>
			<span class="roprime-settings-nav-alert-text" data-i18n="Try out new profile animations"></span>
		</a>`
		: "";

	return `
<div class="roprime-settings-wrapper roprime-settings-flat" id="${RP_SETTINGS_FLAT_INNER_ID}">
	<div class="roprime-settings-hero">
		<h2 data-i18n="Settings hero title"></h2>
	</div>
	<div class="roprime-settings-layout">
		<div class="roprime-settings-sidebar">
			<div class="roprime-settings-search-wrap" data-roprime-shared-search-wrap>
				<input id="roprime-settings-search" type="search" class="roprime-settings-search" data-i18n-placeholder="${searchPlaceholderKey}" autocomplete="off" />
			</div>
			<div class="roprime-settings-nav" role="tablist">
				${navButtons}
			</div>
			${profileEffectsAlert}
		</div>
		<div class="roprime-settings-main">
			<div class="roprime-search-hint" data-roprime-search-hint data-i18n="Search min length hint"></div>
			<div class="roprime-search-hint" data-roprime-developer-unlock-message data-i18n="Search developer unlocked hint" style="display:none;"></div>
			${sectionsHtml}
		</div>
	</div>
</div>`;
}

export function wrapSettingsSection(
	page,
	_titleKey,
	bodyHtml,
	{ hidden = false } = {},
) {
	const hiddenAttr = hidden ? " hidden" : "";
	return `
<section class="roprime-settings-section" data-roprime-section="${page}"${hiddenAttr}>
	<div class="roprime-settings-section-body">
		${bodyHtml}
	</div>
</section>`;
}
