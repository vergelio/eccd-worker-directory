// netlify/functions/save-data.js
// Admin-only write endpoint. Requires a valid (unexpired) sessionToken from
// verify-otp.js. Saves the whole directory state as one JSON blob.

const { getStore } = require("@netlify/blobs");
const { verify } = require("./lib/auth");

const MAX_BYTES = 4 * 1024 * 1024; // sanity limit so a runaway photo upload can't break things

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json" };
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid request" }) };
  }

  const payload = verify(body.sessionToken);
  if (!payload || payload.role !== "admin" || Date.now() > payload.exp) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Not authorized" }) };
  }

  if (!body.data || typeof body.data !== "object") {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing data" }) };
  }

  const size = Buffer.byteLength(JSON.stringify(body.data), "utf8");
  if (size > MAX_BYTES) {
    return { statusCode: 413, headers, body: JSON.stringify({ error: "Data too large" }) };
  }

  try {
    const store = getStore("eccd-directory");
    await store.setJSON("state", body.data);
  } catch (err) {
    console.error("save-data error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Failed to save" }) };
  }

  return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
};
