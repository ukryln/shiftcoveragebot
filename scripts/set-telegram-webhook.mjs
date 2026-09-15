// One-time setup: tells Telegram where to send updates once the site is
// deployed. Run with: node --env-file=.env.local scripts/set-telegram-webhook.mjs <your-site-url>
// Example: node --env-file=.env.local scripts/set-telegram-webhook.mjs https://shiftcoveragebot.netlify.app

const siteUrl = process.argv[2];
if (!siteUrl) {
  console.error("Usage: node --env-file=.env.local scripts/set-telegram-webhook.mjs <site-url>");
  process.exit(1);
}

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
if (!token || !secret) {
  console.error("TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET must be set (use --env-file=.env.local)");
  process.exit(1);
}

const webhookUrl = `${siteUrl.replace(/\/$/, "")}/api/telegram-webhook`;

const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: webhookUrl, secret_token: secret }),
});

const result = await response.json();
console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
  process.exit(1);
}

console.log(`\nWebhook set to: ${webhookUrl}`);
