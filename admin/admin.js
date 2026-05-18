// Этап админки без backend: localStorage + общий каталог (catalog-bridge.js, ключ fashionStoreCatalogProducts)
(function () {
  "use strict";

  var app = document.getElementById("app");
  var Catalog = window.FashionStoreCatalog;

  if (!app) {
    return;
  }

  if (!Catalog) {
    app.innerHTML =
      '<div class="page-wrap"><section class="auth-card"><h1>Ошибка загрузки</h1><p class="stub-text">Не найден catalog-bridge.js. Проверьте, что в папке admin есть файлы catalog-bridge.js и admin.js.</p></section></div>';
    return;
  }

  var CATALOG_STORAGE_KEY = Catalog.CATALOG_STORAGE_KEY;
  var ensureCatalogStorageReady = Catalog.ensureCatalogStorageReady;
  var loadCatalogProducts = Catalog.loadCatalogProducts;
  var saveCatalogProducts = Catalog.saveCatalogProducts;
  var normalizeProduct = Catalog.normalizeProduct;
  var defaultProductSeed = Catalog.DEFAULT_SEED;
const STORAGE_KEYS = {
  auth: "adminAuth",
  owner: "adminOwner",
  categories: "fashionStoreAdminCategories",
  subcategories: "fashionStoreAdminSubcategories",
  selectedCategory: "fashionStoreAdminSelectedCategory",
  currentSection: "fashionStoreAdminCurrentSection",
  settings: "fashionStoreAdminSettings",
  users: "fashionStoreAdminUsers",
  products: CATALOG_STORAGE_KEY,
  stories: "fashionStoreAdminStories",
};

  const DEFAULT_CATEGORIES = [
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
      localStorage.removeItem(CATALOG_STORAGE_KEY);
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
    if (!Array.isArray(state.categories)) state.categories = DEFAULT_CATEGORIES.slice();
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

    const sectionMap = {
      orders: "Раздел заказов будет добавлен на следующем этапе",
      stories: "Раздел stories будет добавлен на следующем этапе",
      users: "Раздел пользователей будет добавлен на следующем этапе",
      settings: "Раздел настроек будет добавлен на следующем этапе",
    };
    return `<article class="stub-card"><h3 class="stub-title">${getSectionTitle(
      sectionId
    )}</h3><p class="stub-text">${sectionMap[sectionId] || "Раздел будет добавлен на следующем этапе"}</p></article>`;
  }

  function renderCategoriesSection() {
    const selected = state.selectedCategory;
    const list = state.categories
      .map(
        (item) => `
      <div class="category-card ${selected === item ? "selected" : ""}" data-category="${escapeHtml(item)}">
        <button type="button" class="category-select" data-category="${escapeHtml(item)}">${escapeHtml(item)}</button>
        <button type="button" class="category-delete" data-delete-category="${escapeHtml(item)}">Удалить</button>
      </div>`
      )
      .join("");

    const related = selected ? state.subcategories[selected] || [] : [];
    return `
      <article class="stub-card">
        <h3 class="stub-title">Категории</h3>
        <div class="inline-form">
          <input id="newCategoryInput" class="input" type="text" placeholder="Новая категория" />
          <button type="button" id="addCategoryBtn" class="btn btn-primary">Добавить категорию</button>
        </div>
        <div id="categoriesMessage"></div>
        <div class="categories-grid">${list || '<p class="stub-text">Пока нет категорий.</p>'}</div>
        ${
          selected
            ? `<div class="selected-box">
                <strong>Выбрана категория: ${escapeHtml(selected)}</strong>
                ${
                  related.length
                    ? `<ul class="stub-text">${related.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>`
                    : '<p class="stub-text">У этой категории пока нет подкатегорий.</p>'
                }
                <button type="button" id="goToSubcategoriesBtn" class="btn btn-ghost">Добавить подкатегорию</button>
              </div>`
            : '<p class="stub-text">Выберите категорию.</p>'
        }
      </article>
    `;
  }

  function renderSubcategoriesSection() {
    const options = state.categories
      .map(
        (cat) => `<option value="${escapeHtml(cat)}" ${state.selectedCategory === cat ? "selected" : ""}>${escapeHtml(
          cat
        )}</option>`
      )
      .join("");
    const selected = state.selectedCategory;
    const list = selected ? state.subcategories[selected] || [] : [];

    return `
      <article class="stub-card">
        <h3 class="stub-title">Подкатегории</h3>
        <div class="field">
          <label class="label" for="subcategoryCategorySelect">Категория</label>
          <select id="subcategoryCategorySelect" class="input">
            <option value="">Выберите категорию</option>
            ${options}
          </select>
        </div>
        <div class="inline-form">
          <input id="newSubcategoryInput" class="input" type="text" placeholder="Новая подкатегория" />
          <button type="button" id="addSubcategoryBtn" class="btn btn-primary">Добавить подкатегорию</button>
        </div>
        <div id="subcategoriesMessage"></div>
        ${
          selected
            ? list.length
              ? `<ul class="stub-text">${list.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>`
              : '<p class="stub-text">У этой категории пока нет подкатегорий.</p>'
            : '<p class="stub-text">Выберите категорию.</p>'
        }
      </article>
    `;
  }

  function renderProductsSection() {
    const catOptions = state.categories
      .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
      .join("");
    const rows = state.products
      .map(
        (p) => `
      <tr>
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.cat)}</td>
        <td>${escapeHtml(String(p.price))}</td>
        <td><button type="button" class="btn btn-ghost btn-sm" data-delete-product-id="${escapeHtml(p.id)}">Удалить</button></td>
      </tr>`
      )
      .join("");

    return `
      <article class="stub-card">
        <h3 class="stub-title">Товары</h3>
        <p class="stub-text">Тот же список, что на витрине (ключ localStorage: <code>${escapeHtml(
          CATALOG_STORAGE_KEY
        )}</code>).</p>
        <div class="product-form-grid">
          <div class="field">
            <label class="label" for="productName">Название</label>
            <input class="input" id="productName" type="text" placeholder="Например, Платье миди" />
          </div>
          <div class="field">
            <label class="label" for="productCat">Категория</label>
            <select class="input" id="productCat">
              <option value="">Выберите категорию</option>
              ${catOptions}
            </select>
          </div>
          <div class="field">
            <label class="label" for="productPrice">Цена (₽)</label>
            <input class="input" id="productPrice" type="number" min="0" step="1" placeholder="4900" />
          </div>
          <div class="field field-span-2">
            <label class="label" for="productDesc">Описание</label>
            <input class="input" id="productDesc" type="text" placeholder="Краткое описание" />
          </div>
          <div class="field">
            <label class="label" for="productImage">Фото (URL или путь)</label>
            <input class="input" id="productImage" type="text" placeholder="images/item.jpg" />
          </div>
          <div class="field">
            <label class="label" for="productVideo">Видео (необязательно)</label>
            <input class="input" id="productVideo" type="text" placeholder="videos/item.mp4" />
          </div>
          <div class="field field-span-2">
            <label class="label" for="productColors">Цвета (через запятую: red, #222 или названия)</label>
            <input class="input" id="productColors" type="text" placeholder="pink, beige, black" />
          </div>
        </div>
        <div class="btn-row">
          <button type="button" id="addProductBtn" class="btn btn-primary">Добавить товар</button>
        </div>
        <div id="productsMessage"></div>
        ${
          state.products.length
            ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Название</th><th>Категория</th><th>Цена</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`
            : '<p class="stub-text">Пока нет товаров — добавьте первый или откройте витрину для стартового набора.</p>'
        }
      </article>
    `;
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
  }

  function bindCategoriesEvents() {
    const input = document.getElementById("newCategoryInput");
    const addBtn = document.getElementById("addCategoryBtn");
    const goBtn = document.getElementById("goToSubcategoriesBtn");
    const section = document.getElementById("sectionContent");

    addBtn.addEventListener("click", function () {
      const name = input.value.trim();
      if (!name) {
        showSectionMessage("categoriesMessage", "msg-error", "Введите название категории");
        return;
      }
      if (state.categories.some((item) => item.toLowerCase() === name.toLowerCase())) {
        showSectionMessage("categoriesMessage", "msg-error", "Категория уже существует");
        return;
      }
      state.categories.push(name);
      persistCategories();
      renderAdmin();
    });

    section.addEventListener("click", function (event) {
      const selectBtn = event.target.closest("[data-category]");
      if (selectBtn) {
        state.selectedCategory = selectBtn.dataset.category;
        persistSelectedCategory();
        renderAdmin();
        return;
      }
      const deleteBtn = event.target.closest("[data-delete-category]");
      if (!deleteBtn) return;
      const category = deleteBtn.dataset.deleteCategory;
      state.categories = state.categories.filter((item) => item !== category);
      delete state.subcategories[category];
      if (state.selectedCategory === category) state.selectedCategory = "";
      persistCategories();
      persistSubcategories();
      persistSelectedCategory();
      renderAdmin();
    });

    if (goBtn) {
      goBtn.addEventListener("click", function () {
        state.currentSection = "subcategories";
        persistCurrentSection();
        renderAdmin();
      });
    }
  }

  function bindSubcategoriesEvents() {
    const select = document.getElementById("subcategoryCategorySelect");
    const input = document.getElementById("newSubcategoryInput");
    const addBtn = document.getElementById("addSubcategoryBtn");

    select.addEventListener("change", function () {
      state.selectedCategory = select.value;
      persistSelectedCategory();
      renderAdmin();
    });

    addBtn.addEventListener("click", function () {
      const category = select.value;
      const subcategory = input.value.trim();
      if (!category) {
        showSectionMessage("subcategoriesMessage", "msg-error", "Выберите категорию");
        return;
      }
      if (!subcategory) {
        showSectionMessage("subcategoriesMessage", "msg-error", "Введите название категории");
        return;
      }
      const bucket = state.subcategories[category] || [];
      if (bucket.some((item) => item.toLowerCase() === subcategory.toLowerCase())) {
        showSectionMessage("subcategoriesMessage", "msg-error", "Категория уже существует");
        return;
      }
      state.subcategories[category] = [...bucket, subcategory];
      persistSubcategories();
      renderAdmin();
    });
  }

  function bindProductsEvents() {
    const addBtn = document.getElementById("addProductBtn");
    const section = document.getElementById("sectionContent");
    if (!addBtn || !section) return;

    addBtn.addEventListener("click", function () {
      const name = document.getElementById("productName").value.trim();
      const cat = document.getElementById("productCat").value.trim();
      const priceRaw = document.getElementById("productPrice").value.trim();
      const desc = document.getElementById("productDesc").value.trim();
      const image = document.getElementById("productImage").value.trim();
      const videoRaw = document.getElementById("productVideo").value.trim();
      const colorsRaw = document.getElementById("productColors").value.trim();

      if (!name) {
        showSectionMessage("productsMessage", "msg-error", "Введите название товара");
        return;
      }
      if (!cat) {
        showSectionMessage("productsMessage", "msg-error", "Выберите категорию");
        return;
      }
      const price = Number(priceRaw);
      if (!Number.isFinite(price) || price < 0) {
        showSectionMessage("productsMessage", "msg-error", "Укажите корректную цену");
        return;
      }
      if (!image) {
        showSectionMessage("productsMessage", "msg-error", "Укажите путь или URL изображения");
        return;
      }

      const colors = colorsRaw
        ? colorsRaw.split(",").map((c) => c.trim()).filter(Boolean)
        : ["#ccc"];
      const draft = {
        name,
        cat,
        price,
        desc,
        image,
        images: [image],
        video: videoRaw || null,
        colors,
      };
      const normalized = normalizeProduct(draft);
      if (!normalized) {
        showSectionMessage("productsMessage", "msg-error", "Не удалось сохранить товар");
        return;
      }
      const dup = state.products.some(
        (p) => p.name.toLowerCase() === normalized.name.toLowerCase() && p.cat === normalized.cat
      );
      if (dup) {
        showSectionMessage("productsMessage", "msg-error", "Товар с таким названием уже есть в этой категории");
        return;
      }
      state.products = [...state.products, normalized];
      persistProducts();
      renderAdmin();
    });

    section.addEventListener("click", function (event) {
      const del = event.target.closest("[data-delete-product-id]");
      if (!del) return;
      const id = del.dataset.deleteProductId;
      state.products = state.products.filter((p) => p.id !== id);
      persistProducts();
      renderAdmin();
    });
  }

  function persistProducts() {
    saveCatalogProducts(state.products);
  }

  function initStorageDefaults() {
    writeIfMissing(STORAGE_KEYS.categories, DEFAULT_CATEGORIES);
    writeIfMissing(STORAGE_KEYS.subcategories, {});
    writeIfMissing(STORAGE_KEYS.selectedCategory, "");
    writeIfMissing(STORAGE_KEYS.settings, {});
    writeIfMissing(STORAGE_KEYS.users, []);
    writeIfMissing(STORAGE_KEYS.stories, []);
    writeIfMissing(STORAGE_KEYS.currentSection, "dashboard");
  }

  function hydrateStateFromStorage() {
    state.isAuth = readAuth();
    state.owner = readObject(STORAGE_KEYS.owner, state.owner);
    state.categories = readArray(STORAGE_KEYS.categories, DEFAULT_CATEGORIES);
    state.subcategories = readObject(STORAGE_KEYS.subcategories, {});
    state.selectedCategory = readString(STORAGE_KEYS.selectedCategory, "");
    state.settings = readObject(STORAGE_KEYS.settings, {});
    state.users = readArray(STORAGE_KEYS.users, []);
    ensureCatalogStorageReady(defaultProductSeed);
    state.products = loadCatalogProducts(defaultProductSeed);
    if (!Array.isArray(state.products)) state.products = [];
    state.stories = readArray(STORAGE_KEYS.stories, []);
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
    localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(state.categories));
  }

  function persistSubcategories() {
    localStorage.setItem(STORAGE_KEYS.subcategories, JSON.stringify(state.subcategories));
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
