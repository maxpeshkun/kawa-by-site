// pages/auth/login.js
import React, { useEffect, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  // куда вернуться после логина
  const [next, setNext] = useState("/");
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const n = url.searchParams.get("next");
      setNext(n && n.startsWith("/") ? n : "/wholesale/order");
    } catch {
      setNext("/wholesale/order");
    }
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setErr(null);
    try {
      setSubmitting(true);
      const resp = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
      window.location.href = next;
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900 grid place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="text-2xl font-bold">Вход для оптовых клиентов</div>
        <div className="text-sm text-gray-600 mt-1">
          Введите email и пароль. Если у вас нет доступа — заполните заявку на сайте.
        </div>

        {err && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {err}
          </div>
        )}

        <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          <button
            type="submit"
            disabled={submitting}
            className={`rounded-xl px-4 py-2 text-sm ${submitting ? "bg-gray-300 text-gray-500" : "bg-gray-900 text-white hover:opacity-90"}`}
          >
            {submitting ? "Входим…" : "Войти"}
          </button>
        </form>

        <div className="text-xs text-gray-500 mt-4">
          Нажимая «Войти», вы соглашаетесь с обработкой персональных данных.
        </div>
      </div>
    </div>
  );
}
