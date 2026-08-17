import { minimalEditor } from 'prism-code-editor/setups'
import 'prism-code-editor/languages/css'
import 'prism-code-editor/prism/languages/css'
import { langList } from '../../i18n/i18n-config.js'
import { promptCustomCssCautionNotice, promptProfileEffectsSupportNotice } from '../alerts/alert.js'
import { syncAccountSettingsMenuButton } from '../redirect/settingsButton.js'
import {
    buildPluginUrl,
    getActiveSidebarSize,
    getCurrentrp,
    getStorageApi,
    isExtensionContextAlive,
    isMyAccountPath,
    isPluginRoute,
    mergeStoredSettings,
    normalizeSearchBannedWords,
    normalizeSidebarSizeMode,
    reloadSettingsUiStrings,
    resetSettingsToDefaults,
    RP_DEFAULT_PAGE,
    RP_SETTINGS_KEY,
    saveSettings,
    serializeSettingsPayload,
    setAccountSettingsShellClass,
    settingsState,
    syncAccountSettingsLayoutInset,
} from '../core/core.js'
import { syncCustomCss } from '../features/customCss.js'
import { updateRenameLoop } from '../features/rename.js'
import { syncSearchBan } from '../features/searchBan.js'
import { updateDocumentTitle } from '../panel/pageChrome.js'
import { syncRoEliteView } from '../panel/panel.js'
import { hydrateProfilePictureEffectAvatars } from '../profile/profileEffectAvatar.js'
import {
    getAllProfileEffectIds,
    getProfileEffectById,
    getProfileEffectShopEmbedSrc,
    PROFILE_EFFECTS,
    PROFILE_PICTURE_EFFECTS,
} from '../profile/profileEffectsCatalog.js'
import {
    equipSlotForKind,
    getRobloxUserId,
    isSupabaseProfileEffectsEnabled,
    normalizeEquippedEntry,
    registerProfileEffectEquip,
    registerProfileEffectPurchase,
    syncOwnedEffectsFromRegistry,
} from '../profile/profileEffectsRegistry.js'
import { syncProfileRedesign } from '../profile/profileRedesign.js'
import {
    discoverSidebarNavItems,
    hideSidebarItem,
    isSidebarItemHidden,
    resetSidebarItemsForMode,
    restoreSidebarItem,
} from '../sidebar/sidebarContent.js'
import { syncSidebarContent } from '../sidebar/sidebarContent.js'
import { ADD_ICON_SVG, DELETE_ICON_SVG } from '../sidebar/sidebarIcons.js'
import { createToggle, setToggleChecked } from '../ui/toggle.js'
import { t as accountSettingsPaneT } from './roprimeAccountSettingsPage.js'
import { clearSettingsPageLayout, resolveSettingsMountHost } from './settingsPageHost.js'
import { SETTINGS_CONFIG } from './settingsConfig.js'

const extensionApi = globalThis.browser || globalThis.chrome
const RP_DEBUG_UNLOCK = 'debug'
const RP_SETTINGS_HOST_ID = 'roprime-settings-host'
const RP_PAGE_CONTENT_ATTR = 'data-roprime-settings-page'

const SYNC_EXCLUDED_KEYS = [
    'ownedProfileEffects',
    'equippedProfileEffect',
    'equippedProfilePictureEffect',
    'equippedProfilePageEffect',
    'profileEffectsEquippedByUser',
    'customCss',
    'customCssCautionAccepted',
    'hideAgeBadgeEnabled',
]

const PROFILE_EFFECT_LAYOUTS = ['grid', 'list', 'wide']

const SIDEBAR_SIZE_TITLE_KEYS = {
    full: 'Sidebar size full',
    small: 'Sidebar size small',
    icon: 'Sidebar size icon only',
}

const ON_CHANGE_HANDLERS = {
    updateRenameLoop,
    syncRoEliteView,
    syncSidebarContent,
    syncProfileRedesign,
    syncSearchBan,
    syncCosmeticsUi: (root) => syncCosmeticsUi(getSettingsHostRoot(root)),
}

let cssEditor = null
let cssEditorHost = null
let cachedAuthUserId = null
let registrySyncPromise = null

function el(tag, className) {
    const node = document.createElement(tag)
    if (className) node.className = className
    return node
}

function appendSvgMarkup(parent, markup) {
    const doc = new DOMParser().parseFromString(markup, 'image/svg+xml')
    const node = doc.documentElement
    if (node && node.tagName.toLowerCase() !== 'parsererror') {
        parent.appendChild(node)
    }
}

function setDataI18n(node, key) {
    if (key) {
        node.setAttribute('data-i18n', key)
        node.textContent = accountSettingsPaneT(key)
    }
    return node
}

function setDataI18nPlaceholder(node, key) {
    if (key) {
        node.setAttribute('data-i18n-placeholder', key)
        node.placeholder = accountSettingsPaneT(key)
    }
    return node
}

function setDataI18nAria(node, key) {
    if (key) {
        node.setAttribute('data-i18n-aria-label', key)
        node.setAttribute('aria-label', accountSettingsPaneT(key))
    }
    return node
}

function getSettingsHostRoot(node) {
    const host = document.getElementById(RP_SETTINGS_HOST_ID)
    if (host instanceof HTMLElement) return host
    if (node instanceof HTMLElement) return node
    return null
}

function runOnChange(actions, root) {
    for (const name of actions || []) {
        const fn = ON_CHANGE_HANDLERS[name]
        if (typeof fn === 'function') fn(root)
    }
}

function applyI18n(root) {
    root.querySelectorAll('[data-i18n]').forEach((node) => {
        if (!(node instanceof HTMLElement)) return
        const key = node.getAttribute('data-i18n')
        if (!key) return
        node.textContent = accountSettingsPaneT(key)
    })
    root.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
        if (
            !(node instanceof HTMLInputElement) &&
            !(node instanceof HTMLTextAreaElement)
        ) {
            return
        }
        const key = node.getAttribute('data-i18n-placeholder')
        if (!key) return
        node.placeholder = accountSettingsPaneT(key)
    })
    root.querySelectorAll('[data-i18n-aria-label]').forEach((node) => {
        if (!(node instanceof HTMLElement)) return
        const key = node.getAttribute('data-i18n-aria-label')
        if (!key) return
        node.setAttribute('aria-label', accountSettingsPaneT(key))
    })
}

function isDeveloperPageUnlocked() {
    return !!settingsState.developerPageUnlocked
}

function sidebarModeValues() {
    return { full: 0, small: 50, icon: 100 }
}

function nearestSidebarMode(raw) {
    const value = Number(raw)
    if (Number.isNaN(value)) return 'full'
    if (value < 25) return 'full'
    if (value < 75) return 'small'
    return 'icon'
}

function currentUiLanguageCode() {
    const s = String(settingsState.language || 'en').toLowerCase()
    return s in langList ? s : 'en'
}

function findNativeAccountBase() {
    const el = document.querySelector('#user-account > #react-user-account-base')
    return el instanceof HTMLElement ? el : null
}

function setNativeAccountBaseHidden(hidden) {
    const native = findNativeAccountBase()
    if (!(native instanceof HTMLElement)) return
    if (hidden) {
        if (!native.hasAttribute('data-roprime-native-hidden')) {
            native.setAttribute('data-roprime-native-hidden', '1')
            native.setAttribute(
                'data-roprime-native-prev-display',
                native.style.display || '',
            )
            native.style.display = 'none'
        }
    } else if (native.getAttribute('data-roprime-native-hidden') === '1') {
        native.style.display = native.getAttribute('data-roprime-native-prev-display') || ''
        native.removeAttribute('data-roprime-native-hidden')
        native.removeAttribute('data-roprime-native-prev-display')
    }
}

function setSettingsHostVisible(visible) {
    const host = document.getElementById(RP_SETTINGS_HOST_ID)
    if (!(host instanceof HTMLElement)) return
    host.classList.toggle('hidden', !visible)
    setNativeAccountBaseHidden(visible)
}

function ensureSettingsHost() {
    const userAccount = document.getElementById('user-account')
    if (!(userAccount instanceof HTMLElement)) return null

    let host = document.getElementById(RP_SETTINGS_HOST_ID)
    if (host instanceof HTMLElement) return host

    host = el('div')
    host.id = RP_SETTINGS_HOST_ID
    host.className = 'hidden roprime-settings-host'
    buildSettingsHostContent(host)
    userAccount.appendChild(host)
    return host
}

function buildSettingsHostContent(host) {
    const heading = el('h1')
    heading.textContent = 'RoPrime Settings'
    host.appendChild(heading)

    const settingsContainer = el('div')
    settingsContainer.id = 'settings-container'

    const leftNav = el('div', 'settings-left-navigation')
    const searchWrap = el('div', 'roprime-settings-search-wrap')
    searchWrap.setAttribute('data-roprime-shared-search-wrap', '1')
    const search = el('input')
    search.id = 'roprime-settings-search'
    search.type = 'search'
    search.className = 'roprime-settings-search'
    setDataI18nPlaceholder(search, 'Search settings placeholder')
    search.autocomplete = 'off'
    searchWrap.appendChild(search)

    const navList = el('ul', 'menu-vertical')
    navList.setAttribute('role', 'tablist')

    for (const [pageKey, pageCfg] of Object.entries(SETTINGS_CONFIG)) {
        if (!pageCfg.labelKey) continue
        const li = el('li', 'menu-option')
        li.setAttribute('role', 'tab')
        li.setAttribute('data-roprime-nav-page', pageKey)
        if (pageCfg.hidden) li.hidden = true

        const link = el('a', 'menu-option-content')
        link.href = buildPluginUrl(pageKey)
        const label = el('span', 'font-caption-header')
        setDataI18n(label, pageCfg.labelKey)
        link.appendChild(label)
        li.appendChild(link)
        navList.appendChild(li)
    }

    const profileAlert = el('a', 'roprime-settings-nav-alert')
    profileAlert.setAttribute('data-roprime-profile-effects-alert', '1')
    profileAlert.href = buildPluginUrl('other')
    const alertText = el('span', 'roprime-settings-nav-alert-text')
    setDataI18n(alertText, 'Try out new profile animations')
    profileAlert.appendChild(alertText)

    const tabContent = el('div', 'tab-content rbx-tab-content')
    const tabPane = el('div', 'tab-pane active')
    tabPane.setAttribute('role', 'tabpanel')
    const containerV2 = el('div', 'settings-container-v2')
    const header = el('div', 'settings-v2-header')
    header.id = 'rbx-account-info-settings-header'

    const pageTitle = el('h2')
    pageTitle.setAttribute('data-roprime-page-title', '1')
    header.appendChild(pageTitle)

    for (const pageKey of Object.keys(SETTINGS_CONFIG)) {
        const pageWrap = el('div')
        pageWrap.setAttribute(RP_PAGE_CONTENT_ATTR, pageKey)
        pageWrap.hidden = true
        renderPageContent(pageWrap, pageKey)
        header.appendChild(pageWrap)
    }

    const searchHint = el('div', 'roprime-search-hint')
    searchHint.setAttribute('data-roprime-search-hint', '1')
    setDataI18n(searchHint, 'Search min length hint')

    const devHint = el('div', 'roprime-search-hint')
    devHint.setAttribute('data-roprime-developer-unlock-message', '1')
    setDataI18n(devHint, 'Search developer unlocked hint')
    devHint.style.display = 'none'

    containerV2.append(header, searchHint, devHint)
    tabPane.appendChild(containerV2)
    tabContent.appendChild(tabPane)

    leftNav.append(searchWrap, navList, profileAlert, tabContent)
    settingsContainer.appendChild(leftNav)
    host.appendChild(settingsContainer)
}

function createSettingSection(innerContent) {
    const section = el('div', 'setting-section')
    const wrap = el('div')
    if (innerContent) wrap.appendChild(innerContent)
    section.appendChild(wrap)
    return section
}

function createToggleCopy(titleKey, descKey) {
    const copy = el('div', 'roprime-toggle-copy')
    const title = el('div', 'roprime-toggle-title')
    setDataI18n(title, titleKey)
    copy.appendChild(title)
    if (descKey) {
        const desc = el('div', 'roprime-toggle-desc')
        setDataI18n(desc, descKey)
        copy.appendChild(desc)
    }
    return copy
}

function createToggleSection(item) {
    const row = el('div')
    row.appendChild(createToggleCopy(item.titleKey, item.descKey))
    const toggle = createToggle({
        id: item.id,
        checked: !!settingsState[item.key],
    })
    toggle.setAttribute('data-roprime-settings-key', item.key)
    if (item.onChange) {
        toggle.setAttribute(
            'data-roprime-on-change',
            JSON.stringify(item.onChange),
        )
    }
    row.appendChild(toggle)
    return createSettingSection(row)
}

function createAccordionSection(item) {
    const accordion = el('div', 'roprime-accordion')
    accordion.setAttribute('data-roprime-accordion', item.id)

    const headerRow = el('div', 'roprime-accordion-header')
    headerRow.setAttribute('role', 'button')
    headerRow.tabIndex = 0
    headerRow.setAttribute('aria-expanded', 'false')
    headerRow.appendChild(createToggleCopy(item.titleKey))

    const masterToggle = createToggle({
        id: item.masterId,
        checked: !!settingsState[item.masterKey],
    })
    masterToggle.classList.add('roprime-accordion-master-switch')
    masterToggle.setAttribute('data-roprime-settings-key', item.masterKey)
    if (item.onChange) {
        masterToggle.setAttribute(
            'data-roprime-on-change',
            JSON.stringify(item.onChange),
        )
    }
    headerRow.appendChild(masterToggle)

    const chevron = el('span', 'roprime-accordion-chevron')
    chevron.setAttribute('aria-hidden', 'true')
    headerRow.appendChild(chevron)

    const body = el('div', 'roprime-accordion-body')
    body.hidden = true
    body.setAttribute('aria-hidden', 'true')

    for (const child of item.children || []) {
        if (child.type === 'toggle') body.appendChild(createToggleSection(child))
    }

    accordion.append(headerRow, body)
    return createSettingSection(accordion)
}

const CUSTOM_BUILDERS = {
    sidebarSize: () => createSettingSection(buildSidebarSizeControl('roprime-sidebar-size-slider')),
    sidebarSizeConfig: () => createSettingSection(buildSidebarSizeControl('roprime-sidebar-size-slider-config')),
    sidebarContentBack: () => {
        const btn = el('button', 'roprime-sidebar-content-back')
        btn.type = 'button'
        btn.setAttribute('data-roprime-sidebar-content-back', '1')
        setDataI18n(btn, 'Sidebar content back')
        return createSettingSection(btn)
    },
    sidebarContentList: () => {
        const panel = el('div', 'roprime-sidebar-content-panel')
        const list = el('div', 'roprime-sidebar-content-list')
        list.setAttribute('data-roprime-sidebar-content-list', '1')
        panel.appendChild(list)
        return createSettingSection(panel)
    },
    language: () => createSettingSection(buildLanguageControl()),
    settingsSync: () => createSettingSection(buildSettingsSyncPanel()),
    customCss: () => createSettingSection(buildCustomCssBlock()),
    cosmeticsShop: () => {
        const shop = el('div', 'roprime-cosmetics-shop')
        shop.setAttribute('data-roprime-cosmetics-shop', '1')
        shop.hidden = true
        buildCosmeticsShopInto(shop)
        return createSettingSection(shop)
    },
    searchBan: () => createSettingSection(buildSearchBanPanel()),
    infoBlock: () => {
        const block = el('div', 'roprime-info-block')
        const title = el('div', 'roprime-info-title')
        setDataI18n(title, 'Info card title')
        const text = el('div', 'roprime-info-text')
        setDataI18n(text, 'Info card body')
        block.append(title, text)
        return createSettingSection(block)
    },
    developerBlock: () => {
        const copy = el('div', 'roprime-setting-field-copy')
        const title = el('div', 'roprime-setting-title')
        setDataI18n(title, 'Developer section title')
        const desc = el('div', 'roprime-setting-desc')
        setDataI18n(desc, 'Developer section description')
        copy.append(title, desc)
        return createSettingSection(copy)
    },
}

function renderPageContent(container, pageKey) {
    const page = SETTINGS_CONFIG[pageKey]
    if (!page) return
    for (const item of page.items || []) {
        if (item.type === 'toggle') {
            container.appendChild(createToggleSection(item))
        } else if (item.type === 'accordion') {
            container.appendChild(createAccordionSection(item))
        } else if (item.type === 'custom' && CUSTOM_BUILDERS[item.builder]) {
            container.appendChild(CUSTOM_BUILDERS[item.builder]())
        }
    }
}

function buildSidebarSizeControl(sliderId) {
    const control = el('div', 'roprime-sidebar-size-control')
    const box = el('div', 'roprime-sidebar-size-box')
    const rail = el('div', 'roprime-sidebar-size-rail')
    const slider = el('input', 'roprime-sidebar-size-slider')
    slider.type = 'range'
    slider.id = sliderId
    slider.min = '0'
    slider.max = '100'
    slider.step = '0.1'
    slider.value = '0'
    setDataI18nAria(slider, 'Sidebar size title')
    rail.appendChild(slider)

    const footer = el('div', 'roprime-sidebar-size-footer')
    const ticks = el('div', 'roprime-sidebar-size-ticks')
    for (const mode of ['full', 'small', 'icon']) {
        const tick = el('button', 'roprime-sidebar-size-tick')
        tick.type = 'button'
        tick.dataset.sizeMode = mode
        const span = el('span')
        setDataI18n(span, SIDEBAR_SIZE_TITLE_KEYS[mode])
        tick.appendChild(span)
        ticks.appendChild(tick)
    }
    const configureBtn = el('button', 'roprime-sidebar-configure-btn')
    configureBtn.type = 'button'
    configureBtn.setAttribute('data-roprime-open-sidebar-content', '1')
    setDataI18n(configureBtn, 'Configure sidebar content')
    footer.append(ticks, configureBtn)

    const warning = el('div', 'roprime-sidebar-size-warning')
    warning.setAttribute('data-roprime-sidebar-empty-warning', '1')
    warning.hidden = true
    const warningText = el('span', 'roprime-sidebar-size-warning-text')
    warningText.textContent = 'No sidebar items visible.'
    warning.appendChild(warningText)

    box.append(rail, footer, warning)
    control.appendChild(box)
    return control
}

function buildLanguageControl() {
    const field = el('div', 'roprime-setting-field')
    const copy = el('div', 'roprime-setting-field-copy')
    const title = el('div', 'roprime-setting-title')
    setDataI18n(title, 'Language section title')
    const desc = el('div', 'roprime-setting-desc')
    setDataI18n(desc, 'Language section description')
    copy.append(title, desc)

    const dropdown = el('div', 'roprime-language-dropdown')
    dropdown.setAttribute('data-roprime-language-dropdown', '1')
    const trigger = el('button', 'roprime-language-trigger')
    trigger.type = 'button'
    const current = el('span')
    current.setAttribute('data-roprime-lang-current', '1')
    const chevron = el('span', 'roprime-language-chevron')
    chevron.setAttribute('aria-hidden', 'true')
    trigger.append(current, chevron)

    const menu = el('div', 'roprime-language-menu')
    menu.hidden = true
    for (const code of Object.keys(langList)) {
        const option = el('button', 'roprime-language-option')
        option.type = 'button'
        option.dataset.lang = code
        menu.appendChild(option)
    }
    dropdown.append(trigger, menu)
    field.append(copy, dropdown)
    return field
}

function buildSettingsSyncPanel() {
    const panel = el('div', 'roprime-settings-sync-panel')
    panel.setAttribute('data-roprime-settings-sync-panel', '1')

    const copy = el('div', 'roprime-setting-field-copy')
    const title = el('div', 'roprime-setting-title')
    setDataI18n(title, 'Settings sync title')
    const desc = el('div', 'roprime-setting-desc')
    setDataI18n(desc, 'Settings sync description')
    copy.append(title, desc)

    const actions = el('div', 'roprime-settings-sync-actions')
    const copyBtn = el('button', 'roprime-settings-primary-btn')
    copyBtn.type = 'button'
    copyBtn.setAttribute('data-roprime-settings-copy', '1')
    setDataI18n(copyBtn, 'Settings sync copy')
    const exportBtn = el('button', 'roprime-settings-primary-btn')
    exportBtn.type = 'button'
    exportBtn.setAttribute('data-roprime-settings-export', '1')
    setDataI18n(exportBtn, 'Settings sync export')
    const importBtn = el('button', 'roprime-settings-primary-btn')
    importBtn.type = 'button'
    importBtn.setAttribute('data-roprime-settings-import', '1')
    setDataI18n(importBtn, 'Settings sync import')
    const importInput = el('input')
    importInput.type = 'file'
    importInput.accept = '.json,application/json,text/plain'
    importInput.hidden = true
    importInput.setAttribute('data-roprime-settings-import-input', '1')
    actions.append(copyBtn, exportBtn, importBtn, importInput)

    const previewWrap = el('div', 'roprime-settings-sync-preview-wrap')
    previewWrap.setAttribute('data-roprime-settings-preview-wrap', '1')
    const preview = el('textarea', 'roprime-settings-sync-preview')
    preview.setAttribute('data-roprime-settings-preview', '1')
    preview.spellcheck = false
    previewWrap.appendChild(preview)

    const resetRow = el('div', 'roprime-toggle-row roprime-settings-sync-reset-row')
    const resetCopy = el('div', 'roprime-toggle-copy')
    const resetTitle = el('div', 'roprime-toggle-title')
    setDataI18n(resetTitle, 'Settings sync reset title')
    resetCopy.appendChild(resetTitle)
    const resetBtn = el('button', 'roprime-settings-primary-btn')
    resetBtn.type = 'button'
    resetBtn.setAttribute('data-roprime-settings-reset', '1')
    setDataI18n(resetBtn, 'Settings sync reset button')
    resetRow.append(resetCopy, resetBtn)

    const status = el('p', 'roprime-settings-sync-status')
    status.setAttribute('data-roprime-settings-sync-status', '1')
    status.hidden = true

    panel.append(copy, actions, previewWrap, resetRow, status)
    return panel
}

function buildCustomCssBlock() {
    const block = el('div', 'roprime-custom-css-block')
    const heading = el('div', 'roprime-custom-css-heading')
    const title = el('div', 'roprime-toggle-title')
    setDataI18n(title, 'Custom CSS title')
    const desc = el('div', 'roprime-toggle-desc')
    setDataI18n(desc, 'Custom CSS description')
    heading.append(title, desc)

    const wrap = el('div', 'roprime-custom-css-editor-wrap')
    wrap.setAttribute('data-roprime-custom-css-editor-wrap', '1')
    const placeholder = el('div', 'roprime-custom-css-placeholder')
    placeholder.setAttribute('data-roprime-custom-css-placeholder', '1')
    setDataI18n(placeholder, 'Custom CSS placeholder')
    placeholder.setAttribute('aria-hidden', 'true')
    const host = el('div', 'roprime-custom-css-editor-host')
    host.setAttribute('data-roprime-custom-css-editor-host', '1')
    wrap.append(placeholder, host)
    block.append(heading, wrap)
    return block
}

function buildSearchBanPanel() {
    const field = el('div', 'roprime-setting-field roprime-search-ban-field')
    const copy = el('div', 'roprime-setting-field-copy')
    const title = el('div', 'roprime-setting-title')
    setDataI18n(title, 'Search ban title')
    const desc = el('div', 'roprime-setting-desc')
    setDataI18n(desc, 'Search ban description')
    copy.append(title, desc)

    const controls = el('div', 'roprime-search-ban-controls')
    const input = el('input', 'roprime-search-ban-input')
    input.type = 'text'
    input.setAttribute('data-roprime-search-ban-input', '1')
    setDataI18nPlaceholder(input, 'Search ban input placeholder')
    input.autocomplete = 'off'
    input.spellcheck = false
    const addBtn = el('button', 'roprime-settings-primary-btn roprime-search-ban-add-btn')
    addBtn.type = 'button'
    addBtn.setAttribute('data-roprime-search-ban-add', '1')
    setDataI18n(addBtn, 'Search ban add word')
    controls.append(input, addBtn)
    field.append(copy, controls)

    const panel = el('div', 'roprime-sidebar-content-panel')
    panel.setAttribute('data-roprime-search-ban-panel', '1')
    const list = el('div', 'roprime-sidebar-content-list')
    list.setAttribute('data-roprime-search-ban-list', '1')
    panel.appendChild(list)

    const wrap = el('div')
    wrap.append(field, panel)
    return wrap
}

function buildCosmeticsShopInto(shop) {
    const toolbar = el('div', 'roprime-profile-effects-toolbar')
    const search = el('input', 'roprime-profile-effects-search')
    search.type = 'search'
    search.setAttribute('data-roprime-profile-effects-search', '1')
    setDataI18nPlaceholder(search, 'Profile effects search placeholder')
    search.autocomplete = 'off'

    const layoutWrap = el('div', 'roprime-profile-effects-layout')
    const layoutButtons = el('div', 'roprime-profile-effects-layout-buttons')
    layoutButtons.setAttribute('role', 'group')
    setDataI18nAria(layoutButtons, 'Profile effects layout')
    for (const view of PROFILE_EFFECT_LAYOUTS) {
        const btn = el('button', 'roprime-profile-effects-layout-btn')
        btn.type = 'button'
        btn.setAttribute('data-roprime-profile-effects-layout', view)
        const titleKey = view === 'grid'
            ? 'Profile effects layout grid'
            : view === 'list'
            ? 'Profile effects layout list'
            : 'Profile effects layout wide'
        setDataI18nAria(btn, titleKey)
        layoutButtons.appendChild(btn)
    }
    const indicator = el('div', 'roprime-profile-effects-layout-indicator')
    for (const view of PROFILE_EFFECT_LAYOUTS) {
        const dot = el('span', 'roprime-profile-effects-layout-indicator-dot')
        dot.setAttribute('data-roprime-layout-indicator', view)
        dot.setAttribute('aria-hidden', 'true')
        indicator.appendChild(dot)
    }
    layoutWrap.append(layoutButtons, indicator)
    toolbar.append(search, layoutWrap)
    shop.appendChild(toolbar)

    shop.appendChild(
        buildProfileEffectsSection(
            'Profile picture effects title',
            'Profile picture effects description',
            PROFILE_PICTURE_EFFECTS,
        ),
    )
    shop.appendChild(
        buildProfileEffectsSection(
            'Profile effects title',
            'Profile effects description',
            PROFILE_EFFECTS,
        ),
    )
}

function buildProfileEffectsSection(titleKey, descKey, effects) {
    const section = el('div', 'roprime-cosmetics-shop-section')
    const h3 = el('h3', 'roprime-settings-section-title')
    setDataI18n(h3, titleKey)
    const p = el('p', 'roprime-setting-desc')
    setDataI18n(p, descKey)
    const grid = el('div', 'roprime-profile-effects-grid')
    grid.setAttribute('data-roprime-profile-effects-grid', '1')
    for (const effect of effects) {
        grid.appendChild(buildProfileEffectCard(effect))
    }
    section.append(h3, p, grid)
    return section
}

function buildProfileEffectCard(effect) {
    const card = el('article', 'roprime-profile-effect-card')
    card.setAttribute('data-roprime-profile-effect', effect.id)
    card.setAttribute('data-roprime-profile-effect-kind', effect.kind)

    const preview = el('div', 'roprime-profile-effect-preview')
    if (effect.kind === 'picture') {
        const avatarWrap = el('div', 'roprime-profile-effect-avatar-wrap')
        avatarWrap.setAttribute('data-roprime-profile-effect-avatar', '1')
        avatarWrap.setAttribute('aria-hidden', 'true')
        preview.appendChild(avatarWrap)
    }
    const lottie = el('div', 'roprime-profile-effect-lottie')
    const iframe = document.createElement('iframe')
    iframe.src = getProfileEffectShopEmbedSrc(effect)
    iframe.title = effect.titleKey
    iframe.loading = 'lazy'
    iframe.setAttribute('allowtransparency', 'true')
    iframe.style.background = 'transparent'
    iframe.style.backgroundColor = 'transparent'
    lottie.appendChild(iframe)
    preview.appendChild(lottie)

    const footer = el('div', 'roprime-profile-effect-footer')
    const title = el('div', 'roprime-profile-effect-title')
    setDataI18n(title, effect.titleKey)
    const action = el('button', 'roprime-settings-primary-btn roprime-profile-effect-action')
    action.type = 'button'
    action.setAttribute('data-roprime-effect-id', effect.id)
    action.setAttribute('data-roprime-effect-action', 'equip')
    setDataI18n(action, 'Equip profile effect')
    footer.append(title, action)
    card.append(preview, footer)
    return card
}

function setSidebarModeVisual(root, mode) {
    root.setAttribute('data-roprime-sidebar-size-mode', mode)
    root.querySelectorAll('.roprime-sidebar-size-tick').forEach((tick) => {
        if (!(tick instanceof HTMLButtonElement)) return
        tick.classList.toggle('is-active', tick.dataset.sizeMode === mode)
    })
}

function applySidebarMode(root, mode) {
    if (settingsState.sidebarCollapseMenuEnabled && mode !== 'full') mode = 'full'
    settingsState.sidebarSize = mode
    settingsState.smallNewNavigationBarEnabled = mode === 'small'
    settingsState.sidebarIconsOnlyEnabled = mode === 'icon'
    saveSettings()
    setSidebarModeVisual(root, mode)
    syncAccountSettingsLayoutInset()
    syncRoEliteView()
    syncSidebarContent({ force: true })
    refreshSidebarSizeWarnings(root)
    if (getCurrentrp() === 'sidebar-content') refreshSidebarContentList(root)
}

function syncSidebarSliderFromState(root) {
    const mode = settingsState.sidebarSize || 'full'
    const mv = sidebarModeValues()
    root.querySelectorAll('.roprime-sidebar-size-slider').forEach((slider) => {
        if (!(slider instanceof HTMLInputElement)) return
        slider.value = String(mv[mode] ?? mv.full)
        const locked = !!settingsState.sidebarCollapseMenuEnabled
        slider.disabled = locked
        slider.setAttribute('aria-disabled', locked ? 'true' : 'false')
    })
    setSidebarModeVisual(root, mode)
    const locked = !!settingsState.sidebarCollapseMenuEnabled
    root.querySelectorAll('.roprime-sidebar-size-tick').forEach((tick) => {
        if (!(tick instanceof HTMLButtonElement)) return
        tick.disabled = locked
        tick.setAttribute('aria-disabled', locked ? 'true' : 'false')
    })
    refreshSidebarSizeWarnings(root)
}

function visibleSidebarItemsCount(sizeMode = getActiveSidebarSize()) {
    return discoverSidebarNavItems(sizeMode).filter(
        (item) => !isSidebarItemHidden(item.id, sizeMode),
    ).length
}

function refreshSidebarSizeWarnings(root) {
    const mode = normalizeSidebarSizeMode(getActiveSidebarSize())
    const noVisibleItems = visibleSidebarItemsCount(mode) === 0
    root.querySelectorAll('[data-roprime-sidebar-empty-warning]').forEach((node) => {
        if (!(node instanceof HTMLElement)) return
        node.hidden = !noVisibleItems
        node.style.display = noVisibleItems ? 'flex' : 'none'
        node.setAttribute('aria-hidden', noVisibleItems ? 'false' : 'true')
    })
}

function sidebarItemLabel(item) {
    const key = `Sidebar item ${item.id} label`
    const translated = accountSettingsPaneT(key)
    return translated && translated !== key ? translated : item.label
}

function buildSidebarContentRow(item, mode, isAdd) {
    const row = el('div', isAdd ? 'roprime-sidebar-content-row is-removed-item' : 'roprime-sidebar-content-row')
    row.setAttribute('data-roprime-sidebar-content-row', item.id)
    const label = el('span', 'roprime-sidebar-content-row-label')
    label.textContent = sidebarItemLabel(item)
    const btn = el('button', isAdd ? 'roprime-sidebar-content-add' : 'roprime-sidebar-content-delete')
    btn.type = 'button'
    btn.setAttribute(
        isAdd ? 'data-roprime-sidebar-add' : 'data-roprime-sidebar-delete',
        item.id,
    )
    btn.setAttribute('data-roprime-sidebar-size', mode)
    setDataI18nAria(btn, isAdd ? 'Sidebar content restore item' : 'Sidebar content remove item')
    appendSvgMarkup(btn, isAdd ? ADD_ICON_SVG : DELETE_ICON_SVG)
    row.append(label, btn)
    return row
}

function buildSidebarContentListInto(list) {
    list.textContent = ''
    const mode = normalizeSidebarSizeMode(getActiveSidebarSize())
    const items = discoverSidebarNavItems(mode)
    if (!items.length) {
        const empty = el('p', 'roprime-sidebar-content-empty')
        setDataI18n(empty, 'Sidebar content empty hint')
        list.appendChild(empty)
        return
    }
    const visible = items.filter((item) => !isSidebarItemHidden(item.id, mode))
    const hidden = items.filter((item) => isSidebarItemHidden(item.id, mode))
    const section = el('div', 'roprime-sidebar-content-size-section')
    section.setAttribute('data-roprime-sidebar-size-section', mode)
    const h4 = el('h4', 'roprime-sidebar-content-size-title')
    setDataI18n(h4, SIDEBAR_SIZE_TITLE_KEYS[mode] || SIDEBAR_SIZE_TITLE_KEYS.full)
    const rows = el('div', 'roprime-sidebar-content-size-rows')
    for (const item of visible) rows.appendChild(buildSidebarContentRow(item, mode, false))
    if (hidden.length) {
        const divider = el('div', 'roprime-sidebar-content-divider')
        divider.setAttribute('role', 'separator')
        rows.appendChild(divider)
        for (const item of hidden) rows.appendChild(buildSidebarContentRow(item, mode, true))
    }
    section.append(h4, rows)
    list.appendChild(section)
}

function refreshSidebarContentList(root) {
    const list = root.querySelector('[data-roprime-sidebar-content-list]')
    if (!(list instanceof HTMLElement)) return
    buildSidebarContentListInto(list)
    bindSidebarContentList(root)
    refreshSidebarSizeWarnings(root)
}

function bindSidebarContentList(root) {
    const list = root.querySelector('[data-roprime-sidebar-content-list]')
    if (!(list instanceof HTMLElement)) return
    list.querySelectorAll('[data-roprime-sidebar-delete]').forEach((btn) => {
        if (!(btn instanceof HTMLButtonElement)) return
        if (btn.getAttribute('data-roprime-sidebar-delete-bound') === '1') return
        btn.setAttribute('data-roprime-sidebar-delete-bound', '1')
        btn.addEventListener('click', () => {
            const itemId = btn.getAttribute('data-roprime-sidebar-delete') || ''
            const sizeMode = btn.getAttribute('data-roprime-sidebar-size') || 'full'
            if (!itemId || isSidebarItemHidden(itemId, sizeMode)) return
            hideSidebarItem(itemId, sizeMode)
            refreshSidebarContentList(root)
        })
    })
    list.querySelectorAll('[data-roprime-sidebar-add]').forEach((btn) => {
        if (!(btn instanceof HTMLButtonElement)) return
        if (btn.getAttribute('data-roprime-sidebar-add-bound') === '1') return
        btn.setAttribute('data-roprime-sidebar-add-bound', '1')
        btn.addEventListener('click', () => {
            const itemId = btn.getAttribute('data-roprime-sidebar-add') || ''
            const sizeMode = btn.getAttribute('data-roprime-sidebar-size') || 'full'
            if (!itemId || !isSidebarItemHidden(itemId, sizeMode)) return
            restoreSidebarItem(itemId, sizeMode)
            refreshSidebarContentList(root)
        })
    })
    root.querySelectorAll('[data-roprime-sidebar-reset]').forEach((btn) => {
        if (!(btn instanceof HTMLButtonElement)) return
        if (btn.getAttribute('data-roprime-sidebar-reset-bound') === '1') return
        btn.setAttribute('data-roprime-sidebar-reset-bound', '1')
        btn.addEventListener('click', () => {
            resetSidebarItemsForMode(getActiveSidebarSize())
            refreshSidebarContentList(root)
        })
    })
}

// --- Custom CSS editor ---

const CSS_LINE_HEIGHT_PX = 22
const CSS_EDITOR_PADDING_PX = 16
const CSS_MIN_LINES = 4
const CSS_MAX_LINES = 18

function destroyCssEditor() {
    cssEditor?.remove()
    cssEditor = null
    cssEditorHost = null
}

function getEditorWrap() {
    return cssEditorHost?.closest('[data-roprime-custom-css-editor-wrap]')
}

function isCustomCssEditorLocked() {
    return !settingsState.customCssCautionAccepted
}

function syncCustomCssPlaceholder(root) {
    const placeholder = root.querySelector('[data-roprime-custom-css-placeholder]')
    if (!(placeholder instanceof HTMLElement)) return
    const value = String(cssEditor?.value ?? settingsState.customCss ?? '')
    const empty = !value.trim()
    const focused = !!cssEditor?.focused
    placeholder.hidden = !empty || focused
    placeholder.setAttribute('aria-hidden', empty && !focused ? 'false' : 'true')
}

function applyCustomCssEditorLock(root) {
    const locked = isCustomCssEditorLocked()
    const wrap = getEditorWrap()
    if (wrap instanceof HTMLElement) wrap.classList.toggle('is-locked', locked)
    if (cssEditor) {
        cssEditor.textarea.readOnly = locked
        cssEditor.textarea.setAttribute('aria-readonly', locked ? 'true' : 'false')
    }
    syncCustomCssPlaceholder(root)
}

function applyEditorHeight(editor) {
    const host = cssEditorHost
    const wrap = getEditorWrap()
    const shadow = host?.shadowRoot
    const container = shadow?.querySelector('.prism-code-editor')
    if (!(container instanceof HTMLElement)) return

    const lineCount = Math.max(1, editor.value.split('\n').length)
    const minH = CSS_MIN_LINES * CSS_LINE_HEIGHT_PX + CSS_EDITOR_PADDING_PX
    const maxH = CSS_MAX_LINES * CSS_LINE_HEIGHT_PX + CSS_EDITOR_PADDING_PX
    const contentH = lineCount * CSS_LINE_HEIGHT_PX + CSS_EDITOR_PADDING_PX
    const editorH = Math.max(minH, contentH)

    const wrapScrollTop = wrap instanceof HTMLElement ? wrap.scrollTop : 0
    const selStart = editor.textarea.selectionStart
    const selEnd = editor.textarea.selectionEnd

    container.style.height = `${editorH}px`
    container.style.minHeight = `${minH}px`
    container.style.overflow = 'visible'
    container.style.overflowY = 'visible'

    if (wrap instanceof HTMLElement) {
        wrap.style.maxHeight = `${maxH}px`
        wrap.style.overflowY = contentH > maxH ? 'auto' : 'hidden'
        requestAnimationFrame(() => {
            wrap.scrollTop = wrapScrollTop
            try {
                editor.textarea.setSelectionRange(selStart, selEnd)
            } catch {
                /* ignore */
            }
        })
    }
}

function configureEditorShadow(host) {
    const shadow = host.shadowRoot
    const container = shadow?.querySelector('.prism-code-editor')
    if (!(shadow instanceof ShadowRoot) || !(container instanceof HTMLElement)) {
        return
    }

    let override = shadow.getElementById('roprime-pce-overrides')
    if (!override) {
        override = document.createElement('style')
        override.id = 'roprime-pce-overrides'
        shadow.appendChild(override)
    }
    override.textContent = `
		:host { display: block; }
		.prism-code-editor {
			margin: 0;
			border-radius: 10px;
			overflow: visible !important;
			--pce-bg: var(--roprime-editor-bg, var(--color-surface-300));
			background: var(--roprime-editor-bg, var(--color-surface-300));
			--pce-cursor: #f97316;
		}
		.prism-code-editor, .prism-code-editor * { scrollbar-width: auto; }
		.active-line:after { display: none !important; border: none !important; background: transparent !important; }
		.active-line { --pce-bg-highlight: transparent; --pce-border-highlight: none; }
	`
}

function ensureCssEditor(root) {
    const host = root.querySelector('[data-roprime-custom-css-editor-host]')
    if (!(host instanceof HTMLElement)) return
    if (cssEditorHost === host && cssEditor) return

    destroyCssEditor()
    cssEditorHost = host
    let cautionPromptActive = false

    async function ensureCustomCssCautionAccepted() {
        if (settingsState.customCssCautionAccepted) return true
        if (cautionPromptActive) return false
        cautionPromptActive = true
        try {
            const accepted = await promptCustomCssCautionNotice()
            if (!accepted) return false
            settingsState.customCssCautionAccepted = true
            saveSettings()
            applyCustomCssEditorLock(root)
            return true
        } finally {
            cautionPromptActive = false
        }
    }

    cssEditor = minimalEditor(
        host,
        {
            theme: 'github-dark-dimmed',
            language: 'css',
            value: String(settingsState.customCss || ''),
            wordWrap: true,
            lineNumbers: false,
            insertSpaces: true,
            tabSize: 2,
            readOnly: isCustomCssEditorLocked(),
            onUpdate: (value, editor) => {
                if (isCustomCssEditorLocked()) return
                settingsState.customCss = value
                saveSettings()
                syncCustomCss()
                applyEditorHeight(editor)
                syncCustomCssPlaceholder(root)
            },
        },
        () => {
            host.classList.add('roprime-custom-css-editor-host--ready')
            if (!cssEditor) return
            configureEditorShadow(host)
            applyEditorHeight(cssEditor)
            applyCustomCssEditorLock(root)
            cssEditor.textarea.addEventListener('focus', () => {
                void (async () => {
                    if (settingsState.customCssCautionAccepted) {
                        syncCustomCssPlaceholder(root)
                        return
                    }
                    const allowed = await ensureCustomCssCautionAccepted()
                    if (!allowed) cssEditor?.textarea.blur()
                    syncCustomCssPlaceholder(root)
                })()
            })
            cssEditor.textarea.addEventListener('blur', () => syncCustomCssPlaceholder(root))
        },
    )
}

function syncCustomCssUi(root) {
    ensureCssEditor(root)
    const value = String(settingsState.customCss || '')
    if (cssEditor && cssEditor.value !== value) {
        cssEditor.setOptions({ value })
        applyEditorHeight(cssEditor)
    }
    const placeholder = root.querySelector('[data-roprime-custom-css-placeholder]')
    if (placeholder instanceof HTMLElement && !placeholder.textContent?.trim()) {
        placeholder.textContent = accountSettingsPaneT('Custom CSS placeholder')
    }
    applyCustomCssEditorLock(root)
}

// --- Profile effects / cosmetics ---

function equippedFieldForKind(kind) {
    return kind === 'picture' ? 'equippedProfilePictureEffect' : 'equippedProfilePageEffect'
}

function getEquippedEffectIdForKind(kind) {
    return String(settingsState[equippedFieldForKind(kind)] || '').trim()
}

function setEquippedEffectIdForKind(kind, effectId) {
    settingsState[equippedFieldForKind(kind)] = effectId ? String(effectId) : ''
}

function isEffectEquipped(effectId) {
    const effect = getProfileEffectById(effectId)
    if (!effect) return false
    return getEquippedEffectIdForKind(effect.kind) === effectId
}

function migrateLegacyEquippedProfileEffect() {
    const legacy = String(settingsState.equippedProfileEffect || '').trim()
    if (!legacy) return false
    const hasPicture = !!getEquippedEffectIdForKind('picture')
    const hasProfile = !!getEquippedEffectIdForKind('profile')
    if (hasPicture && hasProfile) {
        settingsState.equippedProfileEffect = ''
        return true
    }
    const effect = getProfileEffectById(legacy)
    if (!effect) {
        settingsState.equippedProfileEffect = ''
        return true
    }
    if (!hasPicture && effect.kind === 'picture') {
        setEquippedEffectIdForKind('picture', legacy)
    }
    if (!hasProfile && effect.kind === 'profile') {
        setEquippedEffectIdForKind('profile', legacy)
    }
    settingsState.equippedProfileEffect = ''
    return true
}

function migrateLegacyEquippedByUserMap() {
    if (
        !settingsState.profileEffectsEquippedByUser ||
        typeof settingsState.profileEffectsEquippedByUser !== 'object'
    ) {
        settingsState.profileEffectsEquippedByUser = {}
        return false
    }
    let changed = false
    const next = {}
    for (
        const [userKey, entry] of Object.entries(
            settingsState.profileEffectsEquippedByUser,
        )
    ) {
        if (!/^\d+$/.test(String(userKey))) continue
        const normalized = normalizeEquippedEntry(entry)
        if (typeof entry === 'string') {
            const effect = getProfileEffectById(normalized.picture)
            if (effect?.kind === 'profile') {
                normalized.profile = normalized.picture
                normalized.picture = ''
            }
            changed = true
        }
        for (const slot of ['picture', 'profile']) {
            const id = normalized[slot]
            if (!id) continue
            const effect = getProfileEffectById(id)
            if (!effect || effect.kind === slot) continue
            const other = slot === 'picture' ? 'profile' : 'picture'
            if (!normalized[other]) normalized[other] = id
            normalized[slot] = ''
            changed = true
        }
        if (normalized.picture || normalized.profile) next[userKey] = normalized
        if (
            typeof entry === 'object' &&
            entry &&
            (JSON.stringify(entry) !== JSON.stringify(normalized) ||
                (!normalized.picture && !normalized.profile))
        ) {
            changed = true
        }
    }
    settingsState.profileEffectsEquippedByUser = next
    return changed
}

function normalizeEquippedForKind(kind) {
    migrateLegacyEquippedProfileEffect()
    const field = equippedFieldForKind(kind)
    const equipped = getEquippedEffectIdForKind(kind)
    if (!equipped) {
        settingsState[field] = ''
        return
    }
    const effect = getProfileEffectById(equipped)
    if (!effect || effect.kind !== kind) settingsState[field] = ''
}

export function normalizeEquippedProfileEffects() {
    const migrated = migrateLegacyEquippedProfileEffect() || migrateLegacyEquippedByUserMap()
    normalizeEquippedForKind('picture')
    normalizeEquippedForKind('profile')
    return migrated
}

function setEquippedForUser(userId, effectId, kind) {
    if (!userId) return
    const key = String(userId)
    if (!settingsState.profileEffectsEquippedByUser) {
        settingsState.profileEffectsEquippedByUser = {}
    }
    const slot = equipSlotForKind(kind)
    const entry = normalizeEquippedEntry(
        settingsState.profileEffectsEquippedByUser[key],
    )
    if (effectId) entry[slot] = effectId
    else entry[slot] = ''
    if (!entry.picture && !entry.profile) {
        delete settingsState.profileEffectsEquippedByUser[key]
    } else {
        settingsState.profileEffectsEquippedByUser[key] = entry
    }
}

async function refreshAuthUserId() {
    cachedAuthUserId = await getRobloxUserId()
    return cachedAuthUserId
}

async function grantAllProfileEffectsToCurrentUser() {
    const allEffectIds = getAllProfileEffectIds()
    if (!allEffectIds.length) return
    settingsState.ownedProfileEffects = [...allEffectIds]
    if (!isSupabaseProfileEffectsEnabled()) return
    const userId = await refreshAuthUserId()
    if (!userId) return
    await Promise.allSettled(
        allEffectIds.map((effectId) => registerProfileEffectPurchase(userId, effectId)),
    )
}

async function ensureRegistryOwnershipSynced() {
    if (registrySyncPromise) return registrySyncPromise
    registrySyncPromise = (async () => {
        const userId = await refreshAuthUserId()
        if (!userId) return
        const merged = await syncOwnedEffectsFromRegistry(
            userId,
            settingsState.ownedProfileEffects,
        )
        const changed = JSON.stringify(merged) !==
            JSON.stringify(settingsState.ownedProfileEffects)
        settingsState.ownedProfileEffects = merged
        const equipMigrated = normalizeEquippedProfileEffects()
        if (changed || equipMigrated) saveSettings()
    })()
    try {
        await registrySyncPromise
    } finally {
        registrySyncPromise = null
    }
}

function normalizeProfileEffectsLayoutView(layout) {
    return PROFILE_EFFECT_LAYOUTS.includes(layout) ? layout : 'grid'
}

function applyProfileEffectsLayout(shop, layout) {
    const view = normalizeProfileEffectsLayoutView(layout)
    shop.querySelectorAll('[data-roprime-profile-effects-grid]').forEach((grid) => {
        if (!(grid instanceof HTMLElement)) return
        grid.classList.remove(
            'roprime-profile-effects-grid--list',
            'roprime-profile-effects-grid--wide',
        )
        if (view === 'list') grid.classList.add('roprime-profile-effects-grid--list')
        if (view === 'wide') grid.classList.add('roprime-profile-effects-grid--wide')
    })
    shop.querySelectorAll('[data-roprime-profile-effects-layout]').forEach((btn) => {
        if (!(btn instanceof HTMLButtonElement)) return
        const active = btn.getAttribute('data-roprime-profile-effects-layout') === view
        btn.classList.toggle('is-active', active)
        btn.setAttribute('aria-pressed', String(active))
    })
    shop.querySelectorAll('[data-roprime-layout-indicator]').forEach((dot) => {
        if (!(dot instanceof HTMLElement)) return
        dot.classList.toggle(
            'is-active',
            dot.getAttribute('data-roprime-layout-indicator') === view,
        )
    })
}

function filterProfileEffectsSearch(shop, query) {
    const q = String(query || '')
        .trim()
        .toLowerCase()
    shop.querySelectorAll('[data-roprime-profile-effect]').forEach((card) => {
        if (!(card instanceof HTMLElement)) return
        const effectId = card.getAttribute('data-roprime-profile-effect') || ''
        const effect = getProfileEffectById(effectId)
        const title = effect ? accountSettingsPaneT(effect.titleKey).toLowerCase() : ''
        const hidden = !!q && !title.includes(q)
        card.hidden = hidden
        card.classList.toggle('roprime-profile-effect-card--hidden', hidden)
    })
}

function syncEffectButtons(shop) {
    if (!(shop instanceof HTMLElement)) return
    shop.querySelectorAll('[data-roprime-effect-id]').forEach((btn) => {
        if (!(btn instanceof HTMLButtonElement)) return
        const effectId = btn.getAttribute('data-roprime-effect-id') || ''
        const equipped = isEffectEquipped(effectId)
        const card = btn.closest('[data-roprime-profile-effect]')
        btn.disabled = false
        btn.classList.toggle('roprime-profile-effect-action--equipped', equipped)
        if (equipped) {
            btn.setAttribute('data-roprime-effect-action', 'unequip')
            btn.textContent = accountSettingsPaneT('Unequip profile effect')
        } else {
            btn.setAttribute('data-roprime-effect-action', 'equip')
            btn.textContent = accountSettingsPaneT('Equip profile effect')
        }
        if (card instanceof HTMLElement) {
            card.classList.toggle('roprime-profile-effect-card--equipped', equipped)
        }
    })
}

function syncCosmeticsUi(root) {
    if (!(root instanceof HTMLElement)) return
    const enabled = !!settingsState.cosmeticsEnabled
    root.classList.toggle('roprime-cosmetics-enabled', enabled)

    const cosmeticsToggle = root.querySelector(
        "[data-roprime-settings-key='cosmeticsEnabled']",
    )
    if (cosmeticsToggle) setToggleChecked(cosmeticsToggle, enabled)

    const shop = root.querySelector('[data-roprime-cosmetics-shop]')
    if (!(shop instanceof HTMLElement)) return
    shop.hidden = !enabled
    shop.setAttribute('aria-hidden', enabled ? 'false' : 'true')
    if (!enabled) return

    applyProfileEffectsLayout(
        shop,
        settingsState.profileEffectsLayoutView || 'grid',
    )
    const search = shop.querySelector('[data-roprime-profile-effects-search]')
    if (search instanceof HTMLInputElement) {
        filterProfileEffectsSearch(shop, search.value)
    }
    void refreshAuthUserId().then(() => {
        normalizeEquippedProfileEffects()
        syncEffectButtons(shop)
    })
    void ensureRegistryOwnershipSynced().then(() => {
        normalizeEquippedProfileEffects()
        syncEffectButtons(shop)
    })
    void hydrateProfilePictureEffectAvatars(shop)
}

// --- Search ban ---

function buildSearchBanRow(word) {
    const row = el('div', 'roprime-sidebar-content-row')
    row.setAttribute('data-roprime-search-ban-row', word)
    const label = el('span', 'roprime-sidebar-content-row-label')
    label.textContent = word
    const btn = el('button', 'roprime-sidebar-content-delete')
    btn.type = 'button'
    btn.setAttribute('data-roprime-search-ban-remove', word)
    setDataI18nAria(btn, 'Search ban remove word')
    appendSvgMarkup(btn, DELETE_ICON_SVG)
    row.append(label, btn)
    return row
}

function buildSearchBanListInto(list) {
    list.textContent = ''
    const words = normalizeSearchBannedWords(settingsState.searchBannedWords)
    if (!words.length) {
        const empty = el('p', 'roprime-sidebar-content-empty')
        setDataI18n(empty, 'Search ban empty hint')
        list.appendChild(empty)
        return
    }
    for (const word of words) list.appendChild(buildSearchBanRow(word))
}

function refreshSearchBanList(root) {
    const list = root.querySelector('[data-roprime-search-ban-list]')
    if (!(list instanceof HTMLElement)) return
    buildSearchBanListInto(list)
    bindSearchBanList(root)
}

function addSearchBannedWord(rawWord) {
    const word = String(rawWord || '').trim()
    if (!word) return false
    const words = normalizeSearchBannedWords(settingsState.searchBannedWords)
    const normalized = word.toLowerCase()
    if (words.some((entry) => entry.toLowerCase() === normalized)) return false
    settingsState.searchBannedWords = [...words, word]
    saveSettings()
    syncSearchBan()
    return true
}

function removeSearchBannedWord(rawWord) {
    const word = String(rawWord || '').trim()
    if (!word) return
    settingsState.searchBannedWords = normalizeSearchBannedWords(
        settingsState.searchBannedWords,
    ).filter((entry) => entry.toLowerCase() !== word.toLowerCase())
    saveSettings()
    syncSearchBan()
}

function syncSearchBanSettingsUi(root) {
    const enabled = !!settingsState.searchBanEnabled
    const field = root.querySelector('.roprime-search-ban-field')
    if (field instanceof HTMLElement) {
        field.hidden = !enabled
        field.setAttribute('aria-hidden', enabled ? 'false' : 'true')
    }
    const panel = root.querySelector('[data-roprime-search-ban-panel]')
    if (panel instanceof HTMLElement) {
        panel.hidden = !enabled
        panel.setAttribute('aria-hidden', enabled ? 'false' : 'true')
    }
}

function bindSearchBanList(root) {
    const list = root.querySelector('[data-roprime-search-ban-list]')
    if (!(list instanceof HTMLElement)) return
    list.querySelectorAll('[data-roprime-search-ban-remove]').forEach((btn) => {
        if (!(btn instanceof HTMLButtonElement)) return
        if (btn.getAttribute('data-roprime-search-ban-remove-bound') === '1') return
        btn.setAttribute('data-roprime-search-ban-remove-bound', '1')
        btn.addEventListener('click', () => {
            removeSearchBannedWord(
                btn.getAttribute('data-roprime-search-ban-remove') || '',
            )
            refreshSearchBanList(root)
        })
    })
}

function commitSearchBanInput(root) {
    const input = root.querySelector('[data-roprime-search-ban-input]')
    if (!(input instanceof HTMLInputElement)) return
    const added = addSearchBannedWord(input.value)
    if (added) {
        input.value = ''
        refreshSearchBanList(root)
    }
}

// --- Settings sync ---

function stripSyncExcludedKeys(payload) {
    for (const key of SYNC_EXCLUDED_KEYS) delete payload[key]
    return payload
}

function getExtensionVersion() {
    try {
        if (!isExtensionContextAlive()) return '0.0.0'
        return extensionApi?.runtime?.getManifest?.()?.version || '0.0.0'
    } catch {
        return '0.0.0'
    }
}

function detectBrowserName() {
    const ua = navigator.userAgent || ''
    if (/firefox/i.test(ua)) return 'firefox'
    if (/edg/i.test(ua)) return 'edge'
    if (/chrome/i.test(ua)) return 'chrome'
    return 'unknown'
}

function stripUtf8Bom(text) {
    const raw = String(text || '')
    return raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw
}

function parseImportPayload(text) {
    const raw = stripUtf8Bom(text).trim()
    if (!raw) throw new Error('Empty file.')
    let parsed
    try {
        parsed = JSON.parse(raw)
    } catch {
        const start = raw.indexOf('{')
        const end = raw.lastIndexOf('}')
        if (start < 0 || end <= start) throw new Error('Invalid JSON.')
        parsed = JSON.parse(raw.slice(start, end + 1))
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('No importable settings object found.')
    }
    const candidates = [
        parsed,
        parsed.roprime,
        parsed.settings,
        parsed[RP_SETTINGS_KEY],
        parsed.data?.roprime,
    ].filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    const hasKnownKey = (obj) =>
        'language' in obj ||
        'renameDropdownEnabled' in obj ||
        'sidebarSize' in obj ||
        'oldNavigationBarEnabled' in obj ||
        'renameMarketplaceToCatalog' in obj
    for (const candidate of candidates) {
        if (hasKnownKey(candidate)) return { ...candidate }
    }
    for (const candidate of candidates) return { ...candidate }
    throw new Error('No importable settings object found.')
}

async function storageSetCompat(storage, data) {
    try {
        const maybePromise = storage.set(data)
        if (maybePromise && typeof maybePromise.then === 'function') {
            await maybePromise
            return
        }
    } catch {}
    await new Promise((resolve, reject) => {
        try {
            storage.set(data, () => {
                const runtimeError = extensionApi?.runtime?.lastError || null
                if (runtimeError) {
                    reject(new Error(runtimeError.message))
                    return
                }
                resolve()
            })
        } catch (e) {
            reject(e)
        }
    })
}

function buildSettingsExportDocument() {
    return {
        about: { browser: detectBrowserName(), version: getExtensionVersion() },
        ...stripSyncExcludedKeys({ ...serializeSettingsPayload() }),
    }
}

function formatSettingsExportJson() {
    return `${JSON.stringify(buildSettingsExportDocument(), null, 2)}\n`
}

function formatExportFilename() {
    const version = getExtensionVersion()
    const d = new Date()
    const date = d.toISOString().slice(0, 10)
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    const s = String(d.getSeconds()).padStart(2, '0')
    return `roprime-${version} ${date} ${h}_${m}_${s}.json`
}

function setSyncStatus(root, message, isError = false) {
    const status = root.querySelector('[data-roprime-settings-sync-status]')
    if (!(status instanceof HTMLElement)) return
    if (!message) {
        status.hidden = true
        status.textContent = ''
        return
    }
    status.hidden = false
    status.textContent = message
    status.classList.toggle('is-error', isError)
}

function refreshSettingsSyncPreview(root) {
    const preview = root.querySelector('[data-roprime-settings-preview]')
    if (!(preview instanceof HTMLTextAreaElement)) return
    preview.value = formatSettingsExportJson()
}

async function copyTextToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text)
        return true
    } catch {
        const fallback = document.createElement('textarea')
        fallback.value = text
        fallback.setAttribute('readonly', '')
        fallback.style.position = 'fixed'
        fallback.style.left = '-9999px'
        document.body.appendChild(fallback)
        fallback.select()
        const copied = document.execCommand('copy')
        fallback.remove()
        return copied
    }
}

async function copySettingsExport(root) {
    const preview = root.querySelector('[data-roprime-settings-preview]')
    const text = preview instanceof HTMLTextAreaElement
        ? preview.value || formatSettingsExportJson()
        : formatSettingsExportJson()
    const copied = await copyTextToClipboard(text)
    setSyncStatus(
        root,
        copied ? accountSettingsPaneT('Settings sync copied') : accountSettingsPaneT('Settings sync copy failed'),
        !copied,
    )
    window.setTimeout(() => setSyncStatus(root, ''), 2200)
}

function exportSettingsFile() {
    const blob = new Blob([formatSettingsExportJson()], {
        type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = formatExportFilename()
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

async function importSettingsText(text) {
    const imported = parseImportPayload(text)
    stripSyncExcludedKeys(imported)
    const storage = getStorageApi()
    if (!storage) throw new Error('Storage API unavailable.')
    const preservedCustomCss = String(settingsState.customCss || '')
    const preservedCustomCssCaution = !!settingsState.customCssCautionAccepted
    mergeStoredSettings(imported)
    settingsState.customCss = preservedCustomCss
    settingsState.customCssCautionAccepted = preservedCustomCssCaution
    const payload = serializeSettingsPayload()
    await storageSetCompat(storage, { [RP_SETTINGS_KEY]: payload })
    saveSettings()
}

async function importSettingsFile(file) {
    const text = await file.text()
    await importSettingsText(text)
}

async function resetAllSettingsFromSync(root) {
    resetSettingsToDefaults()
    updateRenameLoop()
    syncRoEliteView()
    await reloadSettingsUiStrings()
    syncCustomCss()
    syncProfileSettingsRoute()
    refreshSettingsSyncPreview(root)
    const preview = root.querySelector('[data-roprime-settings-preview]')
    if (preview instanceof HTMLTextAreaElement) return preview.value
    return formatSettingsExportJson()
}

function syncLanguageMenuLabels(root) {
    root
        .querySelectorAll('.roprime-language-option[data-lang]')
        .forEach((node) => {
            if (!(node instanceof HTMLButtonElement)) return
            const code = node.getAttribute('data-lang')
            if (!code) return
            const label = langList[code]
            if (typeof label === 'string') node.textContent = label
        })
    const current = root.querySelector('[data-roprime-lang-current]')
    if (current instanceof HTMLElement) {
        const code = currentUiLanguageCode()
        current.textContent = typeof langList[code] === 'string' ? langList[code] : langList.en
    }
}

function wireToggleElements(root) {
    root.querySelectorAll('[data-roprime-settings-key]').forEach((toggleEl) => {
        if (toggleEl.getAttribute('data-roprime-toggle-bound') === '1') return
        toggleEl.setAttribute('data-roprime-toggle-bound', '1')
        const key = toggleEl.getAttribute('data-roprime-settings-key')
        if (!key) return
        const input = toggleEl.querySelector("input[type='checkbox']")
        if (!(input instanceof HTMLInputElement)) return
        input.addEventListener('change', () => {
            settingsState[key] = input.checked
            saveSettings()
            const onChangeRaw = toggleEl.getAttribute('data-roprime-on-change')
            if (onChangeRaw) {
                try {
                    runOnChange(JSON.parse(onChangeRaw), root)
                } catch {
                    /* ignore */
                }
            }
            if (key === 'renameDropdownEnabled') refreshSettingsUi(root)
            if (key === 'cosmeticsEnabled') {
                void (async () => {
                    if (input.checked) await grantAllProfileEffectsToCurrentUser()
                    syncCosmeticsUi(root)
                })()
            }
            if (key === 'searchBanEnabled') syncSearchBanSettingsUi(root)
        })
    })
}

function bindOnce(root) {
    if (root.getAttribute('data-roprime-settings-bound') === '1') return
    root.setAttribute('data-roprime-settings-bound', '1')

    const enterSearchMode = () => {
        const isSearchMode = root.getAttribute('data-roprime-search-mode') === '1'
        const currentPage = getCurrentrp() || RP_DEFAULT_PAGE
        const sourcePage = currentPage === 'info' || currentPage === 'developer' ? RP_DEFAULT_PAGE : currentPage
        root.setAttribute('data-roprime-search-source-page', sourcePage)
        if (!isSearchMode) {
            const si = root.querySelector('#roprime-settings-search')
            if (si instanceof HTMLInputElement) si.value = ''
        }
        root.setAttribute('data-roprime-search-mode', '1')
        refreshLayoutAndNav(root)
    }

    const unlockDeveloperPage = () => {
        if (isDeveloperPageUnlocked()) return
        settingsState.developerPageUnlocked = true
        saveSettings()
        root.setAttribute('data-roprime-developer-unlock-message-visible', '1')
        refreshLayoutAndNav(root)
    }

    const searchWrap = root.querySelector('[data-roprime-shared-search-wrap]')
    const search = root.querySelector('#roprime-settings-search')
    if (search instanceof HTMLInputElement) {
        search.addEventListener('focus', enterSearchMode)
        search.addEventListener('click', enterSearchMode)
        search.addEventListener('input', () => {
            if (root.getAttribute('data-roprime-search-mode') !== '1') return
            if (search.value.trim().toLowerCase() === RP_DEBUG_UNLOCK) {
                unlockDeveloperPage()
            }
            refreshLayoutAndNav(root)
        })
    }
    if (searchWrap instanceof HTMLElement) {
        searchWrap.addEventListener('pointerdown', () => enterSearchMode(), true)
    }

    const navigateToPage = (nextPage) => {
        root.removeAttribute('data-roprime-search-mode')
        root.removeAttribute('data-roprime-search-source-page')
        const searchBox = root.querySelector('#roprime-settings-search')
        if (searchBox instanceof HTMLInputElement) searchBox.value = ''
        const nextUrl = buildPluginUrl(nextPage)
        const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
        if (currentUrl !== nextUrl) window.history.pushState({}, '', nextUrl)
        window.dispatchEvent(new Event('roprime-location-change'))
    }

    root.querySelectorAll('[data-roprime-nav-page]').forEach((li) => {
        if (!(li instanceof HTMLElement)) return
        const link = li.querySelector('a')
        if (!(link instanceof HTMLAnchorElement)) return
        link.addEventListener('click', (event) => {
            event.preventDefault()
            const page = li.getAttribute('data-roprime-nav-page') || RP_DEFAULT_PAGE
            if (page === 'developer' && !isDeveloperPageUnlocked()) return
            navigateToPage(page)
        })
    })

    const profileEffectsAlert = root.querySelector(
        '[data-roprime-profile-effects-alert]',
    )
    if (profileEffectsAlert instanceof HTMLAnchorElement) {
        profileEffectsAlert.addEventListener('click', (event) => {
            event.preventDefault()
            navigateToPage('other')
        })
    }

    wireToggleElements(root)

    root.querySelectorAll('[data-roprime-accordion]').forEach((accordion) => {
        if (!(accordion instanceof HTMLElement)) return
        const accHeader = accordion.querySelector('.roprime-accordion-header')
        const accBody = accordion.querySelector('.roprime-accordion-body')
        if (!(accHeader instanceof HTMLElement) || !(accBody instanceof HTMLElement)) {
            return
        }
        const syncA11y = () => {
            const isOpen = accordion.classList.contains('is-open')
            accHeader.setAttribute('aria-expanded', String(isOpen))
            accBody.setAttribute('aria-hidden', String(!isOpen))
            accBody.toggleAttribute('hidden', !isOpen)
        }
        accHeader.addEventListener('click', (event) => {
            if (
                event.target instanceof Element &&
                event.target.closest('.roprime-accordion-master-switch')
            ) {
                return
            }
            accordion.classList.toggle('is-open')
            syncA11y()
        })
        accHeader.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return
            if (
                event.target instanceof Element &&
                event.target.closest('.roprime-accordion-master-switch')
            ) {
                return
            }
            event.preventDefault()
            accordion.classList.toggle('is-open')
            syncA11y()
        })
        syncA11y()
    })

    const mv = sidebarModeValues()
    root.querySelectorAll('.roprime-sidebar-size-slider').forEach((slider) => {
        if (!(slider instanceof HTMLInputElement)) return
        const commitNearest = () => {
            const mode = nearestSidebarMode(slider.value)
            slider.value = String(mv[mode] ?? mv.full)
            slider.removeAttribute('data-roprime-dragging')
            applySidebarMode(root, mode)
        }
        slider.addEventListener('input', () => {
            slider.setAttribute('data-roprime-dragging', '1')
            setSidebarModeVisual(root, nearestSidebarMode(slider.value))
        })
        slider.addEventListener('change', commitNearest)
        slider.addEventListener('pointerup', commitNearest)
        slider.addEventListener('pointercancel', commitNearest)
        slider.addEventListener('blur', () => {
            if (slider.getAttribute('data-roprime-dragging') === '1') commitNearest()
        })
        root.querySelectorAll('.roprime-sidebar-size-tick').forEach((tick) => {
            if (!(tick instanceof HTMLButtonElement)) return
            if (tick.getAttribute('data-roprime-sidebar-tick-bound') === '1') return
            tick.setAttribute('data-roprime-sidebar-tick-bound', '1')
            tick.addEventListener('click', () => {
                const mode = tick.dataset.sizeMode || 'full'
                root.querySelectorAll('.roprime-sidebar-size-slider').forEach((s) => {
                    if (s instanceof HTMLInputElement) {
                        s.value = String(mv[mode] ?? mv.full)
                        s.removeAttribute('data-roprime-dragging')
                    }
                })
                applySidebarMode(root, mode)
            })
        })
    })

    const openSidebarContent = root.querySelector(
        '[data-roprime-open-sidebar-content]',
    )
    if (openSidebarContent instanceof HTMLButtonElement) {
        openSidebarContent.addEventListener('click', () => navigateToPage('sidebar-content'))
    }
    const backSidebarContent = root.querySelector(
        '[data-roprime-sidebar-content-back]',
    )
    if (backSidebarContent instanceof HTMLButtonElement) {
        backSidebarContent.addEventListener('click', () => navigateToPage('design'))
    }

    bindSidebarContentList(root)

    const languageDropdown = root.querySelector('[data-roprime-language-dropdown]')
    const languageMenu = languageDropdown?.querySelector('.roprime-language-menu')
    const languageTrigger = languageDropdown?.querySelector('.roprime-language-trigger')
    if (
        languageDropdown instanceof HTMLElement &&
        languageMenu instanceof HTMLElement &&
        languageTrigger instanceof HTMLButtonElement
    ) {
        const closeLanguageMenu = () => {
            languageDropdown.classList.remove('is-open')
            languageMenu.hidden = true
        }
        languageTrigger.addEventListener('click', (e) => {
            e.stopPropagation()
            const next = !languageDropdown.classList.contains('is-open')
            languageDropdown.classList.toggle('is-open', next)
            languageMenu.hidden = !next
        })
        languageMenu.querySelectorAll('.roprime-language-option').forEach((option) => {
            if (!(option instanceof HTMLButtonElement)) return
            option.addEventListener('click', () => {
                void (async () => {
                    const next = String(option.dataset.lang || '').toLowerCase()
                    if (!(next in langList)) return
                    settingsState.language = next
                    saveSettings()
                    await reloadSettingsUiStrings()
                    closeLanguageMenu()
                    refreshSettingsUi(root)
                    syncAccountSettingsMenuButton()
                })()
            })
        })
        document.addEventListener('mousedown', (event) => {
            if (!(event.target instanceof Element)) return
            if (!languageDropdown.classList.contains('is-open')) return
            if (languageDropdown.contains(event.target)) return
            closeLanguageMenu()
        })
    }

    const addBanBtn = root.querySelector('[data-roprime-search-ban-add]')
    if (addBanBtn instanceof HTMLButtonElement) {
        addBanBtn.addEventListener('click', () => commitSearchBanInput(root))
    }
    const banInput = root.querySelector('[data-roprime-search-ban-input]')
    if (banInput instanceof HTMLInputElement) {
        banInput.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            commitSearchBanInput(root)
        })
    }
    bindSearchBanList(root)

    refreshSettingsSyncPreview(root)
    const preview = root.querySelector('[data-roprime-settings-preview]')
    let previewSaveTimer = 0
    let previewLastSaved = preview instanceof HTMLTextAreaElement ? preview.value : ''

    root.querySelector('[data-roprime-settings-copy]')?.addEventListener('click', () => {
        void copySettingsExport(root)
    })
    root.querySelector('[data-roprime-settings-export]')?.addEventListener('click', () => {
        refreshSettingsSyncPreview(root)
        exportSettingsFile()
        setSyncStatus(root, accountSettingsPaneT('Settings sync exported'))
        window.setTimeout(() => setSyncStatus(root, ''), 2200)
    })
    const importInput = root.querySelector('[data-roprime-settings-import-input]')
    root.querySelector('[data-roprime-settings-import]')?.addEventListener('click', () => {
        if (importInput instanceof HTMLInputElement) {
            importInput.value = ''
            importInput.click()
        }
    })
    importInput?.addEventListener('change', () => {
        const file = importInput instanceof HTMLInputElement ? importInput.files?.[0] : null
        if (!file) return
        void (async () => {
            try {
                await importSettingsFile(file)
                refreshSettingsSyncPreview(root)
                const nextPreview = root.querySelector('[data-roprime-settings-preview]')
                if (nextPreview instanceof HTMLTextAreaElement) {
                    previewLastSaved = nextPreview.value
                }
                setSyncStatus(root, accountSettingsPaneT('Settings sync imported'))
                window.setTimeout(() => setSyncStatus(root, ''), 2200)
            } catch {
                setSyncStatus(root, accountSettingsPaneT('Settings sync import failed'), true)
            }
        })()
    })
    root.querySelector('[data-roprime-settings-reset]')?.addEventListener('click', () => {
        void (async () => {
            try {
                previewLastSaved = await resetAllSettingsFromSync(root)
                setSyncStatus(root, accountSettingsPaneT('Settings sync reset done'))
                window.setTimeout(() => setSyncStatus(root, ''), 2200)
            } catch {
                setSyncStatus(root, accountSettingsPaneT('Settings sync reset failed'), true)
            }
        })()
    })
    if (preview instanceof HTMLTextAreaElement) {
        preview.addEventListener('input', () => {
            window.clearTimeout(previewSaveTimer)
            previewSaveTimer = window.setTimeout(() => {
                const normalized = preview.value
                if (normalized === previewLastSaved) return
                if (!normalized.trim()) {
                    void (async () => {
                        try {
                            previewLastSaved = await resetAllSettingsFromSync(root)
                            setSyncStatus(root, accountSettingsPaneT('Settings sync reset done'))
                            window.setTimeout(() => setSyncStatus(root, ''), 2200)
                        } catch {
                            setSyncStatus(root, accountSettingsPaneT('Settings sync reset failed'), true)
                        }
                    })()
                    return
                }
                void (async () => {
                    try {
                        await importSettingsText(normalized)
                        previewLastSaved = normalized
                        setSyncStatus(root, accountSettingsPaneT('Settings sync saved'))
                        window.setTimeout(() => setSyncStatus(root, ''), 1600)
                    } catch {
                        setSyncStatus(root, accountSettingsPaneT('Settings sync import failed'), true)
                    }
                })()
            }, 500)
        })
    }

    const shop = root.querySelector('[data-roprime-cosmetics-shop]')
    if (shop instanceof HTMLElement) {
        const effectSearch = shop.querySelector('[data-roprime-profile-effects-search]')
        if (effectSearch instanceof HTMLInputElement) {
            effectSearch.addEventListener('input', () => {
                filterProfileEffectsSearch(shop, effectSearch.value)
            })
        }
        shop.querySelectorAll('[data-roprime-profile-effects-layout]').forEach((btn) => {
            if (!(btn instanceof HTMLButtonElement)) return
            btn.addEventListener('click', () => {
                const layout = btn.getAttribute('data-roprime-profile-effects-layout')
                if (!layout) return
                settingsState.profileEffectsLayoutView = normalizeProfileEffectsLayoutView(layout)
                saveSettings()
                applyProfileEffectsLayout(shop, settingsState.profileEffectsLayoutView)
            })
        })
        shop.addEventListener('click', (event) => {
            const target = event.target
            if (!(target instanceof Element)) return
            const btn = target.closest('[data-roprime-effect-id]')
            if (!(btn instanceof HTMLButtonElement)) return
            const effectId = btn.getAttribute('data-roprime-effect-id')
            const action = btn.getAttribute('data-roprime-effect-action')
            if (!effectId || !action) return
            const effect = getProfileEffectById(effectId)
            if (!effect) return
            if (action === 'equip') {
                void (async () => {
                    if (!settingsState.profileEffectsSupportNoticeAccepted) {
                        const accepted = await promptProfileEffectsSupportNotice()
                        if (!accepted) return
                        settingsState.profileEffectsSupportNoticeAccepted = true
                        saveSettings()
                    }
                    const userId = await refreshAuthUserId()
                    let equipSaved = true
                    if (userId) {
                        equipSaved = await registerProfileEffectEquip(
                            userId,
                            effectId,
                            effect.kind,
                        )
                    }
                    if (isSupabaseProfileEffectsEnabled() && !equipSaved) return
                    setEquippedEffectIdForKind(effect.kind, effectId)
                    if (userId) setEquippedForUser(userId, effectId, effect.kind)
                    saveSettings()
                    syncCosmeticsUi(root)
                })()
                return
            }
            if (action === 'unequip') {
                void (async () => {
                    const userId = await refreshAuthUserId()
                    let equipSaved = true
                    if (userId) {
                        equipSaved = await registerProfileEffectEquip(userId, '', effect.kind)
                    }
                    if (isSupabaseProfileEffectsEnabled() && !equipSaved) return
                    if (getEquippedEffectIdForKind(effect.kind) === effectId) {
                        setEquippedEffectIdForKind(effect.kind, '')
                    }
                    if (userId) setEquippedForUser(userId, '', effect.kind)
                    saveSettings()
                    syncCosmeticsUi(root)
                })()
            }
        })
    }
}

function refreshLayoutAndNav(root) {
    const activePage = getCurrentrp() || RP_DEFAULT_PAGE
    const pageDef = SETTINGS_CONFIG[activePage]
    const isSearchMode = root.getAttribute('data-roprime-search-mode') === '1'
    const searchSourcePage = root.getAttribute('data-roprime-search-source-page') || RP_DEFAULT_PAGE
    const searchInput = root.querySelector('#roprime-settings-search')
    const searchTerm = searchInput instanceof HTMLInputElement ? searchInput.value.trim().toLowerCase() : ''
    const hasSearchTerm = searchTerm.length >= 2
    const showSearchHint = isSearchMode && searchTerm.length > 0 && searchTerm.length < 2
    const unlocked = isDeveloperPageUnlocked()

    root.classList.toggle('is-search-mode', isSearchMode)

    const hint = root.querySelector('[data-roprime-search-hint]')
    if (hint instanceof HTMLElement) {
        hint.style.display = showSearchHint ? 'block' : 'none'
    }

    const pageTitle = root.querySelector('[data-roprime-page-title]')
    if (pageTitle instanceof HTMLElement) {
        const titleKey = pageDef?.titleKey || 'Nav tab design'
        pageTitle.textContent = accountSettingsPaneT(titleKey)
    }

    root.querySelectorAll('[data-roprime-nav-page]').forEach((li) => {
        if (!(li instanceof HTMLElement)) return
        const page = li.getAttribute('data-roprime-nav-page') || ''
        if (page === 'developer' && !unlocked) {
            li.hidden = true
            return
        }
        li.hidden = false
        const link = li.querySelector('a')
        if (link instanceof HTMLElement) {
            link.classList.toggle(
                'active',
                !isSearchMode && page === activePage,
            )
            if (!isSearchMode && page === activePage) {
                link.setAttribute('aria-current', 'page')
            } else {
                link.removeAttribute('aria-current')
            }
        }
    })

    const profileEffectsAlert = root.querySelector(
        '[data-roprime-profile-effects-alert]',
    )
    if (profileEffectsAlert instanceof HTMLElement) {
        profileEffectsAlert.classList.toggle(
            'is-active',
            !isSearchMode && activePage === 'other',
        )
    }

    const devHint = root.querySelector('[data-roprime-developer-unlock-message]')
    if (devHint instanceof HTMLElement) {
        devHint.style.display = root.getAttribute('data-roprime-developer-unlock-message-visible') === '1'
            ? 'block'
            : 'none'
    }

    root.querySelectorAll(`[${RP_PAGE_CONTENT_ATTR}]`).forEach((pageEl) => {
        if (!(pageEl instanceof HTMLElement)) return
        const pageKey = pageEl.getAttribute(RP_PAGE_CONTENT_ATTR) || ''
        if (pageKey === 'developer' && !unlocked) {
            pageEl.hidden = true
            return
        }
        if (isSearchMode) {
            if (showSearchHint) {
                pageEl.hidden = true
                return
            }
            if (!hasSearchTerm) {
                pageEl.hidden = pageKey !== searchSourcePage
                pageEl.querySelectorAll('.setting-section').forEach((section) => {
                    if (section instanceof HTMLElement) section.style.display = ''
                })
                return
            }
            if (pageKey === 'info' || pageKey === 'developer') {
                pageEl.hidden = true
                return
            }
            let hasVisible = false
            pageEl.querySelectorAll('.setting-section').forEach((section) => {
                if (!(section instanceof HTMLElement)) return
                const text = (section.textContent || '').toLowerCase()
                const match = text.includes(searchTerm)
                section.style.display = match ? '' : 'none'
                if (match) hasVisible = true
            })
            pageEl.hidden = !hasVisible
            return
        }
        pageEl.querySelectorAll('.setting-section').forEach((section) => {
            if (section instanceof HTMLElement) section.style.display = ''
        })
        pageEl.hidden = pageKey !== activePage
    })

    if (
        searchInput instanceof HTMLInputElement &&
        !isSearchMode &&
        searchInput.value
    ) {
        searchInput.value = ''
    }
}

function refreshSettingsUi(root) {
    applyI18n(root)
    syncLanguageMenuLabels(root)

    root.querySelectorAll('[data-roprime-settings-key]').forEach((toggleEl) => {
        const key = toggleEl.getAttribute('data-roprime-settings-key')
        if (!key) return
        setToggleChecked(toggleEl, !!settingsState[key])
    })

    const accordion = root.querySelector('[data-roprime-accordion="rename"]')
    if (accordion instanceof HTMLElement) {
        accordion.classList.toggle(
            'is-renames-disabled',
            !settingsState.renameDropdownEnabled,
        )
    }

    syncSidebarSliderFromState(root)

    const activePage = getCurrentrp() || RP_DEFAULT_PAGE
    const onSidebarContentPage = activePage === 'sidebar-content'
    root.querySelectorAll('[data-roprime-open-sidebar-content]').forEach((btn) => {
        if (!(btn instanceof HTMLElement)) return
        btn.hidden = onSidebarContentPage
        btn.style.display = onSidebarContentPage ? 'none' : ''
    })
    if (onSidebarContentPage) refreshSidebarContentList(root)

    syncCustomCssUi(root)
    syncCosmeticsUi(root)
    syncSearchBanSettingsUi(root)
    refreshSearchBanList(root)
    refreshSettingsSyncPreview(root)
    refreshLayoutAndNav(root)
}

function teardownSettings() {
    setSettingsHostVisible(false)
    setAccountSettingsShellClass(false)
    syncAccountSettingsLayoutInset()
    clearSettingsPageLayout()
    destroyCssEditor()
}

export function showRoPrimeSettingsPanel() {
    const host = ensureSettingsHost()
    if (!(host instanceof HTMLElement)) return

    setAccountSettingsShellClass(true)
    syncAccountSettingsLayoutInset()
    setSettingsHostVisible(true)
    updateDocumentTitle(true)

    if (host.getAttribute('data-roprime-settings-bound') !== '1') {
        bindOnce(host)
    }
    refreshSettingsUi(host)
}

export function openRoPrimeSettingsOnAccountPage(page = RP_DEFAULT_PAGE) {
    if (!isMyAccountPath()) return false

    ensureSettingsHost()

    const nextUrl = buildPluginUrl(page)
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
    if (currentUrl !== nextUrl) {
        window.history.pushState({}, '', nextUrl)
        window.dispatchEvent(new Event('roprime-location-change'))
    }

    showRoPrimeSettingsPanel()
    return true
}

export function syncProfileSettingsRoute() {
    if (!isMyAccountPath()) {
        teardownSettings()
        updateDocumentTitle(false)
        return
    }

    ensureSettingsHost()

    if (!isPluginRoute()) {
        teardownSettings()
        updateDocumentTitle(false)
        return
    }

    resolveSettingsMountHost()

    const rpPage = getCurrentrp()
    if (rpPage === 'developer' && !settingsState.developerPageUnlocked) {
        const nextUrl = buildPluginUrl(RP_DEFAULT_PAGE)
        const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
        if (currentUrl !== nextUrl) {
            window.history.replaceState({}, '', nextUrl)
            window.dispatchEvent(new Event('roprime-location-change'))
        }
    }

    showRoPrimeSettingsPanel()
}
