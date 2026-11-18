import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookieOptions, googleRedirectUri } from "@/lib/google-drive";

export async function GET(request: Request) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return NextResponse.redirect(new URL("/?error=google-config", origin));
  const state = randomBytes(24).toString("hex");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "https://www.googleapis.com/auth/drive.file",
    access_type: "offline",
    prompt: "consent",
    state,
  }).toString();
  const response = NextResponse.redirect(url);
  response.cookies.set("google_oauth_state", state, cookieOptions(600));
  return response;
}
