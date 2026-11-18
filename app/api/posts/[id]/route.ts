import { readDriveData, writeDriveData } from "@/lib/google-drive";

export async function PATCH(request: Request, context: RouteContext<"/api/posts/[id]">) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const data = await readDriveData();
    const post = data.posts.find((item) => item.id === id);
    if (!post) return Response.json({ error: "Draft not found." }, { status: 404 });
    if (typeof body.caption === "string" && body.caption.trim()) post.caption = body.caption.trim();
    if (typeof body.scheduledAt === "string") {
      if (!Number.isFinite(Date.parse(body.scheduledAt))) return Response.json({ error: "Choose a valid date and time." }, { status: 400 });
      post.scheduledAt = new Date(body.scheduledAt).toISOString();
    }
    await writeDriveData(data);
    return Response.json({ post });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Could not update your draft." }, { status: 502 }); }
}

export async function DELETE(_request: Request, context: RouteContext<"/api/posts/[id]">) {
  try {
    const { id } = await context.params;
    const data = await readDriveData();
    const posts = data.posts.filter((item) => item.id !== id);
    if (posts.length === data.posts.length) return Response.json({ error: "Draft not found." }, { status: 404 });
    data.posts = posts;
    await writeDriveData(data);
    return Response.json({ success: true });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Could not delete your draft." }, { status: 502 }); }
}
