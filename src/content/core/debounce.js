export function debounce(fn, waitMs) {
    let timer = 0
    const debounced = (...args) => {
        if (timer) window.clearTimeout(timer)
        timer = window.setTimeout(() => {
            timer = 0
            fn(...args)
        }, waitMs)
    }
    debounced.cancel = () => {
        if (timer) window.clearTimeout(timer)
        timer = 0
    }
    return debounced
}
