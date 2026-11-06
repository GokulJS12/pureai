# Inquiry submission: audit, setup and verification

## Audit — 6 November 2026

Inspected default branch `feature/coderabbit-review`, commit `6ed89017ddba38282f33a6b7e671fca93acfa087`. No AGENTS.md, inquiry service, package manifest or configured delivery integration was present. `main.js` simulated AI-interest submission and used mailto for general contact. Netlify/Vercel files contained static routing and headers; `.htaccess` additionally supported Apache/LiteSpeed. GitHub combined status returned no deployment status entries.

A read-only GET of https://pureaiglobal.com and its main.js succeeded. Response headers showed Cloudflare but did not establish the origin hosting provider. Live main.js differed from the repository and still contained the AI-interest demonstration handler and 24-hour copy. No production form was submitted. Hosting dashboard configuration, mailbox integration, and other independently configured lead systems remain unknown. The older PRODUCTION_AUDIT.md does not establish working inquiry delivery.

## Implemented behavior

Both existing main.js dialogs use same-origin `/api/inquiries`. Layout/classes and opening/closing behavior remain intact; consent, security challenge and accessible status text are added. Phone is optional in both. No 24-hour promise remains in these forms. Success requires HTTP 202, `accepted: true`, and the matching reference, only returned after Resend supplies an email ID. This is provider acceptance, **not inbox delivery or a human response**.

Server enforces allowed origins, JSON, 16 KiB body size, field types/lengths, email/phone formats, consent, source and request IDs. Turnstile is verified server-side with hostname and action checks; missing credentials fail closed. Honeypot rejects spam rather than pretending success. Upstream calls time out after eight seconds each. No visitor information or provider responses are logged by application code. Emails use a fixed server-configured recipient/sender and text body; visitors cannot select recipients or inject email headers. No automatic reply is sent to an unverified visitor address.

Retry retains the request ID in memory. A hash of the fixed email payload is the Resend idempotency key, so retries with fresh security tokens and unchanged fields avoid duplicate sends within the provider's idempotency window. No background queue or indefinite retry guarantee exists. If a browser tab closes, the in-memory form and ID are lost. Provider acceptance followed by a bounce requires operational monitoring.

## Required production environment

Set these in the hosting provider's **server runtime** secret/environment settings, not HTML, main.js, git, or a public static directory:

| Variable | Value |
|---|---|
| `RESEND_API_KEY` | Sending key restricted to your verified domain |
| `INQUIRY_FROM` | Bare email address on that verified domain |
| `INQUIRY_TO` | Bare address of the monitored inquiry mailbox; confirm its owner |
| `TURNSTILE_SECRET_KEY` | Production Cloudflare Turnstile secret |
| `TURNSTILE_SITE_KEY` | Matching public site key; exposed through GET /api/inquiries |
| `INQUIRY_ALLOWED_ORIGINS` | Exact comma-separated origins, e.g. https://pureaiglobal.com,https://www.pureaiglobal.com; no trailing slash |
| `PORT` | Optional Node-only loopback port, default 3001 |

Configure Turnstile's allowed hostnames for each real production/preview host. Do not use test keys in production. Enable HTTPS, SPF/DKIM for the sending domain and an appropriate DMARC policy. Allow outbound HTTPS to challenges.cloudflare.com and api.resend.com. If a CSP is added, permit the Turnstile script/frame according to Cloudflare's documentation and same-origin API fetches.

## Select the actual host before rollout

- **Netlify:** deploy this branch with Node 22+. Existing publish directory remains `.`. `netlify.toml` sets the functions directory and rewrites `/api/inquiries` to the function. Use a Git/CLI deployment that builds functions, not a static-only drag-and-drop upload. Set environment values with Functions scope. Verify function bundle includes server/inquiries.cjs.
- **Vercel:** use the existing static-site project with Node 22+ functions enabled. `api/inquiries.js` is the function entry. Existing cleanUrls/security headers remain unchanged. Set runtime environment for the intended deployment context; ensure dashboard build/output overrides do not omit API functions. Redeploy after configuration.
- **Apache/LiteSpeed/other origin:** static upload alone cannot execute this backend. Run `npm run start:inquiries` as a managed Node 22+ service and reverse-proxy exactly `/api/inquiries` to `http://127.0.0.1:3001/api/inquiries`, preserving the browser Origin header. Maintain the current static routes. Restrict the loopback service; set request-body limit to 16 KiB and proxy timeout above 20 seconds. If Node/proxy is unavailable, deploy an adapter on a supported host and arrange a same-origin proxy before activating forms. No guessed hosting migration was performed.

Configure edge rate limiting on GET and POST `/api/inquiries` (starting point: 10 POST attempts/IP/minute, tune for shared networks), plus the direct Netlify function URL if enabled. Turnstile and the honeypot are implemented; distributed edge rate limiting depends on the actual host and has not been configured here.

Before public rollout, the business owner should confirm the recipient mailbox, provider processing arrangements, privacy contact, access controls and retention schedule. The new inquiry privacy notice describes actual fields/processors without inventing a retention period or claiming legal compliance. Restrict mailbox/provider console access and establish a deletion procedure.

## Verification and release gate

`npm test` passes **39 tests**: both sources, invalid fields/consent, malformed/oversized requests, origin/media-type checks, missing configuration, wrong/replayed-style challenge outcomes, provider errors, malformed acknowledgement, network failures/timeouts, stable retry key, Netlify/Vercel adapters and actual client helper status/reset logic. All provider traffic in tests is mocked; no email was sent.

Browser suite: `npm install`, `npx playwright install chromium`, then `npm run test:browser`. Optional `CHROMIUM_PATH` selects an installed Chromium. Suite exercises both real dialogs, consent, rejection, network failure, false success and successful retry. **Not verified in this environment:** Chromium startup fails with `socket() failed: Operation not permitted`. Browser rendering, responsive layout, keyboard behavior and live Turnstile interactions still need this run and manual checks. This is a separate test command so backend checks remain executable without browser installation.

Production acceptance checklist:

1. Identify the active host and deployed branch, select the adapter, configure environment and inspect GET `/api/inquiries` for only the public site key (not HTML or secrets).
2. Use a preview host with separate test recipient/key. Run browser tests; visually inspect desktop/mobile dialogs, scrolling to consent/challenge/status, keyboard focus and reopening behavior.
3. Submit one clearly labeled test inquiry from each form using real Turnstile. Match the UI reference to the email in the monitored inbox and provider dashboard. Verify Reply-To and no visitor auto-reply.
4. Test invalid data, absent consent, expired challenge, missing credentials and controlled provider failure on preview. Confirm no success, details retained and retry enabled.
5. Simulate a lost response after provider acceptance; retry unchanged fields with a new challenge and verify one email within the provider idempotency window.
6. Confirm HTTPS, origin restrictions, edge rate limits, privacy notice URL, and that no secret files are publicly served. Purge cached main.js when publishing.
7. Monitor Resend delivery/bounce/suppression events and mailbox spam folder. Assign an inquiry owner and provider-alert recipient. Investigate accepted-but-undelivered messages; do not equate 202 with inbox receipt.

No production deployment, DNS change, secret installation or real delivery test has been performed. Do not mark the integration live until the inbox check passes. Roll back the deployment if necessary; avoid restoring misleading demo confirmations as a long-term fallback.

## Additional finding outside these two contact paths

`product-enquiry.js` also contains a commented-out `/api/enquiry` call. That separate product inquiry flow was not connected by this change and should not be described as verified delivery.

## Provider documentation consulted

- https://resend.com/docs/api-reference/emails/send-email
- https://resend.com/docs/dashboard/emails/idempotency-keys
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- https://vercel.com/docs/functions/runtimes/node-js
- https://docs.netlify.com/build/functions/configuration/
