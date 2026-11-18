import { readDriveData, writeDriveData } from "@/lib/google-drive";

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const enabled = body.enabled === true;
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (enabled && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Enter a valid email address to turn reminders on." }, { status: 400 });
    const data = await readDriveData();
    data.preferences = { enabled, email };
    await writeDriveData(data);
    return Response.json({ preferences: data.preferences });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Could not save notification settings." }, { status: 502 }); }
}
