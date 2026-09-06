/* The Grant Key — contact form handler.
 *
 * Cloudflare Worker on the route  thegrantkey.com/api/contact
 * (everything else on the domain falls through to GitHub Pages).
 *
 * Flow: same-origin check -> honeypot -> Cloudflare Turnstile -> validate ->
 *       send one plain-text email via Email Routing. Nothing is stored.
 *
 * Bindings / vars (see wrangler.toml + README.md):
 *   CONTACT_EMAIL     send_email binding
 *   TURNSTILE_SECRET  secret  (wrangler secret put TURNSTILE_SECRET)
 *   FROM_ADDRESS      var     e.g. form@thegrantkey.com
 *   CONTACT_TO        var     a VERIFIED Email Routing destination address
 */

import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";

const ALLOWED_HOST = "thegrantkey.com";
const MAX_FIELD = 5000; // per-field character cap
const MAX_TOTAL = 20000; // whole-payload character cap

const REQUIRED = [
  "Your Name",
  "Your Email",
  "Business Name",
  "Industry",
  "Location",
  "Time In Business",
  "Goal",
  "Consent",
];
const OPTIONAL = ["Revenue", "Women-Owned", "More Info"];

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function sameOrigin(request) {
  const ref = request.headers.get("Origin") || request.headers.get("Referer") || "";
  try {
    return new URL(ref).host === ALLOWED_HOST;
  } catch {
    return false;
  }
}

async function verifyTurnstile(token, ip, secret) {
  if (!token || !secret) return false;
  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (ip) body.append("remoteip", ip);
  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body },
  );
  const data = await res.json().catch(() => ({}));
  return data.success === true;
}

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return json(405, { ok: false, error: "method_not_allowed" });
    }
    if (!sameOrigin(request)) {
      return json(403, { ok: false, error: "bad_origin" });
    }

    let form;
    try {
      form = await request.formData();
    } catch {
      return json(400, { ok: false, error: "bad_request" });
    }

    // Honeypot: a real browser leaves this empty. Bots fill it. Drop silently.
    if ((form.get("_gotcha") || "").toString().trim() !== "") {
      return json(200, { ok: true });
    }

    const ip = request.headers.get("CF-Connecting-IP") || "";
    const passed = await verifyTurnstile(
      form.get("cf-turnstile-response"),
      ip,
      env.TURNSTILE_SECRET,
    );
    if (!passed) {
      return json(400, { ok: false, error: "challenge_failed" });
    }

    // Collect, trim, cap.
    const data = {};
    let total = 0;
    for (const key of [...REQUIRED, ...OPTIONAL]) {
      let v = (form.get(key) ?? "").toString().trim();
      if (v.length > MAX_FIELD) v = v.slice(0, MAX_FIELD);
      total += v.length;
      data[key] = v;
    }
    if (total > MAX_TOTAL) {
      return json(413, { ok: false, error: "too_large" });
    }
    for (const key of REQUIRED) {
      if (!data[key]) return json(422, { ok: false, error: "missing_fields" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data["Your Email"])) {
      return json(422, { ok: false, error: "bad_email" });
    }

    const bodyText = [
      `Name:             ${data["Your Name"]}`,
      `Email:            ${data["Your Email"]}`,
      `Business:         ${data["Business Name"]}`,
      `Industry:         ${data["Industry"]}`,
      `Location:         ${data["Location"]}`,
      `Time in business: ${data["Time In Business"]}`,
      `Revenue:          ${data["Revenue"] || "—"}`,
      `Women-owned:      ${data["Women-Owned"] || "—"}`,
      "",
      "Goal:",
      data["Goal"],
      "",
      "Anything else:",
      data["More Info"] || "—",
      "",
      "— submitted via the thegrantkey.com contact form",
    ].join("\n");

    const mime = createMimeMessage();
    mime.setSender({ name: "The Grant Key form", addr: env.FROM_ADDRESS });
    mime.setRecipient(env.CONTACT_TO);
    mime.setSubject(`New Grant Key inquiry — ${data["Your Name"]}`.slice(0, 200));
    mime.setHeader("Reply-To", data["Your Email"]);
    mime.addMessage({ contentType: "text/plain", data: bodyText });

    try {
      await env.CONTACT_EMAIL.send(
        new EmailMessage(env.FROM_ADDRESS, env.CONTACT_TO, mime.asRaw()),
      );
    } catch (err) {
      console.error("send failed:", err && err.message);
      return json(502, { ok: false, error: "send_failed" });
    }

    return json(200, { ok: true });
  },
};
