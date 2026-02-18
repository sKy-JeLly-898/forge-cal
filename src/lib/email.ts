import { formatInTimeZone } from "date-fns-tz";

type BookingEmailParams = {
  to: string;
  guestName: string;
  eventName: string;
  start: Date;
  end: Date;
  timezone: string;
  meetingUrl?: string | null;
  organizerEmail?: string | null;
};

function buildBookingEmailHtml(params: BookingEmailParams) {
  const startStr = formatInTimeZone(params.start, params.timezone, "EEE, MMM d, yyyy p zzz");
  const endStr = formatInTimeZone(params.end, params.timezone, "p zzz");
  const meetBlock = params.meetingUrl
    ? `<p><strong>Meeting link:</strong> <a href="${params.meetingUrl}">${params.meetingUrl}</a></p>`
    : "";

  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px;color:#0f172a">
    <h2 style="margin-bottom:8px;">Your ForgeCal booking is confirmed</h2>
    <p style="margin-top:0;">Hi ${params.guestName},</p>
    <p>Your meeting has been scheduled successfully.</p>
    <p><strong>Event:</strong> ${params.eventName}</p>
    <p><strong>When:</strong> ${startStr} - ${endStr}</p>
    ${meetBlock}
    <p>Organizer: ${params.organizerEmail ?? "ForgeCal Team"}</p>
    <hr style="margin:20px 0;border:none;border-top:1px solid #e2e8f0" />
    <p style="font-size:12px;color:#64748b">This is a custom confirmation email from ForgeCal.</p>
  </div>`;
}

export async function sendBookingEmail(params: BookingEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return { sent: false, reason: "missing_email_provider_config" as const };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: `Booking Confirmed: ${params.eventName}`,
      html: buildBookingEmailHtml(params),
    }),
  });

  if (!response.ok) {
    return { sent: false, reason: "email_provider_error" as const };
  }

  return { sent: true as const };
}

export async function sendBookingCanceledEmail(params: {
  to: string;
  guestName: string;
  eventName: string;
  start: Date;
  timezone: string;
  organizerEmail?: string | null;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return { sent: false, reason: "missing_email_provider_config" as const };
  }

  const when = formatInTimeZone(params.start, params.timezone, "EEE, MMM d, yyyy p zzz");
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px;color:#0f172a">
    <h2>Booking canceled</h2>
    <p>Hi ${params.guestName},</p>
    <p>Your booking for <strong>${params.eventName}</strong> on <strong>${when}</strong> has been canceled.</p>
    <p>Organizer: ${params.organizerEmail ?? "ForgeCal Team"}</p>
  </div>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: `Booking Canceled: ${params.eventName}`,
      html,
    }),
  });

  if (!response.ok) {
    return { sent: false, reason: "email_provider_error" as const };
  }

  return { sent: true as const };
}
