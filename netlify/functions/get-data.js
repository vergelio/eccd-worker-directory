// netlify/functions/get-data.js
// Public read endpoint — returns the saved directory state (workers,
// org profile, etc.) from Netlify Blobs, or {data:null} on first run so the
// frontend falls back to its built-in seed data.

const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json" };
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const store = getStore("eccd-directory");
    const data = await store.get("state", { type: "json" });
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, data: data || null }) };
  } catch (err) {
    console.error("get-data error:", err);
    // Fail soft: let the frontend use its local defaults rather than break the page.
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, data: null }) };
  }
};
