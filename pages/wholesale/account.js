// pages/wholesale/account.js — unified auth with /api/auth/me
import { useEffect, useState } from "react";
import Link from "next/link";

export default function WholesaleAccount() {
  const [me, setMe] = useState({ loading: true, authenticated: false, user: null });

  const load = async () => {
    try {
      const r = await fetch("/api/auth/me", { cache: "no-store" });
      const j = await r.json();
      setMe({ loading: false, authenticated: !!j?.authenticated, user: j?.user || null });
    } catch {
      setMe({ loading: false, authenticated: false, user: null });
    }
  };

  useEffect(() => { load(); }, []);

  const onLogout = async () => {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
    await load();
  };

  if (me.loading) {
    return (
      <div className="min-h-screen grid place-items-center text-gray-600">Загрузка…</div>
    );
  }

  if (!me.authenticated || !me.user) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold">Личный кабинет</h1>
          <p className="mt-1 text-sm text-gray-600">Не авторизован.</p>
          <Link href="/wholesale/login" className="mt-4 inline-flex rounded-xl bg-gray-900 px-4 py-2 text-sm text-white hover:opacity-90">
            Войти
          </Link>
        </div>
      </div>
    );
  }

  const email = me.user?.email || "—";

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
          <h1 className="text-xl font-semibold">Личный кабинет (опт)</h1>
          <div className="mt-2 text-sm text-gray-700">Почта: <b>{email}</b></div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="rounded-2xl bg-gray-900 text-white px-4 py-2 text-sm" href="/wholesale/order">Оформить заказ</Link>
            <button className="rounded-2xl bg-white border border-gray-200 px-4 py-2 text-sm" onClick={onLogout}>Выйти</button>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 text-sm text-gray-700">
            <div className="font-medium mb-1">Подсказки</div>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Каталог и корзина доступны на странице <Link className="underline" href="/wholesale/order">/wholesale/order</Link>.
              </li>
              <li>
                После оформления заказа появится уведомление об успехе, корзина очистится.
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-100">
          <div className="px-1 py-8 text-center text-sm text-gray-500">© {new Date().getFullYear()} kawa.by (ООО «МЭР ТРЕЙД»)</div>
        </div>
      </div>
    </div>
  );
}
