import { getExtensionResourceUrl, loadSettings, RP_SETTINGS_KEY, settingsState } from '../core/core.js'

const INJECTED_ATTR = 'data-roprime-navigation-injected'
const PAGE_FLAG = '__ROPRIME_NAVIGATION_EVALED'
const SCRIPT_ATTR = 'data-roprime-navigation'
const extensionApi = globalThis.browser || globalThis.chrome
let booted = false
let observer = null

function isFirefox() {
    try {
        const ua = String(globalThis.navigator?.userAgent || '')
        if (/firefox/i.test(ua)) return true
        return typeof globalThis.browser?.runtime?.getBrowserInfo === 'function'
    } catch {
        return false
    }
}

function getPageWindow() {
    try {
        if (globalThis.wrappedJSObject) return globalThis.wrappedJSObject
    } catch {
        /* ignore */
    }
    return null
}

function pageNavigationAlreadyLoaded() {
    if (document.documentElement?.getAttribute(INJECTED_ATTR) === '1') return true
    try {
        const page = getPageWindow()
        if (page && page[PAGE_FLAG]) return true
    } catch {
        /* ignore */
    }
    return false
}

function isRobloxNavigationScript(node) {
    if (!(node instanceof HTMLScriptElement)) return false
    if (node.dataset?.roprimeNavigation === '1') return false
    const src = String(node.src || node.getAttribute('src') || '')
    if (!src) return false
    try {
        const url = new URL(src, String(globalThis.location?.href || 'https://www.roblox.com/'))
        if (!/\.rbxcdn\.com$/i.test(url.hostname)) return false
        return /Navigation\.js$/i.test(url.pathname)
    } catch {
        return /Navigation\.js/i.test(src) && /rbxcdn\.com/i.test(src)
    }
}

function getVendorNavigationUrl() {
    return getExtensionResourceUrl('resources/vendor/Navigation.js')
}

function rewriteNavigationScript(script) {
    if (!isRobloxNavigationScript(script)) return false
    if (pageNavigationAlreadyLoaded()) {
        document.documentElement?.setAttribute(INJECTED_ATTR, '1')
        return true
    }

    const url = getVendorNavigationUrl()
    if (!url) return false

    const next = document.createElement('script')
    next.src = url
    next.async = false
    if (script.defer) next.defer = true
    next.dataset.roprimeNavigation = '1'
    next.setAttribute(SCRIPT_ATTR, '1')

    try {
        script.replaceWith(next)
    } catch {
        const parent = script.parentNode
        if (!parent) return false
        parent.insertBefore(next, script)
        script.remove()
    }

    document.documentElement?.setAttribute(INJECTED_ATTR, '1')
    return true
}

function scanAndRewrite(root) {
    if (!settingsState.topbarRedesignEnabled) return
    if (pageNavigationAlreadyLoaded()) return

    if (root instanceof HTMLScriptElement) {
        rewriteNavigationScript(root)
        return
    }

    if (!(root instanceof Element) && root !== document) return

    const scripts = typeof root.querySelectorAll === 'function' ? root.querySelectorAll('script[src]') : []
    for (const script of scripts) {
        if (pageNavigationAlreadyLoaded()) return
        rewriteNavigationScript(script)
    }
}

function ensureObserver() {
    if (observer || typeof MutationObserver !== 'function') return
    try {
        observer = new MutationObserver((records) => {
            if (!settingsState.topbarRedesignEnabled) return
            if (pageNavigationAlreadyLoaded()) return
            for (const record of records) {
                for (const node of record.addedNodes || []) {
                    scanAndRewrite(node)
                }
            }
        })
        const root = document.documentElement || document
        observer.observe(root, { childList: true, subtree: true })
    } catch {
        observer = null
    }
}

export async function syncTopbarNavigationOverride() {
    if (!isFirefox()) return
    if (!settingsState.topbarRedesignEnabled) return
    ensureObserver()
    scanAndRewrite(document)
}

export function bootTopbarNavigationOverride() {
    if (booted) return
    booted = true
    if (!isFirefox()) return

    try {
        extensionApi?.storage?.local?.get([RP_SETTINGS_KEY], (result) => {
            try {
                if (result?.[RP_SETTINGS_KEY]?.topbarRedesignEnabled) {
                    settingsState.topbarRedesignEnabled = true
                    ensureObserver()
                    scanAndRewrite(document)
                }
            } catch {
                /* ignore */
            }
        })
    } catch {
        /* ignore */
    }

    void loadSettings().finally(() => {
        void syncTopbarNavigationOverride()
    })

    ensureObserver()
    scanAndRewrite(document)
}
