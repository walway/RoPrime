export const USER_CARD_SELECTORS = [
    '.friends-carousel-tile',
    'li.list-item.avatar-card',
    '.avatar-card-container',
    '.user-item-clickable',
]

const subscriptions = new Set()
let active = false

function handleElement(element) {
    if (element.dataset.roprimeUserCardObserved === '1') return
    element.dataset.roprimeUserCardObserved = '1'

    for (const sub of subscriptions) {
        try {
            if (sub.options?.exclude?.some((selector) => element.matches(selector))) {
                continue
            }
            sub.callback(element)
        } catch (e) {
            console.warn('RoPrime: user card callback error', e)
        }
    }
}

function setupObservers() {
    for (const selector of USER_CARD_SELECTORS) {
        for (const el of document.querySelectorAll(selector)) {
            if (el instanceof HTMLElement) handleElement(el)
        }
    }

    if (!document.body) return
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (!(node instanceof HTMLElement)) continue
                for (const selector of USER_CARD_SELECTORS) {
                    if (node.matches?.(selector)) handleElement(node)
                    for (const el of node.querySelectorAll?.(selector) || []) {
                        if (el instanceof HTMLElement) handleElement(el)
                    }
                }
            }
        }
    })
    observer.observe(document.body, { childList: true, subtree: true })
}

export function observeUserCardElements() {
    if (active) return
    active = true
    if (document.body) setupObservers()
    else {
        document.addEventListener('DOMContentLoaded', setupObservers, {
            once: true,
        })
    }
}

export function onUserCardElement(callback, options = {}) {
    const sub = { callback, options }
    subscriptions.add(sub)

    for (const selector of USER_CARD_SELECTORS) {
        for (const element of document.querySelectorAll(selector)) {
            if (!(element instanceof HTMLElement)) continue
            try {
                if (options.exclude?.some((s) => element.matches(s))) continue
                callback(element)
            } catch (e) {
                console.warn('RoPrime: user card callback error', e)
            }
        }
    }

    return () => {
        subscriptions.delete(sub)
    }
}

export function resetUserCardElements() {
    subscriptions.clear()
    observedElements.clear()
    active = false
}
