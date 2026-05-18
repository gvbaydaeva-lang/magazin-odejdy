import { products as defaultProducts } from "./products.js";
import {
  STORAGE_KEYS,
  migrateStorage,
  ensureProductsSeed,
  loadProductsForStorefront,
  loadCategoriesForStorefront,
  loadSettings,
  colorToCss,
  getSelectableSizes,
  isStorefrontProduct,
} from "./store.js";

let selectedCat = "Все";
const cart = [];
let catalogProducts = [];
let storeCategories = [];
let storeSettings = {};
let productAfterVideo = null;

const $ = (id) => document.getElementById(id);

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function appendColorBadges(container, colors, options = {}) {
  const { selectable = false, selected = null } = options;
  (colors || []).forEach((colorName) => {
    const el = document.createElement(selectable ? "button" : "span");
    el.className = "color-badge" + (selectable && selected === colorName ? " selected" : "");
    if (selectable) {
      el.type = "button";
      el.dataset.modalColor = colorName;
    }
    const swatch = document.createElement("span");
    swatch.className = "color-swatch";
    swatch.style.background = colorToCss(colorName);
    el.appendChild(swatch);
    el.appendChild(document.createTextNode(colorName));
    container.appendChild(el);
  });
}

function appendSizeBadges(container, sizes, options = {}) {
  const { selectable = false, selected = null } = options;
  (sizes || []).forEach((sizeLabel) => {
    const el = document.createElement(selectable ? "button" : "span");
    if (selectable) {
      el.type = "button";
      el.dataset.modalSize = sizeLabel;
      el.className = selected === sizeLabel ? "selected" : "";
    } else {
      el.className = "size-badge";
    }
    el.textContent = sizeLabel;
    container.appendChild(el);
  });
}

function categoryFiltersFromStorage() {
  if (storeCategories.length) {
    return ["Все", ...storeCategories.slice().sort((a, b) => a.localeCompare(b, "ru"))];
  }
  const set = new Set();
  catalogProducts.forEach((p) => {
    if (p.cat) set.add(p.cat);
  });
  return ["Все", ...Array.from(set).sort((a, b) => a.localeCompare(b, "ru"))];
}

function applyStoreSettings() {
  const nameEl = $("storeName");
  const taglineEl = $("storeTagline");
  if (nameEl && storeSettings.storeName) nameEl.textContent = storeSettings.storeName;
  if (taglineEl && storeSettings.tagline) taglineEl.textContent = storeSettings.tagline;
  document.title = storeSettings.storeName || "Fashion Store";
}

function renderCategories() {
  const container = $("categories");
  container.innerHTML = "";
  const chips = categoryFiltersFromStorage();
  chips.forEach((c) => {
    const b = document.createElement("button");
    b.textContent = c;
    if (c === selectedCat) b.classList.add("active");
    b.addEventListener("click", () => {
      selectedCat = c;
      renderCategories();
      renderProducts();
    });
    container.appendChild(b);
  });
}

function visibleCategorySet() {
  return new Set(storeCategories);
}

function isProductVisibleOnStorefront(product) {
  const cat = product && product.cat ? String(product.cat).trim() : "";
  if (!cat) return false;
  if (storeCategories.length) return visibleCategorySet().has(cat);
  return true;
}

function renderProducts() {
  const container = $("products");
  container.innerHTML = "";

  catalogProducts
    .filter((p) => isStorefrontProduct(p))
    .filter((p) => isProductVisibleOnStorefront(p))
    .filter((p) => selectedCat === "Все" || p.cat === selectedCat)
    .forEach((p) => {
      const div = document.createElement("div");
      div.className = "product";

      const imgWrap = document.createElement("div");
      imgWrap.className = "product-image";
      const img = document.createElement("img");
      img.src = p.image;
      img.alt = p.name;
      imgWrap.appendChild(img);
      if (p.video) {
        const play = document.createElement("div");
        play.className = "play-icon";
        play.textContent = "▶";
        imgWrap.appendChild(play);
      }
      imgWrap.addEventListener("click", (e) => {
        e.stopPropagation();
        if (p.video) {
          openVideoModal(p.video, p);
          return;
        }
        openProductModal(p);
      });

      const title = document.createElement("h4");
      title.textContent = p.name;

      const meta = document.createElement("div");
      meta.className = "product-meta";
      meta.textContent = p.subcat ? `${p.cat} · ${p.subcat}` : p.cat;

      const price = document.createElement("div");
      price.textContent = `${p.price} ₽`;

      const colors = document.createElement("div");
      colors.className = "product-colors";
      appendColorBadges(colors, p.colors);

      const sizesRow = document.createElement("div");
      sizesRow.className = "product-sizes";
      appendSizeBadges(sizesRow, p.sizes);

      div.appendChild(imgWrap);
      div.appendChild(title);
      div.appendChild(meta);
      div.appendChild(price);
      if (p.colors && p.colors.length) div.appendChild(colors);
      if (p.sizes && p.sizes.length) div.appendChild(sizesRow);

      div.addEventListener("click", (e) => {
        if (e.target.closest(".product-image")) return;
        openProductModal(p);
      });

      container.appendChild(div);
    });
}

function openVideoModal(video, product = null) {
  if (!video) return;
  productAfterVideo = product;
  const box = $("videoBox");
  box.innerHTML = "";
  const v = document.createElement("video");
  v.setAttribute("autoplay", "");
  v.setAttribute("muted", "");
  v.setAttribute("loop", "");
  v.setAttribute("playsinline", "");
  v.setAttribute("controls", "");
  v.style.width = "100%";
  if (String(video).startsWith("data:")) {
    v.src = video;
  } else {
    const source = document.createElement("source");
    source.src = video;
    source.type = "video/mp4";
    v.appendChild(source);
  }
  box.appendChild(v);
  $("videoModal").style.display = "flex";
}

function closeVideoModal() {
  $("videoModal").style.display = "none";
  $("videoBox").innerHTML = "";
  if (productAfterVideo) {
    const product = productAfterVideo;
    productAfterVideo = null;
    openProductModal(product);
  }
}

function renderCart() {
  let total = 0;
  const div = $("cartItems");
  div.innerHTML = "";

  cart.forEach((i, idx) => {
    total += i.price;
    const el = document.createElement("div");
    const sub = i.subcat ? `, ${i.subcat}` : "";
    el.innerHTML = `${escapeHtml(i.name)} (${escapeHtml(i.cat)}${escapeHtml(sub)}, ${escapeHtml(
      i.size
    )}, ${escapeHtml(i.color)}) - ${i.price} ₽ `;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "❌";
    btn.dataset.removeIndex = String(idx);
    el.appendChild(btn);
    div.appendChild(el);
  });

  $("total").textContent = String(total);
}

function generateOrderPayload() {
  let t = "Заказ:\n";
  cart.forEach((i) => {
    const sub = i.subcat ? `, ${i.subcat}` : "";
    t += `${i.name} (${i.cat}${sub}, ${i.size}, ${i.color}) - ${i.price}₽\n`;
  });
  t += `\nИтого: ${$("total").textContent}₽\n`;
  t += $("action").value === "order" ? "Оформить заказ\n" : "Вопрос\n";
  t += "Комментарий: " + $("comment").value;
  if (storeSettings.phone) t += `\nТелефон: ${storeSettings.phone}`;
  if (storeSettings.address) t += `\nАдрес: ${storeSettings.address}`;
  return t;
}

function sendTelegram() {
  const username = (storeSettings.telegram || "USERNAME").replace(/^@/, "");
  const text = encodeURIComponent(generateOrderPayload());
  window.open(`https://t.me/${username}?text=${text}`);
}

async function copyOrder() {
  const text = generateOrderPayload();
  const maxContact = storeSettings.max || "";
  try {
    await navigator.clipboard.writeText(text + (maxContact ? `\n\nMAX: ${maxContact}` : ""));
    alert(maxContact ? "Скопировано. Отправьте в MAX" : "Скопировано. Отправьте в MAX");
  } catch {
    alert("Не удалось скопировать в буфер обмена");
  }
}

function openProductModal(p) {
  const modal = $("modal");
  const content = $("modalContent");
  let size = null;
  let color = null;
  const gallery = Array.isArray(p.images) && p.images.length ? p.images : [p.image];
  let activeImage = gallery[0];
  const sizes = getSelectableSizes(p);
  const colors = Array.isArray(p.colors) ? p.colors : [];

  function renderModal() {
    const subLine = p.subcat
      ? `<p class="product-meta-modal">Категория: ${escapeHtml(p.cat)} · Подкатегория: ${escapeHtml(p.subcat)}</p>`
      : `<p class="product-meta-modal">Категория: ${escapeHtml(p.cat)}</p>`;

    content.innerHTML = `
      <h3>${escapeHtml(p.name)}</h3>
      <p>${escapeHtml(p.desc)}</p>
      ${subLine}
      <b>${p.price} ₽</b>
      <div class="modal-media">
        <img class="modal-main-image" src="${escapeHtml(activeImage)}" alt="${escapeHtml(p.name)}">
        ${
          p.video
            ? '<button type="button" class="media-btn" data-action="watch-video">Смотреть видео</button>'
            : ""
        }
        <div class="modal-gallery" id="modalGallery"></div>
      </div>
      <div>
        <b>Цвет:</b>
        <div class="colors" id="modalColors"></div>
      </div>
      <div>
        <b>Размер:</b>
        <div class="sizes" id="modalSizes"></div>
      </div>
      <button type="button" class="add-btn" data-action="add">Добавить</button>
      <button type="button" data-action="close">Закрыть</button>
    `;

    const colorsEl = content.querySelector("#modalColors");
    colorsEl.className = "product-colors modal-colors";
    appendColorBadges(colorsEl, colors, { selectable: true, selected: color });

    const sizesEl = content.querySelector("#modalSizes");
    sizesEl.className = "sizes product-sizes-modal";
    appendSizeBadges(sizesEl, sizes, { selectable: true, selected: size });

    const galleryEl = content.querySelector("#modalGallery");
    gallery.forEach((imgSrc) => {
      const thumb = document.createElement("img");
      thumb.src = imgSrc;
      thumb.alt = `${p.name} preview`;
      thumb.className = "modal-thumb" + (imgSrc === activeImage ? " selected" : "");
      thumb.dataset.modalImage = imgSrc;
      galleryEl.appendChild(thumb);
    });
  }

  content.onclick = (e) => {
    const target = e.target;
    const colorBtn = target.closest("[data-modal-color]");
    if (colorBtn) {
      color = colorBtn.dataset.modalColor;
      renderModal();
      return;
    }
    const sizeBtn = target.closest("[data-modal-size]");
    if (sizeBtn) {
      size = sizeBtn.dataset.modalSize;
      renderModal();
      return;
    }
    if (target.dataset.modalImage !== undefined) {
      activeImage = target.dataset.modalImage;
      renderModal();
      return;
    }
    if (target.dataset.action === "watch-video" && p.video) {
      modal.style.display = "none";
      openVideoModal(p.video, p);
      return;
    }
    if (target.dataset.action === "close") {
      modal.style.display = "none";
      content.onclick = null;
      return;
    }
    if (target.dataset.action === "add") {
      if (sizes.length && !size) {
        alert("Выберите размер");
        return;
      }
      if (colors.length && !color) {
        alert("Выберите цвет");
        return;
      }
      cart.push({ ...p, size, color });
      renderCart();
      modal.style.display = "none";
      content.onclick = null;
    }
  };

  renderModal();
  modal.style.display = "flex";
}

function reloadCatalogFromStorage() {
  migrateStorage();
  ensureProductsSeed(defaultProducts);
  storeSettings = loadSettings();
  storeCategories = loadCategoriesForStorefront([]);
  catalogProducts = loadProductsForStorefront(defaultProducts);
  applyStoreSettings();
  if (!categoryFiltersFromStorage().includes(selectedCat)) {
    selectedCat = "Все";
  }
  renderCategories();
  renderProducts();
}

function init() {
  reloadCatalogFromStorage();
  renderCart();

  const storageKeys = Object.values(STORAGE_KEYS);
  window.addEventListener("storage", (e) => {
    if (storageKeys.includes(e.key)) {
      reloadCatalogFromStorage();
      renderCart();
    }
  });

  $("videoModal").querySelector(".close").addEventListener("click", closeVideoModal);

  $("cartItems").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove-index]");
    if (!btn) return;
    const idx = Number(btn.dataset.removeIndex);
    if (!Number.isNaN(idx)) {
      cart.splice(idx, 1);
      renderCart();
    }
  });

  document.getElementById("sendTelegram").addEventListener("click", sendTelegram);
  document.getElementById("copyOrder").addEventListener("click", copyOrder);
}

init();
