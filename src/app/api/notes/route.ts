import { Buffer } from "buffer";
import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server-client";
import { getServerEnv } from "@/lib/env";
import { getWritingStyleById, WRITING_STYLES } from "@/lib/styles";
import { logError, logInfo, logWarn } from "@/lib/logger";
import { transcribeAudio, rewriteTranscript } from "@/lib/ai";
import type { Database } from "@/types/database";
import type { PostgrestError } from "@supabase/supabase-js";

export const runtime = "nodejs";

const MAX_FREE_NOTES = 3;
const DEFAULT_PAGE_SIZE = 6;

type NotesTable = Database["public"]["Tables"]["notes"];
type NoteRow = NotesTable["Row"];
type NoteInsert = NotesTable["Insert"];
export async function GET(request: NextRequest) {
  const authResult = await auth();
  const { userId } = authResult;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE);
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE;

  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  // Determine premium status for the signed-in user
  let isPremium = false;
  try {
    type UsersTable = Database["public"]["Tables"]["users"];
    const { data: userRow, error: userError } = await supabase
      .from<"users", UsersTable>("users")
      .select("is_premium")
      .eq("clerk_id", userId)
      .maybeSingle();

    if (userError) {
      const pgErr = userError as PostgrestError | null;
      const code = pgErr?.code;
      const message = pgErr?.message;
      const missingUsers =
        code === "42P01" ||
        (message && message.toLowerCase().includes("relation") && message.includes("users") && message.toLowerCase().includes("does not exist"));
      if (missingUsers) {
        logWarn("notes.list.users_table_missing", "users table not found; treating as non-premium", { userId });
        isPremium = false;
      } else {
        throw userError;
      }
    } else {
      isPremium = Boolean(userRow?.is_premium);
    }
  } catch (err) {
    logError("notes.list.user_fetch_failed", "Failed to fetch user for premium check", { userId }, err);
    return NextResponse.json({ error: "Unable to verify user status." }, { status: 500 });
  }

  const { data, error, count } = await supabase
    .from<"notes", NotesTable>("notes")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    logError(
      "notes.list.failed",
      "Failed to fetch notes list",
      { userId, from, to },
      error,
    );
    return NextResponse.json({ error: "Failed to load notes." }, { status: 500 });
  }

  return NextResponse.json({
    notes: data ?? [],
    page: safePage,
    pageSize: safePageSize,
    total: count ?? 0,
    styles: WRITING_STYLES,
    isPremium,
  });
}

export async function POST(request: NextRequest) {
  const authResult = await auth();
  const { userId } = authResult;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const env = getServerEnv();
  const formData = await request.formData();
  const styleId = formData.get("styleId")?.toString() ?? null;
  const style = getWritingStyleById(styleId);

  if (!style) {
    return NextResponse.json({ error: "Invalid style selection." }, { status: 400 });
  }

  const file = formData.get("audio");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No audio file provided." }, { status: 400 });
  }

  // Allow unlimited for premium users
  type UsersTable = Database["public"]["Tables"]["users"];
  const { data: userRow, error: userError } = await supabase
    .from<"users", UsersTable>("users")
    .select("is_premium")
    .eq("clerk_id", userId)
    .maybeSingle();

  let isPremium = false;
  if (userError) {
    const pgErr = userError as PostgrestError | null;
    const code = pgErr?.code;
    const message = pgErr?.message;
    const missingUsers = code === "42P01" || (message && message.toLowerCase().includes("relation") && message.includes("users") && message.toLowerCase().includes("does not exist"));
    if (missingUsers) {
      // Fallback gracefully if users table hasn't been created yet
      logWarn("notes.create.users_table_missing", "users table not found; treating as non-premium", { userId });
      isPremium = false;
    } else {
      logError(
        "notes.create.user_fetch_failed",
        "Failed to fetch user for premium check",
        { userId, code, message },
        userError,
      );
      return NextResponse.json({ error: "Unable to verify user status." }, { status: 500 });
    }
  } else {
    isPremium = Boolean(userRow?.is_premium);
  }
  if (!isPremium) {
    const { count, error: countError } = await supabase
      .from<"notes", NotesTable>("notes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed");

    if (countError) {
      logError(
        "notes.create.count_failed",
        "Failed to fetch existing notes count",
        { userId },
        countError,
      );
      return NextResponse.json({ error: "Unable to verify note limit." }, { status: 500 });
    }

    if ((count ?? 0) >= MAX_FREE_NOTES) {
      return NextResponse.json(
        { error: "LIMIT_REACHED", message: "Go Premium and unlock unlimited notes." },
        { status: 403 },
      );
    }
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64Audio = buffer.toString("base64");
  const extension = file.name.split(".").pop() || "webm";
  const fileName = `${Date.now()}-${randomUUID()}.${extension}`;
  const filePath = `${userId}/${fileName}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from(env.SUPABASE_NOTES_BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type || "audio/webm",
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    logInfo("notes.create.audio_uploaded", "Audio uploaded to storage", {
      userId,
      bucket: env.SUPABASE_NOTES_BUCKET,
      path: filePath,
      byteSize: buffer.byteLength,
    });

    const transcript = await transcribeAudio({
      base64Audio,
      mimeType: file.type || "audio/webm",
      userId,
    });

    const rewrite = await rewriteTranscript({
      transcript,
      style,
      userId,
    });

    const { data: insertedNote, error: insertError } = await supabase
      .from<"notes", NotesTable>("notes")
      .insert({
        user_id: userId,
        style_id: style.id,
        style_name: style.name,
        style_description: style.description,
        title: rewrite.title,
        content: rewrite.content,
        transcript,
        transcript_summary: rewrite.transcriptSummary,
        audio_path: filePath,
        audio_mime_type: file.type || "audio/webm",
        status: "completed",
      } satisfies NoteInsert)
      .select()
      .single<NoteRow>();

    if (insertError) {
      throw insertError;
    }

    logInfo("notes.create.completed", "Note successfully created", {
      userId,
      noteId: insertedNote.id,
      styleId: style.id,
    });

    return NextResponse.json({ note: insertedNote });
  } catch (error) {
    logError(
      "notes.create.failed",
      "Unable to create note",
      {
        userId,
        styleId: style.id,
        path: filePath,
      },
      error,
    );

    await supabase.from<"notes", NotesTable>("notes").insert({
      user_id: userId,
      style_id: style.id,
      style_name: style.name,
      style_description: style.description,
      title: `Failed Note (${style.name})`,
      content: "",
      transcript: "",
      transcript_summary: null,
      audio_path: filePath,
      audio_mime_type: file.type || "audio/webm",
      status: "failed",
      last_error:
        error instanceof Error ? `${error.name}: ${error.message}` : "Unknown error during processing",
    } satisfies NoteInsert);

    return NextResponse.json(
      { error: "Failed to create note. Please try again." },
      { status: 500 },
    );
  }
}
