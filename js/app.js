import { products, categories } from "./products.js";
import { TELEGRAM_USERNAME } from "./config.js";

let selectedCat = "Все";
const cart = [];
let productAfterVideo = null;

const $ = (id) => document.getElementById(id);

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function renderCategories() {
  const container = $("categories");
  container.innerHTML = "";
  categories.forEach((c) => {
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

function renderProducts() {
  const container = $("products");
  container.innerHTML = "";

  products
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

      const price = document.createElement("div");
      price.textContent = `${p.price} ₽`;

      const colors = document.createElement("div");
      colors.className = "colors";
      p.colors.forEach((c) => {
        const dot = document.createElement("div");
        dot.className = "color";
        dot.style.background = c;
        colors.appendChild(dot);
      });

      div.appendChild(imgWrap);
      div.appendChild(title);
      div.appendChild(price);
      div.appendChild(colors);

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
  const source = document.createElement("source");
  source.src = video;
  source.type = "video/mp4";
  v.appendChild(source);
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
    el.innerHTML = `${escapeHtml(i.name)} (${escapeHtml(i.size)}, ${escapeHtml(
      i.color
    )}) - ${i.price} ₽ `;
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
    t += `${i.name} (${i.size}, ${i.color}) - ${i.price}₽\n`;
  });
  t += `\nИтого: ${$("total").textContent}₽\n`;
  t += $("action").value === "order" ? "Оформить заказ\n" : "Вопрос\n";
  t += "Комментарий: " + $("comment").value;
  return t;
}

function sendTelegram() {
  const text = encodeURIComponent(generateOrderPayload());
  window.open(`https://t.me/${TELEGRAM_USERNAME}?text=${text}`);
}

async function copyOrder() {
  const text = generateOrderPayload();
  try {
    await navigator.clipboard.writeText(text);
    alert("Скопировано. Отправьте в MAX");
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

  function renderModal() {
    content.innerHTML = `
      <h3>${escapeHtml(p.name)}</h3>
      <p>${escapeHtml(p.desc)}</p>
      <b>${p.price} ₽</b>
      <div class="modal-media">
        <img class="modal-main-image" src="${escapeHtml(activeImage)}" alt="${escapeHtml(
      p.name
    )}">
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
    p.colors.forEach((c) => {
      const sw = document.createElement("div");
      sw.className = "modal-color" + (color === c ? " selected" : "");
      sw.style.background = c;
      sw.dataset.modalColor = c;
      sw.setAttribute("role", "button");
      sw.tabIndex = 0;
      colorsEl.appendChild(sw);
    });

    const sizesEl = content.querySelector("#modalSizes");
    ["S", "M", "L"].forEach((s) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = size === s ? "selected" : "";
      btn.dataset.modalSize = s;
      btn.textContent = s;
      sizesEl.appendChild(btn);
    });

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
    if (target.dataset.modalColor !== undefined) {
      color = target.dataset.modalColor;
      renderModal();
      return;
    }
    if (target.dataset.modalSize !== undefined) {
      size = target.dataset.modalSize;
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
      if (!size || !color) {
        alert("Выберите размер и цвет");
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

function init() {
  renderCategories();
  renderProducts();
  renderCart();

  $("videoModal")
    .querySelector(".close")
    .addEventListener("click", closeVideoModal);

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
