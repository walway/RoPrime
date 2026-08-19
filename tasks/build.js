import process from "node:process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import AdmZip from "adm-zip";
import dotenv from "dotenv";
import * as esbuild from "esbuild";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@0.11.1";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = join(root, "deno.json");
dotenv.config({ path: join(root, ".env") });

const distDir = join(root, "dist");
const bundleDir = join(distDir, "_build");
const platforms = ["chrome", "firefox"];

const supabaseUrl = String(process.env.SUPABASE_URL || "").trim();
const supabaseAnonKey = String(
  process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || "",
).trim();

const define = {
  __ROPrime_SUPABASE_URL__: JSON.stringify(supabaseUrl),
  __ROPrime_SUPABASE_ANON_KEY__: JSON.stringify(supabaseAnonKey),
};

function walkFiles(absDir, relPrefix, out) {
  for (const entry of Deno.readDirSync(absDir)) {
    const rel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
    const abs = join(absDir, entry.name);
    if (entry.isDirectory) walkFiles(abs, rel, out);
    else if (entry.isFile) out.push(rel.replace(/\\/g, "/"));
  }
}

function copyPathsToDist(relativePaths, targetBase) {
  for (const file of relativePaths) {
    const src = join(root, file);
    if (!existsSync(src)) continue;
    const dst = join(targetBase, file);
    mkdirSync(dirname(dst), { recursive: true });
    cpSync(src, dst);
  }
}

function getStyleCssOrderFromIndex() {
  const indexPath = join(root, "src/style/index.css");
  const text = readFileSync(indexPath, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const order = [];
  for (const match of text.matchAll(/@import\s+["']\.\/([^"']+)["']/g)) {
    order.push(`src/style/${match[1]}`);
  }
  if (order.length === 0) {
    throw new Error("src/style/index.css has no @import rules");
  }
  for (const rel of order) {
    if (!existsSync(join(root, rel))) {
      throw new Error(`Missing stylesheet: ${rel}`);
    }
  }
  return order;
}

async function copyDracoDecoder() {
  const dst = join(root, "resources/vendor/draco_decoder.js");
  if (existsSync(dst) && readFileSync(dst, "utf8").length > 1000) return;

  const res = await fetch(
    "https://unpkg.com/roavatar-renderer@1.6.0/dist/draco_decoder.js",
  );
  if (!res.ok) {
    throw new Error(`Failed to download draco_decoder.js (${res.status})`);
  }
  mkdirSync(dirname(dst), { recursive: true });
  writeFileSync(dst, await res.text());
}

function getDracoDecoderBanner() {
  const src = join(root, "resources/vendor/draco_decoder.js");
  if (!existsSync(src)) {
    throw new Error("Missing resources/vendor/draco_decoder.js");
  }
  return `${readFileSync(src, "utf8")}\n`;
}

function prepareLottieAssets() {
  const lottieMinDst = join(root, "resources/vendor/lottie.min.js");
  if (!existsSync(lottieMinDst)) {
    throw new Error("Missing resources/vendor/lottie.min.js");
  }

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

async function bundleEntry(entryRelative, outfile, format, esbuildExtra = {}) {
  const entryAbs = join(root, entryRelative);
  await esbuild.build({
    plugins: [...denoPlugins({ configPath })],
    absWorkingDir: root,
    entryPoints: [pathToFileURL(entryAbs).href],
    outfile,
    bundle: true,
    format,
    platform: "browser",
    sourcemap: true,
    define,
    logLevel: "info",
    ...esbuildExtra,
  });
}

function writeDistManifest(platform, platformDistDir) {
  const manifestPath = join(root, "src/manifests", `${platform}.json`);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const styleCssOrder = getStyleCssOrderFromIndex();
  for (const entry of manifest.content_scripts || []) {
    if (Array.isArray(entry.js)) {
      entry.js = entry.js.map((p) =>
        typeof p === "string" ? p.replace(/^\/?dist\//, "") : p,
      );
    }
    entry.css = [...styleCssOrder];
  }
  writeFileSync(
    join(platformDistDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
}

function copyBundleToPlatform(platformDistDir) {
  for (const file of [
    "content.js",
    "content.js.map",
    "avatar-preview.js",
    "avatar-preview.js.map",
  ]) {
    const src = join(bundleDir, file);
    if (!existsSync(src)) continue;
    cpSync(src, join(platformDistDir, file));
  }
  if (!existsSync(join(platformDistDir, "content.js"))) {
    throw new Error("Missing bundled content.js after esbuild.");
  }
  if (!existsSync(join(platformDistDir, "avatar-preview.js"))) {
    throw new Error("Missing bundled avatar-preview.js after esbuild.");
  }
}

function copyBackgroundToPlatform(platformDistDir) {
  cpSync(
    join(root, "src/content/background.js"),
    join(platformDistDir, "background.js"),
  );
}

function copyStyleTreeToDist(targetBase) {
  const styleFiles = [];
  walkFiles(join(root, "src/style"), "src/style", styleFiles);
  copyPathsToDist(styleFiles.filter((f) => f.endsWith(".css")), targetBase);
}

function assemblePlatformDist(platform) {
  const platformDistDir = join(distDir, platform);
  mkdirSync(platformDistDir, { recursive: true });
  copyBundleToPlatform(platformDistDir);
  copyBackgroundToPlatform(platformDistDir);
  copyStyleTreeToDist(platformDistDir);

  const resourceFiles = [];
  walkFiles(join(root, "resources"), "resources", resourceFiles);
  copyPathsToDist(resourceFiles, platformDistDir);

  const stringFiles = [];
  walkFiles(join(root, "src/strings"), "src/strings", stringFiles);
  copyPathsToDist(stringFiles, platformDistDir);

  writeDistManifest(platform, platformDistDir);
}

console.log("Building RoPrime with esbuild...");
if (supabaseUrl) {
  console.log("Supabase profile effects: enabled for this build.");
} else {
  console.warn(
    "No SUPABASE_URL in .env — purchases will not sync to Supabase. See supabase/README.md.",
  );
}

rmSync(distDir, { recursive: true, force: true });
mkdirSync(bundleDir, { recursive: true });

prepareLottieAssets();
await copyDracoDecoder();

await bundleEntry(
  "src/content/content.entry.js",
  join(bundleDir, "content.js"),
  "iife",
);
await bundleEntry(
  "src/content/profile/avatarPreview.js",
  join(bundleDir, "avatar-preview.js"),
  "esm",
  {
    banner: {
      js: getDracoDecoderBanner(),
    },
  },
);

for (const platform of platforms) {
  assemblePlatformDist(platform);
}

rmSync(bundleDir, { recursive: true, force: true });

console.log("Build complete.");
console.log("Successfully generated dist/chrome and dist/firefox builds.");
console.warn(
  "WARNING!!! DON'T FORGET TO UPDATE VERSION IN chrome.json AND firefox.json BEFORE RELEASE.",
);
