"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { BillingCycle, PlanTier } from "@prisma/client";
import { z } from "zod";

import { auth } from "@/auth";
import { getPlanDefaults } from "@/lib/plans";
import { prisma } from "@/lib/prisma";

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

const createClientSchema = z.object({
  companyName: z.string().min(2),
  email: z.string().email(),
  planTier: z.nativeEnum(PlanTier),
  billingCycle: z.nativeEnum(BillingCycle),
});

const updateClientSchema = z.object({
  clientAccountId: z.string().min(1),
  planTier: z.nativeEnum(PlanTier),
  billingCycle: z.nativeEnum(BillingCycle),
});

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (dbUser?.role !== "SUPER_ADMIN") {
    throw new Error("Forbidden");
  }

  return session;
}

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

  // Ensure uniqueness per user.
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

export async function createApiKeyAction(formData: FormData) {
  const session = await requireSuperAdmin();

  const label = (formData.get("label") as string) || "Default key";
  const token = `fcal_${randomBytes(24).toString("hex")}`;

  await prisma.apiKey.create({
    data: {
      userId: session.user.id,
      label,
      token,
    },
  });

  revalidatePath("/dashboard");
}

export async function revokeApiKeyAction(formData: FormData) {
  const session = await requireSuperAdmin();

  const apiKeyId = formData.get("apiKeyId");
  if (typeof apiKeyId !== "string" || apiKeyId.length === 0) {
    throw new Error("Invalid API key id");
  }

  await prisma.apiKey.updateMany({
    where: {
      id: apiKeyId,
      userId: session.user.id,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  revalidatePath("/dashboard");
}

export async function createEventTypeAction(formData: FormData) {
  const session = await requireSuperAdmin();

  const parsed = createEventTypeSchema.safeParse({
    name: formData.get("name"),
    durationMinutes: formData.get("durationMinutes"),
    slotIntervalMin: formData.get("slotIntervalMin"),
    timezone: formData.get("timezone"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid form data");
  }

  const slug = await getUniqueEventTypeSlug(session.user.id, parsed.data.name);

  await prisma.eventType.create({
    data: {
      userId: session.user.id,
      ...parsed.data,
      slug,
    },
  });

  const hasAvailability = await prisma.availabilityWindow.count({
    where: { userId: session.user.id },
  });

  if (hasAvailability === 0) {
    for (const dayOfWeek of [0, 1, 2, 3, 4]) {
      await prisma.availabilityWindow.create({
        data: {
          userId: session.user.id,
          dayOfWeek,
          startMinute: 9 * 60,
          endMinute: 17 * 60,
          isActive: true,
        },
      });
    }
  }

  revalidatePath("/dashboard");
}

export async function createWebhookAction(formData: FormData) {
  const session = await requireSuperAdmin();

  const parsed = createWebhookSchema.safeParse({
    url: formData.get("url"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid webhook url");
  }

  await prisma.webhookEndpoint.create({
    data: {
      userId: session.user.id,
      url: parsed.data.url,
      secret: randomBytes(24).toString("hex"),
    },
  });

  revalidatePath("/dashboard");
}

export async function createClientAccountAction(formData: FormData) {
  await requireSuperAdmin();

  const parsed = createClientSchema.safeParse({
    companyName: formData.get("companyName"),
    email: formData.get("email"),
    planTier: formData.get("planTier"),
    billingCycle: formData.get("billingCycle"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid client account data");
  }

  const normalizedEmail = parsed.data.email.toLowerCase();
  const defaults = getPlanDefaults(parsed.data.planTier);

  await prisma.clientAccount.upsert({
    where: { email: normalizedEmail },
    update: {
      companyName: parsed.data.companyName,
      planTier: parsed.data.planTier,
      billingCycle: parsed.data.billingCycle,
      siteLimit: defaults.siteLimit,
      maxApiKeys: defaults.maxApiKeys,
      supportMonths: defaults.supportMonths,
      isActive: true,
    },
    create: {
      email: normalizedEmail,
      companyName: parsed.data.companyName,
      planTier: parsed.data.planTier,
      billingCycle: parsed.data.billingCycle,
      siteLimit: defaults.siteLimit,
      maxApiKeys: defaults.maxApiKeys,
      supportMonths: defaults.supportMonths,
      isActive: true,
    },
  });

  revalidatePath("/dashboard");
}

export async function updateClientPlanAction(formData: FormData) {
  await requireSuperAdmin();

  const parsed = updateClientSchema.safeParse({
    clientAccountId: formData.get("clientAccountId"),
    planTier: formData.get("planTier"),
    billingCycle: formData.get("billingCycle"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid plan update");
  }

  const defaults = getPlanDefaults(parsed.data.planTier);

  await prisma.clientAccount.update({
    where: { id: parsed.data.clientAccountId },
    data: {
      planTier: parsed.data.planTier,
      billingCycle: parsed.data.billingCycle,
      siteLimit: defaults.siteLimit,
      maxApiKeys: defaults.maxApiKeys,
      supportMonths: defaults.supportMonths,
    },
  });

  revalidatePath("/dashboard");
}

export async function toggleClientAccountStatusAction(formData: FormData) {
  await requireSuperAdmin();

  const clientAccountId = formData.get("clientAccountId");
  if (typeof clientAccountId !== "string" || clientAccountId.length === 0) {
    throw new Error("Invalid client account id");
  }

  const clientAccount = await prisma.clientAccount.findUnique({
    where: { id: clientAccountId },
    select: { isActive: true },
  });

  if (!clientAccount) {
    throw new Error("Client account not found");
  }

  await prisma.clientAccount.update({
    where: { id: clientAccountId },
    data: { isActive: !clientAccount.isActive },
  });

  revalidatePath("/dashboard");
}
