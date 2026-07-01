# ECCD Worker Directory — Deployment Guide (Netlify + OTP Login via Gmail)

## Unsa ang nabag-o
- Ang admin login karon dili na plain password. Nag-usab kini ngadto sa **OTP
  (one-time 6-digit code) nga ipadala sa Gmail** sa admin.
- Wala nay password nga naka-hardcode sa `index.html`. Ang pag-verify sa code
  nahitabo sa server side (Netlify Functions), dili sa browser — dili na
  makita bisan i-"View Source" pa.
- **Dili na mawala ang datos pag-refresh.** Ang tibuok directory (workers,
  profile, contacts, photos, ug uban pa) gi-save na sa **Netlify Blobs**
  (built-in storage sa Netlify, walay kinahanglan ilang account/database).
  Kada mag-edit ang admin, automatic na ma-save (mo-huwat lang ug ~1 segundo
  human sa last edit para dili sobra kadaghan ang pag-save).
- Naa nay 5 ka gagmay nga serverless functions:
  - `netlify/functions/send-otp.js` — nagpadala sa code sa Gmail
  - `netlify/functions/verify-otp.js` — nag-check sa code
  - `netlify/functions/check-session.js` — nag-check kung valid pa ang login
    pagkahuman og refresh sa page
  - `netlify/functions/get-data.js` — nagbasa sa saved directory data
    (public, kay pwede tan-awon sa tanan bisan dili admin)
  - `netlify/functions/save-data.js` — nagsave sa bag-ong data
    (admin-only — nag-check una sa valid session token)

## Step 1 — Gmail App Password
Kinahanglan nimo ug **App Password** (dili ang normal nga password sa Gmail):

1. I-on ang **2-Step Verification** sa Gmail account nga gamiton (
   Google Account → Security → 2-Step Verification).
2. Adto sa https://myaccount.google.com/apppasswords
3. Buhat ug bag-ong App Password (pilia "Mail" / "Other"), kopyaha ang
   16-character code nga ihatag niini.

## Step 2 — I-push sa GitHub (o i-drag diretso sa Netlify)
Kung gamiton ang GitHub → Netlify auto-deploy:
```
git init
git add .
git commit -m "ECCD worker directory with OTP admin login"
git remote add origin <your-repo-url>
git push -u origin main
```
O kung dili ganahan mo-gamit GitHub, pwede lang i-drag-drop ang tibuok folder
sa Netlify dashboard (Sites → "Add new site" → "Deploy manually").

## Step 3 — Netlify setup
1. Netlify dashboard → **Add new site** → i-connect ang repo (o drag-drop).
2. **Build settings:** wala nay kinahanglan build command; "Publish directory"
   = `.` (already set sa `netlify.toml`).
3. Adto sa **Site settings → Environment variables**, dugangi kini nga upat:

   | Key | Value |
   |---|---|
   | `ADMIN_EMAIL` | ang Gmail sa admin, e.g. `eccd.calatrava@gmail.com` |
   | `GMAIL_USER` | Gmail nga magpadala sa code (pwede pareho ra sa ADMIN_EMAIL) |
   | `GMAIL_APP_PASSWORD` | ang 16-character App Password gikan sa Step 1 |
   | `OTP_SECRET` | random long string — himoa via `openssl rand -hex 32` |

   (Tan-awa ang `.env.example` para sa reference — kani na file kay reference
   lang, dili ni-basa sa Netlify. Ang mga values kinahanglan i-type diretso
   sa Netlify dashboard.)
4. I-deploy (Trigger deploy / Deploy site).

## Step 4 — Test
1. Adto sa live URL nga gihatag ni Netlify (e.g. `your-site.netlify.app`).
2. Click "Admin Log In" (o ang lock icon sa intro screen).
3. Isulat ang admin Gmail → "Send Code" → susiha ang inbox (ug Spam folder)
   sa mao gihapon nga Gmail → isulat ang 6-digit code → "Log In".
4. Kung successful, mo-refresh ang page, magpabilin ang login (session valid
   for 12 hours) tungod sa `check-session` function.

## Mahinungdanon nga note
Ang mga litrato (worker photos, partner logos, intro slides na gi-upload)
gi-store isip base64 diretso sa JSON data — okay ni para sa pipila ka
litrato, pero kung modaghan na kaayo ang gi-upload nga hi-res photos, pwede
kini modako ang saved data (naa'y 4MB nga safety limit sa `save-data.js`).
Kung moabot na mo ana nga punto, ang sunod nga lakang mao ang pag-store sa
mga litrato separately (Netlify Blobs pud pero per-file) imbis ilakip sa
main JSON. Ipahibalo lang kung kinahanglan na ni i-setup.
