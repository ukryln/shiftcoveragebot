# Shift Coverage Bot — Data Model (v0.1 Draft)

*Last updated: 3 Sept 2026*
*Companion doc to shift-coverage-bot-spec.md*

## Overview
This defines the database tables needed based on all decisions made in the main spec doc. Written in plain terms first, with suggested field names for the technical build.

---

## 1. `shops`
The business/tenant. Everything else belongs to a shop (or multiple, for staff).

| Field | Notes |
|---|---|
| id | unique ID |
| name | shop name |
| created_at | signup date |

---

## 2. `users`
People who log into the dashboard (managers). Supports multiple managers per shop + a super-admin.

| Field | Notes |
|---|---|
| id | unique ID |
| email | login |
| password_hash | login |
| is_super_admin | true only for Michael's account — sees across all shops |
| created_at | |

## 3. `shop_managers` (link table)
Connects users to the shop(s) they manage — supports multiple managers per shop.

| Field | Notes |
|---|---|
| user_id | → users |
| shop_id | → shops |

---

## 4. `staff`
The workers who get pinged via Telegram. Not the same as `users` — staff don't log into the dashboard, they interact via bot.

| Field | Notes |
|---|---|
| id | unique ID |
| name | |
| role | simple tag, e.g. "cook", "cashier" — used to match shifts |
| telegram_id | set once staff completes onboarding (clicks bot link + Start) |
| status | pending / active / archived (pending = added by manager but hasn't clicked bot link yet; soft-delete via archived when staff leaves) |
| created_at | |

## 5. `staff_shops` (link table)
Connects staff to the shop(s) they work at — supports one staff member working multiple shops.

| Field | Notes |
|---|---|
| staff_id | → staff |
| shop_id | → shops |

---

## 6. `shifts`
The actual schedule — who's rostered on, when, where, and what role it requires.

| Field | Notes |
|---|---|
| id | unique ID |
| shop_id | → shops |
| staff_id | who's rostered (nullable if unfilled) |
| role_required | must match a staff member's role to cover |
| start_time | |
| end_time | |

## 7. `staff_availability` (opt-outs)
Days/times a staff member has marked themselves as never available — skipped when broadcasting.

| Field | Notes |
|---|---|
| id | unique ID |
| staff_id | → staff |
| day_of_week / date | recurring (e.g. "never Sundays") or specific date |
| note | optional reason |

---

## 8. `coverage_requests`
Created when a staff member needs their shift covered.

| Field | Notes |
|---|---|
| id | unique ID |
| shift_id | → shifts (the shift needing coverage) |
| requested_by | → staff (who asked) |
| reason | optional short text ("sick", "family thing") |
| status | pending_approval → broadcasting → filled / cancelled |
| approved_by | → users (manager who approved) |
| covered_by | → staff (who ended up covering, nullable) — could also be a manager covering it themselves |
| created_at | |
| resolved_at | |

## 9. `coverage_responses`
Tracks who was pinged for a request and what they said — supports "first YES wins" logic and history.

| Field | Notes |
|---|---|
| id | unique ID |
| coverage_request_id | → coverage_requests |
| staff_id | → staff (who was pinged) |
| response | yes / no / no_response |
| responded_at | used to determine who was first |

---

## Key Relationships Recap
- A **shop** has many **staff** (via `staff_shops`) and many **managers** (via `shop_managers`)
- A **staff member** can belong to multiple **shops**
- A **shift** belongs to one shop, optionally assigned to one staff member, requires a role
- A **coverage request** is tied to one shift, has many **responses** (one per staff pinged)
- **Super-admin** (Michael) is just a `users` row with `is_super_admin = true` — sees across all shops

## Confirmed: Staff Pending State
- Staff show up as **"pending"** as soon as a manager adds them — they only become **"active"** once they've clicked the bot link and completed Telegram onboarding
- `staff.status` now has 3 values: pending / active / archived

## Open Questions for This Layer
- Do we need a separate `shop_invites` table for the self-serve manager invite flow, or handle that with simple email invite logic?

## Next Steps
- Resolve the two open questions above
- Move to bot command/flow design (what staff type/tap, what manager sees)
- Move to dashboard page-by-page design
