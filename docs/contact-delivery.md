# Activate protected contact delivery

The local implementation is ready for configuration, not proof of production delivery. Keep both contact switches off until the existing Worker, domain, provider and privacy information have been verified. No deployment or real email is performed by the tests.

## Configure the existing Worker

1. Back up the deployed Worker configuration. The repository did not previously declare its name, routes or build command. **Do not deploy the placeholder example as a new Worker or replace existing routes blindly.**
2. Merge `wrangler.contact.example.jsonc` into that configuration: `main` is `worker/contact.mjs`, assets are `./dist` with binding `ASSETS`, and `/api/*` runs the Worker first. Preserve the existing Worker name, domain and other bindings. The GitHub build remains `npm run build`. Deploying must publish both the Worker script and assets, not assets alone.
3. Allocate two unused rate-limit namespace IDs in the account. Suggested initial limits: 3 requests per minute per IP and 30 per minute for the form, via `CONTACT_IP_LIMITER` and `CONTACT_GLOBAL_LIMITER`. Cloudflare counters are approximate and per location, **not hard global/daily quotas**. Tune after observing legitimate usage; configure provider limits/alerts separately.
4. Set runtime `CONTACT_ORIGIN` to the exact approved HTTPS origin without a trailing slash. Set `RESEND_FROM` to an authorized single email address under `jjconsultores.pe` or its verified sending subdomain. Keep `CONTACT_ENABLED=false` initially.
5. Store `RESEND_API_KEY` and `TURNSTILE_SECRET_KEY` as encrypted Worker secrets. Never put them in GitHub source, `PUBLIC_` variables, chat, screenshots or client code. Use a sending-only Resend key scoped to the verified domain.

No SDK, adapter, database, dependency installation, provider account or remote resource is automatically added. The example intentionally is not named `wrangler.jsonc`, so a connected GitHub deployment cannot silently adopt it. Local `npm run dev` previews Astro only; actual endpoint verification requires a Worker runtime. Wrangler must support the `ratelimits` configuration (4.36.0+).

## Verify Resend and Turnstile

- Add a sending domain/subdomain in Resend and add the exact DNS records it issues. Do not overwrite existing mailbox MX or SPF records. Review SPF, DKIM and aligned DMARC with the mailbox administrator before enforcement changes. An example sender is not proof of a verified or existing mailbox.
- Create a production Turnstile widget limited to the approved website hostname. The server requires a successful verification for that hostname and the `contact` action; expired/reused tokens are rejected. Keep development/test keys separate from production.
- The recipient is fixed to `jzavala@jjconsultores.pe`; the visitor's validated address is only `Reply-To`. No autoresponder or visitor-selected destination exists. Confirm that the destination mailbox can receive messages independently.
- Review and approve the privacy notice and any required privacy-policy link before launch. The displayed short notice is not a legal compliance certification. Cloudflare processes verification data/IP; Resend processes email contents and may retain delivery records under its settings and terms. The Worker adds no database, submission logs or browser storage.

## Enable only after an authorized staging test

1. Set build variables `PUBLIC_CONTACT_ENABLED=true` and `PUBLIC_TURNSTILE_SITE_KEY` to the public widget key. These are separate from runtime secrets and from SEO's `PUBLIC_LAUNCH_READY` flag. Public form HTML is generated at build time; changing runtime variables alone cannot enable it.
2. Set runtime `CONTACT_ENABLED=true`. Missing secrets, bindings, valid sender or exact origin fail closed. A missing build key retains preview mode. A blocked verification script leaves the button disabled and the direct email link available.
3. Rebuild and deploy through the approved existing integration. Verify in a staging Worker first with separately configured hostname/origin/widget. Do not enable production from an unreviewed branch push.
4. Submit one authorized test and check Resend acceptance, its delivery/bounce status, the destination inbox/spam folder and Reply-To. Then test bad/expired verification, limits, provider rejection and an unavailable network. The UI reports **accepted for sending**, never guaranteed inbox delivery. Failed/uncertain responses preserve the fields and retain the submission identity for a retry; Resend deduplicates the same payload/key for 24 hours.
5. Confirm `/`, `/nosotros/` and `/servicios/` still serve normally, `/demo1/` remains absent, and no secrets are in HTML/JS. Check a mobile device and keyboard navigation. If CSP is configured remotely, allow the documented Turnstile script/frame/connect sources; do not disable CSP wholesale.

Rollback: turn runtime `CONTACT_ENABLED=false` immediately, then rebuild with `PUBLIC_CONTACT_ENABLED=false` to restore the preview UI. No data migration or DNS removal is needed. Existing direct email/telephone links remain available.

## Local checks and limits

`node --test tests/contact-worker.test.mjs tests/contact-client.test.mjs` exercises the public fetch boundary with mocked provider responses and browser-controller behavior in a DOM harness. `npm test` additionally builds preview/enabled variants and verifies approval packaging cannot inherit contact activation or secrets. `npm run check` checks Astro. These do **not** prove actual Cloudflare bindings, provider authentication, DNS, legal compliance or inbox delivery.

Layered controls include a bounded JSON body, server field limits and service allowlist, exact origin guard, honeypot, both throttles, hostname/action-bound Turnstile, timeouts, plain-text email and stable idempotency keys. Origin checks and honeypots alone cannot stop attackers who call the endpoint directly; no protection guarantees zero spam. Filters on the destination mailbox still handle spam sent directly to the public email address.

## References

- [Worker asset routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/)
- [Cloudflare rate-limit bindings and limitations](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
- [Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Resend API](https://resend.com/docs/api-reference/emails/send-email) and [idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys)
