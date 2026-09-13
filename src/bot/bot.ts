import { Bot, Keyboard } from "grammy";
import { supabaseAdmin } from "../lib/supabase/admin";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set — check .env.local");
}

export const bot = new Bot(token);

// Without this, one bad update (e.g. a staff member who blocked the bot, or
// a momentary database hiccup) would crash the whole bot process instead of
// just failing that one interaction.
bot.catch((err) => {
  console.error("Bot error while handling an update:", err.error);
});

// All shops are NZ-based for now, so shift times shown to staff use a fixed
// timezone rather than trying to guess one — there's no "browser" for a
// bot reply to infer a timezone from.
const SHOP_TIMEZONE = "Pacific/Auckland";

const staffMenu = new Keyboard().text("📅 My Shifts").resized();

function formatShiftLine(startIso: string, endIso: string, role: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const dayFmt = new Intl.DateTimeFormat("en-NZ", {
    timeZone: SHOP_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const timeFmt = new Intl.DateTimeFormat("en-NZ", {
    timeZone: SHOP_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `• ${dayFmt.format(start)}, ${timeFmt.format(start)}–${timeFmt.format(end)} (${role})`;
}

bot.command("start", async (ctx) => {
  const text = ctx.message?.text ?? "";
  const payload = text.split(" ").slice(1).join(" ").trim();
  const telegramId = ctx.from?.id;

  if (!payload || !telegramId) {
    await ctx.reply(
      "Welcome! To get set up, please use the invite link your manager sent you."
    );
    return;
  }

  const { data: staffMember, error } = await supabaseAdmin
    .from("staff")
    .select("id, name, status, telegram_id")
    .eq("id", payload)
    .maybeSingle();

  if (error || !staffMember) {
    await ctx.reply("That invite link doesn't look right — please check with your manager.");
    return;
  }

  if (staffMember.status === "archived") {
    await ctx.reply("This invite is no longer active — please check with your manager.");
    return;
  }

  if (staffMember.telegram_id && staffMember.telegram_id !== telegramId) {
    await ctx.reply("This invite has already been used — please check with your manager.");
    return;
  }

  await supabaseAdmin
    .from("staff")
    .update({ telegram_id: telegramId, status: "active" })
    .eq("id", staffMember.id);

  await ctx.reply(
    `Welcome, ${staffMember.name}! You're all set up. You'll get a message here whenever there's a shift that needs covering, and you can check your own upcoming shifts anytime with the menu below.`,
    { reply_markup: staffMenu }
  );
});

bot.hears("📅 My Shifts", async (ctx) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const { data: staffMember } = await supabaseAdmin
    .from("staff")
    .select("id, name")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (!staffMember) {
    await ctx.reply("I don't recognize you yet — please use the invite link your manager sent you.");
    return;
  }

  const { data: shifts } = await supabaseAdmin
    .from("shifts")
    .select("start_time, end_time, role_required")
    .eq("staff_id", staffMember.id)
    .gte("start_time", new Date().toISOString())
    .order("start_time")
    .limit(10);

  if (!shifts || shifts.length === 0) {
    await ctx.reply("You have no upcoming shifts scheduled.", { reply_markup: staffMenu });
    return;
  }

  const lines = shifts.map((shift) =>
    formatShiftLine(shift.start_time, shift.end_time, shift.role_required)
  );

  await ctx.reply(`Your upcoming shifts:\n\n${lines.join("\n")}`, { reply_markup: staffMenu });
});
