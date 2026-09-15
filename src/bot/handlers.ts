import { InlineKeyboard, type Context } from "grammy";
import { bot } from "./bot";
import { supabaseAdmin } from "../lib/supabase/admin";
import { formatShiftLine, staffMenu } from "./format";
import { awaitingReasonFor } from "./state";

// ---- Onboarding: /start staff_<id> or /start manager_<id> ----

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

  if (payload.startsWith("manager_")) {
    await handleManagerStart(ctx, payload.slice("manager_".length), telegramId);
    return;
  }

  if (payload.startsWith("staff_")) {
    await handleStaffStart(ctx, payload.slice("staff_".length), telegramId);
    return;
  }

  await ctx.reply("That invite link doesn't look right — please check with your manager.");
});

async function handleStaffStart(ctx: Context, staffId: string, telegramId: number) {
  const { data: staffMember, error } = await supabaseAdmin
    .from("staff")
    .select("id, name, status, telegram_id")
    .eq("id", staffId)
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

  const { data: existingLink } = await supabaseAdmin
    .from("staff")
    .select("id, name")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (existingLink && existingLink.id !== staffMember.id) {
    await ctx.reply(
      `This Telegram account is already linked to ${existingLink.name}. One Telegram account can only be one staff member — please check with your manager if this isn't right.`
    );
    return;
  }

  const { error: updateError } = await supabaseAdmin
    .from("staff")
    .update({ telegram_id: telegramId, status: "active" })
    .eq("id", staffMember.id);

  if (updateError) {
    await ctx.reply("Something went wrong setting up your account — please try again or check with your manager.");
    return;
  }

  await ctx.reply(
    `Welcome, ${staffMember.name}! You're all set up. You'll get a message here whenever there's a shift that needs covering, and you can check your own upcoming shifts anytime with the menu below.`,
    { reply_markup: staffMenu }
  );
}

async function handleManagerStart(ctx: Context, userId: string, telegramId: number) {
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("id, email, telegram_id")
    .eq("id", userId)
    .maybeSingle();

  if (error || !user) {
    await ctx.reply("That link doesn't look right — please try again from the dashboard.");
    return;
  }

  if (user.telegram_id && user.telegram_id !== telegramId) {
    await ctx.reply("This link has already been used — please get a fresh one from the dashboard.");
    return;
  }

  const { data: existingLink } = await supabaseAdmin
    .from("users")
    .select("id, email")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (existingLink && existingLink.id !== user.id) {
    await ctx.reply(
      `This Telegram account is already linked to the manager account ${existingLink.email}. Please get a fresh link from the account you want to use.`
    );
    return;
  }

  const { error: updateError } = await supabaseAdmin
    .from("users")
    .update({ telegram_id: telegramId })
    .eq("id", user.id);

  if (updateError) {
    await ctx.reply("Something went wrong connecting your account — please try again.");
    return;
  }

  await ctx.reply(
    "You're connected! You'll get a message here whenever one of your staff requests coverage, with buttons to approve or reject it."
  );
}

// ---- Staff: My Shifts, with a Request Coverage button per shift ----

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
    .select("id, start_time, end_time, role_required")
    .eq("staff_id", staffMember.id)
    .gte("start_time", new Date().toISOString())
    .order("start_time")
    .limit(10);

  if (!shifts || shifts.length === 0) {
    await ctx.reply("You have no upcoming shifts scheduled.", { reply_markup: staffMenu });
    return;
  }

  const keyboard = new InlineKeyboard();
  for (const shift of shifts) {
    keyboard
      .text(
        `Request coverage: ${formatShiftLine(shift.start_time, shift.end_time, shift.role_required)}`,
        `reqcov:${shift.id}`
      )
      .row();
  }

  await ctx.reply("Your upcoming shifts — tap one to request coverage for it:", {
    reply_markup: keyboard,
  });
});

// ---- Staff: tapped "Request coverage" for a specific shift ----

bot.on("callback_query:data", async (ctx, next) => {
  const data = ctx.callbackQuery.data;

  if (data.startsWith("reqcov:")) {
    const shiftId = data.slice("reqcov:".length);
    const telegramId = ctx.from.id;

    const { data: staffMember } = await supabaseAdmin
      .from("staff")
      .select("id")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    const { data: shift } = await supabaseAdmin
      .from("shifts")
      .select("id, staff_id")
      .eq("id", shiftId)
      .maybeSingle();

    if (!staffMember || !shift || shift.staff_id !== staffMember.id) {
      await ctx.answerCallbackQuery({ text: "That shift isn't yours to request coverage for." });
      return;
    }

    awaitingReasonFor.set(telegramId, shiftId);
    await ctx.answerCallbackQuery();
    await ctx.reply(
      "Want to add a reason (e.g. \"sick\")? Reply with it now, or send \"skip\" to leave it blank."
    );
    return;
  }

  await next();
});

// ---- Staff: replying with a reason (or "skip") after tapping Request coverage ----

bot.on("message:text", async (ctx, next) => {
  const telegramId = ctx.from.id;
  const shiftId = awaitingReasonFor.get(telegramId);

  if (!shiftId) {
    await next();
    return;
  }

  awaitingReasonFor.delete(telegramId);

  const reasonText = ctx.message.text.trim();
  const reason = reasonText.toLowerCase() === "skip" ? null : reasonText;

  const { data: staffMember } = await supabaseAdmin
    .from("staff")
    .select("id, name")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  const { data: shift } = await supabaseAdmin
    .from("shifts")
    .select("id, shop_id, start_time, end_time, role_required")
    .eq("id", shiftId)
    .maybeSingle();

  if (!staffMember || !shift) {
    await ctx.reply("Something went wrong finding that shift — please try again from My Shifts.");
    return;
  }

  // If the person requesting is also a manager for this shop, there's no one
  // else who needs to approve it - skip straight to broadcasting.
  const { data: managerSelf } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  let selfApprovingManagerId: string | null = null;
  if (managerSelf) {
    const { data: managesThisShop } = await supabaseAdmin
      .from("shop_managers")
      .select("user_id")
      .eq("user_id", managerSelf.id)
      .eq("shop_id", shift.shop_id)
      .maybeSingle();
    if (managesThisShop) {
      selfApprovingManagerId = managerSelf.id;
    }
  }

  const { data: request, error } = await supabaseAdmin
    .from("coverage_requests")
    .insert({
      shift_id: shift.id,
      requested_by: staffMember.id,
      reason,
      status: selfApprovingManagerId ? "broadcasting" : "pending_approval",
      approved_by: selfApprovingManagerId,
    })
    .select()
    .single();

  if (error || !request) {
    await ctx.reply("Sorry, something went wrong creating your request. Please try again.");
    return;
  }

  if (selfApprovingManagerId) {
    await ctx.reply("Request created — since you're a manager, I'm broadcasting it to the team now!", {
      reply_markup: staffMenu,
    });
    await notifyOtherManagers(shift.shop_id, selfApprovingManagerId, staffMember.name, shift, reason);
    // Broadcasting to matching staff isn't built yet - see notifyManagers'
    // approve handler for the same TODO.
  } else {
    await ctx.reply("Request sent to your manager — I'll let you know what happens!", {
      reply_markup: staffMenu,
    });
    await notifyManagers(shift.shop_id, request.id, staffMember.name, shift, reason);
  }
});

async function notifyManagers(
  shopId: string,
  requestId: string,
  staffName: string,
  shift: { start_time: string; end_time: string; role_required: string },
  reason: string | null
) {
  const { data: managerLinks } = await supabaseAdmin
    .from("shop_managers")
    .select("users(telegram_id)")
    .eq("shop_id", shopId);

  const managerTelegramIds = (managerLinks ?? [])
    .map((row) => row.users?.telegram_id)
    .filter((id): id is number => Boolean(id));

  const shiftLine = formatShiftLine(shift.start_time, shift.end_time, shift.role_required);
  const reasonLine = reason ? `\nReason: ${reason}` : "";
  const messageText = `${staffName} needs coverage for:\n${shiftLine} (${shift.role_required})${reasonLine}`;

  const keyboard = new InlineKeyboard()
    .text("✅ Approve", `approve:${requestId}`)
    .text("❌ Reject", `reject:${requestId}`);

  for (const telegramId of managerTelegramIds) {
    try {
      await bot.api.sendMessage(telegramId, messageText, { reply_markup: keyboard });
    } catch (err) {
      console.error("Failed to notify manager", telegramId, err);
    }
  }
}

async function notifyOtherManagers(
  shopId: string,
  excludingManagerId: string,
  staffName: string,
  shift: { start_time: string; end_time: string; role_required: string },
  reason: string | null
) {
  const { data: managerLinks } = await supabaseAdmin
    .from("shop_managers")
    .select("user_id, users(telegram_id)")
    .eq("shop_id", shopId)
    .neq("user_id", excludingManagerId);

  const managerTelegramIds = (managerLinks ?? [])
    .map((row) => row.users?.telegram_id)
    .filter((id): id is number => Boolean(id));

  if (managerTelegramIds.length === 0) return;

  const shiftLine = formatShiftLine(shift.start_time, shift.end_time, shift.role_required);
  const reasonLine = reason ? `\nReason: ${reason}` : "";
  const messageText = `FYI: ${staffName} requested and auto-approved coverage for their own shift:\n${shiftLine} (${shift.role_required})${reasonLine}`;

  for (const telegramId of managerTelegramIds) {
    try {
      await bot.api.sendMessage(telegramId, messageText);
    } catch (err) {
      console.error("Failed to notify manager", telegramId, err);
    }
  }
}

// ---- Manager: tapped Approve or Reject ----

bot.on("callback_query:data", async (ctx, next) => {
  const data = ctx.callbackQuery.data;
  const isApprove = data.startsWith("approve:");
  const isReject = data.startsWith("reject:");

  if (!isApprove && !isReject) {
    await next();
    return;
  }

  const requestId = data.slice(data.indexOf(":") + 1);
  const telegramId = ctx.from.id;

  const { data: manager } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  const { data: request } = await supabaseAdmin
    .from("coverage_requests")
    .select("id, status, shift_id, requested_by, shifts(shop_id, start_time, end_time, role_required)")
    .eq("id", requestId)
    .maybeSingle();

  if (!manager || !request) {
    await ctx.answerCallbackQuery({ text: "Couldn't find that request." });
    return;
  }

  const { data: managesShop } = await supabaseAdmin
    .from("shop_managers")
    .select("user_id")
    .eq("user_id", manager.id)
    .eq("shop_id", request.shifts!.shop_id)
    .maybeSingle();

  if (!managesShop) {
    await ctx.answerCallbackQuery({ text: "You don't manage this shop." });
    return;
  }

  if (request.status !== "pending_approval") {
    await ctx.answerCallbackQuery({ text: "This request was already handled." });
    return;
  }

  const newStatus = isApprove ? "broadcasting" : "rejected";
  await supabaseAdmin
    .from("coverage_requests")
    .update({
      status: newStatus,
      approved_by: manager.id,
      resolved_at: isReject ? new Date().toISOString() : null,
    })
    .eq("id", requestId);

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    `${ctx.callbackQuery.message?.text}\n\n${isApprove ? "✅ Approved" : "❌ Rejected"}`
  );

  const { data: requester } = await supabaseAdmin
    .from("staff")
    .select("telegram_id")
    .eq("id", request.requested_by)
    .maybeSingle();

  if (requester?.telegram_id) {
    const outcome = isApprove
      ? "Your manager approved your coverage request — I'll let the team know now!"
      : "Your manager rejected your coverage request.";
    try {
      await bot.api.sendMessage(requester.telegram_id, outcome);
    } catch (err) {
      console.error("Failed to notify requester", requester.telegram_id, err);
    }
  }

  // Broadcasting to matching staff and first-to-accept comes next — for now,
  // an approved request just sits at "broadcasting" with nothing sent out yet.
});
