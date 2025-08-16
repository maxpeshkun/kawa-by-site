import React, { useEffect, useMemo, useState } from "react";
import { getJSON, setJSON } from "@/lib/safeStorage";

/**
 * Страница оформления оптового заказа
 * - Подтягивает товары с /api/b2b-products (или /data/b2b-products.json если API вернул ошибку)
 * - Поиск + фильтр по категориям
 * - Добавление в корзину с ограничением по остатку
 * - Корзина с редактированием количества, удалением, очисткой
 * - Сохранение корзины в localStorage (через safeStorage)
 * - Отправка заказа на /api/cart-submit (заглушка отвечает 200)
 */

const STORAGE_KEY = "kawa.cart.v1";

function classNames(...a) {
  return a.filter(Boolean).join(" ");
}

export default function WholesaleOrderPage() {
  // ----- каталог -----
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
        // fallback на статичный файл, чтобы не блокировать работу
        try {
          const r2 = await fetch("/data/b2b-products.json", { cache: "no-store" });
          const d2 = await r2.json();
          if (alive) {
            setProducts(Array.isArray(d2?.products) ? d2.products : []);
            setErr("(Показан тестовый каталог из файла — API временно недоступен)");
          }
        } catch {
          if (alive) setErr(String(e?.message || e));
        }
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, []);

  // ----- фильтры -----
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort(),
    [products]
  );

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return products.filter((p) => {
      const byCat = !cat || p.category === cat;
      const byQ =
        !qq ||
        (p.title || "").toLowerCase().includes(qq) ||
        (p.brand || "").toLowerCase().includes(qq) ||
        (p.pack || "").toLowerCase().includes(qq);
      return byCat && byQ;
    });
  }, [products, q, cat]);

  // ----- корзина -----
  const [cart, setCart] = useState(() => getJSON(STORAGE_KEY, []));
  useEffect(() => { setJSON(STORAGE_KEY, cart); }, [cart]);

  const cartIndex = useMemo(() => {
    const idx = new Map();
    cart.forEach((row, i) => idx.set(row.id, i));
    return idx;
  }, [cart]);

  const cartTotalQty = useMemo(
    () => cart.reduce((s, r) => s + (r.qty || 0), 0),
    [cart]
  );
  const cartTotalSum = useMemo(
    () => cart.reduce((s, r) => s + (Number(r.price || 0) * (r.qty || 0)), 0),
    [cart]
  );

  function addToCart(p, addQty = 1) {
    const stock = Number.isFinite(p.stock) ? Math.max(0, Number(p.stock)) : 0;
    if (stock <= 0) return;

    setCart((prev) => {
      const i = cartIndex.get(p.id);
      if (i == null) {
        const qty = Math.min(addQty, stock);
        return [...prev, { id: p.id, title: p.title, pack: p.pack, price: Number(p.price || 0), stock, qty }];
      } else {
        const next = [...prev];
        const row = { ...next[i] };
        row.qty = Math.min(stock, (row.qty || 0) + addQty);
        next[i] = row;
        return next;
      }
    });
  }

  function setQty(id, nextQty) {
    setCart((prev) => {
      const i = prev.findIndex((r) => r.id === id);
      if (i < 0) return prev;
      const row = { ...prev[i] };
      const stock = Number.isFinite(row.stock) ? Math.max(0, Number(row.stock)) : 0;
      const qty = Math.max(0, Math.min(stock, Number(nextQty || 0)));
      const next = [...prev];
      if (qty === 0) next.splice(i, 1);
      else next[i] = { ...row, qty };
      return next;
    });
  }

  function removeFromCart(id) {
    setCart((prev) => prev.filter((r) => r.id !== id));
  }

  function clearCart() {
    setCart([]);
  }

  // ----- отправка заказа (заглушка) -----
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState(null);

  async function submitOrder() {
    if (!cart.length) return;
    setSubmitMsg(null);
    try {
      setSubmitting(true);
      const payload = {
        items: cart.map((r) => ({ id: r.id, qty: r.qty, price: r.price })),
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

  // ----- UI -----
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <h1 className="text-2xl md:text-3xl font-bold">Оформление оптового заказа</h1>
          <div className="text-sm text-gray-600">
            В корзине: <b>{cartTotalQty}</b> шт · <b>{cartTotalSum.toFixed(2)}</b>
          </div>
        </div>

        {/* фильтры */}
        <div className="mt-4 grid gap-3 md:grid-cols-3">
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
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* каталог */}
        <div className="mt-4">
          {loading && <div className="rounded-2xl border border-gray-100 bg-white p-4">Загрузка каталога…</div>}
          {err && !loading && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
              {err}
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="rounded-2xl border border-gray-100 bg-white p-4">Ничего не найдено, измените фильтры.</div>
          )}

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 mt-2">
            {filtered.map((p) => {
              const inCart = cart.find((r) => r.id === p.id);
              const stock = Number.isFinite(p.stock) ? Number(p.stock) : 0;
              const canAdd = stock > (inCart?.qty || 0);

              return (
                <div key={p.id} className="rounded-2xl border border-gray-100 bg-white p-4 flex gap-3">
                  <div className="h-16 w-16 rounded-xl bg-gray-100 overflow-hidden grid place-items-center shrink-0">
                    {p.image ? (
                      <img alt={p.title} src={p.image} className="object-cover w-full h-full" />
                    ) : (
                      <div className="text-xs text-gray-500">нет фото</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{p.title}</div>
                    <div className="text-xs text-gray-600">
                      {(p.category || "—")}{p.brand ? ` • ${p.brand}` : ""}{p.pack ? ` • ${p.pack}` : ""}
                    </div>
                    <div className="mt-1 text-sm">
                      {p.price != null && <span className="font-medium">{Number(p.price).toFixed(2)}</span>}{" "}
                      {Number.isFinite(stock) && <span className="text-gray-600">· Остаток: {stock}</span>}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        className={classNames(
                          "rounded-xl px-3 py-1 text-sm border transition",
                          canAdd
                            ? "bg-gray-900 text-white border-gray-900 hover:opacity-90"
                            : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                        )}
                        disabled={!canAdd}
                        onClick={() => addToCart(p, 1)}
                      >
                        В корзину
                      </button>
                      {inCart && (
                        <div className="text-xs text-gray-600">
                          В корзине: <b>{inCart.qty}</b>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* корзина */}
        <div className="mt-8">
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="font-semibold">Корзина</div>
              <div className="text-sm text-gray-600">
                {cart.length
                  ? <>Позиции: <b>{cart.length}</b> · Всего: <b>{cartTotalQty}</b> · Сумма: <b>{cartTotalSum.toFixed(2)}</b></>
                  : "Корзина пуста"}
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
                      const max = Number.isFinite(r.stock) ? Math.max(0, Number(r.stock)) : 0;
                      return (
                        <tr key={r.id} className="border-t border-gray-100">
                          <td className="py-2 pr-3">
                            <div className="font-medium">{r.title}</div>
                            <div className="text-xs text-gray-500">{r.pack || ""}</div>
                          </td>
                          <td className="py-2 pr-3 whitespace-nowrap">{Number(r.price || 0).toFixed(2)}</td>
                          <td className="py-2 pr-3 whitespace-nowrap">{max}</td>
                          <td className="py-2 pr-3">
                            <div className="flex items-center gap-2">
                              <button
                                className="rounded-lg px-2 py-1 border border-gray-200"
                                onClick={() => setQty(r.id, (r.qty || 0) - 1)}
                                aria-label="Убавить"
                              >
                                −
                              </button>
                              <input
                                className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm"
                                type="number"
                                min={0}
                                max={max}
                                value={r.qty}
                                onChange={(e) => setQty(r.id, e.target.value)}
                              />
                              <button
                                className="rounded-lg px-2 py-1 border border-gray-200"
                                onClick={() => setQty(r.id, Math.min(max, (r.qty || 0) + 1))}
                                disabled={(r.qty || 0) >= max}
                                aria-label="Прибавить"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-2 pr-3 whitespace-nowrap">
                            {(Number(r.price || 0) * (r.qty || 0)).toFixed(2)}
                          </td>
                          <td className="py-2">
                            <button
                              className="rounded-lg px-3 py-1 border border-gray-200 hover:bg-gray-50"
                              onClick={() => removeFromCart(r.id)}
                            >
                              Удалить
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
                  <button
                    className="rounded-xl px-4 py-2 text-sm border border-gray-200 hover:bg-gray-50"
                    onClick={clearCart}
                  >
                    Очистить корзину
                  </button>
                  <button
                    className={classNames(
                      "rounded-xl px-4 py-2 text-sm transition",
                      cart.length && !submitting ? "bg-gray-900 text-white hover:opacity-90" : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    )}
                    disabled={!cart.length || submitting}
                    onClick={submitOrder}
                  >
                    {submitting ? "Отправка…" : "Отправить заказ"}
                  </button>
                </div>

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
    </div>
  );
}
