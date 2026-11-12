# Hospital website

A fast, mobile-friendly public website for the hospital: home page, **online appointment booking** and a **login** page for
patients and staff. It is plain HTML, CSS and JavaScript — no build step, no framework — so it can be hosted for free on any
static host (Cloudflare Pages, Netlify, GitHub Pages, or next to the app). It follows the same approach as the QMSofts
platform (`_headers`, one `config.js`, nothing to install).

```
index.html   home: hero, hours, departments, live doctor list, why us, FAQ, contact
book.html    online appointment booking (direct or request mode — set in the hospital system)
login.html   login chooser: Patient login (WhatsApp code) and Staff login
privacy.html draft privacy page (have it reviewed)
config.js    the only file you normally edit
assets/      site.css, site.js (shared), home.js, book.js, login.js, favicon.svg
_headers     security headers for Cloudflare Pages / Netlify
```

## How it connects to the hospital system
The site reads only the hospital system's **public** endpoints (no password, no key in the browser):

| What the site shows | Where it comes from |
|---|---|
| Hospital name, tagline, logo, phone, WhatsApp, address, email, map link | Settings → Hospital profile (empty fields fall back to `config.js`) |
| Doctors (name, department, qualification, fee) | Staff page — doctors appear on the site automatically |
| Days and times offered, taken slots | each doctor's working days / hours and the bookings already made |
| Booking mode, days ahead, cut-off, consent text | Settings → Online booking |
| Bookings | `direct`: the slot is booked at once and shows on Appointments. `request`: it appears on **Booking requests** for the front desk to confirm |

The fee is read from the doctor's record on the server; the site takes no payment. The server checks every booking again
(working hours, double-booking, rate limits), so the page cannot be used to bypass any rule.

## Set it up (about 10 minutes)
1. **Edit `config.js`**
   - `slug` — your hospital code (the one used on the login page).
   - `apiBase` — the address of the hospital system's backend.
   - `appUrl` — where the app is hosted (for example `https://app.yourhospital.com`). The Login buttons use it; leave it empty
     and they say login is not switched on yet.
   - Phone, WhatsApp, hours, departments, FAQ and the other text — change freely.
2. **Allow the website to call the backend.** On the backend (Railway) set `CORS_ORIGINS` to include the website's address,
   for example `https://app.yourhospital.com,https://www.yourhospital.com`. (If it is unset, any site is allowed.)
3. **Choose the booking mode** in the app: Settings → Online booking → *direct* (books at once) or *request* (desk confirms).
   Fill in *Booking page address* with the website's `…/book.html` so it can be printed on bills.
4. **Fill in Settings → Hospital profile** (phone, address, WhatsApp number, map link, tagline, logo).
5. **Publish the `website` folder.**
   - *Cloudflare Pages*: connect the repository, **Framework: None**, **Build command: empty**, **Build output directory:
     `website`**. Add your domain under *Custom domains*.
   - *GitHub Pages* (free; already set up in this repository): the workflow `.github/workflows/website-pages.yml` publishes the
     `website` folder on every change to `main`. One-time: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
     The site is then at `https://<account>.github.io/<repository>/`. Add that **origin** (without the path), for example
     `https://manzoorqirat-boop.github.io`, to the backend's `CORS_ORIGINS` (step 2).
   - *Netlify*: publish directory `website`.
   - Any other static host: upload the folder's contents.

## Login from the website
The header's **Login** button (and `login.html`) offers two ways in, both opening the app with the hospital already chosen:
- **Patient login** → `<appUrl>/my/<slug>` — a one-time code sent to the patient's WhatsApp (shown only when the patient portal is
  switched on in Settings).
- **Staff login** → `<appUrl>/?hospital=<slug>` — the normal sign-in page, hospital code filled in.

Passwords are never typed on, or sent through, the website.

## Safe by design
- Text from the network is added to the page as plain text, never as HTML.
- No keys or passwords in the site; `_headers` sets a content-security policy and other protective headers.
- A hidden field and the server's rate limit slow down automated spam; the booking form's "slot taken" message never names the other patient.

## Test it on your computer
```
cd website
python3 -m http.server 4180      # then open http://localhost:4180
```
Point `apiBase` at a running backend (and add `http://localhost:4180` to its `CORS_ORIGINS`, or leave that unset).

## Next steps you might want
Hindi / Marathi text, doctor photos, an "online payment" step (the booking currently takes none), a blog or health-tips page.
