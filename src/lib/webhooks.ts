import { createHmac, randomUUID } from "crypto";

import { prisma } from "@/lib/prisma";

type WebhookEventName = "booking.created" | "booking.confirmed" | "booking.canceled";

type WebhookPayload = {
  id: string;
  event: WebhookEventName;
  createdAt: string;
  data: Record<string, unknown>;
};

function sign(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export async function sendBookingWebhook(params: {
  userId: string;
  event: WebhookEventName;
  data: Record<string, unknown>;
}) {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: {
      userId: params.userId,
      isActive: true,
    },
  });

  if (endpoints.length === 0) {
    return;
  }

  const payload: WebhookPayload = {
    id: randomUUID(),
    event: params.event,
    createdAt: new Date().toISOString(),
    data: params.data,
  };

  const body = JSON.stringify(payload);

  await Promise.allSettled(
    endpoints.map(async (endpoint) => {
      const signature = sign(endpoint.secret, body);
      await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forgecal-event": params.event,
          "x-forgecal-signature": signature,
        },
        body,
      });
    }),
  );
}
