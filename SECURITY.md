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
- [x] Contact form **disabled** pending backend + inbox setup — parked in an
      inert `<template id="contactFormMarkup">`, so no personal data is collected.
      Privacy Policy page notes this.
- [x] Form markup keeps a required consent checkbox and a honeypot (`_gotcha`)
      for when it is re-enabled.
- [ ] Before re-enabling: work through the **Formspree** section below and
      replace `YOUR_FORM_ID` in the form `action` with the real form ID.

## Cloudflare (edge) — set in the dashboard or via API

- [ ] SSL/TLS mode = **Full (Strict)** (never Flexible).
- [ ] **Always Use HTTPS** = On.
- [ ] **Automatic HTTPS Rewrites** = On.
- [ ] **Minimum TLS Version** = 1.2.
- [ ] **HSTS** enabled: max-age ≥ 6 months, includeSubDomains. Add `preload`
      after a few weeks of confidence.
- [ ] Response header rule adding:
      `X-Content-Type-Options: nosniff`,
      `X-Frame-Options: DENY`,
      `Referrer-Policy: strict-origin-when-cross-origin`,
      `Permissions-Policy: geolocation=(), camera=(), microphone=()`,
      `Content-Security-Policy` (same as the meta tag, plus `frame-ancestors 'none'`).
- [ ] **Bot Fight Mode** = On; Cloudflare Managed WAF ruleset = On.
- [ ] Rate-limit rule on the zone (e.g. 20 req / 10s / IP) as abuse insurance.
- [ ] All DNS records **proxied** (orange cloud).
- [ ] **DNSSEC** = On (add the DS record at the registrar).
- [ ] **CAA** records restricting issuance to the CAs actually used
      (Let's Encrypt / Google Trust Services / Cloudflare).

## DNS / email

- [ ] SPF, DKIM, and `DMARC p=reject` for `thegrantkey.com` so the domain can't
      be spoofed. If no mailbox is hosted, publish `v=spf1 -all` + a null MX.

## Domain registrar

- [ ] Registrar lock enabled.
- [ ] 2FA on the registrar account.
- [ ] WHOIS privacy on.

## GitHub

- [ ] 2FA on the account that owns this repo.
- [ ] Pages → **Enforce HTTPS** = On.
- [ ] Settings → Pages → **Verify** the custom domain (blocks another repo from
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
