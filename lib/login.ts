import { createSession, verifyPassword } from "@/lib/auth";

type LoginRequest = {
  origin: string | null;
  requestUrl: string;
  password: string;
  passwordHash: string;
  sessionSecret: string;
  nowSeconds?: number;
};

type LoginResult = { ok: true; token: string } | { ok: false; error: string };

export async function authenticateLogin(request: LoginRequest): Promise<LoginResult> {
  const expectedOrigin = new URL(request.requestUrl).origin;
  if (request.origin !== expectedOrigin) return { ok: false, error: "请求来源无效。" };
  if (!(await verifyPassword(request.password, request.passwordHash))) {
    return { ok: false, error: "密码错误。" };
  }
  return {
    ok: true,
    token: createSession(request.sessionSecret, request.nowSeconds),
  };
}
