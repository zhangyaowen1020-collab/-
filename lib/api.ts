import { verifySession } from "@/lib/auth";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function cookieValue(request: Request, name: string) {
  const raw = request.headers.get("cookie") ?? "";
  return raw
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export function requireSession(request: Request, secret: string, nowSeconds?: number) {
  const token = cookieValue(request, "yishou_session");
  if (!token || !verifySession(secret, token, nowSeconds)) {
    throw new ApiError(401, "请先输入工作台密码。");
  }
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    throw new ApiError(403, "请求来源无效。");
  }
}

export function jsonError(error: unknown) {
  if (error instanceof ApiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return Response.json({ error: "服务器暂时无法处理请求。" }, { status: 500 });
}
