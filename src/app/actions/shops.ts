"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

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

  const { data: shop, error: shopError } = await supabaseAdmin
    .from("shops")
    .insert({ name: name.trim() })
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

  revalidatePath("/dashboard");
}
