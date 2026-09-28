// SoftLedger — small shared helpers. Keep this file dependency-free.

export function setFieldError(inputEl, message) {
  const wrapper = inputEl.closest("[data-field]");
  const errorEl = wrapper?.querySelector("[data-error]");
  if (message) {
    inputEl.classList.add("border-red-400");
    inputEl.classList.remove("border-slate-200");
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove("hidden");
    }
  } else {
    inputEl.classList.remove("border-red-400");
    inputEl.classList.add("border-slate-200");
    if (errorEl) {
      errorEl.textContent = "";
      errorEl.classList.add("hidden");
    }
  }
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function setLoading(buttonEl, loading, loadingText = "Please wait…") {
  if (loading) {
    buttonEl.dataset.originalText = buttonEl.textContent;
    buttonEl.textContent = loadingText;
    buttonEl.disabled = true;
    buttonEl.classList.add("opacity-70", "cursor-not-allowed");
  } else {
    buttonEl.textContent = buttonEl.dataset.originalText || buttonEl.textContent;
    buttonEl.disabled = false;
    buttonEl.classList.remove("opacity-70", "cursor-not-allowed");
  }
}

export function showBanner(bannerEl, message, type = "error") {
  bannerEl.textContent = message;
  bannerEl.classList.remove("hidden", "bg-red-50", "text-red-600", "bg-green-50", "text-green-700");
  if (type === "error") {
    bannerEl.classList.add("bg-red-50", "text-red-600");
  } else {
    bannerEl.classList.add("bg-green-50", "text-green-700");
  }
}

// "₦1,500" — comma thousands, whole naira unless there are kobo.
// null/undefined/non-numeric render as ₦0.
export function formatNaira(amount) {
  const value = Number(amount) || 0;
  return formatNairaDigits(value, Number.isInteger(value) ? 0 : 2);
}

function formatNairaDigits(value, digits) {
  return `₦${value.toLocaleString("en-NG", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

// Animates an element's text from ₦0 up to `target` with an ease-out curve.
// Always ends on exactly formatNaira(target). Skips the animation for ₦0,
// non-numeric targets, and when the user prefers reduced motion.
const countUpFrames = new WeakMap();
export function countUpNaira(el, amount, duration = 900) {
  const target = Number(amount) || 0;
  cancelAnimationFrame(countUpFrames.get(el));

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || target === 0 || !Number.isFinite(target)) {
    el.textContent = formatNaira(target);
    return;
  }

  // Keep decimal places stable across frames (no kobo flicker mid-animation).
  const digits = Number.isInteger(target) ? 0 : 2;
  const factor = 10 ** digits;
  const start = performance.now();

  const tick = (now) => {
    const t = Math.min((now - start) / duration, 1);
    if (t >= 1) {
      el.textContent = formatNaira(target);
      return;
    }
    const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
    el.textContent = formatNairaDigits(Math.round(target * eased * factor) / factor, digits);
    countUpFrames.set(el, requestAnimationFrame(tick));
  };

  el.textContent = formatNairaDigits(0, digits);
  countUpFrames.set(el, requestAnimationFrame(tick));
}

// Compact relative time: "Just now", "5m ago", "2h ago", "1d ago";
// older than a week falls back to a date like "12 Sept 2026".
export function formatTimeAgo(timestamp) {
  const then = new Date(timestamp);
  const seconds = Math.max(0, Math.floor((Date.now() - then.getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString("en-NG", { dateStyle: "medium" });
}

let toastTimer;
export function showToast(message) {
  let el = document.getElementById("sl-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "sl-toast";
    el.className =
      "fixed left-1/2 -translate-x-1/2 bottom-24 z-50 bg-slate-900 text-white text-sm font-medium " +
      "px-4 py-2.5 rounded-full shadow-lg opacity-0 transition-opacity duration-200 pointer-events-none";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.remove("opacity-0");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("opacity-0"), 1800);
}
