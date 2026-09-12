# Shift Coverage Bot — Project Spec (v0.1 Draft)

*Last updated: 3 Sept 2026*

## Concept
Telegram bot that automates last-minute shift coverage for small restaurant/fast food shops. Staff request coverage, the bot broadcasts to the team, first to accept gets it, manager approves before and confirms after.

## Business Context
- Target: recurring SaaS revenue, ~$15–40 NZD/month per shop
- Part of broader side-income goal (~$2,000 NZD/month across side projects)
- Platform: **Telegram** (chosen over WhatsApp — free Bot API, no business approval hurdles, easier MVP build)
- Multi-tenant from day one (2 test shops lined up already, so shop isolation matters even at MVP stage)

## Test Shops
- Michael's own shop
- One other shop (contact already known)

## Confirmed MVP Flow
1. **Staff member** messages the bot requesting coverage for a shift (e.g. "Need coverage Fri 5–10pm")
2. **Manager approval gate** — manager receives a Telegram message with Approve/Reject buttons before anything is broadcast
3. On approval, bot **broadcasts to the entire staff roster** for that shop (not just "available" staff — full roster gets pinged)
4. **First staff member to respond YES** wins the shift
5. Bot notifies:
   - The staff member who requested it (covered ✅)
   - The manager (who's covering, confirmation)
6. **If nobody responds** in a set window → **no auto-escalation**. Manager manually cancels the request. (No re-broadcast or auto-escalation in v1.)

## Data Model Needs (draft — to refine)
- **Shops** (tenant) — name, manager Telegram ID, staff roster
- **Staff** — name, Telegram user ID, linked to shop(s)
- **Coverage Requests** — requesting staff, shift date/time, status (pending manager approval → broadcasting → filled/cancelled), timestamps
- **Responses** — who was offered, who accepted, response time (for first-wins logic)

## Confirmed Onboarding & Roster Decisions
- **Staff onboarding:** Manager sends a join request to staff (e.g. invite link or bot prompts them to confirm) — staff aren't self-signing-up freely
- **Roster source:** Linked to a **Google Sheet** rather than manual entry or in-bot roster management

## Confirmed: Roster Sync Approach
- **Live read** of the Google Sheet on every request (not periodic import)
- To keep this reliable, we'll provide a **fixed template** the shop must use — locked column structure so the bot can parse it predictably

## Confirmed: Schedule Awareness & Dashboard
- **Bot needs to know staff's actual rostered shifts** (not just ad-hoc requests) — this means the sheet template needs a schedule, not just a staff list
- **Manager dashboard (web page) is in scope for v1** — to see live/past coverage requests, not just Telegram messages
- **Billing:** manual/deferred — no billing system in v1, will handle payment outside the product for now

## Confirmed: Sheet Structure & Dashboard Scope
- Shift schedule lives in the **same Google Sheet**, on a **separate "Schedule" tab** (staff list and schedule are separate tabs, same file)
- **Manager dashboard is not read-only** — manager can edit roster/schedule directly from the dashboard, not just via the Google Sheet

## Confirmed: No Google Sheets Integration — Dashboard Only
- **Google Sheets dropped entirely from MVP** — no API integration, no template, no import
- Roster and schedule are entered/edited directly in the **manager dashboard**
- Dashboard should include a **spreadsheet-like grid view** for entering roster/schedule (familiar row/column editing experience, similar to a spreadsheet, but it's a native part of the dashboard — not actually Google Sheets)
- This removes a real chunk of build complexity (no Google API auth, no sheet parsing/template enforcement) while keeping the fast, familiar bulk-entry feel Sheets was providing

## Confirmed: Grid Bulk-Paste
- Dashboard grid must support **pasting data directly from a spreadsheet** (Excel/Sheets copy → paste into grid rows/columns) — not just manual cell entry
- This is important because shop owners already have rosters in spreadsheets and shouldn't have to retype everything

## Confirmed: No Fixed Timeout
- No automatic timer/expiry on coverage requests — request stays open until someone accepts or the **manager manually cancels** it

## Open Questions (not yet decided)
*(none remaining on core flow)*

## Technical Stack (Draft)
- **Framework:** Next.js (same as Michael's online ordering platform — one codebase for dashboard + bot API)
- **Database:** **Supabase** (hosted Postgres database with a visual dashboard to browse data directly — easier to see what's happening than a plain SQLite file; free tier available) — *changed from SQLite for easier visibility into data*
- **Telegram bot library:** grammy (free, open-source)
- **Hosting:** Railway or Render — free to build/test; may need a small paid tier once live with real shops (free tiers can "sleep," which is bad for a bot needing to respond fast). Google Cloud Functions/Cloud Run or Google Apps Script are also worth considering (similar free-tier idea, some bots run on these reliably without sleeping) — will pick whichever is most reliable/free for the traffic level when we build
- **Principle:** default to free/reliable options first, flag clearly if anything requires paid tier before committing

## Confirmed: Dashboard v1 Scope
- Roster/schedule grid (editable, paste-friendly)
- List of coverage requests (live + history)
- **Who covered each shift** (basic history/log, not full reporting — just visibility into past coverage)

## Confirmed: Auth, Onboarding & Bot Extra Feature
- **Manager login:** simple email/password (standard auth, not Telegram-based)
- **Shop onboarding:** **self-serve** — shop owners sign themselves up (not manually set up by Michael each time) — reinforces need for a clean, low-friction signup flow since this is meant to scale
- **Staff bot feature:** staff can check their **own upcoming shifts** via the bot, not just receive coverage broadcasts

## Confirmed: Multi-Shop, Reasons, Multi-Manager, Availability, Manager-as-Covering-Staff
- **Staff can work at multiple shops** — a person isn't locked to one shop (affects data model: staff↔shop needs to be many-to-many, not one-to-one)
- **Coverage requests include an optional short reason** (e.g. "sick", "family thing")
- **A shop can have multiple manager/admin accounts** (not just one owner login)
- **Staff can mark themselves unavailable** for certain shifts/days — those get skipped when the bot broadcasts (not everyone is always pinged)
- **Manager can also volunteer to cover a shift themselves**, not just approve/oversee others

## Confirmed: Roles & Pay
- **Staff have a simple role/tag** (e.g. cook, cashier) — needed so shifts requiring a specific role only broadcast to staff who can actually cover them (not a full job/permissions system, just a matching tag)
- **Shift-role matching required** — coverage broadcasts should go only to staff whose role matches what the shift needs
- **No pay/wage tracking** — this bot is not concerned with pay at all, completely separate concern

## Confirmed: Onboarding, Staff Removal, Race Condition
- **Staff onboarding requires full Telegram linking upfront** — manager sends invite, staff must click and "Start" the bot before they're properly added (no adding someone in limbo without a linked Telegram account)
- **Staff who leave are soft-deactivated/archived**, not deleted — their record stays for history but they stop being pinged for coverage
- **First response wins, strictly** — if multiple staff respond near-simultaneously, the first is confirmed and others get a friendly "already covered" message (no manager picking between responses)

## Confirmed: Super-Admin & History Retention
- **Super-admin view needed** — Michael (product owner) needs a way to see across all shops, for support/billing purposes later (separate from individual shop manager accounts)
- **Coverage request history kept permanently** — full log retained, not purged

## Next Steps
- Define data model (tables: shops, staff [with role tag + active/archived status], coverage requests [permanent history], responses, shifts [with required role]) — many-to-many staff↔shop, one-to-many shops↔managers, availability/opt-out field, role field, super-admin role separate from shop managers
- Define bot commands/flow in more detail (now includes: request coverage w/ reason, respond to broadcast, check own upcoming shifts, mark unavailable, onboarding/Start flow)
- Define dashboard pages needed for v1 (now includes: signup/login flow, multi-manager invites, super-admin cross-shop view)
