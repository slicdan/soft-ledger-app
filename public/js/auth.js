// SoftLedger — auth actions. Pages call these; this file owns all Supabase auth calls.

import { supabase } from "./supabase-client.js";

export async function resetPassword(email) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password.html`,
  });
}

export async function signUp({ email, password, fullName }) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${window.location.origin}/login.html`,
    },
  });
}

export async function signIn({ email, password }) {
  return supabase.auth.signInWithPassword({ email, password });
}

// scope: "global" (default) revokes the refresh token server-side and signs
// out every device/session for this user, not just the current tab.
export async function signOut(scope = "global") {
  return supabase.auth.signOut({ scope });
}

// Redirects to login.html if there's no active session.
// Call on load of any page that requires the user to be signed in.
export async function requireAuth(destination = "login.html") {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    window.location.replace(destination);
    return null;
  }
  return data.session;
}
// Call on load of login.html / signup.html so a returning, still-signed-in
// user doesn't see the auth form again.
export async function redirectIfAuthenticated(destination = "dashboard.html") {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    window.location.replace(destination);
  }
}
