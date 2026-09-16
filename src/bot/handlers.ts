import { InlineKeyboard, type Context } from "grammy";
import { bot } from "./bot";
import { supabaseAdmin } from "../lib/supabase/admin";
import { formatShiftLine, staffMenu } from "./format";
import { awaitingReasonFor } from "./state";

// Best-effort UI feedback (acknowledging a button tap, editing a message) can
// fail for reasons that have nothing to do with our own logic — a stale
// callback query, a message that's too old to edit, etc. Since nothing here
// catches errors automatically for direct handleUpdate() calls (grammY's
// bot.catch() only covers the polling loop), an unguarded failure here would
// silently abort everything after it in the same handler — including
// database writes and notifications still to come. Wrap these calls so a UI
// hiccup never blocks the actual business logic.
async function safeUi(action: () => Promise<unknown>) {
  try {
    await action();
  } catch (err) {
    console.error("Non-critical UI call failed:", err);
  }
}

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

// ---- Staff: browse past covered shifts to claim sick pay for ----

bot.hears("💰 Sick Pay Claims", async (ctx) => {
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

  const { data: requests } = await supabaseAdmin
    .from("coverage_requests")
    .select("id, shifts!coverage_requests_shift_id_fkey(start_time, end_time, role_required)")
    .eq("requested_by", staffMember.id)
    .eq("status", "filled")
    .is("sick_leave_status", null)
    .order("resolved_at", { ascending: false })
    .limit(10)
    .returns<{ id: string; shifts: { start_time: string; end_time: string; role_required: string } }[]>();

  if (!requests || requests.length === 0) {
    await ctx.reply("You have no covered shifts available to claim sick pay for.", { reply_markup: staffMenu });
    return;
  }

  const keyboard = new InlineKeyboard();
  for (const request of requests) {
    keyboard
      .text(
        `Claim: ${formatShiftLine(request.shifts.start_time, request.shifts.end_time, request.shifts.role_required)}`,
        `claimsick:${request.id}`
      )
      .row();
  }

  await ctx.reply("Shifts you've given away — tap one to claim sick pay for it:", {
    reply_markup: keyboard,
  });
});

// ---- Staff: tapped "Claim" for a covered shift ----

bot.on("callback_query:data", async (ctx, next) => {
  const data = ctx.callbackQuery.data;
  if (!data.startsWith("claimsick:")) {
    await next();
    return;
  }

  const requestId = data.slice("claimsick:".length);
  const telegramId = ctx.from.id;

  const { data: staffMember } = await supabaseAdmin
    .from("staff")
    .select("id, name")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  const { data: updated } = await supabaseAdmin
    .from("coverage_requests")
    .update({ sick_leave_status: "pending", sick_leave_requested_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("requested_by", staffMember?.id ?? "")
    .eq("status", "filled")
    .is("sick_leave_status", null)
    .select("id, shifts!coverage_requests_shift_id_fkey(shop_id, start_time, end_time, role_required)")
    .maybeSingle()
    .returns<{
      id: string;
      shifts: { shop_id: string; start_time: string; end_time: string; role_required: string };
    } | null>();

  if (!staffMember || !updated) {
    await safeUi(() => ctx.answerCallbackQuery({ text: "That claim can't be made right now." }));
    return;
  }

  await safeUi(() => ctx.answerCallbackQuery({ text: "Claim sent to your manager!" }));
  await safeUi(() => ctx.editMessageText(`${ctx.callbackQuery.message?.text}\n\n(Sick pay claim sent)`));

  const shift = updated.shifts;
  const { data: managerLinks } = await supabaseAdmin
    .from("shop_managers")
    .select("users(telegram_id)")
    .eq("shop_id", shift.shop_id)
    .returns<{ users: { telegram_id: number | null } }[]>();

  const managerTelegramIds = (managerLinks ?? [])
    .map((row) => row.users?.telegram_id)
    .filter((id): id is number => Boolean(id));

  const shiftLine = formatShiftLine(shift.start_time, shift.end_time, shift.role_required);
  const keyboard = new InlineKeyboard()
    .text("✅ Approve", `sickapprove:${requestId}`)
    .text("❌ Reject", `sickreject:${requestId}`);

  for (const managerTelegramId of managerTelegramIds) {
    try {
      await bot.api.sendMessage(
        managerTelegramId,
        `${staffMember.name} is requesting sick pay for a shift they already gave away:\n${shiftLine} (${shift.role_required})`,
        { reply_markup: keyboard }
      );
    } catch (err) {
      console.error("Failed to notify manager of sick pay claim", managerTelegramId, err);
    }
  }
});

// ---- Manager: tapped Approve or Reject on a sick pay claim ----

bot.on("callback_query:data", async (ctx, next) => {
  const data = ctx.callbackQuery.data;
  const isApprove = data.startsWith("sickapprove:");
  const isReject = data.startsWith("sickreject:");

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
    .select("id, sick_leave_status, requested_by, shifts!coverage_requests_shift_id_fkey(shop_id)")
    .eq("id", requestId)
    .maybeSingle()
    .returns<{ id: string; sick_leave_status: string | null; requested_by: string; shifts: { shop_id: string } } | null>();

  if (!manager || !request) {
    await ctx.answerCallbackQuery({ text: "Couldn't find that claim." });
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

  if (request.sick_leave_status !== "pending") {
    await ctx.answerCallbackQuery({ text: "This claim was already handled." });
    return;
  }

  const newStatus = isApprove ? "approved" : "rejected";
  await supabaseAdmin
    .from("coverage_requests")
    .update({
      sick_leave_status: newStatus,
      sick_leave_resolved_at: new Date().toISOString(),
      sick_leave_resolved_by: manager.id,
    })
    .eq("id", requestId);

  await safeUi(() => ctx.answerCallbackQuery());
  await safeUi(() =>
    ctx.editMessageText(`${ctx.callbackQuery.message?.text}\n\n${isApprove ? "✅ Approved" : "❌ Rejected"}`)
  );

  const { data: requesterStaff } = await supabaseAdmin
    .from("staff")
    .select("telegram_id")
    .eq("id", request.requested_by)
    .maybeSingle();

  if (requesterStaff?.telegram_id) {
    const outcome = isApprove
      ? "Your sick pay claim was approved — those hours are back in your weekly total."
      : "Your sick pay claim was rejected.";
    try {
      await bot.api.sendMessage(requesterStaff.telegram_id, outcome);
    } catch (err) {
      console.error("Failed to notify requester of sick pay claim outcome", err);
    }
  }
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
    await safeUi(() => ctx.answerCallbackQuery());
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
    await broadcastRequest(request.id);
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
    .eq("shop_id", shopId)
    .returns<{ users: { telegram_id: number | null } }[]>();

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
    .neq("user_id", excludingManagerId)
    .returns<{ user_id: string; users: { telegram_id: number | null } }[]>();

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
    .select("id, status, shift_id, requested_by, shifts!coverage_requests_shift_id_fkey(shop_id, start_time, end_time, role_required)")
    .eq("id", requestId)
    .maybeSingle()
    .returns<{
      id: string;
      status: string;
      shift_id: string;
      requested_by: string;
      shifts: { shop_id: string; start_time: string; end_time: string; role_required: string };
    } | null>();

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

  await safeUi(() => ctx.answerCallbackQuery());
  await safeUi(() =>
    ctx.editMessageText(`${ctx.callbackQuery.message?.text}\n\n${isApprove ? "✅ Approved" : "❌ Rejected"}`)
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

  if (isApprove) {
    await broadcastRequest(requestId);
  }
});

// ---- Broadcast an approved request to matching, available staff ----

async function broadcastRequest(requestId: string) {
  const { data: request } = await supabaseAdmin
    .from("coverage_requests")
    .select("id, requested_by, shifts!coverage_requests_shift_id_fkey(shop_id, start_time, end_time, role_required)")
    .eq("id", requestId)
    .maybeSingle()
    .returns<{
      id: string;
      requested_by: string;
      shifts: { shop_id: string; start_time: string; end_time: string; role_required: string };
    } | null>();

  if (!request || !request.shifts) return;
  const shift = request.shifts;

  const { data: staffLinks } = await supabaseAdmin
    .from("staff_shops")
    .select("staff(id, role, status, telegram_id)")
    .eq("shop_id", shift.shop_id)
    .returns<
      { staff: { id: string; role: string; status: string; telegram_id: number | null } }[]
    >();

  const eligibleStaff = (staffLinks ?? [])
    .map((row) => row.staff)
    .filter((staffMember): staffMember is NonNullable<typeof staffMember> => Boolean(staffMember))
    .filter((staffMember) => staffMember.status === "active")
    .filter((staffMember) => staffMember.role === shift.role_required)
    .filter((staffMember) => staffMember.id !== request.requested_by)
    .filter((staffMember) => Boolean(staffMember.telegram_id));

  if (eligibleStaff.length === 0) {
    const { data: requesterStaff } = await supabaseAdmin
      .from("staff")
      .select("telegram_id")
      .eq("id", request.requested_by)
      .maybeSingle();
    if (requesterStaff?.telegram_id) {
      try {
        await bot.api.sendMessage(
          requesterStaff.telegram_id,
          "I couldn't find anyone else with a matching role to offer this shift to — your manager may need to sort this out directly."
        );
      } catch (err) {
        console.error("Failed to notify requester of empty broadcast", err);
      }
    }
    return;
  }

  await supabaseAdmin.from("coverage_responses").insert(
    eligibleStaff.map((staffMember) => ({
      coverage_request_id: requestId,
      staff_id: staffMember.id,
      response: "no_response",
    }))
  );

  const shiftLine = formatShiftLine(shift.start_time, shift.end_time, shift.role_required);
  const keyboard = new InlineKeyboard().text("✅ I'll cover it", `cover:${requestId}`);

  for (const staffMember of eligibleStaff) {
    try {
      await bot.api.sendMessage(
        staffMember.telegram_id!,
        `Coverage needed:\n${shiftLine} (${shift.role_required})`,
        { reply_markup: keyboard }
      );
    } catch (err) {
      console.error("Failed to notify staff for broadcast", staffMember.telegram_id, err);
    }
  }
}

// ---- Staff: tapped "I'll cover it" — first response wins, strictly ----

bot.on("callback_query:data", async (ctx, next) => {
  const data = ctx.callbackQuery.data;
  if (!data.startsWith("cover:")) {
    await next();
    return;
  }

  const requestId = data.slice("cover:".length);
  const telegramId = ctx.from.id;

  const { data: staffMember } = await supabaseAdmin
    .from("staff")
    .select("id, name")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (!staffMember) {
    await ctx.answerCallbackQuery({ text: "I don't recognize you." });
    return;
  }

  // Atomic compare-and-swap: only succeeds for whichever tap Postgres
  // processes first, so simultaneous taps can never both "win".
  const { data: updated } = await supabaseAdmin
    .from("coverage_requests")
    .update({ status: "filled", covered_by: staffMember.id, resolved_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("status", "broadcasting")
    .select("id, requested_by, shifts!coverage_requests_shift_id_fkey(shop_id, role_required, start_time, end_time)")
    .maybeSingle()
    .returns<{
      id: string;
      requested_by: string;
      shifts: { shop_id: string; role_required: string; start_time: string; end_time: string };
    } | null>();

  if (!updated) {
    await safeUi(() => ctx.answerCallbackQuery({ text: "Sorry, this shift is already covered!" }));
    await safeUi(() => ctx.editMessageText(`${ctx.callbackQuery.message?.text}\n\n(Already covered by someone else)`));
    return;
  }

  await safeUi(() => ctx.answerCallbackQuery({ text: "You're covering this shift!" }));
  await safeUi(() => ctx.editMessageText(`${ctx.callbackQuery.message?.text}\n\n✅ You're covering this shift!`));

  await supabaseAdmin
    .from("coverage_responses")
    .update({ response: "yes", responded_at: new Date().toISOString() })
    .eq("coverage_request_id", requestId)
    .eq("staff_id", staffMember.id);

  // Record the swap on the roster: insert a NEW shift row for the covering
  // staff member rather than reassigning the original one, so the original
  // schedule stays a true historical record (see roster-grid's red/blue
  // cell coloring, which relies on this new row existing).
  const coveredShift = updated.shifts;
  if (coveredShift) {
    const { error: insertShiftError } = await supabaseAdmin.from("shifts").insert({
      shop_id: coveredShift.shop_id,
      staff_id: staffMember.id,
      role_required: coveredShift.role_required,
      start_time: coveredShift.start_time,
      end_time: coveredShift.end_time,
      covering_request_id: updated.id,
    });
    if (insertShiftError) {
      console.error("Failed to insert covering shift row", insertShiftError);
    }
  }

  const { data: otherResponses } = await supabaseAdmin
    .from("coverage_responses")
    .select("staff(telegram_id)")
    .eq("coverage_request_id", requestId)
    .neq("staff_id", staffMember.id)
    .returns<{ staff: { telegram_id: number | null } }[]>();

  for (const row of otherResponses ?? []) {
    const otherTelegramId = row.staff?.telegram_id;
    if (!otherTelegramId) continue;
    try {
      await bot.api.sendMessage(otherTelegramId, "This shift has already been covered — thanks anyway!");
    } catch (err) {
      console.error("Failed to notify other pinged staff", otherTelegramId, err);
    }
  }

  const { data: requesterStaff } = await supabaseAdmin
    .from("staff")
    .select("telegram_id")
    .eq("id", updated.requested_by)
    .maybeSingle();

  if (requesterStaff?.telegram_id) {
    try {
      await bot.api.sendMessage(
        requesterStaff.telegram_id,
        `Good news — ${staffMember.name} is covering your shift!`
      );
    } catch (err) {
      console.error("Failed to notify requester", err);
    }
  }

  const { data: managerLinks } = await supabaseAdmin
    .from("shop_managers")
    .select("users(telegram_id)")
    .eq("shop_id", updated.shifts!.shop_id)
    .returns<{ users: { telegram_id: number | null } }[]>();

  const managerTelegramIds = (managerLinks ?? [])
    .map((row) => row.users?.telegram_id)
    .filter((id): id is number => Boolean(id));

  for (const managerTelegramId of managerTelegramIds) {
    try {
      await bot.api.sendMessage(
        managerTelegramId,
        `${staffMember.name} is now covering the shift that needed coverage.`
      );
    } catch (err) {
      console.error("Failed to notify manager of coverage", managerTelegramId, err);
    }
  }
});
