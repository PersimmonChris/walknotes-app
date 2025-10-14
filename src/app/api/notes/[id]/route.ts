import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server-client";
import { getServerEnv } from "@/lib/env";
import { logError, logInfo } from "@/lib/logger";
import type { Database } from "@/types/database";

export const runtime = "nodejs";

type NotesTable = Database["public"]["Tables"]["notes"];
type NoteRow = NotesTable["Row"];
type NoteUpdate = NotesTable["Update"];

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(_request: NextRequest, context: RouteParams) {
  const { id } = await context.params;

  const authResult = await auth();
  const { userId } = authResult;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const env = getServerEnv();

  const { data: note, error: fetchError } = await supabase
    .from<"notes", NotesTable>("notes")
    .select("id, audio_path, user_id, style_name")
    .eq("id", id)
    .single<Pick<NoteRow, "id" | "audio_path" | "user_id" | "style_name">>();

  if (fetchError || !note) {
    logError(
      "notes.delete.fetch_failed",
      "Failed to locate note for deletion",
      { userId, noteId: id },
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
    .eq("id", id)
    .eq("user_id", userId);

  if (deleteError) {
    logError(
      "notes.delete.failed",
      "Failed to delete note record",
      { userId, noteId: id },
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
        { userId, noteId: id, path: note.audio_path },
        storageError,
      );
    }
  }

  logInfo("notes.delete.success", "Note deleted", {
    userId,
    noteId: id,
    styleName: note.style_name,
  });

  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest, context: RouteParams) {
  const { id } = await context.params;

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
      { userId, noteId: id },
      error,
    );
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const payload = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : null;
  const content = typeof payload?.content === "string" ? payload.content : undefined;
  const title = typeof payload?.title === "string" ? payload.title : undefined;

  if (typeof content !== "string" && typeof title !== "string") {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  const { data: note, error: fetchError } = await supabase
    .from<"notes", NotesTable>("notes")
    .select("id, user_id")
    .eq("id", id)
    .single<Pick<NoteRow, "id" | "user_id">>();

  if (fetchError || !note) {
    logError(
      "notes.update.fetch_failed",
      "Failed to locate note for update",
      { userId, noteId: id },
      fetchError,
    );
    return NextResponse.json({ error: "Note not found." }, { status: 404 });
  }

  if (note.user_id !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const updateData: NoteUpdate = {};
  if (typeof content === "string") {
    updateData.content = content;
  }
  if (typeof title === "string") {
    updateData.title = title;
  }

  const { data: updatedNote, error: updateError } = await supabase
    .from<"notes", NotesTable>("notes")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single<NoteRow>();

  if (updateError || !updatedNote) {
    logError(
      "notes.update.failed",
      "Failed to update note content",
      { userId, noteId: id },
      updateError,
    );
    return NextResponse.json({ error: "Unable to save note." }, { status: 500 });
  }

  logInfo("notes.update.success", "Note content updated", {
    userId,
    noteId: id,
  });

  return NextResponse.json({ note: updatedNote });
}
