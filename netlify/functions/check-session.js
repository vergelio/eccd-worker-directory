// netlify/functions/check-session.js
// Lets the frontend confirm a stored sessionToken (in localStorage) is still
// valid/unexpired after a page reload, without re-sending an OTP.

const crypto = require("crypto");
const OTP_SECRET = process.env.OTP_SECRET;

function verify(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", OTP_SECRET).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json" };
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  if (!OTP_SECRET) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server not configured" }) };
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { body = {}; }

  const payload = verify(body.sessionToken);
  const valid = !!payload && payload.role === "admin" && Date.now() < payload.exp;

  return { statusCode: 200, headers, body: JSON.stringify({ valid }) };
};
