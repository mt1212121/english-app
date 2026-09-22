/* ------------------------------------------------------------------ */
/*  AUTH HELPERS                                                        */
/*  Wraps Supabase auth operations with fallback to localStorage-only  */
/*  mode when Supabase isn't configured.                               */
/* ------------------------------------------------------------------ */

import { getSupabase, isSupabaseReady } from "./supabase";

/**
 * Sign up a new user.
 * Returns { user, error }
 */
export async function signUp(email, password, metadata = {}) {
  const supabase = getSupabase();
  if (!supabase) {
    return { user: null, error: { message: "Supabase not configured" } };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata, // { displayName, etc }
    },
  });

  return { user: data?.user, error };
}

/**
 * Sign in existing user.
 * Returns { user, session, error }
 */
export async function signIn(email, password) {
  const supabase = getSupabase();
  if (!supabase) {
    return { user: null, session: null, error: { message: "Supabase not configured" } };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { user: data?.user, session: data?.session, error };
}

/**
 * Sign out current user.
 */
export async function signOut() {
  const supabase = getSupabase();
  if (!supabase) return { error: null };

  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Get current session.
 * Returns { session, user, error }
 */
export async function getSession() {
  const supabase = getSupabase();
  if (!supabase) {
    return { session: null, user: null, error: null };
  }

  const { data, error } = await supabase.auth.getSession();
  return { session: data?.session, user: data?.session?.user, error };
}

/**
 * Send password reset email.
 */
export async function resetPassword(email) {
  const supabase = getSupabase();
  if (!supabase) {
    return { error: { message: "Supabase not configured" } };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  return { error };
}

/**
 * Update password (when user is logged in or has reset token).
 */
export async function updatePassword(newPassword) {
  const supabase = getSupabase();
  if (!supabase) {
    return { error: { message: "Supabase not configured" } };
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  return { error };
}

/**
 * Update user metadata (displayName, avatar, etc).
 */
export async function updateUserMetadata(metadata) {
  const supabase = getSupabase();
  if (!supabase) {
    return { user: null, error: { message: "Supabase not configured" } };
  }

  const { data, error } = await supabase.auth.updateUser({
    data: metadata,
  });

  return { user: data?.user, error };
}

/**
 * Listen to auth state changes.
 * Returns unsubscribe function.
 */
export function onAuthStateChange(callback) {
  const supabase = getSupabase();
  if (!supabase) {
    // Call once with null to indicate no session
    callback(null, null);
    return () => {};
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return () => subscription.unsubscribe();
}

/**
 * Check if auth is available (env vars configured).
 */
export function isAuthAvailable() {
  return isSupabaseReady();
}
