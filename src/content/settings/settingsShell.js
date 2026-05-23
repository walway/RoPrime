/**
 * Roblox-style MUI settings shell markup (secondary rail + content pane).
 * Class names mirror Roblox web-blox-css / MUI output for visual parity.
 */

const MUI = {
	secondaryRail:
		"MuiGrid-root web-blox-css-tss-9lz23s-Grid-root-secondaryRail-scroll web-blox-css-mui-rfnosa",
	headerContainer:
		"MuiGrid-root web-blox-css-tss-1s03me0-Grid-root-headerContainer web-blox-css-mui-rfnosa",
	headerTitle:
		"MuiTypography-root web-blox-css-tss-1bc4eu7-Typography-largeLabel2-Typography-root-header MuiTypography-inherit web-blox-css-mui-1de74pe",
	divider:
		"MuiDivider-root web-blox-css-tss-1x8edd3-Divider-root MuiDivider-fullWidth web-blox-css-mui-39bbo6",
	treeView:
		"web-blox-css-tss-1stvckd-TreeView-root-root MuiSimpleTreeView-root web-blox-css-mui-z2w8mv",
	treeItem:
		"MuiTreeItem-root web-blox-css-tss-1dg89j7-TreeItem-root MuiSimpleTreeView-item web-blox-css-mui-105mfs8",
	treeItemContent:
		"MuiTreeItem-content web-blox-css-tss-b8r3ek-Typography-largeLabel2-Typography-largeLabel1-TreeItem-content MuiSimpleTreeView-itemContent web-blox-css-mui-1lv73wu",
	treeItemIcon:
		"MuiTreeItem-iconContainer MuiSimpleTreeView-itemIconContainer web-blox-css-mui-1ag0joa",
	treeItemLabel:
		"MuiTreeItem-label MuiSimpleTreeView-itemLabel web-blox-css-mui-10gad4h-Typography-body1",
	treeLink: "web-blox-css-tss-e1i62u-link",
	treeLinkLabel:
		"MuiTypography-root web-blox-css-tss-1n1c0vo-Typography-smallLabel2-Typography-root-label MuiTypography-inherit web-blox-css-mui-1de74pe",
	contentPane:
		"MuiGrid-root web-blox-css-tss-183e6zd-Grid-root MuiGrid-container MuiGrid-item MuiGrid-direction-xs-column web-blox-css-mui-128emgq",
	contentContainer:
		"MuiGrid-root web-blox-css-tss-1p5fymi-Grid-root-container web-blox-css-mui-rfnosa",
	sectionHeader:
		"MuiGrid-root web-blox-css-tss-teh46y-Grid-root-header web-blox-css-mui-rfnosa",
	sectionHeaderInner:
		"MuiGrid-root web-blox-css-tss-5zsjs6-Grid-root-container web-blox-css-mui-rfnosa",
	sectionTitleRow:
		"MuiGrid-root web-blox-css-tss-1pkvqxa-Grid-root-title web-blox-css-mui-rfnosa",
	menuButton:
		"MuiButtonBase-root MuiIconButton-root web-blox-css-tss-1jv9h62-IconButton-root MuiIconButton-colorSecondary web-blox-css-tss-1h9cx5z-IconButton-colorSecondary MuiIconButton-sizeMedium web-blox-css-mui-clogms",
	menuIcon:
		"MuiSvgIcon-root MuiSvgIcon-fontSizeMedium web-blox-css-mui-12kqpzp",
	touchRipple: "MuiTouchRipple-root web-blox-css-mui-w0pj6f",
	sectionHeadingWrap:
		"MuiGrid-root web-blox-css-tss-spvy06-Grid-root MuiGrid-container web-blox-css-mui-1rr0jkq",
	sectionHeading:
		"MuiTypography-root web-blox-css-tss-70egxs-Typography-h3-Typography-root MuiTypography-inherit web-blox-css-mui-1de74pe",
	verticalDivider:
		"MuiDivider-root web-blox-css-tss-1x8edd3-Divider-root MuiDivider-fullWidth web-blox-css-mui-39bbo6 roprime-settings-pane-divider",
};

const MENU_OPEN_PATH =
	"M3 18h13v-2H3zm0-5h10v-2H3zm0-7v2h13V6zm18 9.59L17.42 12 21 8.41 19.59 7l-5 5 5 5z";

const TREE_VIEW_ID = "roprime-settings-tree";

/** MenuOpenIcon (@mui/icons-material/MenuOpen) in a circular MUI IconButton. */
export function buildMenuOpenIconButton(
	extraClass = "",
	{ ariaLabel = "menu" } = {},
) {
	const classes = [MUI.menuButton, "roprime-settings-menu-btn", extraClass]
		.filter(Boolean)
		.join(" ");
	return `<button type="button" class="${classes}" tabindex="0" aria-label="${ariaLabel}">
	<span class="MuiIconButton-label" style="width:100%;display:flex;align-items:center;justify-content:center">
		<svg class="${MUI.menuIcon}" focusable="false" aria-hidden="true" viewBox="0 0 24 24" data-testid="MenuOpenIcon">
			<path d="${MENU_OPEN_PATH}"></path>
		</svg>
	</span>
	<span class="${MUI.touchRipple}"></span>
</button>`;
}

export function buildSectionPageHeader(titleI18nKey) {
	return `
<div class="${MUI.sectionHeader} roprime-settings-section-header">
	<div class="${MUI.sectionHeaderInner}">
		<div class="${MUI.sectionTitleRow}">
			${buildMenuOpenIconButton("roprime-settings-section-menu-btn")}
			<div class="${MUI.sectionHeadingWrap}">
				<span class="${MUI.sectionHeading}">
					<h1 class="text-heading-large margin-none" data-roprime-section-title data-i18n="${titleI18nKey}"></h1>
				</span>
			</div>
		</div>
	</div>
</div>`;
}

function buildTreeNavItem({ page, labelKey, hidden = false }) {
	const hiddenAttr = hidden ? " hidden" : "";
	return `
<li role="treeitem" tabindex="0" id="${TREE_VIEW_ID}-${page}" aria-selected="false" class="${MUI.treeItem} roprime-settings-tree-item" data-roprime-tree-item="${page}" style="--TreeView-itemDepth: 0;"${hiddenAttr}>
	<div class="${MUI.treeItemContent} roprime-settings-tree-content" data-roprime-page="${page}">
		<div class="${MUI.treeItemLabel}">
			<a href="#" class="${MUI.treeLink} roprime-settings-nav-btn" data-roprime-page="${page}">
				<span class="${MUI.treeLinkLabel}" data-i18n="${labelKey}"></span>
			</a>
		</div>
	</div>
</li>`;
}

/**
 * @param {object} options
 * @param {Array<{page: string, labelKey: string, titleKey: string, hidden?: boolean}>} options.navItems
 * @param {string} options.sectionsHtml - wrapped sections including per-section headers
 * @param {boolean} [options.showProfileEffectsAlert]
 * @param {string} [options.searchPlaceholderKey]
 */
export function buildSettingsShell({
	navItems,
	sectionsHtml,
	showProfileEffectsAlert = false,
	searchPlaceholderKey = "Search settings placeholder",
}) {
	const treeItems = navItems
		.map((item) =>
			buildTreeNavItem({
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
<div class="roprime-settings-wrapper roprime-settings-mui-shell" id="rp-settings-inner">
	<aside class="width-[288px] ${MUI.secondaryRail} roprime-settings-rail" aria-label="RoPrime settings navigation">
		<div class="roprime-settings-rail-scroll">
			<div class="${MUI.headerContainer} roprime-settings-rail-header">
				<span class="${MUI.headerTitle}" data-i18n="Settings hero title"></span>
				<hr class="${MUI.divider}" />
			</div>
			<div class="roprime-settings-search-wrap" data-roprime-shared-search-wrap>
				<input id="roprime-settings-search" type="search" class="roprime-settings-search" data-i18n-placeholder="${searchPlaceholderKey}" autocomplete="off" />
			</div>
			<ul role="tree" aria-multiselectable="false" class="${MUI.treeView} roprime-settings-tree" id="${TREE_VIEW_ID}" style="--TreeView-itemChildrenIndentation: 12px;">
				${treeItems}
			</ul>
			${profileEffectsAlert}
		</div>
		<div class="roprime-settings-scrollbar-gutter" aria-hidden="true"></div>
	</aside>
	<div class="${MUI.verticalDivider} roprime-settings-pane-divider" role="separator" aria-orientation="vertical"></div>
	<div class="${MUI.contentPane} roprime-settings-content-pane">
		<div class="${MUI.contentContainer} roprime-settings-content-container">
			<div class="roprime-search-hint" data-roprime-search-hint data-i18n="Search min length hint"></div>
			<div class="roprime-search-hint" data-roprime-developer-unlock-message data-i18n="Search developer unlocked hint" style="display:none;"></div>
			${sectionsHtml}
		</div>
	</div>
</div>`;
}

export function wrapSettingsSection(page, titleKey, bodyHtml, { hidden = false } = {}) {
	const hiddenAttr = hidden ? " hidden" : "";
	return `
<section class="roprime-settings-section" data-roprime-section="${page}"${hiddenAttr}>
	${buildSectionPageHeader(titleKey)}
	<div class="roprime-settings-section-body">
		${bodyHtml}
	</div>
</section>`;
}
