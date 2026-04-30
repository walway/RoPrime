#!/usr/bin/env bun
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";

const root = import.meta.dir;
const distDir = join(root, "dist");

console.log("Building RoPrime with Vite + React + Tailwind...");
rmSync(distDir, { recursive: true, force: true });
const viteProc = Bun.spawn({
    cmd: ["bunx", "vite", "build"],
    cwd: root,
    stdout: "inherit",
    stderr: "inherit",
});
const viteCode = await viteProc.exited;
if (viteCode !== 0) {
    process.exit(1);
}

const copyFiles = [
    "manifest.json",
    "style.css",
    "resources/roprime-icon.png",
    "resources/RblxPlusLogo.webp",
    "language-keys.json",
    ".locales/en/translation-keys.json",
    ".locales/ru/translation-keys.json",
    ".locales/lang-config.js",
];
for (const file of copyFiles) {
    const src = join(root, file);
    if (!existsSync(src)) continue;
    const dst = join(distDir, file);
    mkdirSync(dirname(dst), { recursive: true });
    cpSync(src, dst);
}

console.log("Build complete.");

