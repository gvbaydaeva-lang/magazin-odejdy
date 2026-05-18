/**
 * Единое хранилище MVP (localStorage) для витрины и админки.
 */

export const STORAGE_KEYS = {
  categories: "fashion_categories",
  subcategories: "fashion_subcategories",
  products: "fashion_products",
  stories: "fashion_stories",
  settings: "fashion_settings",
};

const LEGACY = {
  categories: "fashionStoreAdminCategories",
  subcategories: "fashionStoreAdminSubcategories",
  products: ["fashionStoreCatalogProducts", "fashionStoreAdminProducts"],
  stories: "fashionStoreAdminStories",
  settings: "fashionStoreAdminSettings",
};

export const DEFAULT_SETTINGS = {
  storeName: "Fashion Store",
  tagline: "Новая коллекция уже в продаже",
  telegram: "USERNAME",
  max: "",
  phone: "",
  address: "",
};

export const PRODUCT_SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "One size"];

export const PRESET_COLORS = [
  "Черный",
  "Белый",
  "Бежевый",
  "Молочный",
  "Коричневый",
  "Серый",
  "Розовый",
  "Красный",
  "Зеленый",
  "Синий",
  "Голубой",
  "Бордовый",
];

export const COLOR_HEX = {
  Черный: "#1a1a1a",
  Белый: "#ffffff",
  Бежевый: "#d4b896",
  Молочный: "#f5f0e8",
  Коричневый: "#6c4831",
  Серый: "#9e9e9e",
  Розовый: "#e8a4b8",
  Красный: "#c62828",
  Зеленый: "#2e7d32",
  Синий: "#1565c0",
  Голубой: "#4fc3f7",
  Бордовый: "#6d1b30",
};

function parseListField(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export function colorToCss(colorName) {
  const name = String(colorName || "").trim();
  if (!name) return "#ccc";
  if (name.startsWith("#")) return name;
  if (COLOR_HEX[name]) return COLOR_HEX[name];
  if (/^(rgb|hsl)a?\(/i.test(name)) return name;
  return name;
}

export function isStorefrontProduct(product) {
  if (!product || typeof product !== "object") return false;
  const images = Array.isArray(product.images) ? product.images : [];
  return product.published === true && images.length > 0;
}

function stableId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeParse(raw, fallback) {
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function normalizeProduct(raw) {
  if (!raw || typeof raw !== "object") return null;
  const name = String(raw.name || "").trim();
  if (!name) return null;
  const cat = String(raw.cat || "").trim() || "Без категории";
  const subcat = String(raw.subcat || raw.subcategory || "").trim();
  const price = Number(raw.price);
  const desc = String(raw.desc || "").trim();
  const image = String(raw.image || "").trim();
  const video = raw.video ? String(raw.video).trim() : null;
  const colors = parseListField(raw.colors);
  const sizes = parseListField(raw.sizes);
  const images =
    Array.isArray(raw.images) && raw.images.length
      ? raw.images.map((src) => String(src).trim()).filter(Boolean)
      : image
        ? [image]
        : [];
  const published = images.length > 0;
  const id = raw.id ? String(raw.id) : stableId();
  return {
    id,
    name,
    cat,
    subcat,
    price: Number.isFinite(price) ? price : 0,
    desc,
    image: images[0] || "",
    images,
    video,
    colors,
    sizes,
    published,
  };
}

export function migrateStorage() {
  if (safeGet(STORAGE_KEYS.categories) === null) {
    const legacy = safeParse(safeGet(LEGACY.categories), null);
    if (Array.isArray(legacy) && legacy.length) safeSet(STORAGE_KEYS.categories, legacy);
  }
  if (safeGet(STORAGE_KEYS.subcategories) === null) {
    const legacy = safeParse(safeGet(LEGACY.subcategories), null);
    if (legacy && typeof legacy === "object" && !Array.isArray(legacy)) {
      safeSet(STORAGE_KEYS.subcategories, legacy);
    }
  }
  if (safeGet(STORAGE_KEYS.products) === null) {
    for (const key of LEGACY.products) {
      const legacy = safeParse(safeGet(key), null);
      if (Array.isArray(legacy) && legacy.length) {
        safeSet(
          STORAGE_KEYS.products,
          legacy.map(normalizeProduct).filter(Boolean)
        );
        break;
      }
    }
  }
  if (safeGet(STORAGE_KEYS.stories) === null) {
    const legacy = safeParse(safeGet(LEGACY.stories), null);
    if (Array.isArray(legacy)) safeSet(STORAGE_KEYS.stories, legacy);
  }
  if (safeGet(STORAGE_KEYS.settings) === null) {
    const legacy = safeParse(safeGet(LEGACY.settings), null);
    if (legacy && typeof legacy === "object") {
      safeSet(STORAGE_KEYS.settings, { ...DEFAULT_SETTINGS, ...legacy });
    }
  }
}

export function loadCategories(fallback = []) {
  migrateStorage();
  const raw = safeParse(safeGet(STORAGE_KEYS.categories), null);
  return Array.isArray(raw) && raw.length ? raw : fallback;
}

export function saveCategories(list) {
  const arr = Array.isArray(list) ? list : [];
  safeSet(STORAGE_KEYS.categories, arr);
  return arr;
}

export function loadSubcategories(fallback = {}) {
  migrateStorage();
  const raw = safeParse(safeGet(STORAGE_KEYS.subcategories), null);
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw;
  return fallback;
}

export function saveSubcategories(map) {
  const obj = map && typeof map === "object" && !Array.isArray(map) ? map : {};
  safeSet(STORAGE_KEYS.subcategories, obj);
  return obj;
}

export function loadProducts(seed = []) {
  migrateStorage();
  const raw = safeParse(safeGet(STORAGE_KEYS.products), null);
  if (raw === null) return null;
  if (!Array.isArray(raw)) return seed.map(normalizeProduct).filter(Boolean);
  return raw.map(normalizeProduct).filter(Boolean);
}

export function saveProducts(products) {
  const list = (Array.isArray(products) ? products : []).map(normalizeProduct).filter(Boolean);
  safeSet(STORAGE_KEYS.products, list);
  return list;
}

export function ensureProductsSeed(seed) {
  migrateStorage();
  if (safeGet(STORAGE_KEYS.products) === null && Array.isArray(seed) && seed.length) {
    saveProducts(seed.map(normalizeProduct).filter(Boolean));
  }
}

export function loadSettings() {
  migrateStorage();
  const raw = safeParse(safeGet(STORAGE_KEYS.settings), null);
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return { ...DEFAULT_SETTINGS, ...raw };
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings) {
  const merged = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  safeSet(STORAGE_KEYS.settings, merged);
  return merged;
}

export function loadStories(fallback = []) {
  migrateStorage();
  const raw = safeParse(safeGet(STORAGE_KEYS.stories), null);
  return Array.isArray(raw) ? raw : fallback;
}

export function saveStories(list) {
  const arr = Array.isArray(list) ? list : [];
  safeSet(STORAGE_KEYS.stories, arr);
  return arr;
}

/** Товары для витрины: если в storage пусто — демо из seed. */
export function loadProductsForStorefront(seed) {
  ensureProductsSeed(seed);
  const stored = loadProducts(seed);
  const list =
    stored === null
      ? seed.map(normalizeProduct).filter(Boolean)
      : stored.length
        ? stored
        : seed.map(normalizeProduct).filter(Boolean);
  return list.filter(isStorefrontProduct);
}
