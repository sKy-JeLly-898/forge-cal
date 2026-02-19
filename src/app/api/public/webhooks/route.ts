import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiKeyOwner } from "@/lib/api-auth";
import { preflightResponse, withCors } from "@/lib/cors";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  url: z.string().url(),
  secret: z.string().min(16).optional(),
});

export async function GET(request: Request) {
  const owner = await getApiKeyOwner(request);
  if (!owner) {
    return withCors(request, NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const items = await prisma.webhookEndpoint.findMany({
    where: {
      userId: owner.user.id,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      url: true,
      isActive: true,
      createdAt: true,
    },
  });

  return withCors(request, NextResponse.json({ webhooks: items }));
}

export async function POST(request: Request) {
  const owner = await getApiKeyOwner(request);
  if (!owner) {
    return withCors(request, NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return withCors(request, NextResponse.json({ error: parsed.error.flatten() }, { status: 400 }));
  }

  const webhook = await prisma.webhookEndpoint.create({
    data: {
      userId: owner.user.id,
      url: parsed.data.url,
      secret: parsed.data.secret ?? randomBytes(24).toString("hex"),
      isActive: true,
    },
    select: {
      id: true,
      url: true,
      secret: true,
      isActive: true,
      createdAt: true,
    },
  });

  return withCors(request, NextResponse.json({ webhook }, { status: 201 }));
}

export async function OPTIONS(request: Request) {
  return preflightResponse(request);
}
