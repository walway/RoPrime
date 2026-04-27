#!/usr/bin/env bun
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const root = import.meta.dir;
const contentEntry = join(root, "content.ts");
const popupEntry = join(root, "popup.ts");
const contentOut = join(root, "content.js");
const popupOut = join(root, "popup.js");
const distDir = join(root, "dist");

console.log("Building RoPrime with Bun...");

const contentResult = await Bun.build({
    entrypoints: [contentEntry],
    outfile: contentOut,
    bundle: true,
    target: "browser",
    format: "iife",
    minify: false,
    sourcemap: "external",
});

if (!contentResult.success) {
    for (const log of contentResult.logs) console.error(log);
    process.exit(1);
}

const contentJs = contentResult.outputs.find((item) => item.path.endsWith(".js"));
if (!contentJs) {
    console.error("Build succeeded but no content.js output was produced.");
    process.exit(1);
}
writeFileSync(contentOut, Buffer.from(await contentJs.arrayBuffer()));

const popupResult = await Bun.build({
    entrypoints: [popupEntry],
    outfile: popupOut,
    bundle: true,
    target: "browser",
    format: "iife",
    minify: false,
});

if (!popupResult.success) {
    for (const log of popupResult.logs) console.error(log);
    process.exit(1);
}

const copyFiles = [
    "manifest.json",
    "popup.html",
    "popup.css",
    "popup.js",
    "style.css",
    "content.js",
    "content.js.map",
    "resources/roprime-icon.png",
    "resources/RblxPlusLogo.webp",
    "language-keys.json",
    ".locales/en/translation-keys.json",
    ".locales/ru/translation-keys.json",
    ".locales/lang-config.ts",
];
mkdirSync(distDir, { recursive: true });
for (const file of copyFiles) {
    const src = join(root, file);
    if (!existsSync(src)) continue;
    const dst = join(distDir, file);
    mkdirSync(dirname(dst), { recursive: true });
    cpSync(src, dst);
}
cpSync(join(root, "src"), join(distDir, "src"), { recursive: true });

console.log("Build complete.");