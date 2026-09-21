export function debounce(fn, waitMs) {
    let timer = 0
    const debounced = (...args) => {
        if (timer) globalThis.clearTimeout(timer)
        timer = globalThis.setTimeout(() => {
            timer = 0
            fn(...args)
        }, waitMs)
    }
    debounced.cancel = () => {
        if (timer) globalThis.clearTimeout(timer)
        timer = 0
    }
    return debounced
}
