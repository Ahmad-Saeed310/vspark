import "server-only";
import { cookies } from "next/headers";
import type { DriveData } from "@/types";

const FILE_NAME = "draftly-posts.json";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const emptyData: DriveData = { posts: [], preferences: { enabled: false, email: "" } };

export function googleRedirectUri() {
  return process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/google/callback`;
}

export async function accessToken(): Promise<string> {
  const jar = await cookies();
  const token = jar.get("google_access_token")?.value;
  const expiresAt = Number(jar.get("google_token_expires")?.value || 0);
  const refreshToken = jar.get("google_refresh_token")?.value;
  if (token && expiresAt > Date.now() + 60000) return token;
  if (!refreshToken) throw new Error("Connect Google Drive to save and view drafts.");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: required("GOOGLE_CLIENT_ID"), client_secret: required("GOOGLE_CLIENT_SECRET"), refresh_token: refreshToken, grant_type: "refresh_token" }), cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok || !body.access_token) throw new Error("Google Drive authorization expired. Please connect Drive again.");
  const refreshedToken: string = body.access_token;
  jar.set("google_access_token", refreshedToken, cookieOptions(Number(body.expires_in || 3600)));
  jar.set("google_token_expires", String(Date.now() + Number(body.expires_in || 3600) * 1000), cookieOptions(Number(body.expires_in || 3600)));
  return refreshedToken;
}

export async function readDriveData(): Promise<DriveData> {
  const token = await accessToken();
  const fileId = await findOrCreateFile(token);
  const response = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) throw new Error("Could not read your Draftly data from Google Drive.");
  const data = await response.json().catch(() => emptyData);
  return { posts: Array.isArray(data.posts) ? data.posts : [], preferences: { ...emptyData.preferences, ...(data.preferences || {}) } };
}

export async function writeDriveData(data: DriveData) {
  const token = await accessToken();
  const fileId = await findOrCreateFile(token);
  const response = await fetch(`${DRIVE_UPLOAD}/files/${fileId}?uploadType=media`, {
    method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(data), cache: "no-store",
  });
  if (!response.ok) throw new Error("Could not save your changes to Google Drive.");
}

async function findOrCreateFile(token: string) {
  const search = await fetch(`${DRIVE_API}/files?q=${encodeURIComponent(`name='${FILE_NAME}' and trashed=false`)}&fields=files(id,name)&pageSize=1`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!search.ok) throw new Error("Could not access Google Drive. Please check the Drive connection.");
  const files = (await search.json()).files;
  if (files?.[0]?.id) return files[0].id as string;
  const created = await fetch(`${DRIVE_API}/files?fields=id`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ name: FILE_NAME, mimeType: "application/json" }) });
  if (!created.ok) throw new Error("Could not create the Draftly data file in Google Drive.");
  const { id } = await created.json();
  const initialize = await fetch(`${DRIVE_UPLOAD}/files/${id}?uploadType=media`, { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(emptyData) });
  if (!initialize.ok) throw new Error("Could not initialize the Draftly data file in Google Drive.");
  return id as string;
}

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured on the server.`);
  return value;
}
export function cookieOptions(maxAge: number) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge };
}
