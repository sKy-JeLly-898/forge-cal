"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireClientUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      clientAccount: {
        select: {
          id: true,
          isActive: true,
          maxApiKeys: true,
        },
      },
    },
  });

  if (!user || user.role !== "CLIENT") {
    throw new Error("Forbidden");
  }

  if (!user.clientAccount || !user.clientAccount.isActive) {
    throw new Error("Client account not active");
  }

  return user;
}

const createEventTypeSchema = z.object({
  name: z.string().min(2),
  durationMinutes: z.coerce.number().int().min(15).max(180),
  slotIntervalMin: z.coerce.number().int().min(15).max(120),
  timezone: z.string().min(1),
  description: z.string().max(500).optional(),
});

const createWebhookSchema = z.object({
  url: z.string().url(),
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

async function getUniqueEventTypeSlug(userId: string, name: string) {
  const baseSlug = slugify(name) || "meeting";
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await prisma.eventType.findFirst({
      where: {
        userId,
        slug: candidate,
      },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

export async function createClientApiKeyAction(formData: FormData) {
  const user = await requireClientUser();

  const activeCount = await prisma.apiKey.count({
    where: {
      userId: user.id,
      revokedAt: null,
    },
  });

  if (user.clientAccount?.maxApiKeys !== null && activeCount >= (user.clientAccount?.maxApiKeys ?? 0)) {
    throw new Error("API key limit reached for your plan");
  }

  const labelValue = formData.get("label");
  const label = typeof labelValue === "string" && labelValue.trim().length > 0 ? labelValue.trim() : "Client key";
  const token = `fcal_${randomBytes(24).toString("hex")}`;

  await prisma.apiKey.create({
    data: {
      userId: user.id,
      label,
      token,
    },
  });

  revalidatePath("/client/dashboard");
}

export async function revokeClientApiKeyAction(formData: FormData) {
  const user = await requireClientUser();

  const apiKeyId = formData.get("apiKeyId");
  if (typeof apiKeyId !== "string" || apiKeyId.length === 0) {
    throw new Error("Invalid API key id");
  }

  await prisma.apiKey.updateMany({
    where: {
      id: apiKeyId,
      userId: user.id,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  revalidatePath("/client/dashboard");
}

export async function createClientEventTypeAction(formData: FormData) {
  const user = await requireClientUser();

  const parsed = createEventTypeSchema.safeParse({
    name: formData.get("name"),
    durationMinutes: formData.get("durationMinutes"),
    slotIntervalMin: formData.get("slotIntervalMin"),
    timezone: formData.get("timezone"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid event type data");
  }

  const slug = await getUniqueEventTypeSlug(user.id, parsed.data.name);

  await prisma.eventType.create({
    data: {
      userId: user.id,
      ...parsed.data,
      slug,
    },
  });

  const hasAvailability = await prisma.availabilityWindow.count({
    where: { userId: user.id },
  });

  if (hasAvailability === 0) {
    for (const dayOfWeek of [0, 1, 2, 3, 4]) {
      await prisma.availabilityWindow.create({
        data: {
          userId: user.id,
          dayOfWeek,
          startMinute: 9 * 60,
          endMinute: 17 * 60,
          isActive: true,
        },
      });
    }
  }

  revalidatePath("/client/dashboard");
}

export async function createClientWebhookAction(formData: FormData) {
  const user = await requireClientUser();

  const parsed = createWebhookSchema.safeParse({
    url: formData.get("url"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid webhook url");
  }

  await prisma.webhookEndpoint.create({
    data: {
      userId: user.id,
      url: parsed.data.url,
      secret: randomBytes(24).toString("hex"),
    },
  });

  revalidatePath("/client/dashboard");
}
