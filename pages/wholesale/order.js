// pages/wholesale/order.js
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getJSON, setJSON } from "@/lib/safeStorage";
import {
  Search, Filter, ShoppingCart, Minus, Plus, Barcode, UserCircle2, ArrowRight, X,
} from "lucide-react";

const STORAGE_KEY = "kawa.cart.v1";

function cx(...a) { return a.filter(Boolean).join(" "); }
const rub = (n) => Number(n || 0).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function WholesaleOrderPage() {
  // ---------- AUTH ----------
  const [user, setUser] = useState(undefined); // undefined=загрузка, null=не авторизован, {email}=ок
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

  // ---------- PRODUCTS ----------
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [products, setProducts] = useState([]);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true); setErr(null);
      try {
        const r = await fetch("/api/b2b-products", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        const list = Array.isArray(j?.products) ? j.products : [];
        if (alive) setProducts(list);
      } catch (e) {
        // fallback на файл (если API недоступно)
        try {
          const r2 = await fetch("/data/b2b-products.json", { cache: "no-store" });
          const j2 = await r2.json();
          if (alive) {
            setProducts(Array.isArray(j2?.products) ? j2.products : []);
            setErr("(Показан тестовый каталог из файла — API временно недоступен)");
          }
        } catch {
          if (alive) setErr(String(e?.message || e));
        }
      } finally { if (alive) setLoading(false); }
    };
    load();
    return () => { alive = false; };
  }, []);

  // ---------- FILTERS ----------
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const categories = useMemo(
    () => Array.from(new Set(products.map(p => p?.category).filter(Boolean))).sort(),
    [products]
  );
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return products.filter((p) => {
      const byCat = !cat || p?.category === cat;
      const byQ = !qq ||
        (p?.title || "").toLowerCase().includes(qq) ||
        (p?.brand || "").toLowerCase().includes(qq) ||
        (p?.pack || "").toLowerCase().includes(qq);
      return byCat && byQ;
    });
  }, [products, q, cat]);

  // ---------- CART ----------
  const [cart, setCart] = useState(() => getJSON(STORAGE_KEY, [])); // [{id,title,pack,price,stock,qty,barcode}]
  useEffect(() => { setJSON(STORAGE_KEY, cart); }, [cart]);

  const cartIndex = useMemo(() => {
    const m = new Map(); cart.forEach((r, i) => m.set(r?.id, i)); return m;
  }, [cart]);

  const cartTotalQty = useMemo(() => cart.reduce((s, r) => s + (Number(r?.qty) || 0), 0), [cart]);
  const cartTotalSum = useMemo(() => cart.reduce((s, r) => s + (Number(r?.price) || 0) * (Number(r?.qty) || 0), 0), [cart]);

  function addToCart(p, delta = 1) {
    const id = p?.id; if (!id) return;
    const stock = Number.isFinite(p?.stock) ? Math.max(0, Number(p.stock)) : 0;
    if (stock <= 0 && delta > 0) return;

    setCart((prev) => {
      const i = cartIndex.get(id);
      if (i == null) {
        const qty = Math.min(delta > 0 ? delta : 0, stock);
        return [...prev, {
          id, title: String(p?.title || ""), pack: p?.pack, price: Number(p?.price || 0),
          stock, qty, brand: p?.brand, barcode: p?.barcode || "—", category: p?.category
        }];
      } else {
        const next = [...prev];
        const row = { ...next[i] };
        const max = Number.isFinite(row.stock) ? Math.max(0, Number(row.stock)) : 0;
        row.qty = Math.max(0, Math.min(max, (Number(row.qty) || 0) + delta));
        if (row.qty === 0) next.splice(i, 1); else next[i] = row;
        return next;
      }
    });
  }
  function setQty(id, nextQty) {
    setCart((prev) => {
      const i = prev.findIndex((r) => r?.id === id);
      if (i < 0) return prev;
      const row = { ...prev[i] };
      const max = Number.isFinite(row.stock) ? Math.max(0, Number(row.stock)) : 0;
      const qty = Math.max(0, Math.min(max, Number(nextQty || 0)));
      const next = [...prev];
      if (qty === 0) next.splice(i, 1); else next[i] = { ...row, qty };
      return next;
    });
  }
  function removeFromCart(id) { setCart((prev) => prev.filter((r) => r?.id !== id)); }
  function clearCart() { setCart([]); }

  // UI state
  const [showCart, setShowCart] = useState(false);
  useEffect(() => { if (cartTotalQty === 0) setShowCart(false); }, [cartTotalQty]);

  // ---------- RENDER ----------
  if (user === undefined) {
    return <div className="min-h-screen grid place-items-center text-gray-600">Загрузка…</div>;
  }
  if (user === null) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-b from-white to-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-sm text-center">
          <div className="text-xl font-semibold">Нужна авторизация</div>
          <div className="text-sm text-gray-600 mt-1">Чтобы оформить оптовый заказ, войдите в аккаунт.</div>
          <a href={`/wholesale/login?next=${encodeURIComponent("/wholesale/order")}`}
             className="mt-4 inline-flex rounded-xl px-4 py-2 text-sm bg-gray-900 text-white hover:opacity-90">
            Войти
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Sticky header with search & filter */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 space-y-2">
          <div className="flex items-end justify-between flex-wrap gap-2">
            <h1 className="text-2xl md:text-3xl font-bold">Оформление оптового заказа</h1>
            <div className="text-sm text-gray-600">
              Вы вошли как <b>{user?.email || "—"}</b>
              <form className="inline ml-3" onSubmit={async (e)=>{e.preventDefault(); await fetch("/api/auth/logout",{method:"POST"}); window.location.reload();}}>
                <button className="text-gray-500 underline">Выйти</button>
              </form>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
            <div className="sm:col-span-3 relative">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Поиск по названию, бренду, упаковке…"
                className="pl-9 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Все категории</option>
                {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
              <button className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm">
                <Filter size={16}/>Фильтр
              </button>
            </div>
          </div>
          {err && <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">{err}</div>}
        </div>
      </div>

      {/* Product list */}
      <div className="mx-auto max-w-7xl px-4 py-4 grid gap-3">
        {loading && <div className="rounded-2xl border border-gray-100 bg-white p-4">Загрузка каталога…</div>}
        {!loading && filtered.length === 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-4">Ничего не найдено, измените фильтры.</div>
        )}

        {!loading && filtered.map((p) => {
          const inCart = cart.find((r) => r?.id === p?.id);
          const qty = Number(inCart?.qty || 0);
          const stock = Number.isFinite(p?.stock) ? Number(p.stock) : 0;

          return (
            <div key={p?.id || p?.title} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-16 w-16 shrink-0 rounded-2xl bg-gray-100 grid place-items-center text-xs text-gray-500">
                  нет фото
                </div>
                <div className="min-w-0">
                  <div className="text-base font-semibold truncate">{p?.title || "—"}</div>
                  <div className="text-sm text-gray-600">{p?.category || "—"} • {p?.brand || "—"} • {p?.pack || "—"}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-700">
                    {p?.price != null && <span className="font-semibold">{rub(p.price)}</span>}
                    <span>Остаток: {stock}</span>
                    <span className="inline-flex items-center gap-1 text-gray-600">
                      <Barcode size={14}/> {p?.barcode || "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 w-48">
                {/* qty controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => addToCart(p, -1)}
                    disabled={qty === 0}
                    className="h-9 w-9 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40"
                    aria-label="Минус"
                  >
                    <Minus size={16}/>
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={stock}
                    value={qty}
                    onChange={(e) => setQty(p?.id, Number(e.target.value || 0))}
                    className="w-16 text-center rounded-lg border border-gray-200 px-2 py-1 text-sm"
                  />
                  <button
                    onClick={() => addToCart(p, +1)}
                    disabled={qty >= stock}
                    className="h-9 w-9 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40"
                    aria-label="Плюс"
                  >
                    <Plus size={16}/>
                  </button>
                </div>
                {/* add to cart - shifted right */}
                <button
                  onClick={() => { addToCart(p, qty ? 0 : 1); setShowCart(true); }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 text-white px-4 py-2 text-sm"
                >
                  <ShoppingCart size={16}/> В корзину +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom sticky widget */}
      <div className="sticky bottom-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm">
            <button
              onClick={() => setShowCart(v => !v)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm"
            >
              <ShoppingCart size={16}/> Корзина ({cartTotalQty})
            </button>
            <div className="text-gray-700">
              Позиции: <b>{cart.length}</b> • Всего: <b>{cartTotalQty}</b> • Сумма: <b>{rub(cartTotalSum)}</b>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/wholesale/account" className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm">
              <UserCircle2 size={16}/> Личный кабинет
            </Link>
            <Link
              href="/wholesale/checkout"
              className={cx(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm",
                cartTotalQty ? "bg-gray-900 text-white hover:opacity-90" : "bg-gray-200 text-gray-500 cursor-not-allowed"
              )}
              onClick={(e)=>{ if (!cartTotalQty) e.preventDefault(); }}
            >
              <ArrowRight size={16}/> Оформить заказ
            </Link>
          </div>
        </div>

        {showCart && (
          <div className="border-t border-gray-200 bg-white/95">
            <div className="mx-auto max-w-7xl px-4 py-3 grid gap-2">
              {cart.map((row) => {
                const qty = Number(row?.qty || 0);
                const price = Number(row?.price || 0);
                const max = Number.isFinite(row?.stock) ? Math.max(0, Number(row.stock)) : 0;
                return (
                  <div key={row?.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0 flex-1 truncate">
                      <div className="truncate font-medium">{row?.title || "—"}</div>
                      <div className="text-gray-600">
                        {row?.pack || ""} • {row?.brand || ""} • <span className="inline-flex items-center gap-1"><Barcode size={14}/>{row?.barcode || "—"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => addToCart(row, -1)} disabled={qty === 0} className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center"><Minus size={14}/></button>
                      <input type="number" min={0} max={max} value={qty} onChange={(e) => setQty(row?.id, Number(e.target.value || 0))} className="w-16 text-center rounded-lg border border-gray-200 px-2 py-1 text-sm h-8"/>
                      <button onClick={() => addToCart(row, +1)} disabled={qty >= max} className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center"><Plus size={14}/></button>
                    </div>
                    <div className="w-24 text-right font-semibold">{rub(price * qty)}</div>
                    <button onClick={() => removeFromCart(row?.id)} className="inline-flex items-center gap-2 text-red-600">
                      <X size={16}/>Удалить
                    </button>
                  </div>
                );
              })}
              {cart.length > 0 && (
                <div className="flex items-center justify-between pt-2">
                  <button onClick={clearCart} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm">Очистить корзину</button>
                  <Link href="/wholesale/checkout" className="rounded-xl bg-gray-900 text-white px-4 py-2 text-sm inline-flex items-center gap-2">
                    <ArrowRight size={16}/> Перейти к оформлению
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}