/* ------------------------------------------------------------------ */
/*  TEST RESULTS SYNC                                                   */
/*  Save user test results to Supabase (when authenticated).           */
/*  Falls back gracefully to localStorage-only when offline/anon.      */
/* ------------------------------------------------------------------ */

import { getSupabase } from "./supabase";

/**
 * Save a test result to Supabase.
 * Returns { success, error }
 */
export async function saveTestResult(userId, result) {
  const supabase = getSupabase();
  if (!supabase || !userId) {
    return { success: false, error: "Not authenticated or Supabase not configured" };
  }

  const { data, error } = await supabase
    .from("test_results")
    .insert({
      user_id: userId,
      level: result.level,
      categories: result.categories,
      score: result.score,
      total: result.total,
      percentage: result.pct,
      estimated_level: result.estLevel,
      completed_at: new Date().toISOString(),
    });

  if (error) {
    console.error("Failed to save test result:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Fetch user's test history from Supabase.
 * Returns { results, error }
 */
export async function fetchTestResults(userId, limit = 100) {
  const supabase = getSupabase();
  if (!supabase || !userId) {
    return { results: [], error: "Not authenticated or Supabase not configured" };
  }

  const { data, error } = await supabase
    .from("test_results")
    .select("*")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch test results:", error);
    return { results: [], error: error.message };
  }

  return { results: data || [], error: null };
}

/**
 * Get user statistics (total tests, average score, best score).
 * Returns { stats, error }
 */
export async function getUserStats(userId) {
  const supabase = getSupabase();
  if (!supabase || !userId) {
    return { stats: null, error: "Not authenticated or Supabase not configured" };
  }

  const { data, error } = await supabase
    .from("test_results")
    .select("score, total, percentage")
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to fetch user stats:", error);
    return { stats: null, error: error.message };
  }

  const results = data || [];
  const totalTests = results.length;
  const avgScore = totalTests > 0
    ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / totalTests)
    : 0;
  const bestScore = totalTests > 0
    ? Math.max(...results.map(r => r.percentage))
    : 0;

  return {
    stats: {
      totalTests,
      avgScore,
      bestScore,
    },
    error: null,
  };
}
