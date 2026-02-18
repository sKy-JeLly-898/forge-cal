import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiKeyOwner } from "@/lib/api-auth";
import { preflightResponse, withCors } from "@/lib/cors";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  slug: z.string().min(1),
});

export async function GET(request: Request) {
  const owner = await getApiKeyOwner(request);
  if (!owner) {
    return withCors(request, NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ slug: url.searchParams.get("slug") });

  if (!parsed.success) {
    return withCors(request, NextResponse.json({ error: parsed.error.flatten() }, { status: 400 }));
  }

  const eventType = await prisma.eventType.findFirst({
    where: {
      userId: owner.user.id,
      slug: parsed.data.slug,
      isActive: true,
    },
    select: {
      name: true,
      slug: true,
      description: true,
      durationMinutes: true,
      timezone: true,
    },
  });

  if (!eventType) {
    return withCors(request, NextResponse.json({ error: "Event type not found" }, { status: 404 }));
  }

  const origin = url.origin;

  return withCors(
    request,
    NextResponse.json({
      widget: {
        title: eventType.name,
        subtitle: eventType.description,
        timezone: eventType.timezone,
        durationMinutes: eventType.durationMinutes,
      },
      api: {
        availability: `${origin}/api/public/availability?slug=${eventType.slug}&date={YYYY-MM-DD}`,
        bookings: `${origin}/api/public/bookings`,
      },
      requirements: {
        guestEmailDomain: ["gmail.com", "googlemail.com"],
      },
    }),
  );
}

export async function OPTIONS(request: Request) {
  return preflightResponse(request);
}
