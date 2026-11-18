import { readDriveData, writeDriveData } from "@/lib/google-drive";
import { sendReminderEmail } from "@/lib/email";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const data = await readDriveData();
    if (!data.preferences.enabled || !data.preferences.email) return Response.json({ sent: 0 });
    const now = Date.now();
    let sent = 0;
    for (const post of data.posts) {
      const scheduledAt = Date.parse(post.scheduledAt);
      if (!post.notifiedAt && scheduledAt <= now && scheduledAt > now - 24 * 60 * 60 * 1000) {
        await sendReminderEmail(data.preferences.email, post.caption, post.scheduledAt);
        post.notifiedAt = new Date().toISOString();
        sent += 1;
      }
    }
    if (sent) await writeDriveData(data);
    return Response.json({ sent });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Could not send due reminders." }, { status: 502 }); }
}
