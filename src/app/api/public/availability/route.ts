import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiKeyOwner } from "@/lib/api-auth";
import { preflightResponse, withCors } from "@/lib/cors";
import { prisma } from "@/lib/prisma";
import { computeAvailableSlots } from "@/lib/scheduling";

const querySchema = z.object({
  slug: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(request: Request) {
  const owner = await getApiKeyOwner(request);
  if (!owner) {
    return withCors(request, NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    slug: url.searchParams.get("slug"),
    date: url.searchParams.get("date"),
  });

  if (!parsed.success) {
    return withCors(request, NextResponse.json({ error: parsed.error.flatten() }, { status: 400 }));
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

  const slots = await computeAvailableSlots({
    eventTypeId: eventType.id,
    date: parsed.data.date,
  });

  return withCors(
    request,
    NextResponse.json({
      timezone: eventType.timezone,
      slots: slots.map((slot) => ({
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
      })),
    }),
  );
}

export async function OPTIONS(request: Request) {
  return preflightResponse(request);
}
