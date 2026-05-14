/** Стартовый каталог (сид). Живая витрина читает копию из localStorage — см. js/catalog.js */
export const products = [
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
