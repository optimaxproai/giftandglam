# Virtual Angel Tree

Festive gift-drive site: sponsors adopt "angels" (children), organizers import family emails, and every child has a page
with a photo, private parent details and siblings. Built to live at its own subdomain, e.g. `angeltree.optimaxproai.com`.

## What it does
- **Public:** festive tree, filters, child pages (first name, age, sizes, wants/needs, gift card extra, siblings by first name),
  atomic first-come adoption, "My angels" link (no account) with checklist, bought/release buttons.
- **Organizer** (`/admin`, emailed sign-in link, allow-listed emails):
  - **Import** a PDF, screenshot, photo, .txt/.eml or pasted email. Claude finds every child, groups siblings under one parent,
    moves gift cards out of wish lists, and the browser crops each child's photo from the PDF page. You edit, then save.
  - **Child page:** photo, editable public fields, private parent panel, other children in the family, sponsor, status actions.
  - Overview, children table with filters, sponsors with reminder text.
- **Privacy:** all tables are server-only (RLS on, no policies). Public pages go through `lib/child.ts#toPublic`
  (tested): no full names, parent details, sponsor identity or notes. Photos live in a private bucket and are served by
  `/api/photo/[id]` only to organizers, or to everyone when an organizer ticks "Show photo to sponsors".

## Local preview (no Supabase, no keys)
```bash
npm install
ANGEL_DEMO=1 NEXT_PUBLIC_SUPABASE_URL=http://x NEXT_PUBLIC_SUPABASE_ANON_KEY=x npm run dev   # http://localhost:3100
```
Demo mode shows 60 fictional children, opens /admin without sign-in, and answers Import with a canned fictional family.
It is read-only and is ignored when `VERCEL_ENV=production`.

## Go live (this repo is its own Vercel project: no root directory needed)
1. **Supabase:** create a NEW project. Run `supabase/migrations/20261124120000_angel_tree.sql`. Auth > URL config: add
   `https://<subdomain>/auth/callback` as a redirect URL.
2. **Vercel:** new project from this repo, default root directory. Env vars: see `.env.example`
   (`ANGEL_ADMIN_EMAILS`, `ANTHROPIC_API_KEY`, Supabase keys; optional `RESEND_API_KEY`). Do not set `ANGEL_DEMO`.
3. **Subdomain:** add `angeltree.optimaxproai.com` to the Vercel project, then the DNS record Vercel shows
   (a CNAME on the `optimaxproai.com` zone).
4. **Supabase Auth settings** (dashboard > Authentication): Site URL = `https://giftandglam.optimaxproai.com`; add
   `https://giftandglam.optimaxproai.com/**` to Redirect URLs. For the **Email code** sign-in, add `{{ .Token }}` to the
   Magic Link and Reset Password email templates (for example: `Your code is {{ .Token }}`).
5. Sign in at `/admin/login`, open Import, drop in the first family email.

## Ways into /admin
Password (with a show/hide eye), email link, 6-digit email code (works on any device, no same-browser requirement),
and Forgot password -> reset link -> choose a new password. Signed in, `/admin/account` sets or changes the password.
A middleware keeps the session refreshed so organizers are not silently signed out after an hour. Only emails in
`ANGEL_ADMIN_EMAILS` get in, whichever method they use.

## Tests
`npm test` (parser clean-up, family matching, and that public output never contains private data), `npm run typecheck`.
