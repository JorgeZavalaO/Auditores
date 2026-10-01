# Audit landing

## Objective and authorization
Build a responsive, conversion-focused Astro landing from the supplied DOCX, client logos and reference JPG. The user authorizes implementation and generic demo contact details, but not deployment, remote operations, push, PR creation or merge.

## Problem and scope
The workspace has only assets. Create reusable Astro components, source-grounded Spanish copy, an editable provisional identity and a clear free-diagnosis CTA. Use #0A1267 as the primary color. Preserve the source files. Do not invent certifications, testimonials, company age, client counts or a definitive commercial brand.

## Architecture and SEO
One commercial landing URL with distinct section anchors; no thin competing service pages. Static HTML, minimal JavaScript, local optimized images, semantic headings, accessible navigation and native FAQ. Centralize copy and demo contacts. Only generate canonical URLs, sitemap and indexable metadata when a real SITE_URL is configured; local preview stays noindex. Schema must not expose fake contact data. No analytics, cookies, backend or form-delivery service unless explicitly configured.

## Tasks
- [ ] T1 — Implement the complete reusable Astro landing, content, demo contact flow and production SEO guardrails.
  - Route: delegated direct. Evidence: implementation spans multiple non-trivial components/configuration/data files; source mapping already delegated.
  - Acceptance: accurate source-based copy, ten client logos, responsive design inspired by reference, contact placeholders visibly labeled, no delivery to demo numbers/emails.
  - Checks: Astro check/build, Node test assertions on generated HTML and SEO configuration, functional mobile menu/FAQ/contact validation.
  - Outcome: implemented and checked; checkbox remains open until the required work-unit commit exists.
  - Rollback: remove the new Astro source/configuration/public assets while preserving original DOCX/JPG/logo directory.
- [ ] T2 — Verify desktop/mobile/accessibility and production/preview SEO; fix observed defects and document launch configuration.
  - Route: delegated functional checks where useful; parent owns final browser verification. Evidence: independent runtime/UI boundary.
  - Acceptance: no horizontal overflow, working navigation and disclosures, validated demo submission without sending or saving personal data, optimized image loading and clear launch instructions.
  - Checks: npm run check, npm run build, npm test, browser desktop/mobile review; inspect canonical/robots/sitemap in configured production build; inspect preview noindex guard.
  - Outcome: browser verification observed; independent functional findings corrected and final checks passed. Commit pending.
  - Rollback: revert only verification fixes; no user source assets removed.

## Workflow configuration
- TDD: off, explicitly confirmed by the user on 2026-09-30; ordinary functional checks remain required.
- Test runner: Node.js built-in test runner (`node --test`).
- RDD: on, deciding source default (`gentle-ai review mode status`). Assessment pending an eligible work-unit commit; no review consent invented.
- Git: initialized on `feat/audit-landing`; no pre-existing repository or commits.
- Delivery strategy: ask-on-risk. Forecast: approximately 1,000–1,400 authored lines, excluding lockfile/generated assets. User accepted the proposed coherent first-delivery size exception with "ok" on 2026-09-30; this exception covers demo1 only. No PR creation authorized.
- Work-unit commit identities and reviewed boundary: pending. Final authored implementation snapshot: 1,141 additions, excluding lockfile, binary assets and tracker. No feature commits yet; changes staged locally, original assets left untracked and untouched.
- One honest delivery slicing pass considered separating bootstrap/SEO, visual sections and responsive styles. The initial working landing depends on its components, content, layout, styles and tests together; splitting this first application into sub-400-line snapshots would introduce temporary route/styling stubs rather than independently complete requested outcomes. Keep the coherent 1,141-line initial work unit and recommend an explicit size exception, or follow the user's chosen chain strategy. Do not reduce code readability or omit tests to fit the heuristic. The user accepted this initial demo1 size exception; no exception is inferred for demo2.

## Evidence and progress
- Full DOCX review: partners have 20 years of experience; seven services; MYPES in Peru; free accounting/tax diagnostic with action priorities.
- No real contact details or domain provided. User expressly requested generic placeholders for layout review.
- CodeGraph initialization attempted once and failed because the asset-only folder was not a recognized project; direct asset inspection used.
- Engram mirror topic: `odd/audit-landing/tasks`; locator: `odd/tasks/audit-landing.md`; observation #2133. MCP saves fail because the runtime injects an unregistered session even when session_id is omitted. CLI fallback saved the document, and the full observation was read back. Subsequent mirror updates use `mem_update` without a session identity.
- Implemented Astro 7.3.5 static landing with reusable components, local responsive WebP photos/client marks, self-hosted Manrope, provisional identity, seven source-grounded service/diagnosis categories, native FAQ and safe local demo form.
- Builder: `npm run check` — 15 files, 0 errors/warnings/hints; `npm run build` — 1 page, 25 optimized image variants; `npm test` — 5/5 passed. Independent functional worker reran check and tests with identical passing results.
- Browser: desktop 1280px, tablet 768px, mobiles 390px and 320px showed no horizontal overflow. Mobile menu opens and closes on anchor/Escape; native FAQ opens. Empty form blocks submission and focuses name; valid dummy input displays explicit no-send/no-save status. Loaded images have nonzero natural sizes; no error/warning browser logs.
- Fixed transparent sticky header after mobile observation; computed background is opaque white. Fixed private build environment propagation by using Astro.site/injected SITE for public metadata.
- Local preview running at `http://localhost:4321/`; dev process session 84456. Duplicate host overrides bound IPv6 loopback rather than 127.0.0.1; HTTP localhost probe returned 200. Use the actual printed URL.
- `git diff --cached --check` passed. Git warned normal LF-to-CRLF conversion; no source errors.
- Corrected host validation: all IP literals, URL-normalized abbreviated/numeric loopback, single-label/invalid DNS, reserved/local/example domains and trailing dots are rejected. Real DNS/Unicode/punycode remain supported; no DNS probes. Extended negative and valid-domain assertions; final check/build/tests passed (15 files, 0 errors/warnings/hints; 1 page/25 image variants; 5/5 tests).
- Corrected hero-caption contrast: decorative skew left pale text on pale backing (1.36:1). Explicit navy backing preserves 11.01:1 contrast; browser computed color/background confirmed. Other inspected helper/footer text passed normal-text ratios. This is a bounded check, not a full WCAG certification.
- Final full-page desktop screenshot inspected; no clipping, unwanted empty sections or image failures. Restored default browser viewport, reloaded to clear dummy input, and kept the localhost tab as a deliverable. Local preview remains `noindex, nofollow`.
- Pending/unperformed: production deployment, actual form delivery, real brand/contact/domain approval, client-mark licensing approval, Lighthouse/Core Web Vitals field scores. No invented score or public ranking guarantee. RDD assessment has no eligible commit yet and remains pending, not granted.

## Next step
The visual implementation and functional checks are ready for user review at localhost. Preserve demo1 in a conventional local commit under the accepted size exception; native RDD assessment/consent remains separate. Then create demo2 under its own task document. No push, PR or deployment is authorized. To launch, replace the provisional identity/contacts, configure actual form delivery and approve a real domain separately.

- Runtime memory registration unavailable after compaction. Agent-attributed memory writes are suspended; mirror updates are pending host registration. No alternate session is used.
- Prospective RDD assessment with source assets/cache excluded: medium risk (configuration_change), review due (slice_budget_reached); native STATUS requires untracked scope declaration. Native review not granted or started.

