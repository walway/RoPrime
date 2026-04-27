<p align="center">
  <img src="./resources/logo.svg" alt="RoPrime Logo" width="120" />
</p>

<h1 align="center">RoPrime</h1>
<p align="center"><strong>Making Roblox feel better.</strong></p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#development">Development</a> •
  <a href="#project-structure">Project Structure</a>
</p>

<hr />

<h2 id="features">Features</h2>

<ul>
  <li>Custom <strong>RoPrime Settings</strong> panel inside Roblox Account page.</li>
  <li>UI customization toggles (sidebar modes, friend styling, navigation tweaks).</li>
  <li>Text rename options (Communities/Groups, Experiences/Games, Marketplace/Avatar Shop).</li>
  <li>Dropdown + account tab shortcuts for quick access to settings.</li>
  <li>Localization-ready structure with locale files.</li>
</ul>

<h2 id="installation">Installation</h2>

<ol>
  <li>Clone or download this repository.</li>
  <li>Build the extension:
    <pre><code>bun run build</code></pre>
  </li>
  <li>Open <code>chrome://extensions</code> in Chrome.</li>
  <li>Enable <strong>Developer mode</strong>.</li>
  <li>Click <strong>Load unpacked</strong> and select this project folder (or <code>dist</code>).</li>
</ol>

<h2 id="development">Development</h2>

<ul>
  <li>Source code is written in <strong>TypeScript</strong>.</li>
  <li>Main content entry: <code>content.ts</code> -> bundled into <code>content.js</code>.</li>
  <li>Build script: <code>build.js</code> (delegates to <code>build.ts</code>).</li>
</ul>

<h2 id="project-structure">Project Structure</h2>

<pre><code>src/content/         # Content script modules
resources/           # Icons and assets
.locales/            # Localization files
content.ts           # TS wrapper entry for content bundle
content.js           # Generated bundle loaded by manifest
build.js / build.ts  # Build pipeline
</code></pre>

<hr />

<p align="center">
  Built with care for the Roblox community.
</p>
