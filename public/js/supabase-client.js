// SoftLedger — one Supabase client, imported by every page that needs it.
// Centralizing this means the SDK version and init logic live in one place.

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

// "Remember me" support: the flag itself always lives in localStorage
// (it's just a preference, not session data). Session tokens go to
// localStorage when remembered (persists after the browser closes) or
// sessionStorage when not (cleared when the tab/browser closes).
const REMEMBER_KEY = "sl_remember";

export function setRememberMe(remember) {
  localStorage.setItem(REMEMBER_KEY, remember ? "true" : "false");
}

function activeStorage() {
  return localStorage.getItem(REMEMBER_KEY) === "true" ? localStorage : sessionStorage;
}

const rememberAwareStorage = {
  getItem: (key) => activeStorage().getItem(key),
  setItem: (key, value) => activeStorage().setItem(key, value),
  removeItem: (key) => activeStorage().removeItem(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: rememberAwareStorage },
});
