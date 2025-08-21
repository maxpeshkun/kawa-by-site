// pages/wholesale/checkout.js
import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "kawa.cart.v2";

function currency(n) {
  return Number(n || 0).toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const getJSON = (k, fb) => {
  if (typeof window === "undefined") return fb;
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : fb;
  } catch {
    return fb;
  }
};
const setJSON = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

export default function WholesaleCheckoutPage() {
  // ---- auth guard (как в order.js) ----
  const [user, setUser] = useState(undefined); // undefined=загрузка, null=не автор, {email}=ok
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store" });
        const d = r.ok ? await r.json().catch(() => ({})) : {};
        if (alive) setUser(d?.user || null);
      } catch {
        if (alive) setUser(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (user === undefined) {
    return <div className="min-h-screen grid place-items-center text-gray-600">Загрузка…</div>;
  }
  if (user === null) {
    const next = encodeURIComponent("/wholesale/checkout");
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-b from-white to-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-sm text-center">
          <div className="text-xl font-semibold">Нужна авторизация</div>
          <div className="text-sm text-gray-600 mt-1">Чтобы оформить заказ, войдите в аккаунт.</div>
          <a
            href={`/wholesale/login?next=${next}`}
            className="mt-4 inline-flex rounded-xl px-4 py-2 text-sm bg-gray-900 text-white hover:opacity-90"
          >
            Войти
          </a>
        </div>
      </div>
    );
  }

  // ---- читаем корзину из order.js (array rows) ----
  const [cart, setCart] = useState(() => {
    const v = getJSON(STORAGE_KEY, []);
    // На всякий случай: если вдруг лежит объект-словарь — превратим в массив пустых позиций
    if (Array.isArray(v)) return v;
    if (v && typeof v === "object") {
      return Object.entries(v).map(([id, qty]) => ({
        id,
        title: `Товар ${id}`,
        qty: Number(qty) || 0,
        price: 0,
        stock: 0,
        pack_qty: "",
        image: "",
      }));
    }
    return [];
  });

  const totalQty = useMemo(() => cart.reduce((s, r) => s + (r.qty || 0), 0), [cart]);
  const totalSum = useMemo(() => cart.reduce((s, r) => s + (Number(r.price || 0) * (r.qty || 0)), 0), [cart]);

  // ---- форма клиента ----
  const [form, setForm] = useState({
    company: "",
    inn: "",
    contact: "",
    email: user?.email || "",
    phone: "",
    address: "",
    comment: "",
  });
  const onChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // {ok, text, orderId?}

  const canSubmit = totalQty > 0 && !submitting;

  async function submitOrder() {
    if (!canSubmit) return;

    // простая клиентская валидация
    const errs = [];
    if (!form.company.trim()) errs.push("Компания");
    if (!form.contact.trim()) errs.push("Контактное лицо");
    if (!/.+@.+\..+/.test(form.email)) errs.push("Email");
    if (!form.phone.trim()) errs.push("Телефон");
    if (errs.length) {
      setResult({ ok: false, text: `Проверьте поля: ${errs.join(", ")}` });
      return;
    }

    try {
      setSubmitting(true);
      setResult(null);
      const payload = {
        customer: {
          email: form.email,
          company: form.company,
          inn: form.inn,
          contact: form.contact,
          phone: form.phone,
          address: form.address,
          comment: form.comment,
        },
        items: cart.map((r) => ({ id: r.id, title: r.title, qty: r.qty, price: r.price })),
        totalQty,
        totalSum,
      };
      const resp = await fetch("/api/cart-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);

      // Успех: очищаем корзину и показываем номер
      setJSON(STORAGE_KEY, []);
      setCart([]);
      setResult({ ok: true, text: "Заказ отправлен. Менеджер свяжется с вами.", orderId: data?.orderId });
    } catch (e) {
      setResult({ ok: false, text: `Не удалось отправить заказ: ${String(e?.message || e)}` });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900">
      {/* заголовок */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-3xl px-3 py-3">
          <div className="text-lg font-semibold">Оформление заказа — шаг 2</div>
          <div className="text-sm text-gray-600">
            Вы вошли как <b>{user?.email}</b>
            <a href="/wholesale/order" className="ml-3 underline">← Вернуться к выбору товаров</a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-3 py-4 grid gap-4">
        {/* корзина-итоги */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="font-semibold mb-2">Корзина</div>
          {cart.length === 0 ? (
            <div className="text-sm text-gray-600">
              Корзина пуста. <a className="underline" href="/wholesale/order">Вернуться в каталог</a>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-gray-500">
                    <tr>
                      <th className="py-2 pr-3">Товар</th>
                      <th className="py-2 pr-3 text-right">Цена</th>
                      <th className="py-2 pr-3 text-right">Кол-во</th>
                      <th className="py-2 pr-0 text-right">Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="py-2 pr-3">
                          <div className="font-medium">{r.title}</div>
                          {r.pack_qty ? <div className="text-xs text-gray-500">В упаковке: {r.pack_qty}</div> : null}
                        </td>
                        <td className="py-2 pr-3 text-right whitespace-nowrap">{currency(r.price)}</td>
                        <td className="py-2 pr-3 text-right whitespace-nowrap">{r.qty}</td>
                        <td className="py-2 pr-0 text-right whitespace-nowrap">{currency(r.qty * (r.price || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex items-center justify-between text-sm">
                <div className="text-gray-600">
                  Позиции: <b>{cart.length}</b> · Всего: <b>{totalQty}</b>
                </div>
                <div className="text-base">
                  Итого: <b>{currency(totalSum)}</b>
                </div>
              </div>
            </>
          )}
        </div>

        {/* форма клиента */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="font-semibold mb-2">Данные покупателя</div>
          {result && (
            <div
              className={
                "mb-3 rounded-xl px-3 py-2 text-sm " +
                (result.ok
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-amber-50 text-amber-800 border border-amber-200")
              }
            >
              {result.text} {result.orderId ? `№ ${result.orderId}` : ""}
            </div>
          )}

          <div className="grid gap-3">
            <div className="grid md:grid-cols-2 gap-3">
              <input
                placeholder="Компания*"
                value={form.company}
                onChange={onChange("company")}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="УНП / ИНН"
                value={form.inn}
                onChange={onChange("inn")}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="Контактное лицо*"
                value={form.contact}
                onChange={onChange("contact")}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="Email*"
                value={form.email}
                onChange={onChange("email")}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="Телефон*"
                value={form.phone}
                onChange={onChange("phone")}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="Адрес доставки"
                value={form.address}
                onChange={onChange("address")}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <textarea
              placeholder="Комментарий к заказу"
              value={form.comment}
              onChange={onChange("comment")}
              rows={3}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
            />

            <div className="flex flex-wrap gap-2">
              <a
                href="/wholesale/order"
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm"
              >
                ← Продолжить покупки
              </a>
              <button
                onClick={submitOrder}
                disabled={!canSubmit}
                className={
                  "rounded-xl px-4 py-2 text-sm " +
                  (canSubmit ? "bg-gray-900 text-white hover:opacity-90" : "bg-gray-200 text-gray-500")
                }
              >
                Отправить заказ
              </button>
              <a
                href="/wholesale/account"
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm"
              >
                Личный кабинет
              </a>
            </div>
          </div>
        </div>

        {/* подсказка */}
        <div className="text-xs text-gray-500">
          После отправки менеджер свяжется с вами для подтверждения и уточнения условий поставки.
        </div>
      </div>
    </div>
  );
}
