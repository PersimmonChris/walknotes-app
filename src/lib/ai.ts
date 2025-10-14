import { GoogleGenerativeAI } from "@google/generative-ai";
import { getServerEnv } from "./env";
import { logError, logInfo, logWarn } from "./logger";
import type { WritingStyle } from "./styles";

const globalForAI = globalThis as typeof globalThis & {
  __geminiClient?: GoogleGenerativeAI;
};

function getGeminiClient() {
  if (!globalForAI.__geminiClient) {
    const env = getServerEnv();
    globalForAI.__geminiClient = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }

  return globalForAI.__geminiClient;
}

export async function transcribeAudio({
  base64Audio,
  mimeType,
  userId,
}: {
  base64Audio: string;
  mimeType: string;
  userId: string;
}) {
  const env = getServerEnv();
  const client = getGeminiClient();
  const model = client.getGenerativeModel({
    model: env.GEMINI_MODEL,
  });

  try {
    logInfo("ai.transcription.start", "Submitting audio for transcription", {
      userId,
      mimeType,
    });

    const result = await model.generateContent([
      { text: "transcribe word by word." },
      {
        inlineData: {
          data: base64Audio,
          mimeType,
        },
      },
    ]);

    const transcript = result.response.text()?.trim();

    if (!transcript) {
      throw new Error("Transcription response was empty");
    }

    logInfo("ai.transcription.success", "Transcription received", {
      userId,
      transcriptPreview: transcript.slice(0, 80),
    });

    return transcript;
  } catch (error) {
    logError(
      "ai.transcription.error",
      "Transcription failed",
      {
        userId,
      },
      error,
    );
    throw error;
  }
}

export interface RewriteResult {
  title: string;
  content: string;
  transcriptSummary: string | null;
}

export async function rewriteTranscript({
  transcript,
  style,
  userId,
}: {
  transcript: string;
  style: WritingStyle;
  userId: string;
}): Promise<RewriteResult> {
  const env = getServerEnv();
  const client = getGeminiClient();
  const model = client.getGenerativeModel({
    model: env.GEMINI_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  try {
    logInfo("ai.rewrite.start", "Submitting transcript for rewrite", {
      userId,
      styleId: style.id,
    });

    const result = await model.generateContent([
      {
        text: [
          "Rewrite the following transcript in the requested style.",
          "Return valid JSON that matches this TypeScript type:",
          "type NotePayload = { title: string; content: string; transcriptSummary: string };",
          "Rules:",
          "- Title should be short and descriptive (<= 10 words).",
          "- Content should be well formatted with paragraphs separated by blank lines where appropriate.",
          "- transcriptSummary must be a single sentence summarizing the original transcript.",
          `Style definition: ${style.description}`,
          `Style prompt: ${style.prompt}`,
          "Transcript:",
          transcript,
        ].join("\n"),
      },
    ]);

    const raw = result.response.text()?.trim();

    if (!raw) {
      throw new Error("Rewrite response was empty");
    }

    let parsed:
      | {
          title?: string;
          content?: string;
          transcriptSummary?: string;
        }
      | null = null;

    try {
      parsed = JSON.parse(raw);
    } catch (jsonError) {
      logWarn("ai.rewrite.jsonFallback", "Failed to parse JSON response, falling back to raw text", {
        userId,
        raw,
        parseError: jsonError instanceof Error ? jsonError.message : "unknown",
      });
      parsed = {
        title: `WalkNote - ${style.name}`,
        content: raw,
        transcriptSummary: transcript.slice(0, 160),
      };
    }

    const title = parsed?.title?.trim() || `WalkNote - ${style.name}`;
    const content = parsed?.content?.trim() || transcript;
    const transcriptSummary =
      parsed?.transcriptSummary?.trim() || transcript.slice(0, 160);

    logInfo("ai.rewrite.success", "Rewrite completed", {
      userId,
      styleId: style.id,
      titlePreview: title.slice(0, 60),
    });

    return { title, content, transcriptSummary };
  } catch (error) {
    logError(
      "ai.rewrite.error",
      "Rewrite failed",
      {
        userId,
        styleId: style.id,
      },
      error,
    );
    throw error;
  }
}
