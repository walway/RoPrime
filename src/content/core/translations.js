const CLIENT_LOCALES_BASE =
  "https://raw.githubusercontent.com/walway/Roblox-Datamine/main/Client/Locales/Common";
const UNIVERSAL_LOCALES_BASE =
  "https://raw.githubusercontent.com/walway/Roblox-Datamine/main/UniversalApp/Locales/Common";

/* Only use en-us format like lang-lang because Roblox uses this format for locale files */
  const KNOWN_LOCALE_FILES = new Set([
  "ar-001",
  "de-de",
  "en-us",
  "es-es",
  "fr-fr",
  "hi-in",
  "id-id",
  "it-it",
  "ja-jp",
  "ko-kr",
  "pl-pl",
  "pt-br",
  "ru-ru",
  "th-th",
  "tr-tr",
  "vi-vn",
  "zh-cjv",
  "zh-cn",
  "zh-tw",
]);

const LANG_TO_FILE = {
  en: "en-us",
  de: "de-de",
  es: "es-es",
  fr: "fr-fr",
  hi: "hi-in",
  id: "id-id",
  it: "it-it",
  ja: "ja-jp",
  ko: "ko-kr",
  pl: "pl-pl",
  pt: "pt-br",
  ru: "ru-ru",
  th: "th-th",
  tr: "tr-tr",
  vi: "vi-vn",
  zh: "zh-cn",
  ar: "ar-001",
};

const FALLBACKS = {
  "Feature.Build.Label.OffSale": "Off sale",
  "Feature.Build.Label.Free": "Free",
  "Feature.Avatar.Label.By": "By",
  "Feature.Accessibility.Heading.DeviceAppTheme": "App theme",
  "Feature.Accessibility.Label.AppThemeBadgeNew": "New",
  "Feature.Accessibility.AppTheme.CategoryCalm": "Calm",
  "Feature.Accessibility.AppTheme.CategoryDynamic": "Dynamic",
  "Feature.Accessibility.AppTheme.CategorySpecial": "Special",
  "Feature.Accessibility.AppTheme.Default": "Default",
  "Feature.Accessibility.AppTheme.Classic": "Classic",
  "Feature.Accessibility.AppTheme.ElectricLime": "Electric Lime",
  "Feature.Accessibility.AppTheme.HyperPlum": "Hyper Plum",
  "Feature.Accessibility.AppTheme.InfernoBlast": "Inferno Blast",
  "Feature.Accessibility.AppTheme.KineticEnergy": "Kinetic Energy",
  "Feature.Accessibility.AppTheme.LavaGlow": "Lava Glow",
  "Feature.Accessibility.AppTheme.NebulaDrift": "Nebula Drift",
  "Feature.Accessibility.AppTheme.NitroFrost": "Nitro Frost",
  "Feature.Accessibility.AppTheme.PixelPop": "Pixel Pop",
  "Feature.Accessibility.AppTheme.PolarFreeze": "Polar Freeze",
  "Feature.Accessibility.AppTheme.QuantumPulse": "Quantum Pulse",
  "Feature.Accessibility.AppTheme.StarBurst": "Star Burst",
  "Feature.Accessibility.AppTheme.CosmicDust": "Cosmic Dust",
  "Feature.Accessibility.AppTheme.SuperCharge": "Super Charge",
  "Feature.Accessibility.AppTheme.CircuitRush": "Circuit Rush",
};

/** @type {Map<string, string>} */
const translations = new Map();
let loadPromise = null;
let loadedLocale = "";

export function getDocumentLang() {
  const lang =
    document.documentElement?.getAttribute("lang") ||
    document.documentElement?.lang ||
    "en";
  return String(lang || "en").trim() || "en";
}

export function resolveLocaleFileName(lang = getDocumentLang()) {
  const raw = String(lang || "en")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
  if (!raw) return "en-us";

  // Prefer 'es-es' instead of 'es', never 'es.csv' like I described in the comment above.
  if (LANG_TO_FILE[raw]) return LANG_TO_FILE[raw];

  if (KNOWN_LOCALE_FILES.has(raw)) return raw;

  const base = raw.split("-")[0];
  if (LANG_TO_FILE[base]) return LANG_TO_FILE[base];

  for (const file of KNOWN_LOCALE_FILES) {
    if (file.startsWith(`${base}-`)) return file;
  }
  return "en-us";
}

function unquoteCsvField(value) {
  const text = String(value ?? "").trim();
  if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
    return text.slice(1, -1).replace(/""/g, '"');
  }
  return text;
}

function parseCsvLine(line) {
  const text = String(line ?? "").replace(/\r$/, "");
  if (!text || text.startsWith("Key,")) return null;

  let key = "";
  let value = "";
  let inQuotes = false;
  let field = "";
  let fieldIndex = 0;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      if (fieldIndex === 0) key = field;
      else if (fieldIndex === 1) value = field;
      field = "";
      fieldIndex += 1;
      continue;
    }
    field += ch;
  }

  if (fieldIndex === 0) {
    key = field;
  } else if (fieldIndex === 1) {
    value = field;
  } else {
    value = value ? `${value},${field}` : field;
  }

  key = unquoteCsvField(key);
  value = unquoteCsvField(value);
  if (!key) return null;
  return { key, value };
}

function parseCsvIntoMap(csvText, target) {
  const lines = String(csvText || "").split("\n");
  for (const line of lines) {
    const parsed = parseCsvLine(line);
    if (!parsed) continue;
    if (parsed.value !== "") target.set(parsed.key, parsed.value);
  }
}

async function fetchLocaleCsv(baseUrl, localeFile) {
  const url = `${baseUrl}/${localeFile}.csv`;
  const response = await fetch(url, { credentials: "omit" });
  if (!response.ok) throw new Error(`locale ${localeFile}: ${response.status}`);
  return response.text();
}

async function loadLocaleMaps(localeFile) {
  const map = new Map();
  const results = await Promise.allSettled([
    fetchLocaleCsv(CLIENT_LOCALES_BASE, localeFile),
    fetchLocaleCsv(UNIVERSAL_LOCALES_BASE, localeFile),
  ]);

  for (const result of results) {
    if (result.status === "fulfilled") {
      parseCsvIntoMap(result.value, map);
    }
  }

  if (localeFile !== "en-us" && map.size === 0) {
    const fallbacks = await Promise.allSettled([
      fetchLocaleCsv(CLIENT_LOCALES_BASE, "en-us"),
      fetchLocaleCsv(UNIVERSAL_LOCALES_BASE, "en-us"),
    ]);
    for (const result of fallbacks) {
      if (result.status === "fulfilled") {
        parseCsvIntoMap(result.value, map);
      }
    }
  }

  return map;
}

export async function ensureRobloxTranslations(force = false) {
  const localeFile = resolveLocaleFileName();
  if (!force && loadPromise && loadedLocale === localeFile) {
    return loadPromise;
  }

  loadedLocale = localeFile;
  loadPromise = (async () => {
    try {
      const map = await loadLocaleMaps(localeFile);
      translations.clear();
      for (const [key, value] of map) {
        translations.set(key, value);
      }
    } catch (error) {
      console.warn("RoPrime Roblox translations failed", error);
    }
    return translations;
  })();

  return loadPromise;
}

export function robloxT(key, fallback) {
  const fromCsv = translations.get(key);
  if (typeof fromCsv === "string" && fromCsv.trim()) return fromCsv;
  if (typeof fallback === "string") return fallback;
  if (Object.prototype.hasOwnProperty.call(FALLBACKS, key)) return FALLBACKS[key];
  return key;
}

export function getRobloxTranslation(key, fallback) {
  return robloxT(key, fallback);
}
