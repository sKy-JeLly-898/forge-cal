import { prisma } from "@/lib/prisma";

export async function getApiKeyOwner(request: Request) {
  const token = request.headers.get("x-api-key");
  if (!token) {
    return null;
  }

  const key = await prisma.apiKey.findFirst({
    where: {
      token,
      revokedAt: null,
    },
    include: {
      user: {
        include: {
          clientAccount: true,
        },
      },
    },
  });

  if (!key) {
    return null;
  }

  if (key.user.role === "CLIENT" && !key.user.clientAccount?.isActive) {
    return null;
  }

  const endpoint = new URL(request.url).pathname;
  await prisma.apiRequestLog.create({
    data: {
      apiKeyId: key.id,
      userId: key.userId,
      endpoint,
      method: request.method,
    },
  });

  return {
    key,
    user: key.user,
  };
}
