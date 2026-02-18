import { NextResponse } from "next/server";

import { getApiKeyOwner } from "@/lib/api-auth";
import { preflightResponse, withCors } from "@/lib/cors";
import { sendBookingCanceledEmail } from "@/lib/email";
import { cancelGoogleCalendarEvent } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";
import { sendBookingWebhook } from "@/lib/webhooks";

export async function POST(
  request: Request,
  context: { params: Promise<{ bookingId: string }> },
) {
  const owner = await getApiKeyOwner(request);
  if (!owner) {
    return withCors(request, NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const params = await context.params;

  const booking = await prisma.booking.findFirst({
    where: {
      id: params.bookingId,
      hostUserId: owner.user.id,
    },
    include: {
      eventType: true,
    },
  });

  if (!booking) {
    return withCors(request, NextResponse.json({ error: "Booking not found" }, { status: 404 }));
  }

  if (booking.status === "CANCELED") {
    return withCors(request, NextResponse.json({ status: "CANCELED" }));
  }

  if (booking.externalEventId) {
    await cancelGoogleCalendarEvent({
      userId: owner.user.id,
      eventId: booking.externalEventId,
    });
  }

  const canceled = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: "CANCELED",
      canceledAt: new Date(),
    },
  });

  await sendBookingWebhook({
    userId: owner.user.id,
    event: "booking.canceled",
    data: {
      bookingId: canceled.id,
      eventTypeSlug: booking.eventType.slug,
      guestEmail: booking.guestEmail,
      canceledAt: canceled.canceledAt?.toISOString(),
    },
  });

  await sendBookingCanceledEmail({
    to: booking.guestEmail,
    guestName: booking.guestName,
    eventName: booking.eventType.name,
    start: booking.startTime,
    timezone: booking.eventType.timezone,
    organizerEmail: owner.user.email,
  });

  return withCors(request, NextResponse.json({ status: "CANCELED" }));
}

export async function OPTIONS(request: Request) {
  return preflightResponse(request);
}
