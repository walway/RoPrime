# Profile effects registry (Cloudflare Worker + KV)

Stores who bought each profile effect and who has what equipped. The RoPrime extension reads `GET /registry` and writes purchases via `POST /purchase` and `POST /equip`.

## 1. Create a KV namespace

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **KV**.
2. **Create namespace** → name it e.g. `roprime-profile-effects`.
3. Copy the **Namespace ID**.

## 2. Deploy the Worker

```bash
cd workers/profile-effects
cp wrangler.toml.example wrangler.toml
# Edit wrangler.toml: paste your KV namespace id (and preview_id)
npm install -g wrangler
wrangler login
wrangler deploy
```

Note the Worker URL, e.g. `https://roprime-profile-effects.your-name.workers.dev`.

## 3. (Recommended) Protect write endpoints

```bash
wrangler secret put REGISTER_SECRET
# Enter a long random string — keep it only on the server, never in the extension
```

The extension cannot send this secret safely (users can read extension code). For production, either:

- Verify Roblox login on the Worker (OAuth on server), or
- Accept that purchases are “honor system” until you add server-side Roblox auth.

For testing without a secret, leave `REGISTER_SECRET` unset; POST routes stay open.

## 4. Point RoPrime at the Worker

In `src/content/profileEffectsRegistry.js`:

```js
export const PROFILE_EFFECTS_API_BASE =
  "https://roprime-profile-effects.your-name.workers.dev";
```

`PROFILE_EFFECTS_CDN_REGISTRY_URL`, `PROFILE_EFFECTS_REGISTER_API_URL`, and `PROFILE_EFFECTS_EQUIP_API_URL` are filled automatically from `API_BASE`.

## 5. Allow the extension to call your Worker

In `manifest.json`, add (replace with your URL):

```json
"host_permissions": [
  "https://roprime-profile-effects.your-name.workers.dev/*"
]
```

Reload the unpacked extension after editing the manifest.

## API

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `GET` | `/registry` | — | Full JSON registry |
| `POST` | `/purchase` | `{ userId, effectId, purchasedAt? }` | Record a buyer |
| `POST` | `/equip` | `{ userId, effectId \| null }` | Set or clear equipped effect |

Registry shape (same as `resources/data/profile-effects-owners.json`):

```json
{
  "version": 1,
  "equipped": { "2605032407": "yawning512" },
  "effects": {
    "yawning512": {
      "owners": {
        "2605032407": { "purchasedAt": 1710000000000 }
      }
    }
  }
}
```

## Seed KV (optional)

```bash
wrangler kv key put --binding=PROFILE_EFFECTS_KV registry --path=../../resources/data/profile-effects-owners.json
```
