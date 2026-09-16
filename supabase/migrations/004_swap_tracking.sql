-- Lets the roster grid show swap history: when staff B covers staff A's
-- shift, we insert a NEW shift row for B (rather than reassigning A's row)
-- so the original schedule stays a true historical record. This column
-- marks that a shift row exists *because* of a covered swap, and which
-- coverage request it came from.
alter table shifts add column if not exists covering_request_id uuid references coverage_requests(id);

create index if not exists idx_shifts_covering_request on shifts(covering_request_id);
