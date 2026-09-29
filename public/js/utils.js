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

const TOAST_BASE =
  "fixed left-1/2 -translate-x-1/2 bottom-24 z-50 opacity-0 transition-opacity duration-200 pointer-events-none";
const TOAST_DEFAULT =
  "bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg";

const ICON_SUCCESS =
  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#fff"/><polyline points="7.5 12.5 10.5 15.5 16.5 9" stroke="#4FA85B" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_ERROR =
  `<svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><polygon points="13,3 27,3 37,13 37,27 27,37 13,37 3,27 3,13" fill="#D92D20"/><rect x="18.4" y="10.5" width="3.2" height="12" rx="1.6" fill="#fff"/><circle cx="20" cy="27.6" r="2" fill="#fff"/></svg>`;
const ICON_CLOSE =
  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>`;

// Card variants. Errors stay longer because they carry a second line to read.
const TOAST_CARDS = {
  success: { cls: "sl-toast-success", icon: ICON_SUCCESS, ms: 1800 },
  error: { cls: "sl-toast-error", icon: ICON_ERROR, ms: 3500 },
};

function hideToast(el) {
  clearTimeout(toastTimer);
  el.classList.add("opacity-0", "pointer-events-none", "is-hidden");
}

// type: "default" (dark pill, used for notices and validation),
//       "success" (green card, check icon), or
//       "error"   (white card, red alert icon; optional `detail` second line).
// Card variants have a close button and dismiss on tap.
export function showToast(message, type = "default", detail = "") {
  let el = document.getElementById("sl-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "sl-toast";
    document.body.appendChild(el);
  }
  clearTimeout(toastTimer);

  const card = TOAST_CARDS[type];
  let ms = 1800;
  if (card) {
    ms = card.ms;
    el.className = `sl-toast-card ${card.cls} is-hidden ${TOAST_BASE}`;
    el.setAttribute("role", type === "error" ? "alert" : "status");
    el.innerHTML = `<span class="sl-toast-icon">${card.icon}</span>` +
      `<span class="sl-toast-body"><span class="sl-toast-text"></span><span class="sl-toast-detail"></span></span>` +
      `<button type="button" class="sl-toast-close" aria-label="Dismiss">${ICON_CLOSE}</button>`;
    el.querySelector(".sl-toast-text").textContent = message;
    const detailEl = el.querySelector(".sl-toast-detail");
    if (detail) detailEl.textContent = detail;
    else detailEl.remove();
    el.querySelector(".sl-toast-close").addEventListener("click", () => hideToast(el));
    el.classList.remove("opacity-0", "pointer-events-none", "is-hidden");
  } else {
    el.className = `${TOAST_BASE} ${TOAST_DEFAULT}`;
    el.removeAttribute("role");
    el.textContent = message;
    el.classList.remove("opacity-0");
  }
  toastTimer = setTimeout(() => hideToast(el), ms);
}
