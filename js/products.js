/** Каталог: замените image/video на свои файлы в assets/images и assets/videos */
export const products = [
  {
    name: "Платье",
    cat: "Платья",
    price: 4900,
    desc: "Стильное платье",
    colors: ["red", "black", "blue", "green", "yellow", "pink", "gray", "purple"],
    image: "assets/images/dress1.jpg",
    video: "assets/videos/dress1.mp4",
  },
  {
    name: "Костюм спортивный",
    cat: "Костюмы спортивные",
    price: 6500,
    desc: "Комфортный костюм",
    colors: ["black", "gray"],
    image: "assets/images/suit1.jpg",
    video: null,
  },
  {
    name: "Джинсы",
    cat: "Джинсы",
    price: 3500,
    desc: "Классические джинсы",
    colors: ["blue", "black"],
    image: "assets/images/jeans.jpg",
    video: null,
  },
];

export const categories = [
  "Все",
  "Платья",
  "Юбки",
  "Джинсы",
  "Брюки",
  "Костюмы спортивные",
  "Костюмы классические",
  "Пиджаки",
];
