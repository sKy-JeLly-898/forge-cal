"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

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
