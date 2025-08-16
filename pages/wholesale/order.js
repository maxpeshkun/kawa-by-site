// pages/wholesale/order.js
import React, { useEffect, useMemo, useState } from "react";

function classNames(...a){return a.filter(Boolean).join(" ");}

// ——— мини-хранилище корзины в localStorage ———
const CART_KEY = "kawa_wholesale_cart_v1";
function loadCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || "{}"); } catch { return {}; }
}
function saveCart(cart) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {}
}

export default function WholesaleOrderPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState(null);

  // фильтры/поиск
  const [q, setQ]     = useState("");
  const [cat, setCat] = useState("");

  // корзина: { [id]: { id, title, price, stock, qty } }
  const [cart, setCart] = useState({});

  // контактные данные
  const [form, setForm] = useState({ company:"", contact:"", phone:"", email:"", comment:"" });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // {ok,msg,orderId}

  // загрузка каталога
  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true); setErr(null);
      try {
        const r = await fetch("/api/b2b-products", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (alive) setProducts(Array.isArray(data.products) ? data.products : []);
      } catch(e) {
        if (alive) setErr(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, []);

  // восстановление корзины
  useEffect(() => {
    const initial = loadCart();
    setCart(initial);
  }, []);

  // сохранение корзины
  useEffect(() => { saveCart(cart); }, [cart]);

  const cats = useMemo(() => Array.from(new Set(products.map(p=>p.category))).filter(Boolean), [products]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return products.filter(p =>
      (!cat || p.category === cat) &&
      (!ql || (p.title || "").toLowerCase().includes(ql))
    );
  }, [products, cat, q]);

  // добавить в корзину с ограничением по остаткам
  function addToCart(p, delta=1) {
    setCart(prev => {
      const cur = prev[p.id]?.qty || 0;
      const stock = Number.isFinite(p.stock) && p.stock >= 0 ? p.stock : Infinity;
      const nextQty = Math.max(0, Math.min(cur + delta, stock));
      const next = { ...prev };
      if (nextQty === 0) {
        delete next[p.id];
      } else {
        next[p.id] = {
          id: p.id,
          title: p.title,
          price: p.price ?? 0,
          stock: stock === Infinity ? null : stock,
          qty: nextQty,
        };
      }
      return next;
    });
  }

  function setQty(p, qtyRaw) {
    const qty = Math.max(0, parseInt(qtyRaw || "0", 10) || 0);
    const stock = Number.isFinite(p.stock) && p.stock >= 0 ? p.stock : Infinity;
    const clamped = Math.min(qty, stock);
    setCart(prev => {
      const next = { ...prev };
      if (clamped === 0) delete next[p.id];
      else next[p.id] = { id: p.id, title: p.title, price: p.price ?? 0, stock: stock === Infinity ? null : stock, qty: clamped };
      return next;
    });
  }

  const items = Object.values(cart);
  const totalQty = items.reduce((s,i)=>s+i.qty,0);
  const totalSum = items.reduce((s,i)=>s+(Number(i.price||0)*i.qty),0);

  async function submitOrder(e){
    e.preventDefault();
    setResult(null);

    if (items.length === 0) {
      setResult({ ok:false, msg:"Добавь товары в корзину" });
      return;
    }
    const errs = {};
    if (!form.company.trim()) errs.company = "Компания";
    if (!form.contact.trim()) errs.contact = "Контакт";
    if (!form.phone.trim())   errs.phone   = "Телефон";
    if (!/.+@.+\..+/.test(form.email)) errs.email = "Email";
    if (Object.keys(errs).length) {
      setResult({ ok:false, msg:"Заполни: " + Object.values(errs).join(", ") });
      return;
    }

    // защита: не больше остатка
    for (const i of items) {
      if (i.stock != null && i.qty > i.stock) {
        setResult({ ok:false, msg:`Товар «${i.title}» превышает остаток (${i.stock})` });
        return;
      }
    }

    try {
      setSubmitting(true);
      const resp = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({
          customer: form,
          items: items.map(i => ({ id:i.id, title:i.title, price:i.price, qty:i.qty })),
          totalQty, totalSum
        })
      });
      const data = await resp.json().catch(()=>({}));
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);

      setResult({ ok:true, msg:"Заказ оформлен. Мы свяжемся с тобой для подтверждения.", orderId: data.orderId });
      // почистим корзину
      setCart({});
    } catch(e) {
      setResult({ ok:false, msg:`Ошибка оформления: ${String(e?.message||e)}` });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold">Оптовый заказ</h1>
          <a href="/" className="text-sm underline">На главную</a>
        </div>

        {/* Поиск/фильтры */}
        <div className="mt-4 grid md:grid-cols-4 gap-3">
          <div className="md:col-span-3 grid sm:grid-cols-3 gap-3">
            <input
              value={q}
              onChange={e=>setQ(e.target.value)}
              placeholder="Поиск по названию"
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
            <select
              value={cat}
              onChange={e=>setCat(e.target.value)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
            >
              <option value="">Все категории</option>
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              onClick={()=>{ setQ(""); setCat(""); }}
              className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Сбросить
            </button>
          </div>

          {/* Корзина (сводка) */}
          <div className="md:col-span-1 rounded-2xl border border-gray-100 bg-white p-4">
            <div className="font-semibold">Корзина</div>
            <div className="text-sm text-gray-600 mt-1">Позиций: {items.length}, шт: {totalQty}</div>
            <div className="text-lg font-semibold mt-1">{totalSum.toFixed(2)} BYN</div>
            {items.length>0 && (
              <button
                onClick={()=>setCart({})}
                className="mt-2 text-sm underline"
              >
                Очистить
              </button>
            )}
          </div>
        </div>

        {/* Сообщения */}
        <div className="mt-4">
          {loading && <div className="rounded-xl border p-4">Загрузка каталога…</div>}
          {err && <div className="rounded-xl border p-4 bg-amber-50 border-amber-200 text-amber-800">Ошибка: {err}</div>}
        </div>

        {/* Каталог */}
        {!loading && !err && (
          <div className="mt-4 grid lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2 grid gap-3">
              {filtered.length === 0 && (
                <div className="rounded-xl border p-4">Ничего не найдено</div>
              )}
              {filtered.map(p => {
                const inCart = cart[p.id]?.qty || 0;
                const stock = Number.isFinite(p.stock) && p.stock >= 0 ? p.stock : null;
                const canPlus = stock == null ? true : inCart < stock;
                return (
                  <div key={p.id} className="rounded-2xl border border-gray-100 bg-white p-4 flex gap-3">
                    <div className="h-16 w-16 rounded-xl bg-gray-100 grid place-items-center overflow-hidden shrink-0">
                      {p.image ? <img src={p.image} alt={p.title} className="object-cover w-full h-full" /> : <span className="text-xs text-gray-500">img</span>}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{p.title}</div>
                      <div className="text-sm text-gray-600">
                        {(p.category || "—")}{p.brand ? ` • ${p.brand}` : ""}{p.pack ? ` • ${p.pack}` : ""}
                      </div>
                      <div className="mt-1 text-sm">
                        {p.price != null && <>Цена: <b>{p.price}</b> BYN</>}
                        {p.stock != null && <> · Остаток: <b>{p.stock}</b></>}
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <button
                          className="px-3 py-1 rounded-xl border hover:bg-gray-50"
                          onClick={()=>addToCart(p, -1)}
                          disabled={inCart===0}
                        >−</button>
                        <input
                          className="w-16 text-center rounded-xl border px-2 py-1"
                          value={inCart || ""}
                          onChange={e=>setQty(p, e.target.value)}
                          placeholder="0"
                          inputMode="numeric"
                        />
                        <button
                          className="px-3 py-1 rounded-xl border hover:bg-gray-50 disabled:opacity-50"
                          onClick={()=>addToCart(p, +1)}
                          disabled={!canPlus}
                        >+</button>

                        <button
                          className="ml-2 px-4 py-1.5 rounded-xl border hover:bg-gray-50"
                          onClick={()=>setQty(p, 0)}
                          disabled={inCart===0}
                        >
                          Убрать
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Оформление */}
            <div className="lg:col-span-1">
              <form onSubmit={submitOrder} className="rounded-2xl border border-gray-100 bg-white p-4 grid gap-3 sticky top-6">
                <div className="font-semibold">Оформление</div>
                {result && (
                  <div className={classNames(
                    "rounded-xl px-3 py-2 text-sm",
                    result.ok ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                  )}>
                    {result.msg}{result.orderId ? ` (№${result.orderId})` : ""}
                  </div>
                )}
                <input
                  placeholder="Компания*"
                  className="rounded-xl border px-3 py-2 text-sm"
                  value={form.company} onChange={e=>setForm({...form, company:e.target.value})}
                />
                <input
                  placeholder="Контактное лицо*"
                  className="rounded-xl border px-3 py-2 text-sm"
                  value={form.contact} onChange={e=>setForm({...form, contact:e.target.value})}
                />
                <input
                  placeholder="Телефон*"
                  className="rounded-xl border px-3 py-2 text-sm"
                  value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})}
                />
                <input
                  placeholder="Email*"
                  className="rounded-xl border px-3 py-2 text-sm"
                  value={form.email} onChange={e=>setForm({...form, email:e.target.value})}
                />
                <textarea
                  placeholder="Комментарий"
                  className="rounded-xl border px-3 py-2 text-sm"
                  rows={3}
                  value={form.comment} onChange={e=>setForm({...form, comment:e.target.value})}
                />
                <button
                  type="submit"
                  disabled={submitting || items.length===0}
                  className="rounded-2xl px-4 py-2 text-sm bg-gray-900 text-white disabled:opacity-60"
                >
                  {submitting ? "Отправка…" : `Оформить заказ (${totalSum.toFixed(2)} BYN)`}
                </button>
                <div className="text-xs text-gray-500">
                  Нажимая кнопку, ты подтверждаешь корректность данных. Лимит добавления в корзину не превышает текущих остатков.
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}