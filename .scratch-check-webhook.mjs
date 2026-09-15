const token = process.env.TELEGRAM_BOT_TOKEN;
const response = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
console.log(JSON.stringify(await response.json(), null, 2));
