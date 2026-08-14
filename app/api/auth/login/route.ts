import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { authenticateLogin } from "@/lib/login";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.password !== "string") {
    return NextResponse.json({ error: "密码必须是文本。" }, { status: 400 });
  }
  const environment = serverEnv();
  const result = await authenticateLogin({
    origin: request.headers.get("origin"),
    requestUrl: request.url,
    password: body.password,
    passwordHash: environment.APP_PASSWORD_HASH,
    sessionSecret: environment.SESSION_SECRET,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 401 });
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set("yishou_session", result.token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 43_200,
    path: "/",
  });
  return response;
}
