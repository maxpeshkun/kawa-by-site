// pages/wholesale/order.js
import React, { useEffect, useMemo, useState } from "react";
import { Search, Filter, ShoppingCart, Minus, Plus, Barcode, UserCircle2, ArrowRight, X } from "lucide-react";
import { getJSON, setJSON } from "@/lib/safeStorage";

const STORAGE_KEY = "kawa.cart.v1";

const currency = (n) => Number(n || 0).toLocaleString("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function classNames(...a) { return a.filter(Boolean).join(" "); }

export default function WholesaleOrderPage() {
  // ---------- AUTH ----------
  const [user, setUser] = useState(undefined); // undefined = загрузка, null = не авторизован, {email} = ок
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store" });
        if (!alive) return;
        const d = r.ok ? await r.json().catch(() => ({})) : {};
        setUser(d?.user || null); // текущее API возвращает { auth:false, user:null }
      } catch {
        if (alive) setUser(null);
      }
    })();
    return () => { alive = false; };
  }, []);

  // ---------- КАТАЛОГ ----------
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState(null);
  const [products,setProducts]= useState([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true); setErr(null);
      try {
        const resp = await fetch("/api/b2b-products", { cache: "no-store" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const list = Array.isArray(data?.products) ? data.products : Array.isArray(data) ? data : [];
        if (alive) setProducts(list);
      } catch (e) {
        try {
          const r2 = await fetch("/data/demo-products.json", { cache: "no-store" });
          const d2 = await r2.json();
          const list2 = Array.isArray(d2?.products) ? d2.products : Array.isArray(d2) ? d2 : [];
          if (alive) { setProducts(list2); setErr("(Показан тестовый каталог из файла — API временно недоступен)"); }
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

  // ---------- ФИЛЬТРЫ ----------
  const [q,   setQ]   = useState("");
  const [cat, setCat] = useState("");

  const normalized = useMemo(() => {
    // нормализуем поля, добавляем pack_qty_text
    return products.map(p => ({
      ...p,
      pack_qty: Number.isFinite(Number(p?.pack_qty)) ? Number(p.pack_qty) : null,
      pack_qty_text: Number.isFinite(Number(p?.pack_qty)) ? `${Number(p.pack_qty)} шт` : null,
    }));
  }, [products]);

  const categories = useMemo(
    () => Array.from(new Set(normalized.map(p => p?.category).filter(Boolean))).sort(),
    [normalized]
  );

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return normalized.filter((p) => {
      const byCat = !cat || p?.category === cat;
      const hay   = `${p?.title||""} ${p?.brand||""} ${p?.pack||""} ${p?.barcode||""}`.toLowerCase();
      return byCat && (!qq || hay.includes(qq));
    });
  }, [normalized, q, cat]);

  // ---------- ГРУППИРОВКА ПО КАТЕГОРИЯМ ----------
  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((p) => {
      const key = p?.category || "Без категории";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    });
    // Стабильный порядок категорий
    return Array.from(map.entries()).sort(([a],[b]) => a.localeCompare(b, "ru"));
  }, [filtered]);

  // ---------- КОРЗИНА ----------
  const [cart, setCart] = useState(() => getJSON(STORAGE_KEY, []));
  useEffect(() => { setJSON(STORAGE_KEY, cart); }, [cart]);

  const cartIndex = useMemo(() => {
    const idx = new Map();
    cart.forEach((row, i) => idx.set(row?.id, i));
    return idx;
  }, [cart]);

  const cartTotalQty = useMemo(() => cart.reduce((s, r) => s + (Number(r?.qty) || 0), 0), [cart]);
  const cartTotalSum = useMemo(() => cart.reduce((s, r) => s + ((Number(r?.price) || 0) * (Number(r?.qty) || 0)), 0), [cart]);

  function addToCart(p, addQty = 1) {
    setCart((prev) => {
      const id = p?.id; if (!id) return prev;
      const i = cartIndex.get(id);
      if (i == null) {
        const qty = Math.max(0, addQty);
        return [...prev, {
          id,
          title: String(p?.title || ""),
          price: Number(p?.price || 0),
          qty,
          brand: p?.brand,
          pack:  p?.pack,
          pack_qty: p?.pack_qty ?? null,
          barcode: p?.barcode,
          image: p?.image,
          category: p?.category
        }];
      } else {
        const next = [...prev];
        const row = { ...next[i] };
        row.qty = Math.max(0, (Number(row.qty) || 0) + addQty);
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
      const qty = Math.max(0, Number(nextQty || 0));
      const next = [...prev];
      if (qty === 0) next.splice(i, 1); else next[i] = { ...row, qty };
      return next;
    });
  }
  function removeFromCart(id) { setCart((prev) => prev.filter((r) => r?.id !== id)); }
  function clearCart() { setCart([]); }

  const [showCart, setShowCart] = useState(false);
  useEffect(() => { if (cartTotalQty === 0) setShowCart(false); }, [cartTotalQty]);

  // ---------- UI ----------
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900">
      {/* Sticky top: поиск/фильтр — мобильная верстка компактнее */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-3 space-y-2">
          <div className="text-base md:text-lg font-semibold">Оформление оптового заказа</div>

          <div className="grid grid-cols-1 gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Поиск по названию, бренду, штрихкоду…"
                className="pl-9 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm bg-white"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Все категории</option>
                {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
              <button className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm">
                <Filter size={16} />
                Фильтр
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Гейт авторизации */}
      {user === undefined && (
        <div className="min-h-[40vh] grid place-items-center text-gray-600">Загрузка…</div>
      )}
      {user === null && (
        <div className="min-h-[40vh] grid place-items-center">
          <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-sm text-center">
            <div className="text-xl font-semibold">Нужна авторизация</div>
            <div className="text-sm text-gray-600 mt-1">Чтобы оформить оптовый заказ, войдите в аккаунт.</div>
            <a
              href={`/wholesale/login?next=${encodeURIComponent("/wholesale/order")}`}
              className="mt-4 inline-flex rounded-xl px-4 py-2 text-sm bg-gray-900 text-white hover:opacity-90"
            >
              Войти
            </a>
          </div>
        </div>
      )}

      {/* Контент — одна колонка с иерархией по категориям */}
      {user && (
        <div className="mx-auto max-w-3xl px-4 py-4">
          {loading && <div className="rounded-2xl border border-gray-100 bg-white p-4">Загрузка каталога…</div>}
          {err && !loading && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">{err}</div>
          )}

          {!loading && grouped.length === 0 && (
            <div className="rounded-2xl border border-gray-100 bg-white p-4">Ничего не найдено, измените фильтры.</div>
          )}

          {!loading && grouped.map(([catName, list]) => (
            <section key={catName} className="mb-6">
              <h2 className="sticky top-[56px] z-10 bg-white/90 backdrop-blur px-1 py-2 text-base md:text-lg font-semibold border-l-4 border-gray-900">
                {catName}
              </h2>
              <div className="mt-2 grid gap-2">
                {list.map((p) => {
                  const id = p?.id;
                  const idx = cartIndex.get(id);
                  const inCart = idx != null ? cart[idx] : null;
                  const qty = Number(inCart?.qty || 0);

                  return (
                    <div key={id || p?.title} className="rounded-2xl border border-gray-100 bg-white p-4 flex items-center gap-3">
                      <div className="h-14 w-14 rounded-xl bg-gray-100 overflow-hidden grid place-items-center shrink-0">
                        {p?.image ? (
                          <img alt={p?.title || "товар"} src={p.image} className="object-cover w-full h-full" />
                        ) : (
                          <div className="text-[10px] text-gray-500 px-2 text-center leading-tight">нет фото</div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{p?.title || "—"}</div>
                        {/* УБРАНЫ остаток и упаковка. Показываем «кол-во в упаковке» если есть */}
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                          {p?.pack_qty_text && <span>В упаковке: <b>{p.pack_qty_text}</b></span>}
                          {p?.barcode && (
                            <span className="inline-flex items-center gap-1"><Barcode size={14} />{p.barcode}</span>
                          )}
                        </div>
                        {/* Цена отдельной строкой для мобильного */}
                        <div className="mt-1 text-sm font-semibold">{currency(p?.price)}</div>
                      </div>

                      {/* Контрол количества: только − / поле / + */}
                      <div className="flex items-center gap-2">
                        <button
                          className="h-9 w-9 rounded-lg border border-gray-200 flex items-center justify-center"
                          onClick={() => setQty(id, (qty || 0) - 1)}
                          disabled={qty === 0}
                          aria-label="Убавить"
                        >
                          <Minus size={16} />
                        </button>
                        <input
                          className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm text-center"
                          type="number"
                          min={0}
                          value={qty}
                          onChange={(e) => setQty(id, e.target.value)}
                        />
                        <button
                          className="h-9 w-9 rounded-lg border border-gray-200 flex items-center justify-center"
                          onClick={() => { if (qty === 0) setShowCart(true); addToCart(p, 1); }}
                          aria-label="Прибавить"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Нижний фиксированный виджет — мобильный вид первого экрана */}
      {user && (
        <div className="sticky bottom-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur">
          <div className="mx-auto max-w-3xl px-4 py-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => setShowCart((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <ShoppingCart size={16} /> Корзина ({cartTotalQty})
              </button>
              <div className="text-gray-700">
                Позиций: <b>{cart.length}</b> • Σ: <b>{currency(cartTotalSum)}</b>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="/wholesale/account"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <UserCircle2 size={16} /> Личный кабинет
              </a>
              <button
                disabled={!cart.length}
                onClick={() => { window.location.href = "/wholesale/account"; }}
                className={classNames(
                  "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm",
                  cart.length ? "bg-gray-900 text-white hover:opacity-90" : "bg-gray-200 text-gray-500 cursor-not-allowed"
                )}
              >
                <ArrowRight size={16} /> Оформить заказ
              </button>
            </div>
          </div>

          {/* Мини‑корзина */}
          {showCart && (
            <div className="border-t border-gray-200 bg-white/95">
              <div className="mx-auto max-w-3xl px-4 py-3 grid gap-2">
                {cart.map((r) => (
                  <div key={r?.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0 flex-1 truncate">
                      <div className="truncate font-medium">{r?.title || "—"}</div>
                      <div className="text-gray-600">
                        {r?.pack_qty ? <>В упаковке: <b>{r.pack_qty} шт</b> • </> : null}
                        {r?.brand ? <>{r.brand} • </> : null}
                        {r?.barcode && <span className="inline-flex items-center gap-1"><Barcode size={14} />{r.barcode}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQty(r?.id, (Number(r?.qty || 0) - 1))}
                        disabled={(Number(r?.qty || 0)) === 0}
                        className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center"
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={Number(r?.qty || 0)}
                        onChange={(e) => setQty(r?.id, e.target.value)}
                        className="w-16 text-center rounded-lg border border-gray-200 px-2 py-1 text-sm h-8"
                      />
                      <button
                        onClick={() => setQty(r?.id, (Number(r?.qty || 0) + 1))}
                        className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="w-24 text-right font-semibold">
                      {currency((Number(r?.price || 0) * (Number(r?.qty || 0))))}
                    </div>
                    <button onClick={() => removeFromCart(r?.id)} className="inline-flex items-center gap-2 text-red-600">
                      <X size={16} />Удалить
                    </button>
                  </div>
                ))}
                {cart.length === 0 && <div className="text-sm text-gray-600">Корзина пуста</div>}
                <div className="pt-2 flex items-center justify-between text-sm">
                  <button onClick={clearCart} className="rounded-xl border border-gray-300 bg-white px-3 py-2">Очистить</button>
                  <div className="text-gray-800">Итого: <b>{currency(cartTotalSum)}</b></div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}