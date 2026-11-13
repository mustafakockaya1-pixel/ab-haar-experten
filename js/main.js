// Kleine Helfer für die Website – nichts davon ist zwingend nötig.
(function () {
  // Menü auf dem Handy öffnen und schließen
  var btn = document.querySelector("[data-menu-btn]");
  var nav = document.getElementById("nav");
  if (btn && nav) {
    var setOpen = function (open) {
      btn.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
    };
    btn.addEventListener("click", function () {
      setOpen(btn.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
  }

  // Feine Linie unter der Kopfzeile, sobald man nach unten scrollt
  var header = document.querySelector("[data-header]");
  if (header) {
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 8); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // Anruf-Knopf auf dem Handy erst nach dem Startbild einblenden
  var bar = document.querySelector("[data-call-bar]");
  var hero = document.querySelector(".hero");
  if (bar && hero && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      bar.classList.toggle("is-visible", !entries[0].isIntersecting);
    }).observe(hero);
  } else if (bar) {
    bar.classList.add("is-visible");
  }

  // Aktuelles Jahr in der Fußzeile
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
