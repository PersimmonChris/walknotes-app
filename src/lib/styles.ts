export type WritingStyleId =
  | "informal-email"
  | "self-reflection"
  | "transcribed-voice-message"
  | "cut-fluff";

export interface WritingStyle {
  id: WritingStyleId;
  name: string;
  description: string;
  prompt: string;
}

export const WRITING_STYLES: WritingStyle[] = [
  {
    id: "informal-email",
    name: "Informal Email",
    description:
      "Write a friendly, casual email. Keep the message clear and concise, maintaining a baseline of professionalism and respect. Be brief unless more detail is necessary.",
    prompt:
      "Rewrite the transcript as a friendly, casual email. Keep it clear, concise, respectful, and only include details that matter.",
  },
  {
    id: "self-reflection",
    name: "Self Reflection",
    description:
      "Identify and state the fundamental issue I'm describing. Use simple, flowing sentences and prioritize absolute clarity above all else.",
    prompt:
      "Transform the transcript into a self-reflection entry. Focus on the core issue and use simple flowing sentences with maximum clarity.",
  },
  {
    id: "transcribed-voice-message",
    name: "Transcribed Voice Message",
    description:
      "Convert my spoken words into a readable text. Keep the exact same words, rhythm, and style. Only remove filler sounds (like 'hm,' 'uh') and add punctuation and spacing for easy reading.",
    prompt:
      "Turn the transcript into a readable text message that keeps the same wording and rhythm. Only remove filler sounds and add punctuation and spacing for easy reading.",
  },
  {
    id: "cut-fluff",
    name: "Cut Fluff",
    description:
      "Extract the core meaning from my text, cutting all unnecessary words. Deliver the main point in one or two focused sentences, using my own vocabulary.",
    prompt:
      "Reduce the transcript to the most essential idea in one or two sentences, using the speaker's vocabulary and removing any fluff.",
  },
];

export function getWritingStyleById(id: string | null | undefined) {
  return WRITING_STYLES.find((style) => style.id === id);
}
