// pages/wholesale/account.js
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Account() {
  const [me, setMe] = useState({ loading: true, authenticated: false, email: null });

  const load = async () => {
    try {
      const r = await fetch("/api/auth/me", { cache: "no-store" });
      const j = await r.json();
      setMe({ loading: false, ...j });
    } catch {
      setMe({ loading: false, authenticated: false });
    }
  };

  useEffect(() => { load(); }, []);

  const logout = async () => {
    await fetch("/api/auth/verify", { method: "DELETE" });
    await load();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
          <h1 className="text-xl font-semibold">Личный кабинет</h1>
          {me.loading && <div className="mt-3 text-sm">Загрузка…</div>}
          {!me.loading && !me.authenticated && (
            <div className="mt-3 text-sm">
              Не авторизован. <Link className="underline" href="/wholesale/login">Войти</Link>
            </div>
          )}
          {!me.loading && me.authenticated && (
            <>
              <div className="mt-3 text-sm text-gray-700">Почта: <b>{me.email}</b></div>
              <div className="mt-4 flex gap-2">
                <Link className="rounded-2xl bg-gray-900 text-white px-4 py-2 text-sm" href="/wholesale/order">Оформить заказ</Link>
                <button className="rounded-2xl bg-white border border-gray-200 px-4 py-2 text-sm" onClick={logout}>Выйти</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
