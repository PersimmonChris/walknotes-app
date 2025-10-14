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
