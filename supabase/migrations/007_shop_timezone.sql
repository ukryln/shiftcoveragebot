-- Each shop gets its own timezone, so shift times in the bot and dashboard
-- are shown correctly for businesses outside New Zealand. Existing shops
-- default to Pacific/Auckland, which is what they were already using.
alter table shops add column if not exists timezone text not null default 'Pacific/Auckland';
