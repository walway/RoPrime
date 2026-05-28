<h1 align="center">
  <a href="https://github.com/walway/RoPrime">
    <img src="https://raw.githubusercontent.com/walway/RoPrime/main/resources/logo.svg" width="50%" alt="RoPrime">
  </a>
</h1>

RoPrime is a browser extension that makes the **Roblox website** feel cleaner and modern while upgrading its new design.<br>
It layers onto the official website offering a dedicated settings page with options you can tune to your liking. Here's some features:

- 🎨 Roblox’s UI design language
- 📐 Sidebar sizes — full, compact, or icon-only
- 🧩 Choose what appears in the sidebar
- 👥 Reimagined friend list styling
- ✏️ Rename wording (Groups/Communities, Games/Experiences, Catalog/Marketplace)
- 🖼️ Uniquie profile page & picture effects
- 🎛️ Custom CSS for power users
- 🔄 Sync settings across browsers
- 🌓 Light and dark theme support for Normal, Select and Kids Roblox
- 🌎 Multilanguage
- ⚡️ Fast & 

<br>

## 🚀 Install RoPrime

1. Install the latest version
2. Install [Node.js](https://nodejs.org/) (v26+)
3. Run `npm install`, then `npm run build`
4. Load the extension in your browser (see below)

<div align="center">

<a href="https://github.com/walway/RoPrime/releases"><img src="https://raw.githubusercontent.com/walway/RoPrime/main/resources/link-github-releases.svg" height="53" alt="GitHub releases"></a>
<a href="https://github.com/walway/RoPrime/fork"><img src="https://raw.githubusercontent.com/walway/RoPrime/main/resources/link-contributions.svg" height="53" alt="Contribute to RoPrime"></a>

</div>

<br>

#### Chrome / Edge

- Go to `chrome://extensions` or `edge://extensions`
- Enable **Developer mode**
- Click **Load unpacked** and select the project folder (uses `dist/content.js`) or the `dist` folder (uses `content.js`)

#### Firefox

- Go to `about:debugging#/runtime/this-firefox`
- Click **Load Temporary Add-on…**
- Select `manifest.json` in the project root or in `dist` after building

<br>

## 👋 Help us

Found a bug or have an idea? [Open an issue](https://github.com/walway/RoPrime/issues) or start a [discussion](https://github.com/walway/RoPrime/discussions). Pull requests are welcome — see below.

<br>

## ✍️ Contribute

Here's a list of things you can do to help:

- Give feedback on how you use RoPrime (what works, what doesn’t)
- Suggest features or improvements in an issue first
- [Translate](https://github.com/walway/RoPrime/tree/master/.locales) the extension to a new language
- Fix bugs or polish the UI with a pull request
- Add yourself via [all-contributors](https://allcontributors.org) when your PR is merged

More detail in [CONTRIBUTION.md](CONTRIBUTION.md).

<br>

## 🌟 Spread the word

If RoPrime helps your daily Roblox browsing:

- Star the repository ⭐️
- Leave a review where you installed the extension
- Share what you like about it with friends

<br>

## 🏃‍♂️ Running RoPrime locally

```bash
# In the project root
npm install
npm run build
```

- **Lint / format:** `npx biome check --write .`
- **Reload:** After code changes, run `npm run build` again and click **Reload** on the extension card in your browser.

### Project layout

| Path | Purpose |
| --- | --- |
| `src/content/` | Content scripts (bundled into `dist/content.js` by Vite) |
| `src/content/background.js` | Extension service worker (copied as-is) |
| `src/style/` | Stylesheets injected on roblox.com |
| `resources/` | Icons, images, and static data |
| `.locales/` | Translation keys per language |
| `tasks/build.js` | Build script (Vite + asset copy) |
| `configs/vite.content.config.js` | Vite config for the content bundle |

<br>

## 👨‍💻 On pull requests

RoPrime is open to pull requests. For larger features, [open an issue](https://github.com/walway/RoPrime/issues) first so we can align on approach. Please run `npm run build` before submitting.

<br>

## 🌏 Translators

- **🇧🇩 Bengali** · [meflamey](https://github.com/flameydev) · [GitHub](https://github.com/flameydev)

Want to add a language? See [Localization](#-localization) below.

<br>

## 🔧 Built with

- [Vite](https://vitejs.dev/) for bundling the content script
- Plain JavaScript, CSS, and a small amount of React where needed
- [Biome](https://biomejs.dev/) for linting and formatting
- [Supabase](https://supabase.com/) (optional) for profile-effect purchases

<br>

## 🌍 Localization

1. [Fork](https://github.com/walway/RoPrime/fork) this project
2. Open the `/.locales` folder
3. Create a folder with a [2-letter ISO 639 code](https://wikipedia.org/wiki/List_of_ISO_639_language_codes), or edit an existing one
4. Use `example.md` in `/.locales` as a guide for `translation-keys.json`
5. Add your language to `lang-config.js` (`langList` and `subsets`) if it is new
6. Open a pull request

<br>

## 💖 Sponsors and supporters

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->

<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://flameydev.github.io"><img src="https://avatars.githubusercontent.com/u/213979811?v=4?s=100" width="100px;" alt="meflamey"/><br /><sub><b>meflamey</b></sub></a><br /><a href="#translation-flameydev" title="Translation">🌍</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

Thanks to **meflamey** for the Bengali translation.<br>
Thanks to **Ryan Lua** for helping fund the Chrome Developer account.

<br>

<div align="center">

![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/walway/RoPrime/node.js.yml)
![GitHub Release](https://img.shields.io/github/v/release/walway/RoPrime)
![GitHub Release Date](https://img.shields.io/github/release-date/walway/RoPrime)

</div>

<br>

<p align="center">
  Built with ❤️ for the Roblox community
</p>
