// Этап админки без backend: localStorage + общий каталог (catalog-bridge.js, ключ fashionStoreCatalogProducts)
(function () {
  "use strict";

  var app = document.getElementById("app");
  var Store = window.FashionStore || window.FashionStoreCatalog;

  if (!app) {
    return;
  }

  if (!Store) {
    app.innerHTML =
      '<div class="page-wrap"><section class="auth-card"><h1>Ошибка загрузки</h1><p class="stub-text">Не найден catalog-bridge.js. Проверьте, что в папке admin есть файлы catalog-bridge.js и admin.js.</p></section></div>';
    return;
  }

  var normalizeProduct = Store.normalizeProduct;
  var defaultProductSeed = Store.DEFAULT_SEED;
  var PRESET_COLORS = Store.PRESET_COLORS;
  var colorToCss = Store.colorToCss;
  var getProductTotalStock = Store.getProductTotalStock;
  var getProductSizeSummary = Store.getProductSizeSummary;
  var getCategoryName = Store.getCategoryName;
  var normalizeCategoriesList = Store.normalizeCategoriesList;
  var MAX_IMAGE_BYTES = 3 * 1024 * 1024;
  var MAX_VIDEO_BYTES = 12 * 1024 * 1024;
  var STORAGE_KEYS = {
    auth: "adminAuth",
    owner: "adminOwner",
    categories: Store.KEYS.categories,
    subcategories: Store.KEYS.subcategories,
    products: Store.KEYS.products,
    stories: Store.KEYS.stories,
    settings: Store.KEYS.settings,
    selectedCategory: "fashionStoreAdminSelectedCategory",
    currentSection: "fashionStoreAdminCurrentSection",
    users: "fashionStoreAdminUsers",
  };

  const DEFAULT_CATEGORY_NAMES = [
    "Платья",
    "Юбки",
    "Джинсы",
    "Брюки",
    "Костюмы",
    "Спортивные костюмы",
    "Футболки",
    "Топы",
    "Рубашки",
    "Блузки",
    "Пиджаки",
    "Жакеты",
    "Шорты",
    "Верхняя одежда",
    "Кардиганы",
    "Свитеры",
    "Худи",
    "Толстовки",
    "Аксессуары",
    "Обувь",
  ];
  const DEFAULT_CATEGORIES = DEFAULT_CATEGORY_NAMES.map(function (name) {
    return { name: name, visible: true };
  });

  const sections = [
    { id: "dashboard", title: "Панель" },
    { id: "products", title: "Товары" },
    { id: "categories", title: "Категории" },
    { id: "subcategories", title: "Подкатегории" },
    { id: "orders", title: "Заказы" },
    { id: "stories", title: "Stories" },
    { id: "users", title: "Пользователи" },
    { id: "settings", title: "Настройки" },
  ];

  const state = {
    isAuth: false,
    authMode: "login",
    currentSection: "dashboard",
    owner: { name: "Владелец", email: "owner@example.com", phone: "+7" },
    categories: [],
    subcategories: {},
    selectedCategory: "",
    settings: {},
    users: [],
    products: [],
    stories: [],
    message: null,
    editingSubcategory: null,
    editingProductId: null,
    categoriesSearchQuery: "",
    productFormOpen: false,
    productDraftMedia: { image: null, video: null, imageName: "", videoName: "" },
    productFormCustomColors: [],
    productFormDraftVariants: {},
    lastEditingProductId: undefined,
  };

  bootstrap();

  function bootstrap() {
    try {
      initStorageDefaults();
      hydrateStateFromStorage();
      normalizeState();
      render();
    } catch (err) {
      console.error("Admin bootstrap:", err);
      safeResetAndRestart(err);
    }
  }

  function safeResetAndRestart(err) {
    try {
      localStorage.removeItem(STORAGE_KEYS.categories);
      localStorage.removeItem(STORAGE_KEYS.subcategories);
      localStorage.removeItem(STORAGE_KEYS.selectedCategory);
      localStorage.removeItem(STORAGE_KEYS.currentSection);
      localStorage.removeItem(STORAGE_KEYS.settings);
      localStorage.removeItem(STORAGE_KEYS.users);
      localStorage.removeItem(STORAGE_KEYS.stories);
      localStorage.removeItem(STORAGE_KEYS.products);
    } catch (e) {
      /* ignore */
    }
    try {
      initStorageDefaults();
      hydrateStateFromStorage();
      normalizeState();
      state.message = {
        type: "msg-info",
        text: "Данные были повреждены и восстановлены до безопасных значений.",
      };
      render();
    } catch (e2) {
      showFatalError(err || e2);
    }
  }

  function normalizeState() {
    state.categories = normalizeCategoriesList(state.categories, DEFAULT_CATEGORIES);
    if (!state.subcategories || typeof state.subcategories !== "object" || Array.isArray(state.subcategories)) {
      state.subcategories = {};
    }
    if (typeof state.selectedCategory !== "string") state.selectedCategory = "";
    if (!Array.isArray(state.products)) state.products = [];
    if (!Array.isArray(state.users)) state.users = [];
    if (!Array.isArray(state.stories)) state.stories = [];
    if (!state.owner || typeof state.owner !== "object") {
      state.owner = { name: "Владелец", email: "owner@example.com", phone: "+7" };
    }
    if (typeof state.currentSection !== "string" || !sections.some((item) => item.id === state.currentSection)) {
      state.currentSection = "dashboard";
    }
  }

  function showFatalError(err) {
    var msg = err && err.message ? err.message : "Неизвестная ошибка";
    app.innerHTML =
      '<div class="page-wrap"><section class="auth-card"><h1>Не удалось открыть админ-панель</h1><p class="stub-text">' +
      escapeHtml(msg) +
      '</p><p class="stub-text">Попробуйте обновить страницу. Если не поможет — откройте консоль браузера (F12).</p><button type="button" class="btn btn-primary" id="fatalRetry">Попробовать снова</button></section></div>';
    var retry = document.getElementById("fatalRetry");
    if (retry) {
      retry.addEventListener("click", function () {
        bootstrap();
      });
    }
  }

  function render() {
    try {
      if (!state.isAuth) {
        renderAuth();
        return;
      }
      renderAdmin();
    } catch (err) {
      console.error("Admin render:", err);
      safeResetAndRestart(err);
    }
  }

  function renderAuth() {
    const isLogin = state.authMode === "login";
    const msg = state.message;
    state.message = null;

    app.innerHTML = `
      <div class="page-wrap">
        <section class="auth-card">
          <header class="auth-head">
            <h1>${isLogin ? "Вход в админ-панель" : "Регистрация владельца"}</h1>
            <p>${
              isLogin
                ? "В будущем вход будет подтверждаться через электронную почту."
                : "Создайте аккаунт владельца для управления магазином."
            }</p>
          </header>
          ${isLogin ? loginFormTemplate() : registerFormTemplate()}
          ${msg ? `<div class="msg ${msg.type}">${escapeHtml(msg.text)}</div>` : ""}
        </section>
      </div>
    `;

    if (isLogin) bindLoginEvents();
    else bindRegisterEvents();
  }

  function loginFormTemplate() {
    return `
      <form id="loginForm" class="form-grid" novalidate>
        <div class="field">
          <label class="label" for="loginEmail">Email</label>
          <input class="input" id="loginEmail" type="email" required placeholder="owner@fashion.ru" />
        </div>
        <div class="field">
          <label class="label" for="loginPassword">Пароль</label>
          <input class="input" id="loginPassword" type="password" required placeholder="Введите пароль" />
        </div>
        <div class="btn-row">
          <button type="submit" class="btn btn-primary">Войти</button>
          <button type="button" id="goRegister" class="btn btn-ghost">Зарегистрироваться</button>
        </div>
      </form>
    `;
  }

  function registerFormTemplate() {
    return `
      <form id="registerForm" class="form-grid" novalidate>
        <div class="field">
          <label class="label" for="regName">Имя</label>
          <input class="input" id="regName" type="text" required placeholder="Анна" />
        </div>
        <div class="field">
          <label class="label" for="regEmail">Email</label>
          <input class="input" id="regEmail" type="email" required placeholder="owner@fashion.ru" />
        </div>
        <div class="field">
          <label class="label" for="regPhone">Телефон</label>
          <input class="input" id="regPhone" type="tel" required placeholder="+7 (___) ___-__-__" />
        </div>
        <div class="field">
          <label class="label" for="regPassword">Пароль</label>
          <input class="input" id="regPassword" type="password" required placeholder="Не менее 6 символов" />
        </div>
        <div class="field">
          <label class="label" for="regPasswordRepeat">Повторить пароль</label>
          <input class="input" id="regPasswordRepeat" type="password" required placeholder="Повторите пароль" />
        </div>
        <label class="checkbox-row">
          <input id="agreePolicy" type="checkbox" />
          <span>Я согласен(на) на обработку персональных данных и политику конфиденциальности</span>
        </label>
        <div class="btn-row">
          <button type="submit" class="btn btn-primary">Зарегистрироваться</button>
          <button type="button" id="goLogin" class="btn btn-ghost">Назад ко входу</button>
        </div>
      </form>
    `;
  }

  function bindLoginEvents() {
    const loginForm = document.getElementById("loginForm");
    const goRegisterBtn = document.getElementById("goRegister");

    loginForm.addEventListener("submit", function (event) {
      event.preventDefault();
      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value.trim();
      if (!email || !password) {
        setMessage("msg-error", "Заполните email и пароль.");
        renderAuth();
        return;
      }

      state.isAuth = true;
      state.owner.email = email;
      state.currentSection = readFromStorage(STORAGE_KEYS.currentSection, "dashboard");
      persistAuth();
      persistOwner();
      persistCurrentSection();
      render();
    });

    goRegisterBtn.addEventListener("click", function () {
      state.authMode = "register";
      renderAuth();
    });
  }

  function bindRegisterEvents() {
    const registerForm = document.getElementById("registerForm");
    const goLoginBtn = document.getElementById("goLogin");

    registerForm.addEventListener("submit", function (event) {
      event.preventDefault();
      const name = document.getElementById("regName").value.trim();
      const email = document.getElementById("regEmail").value.trim();
      const phone = document.getElementById("regPhone").value.trim();
      const password = document.getElementById("regPassword").value;
      const passwordRepeat = document.getElementById("regPasswordRepeat").value;
      const agreePolicy = document.getElementById("agreePolicy").checked;

      if (!name || !email || !phone || !password || !passwordRepeat) {
        setMessage("msg-error", "Заполните все поля регистрации.");
        renderAuth();
        return;
      }
      if (password.length < 6) {
        setMessage("msg-error", "Пароль должен содержать минимум 6 символов.");
        renderAuth();
        return;
      }
      if (password !== passwordRepeat) {
        setMessage("msg-error", "Пароли не совпадают.");
        renderAuth();
        return;
      }
      if (!agreePolicy) {
        setMessage("msg-error", "Для регистрации нужно согласиться на обработку персональных данных.");
        renderAuth();
        return;
      }

      state.owner = { name, email, phone };
      state.isAuth = true;
      state.currentSection = "dashboard";
      persistOwner();
      persistAuth();
      persistCurrentSection();
      render();
      setPageNotice(
        "На вашу почту отправлено письмо для подтверждения. В MVP-версии вход выполнен автоматически.",
        "msg-success"
      );
    });

    goLoginBtn.addEventListener("click", function () {
      state.authMode = "login";
      renderAuth();
    });
  }

  function renderAdmin() {
    app.innerHTML = `
      <div class="admin-shell">
        <aside class="sidebar">
          <div class="brand">Fashion Store Admin</div>
          <nav class="nav" id="adminNav">
            ${sections
              .map(
                (section) => `
              <button type="button" class="nav-btn ${
                state.currentSection === section.id ? "active" : ""
              }" data-section="${section.id}">
                ${section.title}
              </button>`
              )
              .join("")}
          </nav>
        </aside>
        <main class="main">
          <header class="topbar">
            <div>
              <h2>${getSectionTitle(state.currentSection)}</h2>
              <p>Владелец: ${escapeHtml(state.owner.name)} (${escapeHtml(state.owner.email)})</p>
            </div>
            <button type="button" id="logoutBtn" class="btn btn-ghost">Выйти</button>
          </header>
          <section id="sectionContent">${renderSectionContent(state.currentSection)}</section>
        </main>
      </div>
    `;
    bindAdminEvents();
    bindSectionEvents();
  }

  function renderSectionContent(sectionId) {
    if (sectionId === "dashboard") {
      return `
        <div class="panel-grid">
          <article class="stat-card"><div class="stat-title">Товаров</div><div class="stat-value">${state.products.length}</div></article>
          <article class="stat-card"><div class="stat-title">Заказов сегодня</div><div class="stat-value">0</div></article>
          <article class="stat-card"><div class="stat-title">Активных stories</div><div class="stat-value">${state.stories.length}</div></article>
          <article class="stat-card"><div class="stat-title">Пользователей</div><div class="stat-value">${Math.max(state.users.length, 1)}</div></article>
        </div>
      `;
    }
    if (sectionId === "categories") return renderCategoriesSection();
    if (sectionId === "subcategories") return renderSubcategoriesSection();
    if (sectionId === "products") return renderProductsSection();
    if (sectionId === "settings") return renderSettingsSection();

    const sectionMap = {
      orders: "Раздел заказов будет добавлен на следующем этапе",
      stories: "Раздел stories будет добавлен на следующем этапе",
      users: "Раздел пользователей будет добавлен на следующем этапе",
    };
    return `<article class="stub-card"><h3 class="stub-title">${getSectionTitle(
      sectionId
    )}</h3><p class="stub-text">${sectionMap[sectionId] || "Раздел будет добавлен на следующем этапе"}</p></article>`;
  }

  function filterCategoriesBySearch(list) {
    var query = (state.categoriesSearchQuery || "").trim().toLowerCase();
    if (!query) return list;
    return list.filter(function (item) {
      return getCategoryName(item).toLowerCase().indexOf(query) !== -1;
    });
  }

  function setCategoryVisibleByName(categoryName, visible) {
    state.categories = normalizeCategoriesList(state.categories).map(function (item) {
      if (getCategoryName(item) === categoryName) {
        return { name: item.name, visible: visible };
      }
      return item;
    });
    persistCategories();
  }

  function renderStorefrontCategoryCard(item) {
    var name = getCategoryName(item);
    return (
      '<li class="category-card category-card--storefront">' +
      '<span class="category-card__name">' +
      escapeHtml(name) +
      "</span>" +
      '<label class="category-visibility">' +
      '<input type="checkbox" class="category-visible-toggle" data-category="' +
      escapeHtml(name) +
      '" checked />' +
      "<span>Показывать на сайте</span>" +
      "</label>" +
      '<button type="button" class="btn btn-ghost btn-sm category-remove-storefront" data-remove-from-storefront="' +
      escapeHtml(name) +
      '">Удалить с витрины</button>' +
      "</li>"
    );
  }

  function renderAvailableCategoryCard(item) {
    var name = getCategoryName(item);
    return (
      '<li class="category-card category-card--available">' +
      '<span class="category-card__name">' +
      escapeHtml(name) +
      "</span>" +
      '<button type="button" class="btn btn-primary btn-sm category-add-storefront" data-add-to-storefront="' +
      escapeHtml(name) +
      '">Добавить</button>' +
      "</li>"
    );
  }

  function renderCategoriesSection() {
    const all = normalizeCategoriesList(state.categories);
    const filtered = filterCategoriesBySearch(all);
    const onStorefront = filtered.filter(function (item) {
      return item.visible === true;
    });
    const availableOnly = filtered.filter(function (item) {
      return item.visible !== true;
    });
    const storefrontList =
      onStorefront.map(renderStorefrontCategoryCard).join("") ||
      '<li class="category-list-empty">На витрине пока нет категорий. Добавьте из списка ниже.</li>';
    const availableList =
      availableOnly.map(renderAvailableCategoryCard).join("") ||
      '<li class="category-list-empty">Нет доступных категорий. Создайте новую выше.</li>';

    return (
      '<article class="stub-card categories-page">' +
      '<h3 class="stub-title">Категории</h3>' +
      '<p class="stub-text">Категории на витрине видны покупателям. Остальные хранятся в системе и доступны для добавления.</p>' +
      '<div class="inline-form categories-add-form">' +
      '<input id="newCategoryInput" class="input" type="text" placeholder="Новая категория" />' +
      '<button type="button" id="addCategoryBtn" class="btn btn-primary">Создать категорию</button>' +
      "</div>" +
      '<div class="field category-search-field">' +
      '<label class="label" for="categorySearchInput">Найти категорию</label>' +
      '<input id="categorySearchInput" class="input" type="search" placeholder="Введите название..." value="' +
      escapeHtml(state.categoriesSearchQuery || "") +
      '" />' +
      "</div>" +
      '<div id="categoriesMessage"></div>' +
      '<div class="categories-panels">' +
      '<section class="category-section category-section--storefront">' +
      '<h4 class="category-section-title">Категории на витрине <span class="category-section-count">' +
      onStorefront.length +
      "</span></h4>" +
      '<p class="category-section-hint">Покупатели видят эти категории в фильтрах на сайте.</p>' +
      '<ul class="category-list">' +
      storefrontList +
      "</ul>" +
      "</section>" +
      '<section class="category-section category-section--available">' +
      '<h4 class="category-section-title">Все доступные категории <span class="category-section-count">' +
      availableOnly.length +
      "</span></h4>" +
      '<p class="category-section-hint">Категории системы. Нажмите «Добавить», чтобы показать на витрине.</p>' +
      '<ul class="category-list">' +
      availableList +
      "</ul>" +
      "</section>" +
      "</div>" +
      "</article>"
    );
  }

  function productsUsingSubcategory(category, subcat) {
    return state.products.filter(function (p) {
      return p.cat === category && p.subcat === subcat;
    });
  }

  function syncProductsSubcategoryRename(oldCat, oldSub, newCat, newSub) {
    state.products = state.products.map(function (p) {
      if (p.cat === oldCat && p.subcat === oldSub) {
        return normalizeProduct(Object.assign({}, p, { cat: newCat, subcat: newSub }));
      }
      return p;
    });
  }

  function clearProductsSubcategory(category, subcat) {
    state.products = state.products.map(function (p) {
      if (p.cat === category && p.subcat === subcat) {
        return normalizeProduct(Object.assign({}, p, { subcat: "" }));
      }
      return p;
    });
  }

  function buildSubcategoryOptionsHtml(cat, selected) {
    if (!cat) {
      return '<option value="">Сначала выберите категорию</option>';
    }
    var subs = state.subcategories[cat] || [];
    if (!subs.length) {
      return '<option value="">—</option>';
    }
    var html = '<option value="">Не выбрана</option>';
    subs.forEach(function (sub) {
      var sel = selected === sub ? " selected" : "";
      html += '<option value="' + escapeHtml(sub) + '"' + sel + ">" + escapeHtml(sub) + "</option>";
    });
    return html;
  }

  function renderSubcategoriesSection() {
    var edit = state.editingSubcategory;
    var formCategory = state.selectedCategory;
    var editName = "";
    if (edit) {
      var bucketEdit = state.subcategories[edit.category] || [];
      editName = bucketEdit[edit.index] || "";
    }
    var options = state.categories
      .map(function (cat) {
        var catName = getCategoryName(cat);
        return (
          '<option value="' +
          escapeHtml(catName) +
          '"' +
          (formCategory === catName ? " selected" : "") +
          ">" +
          escapeHtml(catName) +
          "</option>"
        );
      })
      .join("");
    var selected = state.selectedCategory;
    var list = selected ? state.subcategories[selected] || [] : [];
    var listHtml = "";
    if (selected && list.length) {
      listHtml =
        '<ul class="subcategory-list">' +
        list
          .map(function (sub, idx) {
            return (
              '<li class="subcategory-item"><span>' +
              escapeHtml(sub) +
              '</span><div class="subcategory-actions">' +
              '<button type="button" class="btn btn-ghost btn-sm" data-edit-subcategory-index="' +
              idx +
              '">Редактировать</button>' +
              '<button type="button" class="btn btn-ghost btn-sm" data-delete-subcategory-index="' +
              idx +
              '">Удалить</button></div></li>'
            );
          })
          .join("") +
        "</ul>";
    } else if (selected) {
      listHtml = '<p class="stub-text">У этой категории пока нет подкатегорий.</p>';
    } else {
      listHtml = '<p class="stub-text">Выберите категорию.</p>';
    }

    return (
      '<article class="stub-card">' +
      '<h3 class="stub-title">Подкатегории</h3>' +
      '<div class="field"><label class="label" for="subcategoryCategorySelect">Категория</label>' +
      '<select id="subcategoryCategorySelect" class="input"><option value="">Выберите категорию</option>' +
      options +
      "</select></div>" +
      '<div class="inline-form"><input id="newSubcategoryInput" class="input" type="text" placeholder="Название подкатегории" value="' +
      escapeHtml(editName) +
      '" />' +
      '<button type="button" id="addSubcategoryBtn" class="btn btn-primary">' +
      (edit ? "Сохранить изменения" : "Добавить подкатегорию") +
      "</button>" +
      (edit ? '<button type="button" id="cancelSubcategoryEdit" class="btn btn-ghost">Отмена</button>' : "") +
      "</div>" +
      '<div id="subcategoriesMessage"></div>' +
      listHtml +
      "</article>"
    );
  }

  function syncProductFormSession() {
    var key = state.editingProductId || "__new__";
    if (state.lastEditingProductId === key) return;
    state.lastEditingProductId = key;
    state.productDraftMedia = { image: null, video: null, imageName: "", videoName: "" };
    state.productFormCustomColors = [];
    state.productFormDraftVariants = {};
    if (!state.editingProductId) return;
    var editing = state.products.find(function (p) {
      return p.id === state.editingProductId;
    });
    if (!editing) return;
    state.productFormDraftVariants = variantsToDraftMap(editing.variants || []);
    var presetLower = {};
    PRESET_COLORS.forEach(function (c) {
      presetLower[c.toLowerCase()] = true;
    });
    (editing.colors || []).forEach(function (c) {
      if (!presetLower[String(c).toLowerCase()]) state.productFormCustomColors.push(c);
    });
  }

  function getEditingProduct() {
    if (!state.editingProductId) return null;
    return (
      state.products.find(function (p) {
        return p.id === state.editingProductId;
      }) || null
    );
  }

  function getPreviewImageSrc(editing) {
    var m = state.productDraftMedia;
    if (m.image !== null) return m.image || "";
    if (editing && editing.images && editing.images[0]) return editing.images[0];
    return "";
  }

  function getPreviewVideoSrc(editing) {
    var m = state.productDraftMedia;
    if (m.video !== null) return m.video || "";
    if (editing && editing.video) return editing.video;
    return "";
  }

  function resolveProductImages(editing) {
    var m = state.productDraftMedia;
    if (m.image !== null) {
      if (!m.image) return [];
      return [m.image];
    }
    if (editing && Array.isArray(editing.images) && editing.images.length) {
      return editing.images.slice();
    }
    return [];
  }

  function resolveProductVideo(editing) {
    var m = state.productDraftMedia;
    if (m.video !== null) return m.video || null;
    if (editing && editing.video) return editing.video;
    return null;
  }

  function renderBadgeList(items, extraClass) {
    if (!items || !items.length) {
      return '<span class="badge badge-muted">—</span>';
    }
    return items
      .map(function (item) {
        return '<span class="badge ' + (extraClass || "") + '">' + escapeHtml(item) + "</span>";
      })
      .join("");
  }

  function renderColorBadgesAdmin(colors) {
    if (!colors || !colors.length) {
      return '<span class="badge badge-muted">—</span>';
    }
    return colors
      .map(function (c) {
        var bg = colorToCss(c);
        return (
          '<span class="badge badge-color"><span class="badge-swatch" style="background:' +
          escapeHtml(bg) +
          '"></span>' +
          escapeHtml(c) +
          "</span>"
        );
      })
      .join("");
  }

  function buildColorPickerHtml(selected, customColors) {
    var set = {};
    (selected || []).forEach(function (c) {
      set[c] = true;
    });
    var presetHtml = PRESET_COLORS.map(function (color) {
      var active = set[color] ? " is-active" : "";
      var bg = colorToCss(color);
      return (
        '<button type="button" class="picker-btn picker-color' +
        active +
        '" data-color-option="' +
        escapeHtml(color) +
        '"><span class="picker-swatch" style="background:' +
        escapeHtml(bg) +
        '"></span>' +
        escapeHtml(color) +
        "</button>"
      );
    }).join("");
    var customHtml = (customColors || [])
      .filter(function (c, idx, arr) {
        return arr.findIndex(function (x) {
          return x.toLowerCase() === c.toLowerCase();
        }) === idx;
      })
      .map(function (color) {
        var active = set[color] ? " is-active" : "";
        var bg = colorToCss(color);
        return (
          '<button type="button" class="picker-btn picker-color picker-color-custom' +
          active +
          '" data-color-option="' +
          escapeHtml(color) +
          '"><span class="picker-swatch" style="background:' +
          escapeHtml(bg) +
          '"></span>' +
          escapeHtml(color) +
          "</button>"
        );
      })
      .join("");
    return presetHtml + customHtml;
  }

  function isProductFormVisible() {
    return Boolean(state.productFormOpen || state.editingProductId);
  }

  function closeProductForm() {
    state.productFormOpen = false;
    state.editingProductId = null;
    state.lastEditingProductId = undefined;
    state.productFormDraftVariants = {};
  }

  function openProductFormForNew() {
    state.productFormOpen = true;
    state.editingProductId = null;
    state.lastEditingProductId = undefined;
    state.productFormDraftVariants = {};
    state.productFormCustomColors = [];
    state.productDraftMedia = { image: null, video: null, imageName: "", videoName: "" };
  }

  function variantsToDraftMap(variants) {
    var map = {};
    (variants || []).forEach(function (v) {
      if (!v || !v.color) return;
      var rows = [];
      if (Array.isArray(v.sizes)) {
        rows = v.sizes.map(function (e) {
          return { size: e.size || "", stock: e.stock != null ? e.stock : 0 };
        });
      } else if (v.sizes && typeof v.sizes === "object") {
        rows = Object.keys(v.sizes).map(function (size) {
          return { size: size, stock: v.sizes[size] };
        });
      }
      map[v.color] = { rows: rows };
    });
    return map;
  }

  function getActiveColorsForForm(editing) {
    var draftKeys = Object.keys(state.productFormDraftVariants || {});
    if (draftKeys.length) return draftKeys;
    if (editing && editing.colors && editing.colors.length) return editing.colors.slice();
    return [];
  }

  function renderColorsCountCell(product) {
    var colors = product.colors || [];
    if (!colors.length) return '<span class="table-muted">—</span>';
    var swatches = colors
      .slice(0, 4)
      .map(function (c) {
        return (
          '<span class="table-color-dot" style="background:' +
          escapeHtml(colorToCss(c)) +
          '" title="' +
          escapeHtml(c) +
          '"></span>'
        );
      })
      .join("");
    var label =
      colors.length === 1 ? "1 цвет" : colors.length + " " + (colors.length < 5 ? "цвета" : "цветов");
    return (
      '<div class="table-colors-cell">' +
      swatches +
      '<span class="table-colors-label">' +
      escapeHtml(label) +
      "</span></div>"
    );
  }

  function renderSizesSummaryCell(product) {
    var summary = getProductSizeSummary(product);
    if (!summary.count) return '<span class="table-muted">—</span>';
    return '<span class="table-sizes-summary">' + escapeHtml(summary.text) + "</span>";
  }

  function renderTotalStockCell(product) {
    var total = getProductTotalStock(product);
    if (!total) return '<span class="table-muted">0 шт</span>';
    return '<span class="table-stock-total">' + escapeHtml(String(total)) + " шт</span>";
  }

  function buildVariantSizeRowHtml(color, row, rowIndex) {
    var sizeVal = row && row.size != null ? String(row.size) : "";
    var stockVal = row && row.stock != null ? String(row.stock) : "";
    return (
      '<tr class="variant-size-row" data-row-index="' +
      rowIndex +
      '">' +
      '<td><input class="input input-sm variant-size-input" type="text" data-variant-color="' +
      escapeHtml(color) +
      '" value="' +
      escapeHtml(sizeVal) +
      '" placeholder="42, S, One Size" /></td>' +
      '<td><input class="input input-sm variant-stock-input" type="number" min="0" step="1" data-variant-color="' +
      escapeHtml(color) +
      '" value="' +
      escapeHtml(stockVal) +
      '" placeholder="0" /></td>' +
      '<td class="variant-row-actions">' +
      '<button type="button" class="btn btn-ghost btn-sm variant-remove-row" data-variant-color="' +
      escapeHtml(color) +
      '" title="Удалить размер">×</button>' +
      "</td></tr>"
    );
  }

  function buildVariantBlockHtml(color, entry) {
    var draftEntry = entry || { rows: [] };
    var rows = draftEntry.rows && draftEntry.rows.length ? draftEntry.rows : [];
    var bg = colorToCss(color);
    var rowsHtml = rows.length
      ? rows
          .map(function (row, idx) {
            return buildVariantSizeRowHtml(color, row, idx);
          })
          .join("")
      : "";
    return (
      '<div class="variant-card" data-variant-color="' +
      escapeHtml(color) +
      '">' +
      '<div class="variant-card-head">' +
      '<h4 class="variant-color-title"><span class="picker-swatch" style="background:' +
      escapeHtml(bg) +
      '"></span>' +
      escapeHtml(color) +
      "</h4></div>" +
      '<table class="variant-size-table">' +
      "<thead><tr><th>Размер</th><th>Остаток</th><th></th></tr></thead>" +
      "<tbody>" +
      rowsHtml +
      "</tbody></table>" +
      '<button type="button" class="btn btn-ghost btn-sm variant-add-size" data-variant-color="' +
      escapeHtml(color) +
      '">+ Добавить размер</button>' +
      "</div>"
    );
  }

  function buildVariantFieldsHtml(colors, draftMap) {
    if (!colors.length) {
      return '<p class="variants-empty-hint">Выберите цвета выше — для каждого появится карточка варианта.</p>';
    }
    return (
      '<div class="variants-cards">' +
      colors
        .map(function (color) {
          return buildVariantBlockHtml(color, draftMap[color]);
        })
        .join("") +
      "</div>"
    );
  }

  function buildProductDetailModalBody(product) {
    if (!product) return "";
    var status = product.published
      ? '<span class="badge badge-success">На витрине</span>'
      : '<span class="badge badge-warn">Не на витрине</span>';
    var img =
      product.images && product.images[0]
        ? '<img class="detail-modal-image" src="' + escapeHtml(product.images[0]) + '" alt="" />'
        : '<div class="detail-modal-image detail-modal-image-empty">Нет фото</div>';
    var video = product.video
      ? '<video class="detail-modal-video" controls playsinline src="' + escapeHtml(product.video) + '"></video>'
      : "";
    var variantsHtml = (product.variants || [])
      .map(function (v) {
        var rows = (v.sizes || [])
          .map(function (e) {
            var stockClass = e.stock > 0 ? "" : " is-zero";
            return (
              "<tr><td>" +
              escapeHtml(e.size) +
              '</td><td class="detail-stock' +
              stockClass +
              '">' +
              escapeHtml(String(e.stock)) +
              " шт</td></tr>"
            );
          })
          .join("");
        if (!rows) rows = '<tr><td colspan="2" class="table-muted">Размеры не указаны</td></tr>';
        return (
          '<div class="detail-variant-block">' +
          '<h4 class="detail-variant-title"><span class="picker-swatch" style="background:' +
          escapeHtml(colorToCss(v.color)) +
          '"></span>' +
          escapeHtml(v.color) +
          "</h4>" +
          '<table class="detail-variant-table"><thead><tr><th>Размер</th><th>Остаток</th></tr></thead><tbody>' +
          rows +
          "</tbody></table></div>"
        );
      })
      .join("");
    if (!variantsHtml) variantsHtml = '<p class="table-muted">Варианты не заданы</p>';
    return (
      '<div class="detail-modal-layout">' +
      '<div class="detail-modal-media">' +
      img +
      video +
      "</div>" +
      '<div class="detail-modal-info">' +
      "<h3>" +
      escapeHtml(product.name) +
      "</h3>" +
      '<p class="detail-meta">' +
      escapeHtml(product.cat) +
      (product.subcat ? " · " + escapeHtml(product.subcat) : "") +
      "</p>" +
      '<p class="detail-price">' +
      escapeHtml(String(product.price)) +
      " ₽</p>" +
      '<p class="detail-desc">' +
      escapeHtml(product.desc || "—") +
      "</p>" +
      '<p class="detail-status">' +
      status +
      "</p>" +
      '<p class="detail-summary">Всего на складе: <b>' +
      escapeHtml(String(getProductTotalStock(product))) +
      " шт</b></p>" +
      '<div class="detail-variants">' +
      variantsHtml +
      "</div></div></div>"
    );
  }

  function openProductDetailModal(productId) {
    var product = state.products.find(function (p) {
      return p.id === productId;
    });
    var modal = document.getElementById("productDetailModal");
    var body = document.getElementById("productDetailModalBody");
    if (!modal || !body || !product) return;
    body.innerHTML = buildProductDetailModalBody(product);
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeProductDetailModal() {
    var modal = document.getElementById("productDetailModal");
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }
  function readFileAsDataURL(file, maxBytes, done) {
    if (!file) {
      done(new Error("Файл не выбран"));
      return;
    }
    if (file.size > maxBytes) {
      done(
        new Error(
          "Файл слишком большой (макс. " + Math.round(maxBytes / 1024 / 1024) + " МБ)"
        )
      );
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      done(null, reader.result, file.name);
    };
    reader.onerror = function () {
      done(new Error("Не удалось прочитать файл"));
    };
    reader.readAsDataURL(file);
  }

  function renderProductsSection() {
    syncProductFormSession();
    var editing = getEditingProduct();
    var showForm = isProductFormVisible();
    var formCat = editing ? editing.cat : "";
    var formSub = editing ? editing.subcat || "" : "";
    var catOptions = state.categories
      .map(function (c) {
        var catName = getCategoryName(c);
        var sel = formCat === catName ? " selected" : "";
        return '<option value="' + escapeHtml(catName) + '"' + sel + ">" + escapeHtml(catName) + "</option>";
      })
      .join("");
    var subOptions = buildSubcategoryOptionsHtml(formCat, formSub);
    var subHint = !formCat
      ? ""
      : !(state.subcategories[formCat] || []).length
        ? "У этой категории пока нет подкатегорий"
        : "";
    var previewImage = getPreviewImageSrc(editing);
    var previewVideo = getPreviewVideoSrc(editing);
    var activeColors = getActiveColorsForForm(editing);
    var selectedColors = activeColors;
    var imageHint = state.productDraftMedia.imageName || (previewImage ? "Фото загружено" : "");
    var videoHint =
      state.productDraftMedia.videoName || (previewVideo ? "Видео загружено" : "Видео не выбрано");
    var variantsForForm = state.productFormDraftVariants || {};

    var rows = state.products
      .map(function (p) {
        var thumb =
          p.images && p.images[0]
            ? '<img class="product-thumb" src="' + escapeHtml(p.images[0]) + '" alt="" />'
            : '<span class="product-thumb product-thumb-empty">нет фото</span>';
        var status = p.published
          ? '<span class="badge badge-success">На витрине</span>'
          : '<span class="badge badge-warn">Не на витрине</span>';
        return (
          "<tr>" +
          "<td>" + thumb + "</td>" +
          "<td class=\"products-name-cell\">" + escapeHtml(p.name) + "</td>" +
          "<td>" + renderColorsCountCell(p) + "</td>" +
          "<td>" + renderSizesSummaryCell(p) + "</td>" +
          "<td>" + renderTotalStockCell(p) + "</td>" +
          "<td>" + escapeHtml(String(p.price)) + " ₽</td>" +
          "<td>" + status + "</td>" +
          '<td class="products-actions-cell">' +
          '<button type="button" class="btn btn-ghost btn-sm" data-view-product-id="' +
          escapeHtml(p.id) +
          '">Подробнее</button> ' +
          '<button type="button" class="btn btn-ghost btn-sm" data-edit-product-id="' +
          escapeHtml(p.id) +
          '">Редактировать</button> ' +
          '<button type="button" class="btn btn-ghost btn-sm btn-danger-text" data-delete-product-id="' +
          escapeHtml(p.id) +
          '">Удалить</button></td></tr>'
        );
      })
      .join("");

    var formPanel =
      showForm
        ? '<div id="productFormPanel" class="product-form-panel is-open">' +
          '<div class="product-form-grid">' +
          '<div class="field"><label class="label" for="productName">Название</label>' +
          '<input class="input" id="productName" type="text" value="' +
          escapeHtml(editing ? editing.name : "") +
          '" placeholder="Например, Платье миди" /></div>' +
          '<div class="field"><label class="label" for="productCat">Категория</label>' +
          '<select class="input" id="productCat"><option value="">Выберите категорию</option>' +
          catOptions +
          "</select></div>" +
          '<div class="field"><label class="label" for="productSubcat">Подкатегория</label>' +
          '<select class="input" id="productSubcat" ' +
          (!formCat ? "disabled" : "") +
          ">" +
          subOptions +
          '</select><p class="stub-text" id="productSubcatHint">' +
          escapeHtml(subHint) +
          "</p></div>" +
          '<div class="field"><label class="label" for="productPrice">Цена (₽)</label>' +
          '<input class="input" id="productPrice" type="number" min="0" step="1" value="' +
          escapeHtml(editing ? String(editing.price) : "") +
          '" placeholder="4900" /></div>' +
          '<div class="field field-span-2"><label class="label" for="productDesc">Описание</label>' +
          '<input class="input" id="productDesc" type="text" value="' +
          escapeHtml(editing ? editing.desc : "") +
          '" placeholder="Краткое описание" /></div>' +
          '<div class="field field-span-2 media-field"><label class="label">Фото товара</label>' +
          '<input type="file" id="productImageFile" accept="image/*" hidden />' +
          '<div class="media-actions">' +
          '<button type="button" class="btn btn-ghost" id="productImagePickBtn">Загрузить фото</button>' +
          '<button type="button" class="btn btn-ghost" id="productImageClearBtn">Удалить фото</button>' +
          "</div>" +
          '<p class="stub-text" id="productImageHint">' +
          escapeHtml(imageHint) +
          "</p>" +
          (previewImage
            ? '<img class="media-preview" id="productImagePreview" src="' +
              escapeHtml(previewImage) +
              '" alt="Превью" />'
            : '<div class="media-preview media-preview-empty" id="productImagePreview">Превью появится после загрузки</div>') +
          "</div>" +
          '<div class="field field-span-2 media-field"><label class="label">Видео товара (необязательно)</label>' +
          '<input type="file" id="productVideoFile" accept="video/mp4,video/*" hidden />' +
          '<div class="media-actions">' +
          '<button type="button" class="btn btn-ghost" id="productVideoPickBtn">Загрузить видео</button>' +
          '<button type="button" class="btn btn-ghost" id="productVideoClearBtn">Удалить видео</button>' +
          "</div>" +
          '<p class="stub-text" id="productVideoHint">' +
          escapeHtml(videoHint) +
          "</p>" +
          (previewVideo
            ? '<video class="media-preview-video" id="productVideoPreview" controls playsinline src="' +
              escapeHtml(previewVideo) +
              '"></video>'
            : "") +
          "</div>" +
          '<div class="field field-span-2"><label class="label">Цвета</label>' +
          '<div class="picker-group" id="productColorsPicker">' +
          buildColorPickerHtml(selectedColors, state.productFormCustomColors) +
          "</div>" +
          '<div class="inline-form custom-color-form">' +
          '<input class="input" id="productCustomColorInput" type="text" placeholder="Добавить свой цвет" />' +
          '<button type="button" class="btn btn-ghost" id="productAddCustomColorBtn">Добавить</button>' +
          "</div></div>" +
          '<div class="field field-span-2 variants-section">' +
          '<label class="label">Варианты товара</label>' +
          '<p class="stub-text variants-section-hint">Для каждого цвета добавьте размеры и остатки вручную.</p>' +
          '<div id="productVariantFields">' +
          buildVariantFieldsHtml(activeColors, variantsForForm) +
          "</div></div>" +
          '<div class="btn-row">' +
          '<button type="button" id="saveProductBtn" class="btn btn-primary">' +
          (editing ? "Сохранить изменения" : "Сохранить товар") +
          "</button>" +
          (editing
            ? '<button type="button" id="cancelProductEdit" class="btn btn-ghost">Отмена</button>'
            : "") +
          "</div>" +
          "</div>"
        : "";

    return (
      '<article class="stub-card products-page">' +
      '<div class="products-page-header">' +
      '<h3 class="stub-title">Товары</h3>' +
      '<button type="button" id="toggleProductFormBtn" class="btn btn-primary">' +
      (showForm ? "Скрыть" : "+ Добавить товар") +
      "</button>" +
      "</div>" +
      '<div id="productsMessage"></div>' +
      formPanel +
      '<div class="table-wrap products-table-wrap">' +
      (state.products.length
        ? '<table class="data-table products-table"><thead><tr>' +
          "<th>Фото</th><th>Название</th><th>Цветов</th><th>Размеров</th><th>Остатков</th>" +
          "<th>Цена</th><th>Статус</th><th>Действия</th>" +
          "</tr></thead><tbody>" +
          rows +
          "</tbody></table>"
        : '<p class="stub-text">Пока нет товаров. Нажмите «+ Добавить товар».</p>') +
      "</div>" +
      '<div id="productDetailModal" class="admin-modal" aria-hidden="true">' +
      '<div class="admin-modal-backdrop" data-close-product-detail></div>' +
      '<div class="admin-modal-dialog" role="dialog" aria-modal="true">' +
      '<button type="button" class="admin-modal-close" data-close-product-detail aria-label="Закрыть">×</button>' +
      '<div id="productDetailModalBody" class="admin-modal-body"></div>' +
      "</div></div>" +
      "</article>"
    );
  }

  function renderSettingsSection() {
    var s = state.settings;
    return (
      '<article class="stub-card">' +
      '<h3 class="stub-title">Настройки магазина</h3>' +
      '<p class="stub-text">Эти данные отображаются на основном сайте.</p>' +
      '<div class="product-form-grid">' +
      '<div class="field"><label class="label" for="settingsStoreName">Название магазина</label>' +
      '<input class="input" id="settingsStoreName" type="text" value="' + escapeHtml(s.storeName || "") + '" /></div>' +
      '<div class="field"><label class="label" for="settingsTagline">Подзаголовок</label>' +
      '<input class="input" id="settingsTagline" type="text" value="' + escapeHtml(s.tagline || "") + '" /></div>' +
      '<div class="field"><label class="label" for="settingsTelegram">Telegram (без @)</label>' +
      '<input class="input" id="settingsTelegram" type="text" value="' + escapeHtml(s.telegram || "") + '" /></div>' +
      '<div class="field"><label class="label" for="settingsMax">MAX</label>' +
      '<input class="input" id="settingsMax" type="text" value="' + escapeHtml(s.max || "") + '" placeholder="Ссылка или контакт" /></div>' +
      '<div class="field"><label class="label" for="settingsPhone">Телефон</label>' +
      '<input class="input" id="settingsPhone" type="text" value="' + escapeHtml(s.phone || "") + '" /></div>' +
      '<div class="field field-span-2"><label class="label" for="settingsAddress">Адрес</label>' +
      '<input class="input" id="settingsAddress" type="text" value="' + escapeHtml(s.address || "") + '" /></div>' +
      '</div>' +
      '<div class="btn-row"><button type="button" id="saveSettingsBtn" class="btn btn-primary">Сохранить настройки</button></div>' +
      '<div id="settingsMessage"></div>' +
      '</article>'
    );
  }

  function bindSettingsEvents() {
    var btn = document.getElementById("saveSettingsBtn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      state.settings = {
        storeName: document.getElementById("settingsStoreName").value.trim(),
        tagline: document.getElementById("settingsTagline").value.trim(),
        telegram: document.getElementById("settingsTelegram").value.trim(),
        max: document.getElementById("settingsMax").value.trim(),
        phone: document.getElementById("settingsPhone").value.trim(),
        address: document.getElementById("settingsAddress").value.trim(),
      };
      persistSettings();
      showSectionMessage("settingsMessage", "msg-success", "Настройки сохранены");
    });
  }

  function bindAdminEvents() {
    document.getElementById("adminNav").addEventListener("click", function (event) {
      const btn = event.target.closest("[data-section]");
      if (!btn) return;
      state.currentSection = btn.dataset.section;
      persistCurrentSection();
      renderAdmin();
    });

    document.getElementById("logoutBtn").addEventListener("click", function () {
      state.isAuth = false;
      localStorage.removeItem(STORAGE_KEYS.auth);
      state.authMode = "login";
      setMessage("msg-info", "Вы вышли из админ-панели.");
      renderAuth();
    });
  }

  function bindSectionEvents() {
    if (state.currentSection === "categories") bindCategoriesEvents();
    if (state.currentSection === "subcategories") bindSubcategoriesEvents();
    if (state.currentSection === "products") bindProductsEvents();
    if (state.currentSection === "settings") bindSettingsEvents();
  }

  function bindCategoriesEvents() {
    const input = document.getElementById("newCategoryInput");
    const addBtn = document.getElementById("addCategoryBtn");
    const searchInput = document.getElementById("categorySearchInput");
    const section = document.getElementById("sectionContent");

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        state.categoriesSearchQuery = searchInput.value;
        renderAdmin();
      });
    }

    addBtn.addEventListener("click", function () {
      const name = input.value.trim();
      if (!name) {
        showSectionMessage("categoriesMessage", "msg-error", "Введите название категории");
        return;
      }
      if (
        state.categories.some(function (item) {
          return getCategoryName(item).toLowerCase() === name.toLowerCase();
        })
      ) {
        showSectionMessage("categoriesMessage", "msg-error", "Категория уже существует");
        return;
      }
      state.categories.push({ name: name, visible: false });
      persistCategories();
      showSectionMessage(
        "categoriesMessage",
        "msg-success",
        "Категория создана. Нажмите «Добавить», чтобы показать на витрине."
      );
      renderAdmin();
    });

    section.addEventListener("change", function (event) {
      const toggle = event.target.closest(".category-visible-toggle");
      if (!toggle) return;
      const categoryName = toggle.dataset.category;
      setCategoryVisibleByName(categoryName, toggle.checked);
      renderAdmin();
    });

    section.addEventListener("click", function (event) {
      const addToStorefront = event.target.closest("[data-add-to-storefront]");
      if (addToStorefront) {
        const categoryName = addToStorefront.dataset.addToStorefront;
        setCategoryVisibleByName(categoryName, true);
        showSectionMessage("categoriesMessage", "msg-success", "Категория добавлена на витрину");
        renderAdmin();
        return;
      }

      const removeFromStorefront = event.target.closest("[data-remove-from-storefront]");
      if (removeFromStorefront) {
        const categoryName = removeFromStorefront.dataset.removeFromStorefront;
        if (!window.confirm("Удалить категорию с витрины?")) return;
        setCategoryVisibleByName(categoryName, false);
        showSectionMessage("categoriesMessage", "msg-info", "Категория скрыта с витрины");
        renderAdmin();
      }
    });
  }

  function bindSubcategoriesEvents() {
    var select = document.getElementById("subcategoryCategorySelect");
    var input = document.getElementById("newSubcategoryInput");
    var addBtn = document.getElementById("addSubcategoryBtn");
    var cancelBtn = document.getElementById("cancelSubcategoryEdit");
    var section = document.getElementById("sectionContent");

    select.addEventListener("change", function () {
      state.selectedCategory = select.value;
      persistSelectedCategory();
      renderAdmin();
    });

    if (cancelBtn) {
      cancelBtn.addEventListener("click", function () {
        state.editingSubcategory = null;
        renderAdmin();
      });
    }

    addBtn.addEventListener("click", function () {
      var category = select.value;
      var subcategory = input.value.trim();
      if (!category) {
        showSectionMessage("subcategoriesMessage", "msg-error", "Выберите категорию");
        return;
      }
      if (!subcategory) {
        showSectionMessage("subcategoriesMessage", "msg-error", "Введите название подкатегории");
        return;
      }

      if (state.editingSubcategory) {
        var edit = state.editingSubcategory;
        var oldCat = edit.category;
        var oldName = (state.subcategories[oldCat] || [])[edit.index];
        var bucket = state.subcategories[category] || [];
        var duplicate = bucket.some(function (item, i) {
          if (category === oldCat && i === edit.index) return false;
          return item.toLowerCase() === subcategory.toLowerCase();
        });
        if (duplicate) {
          showSectionMessage("subcategoriesMessage", "msg-error", "Такая подкатегория уже есть в этой категории");
          return;
        }
        if (oldCat !== category) {
          var oldBucket = (state.subcategories[oldCat] || []).slice();
          oldBucket.splice(edit.index, 1);
          state.subcategories[oldCat] = oldBucket;
          var newBucket = (state.subcategories[category] || []).slice();
          newBucket.push(subcategory);
          state.subcategories[category] = newBucket;
        } else {
          var updated = bucket.slice();
          updated[edit.index] = subcategory;
          state.subcategories[category] = updated;
        }
        syncProductsSubcategoryRename(oldCat, oldName, category, subcategory);
        state.editingSubcategory = null;
        state.selectedCategory = category;
        persistSubcategories();
        persistSelectedCategory();
        persistProducts();
        renderAdmin();
        return;
      }

      var bucketNew = state.subcategories[category] || [];
      if (bucketNew.some(function (item) { return item.toLowerCase() === subcategory.toLowerCase(); })) {
        showSectionMessage("subcategoriesMessage", "msg-error", "Такая подкатегория уже есть в этой категории");
        return;
      }
      state.subcategories[category] = bucketNew.concat([subcategory]);
      persistSubcategories();
      renderAdmin();
    });

    section.addEventListener("click", function (event) {
      var editBtn = event.target.closest("[data-edit-subcategory-index]");
      if (editBtn) {
        var idx = Number(editBtn.dataset.editSubcategoryIndex);
        if (!state.selectedCategory || Number.isNaN(idx)) return;
        state.editingSubcategory = { category: state.selectedCategory, index: idx };
        renderAdmin();
        return;
      }
      var delBtn = event.target.closest("[data-delete-subcategory-index]");
      if (!delBtn) return;
      var delIdx = Number(delBtn.dataset.deleteSubcategoryIndex);
      if (!state.selectedCategory || Number.isNaN(delIdx)) return;
      var cat = state.selectedCategory;
      var name = (state.subcategories[cat] || [])[delIdx];
      if (!name) return;
      if (!window.confirm("Удалить подкатегорию?")) return;
      if (productsUsingSubcategory(cat, name).length) {
        if (!window.confirm("Эта подкатегория может использоваться в товарах. Всё равно удалить?")) return;
      }
      var arr = (state.subcategories[cat] || []).slice();
      arr.splice(delIdx, 1);
      state.subcategories[cat] = arr;
      clearProductsSubcategory(cat, name);
      if (state.editingSubcategory && state.editingSubcategory.category === cat) {
        state.editingSubcategory = null;
      }
      persistSubcategories();
      persistProducts();
      renderAdmin();
    });
  }

  function bindProductsEvents() {
    var section = document.getElementById("sectionContent");
    if (!section) return;

    if (!section.dataset.productsListBound) {
      section.dataset.productsListBound = "1";
      section.addEventListener("click", function (event) {
        var viewBtn = event.target.closest("[data-view-product-id]");
        if (viewBtn) {
          openProductDetailModal(viewBtn.dataset.viewProductId);
          return;
        }
        var editBtn = event.target.closest("[data-edit-product-id]");
        if (editBtn) {
          state.editingProductId = editBtn.dataset.editProductId;
          state.productFormOpen = true;
          state.lastEditingProductId = undefined;
          renderAdmin();
          return;
        }
        var del = event.target.closest("[data-delete-product-id]");
        if (!del) return;
        if (!window.confirm("Удалить товар?")) return;
        var id = del.dataset.deleteProductId;
        if (state.editingProductId === id) closeProductForm();
        state.products = state.products.filter(function (p) {
          return p.id !== id;
        });
        persistProducts();
        renderAdmin();
      });
    }

    var toggleFormBtn = document.getElementById("toggleProductFormBtn");
    if (toggleFormBtn && !toggleFormBtn.dataset.bound) {
      toggleFormBtn.dataset.bound = "1";
      toggleFormBtn.addEventListener("click", function () {
        if (isProductFormVisible()) {
          closeProductForm();
        } else {
          openProductFormForNew();
        }
        renderAdmin();
      });
    }

    if (!isProductFormVisible()) return;

    var saveBtn = document.getElementById("saveProductBtn");
    var cancelBtn = document.getElementById("cancelProductEdit");
    var catSelect = document.getElementById("productCat");
    if (!saveBtn || !catSelect) return;

    function refreshSubcategorySelect(keepValue) {
      var cat = catSelect.value;
      var subSelect = document.getElementById("productSubcat");
      var hint = document.getElementById("productSubcatHint");
      if (!subSelect || !hint) return;
      subSelect.innerHTML = buildSubcategoryOptionsHtml(cat, keepValue || "");
      subSelect.disabled = !cat;
      if (!cat) {
        hint.textContent = "";
      } else if (!(state.subcategories[cat] || []).length) {
        hint.textContent = "У этой категории пока нет подкатегорий";
      } else {
        hint.textContent = "";
      }
    }

    catSelect.addEventListener("change", function () {
      refreshSubcategorySelect("");
    });

    if (cancelBtn) {
      cancelBtn.addEventListener("click", function () {
        closeProductForm();
        renderAdmin();
      });
    }

    function collectSelectedColors() {
      var nodes = document.querySelectorAll("#productColorsPicker .picker-btn.is-active");
      return Array.prototype.map.call(nodes, function (btn) {
        return btn.dataset.colorOption;
      });
    }

    function mergeVariantsFromDom() {
      var map = state.productFormDraftVariants || {};
      document.querySelectorAll(".variant-card").forEach(function (block) {
        var color = block.dataset.variantColor;
        if (!color) return;
        var rows = [];
        block.querySelectorAll(".variant-size-row").forEach(function (tr) {
          var sizeInp = tr.querySelector(".variant-size-input");
          var stockInp = tr.querySelector(".variant-stock-input");
          if (!sizeInp) return;
          var sizeLabel = sizeInp.value.trim();
          if (!sizeLabel) return;
          var raw = stockInp ? stockInp.value.trim() : "";
          var n = raw === "" ? 0 : Number(raw);
          var stock = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
          rows.push({ size: sizeLabel, stock: stock });
        });
        map[color] = { rows: rows };
      });
      state.productFormDraftVariants = map;
    }

    function refreshProductVariantFields() {
      mergeVariantsFromDom();
      var selected = collectSelectedColors();
      var map = state.productFormDraftVariants || {};
      Object.keys(map).forEach(function (c) {
        if (selected.indexOf(c) === -1) delete map[c];
      });
      selected.forEach(function (c) {
        if (!map[c]) map[c] = { rows: [] };
      });
      state.productFormDraftVariants = map;
      var wrap = document.getElementById("productVariantFields");
      if (!wrap) return;
      wrap.innerHTML = buildVariantFieldsHtml(selected, map);
    }

    function collectVariantsFromForm() {
      mergeVariantsFromDom();
      var colors = collectSelectedColors();
      return colors.map(function (color) {
        var entry = state.productFormDraftVariants[color] || { rows: [] };
        var sizes = (entry.rows || [])
          .filter(function (r) {
            return r.size && String(r.size).trim();
          })
          .map(function (r) {
            var stock = Number(r.stock);
            return {
              size: String(r.size).trim(),
              stock: Number.isFinite(stock) && stock >= 0 ? Math.floor(stock) : 0,
            };
          });
        return { color: color, sizes: sizes };
      });
    }

    function wirePickerToggle(containerId, onToggle) {
      var container = document.getElementById(containerId);
      if (!container) return;
      container.addEventListener("click", function (event) {
        var btn = event.target.closest(".picker-btn");
        if (!btn) return;
        btn.classList.toggle("is-active");
        if (onToggle) onToggle();
      });
    }

    wirePickerToggle("productColorsPicker", refreshProductVariantFields);

    var variantFields = document.getElementById("productVariantFields");
    if (variantFields && !variantFields.dataset.bound) {
      variantFields.dataset.bound = "1";
      variantFields.addEventListener("click", function (event) {
        var addBtn = event.target.closest(".variant-add-size");
        if (addBtn) {
          mergeVariantsFromDom();
          var colorAdd = addBtn.dataset.variantColor;
          var entryAdd = state.productFormDraftVariants[colorAdd] || { rows: [] };
          entryAdd.rows.push({ size: "", stock: 0 });
          state.productFormDraftVariants[colorAdd] = entryAdd;
          refreshProductVariantFields();
          return;
        }
        var removeBtn = event.target.closest(".variant-remove-row");
        if (removeBtn) {
          mergeVariantsFromDom();
          var colorRem = removeBtn.dataset.variantColor;
          var block = removeBtn.closest(".variant-card");
          var row = removeBtn.closest(".variant-size-row");
          if (!block || !row || !colorRem) return;
          var entryRem = state.productFormDraftVariants[colorRem] || { rows: [] };
          var rowsDom = block.querySelectorAll(".variant-size-row");
          for (var i = 0; i < rowsDom.length; i++) {
            if (rowsDom[i] === row) {
              entryRem.rows.splice(i, 1);
              break;
            }
          }
          state.productFormDraftVariants[colorRem] = entryRem;
          refreshProductVariantFields();
        }
      });
    }

    var detailModal = document.getElementById("productDetailModal");
    if (detailModal && !detailModal.dataset.bound) {
      detailModal.dataset.bound = "1";
      detailModal.addEventListener("click", function (event) {
        if (event.target.closest("[data-close-product-detail]")) closeProductDetailModal();
      });
      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && detailModal.classList.contains("is-open")) {
          closeProductDetailModal();
        }
      });
    }

    var imageFileInput = document.getElementById("productImageFile");
    var videoFileInput = document.getElementById("productVideoFile");
    var imagePickBtn = document.getElementById("productImagePickBtn");
    var videoPickBtn = document.getElementById("productVideoPickBtn");
    var imageClearBtn = document.getElementById("productImageClearBtn");
    var videoClearBtn = document.getElementById("productVideoClearBtn");
    var addCustomColorBtn = document.getElementById("productAddCustomColorBtn");

    if (imagePickBtn && imageFileInput) {
      imagePickBtn.addEventListener("click", function () {
        imageFileInput.click();
      });
      imageFileInput.addEventListener("change", function () {
        var file = imageFileInput.files && imageFileInput.files[0];
        if (!file) return;
        readFileAsDataURL(file, MAX_IMAGE_BYTES, function (err, dataUrl, fileName) {
          if (err) {
            showSectionMessage("productsMessage", "msg-error", err.message);
            imageFileInput.value = "";
            return;
          }
          state.productDraftMedia.image = dataUrl;
          state.productDraftMedia.imageName = fileName;
          renderAdmin();
        });
      });
    }

    if (imageClearBtn) {
      imageClearBtn.addEventListener("click", function () {
        state.productDraftMedia.image = "";
        state.productDraftMedia.imageName = "";
        if (imageFileInput) imageFileInput.value = "";
        renderAdmin();
      });
    }

    if (videoPickBtn && videoFileInput) {
      videoPickBtn.addEventListener("click", function () {
        videoFileInput.click();
      });
      videoFileInput.addEventListener("change", function () {
        var file = videoFileInput.files && videoFileInput.files[0];
        if (!file) return;
        readFileAsDataURL(file, MAX_VIDEO_BYTES, function (err, dataUrl, fileName) {
          if (err) {
            showSectionMessage("productsMessage", "msg-error", err.message);
            videoFileInput.value = "";
            return;
          }
          state.productDraftMedia.video = dataUrl;
          state.productDraftMedia.videoName = fileName;
          renderAdmin();
        });
      });
    }

    if (videoClearBtn) {
      videoClearBtn.addEventListener("click", function () {
        state.productDraftMedia.video = "";
        state.productDraftMedia.videoName = "";
        if (videoFileInput) videoFileInput.value = "";
        renderAdmin();
      });
    }

    if (addCustomColorBtn) {
      addCustomColorBtn.addEventListener("click", function () {
        var input = document.getElementById("productCustomColorInput");
        if (!input) return;
        var value = input.value.trim();
        if (!value) return;
        var exists = state.productFormCustomColors.some(function (c) {
          return c.toLowerCase() === value.toLowerCase();
        });
        var presetExists = PRESET_COLORS.some(function (c) {
          return c.toLowerCase() === value.toLowerCase();
        });
        if (!exists && !presetExists) state.productFormCustomColors.push(value);
        input.value = "";
        renderAdmin();
        setTimeout(function () {
          document.querySelectorAll("#productColorsPicker .picker-btn").forEach(function (btn) {
            if (
              btn.dataset.colorOption &&
              btn.dataset.colorOption.toLowerCase() === value.toLowerCase()
            ) {
              btn.classList.add("is-active");
            }
          });
          refreshProductVariantFields();
        }, 0);
      });
    }

    saveBtn.addEventListener("click", function () {
      var name = document.getElementById("productName").value.trim();
      var cat = document.getElementById("productCat").value.trim();
      var subcat = document.getElementById("productSubcat").value.trim();
      var priceRaw = document.getElementById("productPrice").value.trim();
      var desc = document.getElementById("productDesc").value.trim();
      var editing = getEditingProduct();
      var images = resolveProductImages(editing);
      var video = resolveProductVideo(editing);
      var colors = collectSelectedColors();
      var variants = collectVariantsFromForm();

      if (!name) {
        showSectionMessage("productsMessage", "msg-error", "Введите название товара");
        return;
      }
      if (!cat) {
        showSectionMessage("productsMessage", "msg-error", "Выберите категорию");
        return;
      }
      var price = Number(priceRaw);
      if (!Number.isFinite(price) || price < 0) {
        showSectionMessage("productsMessage", "msg-error", "Укажите корректную цену");
        return;
      }

      var draft = {
        name: name,
        cat: cat,
        subcat: subcat,
        price: price,
        desc: desc,
        images: images,
        image: images[0] || "",
        video: video,
        colors: colors,
        variants: variants,
      };

      if (state.editingProductId) {
        var idx = state.products.findIndex(function (p) { return p.id === state.editingProductId; });
        if (idx === -1) return;
        draft.id = state.editingProductId;
        var normalizedEdit = normalizeProduct(draft);
        if (!normalizedEdit) {
          showSectionMessage("productsMessage", "msg-error", "Не удалось сохранить товар");
          return;
        }
        var dupEdit = state.products.some(function (p, i) {
          return i !== idx && p.name.toLowerCase() === normalizedEdit.name.toLowerCase() && p.cat === normalizedEdit.cat;
        });
        if (dupEdit) {
          showSectionMessage("productsMessage", "msg-error", "Товар с таким названием уже есть в этой категории");
          return;
        }
        var copy = state.products.slice();
        copy[idx] = normalizedEdit;
        state.products = copy;
        closeProductForm();
        persistProducts();
        showSectionMessage(
          "productsMessage",
          normalizedEdit.published ? "msg-success" : "msg-info",
          normalizedEdit.published
            ? "Товар сохранён"
            : "Товар сохранён. На витрине не показывается — добавьте фото."
        );
        renderAdmin();
        return;
      }

      var normalized = normalizeProduct(draft);
      if (!normalized) {
        showSectionMessage("productsMessage", "msg-error", "Не удалось сохранить товар");
        return;
      }
      var dup = state.products.some(function (p) {
        return p.name.toLowerCase() === normalized.name.toLowerCase() && p.cat === normalized.cat;
      });
      if (dup) {
        showSectionMessage("productsMessage", "msg-error", "Товар с таким названием уже есть в этой категории");
        return;
      }
      state.products = state.products.concat([normalized]);
      closeProductForm();
      persistProducts();
      showSectionMessage(
        "productsMessage",
        normalized.published ? "msg-success" : "msg-info",
        normalized.published
          ? "Товар добавлен"
          : "Товар сохранён. На витрине не показывается — добавьте фото."
      );
      renderAdmin();
    });
  }

  function persistProducts() {
    state.products = Store.saveProducts(state.products);
  }

  function persistSettings() {
    state.settings = Store.saveSettings(state.settings);
  }

  function initStorageDefaults() {
    writeIfMissing(STORAGE_KEYS.categories, normalizeCategoriesList(DEFAULT_CATEGORIES));
    writeIfMissing(STORAGE_KEYS.subcategories, {});
    writeIfMissing(STORAGE_KEYS.selectedCategory, "");
    writeIfMissing(STORAGE_KEYS.settings, Store.DEFAULT_SETTINGS);
    writeIfMissing(STORAGE_KEYS.users, []);
    writeIfMissing(STORAGE_KEYS.stories, []);
    writeIfMissing(STORAGE_KEYS.currentSection, "dashboard");
  }

  function hydrateStateFromStorage() {
    state.isAuth = readAuth();
    state.owner = readObject(STORAGE_KEYS.owner, state.owner);
    state.selectedCategory = readString(STORAGE_KEYS.selectedCategory, "");
    state.users = readArray(STORAGE_KEYS.users, []);
    Store.migrateStorage();
    Store.ensureProductsSeed(defaultProductSeed);
    state.categories = Store.loadCategories(DEFAULT_CATEGORIES);
    state.subcategories = Store.loadSubcategories({});
    var loadedProducts = Store.loadProducts(defaultProductSeed);
    state.products = Array.isArray(loadedProducts) ? loadedProducts : [];
    if (!state.products.length) {
      state.products = defaultProductSeed.map(normalizeProduct).filter(Boolean);
    }
    state.settings = Store.loadSettings();
    state.stories = Store.loadStories([]);
    state.currentSection = readString(STORAGE_KEYS.currentSection, "dashboard");
  }

  function readAuth() {
    try {
      var raw = localStorage.getItem(STORAGE_KEYS.auth);
      if (raw === null) return false;
      if (raw === "true") return true;
      if (raw === "false") return false;
      return JSON.parse(raw) === true;
    } catch (e) {
      try {
        localStorage.removeItem(STORAGE_KEYS.auth);
      } catch (err) {
        /* ignore */
      }
      return false;
    }
  }

  function readArray(key, fallback) {
    var value = readFromStorage(key, fallback);
    return Array.isArray(value) ? value : fallback;
  }

  function readObject(key, fallback) {
    var value = readFromStorage(key, fallback);
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
    return fallback;
  }

  function readString(key, fallback) {
    var value = readFromStorage(key, fallback);
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return fallback;
  }

  function persistAuth() {
    localStorage.setItem(STORAGE_KEYS.auth, String(state.isAuth));
  }

  function persistOwner() {
    localStorage.setItem(STORAGE_KEYS.owner, JSON.stringify(state.owner));
  }

  function persistCategories() {
    state.categories = Store.saveCategories(state.categories);
  }

  function persistSubcategories() {
    Store.saveSubcategories(state.subcategories);
  }

  function persistSelectedCategory() {
    localStorage.setItem(STORAGE_KEYS.selectedCategory, JSON.stringify(state.selectedCategory));
  }

  function persistCurrentSection() {
    localStorage.setItem(STORAGE_KEYS.currentSection, JSON.stringify(state.currentSection));
  }

  function setPageNotice(text, typeClass) {
    const section = document.getElementById("sectionContent");
    if (!section) return;
    const el = document.createElement("div");
    el.className = `msg ${typeClass}`;
    el.style.marginBottom = "12px";
    el.textContent = text;
    section.prepend(el);
  }

  function showSectionMessage(targetId, typeClass, text) {
    const target = document.getElementById(targetId);
    if (!target) return;
    target.innerHTML = `<div class="msg ${typeClass}">${escapeHtml(text)}</div>`;
  }

  function setMessage(typeClass, text) {
    state.message = { type: typeClass, text };
  }

  function writeIfMissing(key, value) {
    try {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (e) {
      /* private mode / quota */
    }
  }

  function readFromStorage(key, fallback) {
    var raw;
    try {
      raw = localStorage.getItem(key);
    } catch (e) {
      return fallback;
    }
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw);
    } catch (e) {
      try {
        localStorage.removeItem(key);
      } catch (err) {
        /* ignore */
      }
      return fallback;
    }
  }

  function getSectionTitle(sectionId) {
    const section = sections.find((item) => item.id === sectionId);
    return section ? section.title : "Раздел";
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
})();
