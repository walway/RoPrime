const RIPPLE_BUTTON_SELECTOR = '.roprime-settings-menu-btn'

const RIPPLE_ROOT_SELECTOR = '.roprime-mui-ripple-root, .roprime-nav-menu-button-ripple, .MuiTouchRipple-root'

function ensureRippleRoot(button) {
    let root = button.querySelector(RIPPLE_ROOT_SELECTOR)
    if (root instanceof HTMLElement) return root

    root = document.createElement('span')
    root.className = 'roprime-mui-ripple-root'
    const position = getComputedStyle(button).position
    if (position === 'static') button.style.position = 'relative'
    const overflow = getComputedStyle(button).overflow
    if (overflow === 'visible') button.style.overflow = 'hidden'
    button.appendChild(root)
    return root
}

export function attachMuiRipple(button) {
    if (!(button instanceof HTMLElement)) return
    if (button.dataset.roprimeMuiRipple === '1') return
    button.dataset.roprimeMuiRipple = '1'

    button.addEventListener(
        'pointerdown',
        (event) => {
            if (event.button !== 0) return
            if (button.disabled) return

            const container = ensureRippleRoot(button)
            const rect = button.getBoundingClientRect()
            const size = Math.max(rect.width, rect.height) * 2.25
            const x = event.clientX - rect.left
            const y = event.clientY - rect.top

            const wave = document.createElement('span')
            wave.className = 'roprime-mui-ripple-wave'
            wave.style.width = `${size}px`
            wave.style.height = `${size}px`
            wave.style.left = `${x - size / 2}px`
            wave.style.top = `${y - size / 2}px`

            container.appendChild(wave)
            const remove = () => wave.remove()
            wave.addEventListener('animationend', remove, { once: true })
            window.setTimeout(remove, 700)
        },
        { passive: true },
    )
}

export function bindMuiRipplesIn(root = document) {
    root.querySelectorAll(RIPPLE_BUTTON_SELECTOR).forEach((node) => {
        if (node instanceof HTMLElement) attachMuiRipple(node)
    })
}
