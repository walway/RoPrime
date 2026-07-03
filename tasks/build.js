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
import dotenv from "dotenv";
import { globSync } from "glob";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env") });
const distDir = join(root, "dist");
const bundleDir = join(distDir, "_build");
const platforms = ["chrome", "firefox"];
const error = chalk.bold.red;
const warning = chalk.hex("#FFA500");

function copyPathsToDist(relativePaths, targetBase) {
  for (const file of relativePaths) {
    const src = join(root, file);
    if (!existsSync(src)) continue;
    const dst = join(targetBase, file);
    mkdirSync(dirname(dst), { recursive: true });
    cpSync(src, dst);
  }
}

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

function copyStyleTreeToDist(targetBase) {
  const styleFiles = globSync("src/style/**/*.css", { nodir: true });
  if (styleFiles.length === 0) {
    throw new Error("No stylesheets under src/style/");
  }
  copyPathsToDist(styleFiles, targetBase);
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

function writeDistManifest(platform, platformDistDir) {
  const manifestPath = join(root, "src/manifests", `${platform}.json`);
  if (!existsSync(manifestPath)) {
    throw new Error(
      `Missing platform manifest: src/manifests/${platform}.json`,
    );
  }
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
  for (const file of ["content.js", "content.js.map"]) {
    const src = join(bundleDir, file);
    if (!existsSync(src)) continue;
    cpSync(src, join(platformDistDir, file));
  }
  if (!existsSync(join(platformDistDir, "content.js"))) {
    throw new Error("Missing bundled content.js after Vite build.");
  }
}

function copyBackgroundToPlatform(platformDistDir) {
  const src = join(root, "src/content/background.js");
  if (!existsSync(src)) {
    throw new Error("Missing src/content/background.js.");
  }
  cpSync(src, join(platformDistDir, "background.js"));
}

function assemblePlatformDist(platform) {
  const platformDistDir = join(distDir, platform);
  mkdirSync(platformDistDir, { recursive: true });
  copyBundleToPlatform(platformDistDir);
  copyBackgroundToPlatform(platformDistDir);
  copyStyleTreeToDist(platformDistDir);
  copyPathsToDist(
    [
      ...globSync("resources/**/*", { nodir: true }),
      ...globSync("src/strings/**/*", { nodir: true }),
      ...globSync(".locales/lang-config.js", { nodir: true }),
    ],
    platformDistDir,
  );
  writeDistManifest(platform, platformDistDir);
}

prepareLottieVendorAssets();

console.log("Building RoPrime with Vite...");
if (process.env.SUPABASE_URL?.trim()) {
  console.log("Supabase profile effects: enabled for this build.");
} else {
  console.log(
    warning(
      "No SUPABASE_URL in .env — purchases will not sync to Supabase. See supabase/README.md.",
    ),
  );
}
rmSync(distDir, { recursive: true, force: true });

const viteCli = join(root, "node_modules", "vite", "bin", "vite.js");
if (!existsSync(viteCli)) {
  console.error("Missing Vite CLI. Run `npm install` first.");
  process.exit(1);
}
await runNode(viteCli, ["build", "--config", "configs/vite.content.config.js"]);

for (const platform of platforms) {
  assemblePlatformDist(platform);
}

rmSync(bundleDir, { recursive: true, force: true });

console.log("Build complete.");
console.log(
  "Successfully generated dist/chrome (Chromium) and dist/firefox (Gecko) builds.",
);
console.log();
console.log(
  error(
    "WARNING!!! MAKE SURE TO UPDATE THE VERSION IN src/manifests/chrome.json AND src/manifests/firefox.json",
  ),
);
console.log(
  warning("USE THIS PATTERN MAP TO DONT FORGET MAKE NEW VERSION NUMBER - "),
);
console.log();
console.log(warning("The version map should be Major.Minor.Patch"));
console.log();
console.log(chalk.bold("Fix something - bump version as Patch (1.1.2) !!!"));
console.log(chalk.bold("New feature - bump version as Minor (1.2.0) !!!"));
console.log(
  chalk.bold(
    "Massive changes and a lot of features - bump version as Major (2.0.0) !!!",
  ),
);
