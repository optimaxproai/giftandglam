# Gift & Glam Virtual Angel Tree: PRD and project handoff

Paste this whole document into ChatGPT as context. It contains no passwords, keys or personal contact details.

## 1. What this is
A festive website for a community Christmas gift drive (an "Angel Tree"). Families email the organizers asking for help for their children. Organizers import those emails, and each child becomes an "angel" card on a public tree. Sponsors browse the tree, adopt an angel, shop the wish list, and return gifts unwrapped to the drop-off.

- Drive: Christmas Gift Drive 2026, about 60 children, plus gift card requests as optional extras.
- Key dates: gifts returned unwrapped by **Dec 10**, giveaway and gift drive on **Dec 12**. Family requests were due Nov 15 (late ones are still accepted).
- Built by OptiMaxProAI. It is **unrelated to OptiEatsAI** and lives in its own repo and its own Vercel project.

## 2. Links and where things live
| Piece | Detail |
|---|---|
| Code | GitHub `optimaxproai/giftandglam`, branch `main` (currently **public**; recommend making it private) |
| Hosting | Vercel project `giftandglam` in team OptiMaxProAI (Hobby plan), auto-deploys on push to `main` |
| URL | https://giftandglam.optimaxproai.com (domain attached and valid) and giftandglam.vercel.app |
| Database, auth, photo storage | Supabase project named `giftandglam`: **NOT CREATED YET** (see section 10) |
| Email (optional) | Resend, for sponsor confirmation emails |
| AI | Anthropic API (model `claude-sonnet-5-5`) to read family emails and PDFs |

## 3. Users and roles
1. **Sponsor** (public, no account): browses the tree, adopts an angel with name, email and optional phone, then gets a private "My angels" link.
2. **Organizer** (3 approved emails, allow-listed in a Vercel environment variable): imports emails, edits children, tracks gifts and sponsors.
3. **Parent / family**: no login. They send an email. Their private details are visible only to organizers.

## 4. Features
### Public
- Festive home page: night-sky hero, twinkling garland, falling snow, countdown to Dec 10, progress bar of angels sponsored.
- The tree: ornament-style cards with first name, age, sizes, top wishes, gift card chip, sibling chip. Filters: search wishes, age band, gender, available only.
- Child page `/angel/[id]`: photo (only if allowed), sizes, wants, needs, favorites, favorite color, gift card extra, **siblings listed by first name with links**, and the adopt form.
- Adopt: first-come, protected by an atomic database function, so two sponsors can never take the same child. Optional checkbox to also cover the gift card.
- My angels `/mine/[token]`: wish list checklist, status bar, "I've bought the gifts", "Release this angel", gift card status, sibling links.
- Optional confirmation email through Resend.

### Organizer console (`/admin`)
- **Import** `/admin/import`: upload PDF, screenshot, photo, .txt/.eml, or paste email text (several files at once, up to 8 pages each).
  - The browser renders PDF pages (pdfjs) and sends page images to the server.
  - The server asks Claude to return, via one forced tool call, every family and every child: parent name, phone, email, story, and per child: full name, age, gender, shirt/pants/shoe sizes, wants, needs, up to 3 favorites, favorite color, gift card stores, and the location of the child's photo as a page number plus a bounding box.
  - The browser crops each photo from the rendered page. A safety-net function tidies the model output: moves "X gift card" lines out of wish lists into the gift card ask, de-duplicates, caps favorites at 3, clamps photo boxes.
  - The organizer reviews and edits everything on screen before saving. Photos can be replaced or removed.
  - Saving: a parent with the same phone or email joins the existing family (siblings from a second email); a child with the same first name and age in that family is skipped as a duplicate.
  - Options per family: "Publish to the tree now" (otherwise saved as hidden drafts) and "Parent agreed to show photos to sponsors" (default off).
- **Child profile** `/admin/children/[id]`: photo, editable public fields, a dashed **Private** panel with parent name, phone, email, story and organizer notes, **the other children in the same family** (with photos and links), sponsor contact, status buttons.
- **Overview** `/admin`: KPIs, pipeline bar (Available, Sponsored, Gifts bought, Returned, Given out), "Needs you" list.
- **Children** table with filters (including Drafts and Gift card pending), **Sponsors** table with a ready-to-copy reminder text, **Account** page.
- Status flow per child: available, claimed, purchased, returned, given. Gift card status: none, pledged, received.

### Admin sign-in (several ways in, by request)
Password with a show/hide eye icon; emailed magic link; emailed 6-digit code (works on any device, avoids the "link opened in a different browser" failure); Forgot password then reset link then choose a new password (eye toggles on both fields); `/admin/account` to set or change a password while signed in. A middleware refreshes the session so organizers are not silently signed out. Only allow-listed emails can use the console, whichever method they use.

## 5. Privacy and safety rules (important, children's data)
- All database tables are **server-only** (row-level security on, no policies, anon and authenticated roles revoked). Everything goes through Next.js server code that checks who is asking.
- Public pages pass data through one function (`toPublic` in `lib/child.ts`) that returns only: first name, age, gender, sizes, wants, needs, favorites, favorite color, gift card ask, status, whether a photo may be shown, and siblings as first name plus age. It never returns full names, parent details, sponsor identity or organizer notes. A unit test fails if any private value leaks.
- Photos are stored in a **private** bucket and served only by `/api/photo/[id]`: always to organizers, and to the public only if an organizer ticked "Show photo to sponsors" (meant to record that the parent agreed). Default is hidden.
- Sponsors never see who else adopted a child. Sponsor contact details are organizer-only.
- Claim and sponsor actions are rate-limited per IP; the claim form has a honeypot field.
- Family emails and photos are sent to the Anthropic API to be read. Parents should be told this.
- Admin sign-in is an allow-list, and the demo mode (below) cannot run on a production deployment.

## 6. Data model (Postgres on Supabase)
- `families`: id, parent_name, phone, phone_norm, email, email_norm, story, source_label, created_at.
- `sponsors`: id, name, email, email_norm (unique), phone, token (unguessable "My angels" link), created_at.
- `children`: id, `no` (auto number shown as "Angel No. 07"), family_id, full_name (private), first_name, age, gender, tops, bottoms, shoes, wants[], needs[], faves[], fav_color, gift_store, gift_amount, gift_card_status, photo_path, photo_public, approved, status, sponsor_id, claimed_at, returned_at, organizer_notes, created_at.
- Function `claim_child(...)`: atomic first-come claim, executable only by the server's service role.
- Storage bucket `child-photos` (private). Migration file: `supabase/migrations/20261124120000_angel_tree.sql`.

## 7. Tech stack
Next.js 14 (App Router) + TypeScript, plain CSS (no Tailwind), Supabase (Postgres, Auth, Storage), `@supabase/ssr` for sessions, Anthropic SDK, pdfjs-dist 3.11 (browser PDF rendering), zod, Vitest. Fonts: Mountains of Christmas (display), Playfair Display, Inter. Colors: evergreen, cranberry, gold, snow.

## 8. Environment variables (set in Vercel; never commit real values)
| Name | Status |
|---|---|
| `ANGEL_ADMIN_EMAILS` | Set in Vercel (three organizer emails, comma separated) |
| `NEXT_PUBLIC_SITE_URL` | Set: `https://giftandglam.optimaxproai.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | Needed after Supabase project exists |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Needed after Supabase project exists |
| `SUPABASE_SERVICE_ROLE_KEY` | Needed (secret; copy from the Supabase dashboard yourself) |
| `ANTHROPIC_API_KEY` | Needed for the email import to work |
| `RESEND_API_KEY`, `ANGEL_FROM_EMAIL` | Optional (confirmation emails) |
| `ANGEL_DEMO` | **Never set in production.** Local preview only |

## 9. What is built and verified
- Typecheck passes, 12 unit tests pass (parser clean-up, family matching, public-data leak test), production build succeeds.
- Verified in a real browser in local demo mode: home page, child page with siblings, admin pages, PDF upload producing cropped photos, mobile layout, password eye toggle and sign-in tabs.
- **Not verified:** a real Supabase database, real sign-in, the Anthropic email reader on a real email, Resend emails. None of these exist in the environment yet.

## 10. Current status and blockers
1. Vercel project and domain: **done**. The live site shows "Application error" because there is no database yet. This is expected.
2. **Supabase project `giftandglam` does not exist.** The Supabase organization is at its limit of 2 active free projects (`optieatsai-app` is production; `optilifeai` is the other). Options: pause `optilifeai` in the Supabase dashboard (Settings, General, Pause project) or upgrade the organization to Pro (about $25/month). Do not pause `optieatsai-app`.
3. After the project exists: run the migration, add the three Supabase variables and `ANTHROPIC_API_KEY` in Vercel, redeploy.
4. Supabase Auth dashboard settings: Site URL = `https://giftandglam.optimaxproai.com`; add `https://giftandglam.optimaxproai.com/**` to Redirect URLs; add `{{ .Token }}` to the Magic Link and Reset Password email templates so the 6-digit code option works.
5. Make the GitHub repo private.

## 11. Not built yet (candidate next steps)
- A separate "Gift card extras" page (today gift cards are offered on child pages and in the adopt form).
- Parent-facing apply form (intake is currently by email, imported by organizers).
- Manual re-crop of a child's photo (organizers can replace or remove it).
- Server-sent reminder emails and SMS (today there is copy-and-paste reminder text).
- Automated "gifts due soon" reminders; a printable check-in sheet for Dec 10; CSV export in the real app (it existed in the earlier mock).
- Server-side rate limiting is per-instance memory only; a shared store would be stronger.

## 12. Open decisions for the owner
- Photo policy: keep "hidden unless parent agreed" as the default? Add a consent line to the family email template?
- Keep the repo public or private (recommended: private)?
- Supabase: Pro upgrade or pause `optilifeai`?
- Who may be added as organizers later, and how (edit the Vercel variable)?
- Hobby Vercel plan is fine for the drive; confirm if a team plan is wanted for ongoing use.

## 13. Suggested prompts for ChatGPT
- "Review this PRD for gaps in privacy for a children's gift-drive site and list the top 5 risks."
- "Write the email template families should use so our importer reads it reliably, including a photo consent line."
- "Draft sponsor-facing copy: confirmation email, reminder email (7 days and 2 days before Dec 10), and thank-you message."
- "Write a one-page volunteer guide for check-in day (Dec 10) and giveaway day (Dec 12)."
- "Draft the Terms and Privacy notice for sponsors and families."

## 14. Running it locally
```bash
git clone https://github.com/optimaxproai/giftandglam && cd giftandglam && npm install
ANGEL_DEMO=1 NEXT_PUBLIC_SUPABASE_URL=http://x NEXT_PUBLIC_SUPABASE_ANON_KEY=x npm run dev   # http://localhost:3100
```
Demo mode shows 60 fictional children, opens /admin without sign-in, answers Import with a canned fictional family, and is read-only.
