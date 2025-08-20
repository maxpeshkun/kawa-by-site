import { useEffect, useState } from "react";

export default function Dashboard() {
  const [me, setMe] = useState({ loading: true, authenticated: false, user: null });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        setMe({ loading: false, authenticated: !!j?.authenticated, user: j?.user || null });
      } catch {
        if (alive) setMe({ loading: false, authenticated: false, user: null });
      }
    })();
    return () => { alive = false; };
  }, []);

  if (me.loading) {
    return <div className="min-h-screen grid place-items-center text-gray-600">Загрузка…</div>;
  }

  if (!me.authenticated || !me.user) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
          <div className="text-xl font-semibold">Нужна авторизация</div>
          <div className="mt-1 text-sm text-gray-600">Войдите, чтобы открыть кабинет.</div>
          <a href="/login" className="mt-4 inline-flex rounded-xl bg-gray-900 px-4 py-2 text-sm text-white hover:opacity-90">Войти</a>
          <div className="mt-2 text-xs text-gray-500">
            Или <a className="underline" href="/wholesale/login">вход по коду</a>
          </div>
        </div>
      </div>
    );
  }

  const email = me.user?.email || "—";

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold">Добро пожаловать, {email}!</h1>
        <p className="mt-2 text-gray-600">Это ваш личный кабинет 👋</p>

        <div className="mt-6 grid gap-3">
          <a href="/wholesale/account" className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:bg-gray-50">
            Перейти в оптовый кабинет
          </a>
          <a href="/wholesale/order" className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:bg-gray-50">
            Оформить оптовый заказ
          </a>
        </div>
      </div>
    </div>
  );
}
