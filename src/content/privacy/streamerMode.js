import {
    promptContentRevealStreamerModeCautionNotice,
    promptPageRevealStreamerModeCautionNotice,
} from '../alerts/alert.js'
import { settingsState, shouldRunRoPrimeOnCurrentPage } from '../core/core.js'
import { registerFeature } from '../features/registry.js'
import { attachSpoiler, getSpoilerApi, isSpoilerHost } from '../ui/spoiler.js'

const STYLE_ID = 'roprime-streamer-mode-style'
const MARK_ATTR = 'data-roprime-streamer-spoiler'
const REVEALED_ATTR = 'data-roprime-streamer-revealed'
const PENDING_ATTR = 'data-roprime-streamer-pending'
const PAGE_OK_PREFIX = 'roprime-streamer-page-ok:'

const STREAMER_MODE_CSS = `
.foundation-web-menu.nav-foundation-menu .wallet-hidden {
    display: none !important;
}
.rbx-header .rbx-navbar-right-nav>li .dropdown-menu .wallet-hidden,
.rbx-header .rbx-navbar-icon-group>li .dropdown-menu .wallet-hidden {
    display: none !important;
}
div[data-section-type="PAYMENTS_PRODUCT_SECTION_TYPE_TRANSFERS"] > div:first-child {
    display: none !important;
}
.roprime-spoiler[${MARK_ATTR}] {
    max-width: 100% !important;
    box-sizing: border-box !important;
}
.roprime-spoiler[${MARK_ATTR}][data-length-masked="1"] {
    overflow: hidden !important;
    vertical-align: middle;
}
.roprime-spoiler[${MARK_ATTR}]:has(.icon-robux-container),
.roprime-spoiler[${MARK_ATTR}]:has(.amount),
.roprime-spoiler[${MARK_ATTR}]:has(#nav-robux-amount) {
    display: inline-block !important;
    max-width: 100% !important;
    min-width: 0 !important;
    vertical-align: middle;
}
`

const ROBUX_AMOUNT_SELECTOR = [
    '#nav-robux-amount',
    '#nav-robux-balance',
    '.icon-robux-container',
    '.amount.icon-robux-container',
    '.amount .icon-robux-container',
    'span.amount.icon-robux-container',
    'span.icon-robux-container',
    '.text-robux',
    '.text-robux-lg',
    '.text-robux-tile',
    '.text-robux-nav',
    '.rbx-text-robux',
    '.rbx-text-robux-lg',
].join(', ')

const SPOILER_TARGETS = [
    {
        match: () => isMyAccountPath(),
        selector: '.settings-text-span-visible',
        gapBefore: true,
        maskLength: true,
        compact: true,
    },
    {
        match: () => isAccountInfoPage(),
        selector: '.social-networks-container .stacked-user-input-children',
        blockLayout: true,
    },
    {
        match: () => isBlockedUsersPage(),
        selector: '.blocked-users-container',
        blockLayout: true,
    },
    {
        match: () => true,
        selector: ROBUX_AMOUNT_SELECTOR,
        maskLength: true,
        compact: true,
    },
]

let observer = null
let promptInFlight = false
let pageCautionInFlight = false
let lastPageCautionKey = ''

function pathname() {
    return globalThis.location.pathname || ''
}

function accountHash() {
    return String(globalThis.location.hash || '').toLowerCase()
}

function isMyAccountPath() {
    return /\/(?:[a-z]{2,3}(?:-[a-z0-9]{2,8})?\/)?my\/account\/?$/i.test(pathname())
}

function isAccountInfoPage() {
    if (!isMyAccountPath()) return false
    const hash = accountHash()
    return !hash || hash === '#' || hash === '#!/info' || hash.startsWith('#!/info')
}

function isAccountDataDeactivationPage() {
    if (!isMyAccountPath()) return false
    return accountHash().includes('accountdatadeactivationanddeletion')
}

function isBlockedUsersPage() {
    if (!isMyAccountPath()) return false
    return accountHash().includes('blockedusers')
}

function isBillingPage() {
    if (!isMyAccountPath()) return false
    return accountHash().includes('billing')
}

function isTransactionsPage() {
    return /\/transactions(?:\/|$)/i.test(pathname())
}

function isSensitiveStreamerPage() {
    return isTransactionsPage() || isBillingPage()
}

function pageCautionStorageKey() {
    return `${PAGE_OK_PREFIX}${pathname()}${accountHash()}`
}

function isStreamerModeEnabled() {
    return !!settingsState.streamerModeEnabled
}

function ensureStyle() {
    let style = document.getElementById(STYLE_ID)
    if (!(style instanceof HTMLStyleElement)) {
        style = document.createElement('style')
        style.id = STYLE_ID
        ;(document.head || document.documentElement).appendChild(style)
    }
    if (style.textContent !== STREAMER_MODE_CSS) style.textContent = STREAMER_MODE_CSS
}

function removeStyle() {
    document.getElementById(STYLE_ID)?.remove()
}

function findTargetElements() {
    const found = []
    for (const target of SPOILER_TARGETS) {
        if (!target.match()) continue
        for (const node of document.querySelectorAll(target.selector)) {
            if (!(node instanceof HTMLElement)) continue
            if (node.closest(`[${MARK_ATTR}]`)) continue
            if (node.hasAttribute(MARK_ATTR)) continue
            found.push({
                node,
                gapBefore: target.gapBefore === true,
                maskLength: target.maskLength === true,
                blockLayout: target.blockLayout === true,
                compact: target.compact === true,
            })
        }
    }
    return found
}

function unwrapSpoiler(spoiler) {
    if (!(spoiler instanceof HTMLElement)) return
    const api = getSpoilerApi(spoiler)
    if (api?.destroy) {
        api.destroy()
        return
    }
    const parent = spoiler.parentNode
    if (!parent) {
        spoiler.remove()
        return
    }
    const content = spoiler.querySelector('.roprime-spoiler-content')
    const source = content || spoiler
    while (source.firstChild) parent.insertBefore(source.firstChild, spoiler)
    spoiler.remove()
}

function cleanupSpoilers() {
    for (const spoiler of document.querySelectorAll(`[${MARK_ATTR}]`)) {
        unwrapSpoiler(spoiler)
    }
}

/**
 * @param {HTMLElement} spoiler
 * @param {{ clientX?: number, clientY?: number }} [point]
 */
async function revealSpoiler(spoiler, point = {}) {
    if (!(spoiler instanceof HTMLElement)) return
    if (spoiler.hasAttribute(REVEALED_ATTR)) return

    spoiler.setAttribute(PENDING_ATTR, '1')
    try {
        const accepted = await promptContentRevealStreamerModeCautionNotice()
        if (!accepted) return

        spoiler.setAttribute(REVEALED_ATTR, '1')
        const api = getSpoilerApi(spoiler)
        if (api?.reveal) {
            api.reveal(point.clientX, point.clientY)
            return
        }
        unwrapSpoiler(spoiler)
    } finally {
        spoiler.removeAttribute(PENDING_ATTR)
    }
}

function attachSpoilerClickGate(spoiler) {
    if (!(spoiler instanceof HTMLElement)) return
    if (spoiler.dataset.roprimeStreamerGate === '1') return
    spoiler.dataset.roprimeStreamerGate = '1'

    const onActivate = (event) => {
        if (spoiler.hasAttribute(REVEALED_ATTR)) return
        if (isSpoilerHost(spoiler) && getSpoilerApi(spoiler)?.isRevealed?.()) {
            return
        }
        if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        event.stopImmediatePropagation()
        if (spoiler.hasAttribute(PENDING_ATTR) || promptInFlight) return
        promptInFlight = true
        const point = {
            clientX: typeof event.clientX === 'number' ? event.clientX : undefined,
            clientY: typeof event.clientY === 'number' ? event.clientY : undefined,
        }
        void revealSpoiler(spoiler, point).finally(() => {
            promptInFlight = false
        })
    }

    spoiler.addEventListener('click', onActivate, true)
    spoiler.addEventListener('keydown', onActivate, true)
}

function wrapWithSpoiler(entry) {
    const target = entry?.node
    if (!(target instanceof HTMLElement)) return
    if (target.closest(`[${MARK_ATTR}]`)) return
    if (!target.isConnected || !target.parentNode) return

    const spoiler = document.createElement('span')
    spoiler.setAttribute(MARK_ATTR, '1')

    const blockLayout = entry.blockLayout === true
    const compact = entry.compact === true ||
        target.classList.contains('icon-robux-container') ||
        target.classList.contains('amount') ||
        target.classList.contains('settings-text-span-visible') ||
        target.id === 'nav-robux-amount' ||
        target.id === 'nav-robux-balance' ||
        target.classList.contains('rbx-text-navbar-right') ||
        target.classList.contains('text-robux') ||
        target.classList.contains('text-robux-lg') ||
        target.classList.contains('text-robux-tile') ||
        target.classList.contains('rbx-text-robux') ||
        target.classList.contains('rbx-text-robux-lg')

    if (compact) {
        spoiler.style.display = 'inline-block'
        spoiler.style.maxWidth = '100%'
        spoiler.style.minWidth = '0'
        spoiler.style.boxSizing = 'border-box'
        spoiler.style.verticalAlign = 'middle'
        spoiler.style.overflow = 'hidden'
    } else if (blockLayout) {
        spoiler.style.display = 'block'
        spoiler.style.width = '100%'
        spoiler.style.maxWidth = '100%'
    } else {
        const display = globalThis.getComputedStyle(target).display
        if (display && display !== 'inline') {
            spoiler.style.display = display === 'flex' || display === 'grid' ? display : 'inline-block'
            if (display === 'block' || display === 'flex' || display === 'grid') {
                spoiler.style.width = '100%'
                spoiler.style.maxWidth = '100%'
            }
        }
    }

    target.parentNode.insertBefore(spoiler, target)
    spoiler.appendChild(target)
    const shortField = target.classList.contains('settings-text-span-visible')
    attachSpoiler(spoiler, {
        revealDuration: 420,
        maskLength: entry.maskLength === true || compact,
        gapBefore: entry.gapBefore === true,
        blockLayout: compact ? false : blockLayout,
        compact,
        shortField,
    })
    attachSpoilerClickGate(spoiler)
}

function applySpoilers() {
    for (const entry of findTargetElements()) {
        wrapWithSpoiler(entry)
    }
}

function leaveSensitivePage() {
    try {
        if (globalThis.history.length > 1) {
            globalThis.history.back()
            return
        }
    } catch {
        /* ignore */
    }
    globalThis.location.href = `${globalThis.location.origin}/home`
}

async function syncPageCaution() {
    if (!shouldRunRoPrimeOnCurrentPage() || !isStreamerModeEnabled()) {
        lastPageCautionKey = ''
        return
    }
    if (!isSensitiveStreamerPage()) {
        lastPageCautionKey = ''
        return
    }

    const key = pageCautionStorageKey()
    if (lastPageCautionKey === key && pageCautionInFlight) return
    try {
        if (globalThis.sessionStorage?.getItem(key) === '1') {
            lastPageCautionKey = key
            return
        }
    } catch {
        /* private mode */
    }

    if (pageCautionInFlight) return
    pageCautionInFlight = true
    lastPageCautionKey = key
    try {
        const accepted = await promptPageRevealStreamerModeCautionNotice()
        if (accepted) {
            try {
                globalThis.sessionStorage?.setItem(key, '1')
            } catch {
                /* ignore */
            }
            return
        }
        leaveSensitivePage()
    } finally {
        pageCautionInFlight = false
    }
}

function stopObserver() {
    if (!observer) return
    observer.disconnect()
    observer = null
}

function ensureObserver() {
    if (observer || !document.documentElement) return
    observer = new MutationObserver(() => {
        if (!isStreamerModeEnabled() || !shouldRunRoPrimeOnCurrentPage()) return
        applySpoilers()
    })
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
    })
}

function disableStreamerMode() {
    stopObserver()
    cleanupSpoilers()
    removeStyle()
}

function enableStreamerMode() {
    ensureStyle()
    ensureObserver()
    applySpoilers()
}

export function syncStreamerMode() {
    if (!shouldRunRoPrimeOnCurrentPage() || !isStreamerModeEnabled()) {
        disableStreamerMode()
        void syncPageCaution()
        return
    }
    enableStreamerMode()
    void syncPageCaution()
}

registerFeature(syncStreamerMode)
syncStreamerMode()

globalThis.addEventListener('hashchange', syncStreamerMode)
globalThis.addEventListener('popstate', syncStreamerMode)
globalThis.addEventListener('roprime-location-change', syncStreamerMode)
