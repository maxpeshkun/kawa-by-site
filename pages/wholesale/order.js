// pages/wholesale/order.js
import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { getJSON, setJSON } from "@/lib/safeStorage";

// Лёгкий ErrorBoundary только для этой страницы
class PageBoundary extends React.Component {
  constructor(p){ super(p); this.state = {err:null}; }
  static getDerivedStateFromError(e){ return {err:e}; }
  componentDidCatch(){/* no-op */}
  render(){
    if (this.state.err) {
      return (
        <div style={{maxWidth:720,margin:"32px auto",padding:16,border:"1px solid #FCD34D",borderRadius:12,background:"#FFFBEB"}}>
          <div style={{fontWeight:600,marginBottom:8}}>На странице произошла ошибка.</div>
          <div style={{opacity:.8,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>
            {String(this.state.err?.message || this.state.err)}
          </div>
          <div style={{fontSize:12,opacity:.7,marginTop:8}}>Обнови страницу или очисти корзину.</div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Нормализация продуктов из /api/b2b-products
function normalizeProducts(raw) {
  const list = Array.isArray(raw?.products) ? raw.products : [];
  return list.map((p,i)=>({
    id: p.id ?? String(i+1),
    title: p.title ?? p.name ?? "Без названия",
    category: p.category ?? "",
    brand: p.brand ?? "",
    pack: p.pack ?? "",
    tags: Array.isArray(p.tags) ? p.tags : [],
    price: (p.price ?? null) != null ? Number(p.price) : null,
    stock: (p.stock ?? null) != null ? Number(p.stock) : null,
    image: p.image ?? null,
  }));
}

function clampQty(q, stock) {
  const s = Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : Infinity;
  const v = Math.max(1, Math.floor(q || 1));
  return Math.min(v, s);
}

function useCart() {
  const [items, setItems] = useState([]);
  // начальная загрузка из localStorage
  useEffect(()=> {
    setItems(getJSON("kawa.cart", []));
  }, []);
  // автосохранение
  useEffect(()=> {
    setJSON("kawa.cart", items);
  }, [items]);

  const add = (p, qty=1) => {
    setItems(prev=>{
      const ex = prev.find(x=>x.id===p.id);
      const max = Number.isFinite(p.stock) ? Math.max(0, Math.floor(p.stock)) : Infinity;
      if (!ex) return [...prev, { id:p.id, title:p.title, price:p.price ?? 0, stock:p.stock ?? null, qty: clampQty(qty, max) }];
      const newQty = clampQty(ex.qty + qty, max);
      return prev.map(x=> x.id===p.id ? {...x, qty:newQty} : x);
    });
  };
  const setQty = (id, qty, stock) => {
    setItems(prev => prev.map(x => x.id===id ? {...x, qty: clampQty(qty, stock)} : x));
  };
  const remove = (id) => setItems(prev => prev.filter(x=>x.id!==id));
  const clear = () => setItems([]);

  const total = items.reduce((s,x)=> s + (Number(x.price||0) * Number(x.qty||0)), 0);

  return { items, add, setQty, remove, clear, total };
}

export default function WholesaleOrderPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [products, setProducts] = useState([]);

  // Фильтры/поиск
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");

  const cart = useCart();

  useEffect(()=>{
    let alive = true;
    (async ()=>{
      setLoading(true); setErr(null);
      try {
        const resp = await fetch("/api/b2b-products", { method: "GET" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        // безопасный разбор JSON
        let data = null;
        try { data = await resp.json(); } catch { data = null; }
        const list = normalizeProducts(data || {});
        if (alive) setProducts(list);
      } catch(e) {
        if (alive) setErr(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return ()=>{ alive=false; };
  }, []);

  const cats = useMemo(()=> Array.from(new Set(products.map(p=>p.category))).filter(Boolean), [products]);

  const filtered = useMemo(()=>{
    const qq = q.trim().toLowerCase();
    return products.filter(p =>
      (!cat || p.category===cat) &&
      (!qq || (p.title||"").toLowerCase().includes(qq))
    );
  }, [products, cat, q]);

  const placeOrder = async () => {
    // демо: валидируем корзину и режем превышения
    const fixed = cart.items.map(x=>{
      const p = products.find(p=>p.id===x.id);
      const stock = p?.stock ?? x.stock ?? null;
      return { ...x, qty: clampQty(x.qty, stock) };
    });

    // если после clamp какие-то qty уменьшились — сохраним и покажем предупреждение
    const changed = fixed.some((fx,i)=> fx.qty !== cart.items[i]?.qty);
    if (changed) {
      // перезаписываем корзину
      setJSON("kawa.cart", fixed);
      alert("Количество некоторых позиций уменьшено до доступного остатка.");
      // локально обновим
      // небольшая хитрость: дернём setItems через setJSON, а хук подхватит при следующем маунте; для простоты перезагрузим страницу
      if (typeof window !== "undefined") window.location.reload();
      return;
    }

    // демо-отправка (позже подключим API)
    alert("Заказ оформлен (демо). В проде отправим на бэкенд.");
    cart.clear();
  };

  return (
    <PageBoundary>
      <Head><title>Оптовый заказ — kawa.by</title></Head>

      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900">
        <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b border-gray-100">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold hover:underline">kawa.by — МЭР ТРЕЙД</Link>
            <nav className="text-sm flex gap-3">
              <Link href="/#catalog" className="hover:underline">Каталог</Link>
              <Link href="/#wholesale" className="hover:underline">Оптовая заявка</Link>
              <Link href="/wholesale/order" className="font-semibold">Оптовый заказ</Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6">
          {/* Фильтры */}
          <div className="grid md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="font-semibold mb-3">Фильтры</div>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Категория</div>
                    <select
                      value={cat}
                      onChange={(e)=>setCat(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
                    >
                      <option value="">Все</option>
                      {cats.map(c=> <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Поиск</div>
                    <input
                      value={q}
                      onChange={(e)=>setQ(e.target.value)}
                      placeholder="Название товара"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Каталог + корзина */}
            <div className="md:col-span-3 grid gap-4">
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="font-semibold mb-3">Каталог (опт)</div>

                {loading && <div className="text-sm">Загрузка каталога…</div>}
                {err && <div className="text-sm rounded-xl px-3 py-2 bg-amber-50 text-amber-800 border border-amber-200">Ошибка загрузки: {err}</div>}

                {!loading && !err && filtered.length === 0 && (
                  <div className="text-sm">Ничего не найдено. Измени фильтры.</div>
                )}

                {!loading && !err && filtered.length > 0 && (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filtered.map(p=>(
                      <div key={p.id} className="rounded-xl border border-gray-100 p-3">
                        <div className="text-sm font-medium">{p.title}</div>
                        <div className="text-xs text-gray-600">
                          {(p.category || "—")}{p.brand ? ` • ${p.brand}` : ""}{p.pack ? ` • ${p.pack}` : ""}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {p.price != null ? `Цена: ${p.price}` : ""}{p.stock != null ? ` · Остаток: ${p.stock}` : ""}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button
                            className="px-3 py-1 rounded-xl text-sm border border-gray-200 bg-white hover:bg-gray-50"
                            onClick={()=>cart.add(p, 1)}
                          >
                            В корзину
                          </button>
                          <button
                            className="px-3 py-1 rounded-xl text-sm border border-gray-900 bg-gray-900 text-white hover:opacity-90"
                            onClick={()=>cart.add(p, Math.min(5, Number.isFinite(p.stock)?Math.max(1,p.stock):5))}
                          >
                            Быстрый заказ
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="font-semibold mb-3">Корзина</div>
                {cart.items.length === 0 ? (
                  <div className="text-sm text-gray-600">Пусто. Добавь позиции из каталога.</div>
                ) : (
                  <div className="grid gap-3">
                    {cart.items.map(x=>{
                      const p = products.find(p=>p.id===x.id);
                      const stock = p?.stock ?? x.stock ?? null;
                      const max = Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : "";
                      return (
                        <div key={x.id} className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="text-sm font-medium">{x.title}</div>
                            <div className="text-xs text-gray-600">
                              {p?.price != null ? `Цена: ${p.price}` : ""} {Number.isFinite(stock) ? `· Остаток: ${stock}` : ""}
                            </div>
                          </div>
                          <input
                            type="number"
                            min={1}
                            max={max}
                            value={x.qty}
                            onChange={(e)=> cart.setQty(x.id, Number(e.target.value||1), stock)}
                            className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-sm"
                          />
                          <button
                            onClick={()=>cart.remove(x.id)}
                            className="px-2 py-1 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
                          >
                            Удалить
                          </button>
                        </div>
                      );
                    })}
                    <div className="text-sm font-semibold">Итого: {cart.total}</div>
                    <div className="flex gap-2">
                      <button
                        onClick={placeOrder}
                        className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm hover:opacity-90"
                      >
                        Оформить заказ
                      </button>
                      <button
                        onClick={cart.clear}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-sm hover:bg-gray-50"
                      >
                        Очистить
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </main>
      </div>
    </PageBoundary>
  );
}
