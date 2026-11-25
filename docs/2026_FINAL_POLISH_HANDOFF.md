# Gift & Glam 2026 final launch polish

Apply this incremental patch to `interactive-tree-donations`, PR #6, whose reviewed head is `166f6785adc02457b41a437e96a772c2c89d2d90`. If that PR is already merged, apply on a fresh branch from its merge on main only after `git apply --check`. This patch includes a binary 1080×1350 social flyer; use the complete `.patch` file, not a pasted fragment.

## Approved scope

- Existing cinematic tree and holiday lights preserved. The search, age, gender and availability filters now sit directly under **Ways to Donate**; participation instructions are a compact strip. Select an ornament to highlight it and move to its wish list. Find another angel returns to the finder without clearing filters. Motion respects the visitor's reduced-motion preference.
- Dedicated private `/mine/[token]/thank-you?angel=G26-...` confirmation. It verifies the token and ownership before showing the angel's list, clothing sizes, shopping checklist, print/download, return and giveaway instructions, available sibling codes and separate adoption actions. Holiday stars, snowflakes and hearts replace confetti. Saved sponsor contact information is reused only through the verified server-side sponsor cookie. Each adoption still requires explicit confirmation.
- Share the Joy on the public tree and thank-you page, including a copyable public-only campaign link, share message and downloadable social QR flyer. Confirmation emails include separately labeled public share content and the private checklist link. Email acceptance is not proof of inbox delivery.
- Campaign scoreboard uses current persisted published angels and active gift requests. No private records are serialized for the impact summary. Families supported means families with at least one gift handoff recorded. Volunteer offers count deduplicated offers to help, not verified attendance. Counts refresh when the public or organizer page is loaded.
- 2026 sponsor self-release is disabled in both UI and the public sponsor action route. The organizer can manage cancellations using the existing organizer status controls. No new eligibility, deadline escalation, task queue or 2027 intake work is included.

## Deployment

The `gift_cycle` migration was applied to Gift & Glam production and verified on Nov 24; 2026 maximum age is confirmed as 25. **No additional migration is needed.** Do not reapply the existing migration or seed/reset production. Do not alter PR #2 (2027).

Run `git apply --check`, apply, `npm test`, `npm run typecheck`, `npm run build`, commit/push to PR #6. Verify a fictional review preview, particularly desktop/mobile placement, selection scrolling and reduced motion, a complete adoption, sibling adoption with saved contact, share/download, and organizer overview. Keep production Supabase variables off Preview. Stop at updated draft PR for owner review.

Local evidence: 48 unit tests, TypeScript and production build passed. Compiled app exercised with fictional data in 25 HTTP flow checks, including verified session reuse, ownership-required confirmation page, correct sibling redirect, disable-release API, public aggregate counts, flyer response and no names in page output. QR encoded canonical `https://giftandglam.optimaxproai.com`; scan on a phone before public distribution. Physical label alignment, live organizer sign-in, live email inbox delivery, and browser visual QA still need verification. No emails, payments, or production mutations were made for this patch.

## 2027 backlog (not part of this patch)

Keep editable questionnaires and required flags, configurable eligibility, family communications, coordinated volunteer participation and year-over-year reporting in PR #2/follow-up. The donor self-release workflow, time-sensitive giving options and expanded organizer action list are deferred to 2027.
