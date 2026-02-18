import { NextResponse } from "next/server";

import { getApiKeyOwner } from "@/lib/api-auth";
import { preflightResponse, withCors } from "@/lib/cors";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const owner = await getApiKeyOwner(request);

  if (!owner) {
    return withCors(request, NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const eventTypes = await prisma.eventType.findMany({
    where: {
      userId: owner.user.id,
      isActive: true,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      durationMinutes: true,
      timezone: true,
      locationType: true,
    },
  });

  return withCors(request, NextResponse.json({ eventTypes }));
}

export async function OPTIONS(request: Request) {
  return preflightResponse(request);
}
