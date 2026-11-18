import type { Caption } from "@/types";

export interface CaptionProvider {
  generateCaptions(topic: string): Promise<Caption[]>;
}

// Switch providers here; the rest of the application depends on this interface.
export { geminiProvider as captionProvider } from "./gemini";
