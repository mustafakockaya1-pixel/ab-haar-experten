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
  // ÖFFNUNGSZEITEN – für die Anzeige „Jetzt geöffnet“
  // 0 = Sonntag, 1 = Montag … 6 = Samstag. [Öffnung, Schließung] in Stunden.
  // Wenn sich die Zeiten ändern: hier UND in index.html anpassen.
  // =========================================================
  var HOURS = { 1: [9, 18], 2: [9, 18], 3: [9, 18], 4: [9, 18], 5: [9, 18], 6: [8, 16] };
  var DAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

  // Uhrzeit in Stuttgart – egal, wo der Besucher gerade ist
  function berlinNow() {
    var parts = {};
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Berlin", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    var day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
    return { day: day, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function fmt(h) { return h + ":00"; }

  function openStatus() {
    var now = berlinNow();
    var today = HOURS[now.day];
    if (today && now.minutes >= today[0] * 60 && now.minutes < today[1] * 60) {
      var left = today[1] * 60 - now.minutes;
      return { open: true, short: "Geöffnet", long: left <= 60 ? "Geöffnet · schließt in " + left + " Min." : "Jetzt geöffnet · bis " + fmt(today[1]) + " Uhr" };
    }
    if (today && now.minutes < today[0] * 60) {
      return { open: false, short: "Geschlossen", long: "Geschlossen · öffnet heute um " + fmt(today[0]) + " Uhr" };
    }
    for (var i = 1; i <= 7; i++) {
      var d = (now.day + i) % 7;
      if (HOURS[d]) {
        var when = i === 1 ? "morgen" : DAYS[d];
        return { open: false, short: "Geschlossen", long: "Geschlossen · öffnet " + when + " um " + fmt(HOURS[d][0]) + " Uhr" };
      }
    }
    return null;
  }

  var statusEl = document.querySelector("[data-status]");
  function renderStatus() {
    var s = openStatus();
    if (!statusEl || !s) return;
    statusEl.hidden = false;
    statusEl.classList.toggle("is-open", s.open);
    statusEl.querySelector("[data-status-text]").innerHTML =
      '<span class="status__short">' + s.short + '</span><span class="status__long">' + s.long + "</span>";
    // heutigen Tag in der Tabelle hervorheben
    var day = String(berlinNow().day);
    document.querySelectorAll(".hours tr[data-days]").forEach(function (tr) {
      tr.classList.toggle("is-today", tr.dataset.days.split(" ").indexOf(day) > -1);
    });
  }
  renderStatus();
  setInterval(renderStatus, 60 * 1000);

  // =========================================================
  // RUNDGANG – leuchtende Punkte im Startbild
  // =========================================================
  var hero = document.querySelector(".hero");
  var heroImg = hero && hero.querySelector(".hero__media img");
  var spotsWrap = document.querySelector("[data-spots]");
  if (hero && heroImg && spotsWrap) {
    var spots = Array.prototype.slice.call(spotsWrap.querySelectorAll(".spot"));
    var card = spotsWrap.querySelector("[data-spot-card]");
    var cardTitle = card.querySelector("[data-spot-title]");
    var cardText = card.querySelector("[data-spot-text]");
    var hint = document.querySelector("[data-spots-hint]");
    var activeSpot = null;

    // Rechnet die Prozent-Position im Foto auf die Bildschirm-Position um
    // (das Foto wird je nach Bildschirm unterschiedlich zugeschnitten).
    function layoutSpots() {
      var box = hero.getBoundingClientRect();
      var natW = heroImg.naturalWidth || 1206, natH = heroImg.naturalHeight || 903;
      var s = Math.max(box.width / natW, box.height / natH);
      var w = natW * s, h = natH * s;
      var offX = (box.width - w) * 0.5, offY = (box.height - h) * 0.4; // = object-position 50% 40%
      var blockers = Array.prototype.slice.call(hero.querySelectorAll(".hero__title .line > *, .hero__lead, .hero__actions .btn, .hero__hint"))
        .map(function (el) { return el.getBoundingClientRect(); });
      var visible = 0;
      spots.forEach(function (spot) {
        var x = offX + w * Number(spot.dataset.x) / 100;
        var y = offY + h * Number(spot.dataset.y) / 100;
        var ax = box.left + x, ay = box.top + y, pad = 34;
        var hidden = x < 24 || y < 24 || x > box.width - 24 || y > box.height - 24 ||
          blockers.some(function (r) { return ax > r.left - pad && ax < r.right + pad && ay > r.top - pad && ay < r.bottom + pad; });
        spot.style.left = x + "px";
        spot.style.top = y + "px";
        spot.hidden = hidden;
        if (!hidden) visible++;
      });
      if (hint) hint.hidden = visible === 0;
      if (activeSpot && activeSpot.hidden) closeSpot();
      else if (activeSpot) positionCard(activeSpot);
    }

    function positionCard(spot) {
      var x = parseFloat(spot.style.left), y = parseFloat(spot.style.top);
      var bw = hero.clientWidth, cw = Math.min(280, bw - 32);
      card.style.width = cw + "px";
      var left = Math.max(16, Math.min(x - cw / 2, bw - cw - 16));
      var below = y < hero.clientHeight / 2;
      card.style.left = left + "px";
      card.style.top = below ? (y + 30) + "px" : "";
      card.style.bottom = below ? "" : (hero.clientHeight - y + 30) + "px";
      card.classList.toggle("is-below", below);
    }

    function openSpot(spot) {
      if (activeSpot) activeSpot.setAttribute("aria-expanded", "false");
      activeSpot = spot;
      spots.forEach(function (s) { s.classList.toggle("is-active", s === spot); });
      spot.setAttribute("aria-expanded", "true");
      cardTitle.textContent = spot.dataset.title;
      cardText.textContent = spot.dataset.text;
      card.hidden = false;
      positionCard(spot);
      if (!reduceMotion) {
        card.animate([{ opacity: 0, transform: "translateY(" + (card.classList.contains("is-below") ? -8 : 8) + "px) scale(0.97)" },
          { opacity: 1, transform: "none" }], { duration: 320, easing: EASE_OUT });
      }
      if (hint) hint.classList.add("is-done");
    }
    function closeSpot() {
      if (!activeSpot) return;
      activeSpot.setAttribute("aria-expanded", "false");
      activeSpot.classList.remove("is-active");
      activeSpot = null;
      card.hidden = true;
    }

    spots.forEach(function (spot) {
      spot.setAttribute("aria-expanded", "false");
      spot.addEventListener("click", function (e) {
        e.stopPropagation();
        if (activeSpot === spot) closeSpot(); else openSpot(spot);
      });
    });
    document.addEventListener("click", function (e) { if (!e.target.closest("[data-spot-card]")) closeSpot(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSpot(); });

    spotsWrap.classList.add("is-ready");
    if (heroImg.complete) layoutSpots(); else heroImg.addEventListener("load", layoutSpots);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutSpots);
    window.addEventListener("resize", layoutSpots);

    // Das Pulsieren läuft nur, solange das Startbild sichtbar ist
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        spotsWrap.classList.toggle("is-paused", !entries[0].isIntersecting);
      }).observe(hero);
    }
  }

  // =========================================================
  // FRISUREN-FINDER – Fragen, Antworten und Vorschläge
  // =========================================================
  var FINDER = {
    start: {
      frage: "Für wen ist der Termin?",
      antworten: [
        { text: "Für mich – Damen", weiter: "damen" },
        { text: "Für mich – Herren", weiter: "herren" },
        { text: "Für mein Kind", tipp: "kind" }
      ]
    },
    damen: {
      frage: "Was wünschen Sie sich?",
      antworten: [
        { text: "Einen neuen Schnitt", tipp: "damenSchnitt" },
        { text: "Eine neue Farbe", tipp: "damenFarbe" },
        { text: "Schön gestylt für den Alltag", tipp: "damenStyling" },
        { text: "Eine Frisur für einen besonderen Anlass", tipp: "damenAnlass" }
      ],
      zeitfrage: true
    },
    herren: {
      frage: "Was soll es werden?",
      antworten: [
        { text: "Ein klassischer Haarschnitt", tipp: "herrenSchnitt" },
        { text: "Kurz & pflegeleicht mit der Maschine", tipp: "herrenMaschine" },
        { text: "Nur der Bart", tipp: "herrenBart" },
        { text: "Das volle Programm: Haare + Bart", tipp: "herrenKomplett" }
      ],
      zeitfrage: true
    },
    zeit: {
      frage: "Wie viel Zeit haben Sie morgens fürs Styling?",
      antworten: [
        { text: "Fast keine – es muss schnell gehen", zeit: "kurz" },
        { text: "So 5 bis 10 Minuten", zeit: "mittel" },
        { text: "Gern auch etwas mehr", zeit: "lang" }
      ]
    },
    tipps: {
      damenSchnitt:   { titel: "Waschen, Schneiden, Föhnen", text: "Wir schauen uns Ihr Haar an und finden gemeinsam einen Schnitt, der zu Ihnen und Ihrem Alltag passt." },
      damenFarbe:     { titel: "Färben oder Strähnen", text: "Ob ganz neue Farbe oder feine Strähnen für mehr Frische – wir beraten Sie, was am besten zu Ihrem Typ passt." },
      damenStyling:   { titel: "Föhnen & Styling", text: "Für alle, die mit perfekt sitzenden Haaren rausgehen möchten – und Tipps fürs Nachstylen zu Hause bekommen." },
      damenAnlass:    { titel: "Hochsteckfrisur", text: "Hochzeit, Feier oder Abiball: Bringen Sie gern Fotos mit, die Ihnen gefallen – wir besprechen alles vorab." },
      herrenSchnitt:  { titel: "Haarschnitt", text: "Der klassische Herrenschnitt – sauber, gepflegt und so, wie Sie ihn tragen möchten." },
      herrenMaschine: { titel: "Maschinenschnitt", text: "Kurz, ordentlich und ohne Aufwand – ideal, wenn es unkompliziert sein soll." },
      herrenBart:     { titel: "Bart trimmen & Konturen", text: "Saubere Linien und die richtige Länge. Oder ganz klassisch: eine Nassrasur." },
      herrenKomplett: { titel: "Haarschnitt + Bart", text: "Haare und Bart in einem Termin – damit alles zusammenpasst." },
      kind:           { titel: "Kinderhaarschnitt", text: "Für unsere kleinen Gäste nehmen wir uns besonders viel Geduld – damit der Friseurbesuch Spaß macht." }
    },
    zeitTipps: {
      kurz: "Sagen Sie uns beim Termin, dass es morgens schnell gehen muss – dann achten wir auf einen pflegeleichten Schnitt.",
      mittel: "Wir zeigen Ihnen gern, wie Sie Ihre Frisur zu Hause in wenigen Minuten selbst stylen.",
      lang: "Dann darf es auch etwas aufwendiger sein – wir beraten Sie gern zu den Möglichkeiten."
    }
  };

  var finder = document.querySelector("[data-finder]");
  if (finder) {
    finder.hidden = false;
    var body = finder.querySelector("[data-finder-body]");
    var stepEl = finder.querySelector("[data-finder-step]");
    var barsEl = finder.querySelector("[data-finder-bars]");
    var history = [];   // für „Zurück“
    var state = {};
    var total = 3;

    function bars(n) {
      barsEl.innerHTML = "";
      for (var i = 0; i < total; i++) {
        var b = document.createElement("span");
        if (i < n) b.className = "is-on";
        barsEl.appendChild(b);
      }
    }

    function swap(render, dir) {
      if (reduceMotion || !body.animate) { render(); return; }
      var out = body.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateX(" + (-24 * dir) + "px)" }],
        { duration: 160, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" });
      out.onfinish = function () {
        render();
        out.cancel();
        body.animate([{ opacity: 0, transform: "translateX(" + (24 * dir) + "px)" }, { opacity: 1, transform: "none" }],
          { duration: 380, easing: EASE_OUT });
      };
    }

    function el(tag, cls, text) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text) e.textContent = text;
      return e;
    }

    function showQuestion(key, n) {
      var q = FINDER[key];
      stepEl.textContent = "Frage " + n + " von " + total;
      bars(n);
      body.innerHTML = "";
      body.appendChild(el("h3", "finder__q", q.frage));
      var list = el("div", "finder__options");
      q.antworten.forEach(function (a) {
        var b = el("button", "finder__opt", a.text);
        b.type = "button";
        b.addEventListener("click", function () { choose(key, a, n); });
        list.appendChild(b);
      });
      body.appendChild(list);
      if (history.length) {
        var back = el("button", "finder__back", "← Zurück");
        back.type = "button";
        back.addEventListener("click", goBack);
        body.appendChild(back);
      }
    }

    function choose(key, a, n) {
      history.push({ key: key, n: n, state: JSON.parse(JSON.stringify(state)) });
      if (a.weiter) { state.gruppe = a.weiter; swap(function () { showQuestion(a.weiter, n + 1); }, 1); return; }
      if (a.tipp) {
        state.tipp = a.tipp;
        if (FINDER[key].zeitfrage) { swap(function () { showQuestion("zeit", n + 1); }, 1); return; }
        swap(showResult, 1); return;
      }
      if (a.zeit) { state.zeit = a.zeit; swap(showResult, 1); }
    }

    function goBack() {
      var prev = history.pop();
      if (!prev) return;
      state = prev.state;
      swap(function () { showQuestion(prev.key, prev.n); }, -1);
    }

    function showResult() {
      var t = FINDER.tipps[state.tipp];
      stepEl.textContent = "Unser Tipp für Sie";
      bars(total);
      body.innerHTML = "";
      body.appendChild(el("h3", "finder__result", t.titel));
      var rule = el("span", "finder__rule");
      body.appendChild(rule);
      body.appendChild(el("p", "finder__text", t.text));
      if (state.zeit) body.appendChild(el("p", "finder__text", FINDER.zeitTipps[state.zeit]));
      var actions = el("div", "finder__actions");
      var call = el("a", "btn btn--primary", "Termin vereinbaren");
      call.href = "tel:+4971191248868";
      var again = el("button", "btn btn--ghost", "Nochmal starten");
      again.type = "button";
      again.addEventListener("click", function () { history = []; state = {}; swap(function () { showQuestion("start", 1); }, -1); });
      actions.appendChild(call); actions.appendChild(again);
      body.appendChild(actions);
      body.appendChild(el("p", "finder__note", "Ein unverbindlicher Vorschlag – im Salon beraten wir Sie persönlich."));
      // goldene Linie zeichnet sich unter dem Ergebnis
      if (!reduceMotion) {
        rule.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
          { duration: 900, delay: 200, easing: EASE_OUT, fill: "backwards" });
      }
    }

    showQuestion("start", 1);
  }

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
