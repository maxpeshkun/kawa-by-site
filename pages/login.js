import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // если уже авторизован через маг-код/куку — можно редиректнуть
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store" });
        const j = await r.json();
        if (j?.authenticated || j?.user) {
          const next = typeof router.query.next === "string" ? router.query.next : "/wholesale/account";
          router.replace(next);
        }
      } catch {}
    })();
  }, [router]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const resp = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data?.ok) throw new Error(data?.error || "Неверный email или пароль");

      // успешный вход: сессионная кука уже установлена на сервере
      const next = typeof router.query.next === "string" ? router.query.next : "/wholesale/account";
      router.push(next);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-center">Вход</h1>
        <p className="mt-1 text-center text-sm text-gray-600">Демо-аккаунт: demo@kawa.by / demo123</p>

        {error && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</div>
        )}

        <div className="mt-4 grid gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />

          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Входим…" : "Войти"}
          </button>

          <a
            href="/wholesale/login"
            className="text-center text-sm text-gray-700 underline"
          >
            Войти по коду (оптовый кабинет)
          </a>
        </div>
      </form>
    </div>
  );
}
