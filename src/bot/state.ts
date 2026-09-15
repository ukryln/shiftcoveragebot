// In-memory "what is this person in the middle of doing" state, keyed by
// their Telegram user id. Simple and enough for a single long-polling dev
// process, but won't survive a restart and won't work if the bot ever runs
// as more than one process — worth revisiting (e.g. a small DB table)
// before that becomes a real deployment.
export const awaitingReasonFor = new Map<number, string>(); // telegramId -> shiftId
