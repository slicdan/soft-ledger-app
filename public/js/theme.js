/* SoftLedger theme. Classic (non-module) script, loaded synchronously in every
   page <head> so the class is set before first paint (no light flash).
   Preference: localStorage "sl_theme" = "dark" | "light"; unset = follow system.
   All dark styling lives in css/styles.css under `html.dark`. */
(function () {
  var KEY = "sl_theme";
  var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function stored() {
    try { var v = localStorage.getItem(KEY); return v === "dark" || v === "light" ? v : null; }
    catch (e) { return null; }
  }
  function isDark() {
    var s = stored();
    return s ? s === "dark" : !!(mq && mq.matches);
  }
  function apply() {
    var dark = isDark();
    var root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#0B1119" : "#FFFFFF");
    document.dispatchEvent(new CustomEvent("sl-theme-change", { detail: { dark: dark } }));
  }

  window.slTheme = {
    isDark: isDark,
    set: function (mode) {
      try { localStorage.setItem(KEY, mode === "dark" ? "dark" : "light"); } catch (e) {}
      apply();
    }
  };

  apply();
  if (mq) {
    var onSys = function () { if (!stored()) apply(); };
    if (mq.addEventListener) mq.addEventListener("change", onSys);
    else if (mq.addListener) mq.addListener(onSys);
  }
})();
