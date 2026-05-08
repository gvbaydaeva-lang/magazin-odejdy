// Первый этап админки: только каркас UI и переключение экранов без backend.
(function () {
  const app = document.getElementById("app");
  const STORAGE_KEYS = {
    categories: "fashionStoreAdminCategories",
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

  // Простое состояние приложения.
  const state = {
    isAuth: false,
    authMode: "login", // login | register
    currentSection: "dashboard",
    owner: {
      name: "Владелец",
      email: "owner@example.com",
      phone: "+7",
    },
  };

  // Инициализируем категории только если пользовательские данные еще не созданы.
  initCategoriesStorage();

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

  function render() {
    if (!state.isAuth) {
      renderAuth();
      return;
    }
    renderAdmin();
  }

  function renderAuth(message = null) {
    const isLogin = state.authMode === "login";

    app.innerHTML = `
      <div class="page-wrap">
        <section class="auth-card">
          <header class="auth-head">
            <h1>${isLogin ? "Вход в админ-панель" : "Регистрация владельца"}</h1>
            <p>
              ${
                isLogin
                  ? "В будущем вход будет подтверждаться через электронную почту."
                  : "Создайте аккаунт владельца для управления магазином."
              }
            </p>
          </header>

          ${isLogin ? loginFormTemplate() : registerFormTemplate()}

          ${
            message
              ? `<div class="msg ${message.type === "error" ? "msg-error" : message.type === "success" ? "msg-success" : "msg-info"}">${message.text}</div>`
              : ""
          }
        </section>
      </div>
    `;

    if (isLogin) {
      bindLoginEvents();
    } else {
      bindRegisterEvents();
    }
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
        renderAuth({ type: "error", text: "Заполните email и пароль." });
        return;
      }

      // MVP-логика: считаем вход успешным без backend.
      state.owner.email = email;
      state.isAuth = true;
      state.currentSection = "dashboard";
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
        renderAuth({ type: "error", text: "Заполните все поля регистрации." });
        return;
      }

      if (password.length < 6) {
        renderAuth({ type: "error", text: "Пароль должен содержать минимум 6 символов." });
        return;
      }

      if (password !== passwordRepeat) {
        renderAuth({ type: "error", text: "Пароли не совпадают." });
        return;
      }

      if (!agreePolicy) {
        renderAuth({
          type: "error",
          text: "Для регистрации нужно согласиться на обработку персональных данных.",
        });
        return;
      }

      // MVP: сохраняем данные владельца в состоянии и автоматически авторизуем.
      state.owner = { name, email, phone };
      state.isAuth = true;
      state.currentSection = "dashboard";
      render();

      showInlineNotice(
        "На вашу почту отправлено письмо для подтверждения. В MVP-версии вход выполнен автоматически.",
        "success"
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
              <button
                type="button"
                class="nav-btn ${state.currentSection === section.id ? "active" : ""}"
                data-section="${section.id}"
              >
                ${section.title}
              </button>
            `
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

          <section id="sectionContent">
            ${renderSectionContent(state.currentSection)}
          </section>
        </main>
      </div>
    `;

    bindAdminEvents();
  }

  function renderSectionContent(sectionId) {
    if (sectionId === "dashboard") {
      return `
        <div class="panel-grid">
          <article class="stat-card">
            <div class="stat-title">Товаров</div>
            <div class="stat-value">0</div>
          </article>
          <article class="stat-card">
            <div class="stat-title">Заказов сегодня</div>
            <div class="stat-value">0</div>
          </article>
          <article class="stat-card">
            <div class="stat-title">Активных stories</div>
            <div class="stat-value">0</div>
          </article>
          <article class="stat-card">
            <div class="stat-title">Пользователей</div>
            <div class="stat-value">1</div>
          </article>
        </div>
      `;
    }

    if (sectionId === "categories") {
      const categories = getCategoriesFromStorage();
      return `
        <article class="stub-card">
          <h3 class="stub-title">Категории</h3>
          <p class="stub-text">Стартовый универсальный список категорий (${categories.length})</p>
          <ul class="stub-text">
            ${categories.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </article>
      `;
    }

    const sectionMap = {
      products: "Раздел товаров будет добавлен на следующем этапе",
      subcategories: "Раздел подкатегорий будет добавлен на следующем этапе",
      orders: "Раздел заказов будет добавлен на следующем этапе",
      stories: "Раздел stories будет добавлен на следующем этапе",
      users: "Раздел пользователей будет добавлен на следующем этапе",
      settings: "Раздел настроек будет добавлен на следующем этапе",
    };

    return `
      <article class="stub-card">
        <h3 class="stub-title">${getSectionTitle(sectionId)}</h3>
        <p class="stub-text">${sectionMap[sectionId] || "Раздел будет добавлен на следующем этапе"}</p>
      </article>
    `;
  }

  function bindAdminEvents() {
    const nav = document.getElementById("adminNav");
    const logoutBtn = document.getElementById("logoutBtn");

    nav.addEventListener("click", function (event) {
      const btn = event.target.closest("[data-section]");
      if (!btn) return;
      state.currentSection = btn.dataset.section;
      renderAdmin();
    });

    logoutBtn.addEventListener("click", function () {
      state.isAuth = false;
      state.authMode = "login";
      renderAuth({ type: "info", text: "Вы вышли из админ-панели." });
    });
  }

  function getSectionTitle(sectionId) {
    const section = sections.find((item) => item.id === sectionId);
    return section ? section.title : "Раздел";
  }

  function showInlineNotice(text, type) {
    const sectionContent = document.getElementById("sectionContent");
    if (!sectionContent) return;

    const notice = document.createElement("div");
    notice.className = `msg ${type === "success" ? "msg-success" : "msg-info"}`;
    notice.style.marginBottom = "12px";
    notice.textContent = text;
    sectionContent.prepend(notice);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function initCategoriesStorage() {
    const raw = localStorage.getItem(STORAGE_KEYS.categories);
    if (raw !== null) {
      return;
    }
    localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(DEFAULT_CATEGORIES));
  }

  function getCategoriesFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.categories);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      return DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  }

  render();
})();
