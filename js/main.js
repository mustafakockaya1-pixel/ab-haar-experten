// Kleine Helfer für die Website.
// Alles hier ist eine Verbesserung – ohne JavaScript funktioniert die Seite trotzdem.
(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

  // ---------- Menü auf dem Handy ----------
  var menuBtn = document.querySelector("[data-menu-btn]");
  var nav = document.getElementById("nav");
  if (menuBtn && nav) {
    var setOpen = function (open) {
      menuBtn.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
    };
    menuBtn.addEventListener("click", function () {
      setOpen(menuBtn.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
  }

  // ---------- Linie unter der Kopfzeile beim Scrollen ----------
  var header = document.querySelector("[data-header]");
  if (header) {
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 8); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // ---------- Anruf-Knopf auf dem Handy erst nach dem Startbild ----------
  var bar = document.querySelector("[data-call-bar]");
  var hero = document.querySelector(".hero");
  if (bar && hero && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      bar.classList.toggle("is-visible", !entries[0].isIntersecting);
    }).observe(hero);
  } else if (bar) {
    bar.classList.add("is-visible");
  }

  // ---------- Aktuelles Jahr in der Fußzeile ----------
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  // =========================================================
  // GROSSANSICHT DER FOTOS
  // Das Foto wächst beim Klicken aus seiner Position heraus
  // und schrumpft beim Schließen wieder dorthin zurück.
  // =========================================================
  var items = window.GALERIE || [];
  var dialog = document.querySelector("[data-lightbox]");
  if (!dialog || !items.length || typeof dialog.showModal !== "function") return;

  var img = dialog.querySelector("[data-lb-img]");
  var bg = dialog.querySelector("[data-lb-bg]");
  var caption = dialog.querySelector("[data-lb-caption]");
  var indexEl = dialog.querySelector("[data-lb-index]");
  var chrome = Array.prototype.slice.call(
    dialog.querySelectorAll("[data-lb-bar], [data-lb-close], [data-lb-prev], [data-lb-next]")
  );
  dialog.querySelector("[data-lb-total]").textContent = items.length;

  var current = 0;
  var busy = false;
  var cache = {};

  function preload(i) {
    var item = items[(i + items.length) % items.length];
    if (!cache[item.src]) {
      var im = new Image();
      im.src = item.src;
      cache[item.src] = im;
    }
    return cache[item.src];
  }

  function sourceFor(i) {
    return document.querySelector('.zoom[data-zoom="' + i + '"]');
  }

  // Wo und wie groß das Foto in der Großansicht steht
  function targetRect(i) {
    var it = items[i];
    var vw = window.innerWidth, vh = window.innerHeight;
    var small = vw < 760;
    var maxW = small ? vw - 24 : vw - 220;
    var maxH = small ? vh - 210 : vh - 150;
    var s = Math.min(maxW / it.w, maxH / it.h);
    var w = Math.round(it.w * s), h = Math.round(it.h * s);
    return { left: Math.round((vw - w) / 2), top: Math.round((vh - h) / 2 - (small ? 40 : 10)), width: w, height: h };
  }

  function place(i) {
    var r = targetRect(i);
    img.style.left = r.left + "px";
    img.style.top = r.top + "px";
    img.style.width = r.width + "px";
    img.style.height = r.height + "px";
    img.alt = items[i].alt || "";
    caption.textContent = items[i].text;
    indexEl.textContent = i + 1;
    return r;
  }

  // Berechnet, wie das große Foto aussehen muss, damit es exakt
  // auf dem kleinen (zugeschnittenen) Vorschaubild liegt.
  function flipFrom(source, r) {
    var t = source.getBoundingClientRect();
    var thumb = source.querySelector("img");
    var pos = getComputedStyle(thumb).objectPosition.split(" ").map(function (v) {
      return v.indexOf("%") > -1 ? parseFloat(v) / 100 : 0.5;
    });
    var s = Math.max(t.width / r.width, t.height / r.height);
    var exX = r.width - t.width / s, exY = r.height - t.height / s;
    var left = exX * pos[0], right = exX - left;
    var top = exY * (pos[1] === undefined ? 0.5 : pos[1]), bottom = exY - top;
    var offX = (left - right) / 2, offY = (top - bottom) / 2;
    var dx = t.left + t.width / 2 - (r.left + r.width / 2) - offX * s;
    var dy = t.top + t.height / 2 - (r.top + r.height / 2) - offY * s;
    return {
      transform: "translate(" + dx + "px," + dy + "px) scale(" + s + ")",
      clipPath: "inset(" + top + "px " + right + "px " + bottom + "px " + left + "px round " + 6 / s + "px)"
    };
  }

  function inView(el) {
    var b = el.getBoundingClientRect();
    return b.bottom > 0 && b.top < window.innerHeight && b.width > 0;
  }

  function fadeChrome(show, delay) {
    chrome.forEach(function (el) {
      el.animate([{ opacity: show ? 0 : 1 }, { opacity: show ? 1 : 0 }],
        { duration: show ? 300 : 150, delay: delay || 0, fill: "both", easing: "ease" });
    });
  }

  function open(i, source) {
    if (busy) return;
    busy = true;
    current = i;
    var thumb = source && source.querySelector("img");
    img.src = thumb && thumb.currentSrc ? thumb.currentSrc : items[i].src;
    var r = place(i);
    var big = preload(i);
    preload(i + 1); preload(i - 1);

    document.documentElement.style.overflow = "hidden";
    dialog.showModal();

    var done = function () {
      if (source) source.classList.remove("is-source");
      var swap = function () { if (current === i) img.src = items[i].src; };
      if (big.complete) swap(); else big.onload = swap;
      busy = false;
    };

    if (reduceMotion || !source) {
      dialog.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease" }).onfinish = done;
      return;
    }
    source.classList.add("is-source");
    bg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, easing: "ease" });
    fadeChrome(true, 280);
    var from = flipFrom(source, r);
    img.animate([from, { transform: "none", clipPath: "inset(0px 0px 0px 0px round 4px)" }],
      { duration: 680, easing: EASE_OUT }).onfinish = done;
  }

  function close() {
    if (busy || !dialog.open) return;
    busy = true;
    var source = sourceFor(current);
    var finish = function () {
      dialog.close();
      document.documentElement.style.overflow = "";
      if (source) source.classList.remove("is-source");
      busy = false;
    };

    if (reduceMotion) {
      dialog.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: "ease" }).onfinish = finish;
      return;
    }
    fadeChrome(false);
    bg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: "ease", fill: "forwards" });
    var anim;
    if (source && inView(source)) {
      var r = img.getBoundingClientRect();
      source.classList.add("is-source");
      anim = img.animate([{ transform: "none", clipPath: "inset(0px 0px 0px 0px round 4px)" }, flipFrom(source, r)],
        { duration: 480, easing: EASE_OUT, fill: "forwards" });
    } else {
      anim = img.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(0.94)" }],
        { duration: 260, easing: "ease", fill: "forwards" });
    }
    anim.onfinish = function () {
      finish();
      // Animationen aufräumen, damit das nächste Öffnen sauber startet
      img.getAnimations().forEach(function (a) { a.cancel(); });
      bg.getAnimations().forEach(function (a) { a.cancel(); });
      chrome.forEach(function (el) { el.getAnimations().forEach(function (a) { a.cancel(); }); });
    };
  }

  // Blättern: altes Foto gleitet raus, neues gleitet rein
  function go(dir, fromX) {
    if (busy) return;
    busy = true;
    var next = (current + dir + items.length) % items.length;
    var outAnim = img.animate(
      [{ transform: "translateX(" + (fromX || 0) + "px)", opacity: 1 },
       { transform: "translateX(" + (-dir * 80) + "px)", opacity: 0 }],
      { duration: reduceMotion ? 120 : 220, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" });
    outAnim.onfinish = function () {
      current = next;
      var big = preload(next);
      preload(next + dir);
      var show = function () {
        img.src = items[next].src;
        place(next);
        outAnim.cancel();
        img.animate(
          [{ transform: "translateX(" + (reduceMotion ? 0 : dir * 80) + "px)", opacity: 0 },
           { transform: "none", opacity: 1 }],
          { duration: reduceMotion ? 150 : 420, easing: EASE_OUT }).onfinish = function () { busy = false; };
      };
      if (big.complete) show();
      else { big.onload = show; big.onerror = show; }
    };
  }

  // Klick auf ein Foto öffnet die Großansicht
  document.querySelectorAll(".zoom[data-zoom]").forEach(function (btn) {
    btn.addEventListener("click", function () { open(Number(btn.dataset.zoom), btn); });
  });

  dialog.querySelector("[data-lb-close]").addEventListener("click", close);
  dialog.querySelector("[data-lb-prev]").addEventListener("click", function () { go(-1); });
  dialog.querySelector("[data-lb-next]").addEventListener("click", function () { go(1); });
  bg.addEventListener("click", close);
  dialog.addEventListener("cancel", function (e) { e.preventDefault(); close(); });
  dialog.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") go(1);
    if (e.key === "ArrowLeft") go(-1);
  });
  window.addEventListener("resize", function () { if (dialog.open && !busy) place(current); });

  // Wischen auf dem Handy (das Foto folgt dem Finger)
  var startX = null, dx = 0;
  img.addEventListener("pointerdown", function (e) {
    if (busy) return;
    startX = e.clientX; dx = 0;
    img.setPointerCapture(e.pointerId);
  });
  img.addEventListener("pointermove", function (e) {
    if (startX === null) return;
    dx = e.clientX - startX;
    img.style.transform = "translateX(" + dx + "px)";
    img.style.opacity = String(1 - Math.min(Math.abs(dx) / 400, 0.5));
  });
  var endSwipe = function () {
    if (startX === null) return;
    startX = null;
    var moved = dx;
    img.style.transform = ""; img.style.opacity = "";
    if (Math.abs(moved) > 60) {
      go(moved < 0 ? 1 : -1, moved);
    } else if (moved !== 0) {
      img.animate([{ transform: "translateX(" + moved + "px)" }, { transform: "none" }],
        { duration: 300, easing: EASE_OUT });
    }
  };
  img.addEventListener("pointerup", endSwipe);
  img.addEventListener("pointercancel", endSwipe);
})();
