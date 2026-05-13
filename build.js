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

const root = dirname(fileURLToPath(import.meta.url));
const distDir = join(root, "dist");

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

console.log("Building RoPrime with Vite + React...");
rmSync(distDir, { recursive: true, force: true });

const viteCli = join(root, "node_modules", "vite", "bin", "vite.js");
if (!existsSync(viteCli)) {
	console.error("Missing Vite CLI. Run `npm install` first.");
	process.exit(1);
}
await runNode(viteCli, ["build"]);

function writeDistManifest(distPath) {
	const raw = readFileSync(join(root, "manifest.json"), "utf8");
	const manifest = JSON.parse(raw);
	for (const entry of manifest.content_scripts || []) {
		if (!Array.isArray(entry.js)) continue;
		entry.js = entry.js.map((p) =>
			typeof p === "string" ? p.replace(/^\/?dist\//, "") : p,
		);
	}
	writeFileSync(distPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

const copyFiles = [
	"background.js",
	"style.css",
	"resources/roprime-icon.png",
	"resources/RblxPlusLogo.webp",
	"resources/plugins/rosealpluginimage.png",
	"resources/plugins/rovalrapluginimage.png",
	".locales/en/translation-keys.json",
	".locales/ru/translation-keys.json",
	".locales/bn/translation-keys.json",
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
