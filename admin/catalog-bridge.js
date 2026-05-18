/**
 * Каталог для админки (обычный script, без ES-модулей).
 * Витрина использует тот же ключ: fashionStoreCatalogProducts (js/catalog.js).
 */
(function (global) {
  const CATALOG_STORAGE_KEY = "fashionStoreCatalogProducts";
  const LEGACY_ADMIN_PRODUCTS_KEY = "fashionStoreAdminProducts";

  const DEFAULT_SEED = [
    {
      id: "seed-dress-1",
      name: "Платье",
      cat: "Платья",
      price: 4900,
      desc: "Премиальное платье в пудрово-розовом оттенке",
      colors: ["pink", "beige", "brown", "black"],
      image: "111cd184dc07be3d13154e209eb09c00.jpg",
      images: ["111cd184dc07be3d13154e209eb09c00.jpg"],
      video: "bc71b0b3c6396541a06aa01851812689.mp4",
    },
    {
      id: "seed-suit-1",
      name: "Костюм спортивный",
      cat: "Костюмы спортивные",
      price: 6500,
      desc: "Комфортный костюм",
      colors: ["black", "gray"],
      image: "assets/images/suit1.jpg",
      video: null,
    },
    {
      id: "seed-jeans-1",
      name: "Джинсы",
      cat: "Джинсы",
      price: 3500,
      desc: "Классические джинсы",
      colors: ["blue", "black"],
      image: "assets/images/jeans.jpg",
      video: null,
    },
  ];

  function stableId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function normalizeProduct(raw) {
    if (!raw || typeof raw !== "object") return null;
    var name = String(raw.name || "").trim();
    if (!name) return null;
    var cat = String(raw.cat || "").trim() || "Без категории";
    var price = Number(raw.price);
    var desc = String(raw.desc || "").trim();
    var image = String(raw.image || "").trim();
    var video = raw.video ? String(raw.video).trim() : null;
    var colors = Array.isArray(raw.colors)
      ? raw.colors.map(function (c) {
          return String(c).trim();
        }).filter(Boolean)
      : [];
    if (!colors.length) colors = ["#ccc"];
    var images =
      Array.isArray(raw.images) && raw.images.length
        ? raw.images.map(String)
        : image
          ? [image]
          : [];
    var id = raw.id ? String(raw.id) : stableId();
    return {
      id: id,
      name: name,
      cat: cat,
      price: Number.isFinite(price) ? price : 0,
      desc: desc,
      image: image || images[0] || "",
      images: images,
      video: video,
    };
  }

  function migrateCatalogStorage() {
    try {
      if (localStorage.getItem(CATALOG_STORAGE_KEY) !== null) return;
      var legacy = localStorage.getItem(LEGACY_ADMIN_PRODUCTS_KEY);
      if (legacy === null) return;
      var parsed = JSON.parse(legacy);
      if (Array.isArray(parsed) && parsed.length > 0) {
        var normalized = parsed.map(normalizeProduct).filter(Boolean);
        localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(normalized));
      }
    } catch (e) {
      try {
        localStorage.removeItem(LEGACY_ADMIN_PRODUCTS_KEY);
      } catch (err) {
        /* ignore */
      }
    }
  }

  function ensureCatalogStorageReady(defaultProducts) {
    var seed = Array.isArray(defaultProducts) ? defaultProducts : DEFAULT_SEED;
    migrateCatalogStorage();
    try {
      if (localStorage.getItem(CATALOG_STORAGE_KEY) === null) {
        localStorage.setItem(
          CATALOG_STORAGE_KEY,
          JSON.stringify(
            seed
              .map(normalizeProduct)
              .filter(Boolean)
          )
        );
      }
    } catch (e) {
      /* quota / private mode */
    }
  }

  function loadCatalogProducts(defaultProducts) {
    var seed = Array.isArray(defaultProducts) ? defaultProducts : DEFAULT_SEED;
    migrateCatalogStorage();
    try {
      var raw = localStorage.getItem(CATALOG_STORAGE_KEY);
      if (raw === null) {
        return seed.map(normalizeProduct).filter(Boolean);
      }
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) {
        localStorage.removeItem(CATALOG_STORAGE_KEY);
        return seed.map(normalizeProduct).filter(Boolean);
      }
      return arr.map(normalizeProduct).filter(Boolean);
    } catch (e) {
      try {
        localStorage.removeItem(CATALOG_STORAGE_KEY);
      } catch (err) {
        /* ignore */
      }
      return seed.map(normalizeProduct).filter(Boolean);
    }
  }

  function saveCatalogProducts(products) {
    var list = (Array.isArray(products) ? products : [])
      .map(normalizeProduct)
      .filter(Boolean);
    try {
      localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      /* ignore */
    }
    return list;
  }

  global.FashionStoreCatalog = {
    CATALOG_STORAGE_KEY: CATALOG_STORAGE_KEY,
    DEFAULT_SEED: DEFAULT_SEED,
    normalizeProduct: normalizeProduct,
    ensureCatalogStorageReady: ensureCatalogStorageReady,
    loadCatalogProducts: loadCatalogProducts,
    saveCatalogProducts: saveCatalogProducts,
  };
})(window);
