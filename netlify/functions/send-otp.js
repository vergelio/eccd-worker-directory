// netlify/functions/send-otp.js
// Generates a 6-digit OTP, emails it to the admin Gmail via Nodemailer/Gmail SMTP,
// and returns a signed, stateless token (no database needed) that verify-otp.js
// will check later. The actual code is never sent back to the browser.

const crypto = require("crypto");
const nodemailer = require("nodemailer");

const OTP_SECRET = process.env.OTP_SECRET;           // random long string, set in Netlify env vars
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;          // e.g. eccd.calatrava@gmail.com (the ONLY email allowed to log in)
const GMAIL_USER = process.env.GMAIL_USER;            // Gmail address used to SEND the mail (can be same as ADMIN_EMAIL)
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD; // 16-char Gmail App Password (NOT the normal password)

const OTP_TTL_MS = 5 * 60 * 1000; // code valid for 5 minutes

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", OTP_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json" };

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  if (!OTP_SECRET || !ADMIN_EMAIL || !GMAIL_USER || !GMAIL_APP_PASSWORD) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server not configured. Missing env vars." }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid request" }) };
  }

  const email = String(body.email || "").trim().toLowerCase();

  // Always respond the same way whether or not the email matches, so we don't
  // reveal which emails are valid admins to random probing.
  const genericOk = { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };

  if (email !== ADMIN_EMAIL.toLowerCase()) {
    // Don't send anything, don't error loudly — just pretend it worked.
    return genericOk;
  }

  const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  const payload = { email, code, exp: Date.now() + OTP_TTL_MS };
  const token = sign(payload);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });

  try {
    await transporter.sendMail({
      from: `"ECCD Worker Directory" <${GMAIL_USER}>`,
      to: email,
      subject: `Your admin login code: ${code}`,
      text: `Your ECCD Worker Directory admin login code is: ${code}\n\nThis code expires in 5 minutes. If you did not request this, ignore this email.`,
      html: `<p>Your <b>ECCD Worker Directory</b> admin login code is:</p>
             <p style="font-size:28px;font-weight:800;letter-spacing:4px;">${code}</p>
             <p>This code expires in 5 minutes. If you did not request this, ignore this email.</p>`,
    });
  } catch (err) {
    console.error("send-otp mail error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Failed to send email" }) };
  }

  return { statusCode: 200, headers, body: JSON.stringify({ ok: true, token }) };
};
