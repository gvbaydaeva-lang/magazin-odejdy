/**
 * Единое хранилище для админки (без ES-модулей). Ключи совпадают с js/store.js.
 */
(function (global) {
  var KEYS = {
    categories: "fashion_categories",
    subcategories: "fashion_subcategories",
    products: "fashion_products",
    stories: "fashion_stories",
    settings: "fashion_settings",
  };

  var LEGACY = {
    categories: "fashionStoreAdminCategories",
    subcategories: "fashionStoreAdminSubcategories",
    products: ["fashionStoreCatalogProducts", "fashionStoreAdminProducts"],
    stories: "fashionStoreAdminStories",
    settings: "fashionStoreAdminSettings",
  };

  var DEFAULT_SETTINGS = {
    storeName: "Fashion Store",
    tagline: "Новая коллекция уже в продаже",
    telegram: "USERNAME",
    max: "",
    phone: "",
    address: "",
  };

  var PRODUCT_SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "One size"];

  var PRESET_COLORS = [
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

  var COLOR_HEX = {
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
      return value
        .map(function (item) {
          return String(item).trim();
        })
        .filter(Boolean);
    }
    if (typeof value === "string" && value.trim()) {
      return value
        .split(",")
        .map(function (item) {
          return item.trim();
        })
        .filter(Boolean);
    }
    return [];
  }

  function colorToCss(colorName) {
    var name = String(colorName || "").trim();
    if (!name) return "#ccc";
    if (name.charAt(0) === "#") return name;
    if (COLOR_HEX[name]) return COLOR_HEX[name];
    if (/^(rgb|hsl)a?\(/i.test(name)) return name;
    return name;
  }

  function isStorefrontProduct(product) {
    if (!product || typeof product !== "object") return false;
    var images = Array.isArray(product.images) ? product.images : [];
    return product.published === true && images.length > 0;
  }

  function normalizeCategory(raw) {
    if (typeof raw === "string") {
      var nameStr = raw.trim();
      if (!nameStr) return null;
      return { name: nameStr, visible: true };
    }
    if (raw && typeof raw === "object") {
      var name = String(raw.name || raw.title || "").trim();
      if (!name) return null;
      var visible = raw.visible !== false && raw.visible !== "false" && raw.visible !== 0;
      return { name: name, visible: visible };
    }
    return null;
  }

  function normalizeCategoriesList(list, fallback) {
    var source = Array.isArray(list) && list.length ? list : fallback;
    if (!Array.isArray(source)) return [];
    return source
      .map(normalizeCategory)
      .filter(function (item) {
        return Boolean(item);
      });
  }

  function getCategoryName(item) {
    if (typeof item === "string") return item.trim();
    if (item && typeof item === "object") return String(item.name || "").trim();
    return "";
  }

  function getVisibleCategoryNames(list) {
    return normalizeCategoriesList(list)
      .filter(function (item) {
        return item.visible;
      })
      .map(function (item) {
        return item.name;
      });
  }

  function migrateCategoriesIfNeeded() {
    var raw = safeParse(safeGet(KEYS.categories), null);
    if (!Array.isArray(raw) || !raw.length) return;
    var needsMigration = raw.some(function (item) {
      return typeof item === "string";
    });
    if (!needsMigration) return;
    saveCategories(normalizeCategoriesList(raw));
  }

  function loadCategoriesForStorefront(fallback) {
    return getVisibleCategoryNames(loadCategories(fallback));
  }

  function loadCategories(fallback) {
    migrateStorage();
    var raw = safeParse(safeGet(KEYS.categories), null);
    var normalized = normalizeCategoriesList(raw, fallback);
    return normalized.length ? normalized : normalizeCategoriesList(fallback);
  }

  function saveCategories(list) {
    var arr = normalizeCategoriesList(list);
    safeSet(KEYS.categories, arr);
    return arr;
  }

  var DEFAULT_SEED = [
    {
      id: "seed-dress-1",
      name: "Платье",
      cat: "Платья",
      subcat: "",
      price: 4900,
      desc: "Премиальное платье в пудрово-розовом оттенке",
      colors: ["pink", "beige", "brown", "black"],
      sizes: ["S", "M", "L"],
      image: "111cd184dc07be3d13154e209eb09c00.jpg",
      images: ["111cd184dc07be3d13154e209eb09c00.jpg"],
      video: "bc71b0b3c6396541a06aa01851812689.mp4",
    },
    {
      id: "seed-suit-1",
      name: "Костюм спортивный",
      cat: "Костюмы спортивные",
      subcat: "",
      price: 6500,
      desc: "Комфортный костюм",
      colors: ["black", "gray"],
      sizes: ["S", "M", "L"],
      image: "assets/images/suit1.jpg",
      video: null,
    },
    {
      id: "seed-jeans-1",
      name: "Джинсы",
      cat: "Джинсы",
      subcat: "",
      price: 3500,
      desc: "Классические джинсы",
      colors: ["blue", "black"],
      sizes: ["S", "M", "L"],
      image: "assets/images/jeans.jpg",
      video: null,
    },
  ];

  function stableId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function safeParse(raw, fallback) {
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function safeGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function normalizeProduct(raw) {
    if (!raw || typeof raw !== "object") return null;
    var name = String(raw.name || "").trim();
    if (!name) return null;
    var cat = String(raw.cat || "").trim() || "Без категории";
    var subcat = String(raw.subcat || raw.subcategory || "").trim();
    var price = Number(raw.price);
    var desc = String(raw.desc || "").trim();
    var image = String(raw.image || "").trim();
    var video = raw.video ? String(raw.video).trim() : null;
    var colors = parseListField(raw.colors);
    var sizes = parseListField(raw.sizes);
    var images =
      Array.isArray(raw.images) && raw.images.length
        ? raw.images
            .map(function (src) {
              return String(src).trim();
            })
            .filter(Boolean)
        : image
          ? [image]
          : [];
    var published = images.length > 0;
    var id = raw.id ? String(raw.id) : stableId();
    return {
      id: id,
      name: name,
      cat: cat,
      subcat: subcat,
      price: Number.isFinite(price) ? price : 0,
      desc: desc,
      image: images[0] || "",
      images: images,
      video: video,
      colors: colors,
      sizes: sizes,
      published: published,
    };
  }

  function migrateStorage() {
    if (safeGet(KEYS.categories) === null) {
      var lc = safeParse(safeGet(LEGACY.categories), null);
      if (Array.isArray(lc) && lc.length) safeSet(KEYS.categories, lc);
    }
    if (safeGet(KEYS.subcategories) === null) {
      var ls = safeParse(safeGet(LEGACY.subcategories), null);
      if (ls && typeof ls === "object" && !Array.isArray(ls)) safeSet(KEYS.subcategories, ls);
    }
    if (safeGet(KEYS.products) === null) {
      for (var i = 0; i < LEGACY.products.length; i++) {
        var lp = safeParse(safeGet(LEGACY.products[i]), null);
        if (Array.isArray(lp) && lp.length) {
          safeSet(
            KEYS.products,
            lp.map(normalizeProduct).filter(Boolean)
          );
          break;
        }
      }
    }
    if (safeGet(KEYS.stories) === null) {
      var lst = safeParse(safeGet(LEGACY.stories), null);
      if (Array.isArray(lst)) safeSet(KEYS.stories, lst);
    }
    if (safeGet(KEYS.settings) === null) {
      var lset = safeParse(safeGet(LEGACY.settings), null);
      if (lset && typeof lset === "object") {
        var merged = {};
        for (var k in DEFAULT_SETTINGS) merged[k] = DEFAULT_SETTINGS[k];
        for (var k2 in lset) merged[k2] = lset[k2];
        safeSet(KEYS.settings, merged);
      }
    }
    migrateCategoriesIfNeeded();
  }

  function ensureProductsSeed(seed) {
    migrateStorage();
    var s = Array.isArray(seed) ? seed : DEFAULT_SEED;
    if (safeGet(KEYS.products) === null) {
      safeSet(
        KEYS.products,
        s.map(normalizeProduct).filter(Boolean)
      );
    }
  }

  function loadProducts(seed) {
    migrateStorage();
    var s = Array.isArray(seed) ? seed : DEFAULT_SEED;
    var raw = safeParse(safeGet(KEYS.products), null);
    if (raw === null) return null;
    if (!Array.isArray(raw)) return s.map(normalizeProduct).filter(Boolean);
    return raw.map(normalizeProduct).filter(Boolean);
  }

  function loadProductsForStorefront(seed) {
    ensureProductsSeed(seed);
    var s = Array.isArray(seed) ? seed : DEFAULT_SEED;
    var stored = loadProducts(seed);
    var list =
      stored === null
        ? s.map(normalizeProduct).filter(Boolean)
        : stored.length
          ? stored
          : s.map(normalizeProduct).filter(Boolean);
    return list.filter(isStorefrontProduct);
  }

  function saveProducts(products) {
    var list = (Array.isArray(products) ? products : []).map(normalizeProduct).filter(Boolean);
    safeSet(KEYS.products, list);
    return list;
  }

  var api = {
    KEYS: KEYS,
    CATALOG_STORAGE_KEY: KEYS.products,
    DEFAULT_SEED: DEFAULT_SEED,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    normalizeProduct: normalizeProduct,
    PRODUCT_SIZE_OPTIONS: PRODUCT_SIZE_OPTIONS,
    PRESET_COLORS: PRESET_COLORS,
    COLOR_HEX: COLOR_HEX,
    colorToCss: colorToCss,
    isStorefrontProduct: isStorefrontProduct,
    normalizeCategory: normalizeCategory,
    normalizeCategoriesList: normalizeCategoriesList,
    getCategoryName: getCategoryName,
    getVisibleCategoryNames: getVisibleCategoryNames,
    loadCategoriesForStorefront: loadCategoriesForStorefront,
    migrateStorage: migrateStorage,
    ensureProductsSeed: ensureProductsSeed,
    ensureCatalogStorageReady: ensureProductsSeed,
    loadProducts: loadProducts,
    loadCatalogProducts: loadProductsForStorefront,
    saveProducts: saveProducts,
    saveCatalogProducts: saveProducts,
    loadCategories: loadCategories,
    saveCategories: saveCategories,
    loadSubcategories: function (fallback) {
      migrateStorage();
      var raw = safeParse(safeGet(KEYS.subcategories), null);
      if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw;
      return fallback || {};
    },
    saveSubcategories: function (map) {
      var obj = map && typeof map === "object" && !Array.isArray(map) ? map : {};
      safeSet(KEYS.subcategories, obj);
      return obj;
    },
    loadSettings: function () {
      migrateStorage();
      var raw = safeParse(safeGet(KEYS.settings), null);
      var merged = {};
      for (var k in DEFAULT_SETTINGS) merged[k] = DEFAULT_SETTINGS[k];
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        for (var k2 in raw) merged[k2] = raw[k2];
      }
      return merged;
    },
    saveSettings: function (settings) {
      var merged = {};
      for (var k in DEFAULT_SETTINGS) merged[k] = DEFAULT_SETTINGS[k];
      if (settings && typeof settings === "object") {
        for (var k2 in settings) merged[k2] = settings[k2];
      }
      safeSet(KEYS.settings, merged);
      return merged;
    },
    loadStories: function (fallback) {
      migrateStorage();
      var raw = safeParse(safeGet(KEYS.stories), null);
      return Array.isArray(raw) ? raw : fallback || [];
    },
    saveStories: function (list) {
      var arr = Array.isArray(list) ? list : [];
      safeSet(KEYS.stories, arr);
      return arr;
    },
  };

  global.FashionStore = api;
  global.FashionStoreCatalog = api;
})(window);
