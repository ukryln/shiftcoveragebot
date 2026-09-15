-- Lets managers link their own Telegram account, so the bot can send them
-- Approve/Reject messages for coverage requests. Run in the Supabase SQL Editor.

alter table users add column if not exists telegram_id bigint unique;
