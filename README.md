# Fashion Store

Прототип веб-витрины магазина одежды: категории, карточки товаров, модальное окно с выбором цвета и размера, просмотр видео по товару, корзина, отправка текста заказа в Telegram и копирование для MAX. Админ-панель для управления каталогом через `localStorage`.

## Структура проекта

```
├── index.html           # витрина
├── admin/
│   ├── index.html       # админ-панель
│   ├── admin.js
│   ├── admin.css
│   └── catalog-bridge.js
├── css/
│   └── styles.css
├── js/
│   ├── app.js           # логика витрины (ES-модули)
│   ├── store.js         # localStorage
│   ├── products.js      # стартовый каталог
│   ├── site-base.js     # базовый URL для GitHub Pages
│   └── config.js
├── package.json
└── README.md
```

## GitHub Pages Demo

После публикации репозитория на GitHub Pages (ветка `main`, папка `/`):

| | URL |
|---|---|
| **Витрина** | https://gvbaydaeva-lang.github.io/magazin-odejdy/ |
| **Админка** | https://gvbaydaeva-lang.github.io/magazin-odejdy/admin/ |

На витрине есть кнопка **Admin** (правый верхний угол) — переход в `./admin/`.

### Как открыть админку

1. Откройте витрину по ссылке выше.
2. Нажмите **Admin** или перейдите напрямую на `/admin/`.
3. Войдите (данные входа задаются при первом запуске в `localStorage`).

### localStorage

Витрина и админка на **одном домене** GitHub Pages используют общие ключи:

- `fashion_categories`
- `fashion_subcategories`
- `fashion_products`
- `fashion_settings`
- `fashion_stories`

Данные сохраняются **только в браузере** на этом устройстве. Другой браузер или режим инкогнито — отдельное хранилище. Очистка данных сайта удалит каталог.

### Почему нужен `site-base.js`

GitHub Pages отдаёт сайт из подпапки `/magazin-odejdy/`, а не с корня домена. Без корректного базового URL относительные пути к CSS/JS могут указывать на `https://username.github.io/css/...` вместо `https://username.github.io/magazin-odejdy/css/...`. Скрипт `js/site-base.js` выставляет `<base href>` автоматически.

## Запуск локально

ES-модули не открываются с диска через `file://` — нужен локальный сервер:

```bash
npm install
npm start
```

Откройте в браузере указанный адрес (обычно `http://localhost:3000`).

Без установки зависимостей:

```bash
npx serve . -l 3000
```

Локально пути `./css/`, `./js/`, `./admin/` работают так же, как на GitHub Pages.

## Настройка

1. **Telegram:** в файле `js/config.js` замените `TELEGRAM_USERNAME` на ваш логин без символа `@` (или через админку → Настройки).
2. **Каталог:** правьте товары в админке; стартовый сид — `js/products.js`.
3. **Медиа:** фото/видео загружаются в админке как base64 в `localStorage`, либо укажите относительные пути к файлам в корне проекта.

## Публикация на GitHub Pages

1. Залейте репозиторий на GitHub.
2. **Settings → Pages → Build and deployment → Source:** Deploy from a branch.
3. Branch: `main`, folder: `/ (root)`.
4. Дождитесь деплоя и откройте ссылку из Settings → Pages.

В корне есть файл `.nojekyll`, чтобы GitHub не обрабатывал проект через Jekyll и не ломал пути.

## Репозиторий Git

```bash
git add .
git commit -m "Fix paths for GitHub Pages"
git push
```
