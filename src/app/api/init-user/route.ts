import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server-client";
import type { Database } from "@/types/database";
import { logError, logInfo } from "@/lib/logger";

export const runtime = "nodejs";

type UsersTable = Database["public"]["Tables"]["users"];

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();

  try {
    const { data, error } = await supabase
      .from<"users", UsersTable>("users")
      .upsert(
        { clerk_id: userId },
        { onConflict: "clerk_id", ignoreDuplicates: true },
      )
      .select("clerk_id, is_premium")
      .maybeSingle();

    if (error) {
      throw error;
    }

    logInfo("user.init", "Ensured user exists in DB", { clerk_id: userId });
    return NextResponse.json({ ok: true, user: data ?? { clerk_id: userId, is_premium: false } });
  } catch (err) {
    logError("user.init_failed", "Failed to init user", { clerk_id: userId }, err);
    return NextResponse.json({ error: "Failed to init user" }, { status: 500 });
  }
}

