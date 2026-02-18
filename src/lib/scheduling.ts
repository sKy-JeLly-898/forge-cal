import { addMinutes, format, parseISO } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

import { prisma } from "@/lib/prisma";
import { getGoogleBusyRanges } from "@/lib/google-calendar";

type Range = {
  start: Date;
  end: Date;
};

function rangesOverlap(a: Range, b: Range) {
  return a.start < b.end && b.start < a.end;
}

function toDateTimeInZone(date: string, minutesFromMidnight: number, timezone: string) {
  const hours = Math.floor(minutesFromMidnight / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (minutesFromMidnight % 60).toString().padStart(2, "0");
  return fromZonedTime(`${date}T${hours}:${minutes}:00`, timezone);
}

export async function computeAvailableSlots(params: {
  eventTypeId: string;
  date: string;
}) {
  const dateParsed = parseISO(params.date);
  if (Number.isNaN(dateParsed.getTime())) {
    throw new Error("Invalid date format. Expected YYYY-MM-DD.");
  }

  const eventType = await prisma.eventType.findUnique({
    where: { id: params.eventTypeId },
    include: { user: true },
  });

  if (!eventType || !eventType.isActive) {
    return [];
  }

  const weekday = Number(format(toZonedTime(dateParsed, eventType.timezone), "i")) - 1;

  const windows = await prisma.availabilityWindow.findMany({
    where: {
      userId: eventType.userId,
      dayOfWeek: weekday,
      isActive: true,
    },
    orderBy: { startMinute: "asc" },
  });

  if (windows.length === 0) {
    return [];
  }

  const dayStart = toDateTimeInZone(params.date, 0, eventType.timezone);
  const dayEnd = addMinutes(dayStart, 24 * 60);

  const [bookings, googleBusy] = await Promise.all([
    prisma.booking.findMany({
      where: {
        hostUserId: eventType.userId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
      select: {
        startTime: true,
        endTime: true,
      },
    }),
    getGoogleBusyRanges(eventType.userId, dayStart, dayEnd),
  ]);

  const busyRanges: Range[] = [
    ...bookings.map((booking) => ({ start: booking.startTime, end: booking.endTime })),
    ...googleBusy,
  ];

  const slots: Array<{ start: Date; end: Date }> = [];

  for (const window of windows) {
    let slotMinute = window.startMinute;

    while (slotMinute + eventType.durationMinutes <= window.endMinute) {
      const rawStart = toDateTimeInZone(params.date, slotMinute, eventType.timezone);
      const rawEnd = addMinutes(rawStart, eventType.durationMinutes);

      const protectedRange: Range = {
        start: addMinutes(rawStart, -eventType.bufferBeforeMin),
        end: addMinutes(rawEnd, eventType.bufferAfterMin),
      };

      const hasConflict = busyRanges.some((busy) => rangesOverlap(protectedRange, busy));

      if (!hasConflict && rawStart > new Date()) {
        slots.push({
          start: rawStart,
          end: rawEnd,
        });
      }

      slotMinute += eventType.slotIntervalMin;
    }
  }

  return slots;
}
