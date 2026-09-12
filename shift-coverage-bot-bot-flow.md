# Shift Coverage Bot — Bot Flow Design (v0.1 Draft)

*Last updated: 3 Sept 2026*
*Companion doc to shift-coverage-bot-spec.md and shift-coverage-bot-data-model.md*

## Interaction Style
- **Button/menu-based**, not typed commands or free text — minimal typing for staff
- **Persistent menu** always visible with common actions

## Persistent Menu (Staff)
- 📅 My Shifts
- 🔄 (other actions TBD — e.g. availability/opt-out settings)

## Persistent Menu (Manager)
- 📋 View Open Requests (all pending/broadcasting requests, at a glance)
- ⚙️ (other actions TBD)
- Plus: inline Approve/Reject/Cancel buttons arrive directly on individual request messages as they happen

---

## Confirmed Flow: Requesting Coverage
1. Staff taps **"My Shifts"**
2. Bot shows list of their upcoming rostered shifts (from `shifts` table)
3. Staff taps the specific shift they need covered
4. Bot shows shift details + a **"Request Coverage"** button
5. Staff taps it → bot asks for an **optional reason** (text input, staff can skip)
6. Request created with status `pending_approval`
7. Manager receives Telegram message with shift details + **Approve / Reject** buttons
8. If approved → status becomes `broadcasting` → bot messages all **active, available, role-matching** staff at that shop (excludes: archived/pending staff, staff who opted out of that day, staff whose role doesn't match, the requester themselves)
9. First staff to tap **"I'll cover it"** → request status becomes `filled`, `covered_by` set
10. Other staff who responded after → get "already covered" message
11. Requester + manager both notified who's covering

## Confirmed Flow: Manager Approval
- Manager gets a Telegram message with **Approve / Reject** inline buttons directly on the request
- No separate dashboard step needed to approve — can happen right from Telegram

## Confirmed Flow: Cancellation
- No auto-timeout — request stays `broadcasting` until manager manually cancels (likely via a "Cancel Request" button on their original approval message, or from the dashboard)

---

## Open Questions
- Exact wording for broadcast message to staff (e.g. "Sarah needs coverage for Fri 5-10pm (cook). Can you cover it?") — to refine later, not blocking
- How does a staff member mark themselves unavailable (see `staff_availability` table) — a menu option, or a separate flow?

## Next Steps
- Resolve open questions above
- Move to dashboard page-by-page design
