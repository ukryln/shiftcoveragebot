# Shift Coverage Bot — Handoff

Written so that any developer or AI assistant can pick this project up cold. It contains no passwords or keys. The code is the source of truth; this explains how it fits together and what to watch out for.

## What it is

A Telegram bot plus a web dashboard for small restaurants and takeaways. When a staff member can't work a shift, they ask the bot, the manager approves, the bot offers the shift to matching staff, and the first person to say yes gets it. The plan is to sell it to other businesses, so it is multi-tenant: many shops, one shared bot.

The owner is non-technical. Explain steps in plain language and give click-by-click guidance for Supabase, Netlify, GitHub and Telegram.

## Where everything lives

| Thing | Where |
|---|---|
| Code | GitHub repo `ukryln/shiftcoveragebot` (branch `master`) |
| Live site | https://shiftcoveragebot.netlify.app (Netlify auto-deploys on push to `master`) |
| Database + login | One Supabase project (Postgres + Auth) |
| Bot | Telegram `@ShiftCoverageBot`, webhook points at `/api/telegram-webhook` on the live site |
| Planning docs | `shift-coverage-bot-spec.md`, `-data-model.md`, `-bot-flow.md`, `-dashboard.md` in the repo root |

Environment variable names (values are in `.env.local` locally and in Netlify's environment variables for production, never in git): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`.

## Tech and structure

- Next.js 16 (App Router, TypeScript, Tailwind). **This version differs from older Next.js**: `middleware.ts` is now `src/proxy.ts`. Read `node_modules/next/dist/docs/` before using unfamiliar APIs.
- Supabase for Postgres and Auth. **All database access uses the service-role client** (`src/lib/supabase/admin.ts`), which bypasses row-level security. That means every server action must check ownership itself: use `requireShopManager` / `requireStaffManager` from `src/lib/auth.ts`.
- Bot: grammY. Handlers are in `src/bot/handlers.ts`. In production it runs through the webhook route, not polling. `npm run bot` (polling) is local-only; never run it while the webhook is registered.
- Dashboard pages are in `src/app/dashboard/` (home, staff, shifts, coverage). Server actions are in `src/app/actions/`.
- Time handling: `src/lib/roster.ts`. Every shop has a `timezone`; shifts are stored as UTC instants and always read and written in the shop's zone.
- Cross-shop and conflict logic: `src/lib/shift-conflicts.ts`.

## Features built

- Manager signup and login, multiple shops per manager, rename and delete shops, invite co-managers by email link, shop switcher.
- Staff management (add, bulk paste, edit, archive, invite link), Telegram onboarding.
- Weekly roster grid: type `10-3` into a Lunch or Dinner cell, automatic hour totals.
- Coverage flow: request, reason, manager approve or reject, broadcast to matching role, first accept wins (atomic database update).
- Swap tracking: the original shift is never changed. A new shift row is created for the person covering (`shifts.covering_request_id`). Roster shows given-away cells red (excluded from totals) and covering cells blue.
- Sick pay claims: after a shift is covered, the original staff member can claim sick pay in the bot. The manager approves or rejects. An approved claim keeps the cell red but counts the hours.
- Cross-shop coverage: a manager's staff can be linked to several of their shops and are offered shifts at all of them.
- Double-booking prevention across shops (roster entry and bot acceptance).
- Per-shop timezone. Coverage history page with filters.

## Database

`supabase/schema.sql` is the full current schema. Numbered files in `supabase/migrations/` are the incremental changes. Run new ones in the Supabase SQL Editor (the app does not run migrations itself).

- 002 to 005 and 007: applied.
- **006 (enable row-level security): applied status is unconfirmed. It is safe to re-run, so run it once to be sure.**

## Deploying

1. `npx tsc --noEmit` and `npm run build` must both pass locally first. `next dev` does not type-check, so errors can hide until Netlify's build fails.
2. `git push origin master` triggers a Netlify build. The free tier has limited build minutes, so batch changes and avoid many small pushes. Add `[skip ci]` to the commit message for docs-only changes.
3. In Netlify, the site's **Production visibility must be Public**, or Telegram's webhook calls get a 401.
4. If the site address ever changes, re-register the webhook: `node --env-file=.env.local scripts/set-telegram-webhook.mjs <new-url>`.

## Testing safely

- Never use the owner's real login or submit forms on their real account. Create throwaway users with `supabaseAdmin.auth.admin.createUser({ email_confirm: true })` in a temporary script, test through the real UI, then delete the users and any rows created.
- For the bot, build a synthetic Telegram update and call `bot.handleUpdate()`, then check the database. Replies to fake chats fail with "chat not found", which is expected. Command messages need an `entities` array or they are silently ignored.
- Server actions that call `cookies()` or `revalidatePath()` cannot be called from a plain script; test them through the browser.

## Gotchas learned the hard way

- `coverage_requests` and `shifts` have two foreign keys between them. Always write `shifts!coverage_requests_shift_id_fkey(...)` when embedding, or Supabase returns an ambiguity error.
- supabase-js types joined relations as arrays. Use `.returns<T>()` to declare the real shape.
- Never format dates with `toLocaleString` during server render (hydration mismatch). Use `src/lib/roster.ts` helpers or format after mount.
- Check the `error` from every Supabase write before telling the user it worked.
- Guard non-critical Telegram UI calls with `safeUi()` so a failed button acknowledgment cannot stop the real work after it.
- PowerShell: do not pass text with embedded double quotes straight to `git commit -m`. Put the message in a variable first. Do not rewrite source files with PowerShell `Get-Content`/`Set-Content` (it corrupted special characters once); use an editor tool.

## Running costs and operations

- Supabase free tier pauses a project after one week of no activity. A paused project can be restored with one click in the Supabase dashboard and loses nothing. For real customers, move to the Pro plan (about US$25 a month: never pauses, daily backups). A free keep-alive is built: `netlify/functions/keepalive.mts` runs every 3 days on Netlify's schedule and calls `/api/keepalive`, which reads one row. Check Netlify's Functions tab to confirm it is listed as scheduled. (GitHub Actions was avoided because GitHub disables scheduled workflows after 60 days without repo activity.)
- Netlify free tier has limited build minutes.

## Not built yet

- Billing (planned: Stripe subscriptions; start by invoicing by hand).
- A proper signup email sender (Supabase's built-in email is rate-limited). Plan: custom SMTP such as Resend.
- Privacy policy and terms (staff names and Telegram IDs are stored).
- Super-admin cross-shop view, staff availability opt-outs, automated tests, generated Supabase types, a custom domain, monitoring.
- The bot's "reason" state is held in memory (`src/bot/state.ts`), so it is lost on restart and will not scale to several server instances.

## Starter prompt for a new chat

> I own a project called Shift Coverage Bot (a Telegram bot and Next.js dashboard for restaurant shift cover). I'm not a developer. The code is at github.com/ukryln/shiftcoveragebot. I'm pasting HANDOFF.md below. Please read it, then help me with: [what you want]. Explain things in plain language and tell me exactly what to click or paste.
