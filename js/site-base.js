/**
 * Базовый URL для GitHub Pages (проект в подпапке /repository-name/).
 * Подключается первым в <head> до CSS и скриптов.
 */
(function () {
  var path = window.location.pathname;
  var base;
  if (path.endsWith("/")) {
    base = path;
  } else if (/\.[a-zA-Z0-9]+$/.test((path.split("/").pop() || ""))) {
    base = path.slice(0, path.lastIndexOf("/") + 1);
  } else {
    base = path + "/";
  }
  var el = document.createElement("base");
  el.href = base;
  document.head.prepend(el);
})();
