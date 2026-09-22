/**
 * Admin Users - Fetch all users and their stats
 * Requires admin authentication
 */

const { createClient } = require("@supabase/supabase-js");

exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers, body: "Method not allowed" };
  }

  // Check admin password
  const adminPassword = process.env.ADMIN_PASSWORD;
  const authHeader = event.headers.authorization || "";
  const providedPassword = authHeader.replace("Bearer ", "");

  if (!adminPassword || providedPassword !== adminPassword) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }

  // Initialize Supabase (service role key for admin access)
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Supabase not configured" }),
    };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Fetch all users from auth.users (requires service role key)
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      throw new Error(`Failed to fetch users: ${authError.message}`);
    }

    // Fetch test results for all users
    const { data: allResults, error: resultsError } = await supabase
      .from("test_results")
      .select("user_id, score, total, percentage, completed_at");

    if (resultsError) {
      throw new Error(`Failed to fetch results: ${resultsError.message}`);
    }

    // Aggregate stats per user
    const userStats = {};
    (allResults || []).forEach((result) => {
      const uid = result.user_id;
      if (!userStats[uid]) {
        userStats[uid] = {
          totalTests: 0,
          totalScore: 0,
          bestScore: 0,
          lastTestAt: null,
        };
      }
      userStats[uid].totalTests++;
      userStats[uid].totalScore += result.percentage;
      userStats[uid].bestScore = Math.max(userStats[uid].bestScore, result.percentage);
      if (
        !userStats[uid].lastTestAt ||
        new Date(result.completed_at) > new Date(userStats[uid].lastTestAt)
      ) {
        userStats[uid].lastTestAt = result.completed_at;
      }
    });

    // Combine user info with stats
    const users = (authUsers.users || []).map((user) => {
      const stats = userStats[user.id] || {
        totalTests: 0,
        totalScore: 0,
        bestScore: 0,
        lastTestAt: null,
      };
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

    // Sort by most recent activity
    users.sort((a, b) => {
      const dateA = new Date(a.lastTestAt || a.lastSignIn || a.createdAt);
      const dateB = new Date(b.lastTestAt || b.lastSignIn || b.createdAt);
      return dateB - dateA;
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        users,
        total: users.length,
        note: "Admin users endpoint - fetched successfully",
      }),
    };
  } catch (err) {
    console.error("Admin users error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || "Internal server error" }),
    };
  }
};
