// SoftLedger — onboarding flow (index.html): Welcome → How it helps → Business type.
// Steps are addressed by URL hash so the Android back button walks steps
// before leaving the screen. Finishing hands off to signup.html.
// Persisted keys: sl_onboarded ("1" once the flow has been left),
// sl_business_type (radio value; signup.html forwards it as user metadata).

(function () {
  var STEPS = ["welcome", "how", "type"];
  var LAST = STEPS.length - 1;
  var KEY_ONBOARDED = "sl_onboarded";
  var KEY_TYPE = "sl_business_type";

  var track = document.getElementById("ob-track");
  var viewport = document.getElementById("ob-viewport");
  var panels = Array.prototype.slice.call(track.children);
  var dots = Array.prototype.slice.call(document.querySelectorAll(".ob-dot"));
  var backBtn = document.getElementById("ob-back");
  var ctaBtn = document.getElementById("ob-cta");
  var ctaLabel = document.getElementById("ob-cta-label");
  var loginLink = document.getElementById("ob-login");
  var radios = Array.prototype.slice.call(document.querySelectorAll('input[name="business"]'));

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
  }

  var index = 0;

  function indexFromHash() {
    var i = STEPS.indexOf(location.hash.slice(1));
    return i < 0 ? 0 : i;
  }

  function render(i) {
    index = i;
    track.style.transform = "translateX(" + -i * 100 + "%)";
    panels.forEach(function (panel, n) {
      var active = n === i;
      if (active) panel.removeAttribute("inert"); else panel.setAttribute("inert", "");
      panel.setAttribute("aria-hidden", String(!active));
    });
    dots.forEach(function (dot, n) { dot.classList.toggle("is-active", n === i); });
    backBtn.classList.toggle("is-off", i === 0);
    backBtn.tabIndex = i === 0 ? -1 : 0;
    ctaLabel.textContent = i === LAST ? "Get Started" : "Next";
  }

  function show(i, moveFocus) {
    render(i);
    if (moveFocus) {
      var title = panels[i].querySelector(".ob-title");
      if (title) title.focus({ preventScroll: true });
    }
  }

  function go(i) {
    if (i < 0 || i > LAST || i === index) return;
    if (i > index) {
      location.hash = STEPS[i]; // pushes a history entry; hashchange renders
    } else if (history.length > 1) {
      history.back();
    } else {
      location.replace("#" + STEPS[i]);
    }
  }

  function saveType() {
    var picked = radios.filter(function (r) { return r.checked; })[0];
    if (picked) safeSet(KEY_TYPE, picked.value);
  }

  function markOnboarded() {
    safeSet(KEY_ONBOARDED, "1");
  }

  function finish() {
    saveType();
    markOnboarded();
    location.href = "signup.html";
  }

  // Restore previous pick (e.g. user came back from signup); default is Charging Store.
  var saved = safeGet(KEY_TYPE);
  radios.forEach(function (r) { r.checked = r.value === (saved || "charging"); });
  if (!radios.some(function (r) { return r.checked; })) radios[0].checked = true;
  radios.forEach(function (r) { r.addEventListener("change", saveType); });

  ctaBtn.addEventListener("click", function () {
    if (index < LAST) go(index + 1); else finish();
  });
  backBtn.addEventListener("click", function () { go(index - 1); });
  loginLink.addEventListener("click", markOnboarded);
  window.addEventListener("hashchange", function () { show(indexFromHash(), true); });

  // Horizontal swipe between steps; vertical scrolling is left alone.
  var startX = 0, startY = 0, tracking = false;
  viewport.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) { tracking = false; return; }
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    tracking = true;
  }, { passive: true });
  viewport.addEventListener("touchend", function (e) {
    if (!tracking) return;
    tracking = false;
    var t = e.changedTouches[0];
    var dx = t.clientX - startX;
    var dy = t.clientY - startY;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) go(index + 1); else go(index - 1);
  }, { passive: true });

  // First paint without animation, then enable the slide transition.
  show(indexFromHash(), false);
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { track.classList.add("is-ready"); });
  });
})();
