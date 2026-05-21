#!/usr/bin/env node
import { spawn } from "node:child_process";
import {
	cpSync,
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import AdmZip from "adm-zip";
import chalk from "chalk";
import { globSync } from "glob";

const root = dirname(fileURLToPath(import.meta.url));
const distDir = join(root, "dist");
const error = chalk.bold.red;
const warning = chalk.hex("#FFA500");

/** Load order for extension CSS (manifest content_scripts). */
export const STYLE_CSS_ORDER = [
	"src/style/main.css",
	"src/style/account/menu-tab.css",
	"src/style/settings/panel.css",
	"src/style/components/mui-controls.css",
	"src/style/layout/chrome.css",
	"src/style/welcome/welcome.css",
	"src/style/navigation/old-nav.css",
	"src/style/settings/light-overrides.css",
	"src/style/profile/cosmetics-shop.css",
	"src/style/profile/page-effects.css",
	"src/style/profile/carousel-effects.css",
];

function prepareLottieVendorAssets() {
	const lottieMinSrc = join(
		root,
		"node_modules/lottie-web/build/player/lottie.min.js",
	);
	const lottieMinDst = join(root, "resources/vendor/lottie.min.js");
	if (!existsSync(lottieMinSrc)) {
		throw new Error("Missing lottie-web. Run `npm install` first.");
	}
	cpSync(lottieMinSrc, lottieMinDst);

	const clockworkLottie = join(root, "resources/lottie/Clockwork.lottie");
	const clockworkJson = join(root, "resources/lottie/Clockwork.animation.json");
	if (!existsSync(clockworkLottie)) return;

	const zip = new AdmZip(clockworkLottie);
	const manifest = JSON.parse(zip.readAsText("manifest.json"));
	const animationId = manifest?.animations?.[0]?.id;
	if (!animationId) {
		throw new Error("Clockwork.lottie: manifest has no animations");
	}
	const entryPath = `a/${animationId}.json`;
	if (!zip.getEntry(entryPath)) {
		throw new Error(`Clockwork.lottie: missing ${entryPath}`);
	}
	writeFileSync(clockworkJson, zip.readAsText(entryPath));
}

function runNode(scriptPath, args, opts) {
	return new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [scriptPath, ...args], {
			stdio: "inherit",
			cwd: root,
			...opts,
		});
		child.on("error", reject);
		child.on("close", (code) => {
			if (code === 0) resolve();
			else reject(new Error(`process exited with code ${code}`));
		});
	});
}

function copyStyleTreeToDist() {
	for (const rel of STYLE_CSS_ORDER) {
		const src = join(root, rel);
		if (!existsSync(src)) {
			throw new Error(`Missing stylesheet: ${rel}`);
		}
		const dst = join(distDir, rel);
		mkdirSync(dirname(dst), { recursive: true });
		cpSync(src, dst);
	}
}

function writeDistManifest(distPath) {
	const raw = readFileSync(join(root, "manifest.json"), "utf8");
	const manifest = JSON.parse(raw);
	for (const entry of manifest.content_scripts || []) {
		if (Array.isArray(entry.js)) {
			entry.js = entry.js.map((p) =>
				typeof p === "string" ? p.replace(/^\/?dist\//, "") : p,
			);
		}
		entry.css = [...STYLE_CSS_ORDER];
	}
	writeFileSync(distPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

prepareLottieVendorAssets();

const localeFiles = globSync(".locales/**/*", {
	nodir: true,
	ignore: [".locales/example.md"],
});
const dataFiles = globSync("resources/data/**/*", { nodir: true });

console.log("Building RoPrime with Vite...");
rmSync(distDir, { recursive: true, force: true });

const viteCli = join(root, "node_modules", "vite", "bin", "vite.js");
if (!existsSync(viteCli)) {
	console.error("Missing Vite CLI. Run `npm install` first.");
	process.exit(1);
}
await runNode(viteCli, ["build", "--config", "vite.content.config.js"]);

copyStyleTreeToDist();

const copyFiles = [
	"background.js",
	"resources/roprime-icon.png",
	"resources/icons/icon16.png",
	"resources/icons/icon32.png",
	"resources/icons/icon48.png",
	"resources/icons/icon64.png",
	"resources/icons/icon128.png",
	"resources/RblxPlusLogo.webp",
	"resources/plugins/rosealpluginimage.png",
	"resources/plugins/rovalrapluginimage.png",
	...dataFiles,
	...localeFiles,
	".locales/lang-config.js",
];
for (const file of copyFiles) {
	const src = join(root, file);
	if (!existsSync(src)) continue;
	const dst = join(distDir, file);
	mkdirSync(dirname(dst), { recursive: true });
	cpSync(src, dst);
}

writeDistManifest(join(distDir, "manifest.json"));

console.log("Build complete.");
console.log(
	"Load unpacked from project root RoPrime (uses dist/content.js) or from RoPrime/dist (uses content.js).",
);
console.log();
console.log(
	error("WARNING!!! MAKE SURE TO UPDATE THE VERSION IN THE MANIFEST.JSON"),
);
console.log(warning("USE THIS PATTERN MAP TO CREATE VERSION - "));
console.log();
console.log(warning("The version map should be Major.Minor.Patch"));
console.log();
console.log(chalk.bold("fix: fix typo- automatically bumps Patch (1.1.2) !!!"));
console.log(
	chalk.bold("feat: add login - automatically bumps Minor (1.2.0) !!!"),
);
console.log(
	chalk.bold("feat!: breaking change - automatically bumps Major (2.0.0) !!!"),
);
