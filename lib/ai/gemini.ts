import type { CaptionProvider } from "./provider";
import type { Caption } from "@/types";

const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export const geminiProvider: CaptionProvider = {
  async generateCaptions(topic: string): Promise<Caption[]> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Gemini is not configured yet. Add GEMINI_API_KEY to the server environment.");
    const response = await fetch(`${endpoint}?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Write exactly 3 distinct social media draft captions for this idea: ${topic}` }] }],
        systemInstruction: { parts: [{ text: "You are a thoughtful social media copywriter. Return only valid JSON in this exact shape: {\"captions\":[{\"caption\":\"...\",\"hashtags\":[\"#Tag\"]}]}. Captions should feel natural, concise, and distinct. Include 3-5 relevant hashtags per caption, each starting with #. Do not include markdown fences." }] },
        generationConfig: { responseMimeType: "application/json", temperature: 0.8 },
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error?.message || "Gemini could not generate captions right now.");
    }
    const body = await response.json();
    const text = body.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("");
    let result: { captions?: Caption[] };
    try { result = JSON.parse(text); } catch { throw new Error("Gemini returned an unreadable response. Please try again."); }
    const captions = Array.isArray(result.captions) ? result.captions.filter((item) => typeof item.caption === "string" && Array.isArray(item.hashtags)).slice(0, 3) : [];
    if (captions.length < 2) throw new Error("Gemini returned fewer than two caption options. Please try again.");
    return captions.map((item) => ({ caption: item.caption.trim(), hashtags: item.hashtags.filter((tag) => typeof tag === "string").map((tag) => tag.startsWith("#") ? tag : `#${tag}`).slice(0, 6) }));
  },
};
