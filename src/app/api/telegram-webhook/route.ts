import { NextRequest, NextResponse } from "next/server";
import { bot } from "@/bot/bot";
import "@/bot/handlers";

// Telegram calls this URL directly for every message, button tap, etc. once
// the webhook is registered (see scripts/set-telegram-webhook.mjs).
//
// Unlike local long-polling (src/bot/index.ts), grammY's bot.catch() does
// nothing here — it only covers the polling loop — so this route wraps
// bot.handleUpdate() itself. Individual handlers also guard their own
// best-effort UI calls (see safeUi() in src/bot/handlers.ts), found
// necessary during testing when an early failure there was silently
// aborting critical logic further down the same handler.
export async function POST(request: NextRequest) {
  const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
  if (secretHeader !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const update = await request.json();
    await bot.init();
    await bot.handleUpdate(update);
  } catch (err) {
    console.error("Telegram webhook error:", err);
  }

  // Always 200 — a non-2xx response makes Telegram retry the same update
  // later, which isn't useful for errors that won't fix themselves on retry.
  return NextResponse.json({ ok: true });
}
