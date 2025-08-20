// pages/wholesale/order.js
// Страница оформления оптового заказа (B2B)
// Что реализовано:
// 1) Поиск и фильтр закреплены сверху (sticky).
// 2) В карточке товара: штрихкод (если есть), кнопки количества (− / +),
//    кнопка "В корзину" вынесена вправо.
// 3) Внизу закреплён виджет корзины: итоговые суммы + кнопки
//    "Корзина", "Каталог", "Кабинет оптовика", "Оформить заказ" (2-й этап).
// 4) Хуки вызываются без условий (фикс React error #310).
// 5) Совместимо с /api/auth/me, /api/b2b-products и /api/cart-submit.

import React, { useEffect, useMemo, useState } from "react";
import { getJSON, setJSON } from "@/lib/safeStorage";

const STORAGE_KEY = "kawa.cart.v1";

function classNames(...a) {
  return a.filter(Boolean).join(" ");
}

// Небольшие кнопки-иконки (без внешних зависимостей)
const Btn = ({ children, onClick, disabled, variant = "solid", className = "" }) => {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed";
  const style =
    variant === "solid"
      ? "bg-gray-900 text-white hover:opacity-90"
      : variant === "outline"
      ? "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
      : "bg-transparent text-gray-900 hover:bg-gray-100";
  return (
    <button onClick={onClick} disabled={disabled} className={classNames(base, style, className)}>
      {children}
    </button>
  );
};

export default function WholesaleOrderPage() {
  // ---------- AUTH ----------
  const [user, setUser] = useState(undefined); // undefined=загрузка, null=гость, {email}=ок
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store" });
        if (!alive) return;
        const d = await r.json().catch(() => ({}));
        setUser(d?.user || null);
      } catch {
        if (alive) setUser(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ---------- DATA (каталог) ----------
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setErr(null);
      try {
        const resp = await fetch("/api/b2b-products", { cache: "no-store" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const list = Array.isArray(data?.products) ? data.products : [];
        if (alive) setProducts(list);
      } catch (e) {
        // Фоллбэк на публичный файл
        try {
          const r2 = await fetch("/data/demo-products.json", { cache: "no-store" });
          const d2 = await r2.json();
          if (alive) {
            setProducts(Array.isArray(d2) ? d2 : []);
            setErr("(Показана демонстрационная витрина — API временно недоступен)");
          }
        } catch {
          if (alive) setErr(String(e?.message || e));
        }
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, []);

  // ---------- FILTERS ----------
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p?.category).filter(Boolean))).sort(),
    [products]
  );
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return products.filter((p) => {
      const byCat = !cat || p?.category === cat;
      const byQ =
        !qq ||
        (p?.title || "").toLowerCase().includes(qq) ||
        (p?.brand || "").toLowerCase().includes(qq) ||
        (p?.pack || "").toLowerCase().includes(qq);
      return byCat && byQ;
    });
  }, [products, q, cat]);

  // ---------- CART ----------
  const [cart, setCart] = useState(() => getJSON(STORAGE_KEY, []));
  useEffect(() => {
    setJSON(STORAGE_KEY, cart);
  }, [cart]);

  const cartIndex = useMemo(() => {
    const idx = new Map();
    cart.forEach((row, i) => idx.set(row?.id, i));
    return idx;
  }, [cart]);

  const cartTotalQty = useMemo(() => cart.reduce((s, r) => s + (Number(r?.qty) || 0), 0), [cart]);
  const cartTotalSum = useMemo(
    () => cart.reduce((s, r) => s + (Number(r?.price) || 0) * (Number(r?.qty) || 0), 0),
    [cart]
  );

  function addToCart(p, addQty = 1) {
    const stock = Number.isFinite(p?.stock) ? Math.max(0, Number(p.stock)) : 0;
    if (stock <= 0) return;

    setCart((prev) => {
      const id = p?.id;
      if (!id) return prev;
      const i = cartIndex.get(id);
      if (i == null) {
        const qty = Math.min(addQty, stock);
        return [
          ...prev,
          {
            id,
            title: String(p?.title || ""),
            pack: p?.pack,
            price: Number(p?.price || 0),
            stock,
            qty,
            barcode: p?.barcode, // опционально
          },
        ];
      } else {
        const next = [...prev];
        const row = { ...next[i] };
        row.qty = Math.min(stock, (Number(row.qty) || 0) + addQty);
        next[i] = row;
        return next;
      }
    });
  }

  function setQty(id, nextQty) {
    setCart((prev) => {
      const i = prev.findIndex((r) => r?.id === id);
      if (i < 0) return prev;
      const row = { ...prev[i] };
      const stock = Number.isFinite(row?.stock) ? Math.max(0, Number(row.stock)) : 0;
      const qty = Math.max(0, Math.min(stock, Number(nextQty || 0)));
      const next = [...prev];
      if (qty === 0) next.splice(i, 1);
      else next[i] = { ...row, qty };
      return next;
    });
  }

  function removeFromCart(id) {
    setCart((prev) => prev.filter((r) => r?.id !== id));
  }
  function clearCart() {
    setCart([]);
  }

  // ---------- SUBMIT (этап 2) ----------
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState(null);
  async function submitOrder() {
    if (!cart.length) return;
    setSubmitMsg(null);
    try {
      setSubmitting(true);
      const payload = {
        user: { email: user?.email || "" },
        items: cart.map((r) => ({ id: r?.id, qty: Number(r?.qty) || 0, price: Number(r?.price) || 0 })),
        total_qty: cartTotalQty,
        total_sum: cartTotalSum,
        meta: { source: "kawa.by", at: new Date().toISOString() },
      };
      const resp = await fetch("/api/cart-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
      setSubmitMsg({ ok: true, text: "Заказ отправлен. Менеджер свяжется с вами." });
      clearCart();
    } catch (e) {
      setSubmitMsg({ ok: false, text: `Не удалось отправить заказ: ${String(e?.message || e)}` });
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- UI ----------
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900">
      <div className="mx-auto max-w-7xl px-4">
        {/* HEADER + AUTH */}
        <div className="py-6 flex items-end justify-between flex-wrap gap-3">
          <h1 className="text-2xl md:text-3xl font-bold">Оформление оптового заказа</h1>
          <div className="text-sm text-gray-600">
            {user ? (
              <>
                Вы вошли как <b>{user?.email}</b>
                <form
                  className="inline ml-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await fetch("/api/auth/logout", { method: "POST" });
                    window.location.reload();
                  }}
                >
                  <button className="text-gray-500 underline">Выйти</button>
                </form>
              </>
            ) : user === null ? (
              <>
                Нужна авторизация.{" "}
                <a
                  href={`/wholesale/login?next=${encodeURIComponent("/wholesale/order")}`}
                  className="underline"
                >
                  Войти
                </a>
              </>
            ) : (
              "Загрузка…"
            )}
          </div>
        </div>

        {/* TOP STICKY: поиск + фильтры */}
        <div className="sticky top-0 z-20 -mx-4 px-4 border-b border-gray-200 bg-white/90 backdrop-blur">
          <div className="py-3 grid gap-2 md:grid-cols-3">
            <div className="md:col-span-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Поиск по названию, бренду, упаковке…"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"
              />
            </div>
            <div>
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
              >
                <option value="">Все категории</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* LIST */}
        <div className="py-4 grid gap-3">
          {loading && (
            <div className="rounded-2xl border border-gray-100 bg-white p-4">Загрузка каталога…</div>
          )}
          {err && !loading && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
              {err}
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              Ничего не найдено, измените фильтры.
            </div>
          )}

          {!loading &&
            filtered.map((p) => {
              const inCart = cart.find((r) => r?.id === p?.id);
              const qty = Number(inCart?.qty || 0);
              const stock = Number.isFinite(p?.stock) ? Math.max(0, Number(p.stock)) : 0;
              const canAdd = stock > qty;

              return (
                <div key={p?.id || p?.title} className="rounded-2xl border border-gray-100 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-16 w-16 rounded-xl bg-gray-100 overflow-hidden grid place-items-center shrink-0 text-xs text-gray-500">
                      нет фото
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{p?.title || "—"}</div>
                      <div className="text-xs text-gray-600">
                        {(p?.category || "—")}
                        {p?.brand ? ` • ${p.brand}` : ""}
                        {p?.pack ? ` • ${p.pack}` : ""}
                      </div>
                      <div className="mt-1 text-sm flex flex-wrap items-center gap-3">
                        {p?.price != null && (
                          <span className="font-medium">{Number(p.price).toFixed(2)}</span>
                        )}
                        {Number.isFinite(stock) && (
                          <span className="text-gray-600">· Остаток: {stock}</span>
                        )}
                        {p?.barcode && (
                          <span className="text-gray-600">· Штрихкод: {p.barcode}</span>
                        )}
                      </div>
                    </div>

                    {/* Контролы справа: qty и кнопка */}
                    <div className="flex flex-col items-end gap-2 w-44">
                      <div className="flex items-center gap-2">
                        <button
                          className="rounded-lg px-3 py-1 border border-gray-200"
                          onClick={() => setQty(p?.id, Math.max(0, qty - 1))}
                          aria-label="Убавить"
                          disabled={qty <= 0}
                        >
                          −
                        </button>
                        <input
                          className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm text-center"
                          type="number"
                          min={0}
                          max={stock}
                          value={qty}
                          onChange={(e) => setQty(p?.id, e.target.value)}
                        />
                        <button
                          className="rounded-lg px-3 py-1 border border-gray-200"
                          onClick={() => setQty(p?.id, Math.min(stock, qty + 1))}
                          disabled={qty >= stock}
                          aria-label="Прибавить"
                        >
                          +
                        </button>
                      </div>
                      <Btn
                        className="w-full"
                        disabled={!canAdd}
                        onClick={() => addToCart(p, Math.max(1, 1 - qty))}
                      >
                        В корзину
                      </Btn>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Корзина (полный блок внутри страницы, не закреплён) */}
        <div className="pb-28"> {/* отступ под нижний виджет */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="font-semibold">Корзина</div>
              <div className="text-sm text-gray-600">
                {cart.length ? (
                  <>
                    Позиции: <b>{cart.length}</b> · Всего: <b>{cartTotalQty}</b> · Сумма:{" "}
                    <b>{cartTotalSum.toFixed(2)}</b>
                  </>
                ) : (
                  "Корзина пуста"
                )}
              </div>
            </div>

            {cart.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-gray-500">
                    <tr>
                      <th className="py-2 pr-3">Товар</th>
                      <th className="py-2 pr-3">Цена</th>
                      <th className="py-2 pr-3">Остаток</th>
                      <th className="py-2 pr-3">Кол-во</th>
                      <th className="py-2 pr-3">Сумма</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((r) => {
                      const max = Number.isFinite(r?.stock) ? Math.max(0, Number(r.stock)) : 0;
                      const price = Number(r?.price || 0);
                      const qty = Number(r?.qty || 0);
                      return (
                        <tr key={r?.id || Math.random()} className="border-top border-gray-100">
                          <td className="py-2 pr-3">
                            <div className="font-medium">{r?.title || "—"}</div>
                            <div className="text-xs text-gray-500">
                              {r?.pack || ""}
                              {r?.barcode ? ` • Штрихкод: ${r.barcode}` : ""}
                            </div>
                          </td>
                          <td className="py-2 pr-3 whitespace-nowrap">{price.toFixed(2)}</td>
                          <td className="py-2 pr-3 whitespace-nowrap">{max}</td>
                          <td className="py-2 pr-3">
                            <div className="flex items-center gap-2">
                              <button
                                className="rounded-lg px-2 py-1 border border-gray-200"
                                onClick={() => setQty(r?.id, Math.max(0, qty - 1))}
                                aria-label="Убавить"
                              >
                                −
                              </button>
                              <input
                                className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm text-center"
                                type="number"
                                min={0}
                                max={max}
                                value={qty}
                                onChange={(e) => setQty(r?.id, e.target.value)}
                              />
                              <button
                                className="rounded-lg px-2 py-1 border border-gray-200"
                                onClick={() => setQty(r?.id, Math.min(max, qty + 1))}
                                disabled={qty >= max}
                                aria-label="Прибавить"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-2 pr-3 whitespace-nowrap">
                            {(price * qty).toFixed(2)}
                          </td>
                          <td className="py-2">
                            <button
                              className="rounded-lg px-3 py-1 border border-gray-200 hover:bg-gray-50"
                              onClick={() => removeFromCart(r?.id)}
                            >
                              Удалить
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {submitMsg && (
                  <div
                    className={classNames(
                      "mt-3 rounded-xl px-3 py-2 text-sm",
                      submitMsg.ok
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-amber-50 text-amber-800 border border-amber-200"
                    )}
                  >
                    {submitMsg.text}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM STICKY WIDGET (итоги + быстрые действия) */}
      <div className="sticky bottom-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-sm">
            <Btn variant="outline">Корзина ({cartTotalQty})</Btn>
            <div className="text-gray-700">
              Позиции: <b>{cart.length}</b> • Всего: <b>{cartTotalQty}</b> • Сумма:{" "}
              <b>{cartTotalSum.toFixed(2)}</b>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/#catalog"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >
              Каталог
            </a>
            <a
              href="/wholesale/account"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >
              Кабинет оптовика
            </a>
            <Btn onClick={submitOrder} disabled={!cart.length || submitting}>
              {submitting ? "Отправка…" : "Оформить заказ"}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}