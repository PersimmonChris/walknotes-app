export interface Database {
  public: {
    Tables: {
      notes: {
        Row: {
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
          status: "pending" | "processing" | "completed" | "failed";
          created_at: string;
          updated_at: string;
          last_error: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          style_id: string;
          style_name: string;
          style_description: string;
          title: string;
          content: string;
          transcript: string;
          transcript_summary?: string | null;
          audio_path: string;
          audio_mime_type?: string | null;
          audio_duration_seconds?: number | null;
          status?: "pending" | "processing" | "completed" | "failed";
          created_at?: string;
          updated_at?: string;
          last_error?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          style_id?: string;
          style_name?: string;
          style_description?: string;
          title?: string;
          content?: string;
          transcript?: string;
          transcript_summary?: string | null;
          audio_path?: string;
          audio_mime_type?: string | null;
          audio_duration_seconds?: number | null;
          status?: "pending" | "processing" | "completed" | "failed";
          created_at?: string;
          updated_at?: string;
          last_error?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
