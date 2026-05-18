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
    editingSubcategory: null,
    editingProductId: null,
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
        return (
          '<option value="' +
          escapeHtml(cat) +
          '"' +
          (formCategory === cat ? " selected" : "") +
          ">" +
          escapeHtml(cat) +
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

  function renderProductsSection() {
    var editing = state.editingProductId
      ? state.products.find(function (p) {
          return p.id === state.editingProductId;
        })
      : null;
    var formCat = editing ? editing.cat : "";
    var formSub = editing ? editing.subcat || "" : "";
    var catOptions = state.categories
      .map(function (c) {
        var sel = formCat === c ? " selected" : "";
        return '<option value="' + escapeHtml(c) + '"' + sel + ">" + escapeHtml(c) + "</option>";
      })
      .join("");
    var subOptions = buildSubcategoryOptionsHtml(formCat, formSub);
    var subHint = !formCat
      ? ""
      : !(state.subcategories[formCat] || []).length
        ? "У этой категории пока нет подкатегорий"
        : "";
    var rows = state.products
      .map(function (p) {
        return (
          "<tr>" +
          "<td>" + escapeHtml(p.name) + "</td>" +
          "<td>" + escapeHtml(p.cat) + "</td>" +
          "<td>" + escapeHtml(p.subcat || "—") + "</td>" +
          "<td>" + escapeHtml(String(p.price)) + "</td>" +
          '<td><button type="button" class="btn btn-ghost btn-sm" data-edit-product-id="' +
          escapeHtml(p.id) +
          '">Редактировать</button> ' +
          '<button type="button" class="btn btn-ghost btn-sm" data-delete-product-id="' +
          escapeHtml(p.id) +
          '">Удалить</button></td></tr>'
        );
      })
      .join("");

    return (
      '<article class="stub-card">' +
      '<h3 class="stub-title">Товары</h3>' +
      '<p class="stub-text">Общий каталог с витриной (ключ: <code>fashion_products</code>).</p>' +
      '<div class="product-form-grid">' +
      '<div class="field"><label class="label" for="productName">Название</label>' +
      '<input class="input" id="productName" type="text" value="' + escapeHtml(editing ? editing.name : "") + '" placeholder="Например, Платье миди" /></div>' +
      '<div class="field"><label class="label" for="productCat">Категория</label>' +
      '<select class="input" id="productCat"><option value="">Выберите категорию</option>' + catOptions + '</select></div>' +
      '<div class="field"><label class="label" for="productSubcat">Подкатегория</label>' +
      '<select class="input" id="productSubcat" ' + (!formCat ? "disabled" : "") + '>' + subOptions + '</select>' +
      '<p class="stub-text" id="productSubcatHint">' + escapeHtml(subHint) + '</p></div>' +
      '<div class="field"><label class="label" for="productPrice">Цена (₽)</label>' +
      '<input class="input" id="productPrice" type="number" min="0" step="1" value="' + escapeHtml(editing ? String(editing.price) : "") + '" placeholder="4900" /></div>' +
      '<div class="field field-span-2"><label class="label" for="productDesc">Описание</label>' +
      '<input class="input" id="productDesc" type="text" value="' + escapeHtml(editing ? editing.desc : "") + '" placeholder="Краткое описание" /></div>' +
      '<div class="field"><label class="label" for="productImage">Фото (URL или путь)</label>' +
      '<input class="input" id="productImage" type="text" value="' + escapeHtml(editing ? editing.image : "") + '" placeholder="images/item.jpg" /></div>' +
      '<div class="field"><label class="label" for="productVideo">Видео (необязательно)</label>' +
      '<input class="input" id="productVideo" type="text" value="' + escapeHtml(editing && editing.video ? editing.video : "") + '" placeholder="videos/item.mp4" /></div>' +
      '<div class="field field-span-2"><label class="label" for="productColors">Цвета (через запятую)</label>' +
      '<input class="input" id="productColors" type="text" value="' + escapeHtml(editing ? (editing.colors || []).join(", ") : "") + '" placeholder="pink, beige, black" /></div>' +
      '<div class="field field-span-2"><label class="label" for="productSizes">Размеры (через запятую)</label>' +
      '<input class="input" id="productSizes" type="text" value="' + escapeHtml(editing ? (editing.sizes || []).join(", ") : "S, M, L") + '" placeholder="S, M, L" /></div>' +
      '</div>' +
      '<div class="btn-row">' +
      '<button type="button" id="addProductBtn" class="btn btn-primary">' + (editing ? "Сохранить изменения" : "Добавить товар") + '</button>' +
      (editing ? '<button type="button" id="cancelProductEdit" class="btn btn-ghost">Отмена</button>' : "") +
      '</div>' +
      '<div id="productsMessage"></div>' +
      (state.products.length
        ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>Название</th><th>Категория</th><th>Подкатегория</th><th>Цена</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        : '<p class="stub-text">Пока нет товаров — добавьте первый или откройте витрину для стартового набора.</p>') +
      '</article>'
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
      var hadOrphanProducts = false;
      state.products = state.products.map(function (p) {
        if (p.cat === category) {
          hadOrphanProducts = true;
          return normalizeProduct(Object.assign({}, p, { cat: "Без категории", subcat: "" }));
        }
        return p;
      });
      if (hadOrphanProducts && state.categories.indexOf("Без категории") === -1) {
        state.categories.push("Без категории");
      }
      if (state.selectedCategory === category) state.selectedCategory = "";
      persistCategories();
      persistProducts();
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
    var addBtn = document.getElementById("addProductBtn");
    var cancelBtn = document.getElementById("cancelProductEdit");
    var catSelect = document.getElementById("productCat");
    var section = document.getElementById("sectionContent");
    if (!addBtn || !section) return;

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
        state.editingProductId = null;
        renderAdmin();
      });
    }

    addBtn.addEventListener("click", function () {
      var name = document.getElementById("productName").value.trim();
      var cat = document.getElementById("productCat").value.trim();
      var subcat = document.getElementById("productSubcat").value.trim();
      var priceRaw = document.getElementById("productPrice").value.trim();
      var desc = document.getElementById("productDesc").value.trim();
      var image = document.getElementById("productImage").value.trim();
      var videoRaw = document.getElementById("productVideo").value.trim();
      var colorsRaw = document.getElementById("productColors").value.trim();
      var sizesRaw = document.getElementById("productSizes").value.trim();

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
      if (!image) {
        showSectionMessage("productsMessage", "msg-error", "Укажите путь или URL изображения");
        return;
      }

      var colors = colorsRaw ? colorsRaw.split(",").map(function (c) { return c.trim(); }).filter(Boolean) : ["#ccc"];
      var sizes = sizesRaw ? sizesRaw.split(",").map(function (x) { return x.trim(); }).filter(Boolean) : ["S", "M", "L"];
      var draft = {
        name: name,
        cat: cat,
        subcat: subcat,
        price: price,
        desc: desc,
        image: image,
        images: [image],
        video: videoRaw || null,
        colors: colors,
        sizes: sizes,
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
        state.editingProductId = null;
        persistProducts();
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
      persistProducts();
      renderAdmin();
    });

    section.addEventListener("click", function (event) {
      var editBtn = event.target.closest("[data-edit-product-id]");
      if (editBtn) {
        state.editingProductId = editBtn.dataset.editProductId;
        renderAdmin();
        return;
      }
      var del = event.target.closest("[data-delete-product-id]");
      if (!del) return;
      var id = del.dataset.deleteProductId;
      if (state.editingProductId === id) state.editingProductId = null;
      state.products = state.products.filter(function (p) { return p.id !== id; });
      persistProducts();
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
    writeIfMissing(STORAGE_KEYS.categories, DEFAULT_CATEGORIES);
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
    Store.saveCategories(state.categories);
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
