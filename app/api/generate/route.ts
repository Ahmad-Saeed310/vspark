import { captionProvider } from "@/lib/ai/provider";

export async function POST(request: Request) {
  try {
    const { topic } = await request.json();
    if (typeof topic !== "string" || !topic.trim() || topic.length > 600) return Response.json({ error: "Enter a topic of up to 600 characters." }, { status: 400 });
    const captions = await captionProvider.generateCaptions(topic.trim());
    return Response.json({ captions });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Caption generation failed." }, { status: 500 });
  }
}
