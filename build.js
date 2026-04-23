#!/usr/bin/env bun
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const root = import.meta.dir;
const srcEntry = join(root, "src", "content", "index.js");
const outputFile = join(root, "content.js");
const distDir = join(root, "dist");

console.log("Building RoPrime with Bun...");

const result = await Bun.build({
    entrypoints: [srcEntry],
    outfile: outputFile,
    bundle: true,
    target: "browser",
    format: "iife",
    minify: false,
    sourcemap: "external",
});

if (!result.success) {
    for (const log of result.logs) console.error(log);
    process.exit(1);
}

const jsOutput = result.outputs.find((item) => item.path.endsWith(".js"));
if (!jsOutput) {
    console.error("Build succeeded but no JS output was produced.");
    process.exit(1);
}
writeFileSync(outputFile, Buffer.from(await jsOutput.arrayBuffer()));

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
];
mkdirSync(distDir, { recursive: true });
for (const file of copyFiles) {
    const src = join(root, file);
    if (!existsSync(src)) continue;
    const dst = join(distDir, file);
    mkdirSync(dirname(dst), { recursive: true });
    cpSync(src, dst);
}

console.log("Build complete.");