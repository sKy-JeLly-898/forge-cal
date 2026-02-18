import { addMinutes, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createGoogleCalendarEvent } from "@/lib/google-calendar";
import { getApiKeyOwner } from "@/lib/api-auth";
import { sendBookingEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { computeAvailableSlots } from "@/lib/scheduling";
import { withCors, preflightResponse } from "@/lib/cors";
import { sendBookingWebhook } from "@/lib/webhooks";

const bodySchema = z.object({
  slug: z.string().min(1),
  guestName: z.string().min(2),
  guestEmail: z.string().email(),
  startTime: z.string().datetime(),
  timezone: z.string().min(1),
  guestMessage: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  const owner = await getApiKeyOwner(request);
  if (!owner) {
    return withCors(request, NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return withCors(request, NextResponse.json({ error: parsed.error.flatten() }, { status: 400 }));
  }

  if (!/(@gmail\.com|@googlemail\.com)$/i.test(parsed.data.guestEmail)) {
    return withCors(
      request,
      NextResponse.json(
        { error: "Guest must use a Google email (gmail.com/googlemail.com) for Google Meet bookings." },
        { status: 400 },
      ),
    );
  }

  const eventType = await prisma.eventType.findFirst({
    where: {
      userId: owner.user.id,
      slug: parsed.data.slug,
      isActive: true,
    },
  });

  if (!eventType) {
    return withCors(request, NextResponse.json({ error: "Event type not found" }, { status: 404 }));
  }

  const start = parseISO(parsed.data.startTime);
  const end = addMinutes(start, eventType.durationMinutes);
  const targetDate = formatInTimeZone(start, eventType.timezone, "yyyy-MM-dd");

  const allowedSlots = await computeAvailableSlots({
    eventTypeId: eventType.id,
    date: targetDate,
  });

  const slotExists = allowedSlots.some((slot) => slot.start.getTime() === start.getTime());
  if (!slotExists) {
    return withCors(request, NextResponse.json({ error: "Time slot is unavailable" }, { status: 409 }));
  }

  const conflict = await prisma.booking.findFirst({
    where: {
      hostUserId: owner.user.id,
      status: { in: ["PENDING", "CONFIRMED"] },
      startTime: { lt: end },
      endTime: { gt: start },
    },
  });

  if (conflict) {
    return withCors(request, NextResponse.json({ error: "Time slot already booked" }, { status: 409 }));
  }

  const booking = await prisma.booking.create({
    data: {
      eventTypeId: eventType.id,
      hostUserId: owner.user.id,
      guestName: parsed.data.guestName,
      guestEmail: parsed.data.guestEmail,
      guestMessage: parsed.data.guestMessage,
      timezone: parsed.data.timezone,
      startTime: start,
      endTime: end,
      status: "PENDING",
    },
  });

  let externalEventId: string | undefined;
  let meetingUrl: string | undefined;

  await sendBookingWebhook({
    userId: owner.user.id,
    event: "booking.created",
    data: {
      bookingId: booking.id,
      eventTypeSlug: eventType.slug,
      guestEmail: booking.guestEmail,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
    },
  });

  try {
    const calendarResult = await createGoogleCalendarEvent({
      userId: owner.user.id,
      title: eventType.name,
      description: parsed.data.guestMessage,
      start,
      end,
      timezone: eventType.timezone,
      guestEmail: parsed.data.guestEmail,
    });

    externalEventId = calendarResult?.event.id ?? undefined;
    meetingUrl = calendarResult?.meetLink ?? undefined;

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "CONFIRMED",
        externalEventId,
        meetingUrl,
      },
    });

    await sendBookingWebhook({
      userId: owner.user.id,
      event: "booking.confirmed",
      data: {
        bookingId: booking.id,
        externalEventId,
        meetingUrl,
      },
    });

    await sendBookingEmail({
      to: booking.guestEmail,
      guestName: booking.guestName,
      eventName: eventType.name,
      start: booking.startTime,
      end: booking.endTime,
      timezone: eventType.timezone,
      meetingUrl,
      organizerEmail: owner.user.email,
    });
  } catch {
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "PENDING",
      },
    });
  }

  return withCors(
    request,
    NextResponse.json({
      bookingId: booking.id,
      status: externalEventId ? "CONFIRMED" : "PENDING",
      meetingUrl: meetingUrl ?? null,
    }),
  );
}

export async function OPTIONS(request: Request) {
  return preflightResponse(request);
}
