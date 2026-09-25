import { settingsState } from '../core/core.ts'

export const RP_HIDE_AGE_BADGE_STYLE_ID = 'roprime-hide-age-badge-style'

export function syncHideAgeBadge() {
    document.getElementById(RP_HIDE_AGE_BADGE_STYLE_ID)?.remove()
    if (settingsState.hideAgeBadgeEnabled) {
        document.documentElement.classList.remove('show-age-badge')
    } else {
        document.documentElement.classList.add('show-age-badge')
    }
}
