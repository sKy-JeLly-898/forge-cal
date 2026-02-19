# ForgeCal API

Calendly-style scheduling backend for ForgeWeb with Google auth, Google Meet, and webhook support.

## Stack

- Next.js App Router + TypeScript
- Auth.js (Google OAuth)
- Google Calendar API (freebusy + event + Meet link)
- Prisma + Neon Postgres
- Tailwind + shadcn-style UI

## 1. Setup

```bash
npm install
cp .env.example .env
```

Fill `.env`:

- `DATABASE_URL` (Neon)
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Google OAuth redirect URIs:

- `http://localhost:3000/api/auth/callback/google`
- `https://forge-cal.vercel.app/api/auth/callback/google`

## 2. Database

```bash
npx prisma generate
npx prisma db push
```

## 3. Run

```bash
npm run dev
```

## 4. Public API for ForgeWeb

Use `x-api-key` in every request.

### Event types

```bash
curl -H "x-api-key: YOUR_KEY" http://localhost:3000/api/public/event-types
```

### Widget config (embed contract)

```bash
curl -H "x-api-key: YOUR_KEY" "http://localhost:3000/api/public/widget-config?slug=strategy-call"
```

### Availability

```bash
curl -H "x-api-key: YOUR_KEY" "http://localhost:3000/api/public/availability?slug=strategy-call&date=2026-02-18"
```

### Create booking

Note: booking endpoint currently requires guest to use a Google email (`gmail.com` or `googlemail.com`).

```bash
curl -X POST http://localhost:3000/api/public/bookings \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_KEY" \
  -d '{
    "slug": "strategy-call",
    "guestName": "John Doe",
    "guestEmail": "john.doe@gmail.com",
    "startTime": "2026-02-18T15:00:00.000Z",
    "timezone": "UTC",
    "guestMessage": "Looking to discuss project scope"
  }'
```

Response includes `meetingUrl` when confirmed.

### Cancel booking

```bash
curl -X POST http://localhost:3000/api/public/bookings/BOOKING_ID/cancel \
  -H "x-api-key: YOUR_KEY"
```

### Register/list webhook targets

```bash
curl -X POST http://localhost:3000/api/public/webhooks \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_KEY" \
  -d '{"url":"https://forgewwb-lemon.vercel.app/api/forgecal/webhook"}'

curl -H "x-api-key: YOUR_KEY" http://localhost:3000/api/public/webhooks
```

Outgoing webhook headers:

- `x-forgecal-event`
- `x-forgecal-signature` (HMAC SHA256 over raw JSON body using webhook secret)

Events:

- `booking.created`
- `booking.confirmed`
- `booking.canceled`

Email handling:

- ForgeCal does not send customer emails.
- Client sites should send their own confirmation/cancellation emails based on webhook events.

## 5. What is implemented

1. Google Meet link auto-created through Google Calendar `conferenceData`
2. ForgeWeb embed contract endpoint + CORS for your domains
3. Webhooks for booking lifecycle events

## 6. Deploy on Vercel

- Add all env vars from `.env` to Vercel project settings.
- Set `NEXTAUTH_URL=https://forge-cal.vercel.app` in production.
- Redeploy after env changes.
