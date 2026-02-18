import { google } from "googleapis";

import { prisma } from "@/lib/prisma";

export type TimeRange = {
  start: Date;
  end: Date;
};

async function getGoogleAccount(userId: string) {
  return prisma.account.findFirst({
    where: {
      userId,
      provider: "google",
    },
    orderBy: { updatedAt: "desc" },
  });
}

async function getOAuthClient(userId: string) {
  const account = await getGoogleAccount(userId);
  if (!account || !account.refresh_token) {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );

  oauth2Client.setCredentials({
    access_token: account.access_token ?? undefined,
    refresh_token: account.refresh_token,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  return oauth2Client;
}

export async function getGoogleBusyRanges(
  userId: string,
  timeMin: Date,
  timeMax: Date,
): Promise<TimeRange[]> {
  const oauth2Client = await getOAuthClient(userId);
  if (!oauth2Client) {
    return [];
  }

  try {
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: [{ id: "primary" }],
      },
    });

    const busy = response.data.calendars?.primary?.busy ?? [];

    return busy
      .map((slot) => {
        if (!slot.start || !slot.end) {
          return null;
        }

        return {
          start: new Date(slot.start),
          end: new Date(slot.end),
        };
      })
      .filter((slot): slot is TimeRange => Boolean(slot));
  } catch {
    return [];
  }
}

export async function createGoogleCalendarEvent(params: {
  userId: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  guestEmail: string;
  timezone: string;
}) {
  const oauth2Client = await getOAuthClient(params.userId);
  if (!oauth2Client) {
    return null;
  }

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const response = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    requestBody: {
      summary: params.title,
      description: params.description,
      start: {
        dateTime: params.start.toISOString(),
        timeZone: params.timezone,
      },
      end: {
        dateTime: params.end.toISOString(),
        timeZone: params.timezone,
      },
      attendees: [{ email: params.guestEmail }],
      conferenceData: {
        createRequest: {
          requestId: `${params.userId}-${params.start.getTime()}`,
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      },
    },
    sendUpdates: "all",
  });

  const entryPoint = response.data.conferenceData?.entryPoints?.find((point) => point.entryPointType === "video");
  const meetLink = entryPoint?.uri ?? response.data.hangoutLink ?? undefined;

  return {
    event: response.data,
    meetLink,
  };
}

export async function cancelGoogleCalendarEvent(params: { userId: string; eventId: string }) {
  const oauth2Client = await getOAuthClient(params.userId);
  if (!oauth2Client) {
    return;
  }

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  await calendar.events.delete({
    calendarId: "primary",
    eventId: params.eventId,
    sendUpdates: "all",
  });
}
