import { NextResponse } from "next/server";
import { jsonError, requireSameOrigin, requireSession } from "@/lib/api";
import { serverEnv } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const environment = serverEnv();
    requireSameOrigin(request);
    requireSession(request, environment.SESSION_SECRET);
  } catch (error) {
    return jsonError(error);
  }
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set("yishou_session", "", { httpOnly: true, secure: true, sameSite: "lax", maxAge: 0, path: "/" });
  return response;
}
