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

export function normalizeSizeEntry(raw) {
  if (!raw || typeof raw !== "object") return null;
  const size = String(raw.size || raw.label || "").trim();
  if (!size) return null;
  const qty = Number(raw.stock ?? raw.qty ?? 0);
  const stock = Number.isFinite(qty) && qty >= 0 ? Math.floor(qty) : 0;
  return { size, stock };
}

/** Преобразует объект { S: 10 } в массив [{ size, stock }]. */
export function sizesObjectToArray(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  return Object.entries(raw)
    .map(([size, stock]) => normalizeSizeEntry({ size, stock }))
    .filter(Boolean);
}

export function normalizeVariantSizesList(raw) {
  if (Array.isArray(raw)) {
    const list = [];
    const seen = new Set();
    raw.forEach((item) => {
      const entry = normalizeSizeEntry(item);
      if (!entry || seen.has(entry.size)) return;
      seen.add(entry.size);
      list.push(entry);
    });
    return list;
  }
  return sizesObjectToArray(raw);
}

export function normalizeVariant(raw) {
  if (!raw || typeof raw !== "object") return null;
  const color = String(raw.color || "").trim();
  if (!color) return null;
  return { color, sizes: normalizeVariantSizesList(raw.sizes) };
}

export function migrateLegacyToVariants(colors, sizes, stock) {
  const colorList = Array.isArray(colors) ? colors.filter(Boolean) : [];
  const sizeList = Array.isArray(sizes) ? sizes.filter(Boolean) : [];
  const stockMap = sizesObjectToArray(stock).reduce((acc, e) => {
    acc[e.size] = e.stock;
    return acc;
  }, {});
  if (!colorList.length && !sizeList.length && !Object.keys(stockMap).length) {
    return [];
  }
  const toRows = (keys) =>
    keys
      .map((size) => normalizeSizeEntry({ size, stock: stockMap[size] ?? 0 }))
      .filter(Boolean);
  if (!colorList.length) {
    const keys = sizeList.length ? sizeList : Object.keys(stockMap);
    return [{ color: "Без цвета", sizes: toRows(keys) }];
  }
  return colorList.map((color) => {
    const keys = sizeList.length ? sizeList : Object.keys(stockMap);
    return { color, sizes: toRows(keys) };
  });
}

export function normalizeVariants(raw, colors = [], sizes = [], stock = {}) {
  if (Array.isArray(raw) && raw.length) {
    return raw.map(normalizeVariant).filter(Boolean);
  }
  return migrateLegacyToVariants(colors, sizes, stock);
}

export function deriveColorsFromVariants(variants) {
  return (variants || []).map((v) => v.color).filter(Boolean);
}

export function deriveSizesFromVariants(variants) {
  const set = new Set();
  (variants || []).forEach((v) => {
    (v.sizes || []).forEach((e) => {
      if (e && e.size) set.add(e.size);
    });
  });
  return Array.from(set);
}

export function getVariantByColor(product, colorName) {
  const name = String(colorName || "").trim();
  if (!product || !Array.isArray(product.variants)) return null;
  return product.variants.find((v) => v.color === name) || null;
}

/** Все размеры варианта, в т.ч. с нулевым остатком. */
export function getVariantSizeLabels(product, colorName) {
  const variant = getVariantByColor(product, colorName);
  if (!variant) return [];
  return (variant.sizes || []).map((e) => e.size).filter(Boolean);
}

/** Размеры с остатком > 0 для выбранного цвета. */
export function getAvailableSizesForColor(product, colorName) {
  const variant = getVariantByColor(product, colorName);
  if (!variant) return [];
  const entries = variant.sizes || [];
  if (!entries.length) return Array.isArray(product.sizes) ? product.sizes : [];
  return entries.filter((e) => e.stock > 0).map((e) => e.size);
}

export function getProductTotalStock(product) {
  let total = 0;
  (product?.variants || []).forEach((v) => {
    (v.sizes || []).forEach((e) => {
      if (Number.isFinite(e.stock) && e.stock > 0) total += e.stock;
    });
  });
  return total;
}

export function getProductSizeSummary(product) {
  const labels = new Set();
  (product?.variants || []).forEach((v) => {
    (v.sizes || []).forEach((e) => {
      if (e?.size) labels.add(e.size);
    });
  });
  const list = Array.from(labels);
  if (!list.length) {
    const legacy = Array.isArray(product?.sizes) ? product.sizes : [];
    if (!legacy.length) return { text: "—", count: 0 };
    return { text: legacy.length + " размеров", count: legacy.length };
  }
  const numeric = list
    .filter((s) => /^\d+$/.test(String(s)))
    .map(Number)
    .sort((a, b) => a - b);
  if (numeric.length >= 2 && numeric.length === list.length) {
    return { text: numeric[0] + "–" + numeric[numeric.length - 1], count: list.length };
  }
  return { text: list.length + " размеров", count: list.length };
}

export function hasAvailableStockForColor(product, colorName) {
  return getAvailableSizesForColor(product, colorName).length > 0;
}

/** @deprecated используйте getAvailableSizesForColor */
export function getSelectableSizes(product) {
  const colors = deriveColorsFromVariants(product?.variants);
  if (colors.length) return getAvailableSizesForColor(product, colors[0]);
  return Array.isArray(product?.sizes) ? product.sizes : [];
}

export function normalizeCategory(raw) {
  if (typeof raw === "string") {
    const name = raw.trim();
    if (!name) return null;
    return { name, visible: true };
  }
  if (raw && typeof raw === "object") {
    const name = String(raw.name || raw.title || "").trim();
    if (!name) return null;
    const visible = raw.visible !== false && raw.visible !== "false" && raw.visible !== 0;
    return { name, visible };
  }
  return null;
}

export function normalizeCategoriesList(list, fallback = []) {
  const source = Array.isArray(list) && list.length ? list : fallback;
  if (!Array.isArray(source)) return [];
  return source.map(normalizeCategory).filter(Boolean);
}

export function getCategoryName(item) {
  if (typeof item === "string") return item.trim();
  if (item && typeof item === "object") return String(item.name || "").trim();
  return "";
}

export function getVisibleCategories(list) {
  return normalizeCategoriesList(list).filter((item) => item.visible === true);
}

export function getVisibleCategoryNames(list) {
  return getVisibleCategories(list).map((item) => item.name);
}

function migrateCategoriesIfNeeded() {
  const raw = safeParse(safeGet(STORAGE_KEYS.categories), null);
  if (!Array.isArray(raw) || !raw.length) return;
  const needsMigration = raw.some((item) => typeof item === "string");
  if (!needsMigration) return;
  saveCategories(normalizeCategoriesList(raw));
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
  const variants = normalizeVariants(raw.variants, colors, sizes, raw.stock);
  const derivedColors = deriveColorsFromVariants(variants);
  const derivedSizes = deriveSizesFromVariants(variants);
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
    colors: derivedColors.length ? derivedColors : colors,
    sizes: derivedSizes.length ? derivedSizes : sizes,
    variants,
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
  migrateCategoriesIfNeeded();
}

export function loadCategories(fallback = []) {
  migrateStorage();
  const raw = safeParse(safeGet(STORAGE_KEYS.categories), null);
  const normalized = normalizeCategoriesList(raw, fallback);
  return normalized.length ? normalized : normalizeCategoriesList(fallback);
}

export function saveCategories(list) {
  const arr = normalizeCategoriesList(list);
  safeSet(STORAGE_KEYS.categories, arr);
  return arr;
}

/** Имена категорий для фильтров на витрине (только visible: true). */
export function loadCategoriesForStorefront(fallback = []) {
  return getVisibleCategoryNames(loadCategories(fallback));
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
