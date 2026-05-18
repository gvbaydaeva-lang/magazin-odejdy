/** Совместимость: витрина использует js/store.js */
import { STORAGE_KEYS } from "./store.js";

export {
  STORAGE_KEYS,
  normalizeProduct,
  normalizeCategory,
  normalizeCategoriesList,
  getCategoryName,
  loadCategories,
  loadCategoriesForStorefront,
  migrateStorage as migrateCatalogStorage,
  ensureProductsSeed as ensureCatalogStorageReady,
  loadProductsForStorefront as loadCatalogProducts,
  saveProducts as saveCatalogProducts,
} from "./store.js";

export const CATALOG_STORAGE_KEY = STORAGE_KEYS.products;
