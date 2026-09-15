import { Bot } from "grammy";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set — check .env.local");
}

export const bot = new Bot(token);

// Without this, one bad update (e.g. a staff member who blocked the bot, or
// a momentary database hiccup) would crash the whole bot process instead of
// just failing that one interaction. Note: this only protects the polling
// loop (bot.start()) - a future webhook route needs its own try/catch, see
// grammY's own docs on Bot.catch().
bot.catch((err) => {
  console.error("Bot error while handling an update:", err.error);
});
