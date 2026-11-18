import { randomUUID } from "node:crypto";
import { readDriveData, writeDriveData } from "@/lib/google-drive";
import { sendReminderEmail } from "@/lib/email";
import type { ScheduledPost } from "@/types";

export async function GET() {
  try {
    const data = await readDriveData();
    return Response.json({ connected: true, posts: data.posts.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)), preferences: data.preferences });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Connect Google Drive")) return Response.json({ connected: false, posts: [], preferences: { enabled: false, email: "" } });
    return Response.json({ error: error instanceof Error ? error.message : "Could not retrieve drafts." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body.caption !== "string" || !body.caption.trim() || !Array.isArray(body.hashtags) || typeof body.scheduledAt !== "string" || !Number.isFinite(Date.parse(body.scheduledAt)) || Date.parse(body.scheduledAt) <= Date.now()) {
      return Response.json({ error: "Add a caption and choose a valid future date and time." }, { status: 400 });
    }
    const data = await readDriveData();
    const post: ScheduledPost = { id: randomUUID(), caption: body.caption.trim(), hashtags: body.hashtags.filter((tag: unknown) => typeof tag === "string"), scheduledAt: new Date(body.scheduledAt).toISOString(), status: "scheduled", createdAt: new Date().toISOString() };
    data.posts.push(post);
    await writeDriveData(data);
    let warning: string | undefined;
    if (data.preferences.enabled && data.preferences.email) {
      try { await sendReminderEmail(data.preferences.email, post.caption, post.scheduledAt); }
      catch (error) { warning = `Draft saved, but email failed: ${error instanceof Error ? error.message : "Resend could not send it."}`; }
    }
    return Response.json({ post, warning }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Could not save your draft." }, { status: 502 }); }
}
