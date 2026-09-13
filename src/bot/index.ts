import { bot } from "./bot";

// Local development runner — uses long polling (the bot repeatedly asks
// Telegram "any new messages?") so it works without needing a public URL.
// When we deploy for real, this gets swapped for a webhook instead, which
// is more efficient but needs a real HTTPS address to receive updates at.
bot.start();

console.log(`Bot @${process.env.TELEGRAM_BOT_USERNAME} is running (long polling)...`);
