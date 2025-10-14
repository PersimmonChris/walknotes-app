export type NoteStatus = "pending" | "processing" | "completed" | "failed";

export interface Note {
  id: string;
  user_id: string;
  style_id: string;
  style_name: string;
  style_description: string;
  title: string;
  content: string;
  transcript: string;
  transcript_summary: string | null;
  audio_path: string;
  audio_mime_type: string | null;
  audio_duration_seconds: number | null;
  status: NoteStatus;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}
