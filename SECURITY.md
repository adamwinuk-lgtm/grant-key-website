# Security

## Reporting a problem

Email **hello@thegrantkey.com** with "SECURITY" in the subject. This is a
one-person student project; expect a reply within a few days.

## Architecture (what there is to secure)

- One static `index.html` + `assets/app.js` + an image. No backend, no database,
  no build step, no dependencies.
- Served by **GitHub Pages** (`CNAME`, `.nojekyll`), proxied through
  **Cloudflare** at `thegrantkey.com`.
- The contact form is **currently disabled** — its markup is parked in an inert
  `<template>` in `index.html` and collects nothing. When re-enabled it will post
  to **Formspree**, which emails submissions to `hello@thegrantkey.com`.

The real risk is takeover of the GitHub, Cloudflare, registrar, or Formspree
accounts — not code injection. The checklist below reflects that.

## In-repo controls (done in this repo)

- [x] No inline JavaScript or inline event handlers — all script is in
      `assets/app.js`, loaded with `script-src 'self'`.
- [x] `Content-Security-Policy` meta tag in `index.html` (script/style/img/font/
      connect/form-action locked down). A stronger copy should also be sent as an
      HTTP header from Cloudflare (see below).
- [x] `referrer` meta set to `strict-origin-when-cross-origin`.
- [x] Fonts self-hosted from `assets/fonts/` — no Google Fonts, no third-party
      CDN. CSP `style-src`/`font-src` are `'self'` only.
- [x] Contact form **disabled** pending backend + inbox setup — parked in an
      inert `<template id="contactFormMarkup">`, so no personal data is collected.
      Privacy Policy page notes this.
- [x] Form markup keeps a required consent checkbox and a honeypot (`_gotcha`)
      for when it is re-enabled.
- [ ] Before re-enabling: work through the **Formspree** section below and
      replace `YOUR_FORM_ID` in the form `action` with the real form ID.

## Cloudflare (edge)

- [x] SSL/TLS mode = **Full (Strict)**.
- [x] **Always Use HTTPS** = On.
- [x] **Automatic HTTPS Rewrites** = On.
- [x] **Minimum TLS Version** = 1.2 (TLS 1.3 also on).
- [x] **HSTS** enabled: `max-age=15552000`, `includeSubDomains`, `nosniff`.
      `preload` intentionally NOT set yet — add after a few weeks of confidence.
- [x] Response-header rule adds `X-Frame-Options: DENY`,
      `Referrer-Policy: strict-origin-when-cross-origin`,
      `Permissions-Policy: geolocation=(), camera=(), microphone=()`, and a
      `Content-Security-Policy` (adds `frame-ancestors 'none'` on top of the
      meta tag). `X-Content-Type-Options: nosniff` comes from the HSTS setting.
      **Re-sync this header after the self-hosted-fonts change** — new value:
      `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self' https://formspree.io; form-action https://formspree.io; base-uri 'self'; frame-ancestors 'none'; object-src 'none'`
- [x] **Bot Fight Mode** = On; Free Managed WAF ruleset on by default.
- [x] Rate-limit rule: ~100 req / 10s / IP, action Block (Free-plan fixed 10s),
      match `http.host` in {`thegrantkey.com`, `www.thegrantkey.com`}.
- [x] All DNS records **proxied** (orange cloud).
- [x] **DNSSEC** = On; DS record auto-published (Cloudflare is the registrar).
- [ ] **CAA** records — deferred; add once the issuing CAs (GitHub Pages +
      Cloudflare) are confirmed, or they can block cert renewal.

## DNS / email

- [x] Inbound: **Cloudflare Email Routing** — `hello@thegrantkey.com` forwards to
      a verified mailbox (MX = `route{1,2,3}.mx.cloudflare.net`).
- [x] Anti-spoofing (domain sends no outbound mail):
      SPF `v=spf1 include:_spf.mx.cloudflare.net ~all`,
      DKIM `*._domainkey` = `v=DKIM1; p=` (all keys revoked),
      DMARC `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s`.

## Domain registrar (Cloudflare Registrar)

- [x] Registrar/transfer lock — on by default.
- [x] WHOIS privacy — always on, cannot be disabled.
- [x] 2FA — on the Cloudflare account (also covers DNS + edge).
- [ ] Confirm **auto-renew** is on with a valid payment method.

## GitHub

- [x] 2FA on the account that owns this repo.
- [x] Pages → **Enforce HTTPS** = On.
- [x] Settings → Pages → custom domain **verified** (blocks another repo from
      claiming `thegrantkey.com` if Pages is ever disabled).
- [ ] Branch protection on `main`: require PR, no force-push.
- [ ] Secret scanning + push protection = On.
- [ ] Keep the Pages site enabled — deleting the repo while Cloudflare still
      points at GitHub opens a subdomain-takeover window.

## Formspree

- [ ] Real form endpoint configured (see in-repo checklist).
- [ ] hCaptcha or reCAPTCHA enabled on the form, or Cloudflare Turnstile.
- [ ] 2FA on the Formspree account (submissions contain personal data).
- [ ] Accept Formspree's DPA; set a submission retention limit.

## History note

`IMG_1050.jpeg` was committed and later removed but remains in git history on a
public repo. Decide whether that needs a history rewrite.
