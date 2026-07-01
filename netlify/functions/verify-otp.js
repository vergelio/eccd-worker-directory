// netlify/functions/verify-otp.js
// Verifies the code the user typed against the signed token from send-otp.js,
// then issues a short-lived signed session token the frontend can hold onto
// (in localStorage) to know the admin is logged in.

const crypto = require("crypto");

const OTP_SECRET = process.env.OTP_SECRET;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", OTP_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verify(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", OTP_SECRET).update(body).digest("base64url");
  // constant-time compare
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
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid request" }) };
  }

  const { token, code } = body;
  const payload = verify(token);

  if (!payload) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Invalid or expired code" }) };
  }
  if (Date.now() > payload.exp) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Code expired. Request a new one." }) };
  }
  if (String(code).trim() !== payload.code) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Wrong code" }) };
  }

  const sessionToken = sign({ role: "admin", email: payload.email, exp: Date.now() + SESSION_TTL_MS });
  return { statusCode: 200, headers, body: JSON.stringify({ ok: true, sessionToken, exp: Date.now() + SESSION_TTL_MS }) };
};
