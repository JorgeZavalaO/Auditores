# J&J CONSULTORES Y AUDITORES

Static, responsive Astro website for the confirmed Peruvian accounting and auditing firm. The selected design is now the primary site, with only three HTML routes:

| Route | Purpose |
| --- | --- |
| `/` | Commercial home, service overview and contact form |
| `/nosotros/` | Company background, mission, vision, eight values and CEO |
| `/servicios/` | Complete Word-based service portfolio and free diagnostic |

The previous demo URLs are removed rather than published as competing pages. Navigation, breadcrumbs and contact actions use the primary routes. This local promotion does not deploy the website or enable indexing automatically.

## Local development and verification

Requires Node.js 22.12 or newer; development has been verified with Node 24.

```sh
npm install
npm run dev
npm run check
npm test
npm run build
npm run preview
```

Open Astro's printed local URL. `npm test` uses Node's built-in runner and builds separate preview and launch-ready fixtures under `.astro/test-builds/`; fixture domains are not accessed or deployed. Checks cover the three-page route set, internal links and fragments, unique metadata, local assets, contact placement, the carousel, source-based company facts, CEO content and publication safeguards.

## Content and components

- `src/data/site.ts`: confirmed company identity, contact details, client marks, home services, process and FAQs.
- `src/data/aboutCompany.ts`: source-grounded company story, mission, vision, values and supplied CEO biography.
- `src/data/serviceCatalog.ts`: seven service/diagnostic categories from the supplied Word.
- `src/components/DemoOneLanding.astro`: retained selected home composition, including its polished hero image and client carousel.
- `src/components/AboutCompanyPage.astro`: institutional page and CEO profile.
- `src/components/ServicesPage.astro` and `ServiceCatalog.astro`: selected services design and reusable detailed catalog.
- `src/components/Header.astro`, `Footer.astro`, `Contact.astro`: navigation, consistent contact channels and safe form preview.
- `src/layouts/BaseLayout.astro`: shared language, per-page canonical/social URLs and one consistent business identity.
- `src/styles/global.css`: visual tokens and responsive layouts; primary color `#0A1267`.
- `config/site.mjs`: domain validation and explicit launch gate.

The supplied Word, reference image, original logos and photographs remain unchanged. The partners' experience is not represented as the firm's age; no founding date, address, credentials, reviews or testimonials were invented. The CEO profile uses the supplied portrait of Jorge Luis Zavala Félix. Other illustrative photographs are identified as such.

## Contact channels and form status

The public channels are `jzavala@jjconsultores.pe` and `+51 956 481 871`, with working email and telephone links throughout the three-page site.

**Contact delivery is enabled in the approved Worker configuration.** The static form requires `PUBLIC_TURNSTILE_SITE_KEY` in Cloudflare Build settings; an explicit `PUBLIC_CONTACT_ENABLED=false` restores preview mode. Generated approval packages always retain the non-sending preview. The integration keeps Astro static and uses `worker/contact.mjs` for `/api/contact`, Cloudflare Turnstile verification and Resend delivery. The active `wrangler.jsonc` targets the existing `auditores` Worker, preserves dashboard-managed custom domains and sends from `jzavala@jjconsultores.pe`. Runtime secrets and valid bindings remain mandatory. Source changes do not prove deployment, provider authentication or inbox delivery. Follow [the configuration guide](docs/contact-delivery.md).

## Client-logo carousel

The home retains the selected ten-client carousel and its 56-second smooth rightward loop. Each group has equal geometry and terminal spacing, and the repeated group is hidden from assistive technology. Every image has a meaningful client-name alternative.

Without JavaScript, logos remain visible as a static grid. After enhancement, movement starts automatically, including when reduced motion is requested, as explicitly selected by the user. This narrowly scoped exception is an accessibility tradeoff, not a claim of full accessibility compliance. Hover over the logo viewport pauses temporarily; Space toggles a persistent keyboard pause and Escape pauses. Focus itself does not pause movement. Keyboard instructions and a focus outline are provided; there is no pause button or storage.

## SEO and launch safeguards

| Page | Main search intent |
| --- | --- |
| Home | Accounting/auditing support for Peruvian MYPES and first contact |
| Services | Service scope, deliverables and the complete portfolio |
| About | Company identity, professional experience, values and leadership |

Each page has a unique title and description, one H1 and descriptive local imagery. Launch-ready output has a self-referencing canonical and social page URL for each route, a three-page sitemap and consistent `ProfessionalService` identity/contact data. Pages do not canonicalize to the home page. No duplicate demo pages are emitted.

Preview remains the default: `noindex, nofollow`, `robots.txt` with `Disallow: /`, and no canonical, sitemap or business schema. A domain alone does not enable indexing. To prepare an explicitly authorized launch:

1. Verify the legal identity, contact details, client-logo publication rights and image licensing.
2. Complete real form delivery and privacy information.
3. Set `SITE_URL` to the approved public HTTP(S) origin, without a path, credentials, query or fragment.
4. Set `PUBLIC_LAUNCH_READY=true` only after business and release approval.
5. Run checks, tests, desktop/mobile review and the actual contact-flow verification before an authorized deployment.

The launch flag does not prove domain ownership, verify business facts or send form messages. Robots directives are not access control. No deployment, domain provisioning or Search Console action is implied by local route changes.

For the approved production site, set `SITE_URL=https://jjconsultores.pe` and `PUBLIC_LAUNCH_READY=true` in **Cloudflare > auditores > Settings > Build > Variables and secrets**, not runtime settings, then rebuild/deploy the connected branch. Verify all three pages emit `index, follow` and self-canonicals, `robots.txt` allows crawling and references `/sitemap-index.xml`, and `/sitemap-0.xml` lists exactly the three primary canonical URLs. Keep approval previews non-indexable.

`public/llms.txt` publishes a concise Spanish directory of the firm, its three pages, services and public contact details at `/llms.txt`. Keep it aligned with the website when those details change. It is an optional discovery aid, not a crawler permission file or a guarantee of Google/AI indexing. Sitemap submission and URL inspection in Google Search Console are separate follow-up actions requiring account authorization.

## Generated approval package

```sh
node scripts/package-pages-preview.mjs
```

This optional local command builds `.astro/pages-preview/` with only `/`, `/nosotros/` and `/servicios/`, rewriting local resources under `/auditores-preview/`. It forces preview indexing settings even when the shell contains launch-ready values, validates all routes/resources/fragments and excludes source files, documents and credentials. Publish only the reported generated payload after separate authorization; never upload the source tree. Public previews are not private despite their noindex directives.

## Illustrative photo provenance

Stock images are optimized locally as responsive WebP; browsers do not fetch Unsplash at runtime. Review licensing and prefer approved company photography before launch.

- Team: https://images.unsplash.com/photo-1521737711867-e3b97375f902
- Document review: https://images.unsplash.com/photo-1454165804606-c3d57bc86b40
- Finance: https://images.unsplash.com/photo-1460925895917-afdab827c52f
- Accounting: https://images.unsplash.com/photo-1554224155-6726b3ff858f

The selected home uses the supplied `img/Reunion-con-JZFv6.png`, with its approved crop and a reversible CSS brightness adjustment. The original file is unchanged.
