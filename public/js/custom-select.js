// SoftLedger — custom searchable single-select dropdown.
// Replaces the native <select>. Styles live in css/styles.css (.sl-select*).
//
//   const select = createSelect(containerEl, {
//     placeholder: "Loading customers…",
//     searchPlaceholder: "Search customer...",
//     onChange: (value) => {},
//   });
//   select.setOptions([{ value, label, sub }]);   // sorted A–Z by label
//   select.value                                   // selected value ("" if none)
//   select.setDisabled(true);

const CHEVRON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
const SEARCH = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;

let uid = 0;

export function createSelect(container, { placeholder = "Select…", searchPlaceholder = "Search...", onChange } = {}) {
  const listId = `sl-select-list-${++uid}`;
  let options = [];
  let selected = null;
  let open = false;

  container.classList.add("sl-select");
  container.innerHTML = `
    <button type="button" class="sl-select-trigger" aria-haspopup="listbox" aria-expanded="false" aria-controls="${listId}">
      <span class="sl-select-label"></span>
      <span class="sl-select-chevron">${CHEVRON}</span>
    </button>
    <div class="sl-select-panel" hidden>
      <div class="sl-select-search">
        <span class="sl-select-search-icon">${SEARCH}</span>
        <input type="text" autocomplete="off" aria-label="${searchPlaceholder}" placeholder="${searchPlaceholder}">
      </div>
      <ul class="sl-select-list" id="${listId}" role="listbox"></ul>
    </div>`;

  const trigger = container.querySelector(".sl-select-trigger");
  const labelEl = container.querySelector(".sl-select-label");
  const panel = container.querySelector(".sl-select-panel");
  const searchInput = container.querySelector(".sl-select-search input");
  const listEl = container.querySelector(".sl-select-list");

  function renderLabel() {
    if (selected) {
      labelEl.textContent = selected.sub ? `${selected.label} — ${selected.sub}` : selected.label;
      labelEl.classList.remove("is-placeholder");
    } else {
      labelEl.textContent = placeholder;
      labelEl.classList.add("is-placeholder");
    }
  }

  function renderList() {
    const q = searchInput.value.trim().toLowerCase();
    const rows = q
      ? options.filter((o) => o.label.toLowerCase().includes(q) || (o.sub || "").toLowerCase().includes(q))
      : options;

    listEl.replaceChildren();
    if (!rows.length) {
      const empty = document.createElement("li");
      empty.className = "sl-select-empty";
      empty.textContent = "No matches";
      listEl.appendChild(empty);
      return;
    }

    for (const o of rows) {
      const isSel = selected && selected.value === o.value;
      const li = document.createElement("li");
      li.className = "sl-select-option" + (isSel ? " is-selected" : "");
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", String(!!isSel));
      li.dataset.value = o.value;

      const avatar = document.createElement("span");
      avatar.className = "sl-select-avatar";
      avatar.textContent = (o.label.trim()[0] || "?").toUpperCase();

      const text = document.createElement("span");
      text.className = "sl-select-text";
      const name = document.createElement("span");
      name.className = "sl-select-name";
      name.textContent = o.label;
      text.appendChild(name);
      if (o.sub) {
        const sub = document.createElement("span");
        sub.className = "sl-select-sub";
        sub.textContent = o.sub;
        text.appendChild(sub);
      }

      const radio = document.createElement("span");
      radio.className = "sl-select-radio";

      li.append(avatar, text, radio);
      listEl.appendChild(li);
    }
  }

  function setOpen(next) {
    if (next === open) return;
    open = next;
    panel.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
    container.classList.toggle("is-open", open);
    if (open) {
      searchInput.value = "";
      renderList();
      listEl.querySelector(".is-selected")?.scrollIntoView({ block: "nearest" });
    }
  }

  function choose(value) {
    const next = options.find((o) => o.value === value) || null;
    const changed = (next?.value ?? "") !== (selected?.value ?? "");
    selected = next;
    renderLabel();
    setOpen(false);
    if (changed && onChange) onChange(api.value);
  }

  trigger.addEventListener("click", () => setOpen(!open));

  searchInput.addEventListener("input", renderList);

  listEl.addEventListener("click", (e) => {
    const li = e.target.closest(".sl-select-option");
    if (li) choose(li.dataset.value);
  });

  document.addEventListener("click", (e) => {
    if (open && !container.contains(e.target)) setOpen(false);
  });

  container.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && open) {
      setOpen(false);
      trigger.focus();
    }
  });

  const api = {
    get value() {
      return selected ? selected.value : "";
    },
    setOptions(list) {
      options = [...list].sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
      );
      selected = options[0] || null;
      renderLabel();
      renderList();
    },
    setDisabled(disabled) {
      trigger.disabled = disabled;
      container.classList.toggle("is-disabled", disabled);
      if (disabled) setOpen(false);
    },
    setPlaceholder(text) {
      placeholder = text;
      if (!selected) renderLabel();
    },
  };

  renderLabel();
  return api;
}
