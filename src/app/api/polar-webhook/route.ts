import { NextResponse, type NextRequest } from "next/server";
import { Webhook, WebhookVerificationError } from "standardwebhooks";
import { getSupabaseAdminClient } from "@/lib/supabase/server-client";
import { logError, logInfo } from "@/lib/logger";
import type { Database } from "@/types/database";

export const runtime = "nodejs";

type UsersTable = Database["public"]["Tables"]["users"];

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdminClient();

  // Read the raw body for signature verification
  const rawBody = await req.text();

  const headers = {
    "webhook-id": req.headers.get("webhook-id") ?? "",
    "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
    "webhook-signature": req.headers.get("webhook-signature") ?? "",
  } as const;

  try {
    const secret = process.env.POLAR_WEBHOOK_SECRET || "";
    if (!secret) {
      logError("polar.webhook.missing_secret", "POLAR_WEBHOOK_SECRET not set in environment");
      return new NextResponse("", { status: 500 });
    }
    const wh = new Webhook(secret);
    const evt: any = wh.verify(rawBody, headers);

    const type: string = (evt?.type ?? evt?.event ?? "").toString();
    const data: any = evt?.data ?? evt?.payload ?? evt ?? {};
    const metadata: Record<string, any> = data?.metadata ?? {};
    const referenceId: string | undefined = (metadata?.reference_id ?? metadata?.referenceId ?? "").toString() || undefined;

    logInfo("polar.webhook.received", "Received Polar webhook", {
      type,
      hasReferenceId: Boolean(referenceId),
    });

    // Minimal: unlock premium on order.created (sandbox one-time purchase)
    if (type === "order.created" || type === "order.completed" || type === "checkout.completed") {
      // If we have a reference_id, we treat that as Clerk user id
      if (referenceId) {
        const upsertPayload = {
          clerk_id: referenceId,
          is_premium: true,
        } satisfies UsersTable["Insert"];

        const { error } = await supabase
          .from<"users", UsersTable>("users")
          .upsert(upsertPayload, { onConflict: "clerk_id" })
          .select("clerk_id")
          .maybeSingle();

        if (error) {
          throw error;
        }

        logInfo("polar.webhook.premium_unlocked", "Premium enabled for user", {
          clerk_id: referenceId,
        });
      } else {
        logError(
          "polar.webhook.missing_reference",
          "Webhook missing reference_id; cannot match user.",
          { type },
        );
      }
    }

    return new NextResponse("", { status: 202 });
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      logError(
        "polar.webhook.signature_invalid",
        "Invalid webhook signature",
        undefined,
        err,
      );
      return new NextResponse("", { status: 403 });
    }

    logError("polar.webhook.error", "Failed processing webhook", undefined, err);
    return new NextResponse("", { status: 500 });
  }
}
