"use client";

import { FormEvent, useState } from "react";

export function LoginForm() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setPending(false);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "登录失败。" }));
      setMessage(payload.error || "登录失败。");
      return;
    }
    window.location.assign("/");
  }

  return <form className="login-card" onSubmit={submit}>
    <p className="eyebrow">云端协作工作台</p>
    <h1>一手 AI 换衣</h1>
    <p>输入团队共享密码后，安全访问任务、素材与质检。</p>
    <label>共享密码<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
    {message && <p className="error" role="alert">{message}</p>}
    <button className="primary" disabled={pending}>{pending ? "正在验证…" : "进入工作台"}</button>
  </form>;
}
