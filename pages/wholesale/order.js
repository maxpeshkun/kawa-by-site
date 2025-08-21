// pages/wholesale/order.js
import React, { useEffect, useMemo, useState } from "react";

// локальное хранилище для корзины
const STORAGE_KEY = "kawa.cart.v2";

function classNames(...a) { return a.filter(Boolean).join(" "); }
const currency = (n) => Number(n || 0).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// безопасное чтение/запись localStorage
const getJSON = (k, fb) => {
  if (typeof window === "undefined") return fb;
  try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : fb; } catch { return fb; }
};
const setJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export default function WholesaleOrderPage() {
  // ---- guard: проверяем авторизацию как раньше ----
  const [user, setUser] = useState(undefined); // undefined=загрузка, null=не авторизован, {email}=ОК
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
    return () => { alive = false; };
  }, []);

  if (user === undefined) {
    return <div className="min-h-screen grid place-items-center text-gray-600">Загрузка…</div>;
  }
  if (user === null) {
    const next = encodeURIComponent("/wholesale/order");
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-b from-white to-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-sm text-center">
          <div className="text-xl font-semibold">Нужна авторизация</div>
          <div className="text-sm text-gray-600 mt-1">Чтобы оформить оптовый заказ, войдите в аккаунт.</div>
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

  // ---- каталог ----
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true); setErr(null);
      try {
        const resp = await fetch("/api/b2b-products", { cache: "no-store" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();

        // нормализуем поля: stock, pack_qty, barcode, image
        const list = (Array.isArray(data.products) ? data.products : []).map((p, i) => ({
          id: String(p.id ?? i + 1),
          title: p.title || "",
          category: p.category || "",
          brand: p.brand || "",
          // показываем «кол-во в упаковке», без «упаковка/остаток» на карточке
          pack_qty: p.pack_qty ?? parsePackQty(p.pack),
          price: Number(p.price ?? 0),
          barcode: p.barcode || p.ean || "",
          stock: Number.isFinite(p.stock) ? Number(p.stock) : 999999, // лимит добавления, но НЕ показываем на карточке
          image: p.image || p.img || "",
        }));
        if (alive) setProducts(list);
      } catch (e) {
        setErr(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, []);

  // --- фильтры/поиск ---
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))),
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
        (p.barcode || "").toLowerCase().includes(qq);
      return byCat && byQ;
    });
  }, [products, q, cat]);

  // --- корзина (лимит по stock, без отображения количества на карточке) ---
  const [cart, setCart] = useState(() => getJSON(STORAGE_KEY, [])); // [{id, qty, price, title, stock, pack_qty, image}]
  useEffect(() => { setJSON(STORAGE_KEY, cart); }, [cart]);

  const cartIndex = useMemo(() => {
    const m = new Map();
    cart.forEach((r, i) => m.set(r.id, i));
    return m;
  }, [cart]);

  const cartTotalQty = useMemo(() => cart.reduce((s, r) => s + (r.qty || 0), 0), [cart]);
  const cartTotalSum = useMemo(() => cart.reduce((s, r) => s + (Number(r.price || 0) * (r.qty || 0)), 0), [cart]);

  function addToCart(p, delta = 1) {
    const max = Number.isFinite(p.stock) ? Math.max(0, Number(p.stock)) : 0;
    if (max <= 0 && delta > 0) return;

    setCart((prev) => {
      const i = cartIndex.get(p.id);
      if (i == null) {
        const qty = Math.min(delta > 0 ? delta : 0, max);
        return qty > 0 ? [...prev, pickRow(p, qty)] : prev;
      } else {
        const next = [...prev];
        const row = { ...next[i] };
        row.qty = Math.max(0, Math.min(max, (row.qty || 0) + delta));
        if (row.qty === 0) next.splice(i, 1);
        else next[i] = row;
        return next;
      }
    });
  }
  function setQty(id, nextQty) {
    setCart((prev) => {
      const i = prev.findIndex((r) => r.id === id);
      if (i < 0) return prev;
      const row = { ...prev[i] };
      const max = Number.isFinite(row.stock) ? Math.max(0, Number(row.stock)) : 0;
      const qty = Math.max(0, Math.min(max, Number(nextQty || 0)));
      const next = [...prev];
      if (qty === 0) next.splice(i, 1);
      else next[i] = { ...row, qty };
      return next;
    });
  }
  function removeFromCart(id) { setCart((prev) => prev.filter((r) => r.id !== id)); }
  function clearCart() { setCart([]); }
  function pickRow(p, qty) {
    return { id: p.id, title: p.title, price: Number(p.price || 0), stock: Number(p.stock || 0), qty, pack_qty: p.pack_qty, image: p.image };
  }

  // UI: состояние нижней плашки
  const [showCart, setShowCart] = useState(false);
  useEffect(() => { if (cartTotalQty === 0) setShowCart(false); }, [cartTotalQty]);

  // --- разметка ---
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900">
      {/* Верхний закреплённый виджет (поиск/фильтр) */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-3xl px-3 py-3">
          <div className="text-lg font-semibold">Оформление оптового заказа</div>
          <div className="mt-2 grid gap-2">
            <div className="relative">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Поиск по названию, бренду, штрихкоду…"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Все категории</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button
                type="button"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-left"
              >
                Фильтр
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Одна колонка, мобильная компоновка «сжато» */}
      <div className="mx-auto max-w-3xl px-3 py-3">
        {loading && <div className="rounded-2xl border border-gray-100 bg-white p-4">Загрузка каталога…</div>}
        {err && !loading && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">{err}</div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-4">Ничего не найдено, измените фильтры.</div>
        )}

        {/* Группируем по категории с заголовком раздела */}
        {groupByCategory(filtered).map(([section, list]) => (
          <div key={section} className="mb-5">
            {section && <div className="px-1 pb-2 text-base font-semibold">{section}</div>}

            <div className="grid gap-2">
              {list.map((p) => {
                // сколько уже в корзине (на карточке НЕ показываем число)
                const inCart = cart.find((r) => r.id === p.id);
                const max = Number.isFinite(p.stock) ? Math.max(0, Number(p.stock)) : 0;
                const canAdd = (inCart?.qty || 0) < max;

                return (
                  <div key={p.id} className="rounded-2xl border border-gray-100 bg-white p-3">
                    <div className="flex items-center gap-3">
                      {/* мини-картинка 64x64, квадрат — экономим вертикаль */}
                      <div className="h-16 w-16 overflow-hidden shrink-0 rounded-xl bg-gray-100 grid place-items-center">
                        {p.image
                          ? <img src={p.image} alt={p.title} className="object-cover w-full h-full" />
                          : <div className="text-[10px] text-gray-500">нет фото</div>}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{p.title}</div>
                        <div className="mt-0.5 text-xs text-gray-600">
                          В упаковке: <b>{p.pack_qty || "—"}</b>
                          {p.barcode ? <span className="ml-2">||| {p.barcode}</span> : null}
                        </div>
                        <div className="mt-1 text-sm font-semibold">{currency(p.price)}</div>
                      </div>

                      {/* Только кнопки +/- , без числа на карточке */}
                      <div className="flex items-center gap-1">
                        <button
                          className="h-9 w-9 rounded-lg border border-gray-200"
                          onClick={() => addToCart(p, -1)}
                          disabled={!inCart}
                          aria-label="Убавить"
                        >
                          −
                        </button>
                        <button
                          className={classNames(
                            "h-9 rounded-lg px-3 border",
                            canAdd
                              ? "border-gray-900 bg-gray-900 text-white"
                              : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                          )}
                          onClick={() => addToCart(p, +1)}
                          disabled={!canAdd}
                          aria-label="В корзину"
                        >
                          В корзину +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Нижний закреплённый виджет (адаптирован под мобильный) */}
      <div className="sticky bottom-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-3xl px-3 py-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => setShowCart((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              🛒 Корзина ({cartTotalQty})
            </button>
            <div className="text-gray-700 text-sm">Σ: <b>{currency(cartTotalSum)}</b></div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/wholesale/account"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              👤 Личный кабинет
            </a>
            <a
              href="/wholesale/checkout"
              onClick={(e) => { if (!cartTotalQty) e.preventDefault(); }}
              className={classNames(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm",
                cartTotalQty ? "bg-gray-900 text-white hover:opacity-90" : "bg-gray-200 text-gray-500 cursor-not-allowed"
              )}
            >
              → Оформить заказ
            </a>
          </div>
        </div>

        {/* Мини-корзина (не открывается на каждое +, только по кнопке) */}
        {showCart && (
          <div className="border-t border-gray-200 bg-white/95 max-h-60 overflow-y-auto">
            <div className="mx-auto max-w-3xl px-3 py-2 grid gap-2">
              {cart.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0 flex-1 truncate">
                    <div className="truncate font-medium">{r.title}</div>
                    {r.pack_qty ? <div className="text-gray-500 text-xs">В упаковке: {r.pack_qty}</div> : null}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="h-8 w-8 rounded-lg border border-gray-200"
                      onClick={() => addToCart(r, -1)}
                      aria-label="Убавить"
                    >−</button>
                    <input
                      className="w-12 rounded-lg border border-gray-200 px-2 py-1 text-sm text-center"
                      type="number"
                      min={0}
                      max={Number.isFinite(r.stock) ? r.stock : undefined}
                      value={r.qty}
                      onChange={(e) => setQty(r.id, e.target.value)}
                    />
                    <button
                      className="h-8 w-8 rounded-lg border border-gray-200"
                      onClick={() => addToCart(r, +1)}
                      disabled={Number.isFinite(r.stock) && r.qty >= r.stock}
                      aria-label="Прибавить"
                    >+</button>
                  </div>
                  <div className="w-16 text-right font-semibold">{currency(r.qty * (r.price || 0))}</div>
                  <button className="text-red-600 text-xs" onClick={() => removeFromCart(r.id)}>Удалить</button>
                </div>
              ))}

              {cart.length > 0 && (
                <div className="flex items-center justify-between pt-1">
                  <button
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
                    onClick={clearCart}
                  >
                    Очистить корзину
                  </button>
                  <div className="text-sm">Итого: <b>{currency(cartTotalSum)}</b></div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** утиль: пытаемся вытащить «12 шт.» из поля pack */
function parsePackQty(pack) {
  if (!pack || typeof pack !== "string") return "";
  const m = pack.match(/(\d+)\s*шт/i);
  return m ? `${m[1]} шт` : "";
}

/** группировка по категории для заголовков секций */
function groupByCategory(list) {
  const map = new Map();
  for (const p of list) {
    const k = p.category || "";
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(p);
  }
  return Array.from(map.entries());
}