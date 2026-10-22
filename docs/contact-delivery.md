# Activate protected contact delivery

The approved contact configuration now enables delivery in `wrangler.jsonc` for the existing Worker `auditores`, using `jzavala@jjconsultores.pe` as sender. The static form becomes active when a public Turnstile key is provided at build time, unless explicitly disabled. Deployment and provider/inbox verification are still separate steps. Tests send no real email.

## Required Cloudflare settings

Open **Workers & Pages > auditores > Settings**:

- **Build > Variables and secrets:** add `PUBLIC_TURNSTILE_SITE_KEY` with the public site key from the production Turnstile widget. Set `PUBLIC_CONTACT_ENABLED=true` if this variable already exists as `false`; it can otherwise be omitted. Runtime-only values cannot populate the generated Astro HTML. Never copy either private key here.
- **Variables and Secrets > Production:** keep `RESEND_API_KEY` and `TURNSTILE_SECRET_KEY` as encrypted **Secret** entries. The source declares `CONTACT_ENABLED=true`, `CONTACT_ORIGIN=https://jjconsultores.pe` and `RESEND_FROM=jzavala@jjconsultores.pe`; these non-secret values take effect on deployment.
- Rebuild and deploy the approved source through the existing GitHub integration after saving the build settings. Confirm the Turnstile widget allows `jjconsultores.pe` and the Resend key has sending access to that verified domain. Never use the secret key as the public site key.

## Configure the existing Worker

1. Keep the existing GitHub commands: build `npm run build`, deploy `npx wrangler deploy`. The active configuration targets `auditores`, runs `worker/contact.mjs` for `/api/*` and serves `./dist` through `ASSETS`. Do not deploy the separate placeholder example.
2. Custom domains/routes remain dashboard-managed; no DNS or route definitions are added. `workers_dev=false` avoids exposing an additional direct workers.dev endpoint. `keep_vars=true` preserves dashboard runtime variables not explicitly declared in source, and encrypted secrets are not deleted by deployments.
3. The configuration declares two rate-limit namespaces, `2026102201` (per IP) and `2026102202` (shared), reserved here for this form. Their uniqueness across unrelated Workers in the account was not inspected; do not reuse these IDs elsewhere. Initial limits are 3 and 30 requests per minute respectively. Counters are approximate and per location, **not hard global/daily quotas**. Tune after observing legitimate usage; configure provider limits/alerts separately.
4. The source declares runtime `CONTACT_ORIGIN=https://jjconsultores.pe`, `CONTACT_ENABLED=true` and `RESEND_FROM=jzavala@jjconsultores.pe`. The sender uses the existing company address and must be authorized by the verified Resend domain. Dashboard-only changes to these declared values are overwritten by the next deployment; edit source for permanent changes.
5. Revoke/rotate any credentials previously exposed in screenshots. Remove the old values from Build settings. Store replacement `RESEND_API_KEY` and `TURNSTILE_SECRET_KEY` under the Worker's **Settings > Variables and Secrets**, type **Secret**, not Build variables. Never put secret values in GitHub source, `PUBLIC_` variables, chat, screenshots or client code. Use a sending-only Resend key scoped to the verified domain.

No SDK, adapter, database or provider account is added. The authorized connected-branch deployment will adopt `wrangler.jsonc` and attach its rate-limit bindings to the existing Worker. Local `npm run dev` previews Astro only; endpoint verification requires a Worker runtime. Wrangler must support `ratelimits` (4.36.0+).

After deployment, a GET to `/api/contact` should return JSON with status405 (POST required). With complete runtime settings, an empty JSON POST from the approved origin returns422 without contacting Turnstile or Resend;503 can mean disabled or incomplete configuration. These checks demonstrate routing/validation only, not email readiness.

## Verify Resend and Turnstile

- Add a sending domain/subdomain in Resend and add the exact DNS records it issues. Do not overwrite existing mailbox MX or SPF records. Review SPF, DKIM and aligned DMARC with the mailbox administrator before enforcement changes. An example sender is not proof of a verified or existing mailbox.
- Create a production Turnstile widget limited to the approved website hostname. The server requires a successful verification for that hostname and the `contact` action; expired/reused tokens are rejected. Keep development/test keys separate from production.
- The fixed recipients are `jzavala@jjconsultores.pe`, `contador44@hotmail.com` and `jzavalaolivares@gmail.com`; each accepted submission is addressed to all three using `to`. The visitor's validated address is only `Reply-To`. No autoresponder or visitor-selected destination exists. Confirm that all three destination mailboxes can receive messages independently. The two additional addresses do not replace the public website contact address.
- Review and approve the privacy notice and any required privacy-policy link before launch. The displayed short notice is not a legal compliance certification. Cloudflare processes verification data/IP; Resend processes email contents and may retain delivery records under its settings and terms. The Worker adds no database, submission logs or browser storage.

## Verify the enabled configuration

1. Set build variables `PUBLIC_CONTACT_ENABLED=true` and `PUBLIC_TURNSTILE_SITE_KEY` to the public widget key. These are separate from runtime secrets and from SEO's `PUBLIC_LAUNCH_READY` flag. Public form HTML is generated at build time; changing runtime variables alone cannot enable it.
2. The source switch is now `CONTACT_ENABLED=true`. Missing secrets, an invalid sender or absent rate-limit bindings still fail closed. A missing build key retains preview mode; a blocked verification script leaves the button disabled and the direct email link available.
3. Rebuild and deploy through the approved existing integration. Verify in a staging Worker first with separately configured hostname/origin/widget. Do not enable production from an unreviewed branch push.
4. Submit one authorized test and check Resend acceptance, its delivery/bounce status, the destination inbox/spam folder and Reply-To. Then test bad/expired verification, limits, provider rejection and an unavailable network. The UI reports **accepted for sending**, never guaranteed inbox delivery. Failed/uncertain responses preserve the fields and retain the submission identity for a retry; Resend deduplicates the same payload/key for 24 hours.
5. Confirm `/`, `/nosotros/` and `/servicios/` still serve normally, `/demo1/` remains absent, and no secrets are in HTML/JS. Check a mobile device and keyboard navigation. If CSP is configured remotely, allow the documented Turnstile script/frame/connect sources; do not disable CSP wholesale.

Rollback: turn dashboard runtime `CONTACT_ENABLED=false` immediately and keep the source value false, then rebuild with `PUBLIC_CONTACT_ENABLED=false` to restore the preview UI. No data migration or DNS removal is needed. Existing direct email/telephone links remain available.

## Local checks and limits

`node --test tests/contact-worker.test.mjs tests/contact-client.test.mjs` exercises the public fetch boundary with mocked provider responses and browser-controller behavior in a DOM harness. `npm test` additionally builds preview/enabled variants and verifies approval packaging cannot inherit contact activation or secrets. `npm run check` checks Astro. These do **not** prove actual Cloudflare bindings, provider authentication, DNS, legal compliance or inbox delivery.

Layered controls include a bounded JSON body, server field limits and service allowlist, exact origin guard, honeypot, both throttles, hostname/action-bound Turnstile, timeouts, plain-text email and stable idempotency keys. Origin checks and honeypots alone cannot stop attackers who call the endpoint directly; no protection guarantees zero spam. Filters on the destination mailbox still handle spam sent directly to the public email address.

## References

- [Worker asset routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/)
- [Cloudflare rate-limit bindings and limitations](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
- [Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Resend API](https://resend.com/docs/api-reference/emails/send-email) and [idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys)
