import { RP_CUSTOM_CSS_STYLE_ID, settingsState, shouldRunRoPrimeOnCurrentPage } from '../core/core.js'

export function syncCustomCss() {
    if (!shouldRunRoPrimeOnCurrentPage()) return

    const css = String(settingsState.customCss || '').trim()
    const existing = document.getElementById(RP_CUSTOM_CSS_STYLE_ID)

    if (!css) {
        existing?.remove()
        return
    }

    let style = existing
    if (!(style instanceof HTMLStyleElement)) {
        style = document.createElement('style')
        style.id = RP_CUSTOM_CSS_STYLE_ID
        ;(document.head || document.documentElement).appendChild(style)
    }
    style.textContent = css
}
