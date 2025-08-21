// pages/wholesale/checkout.js
import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { getJSON, setJSON } from "@/lib/safeStorage";

const STORAGE_KEY = "kawa.cart.v1";
const rub = (n) => Number(n || 0).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function WholesaleCheckout() {
  const [user, setUser] = useState(undefined);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store" });
        const j = r.ok ? await r.json().catch(() => ({})) : null;
        if (alive) setUser(j?.user || null);
      } catch { if (alive) setUser(null); }
    })();
    return () => { alive = false; };
  }, []);

  const [cart, setCart] = useState(() => getJSON(STORAGE_KEY, []));
  const totalQty = useMemo(() => cart.reduce((s, r) => s + (Number(r?.qty) || 0), 0), [cart]);
  const totalSum = useMemo(() => cart.reduce((s, r) => s + (Number(r?.price) || 0) * (Number(r?.qty) || 0), 0), [cart]);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // {ok, orderId|text}

  async function submit() {
    if (!cart.length) return;
    setSubmitting(true);
    setResult(null);
    try {
      const payload = {
        user: { email: user?.email || "" },
        items: cart.map(r => ({ id: r?.id, qty: Number(r?.qty) || 0, price: Number(r?.price) || 0 })),
        total_qty: totalQty,
        total_sum: totalSum,
        meta: { source: "kawa.by", at: new Date().toISOString() },
      };
      const resp = await fetch("/api/cart-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
      setResult({ ok: true, orderId: data?.received ? "DEMO" : "—" });
      setCart([]); setJSON(STORAGE_KEY, []); // очистить корзину
    } catch (e) {
      setResult({ ok: false, text: String(e?.message || e) });
    } finally { setSubmitting(false); }
  }

  if (user === undefined) return <div className="min-h-screen grid place-items-center text-gray-600">Загрузка…</div>;
  if (user === null) return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center">
        Нужна авторизация. <Link className="underline" href="/wholesale/login">Войти</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex items-end justify-between flex-wrap gap-2">
          <h1 className="text-2xl md:text-3xl font-bold">Оформление заказа</h1>
          <div className="text-sm text-gray-600">Вы вошли как <b>{user?.email}</b></div>
        </div>

        {cart.length === 0 && !result && (
          <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4">
            Корзина пуста. <Link className="underline" href="/wholesale/order">Вернуться к каталогу</Link>
          </div>
        )}

        {cart.length > 0 && (
          <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-gray-600 bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Товар</th>
                    <th className="p-2 text-left">Упаковка</th>
                    <th className="p-2 text-right">Цена</th>
                    <th className="p-2 text-right">Кол-во</th>
                    <th className="p-2 text-right">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((r) => (
                    <tr key={r?.id} className="border-t">
                      <td className="p-2">{r?.title}</td>
                      <td className="p-2">{r?.pack || "—"}</td>
                      <td className="p-2 text-right">{rub(r?.price)}</td>
                      <td className="p-2 text-right">{r?.qty}</td>
                      <td className="p-2 text-right">{rub((Number(r?.price)||0)*(Number(r?.qty)||0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 text-right text-sm">
                Позиции: <b>{cart.length}</b> • Всего: <b>{totalQty}</b> • Сумма: <b>{rub(totalSum)}</b>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <Link href="/wholesale/order" className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm">Вернуться к товарам</Link>
              <button
                onClick={submit}
                disabled={submitting}
                className="rounded-xl bg-gray-900 text-white px-4 py-2 text-sm"
              >
                {submitting ? "Отправка…" : "Подтвердить заказ"}
              </button>
            </div>
          </div>
        )}

        {result && (
          <div className={result.ok
            ? "mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"
            : "mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800"}>
            {result.ok
              ? <>Заявка отправлена! Номер (демо): <b>{result.orderId}</b>. <Link className="underline" href="/wholesale/account">Перейти в личный кабинет</Link>.</>
              : <>Не удалось отправить: {result.text}</>}
          </div>
        )}
      </div>
    </div>
  );
}