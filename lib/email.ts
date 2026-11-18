import "server-only";

export async function sendReminderEmail(email: string, caption: string, scheduledAt: string) {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "Draftly <onboarding@resend.dev>", to: [email],
      subject: "Your social draft is coming up",
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#252620"><p style="color:#527053;font-weight:bold">DRAFTLY · A FRIENDLY REMINDER</p><h1 style="font:normal 26px Georgia,serif">Your draft is on the calendar.</h1><p style="line-height:1.6">${escapeHtml(caption)}</p><p style="color:#777">Scheduled for ${new Date(scheduledAt).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })}.</p><p style="color:#777;font-size:12px">This is a reminder about your draft. It has not been published to social media.</p></div>`,
    }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "Resend could not send the reminder email.");
  }
}
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character); }
