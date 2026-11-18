import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { cookieOptions, googleRedirectUri } from "@/lib/google-drive";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin;
  const jar = await cookies();
  const expectedState = jar.get("google_oauth_state")?.value;
  jar.delete("google_oauth_state");
  if (!url.searchParams.get("code") || !expectedState || url.searchParams.get("state") !== expectedState) return NextResponse.redirect(new URL("/?error=google-auth", origin));
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code: url.searchParams.get("code")!, client_id: required("GOOGLE_CLIENT_ID"), client_secret: required("GOOGLE_CLIENT_SECRET"), redirect_uri: googleRedirectUri(), grant_type: "authorization_code" }), cache: "no-store",
    });
    const body = await response.json();
    if (!response.ok || !body.access_token) throw new Error("Google token exchange failed.");
    const lifetime = Number(body.expires_in || 3600);
    jar.set("google_access_token", body.access_token, cookieOptions(lifetime));
    jar.set("google_token_expires", String(Date.now() + lifetime * 1000), cookieOptions(lifetime));
    if (body.refresh_token) jar.set("google_refresh_token", body.refresh_token, cookieOptions(60 * 60 * 24 * 365));
    return NextResponse.redirect(new URL("/?connected=1", origin));
  } catch { return NextResponse.redirect(new URL("/?error=google-auth", origin)); }
}

function required(name: string) { const value = process.env[name]; if (!value) throw new Error(`${name} is missing.`); return value; }
