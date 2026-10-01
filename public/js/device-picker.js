// SoftLedger — shared "Device / Item" picker (Phone / Power Bank / Laptop /
// Other). Single source for record-charge.html and record-payment.html.
//
// Single-select with quantities:
//   - Phone / Power Bank / Laptop: first tap selects it at quantity 1; each
//     further tap on the selected card adds 1; the "×" at the card's
//     upper-left removes 1, and at 0 the card is deselected.
//   - Other: plain single-select, no quantity, no pill, no "×".
//   - Tapping a different card switches the selection (its quantity starts
//     at 1, the previous card is cleared).
//
//   const picker = createDevicePicker(containerEl, { onChange });
//   onChange()        // optional; fires after every user tap (select/＋/×)
//   picker.value      // "Phone" | "Power Bank" | "Laptop" | "Other" | "" (none)
//   picker.quantity   // 1+ when selected, 0 when none

const DEVICES = [
  {
    value: "Phone",
    quantity: true,
    icon: `<rect x="7" y="2" width="10" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>`,
  },
  {
    value: "Power Bank",
    quantity: true,
    // Filled 256-grid icon (battery-charging-vertical); others are 24-grid strokes.
    filled: true,
    icon: `<path d="M150.81,131.79a8,8,0,0,1,.35,7.79l-16,32a8,8,0,0,1-14.32-7.16L131.06,144H112a8,8,0,0,1-7.16-11.58l16-32a8,8,0,1,1,14.32,7.16L124.94,128H144A8,8,0,0,1,150.81,131.79ZM96,16h64a8,8,0,0,0,0-16H96a8,8,0,0,0,0,16ZM200,56V224a24,24,0,0,1-24,24H80a24,24,0,0,1-24-24V56A24,24,0,0,1,80,32h96A24,24,0,0,1,200,56Zm-16,0a8,8,0,0,0-8-8H80a8,8,0,0,0-8,8V224a8,8,0,0,0,8,8h96a8,8,0,0,0,8-8Z"/>`,
  },
  {
    value: "Laptop",
    quantity: true,
    icon: `<rect x="3" y="4" width="18" height="12" rx="1.5"/><line x1="2" y1="20" x2="22" y2="20"/>`,
  },
  {
    value: "Other",
    quantity: false,
    icon: `<circle cx="12" cy="12" r="9" stroke-dasharray="3 3"/>`,
  },
];

// Read-only helpers for screens that display a saved device (e.g. the
// transaction detail card): the same icons, and "Phone x2"-style labels.
function iconSvg(d, size) {
  if (d.filled) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 256 256" fill="currentColor">${d.icon}</svg>`;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d.icon}</svg>`;
}

export function deviceIcon(value, size = 20) {
  const d = DEVICES.find((x) => x.value === value) || DEVICES[DEVICES.length - 1];
  return iconSvg(d, size);
}

export function deviceLabel(value, quantity = 1) {
  const d = DEVICES.find((x) => x.value === value);
  return d && d.quantity && quantity > 1 ? `${value} x${quantity}` : value;
}

const ACTIVE = ["border-2", "border-blue-600", "bg-blue-50", "text-blue-600"];
const IDLE = ["border", "border-slate-200", "text-slate-500"];

const CLOSE = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>`;

export function createDevicePicker(container, { onChange } = {}) {
  let selected = DEVICES[0].value; // Phone preselected, as before
  let quantity = 1;

  container.innerHTML = `
    <p class="text-sm font-semibold text-slate-900 mb-2">Device / Item</p>
    <div class="grid grid-cols-4 gap-2" id="device-group">
      ${DEVICES.map((d) => `
        <div class="device-card relative" data-value="${d.value}">
          <button type="button" data-value="${d.value}" aria-pressed="false"
            class="device-btn w-full flex flex-col items-center gap-1.5 py-3 rounded-xl">
            ${iconSvg(d, 20)}
            <span class="text-xs font-medium">${d.value}</span>
          </button>
          ${d.quantity ? `
          <button type="button" aria-label="Remove one ${d.value}"
            class="device-minus hidden absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-white border border-blue-200 text-blue-600 items-center justify-center shadow-sm before:absolute before:-inset-1">${CLOSE}</button>
          <span class="device-qty hidden absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 rounded-full bg-blue-600 text-white text-[11px] font-semibold items-center justify-center shadow-sm pointer-events-none"></span>` : ""}
        </div>`).join("")}
    </div>`;

  const cards = [...container.querySelectorAll(".device-card")];

  function render() {
    for (const card of cards) {
      const on = card.dataset.value === selected;
      const btn = card.querySelector(".device-btn");
      btn.setAttribute("aria-pressed", String(on));
      btn.classList.remove(...ACTIVE, ...IDLE);
      btn.classList.add(...(on ? ACTIVE : IDLE));

      const minus = card.querySelector(".device-minus");
      const qty = card.querySelector(".device-qty");
      if (minus) {
        minus.classList.toggle("hidden", !on);
        minus.classList.toggle("flex", on);
        qty.classList.toggle("hidden", !on);
        qty.classList.toggle("flex", on);
        qty.textContent = on ? String(quantity) : "";
        qty.setAttribute("aria-label", on ? `${quantity} selected` : "");
      }
    }
  }

  for (const card of cards) {
    const value = card.dataset.value;
    const device = DEVICES.find((d) => d.value === value);

    card.querySelector(".device-btn").addEventListener("click", () => {
      if (selected === value) {
        if (device.quantity) quantity += 1;
      } else {
        selected = value;
        quantity = 1;
      }
      render();
      onChange?.();
    });

    const minus = card.querySelector(".device-minus");
    if (minus) {
      minus.addEventListener("click", () => {
        quantity -= 1;
        if (quantity <= 0) {
          selected = "";
          quantity = 0;
        }
        render();
        onChange?.();
      });
    }
  }

  render();

  return {
    get value() {
      return selected;
    },
    get quantity() {
      return selected ? quantity : 0;
    },
  };
}
