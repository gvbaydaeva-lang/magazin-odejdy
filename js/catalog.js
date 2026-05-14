/**
 * Единый каталог товаров для витрины и админки (без backend).
 * Данные: localStorage[fashionStoreCatalogProducts]
 * Легаси: fashionStoreAdminProducts — один раз переносится при отсутствии нового ключа.
 */

export const CATALOG_STORAGE_KEY = "fashionStoreCatalogProducts";
const LEGACY_ADMIN_PRODUCTS_KEY = "fashionStoreAdminProducts";

function stableId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalizeProduct(raw) {
  if (!raw || typeof raw !== "object") return null;
  const name = String(raw.name || "").trim();
  if (!name) return null;
  const cat = String(raw.cat || "").trim() || "Без категории";
  const price = Number(raw.price);
  const desc = String(raw.desc || "").trim();
  const image = String(raw.image || "").trim();
  const video = raw.video ? String(raw.video).trim() : null;
  let colors = Array.isArray(raw.colors) ? raw.colors.map((c) => String(c).trim()).filter(Boolean) : [];
  if (!colors.length) colors = ["#ccc"];
  const images = Array.isArray(raw.images) && raw.images.length ? raw.images.map(String) : image ? [image] : [];
  const id = raw.id ? String(raw.id) : stableId();
  return { id, name, cat, price: Number.isFinite(price) ? price : 0, desc, image: image || images[0] || "", images, video };
}

export function migrateCatalogStorage() {
  if (localStorage.getItem(CATALOG_STORAGE_KEY) !== null) return;
  const legacy = localStorage.getItem(LEGACY_ADMIN_PRODUCTS_KEY);
  if (legacy === null) return;
  try {
    const parsed = JSON.parse(legacy);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const normalized = parsed.map(normalizeProduct).filter(Boolean);
      localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(normalized));
    }
  } catch {
    // ignore
  }
}

/** Если каталог ещё не создан — записать дефолтный список (первый визит). */
export function ensureCatalogStorageReady(defaultProducts) {
  migrateCatalogStorage();
  if (localStorage.getItem(CATALOG_STORAGE_KEY) === null) {
    localStorage.setItem(
      CATALOG_STORAGE_KEY,
      JSON.stringify(defaultProducts.map((p) => normalizeProduct(p)).filter(Boolean))
    );
  }
}

export function loadCatalogProducts(defaultProducts) {
  migrateCatalogStorage();
  const raw = localStorage.getItem(CATALOG_STORAGE_KEY);
  if (raw === null) {
    return defaultProducts.map((p) => normalizeProduct(p)).filter(Boolean);
  }
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return defaultProducts.map((p) => normalizeProduct(p)).filter(Boolean);
    return arr.map(normalizeProduct).filter(Boolean);
  } catch {
    return defaultProducts.map((p) => normalizeProduct(p)).filter(Boolean);
  }
}

export function saveCatalogProducts(products) {
  const list = products.map(normalizeProduct).filter(Boolean);
  localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(list));
}
