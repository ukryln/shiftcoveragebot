"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { SELECTED_SHOP_COOKIE } from "@/lib/current-shop";
import { requireShopManager } from "@/lib/auth";
import { isValidTimezone } from "@/lib/roster";

export type CreateShopFormState = { error?: string } | undefined;

export async function createShop(
  _prevState: CreateShopFormState,
  formData: FormData
): Promise<CreateShopFormState> {
  const name = formData.get("name") as string;

  if (!name || !name.trim()) {
    return { error: "Shop name is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  // The form sends the creator's own device timezone as a sensible default.
  const requestedTz = (formData.get("timezone") as string | null) ?? "";
  const timezone = requestedTz && isValidTimezone(requestedTz) ? requestedTz : "Pacific/Auckland";

  const { data: shop, error: shopError } = await supabaseAdmin
    .from("shops")
    .insert({ name: name.trim(), timezone })
    .select()
    .single();

  if (shopError) {
    return { error: shopError.message };
  }

  const { error: linkError } = await supabaseAdmin
    .from("shop_managers")
    .insert({ user_id: user.id, shop_id: shop.id });

  if (linkError) {
    return { error: linkError.message };
  }

  // Switch to the newly created shop so it's immediately visible.
  const cookieStore = await cookies();
  cookieStore.set(SELECTED_SHOP_COOKIE, shop.id, { path: "/", maxAge: 60 * 60 * 24 * 365 });

  revalidatePath("/dashboard", "layout");
}

export type ShopActionState = { error?: string } | undefined;

export async function renameShop(
  _prevState: ShopActionState,
  formData: FormData
): Promise<ShopActionState> {
  const shopId = formData.get("shopId") as string;
  const name = formData.get("name") as string;

  if (!name || !name.trim()) {
    return { error: "Shop name is required." };
  }

  const auth = await requireShopManager(shopId);
  if ("error" in auth) return { error: auth.error };

  const { error } = await supabaseAdmin.from("shops").update({ name: name.trim() }).eq("id", shopId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard", "layout");
}

export async function setShopTimezone(shopId: string, timezone: string): Promise<ShopActionState> {
  if (!isValidTimezone(timezone)) {
    return { error: "That isn't a valid timezone." };
  }

  const auth = await requireShopManager(shopId);
  if ("error" in auth) return { error: auth.error };

  const { error } = await supabaseAdmin.from("shops").update({ timezone }).eq("id", shopId);
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard", "layout");
}

export async function deleteShop(shopId: string): Promise<ShopActionState> {
  const auth = await requireShopManager(shopId);
  if ("error" in auth) return { error: auth.error };

  // Cascades in the schema clean up shop_managers, staff_shops, shifts (and
  // in turn coverage_requests/coverage_responses) automatically - staff rows
  // themselves are kept since a staff member can work at other shops too.
  const { error } = await supabaseAdmin.from("shops").delete().eq("id", shopId);

  if (error) {
    return { error: error.message };
  }

  const cookieStore = await cookies();
  if (cookieStore.get(SELECTED_SHOP_COOKIE)?.value === shopId) {
    cookieStore.delete(SELECTED_SHOP_COOKIE);
  }

  revalidatePath("/dashboard", "layout");
}

export async function setSelectedShop(shopId: string) {
  const auth = await requireShopManager(shopId);
  if ("error" in auth) return;

  const cookieStore = await cookies();
  cookieStore.set(SELECTED_SHOP_COOKIE, shopId, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/dashboard", "layout");
}

export type InviteManagerState = { error?: string; inviteLink?: string } | undefined;

export async function inviteManager(
  _prevState: InviteManagerState,
  formData: FormData
): Promise<InviteManagerState> {
  const shopId = formData.get("shopId") as string;
  const email = formData.get("email") as string;

  if (!email || !email.trim()) {
    return { error: "Email is required." };
  }

  const auth = await requireShopManager(shopId);
  if ("error" in auth) return { error: auth.error };
  const user = { id: auth.userId };

  const token = crypto.randomUUID();

  const { error } = await supabaseAdmin.from("shop_invites").insert({
    shop_id: shopId,
    email: email.trim().toLowerCase(),
    invited_by: user.id,
    token,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard", "layout");

  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";

  return { inviteLink: `${protocol}://${host}/invite/${token}` };
}

export async function acceptShopInvite(token: string): Promise<{ error?: string; shopName?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to accept this invite." };
  }

  const { data: invite } = await supabaseAdmin
    .from("shop_invites")
    .select("id, shop_id, email, status, shops(name)")
    .eq("token", token)
    .maybeSingle()
    .returns<{ id: string; shop_id: string; email: string; status: string; shops: { name: string } } | null>();

  if (!invite) {
    return { error: "That invite link doesn't look right." };
  }

  if (invite.status !== "pending") {
    return { error: "This invite has already been used or is no longer active." };
  }

  if (invite.email !== user.email?.toLowerCase()) {
    return { error: `This invite was sent to ${invite.email} — please log in with that email to accept it.` };
  }

  const { error: linkError } = await supabaseAdmin
    .from("shop_managers")
    .insert({ user_id: user.id, shop_id: invite.shop_id });

  if (linkError && !linkError.message.includes("duplicate")) {
    return { error: linkError.message };
  }

  await supabaseAdmin
    .from("shop_invites")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  const cookieStore = await cookies();
  cookieStore.set(SELECTED_SHOP_COOKIE, invite.shop_id, { path: "/", maxAge: 60 * 60 * 24 * 365 });

  return { shopName: invite.shops.name };
}
