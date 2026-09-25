import { settingsT } from '../core/core.ts'

export function t(key) {
    if (typeof key !== 'string' || !key) return ''
    return settingsT(key)
}
