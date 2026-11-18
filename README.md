# Draftly

A lightweight dashboard for generating social captions, saving scheduled drafts in Google Drive, and receiving email reminders. Draftly organizes drafts; it does not publish to social networks.

## Run locally

1. Copy `.env.example` to `.env.local` and fill in the values below.
2. Install dependencies with `npm install`.
3. Run `npm run dev` and open `http://localhost:3000`.

## Configure integrations

### Gemini

Create an API key in [Google AI Studio](https://aistudio.google.com/app/apikey) and set it as `GEMINI_API_KEY`. The key is used only by the server-side caption route. Caption provider selection lives in `lib/ai/provider.ts`; a replacement provider only needs to implement the `CaptionProvider` interface.

### Google Drive OAuth

1. In [Google Cloud Console](https://console.cloud.google.com/), create or select a project and enable the Google Drive API.
2. Configure the OAuth consent screen and add your account as a test user if the app is in testing mode.
3. Create an OAuth client ID for a Web application.
4. Add `http://localhost:3000/api/auth/google/callback` as an authorized redirect URI for local development. For Vercel, add `https://YOUR-APP.vercel.app/api/auth/google/callback` too.
5. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` to match the chosen environment. Set `NEXT_PUBLIC_APP_URL` to the matching app origin.
6. Click **Connect Drive** in Draftly. The app requests the `drive.file` scope, which grants access to files it creates. It stores posts and notification preferences in `draftly-posts.json` in the connected Drive.

Google access and refresh tokens are kept in HttpOnly cookies. The app refreshes expired access tokens server-side. Connect Google Drive separately in each browser profile.

### Resend email

Create an API key at [Resend](https://resend.com/api-keys) and set `RESEND_API_KEY`. For production, verify a sending domain in Resend and set `RESEND_FROM_EMAIL` to an address on that domain. The default `onboarding@resend.dev` sender is intended for Resend's limited testing flow. Turn reminders on in the dashboard and add a recipient email address. Scheduling sends an immediate confirmation email; Vercel Cron also sends a due reminder and records it on the draft to prevent a duplicate due reminder.

## Deploy to Vercel

Import the repository in Vercel and add the environment variables from `.env.example` in Project Settings. Set `NEXT_PUBLIC_APP_URL` and `GOOGLE_REDIRECT_URI` to the deployed domain and register that callback in Google Cloud Console. Add a random value for `CRON_SECRET`; Vercel sends it as a bearer token when invoking `/api/cron`. Deploy. The included `vercel.json` checks for due reminders hourly. Cron availability and frequency depend on the Vercel plan.

## Notes

- Scheduled posts are draft records only. No social publishing API is connected.
- Data is saved directly to the Google Drive file, with no database.
- Email confirmation is sent when a post is scheduled; due reminders are checked hourly by Vercel Cron.
- Integration credentials are required for Gemini generation, Drive storage, and Resend email. Without them, the app reports setup errors rather than returning mock results.
