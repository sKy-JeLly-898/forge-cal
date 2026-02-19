import { prisma } from "@/lib/prisma";

function getHostFromUrl(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

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
  const originHost = getHostFromUrl(request.headers.get("origin"));
  const refererHost = getHostFromUrl(request.headers.get("referer"));
  const siteHintRaw = request.headers.get("x-client-site")?.trim().toLowerCase() ?? null;
  const siteHint = siteHintRaw && siteHintRaw.length > 0 ? siteHintRaw.slice(0, 200) : null;
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;

  await prisma.apiRequestLog.create({
    data: {
      apiKeyId: key.id,
      userId: key.userId,
      endpoint,
      method: request.method,
      originHost,
      refererHost,
      siteHint,
      userAgent,
    },
  });

  return {
    key,
    user: key.user,
  };
}
