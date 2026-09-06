# Contact form Worker

Replaces Formspree. A Cloudflare Worker on `thegrantkey.com/api/contact` that
takes the form POST, checks a Cloudflare Turnstile token + honeypot, and emails
the submission to a verified address via Email Routing. No third party, no API
keys, nothing stored.

Everything else on the domain is still served by GitHub Pages — the Worker only
claims the one path.

## One-time setup

### 1. Verified destination address

Cloudflare dashboard → **Email → Email Routing → Destination addresses**.
Confirm the address you want form mail delivered to is listed and **Verified**
(this is almost certainly the same address `hello@thegrantkey.com` already
forwards to).

This address is **not** stored in the repo — it goes in as a secret:

```sh
npx wrangler secret put CONTACT_TO      # enter the verified address
```

The `send_email` binding in `wrangler.toml` is left unrestricted so the address
stays out of this public file; it can still only deliver to a verified
destination address, and the code only ever sends to `CONTACT_TO`.

`FROM_ADDRESS` (`form@thegrantkey.com`) does not need to be a real mailbox.

### 2. Turnstile widget

Cloudflare dashboard → **Turnstile → Add widget**:

- Domain: `thegrantkey.com`
- Mode: **Managed**

You get two keys:

| Key | Where it goes |
|---|---|
| **Site key** (public) | the site HTML, in PR to re-enable the form |
| **Secret key** | Worker secret (next step) — never commit it |

For local `curl` testing you can use Cloudflare's always-passes test keys:
site `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`.

### 3. Install + authenticate

```sh
cd worker
npm install
npx wrangler login        # or export CLOUDFLARE_API_TOKEN=...
```

Token scopes if using a token: **Account · Workers Scripts · Edit**,
**Zone · Workers Routes · Edit**, **Zone · Zone · Read**.

### 4. Set the secret and deploy

```sh
npx wrangler secret put TURNSTILE_SECRET   # paste the Turnstile secret key
npx wrangler deploy
```

## Test before wiring up the form

Deploy once with the **test** Turnstile secret, then:

```sh
curl -i https://thegrantkey.com/api/contact \
  -X POST \
  -H 'Origin: https://thegrantkey.com' \
  -F 'Your Name=Test Person' \
  -F 'Your Email=you@example.com' \
  -F 'Business Name=Test Co' \
  -F 'Industry=bakery' \
  -F 'Location=Irvine, CA' \
  -F 'Time In Business=1–3 years' \
  -F 'Goal=Testing the worker' \
  -F 'Consent=Agreed to Privacy Policy' \
  -F 'cf-turnstile-response=dummy'
```

Expect `HTTP/2 200` and `{"ok":true}`, and an email in the destination inbox.
Then run `npx wrangler secret put TURNSTILE_SECRET` again with the **real**
secret and redeploy.

## Responses

| Status | body | meaning |
|---|---|---|
| 200 | `{"ok":true}` | accepted (also returned for a tripped honeypot) |
| 400 | `{"ok":false,"error":"challenge_failed"}` | Turnstile failed |
| 403 | `{"ok":false,"error":"bad_origin"}` | request not from thegrantkey.com |
| 405 | `{"ok":false,"error":"method_not_allowed"}` | not a POST |
| 422 | `{"ok":false,"error":"missing_fields"\|"bad_email"}` | validation |
| 502 | `{"ok":false,"error":"send_failed"}` | Email Routing rejected the send |

## After it's verified

Merge the follow-up PR that un-parks the form, points it at `/api/contact`,
adds the Turnstile widget with the **site key**, and updates the CSP
(`script-src` / `frame-src` / `connect-src` gain `https://challenges.cloudflare.com`;
`form-action` / `connect-src` drop `https://formspree.io`).
