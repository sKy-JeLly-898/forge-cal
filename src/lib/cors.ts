import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  "https://forgewwb-lemon.vercel.app",
  "https://forge-cal.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
];

export function withCors(request: Request, response: NextResponse) {
  const origin = request.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }

  response.headers.set("Vary", "Origin");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, x-api-key");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  return response;
}

export function preflightResponse(request: Request) {
  return withCors(request, new NextResponse(null, { status: 204 }));
}
