# Shift Coverage Bot — Dashboard Design (v0.1 Draft)

*Last updated: 3 Sept 2026*
*Companion doc to shift-coverage-bot-spec.md, data model, and bot flow docs*

## Confirmed Pages (v1)

### 1. Login / Signup
- Simple email/password
- Self-serve shop signup flow (create account → create shop)
- Supports inviting additional managers to a shop

### 2. Roster & Schedule (combined page)
- One page showing staff list + their shifts together (not split into two pages)
- Table/list view for v1 (no calendar visual — simpler to build, revisit later if needed)
- Editable, spreadsheet-like grid with paste support (bulk entry from an existing spreadsheet)
- Shows staff status (pending / active / archived)
- Shows role tag per staff member
- Shows required role per shift

### 3. Coverage Requests (single list)
- One shared list showing **both live/open and past requests** together (not split into tabs)
- Each entry shows: shift, requester, reason, status, who covered (if filled)
- Manager can cancel an open request from here (in addition to Telegram)
- **Basic filters:** by status (pending/broadcasting/filled/cancelled) and by staff member

### 4. Super-Admin View (Michael only)
- Cross-shop visibility — see all shops, for support/billing purposes
- **Basic usage stats** — e.g. number of coverage requests per shop (helps gauge shop activity/health, useful for support and future billing decisions)
- Not shown to regular shop managers

## Open Questions
*(none remaining — planning phase complete)*

## Next Steps
- Planning is complete across all 4 docs (spec, data model, bot flow, dashboard)
- Next step: start actual implementation (data model → backend → bot → dashboard, in that order)
