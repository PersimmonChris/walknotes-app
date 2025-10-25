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
    const evt: unknown = wh.verify(rawBody, headers);

    type UnknownRecord = Record<string, unknown>;

    const typeCandidateA =
      typeof evt === "object" && evt !== null && "type" in (evt as UnknownRecord)
        ? (evt as UnknownRecord)["type"]
        : undefined;
    const typeCandidateB =
      typeof evt === "object" && evt !== null && "event" in (evt as UnknownRecord)
        ? (evt as UnknownRecord)["event"]
        : undefined;
    const type: string =
      typeof typeCandidateA === "string"
        ? typeCandidateA
        : typeof typeCandidateB === "string"
          ? typeCandidateB
          : "";

    const dataCandidateA =
      typeof evt === "object" && evt !== null && "data" in (evt as UnknownRecord)
        ? (evt as UnknownRecord)["data"]
        : undefined;
    const dataCandidateB =
      typeof evt === "object" && evt !== null && "payload" in (evt as UnknownRecord)
        ? (evt as UnknownRecord)["payload"]
        : undefined;
    const data: unknown = dataCandidateA ?? dataCandidateB ?? evt;

    const metadataCandidate =
      typeof data === "object" && data !== null && "metadata" in (data as UnknownRecord)
        ? (data as UnknownRecord)["metadata"]
        : undefined;
    const metadata: Record<string, unknown> =
      typeof metadataCandidate === "object" && metadataCandidate !== null
        ? (metadataCandidate as Record<string, unknown>)
        : {};

    const refA = metadata["reference_id"];
    const refB = metadata["referenceId"];
    const referenceId: string | undefined =
      typeof refA === "string" && refA.length > 0
        ? refA
        : typeof refB === "string" && refB.length > 0
          ? refB
          : undefined;

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
          .from("users")
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
