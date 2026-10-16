import { headersToObject, installFetchPatch, isFirefox, rpFetch } from './fetch.js'
import { send } from './msg.js'

installFetchPatch()

export const api = {
    fetch: rpFetch,
    send,
    isFirefox,
    headers: headersToObject,

    async text(url, init = {}) {
        const response = await rpFetch(url, init)
        if (!response.ok) {
            throw new Error(`fetch_http_${response.status}`)
        }
        return response.text()
    },

    async json(url, init = {}) {
        const response = await rpFetch(url, init)
        if (!response.ok) {
            throw new Error(`fetch_http_${response.status}`)
        }
        return response.json()
    },
}

export { headersToObject, installFetchPatch, isFirefox, rpFetch, send }
export default api
