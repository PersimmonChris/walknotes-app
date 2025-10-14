import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server-client";
import { getServerEnv } from "@/lib/env";
import { logError, logInfo } from "@/lib/logger";

export const runtime = "nodejs";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const authResult = await auth();
  const { userId } = authResult;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const env = getServerEnv();

  const { data: note, error: fetchError } = await supabase
    .from("notes")
    .select("id, audio_path, user_id, style_name")
    .eq("id", params.id)
    .single();

  if (fetchError || !note) {
    logError(
      "notes.delete.fetch_failed",
      "Failed to locate note for deletion",
      { userId, noteId: params.id },
      fetchError,
    );
    return NextResponse.json({ error: "Note not found." }, { status: 404 });
  }

  if (note.user_id !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: deleteError } = await supabase
    .from("notes")
    .delete()
    .eq("id", params.id)
    .eq("user_id", userId);

  if (deleteError) {
    logError(
      "notes.delete.failed",
      "Failed to delete note record",
      { userId, noteId: params.id },
      deleteError,
    );
    return NextResponse.json({ error: "Unable to delete note." }, { status: 500 });
  }

  if (note.audio_path) {
    const { error: storageError } = await supabase.storage
      .from(env.SUPABASE_NOTES_BUCKET)
      .remove([note.audio_path]);

    if (storageError) {
      logError(
        "notes.delete.storage_failed",
        "Deleted note but failed to remove audio from storage",
        { userId, noteId: params.id, path: note.audio_path },
        storageError,
      );
    }
  }

  logInfo("notes.delete.success", "Note deleted", {
    userId,
    noteId: params.id,
    styleName: note.style_name,
  });

  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authResult = await auth();
  const { userId } = authResult;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    logError(
      "notes.update.invalid_json",
      "Received invalid JSON while updating note",
      { userId, noteId: params.id },
      error,
    );
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const content = typeof body === "object" && body !== null ? (body as Record<string, unknown>).content : undefined;

  if (typeof content !== "string") {
    return NextResponse.json({ error: "Content is required." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  const { data: note, error: fetchError } = await supabase
    .from("notes")
    .select("id, user_id")
    .eq("id", params.id)
    .single();

  if (fetchError || !note) {
    logError(
      "notes.update.fetch_failed",
      "Failed to locate note for update",
      { userId, noteId: params.id },
      fetchError,
    );
    return NextResponse.json({ error: "Note not found." }, { status: 404 });
  }

  if (note.user_id !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: updatedNote, error: updateError } = await supabase
    .from("notes")
    .update({ content })
    .eq("id", params.id)
    .eq("user_id", userId)
    .select()
    .single();

  if (updateError || !updatedNote) {
    logError(
      "notes.update.failed",
      "Failed to update note content",
      { userId, noteId: params.id },
      updateError,
    );
    return NextResponse.json({ error: "Unable to save note." }, { status: 500 });
  }

  logInfo("notes.update.success", "Note content updated", {
    userId,
    noteId: params.id,
  });

  return NextResponse.json({ note: updatedNote });
}
