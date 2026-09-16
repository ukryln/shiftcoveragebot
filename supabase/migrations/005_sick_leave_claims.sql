-- Lets a staff member claim sick pay for a shift they already gave away
-- (after it's been covered), and lets a manager approve/reject that claim.
-- An approved claim doesn't change the shift's red/given-away coloring on
-- the roster, but its hours count back into the original staff member's
-- weekly total (see roster-grid.tsx).
alter table coverage_requests add column if not exists sick_leave_status text
  check (sick_leave_status is null or sick_leave_status in ('pending', 'approved', 'rejected'));
alter table coverage_requests add column if not exists sick_leave_requested_at timestamptz;
alter table coverage_requests add column if not exists sick_leave_resolved_at timestamptz;
alter table coverage_requests add column if not exists sick_leave_resolved_by uuid references users(id);
