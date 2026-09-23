// Vercel serverless function: GET /api/admin-users
// Mirrors netlify/functions/admin-users.cjs (Netlify Functions format) so
// the admin panel's "Users" section works the same way on either host —
// the frontend always calls /api/admin-users and each host serves it from
// its own equivalent function.
//
// Requires: ADMIN_PASSWORD, VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  const authHeader = req.headers.authorization || "";
  const providedPassword = authHeader.replace("Bearer ", "");

  if (!adminPassword || providedPassword !== adminPassword) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    res.status(500).json({ error: "Supabase not configured" });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw new Error(`Failed to fetch users: ${authError.message}`);

    const { data: allResults, error: resultsError } = await supabase
      .from("test_results")
      .select("user_id, score, total, percentage, completed_at");
    if (resultsError) throw new Error(`Failed to fetch results: ${resultsError.message}`);

    const userStats = {};
    (allResults || []).forEach((result) => {
      const uid = result.user_id;
      if (!userStats[uid]) {
        userStats[uid] = { totalTests: 0, totalScore: 0, bestScore: 0, lastTestAt: null };
      }
      userStats[uid].totalTests++;
      userStats[uid].totalScore += result.percentage;
      userStats[uid].bestScore = Math.max(userStats[uid].bestScore, result.percentage);
      if (!userStats[uid].lastTestAt || new Date(result.completed_at) > new Date(userStats[uid].lastTestAt)) {
        userStats[uid].lastTestAt = result.completed_at;
      }
    });

    const users = (authUsers.users || []).map((user) => {
      const stats = userStats[user.id] || { totalTests: 0, totalScore: 0, bestScore: 0, lastTestAt: null };
      const avgScore = stats.totalTests > 0 ? Math.round(stats.totalScore / stats.totalTests) : 0;
      return {
        id: user.id,
        email: user.email,
        displayName: user.user_metadata?.displayName || "",
        createdAt: user.created_at,
        lastSignIn: user.last_sign_in_at,
        totalTests: stats.totalTests,
        avgScore,
        bestScore: stats.bestScore,
        lastTestAt: stats.lastTestAt,
      };
    });

    users.sort((a, b) => {
      const dateA = new Date(a.lastTestAt || a.lastSignIn || a.createdAt);
      const dateB = new Date(b.lastTestAt || b.lastSignIn || b.createdAt);
      return dateB - dateA;
    });

    res.status(200).json({ users, total: users.length, note: "Admin users endpoint - fetched successfully" });
  } catch (err) {
    console.error("Admin users error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
}
