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
// TEMPORARY — remove once the webhook secret mismatch is diagnosed.
// Returns a hash, never the actual secret, so we can compare without ever
// transmitting the real value over the wire.
export async function GET() {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  const hash = expected
    ? Buffer.from(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(expected))
      ).toString("hex")
    : null;
  return NextResponse.json({
    envVarPresent: expected !== undefined,
    envVarLength: expected?.length ?? 0,
    envVarSha256: hash,
  });
}

export async function POST(request: NextRequest) {
  const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secretHeader !== expected) {
    // Temporary diagnostic logging (no secret values, just presence/length)
    // while tracking down a mismatch on the live deployment.
    console.error("Webhook secret mismatch", {
      headerPresent: secretHeader !== null,
      headerLength: secretHeader?.length ?? 0,
      envVarPresent: expected !== undefined,
      envVarLength: expected?.length ?? 0,
      allHeaderKeys: [...request.headers.keys()],
    });
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
